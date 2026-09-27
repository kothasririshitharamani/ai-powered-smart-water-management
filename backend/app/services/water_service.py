from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation

from flask import current_app
from sqlalchemy import select

from app.extensions import db
from app.models import FarmerProfile, User, WaterBudget, WaterUsage

WATER_UNIT = "liters"
MAX_AMOUNT = Decimal("999999999999.99")


class WaterInputError(ValueError):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def current_period(today=None):
    today = today or date.today()
    return date(today.year, 1, 1), date(today.year, 12, 31)


def parse_amount(payload, *, positive=True):
    amount = payload.get("amount")
    if isinstance(amount, bool) or amount is None:
        raise WaterInputError("నీటి పరిమాణాన్ని సంఖ్యగా నమోదు చేయండి.")
    try:
        amount = Decimal(str(amount).strip())
    except (InvalidOperation, ValueError, AttributeError):
        raise WaterInputError("నీటి పరిమాణాన్ని సంఖ్యగా నమోదు చేయండి.") from None
    if not amount.is_finite() or amount < 0 or (positive and amount == 0):
        raise WaterInputError("నీటి పరిమాణం సున్నా కంటే ఎక్కువగా ఉండాలి.")
    if amount > MAX_AMOUNT:
        raise WaterInputError("నీటి పరిమాణం చాలా ఎక్కువగా ఉంది.")
    if amount.as_tuple().exponent < -2:
        raise WaterInputError("నీటి పరిమాణం గరిష్ఠంగా రెండు దశాంశ స్థానాలు ఉండాలి.")
    return amount


def validate_unit(payload):
    unit = payload.get("unit")
    if unit != WATER_UNIT:
        raise WaterInputError("నీటి పరిమాణం లీటర్లలో మాత్రమే నమోదు చేయండి.")


def authenticated_profile():
    from flask_jwt_extended import get_jwt_identity

    user = db.session.get(User, get_jwt_identity())
    if user is None:
        raise WaterInputError("ఖాతా కనుగొనబడలేదు.", 404)
    if user.farmer_profile is None:
        raise WaterInputError("రైతు వివరాలు కనుగొనబడలేదు.", 404)
    return user, user.farmer_profile


def _get_current_budget(profile, *, sync_from_profile=True):
    period_start, period_end = current_period()
    budget = db.session.scalar(
        select(WaterBudget).where(
            WaterBudget.farmer_profile_id == profile.id,
            WaterBudget.period_start == period_start,
        )
    )
    if budget is None and sync_from_profile and profile.available_water is not None:
        budget = WaterBudget(
            farmer_profile=profile,
            amount_liters=profile.available_water,
            period_start=period_start,
            period_end=period_end,
        )
        db.session.add(budget)
        db.session.flush()
    elif budget is not None and profile.available_water != budget.amount_liters:
        profile.available_water = budget.amount_liters
        db.session.flush()
    return budget, period_start, period_end


def current_usage(profile, period_start, period_end):
    entries = db.session.scalars(
        select(WaterUsage).where(WaterUsage.farmer_profile_id == profile.id)
    ).all()
    period_entries = [
        entry
        for entry in entries
        if period_start <= entry.recorded_at.date() <= period_end
    ]
    total = sum((entry.amount_liters for entry in period_entries), Decimal("0"))
    return total, period_entries


def budget_summary(profile, *, commit_sync=True):
    budget, period_start, period_end = _get_current_budget(profile)
    very_low = float(current_app.config.get("WATER_VERY_LOW_REMAINING_PERCENT", 15))
    low = float(current_app.config.get("WATER_LOW_REMAINING_PERCENT", 30))
    if not 0 <= very_low < low <= 100:
        raise RuntimeError("Water warning percentages must satisfy 0 <= very-low < low <= 100")
    if budget is None:
        total_used = Decimal("0")
        remaining = None
        usage_percent = 0.0
        remaining_percent = None
        warning_level = "not_set"
        available = None
    else:
        total_used, _ = current_usage(profile, period_start, period_end)
        available = budget.amount_liters
        remaining = available - total_used
        if remaining < 0:
            raise WaterInputError(
                "నమోదైన వినియోగం బడ్జెట్‌ను మించింది. నీటి బడ్జెట్‌ను తనిఖీ చేయండి.",
                409,
            )
        usage_percent = float(total_used / available * 100) if available > 0 else 0.0
        remaining_percent = float(remaining / available * 100) if available > 0 else 0.0
        if remaining_percent <= very_low:
            warning_level = "very_low"
        elif remaining_percent <= low:
            warning_level = "low"
        else:
            warning_level = "normal"
    if commit_sync and db.session.dirty:
        db.session.commit()
    return {
        "available_water": float(available) if available is not None else None,
        "total_used": float(total_used),
        "remaining_water": float(remaining) if remaining is not None else None,
        "usage_percent": usage_percent,
        "remaining_percent": remaining_percent,
        "warning_level": warning_level,
        "low_warning_percent": low,
        "very_low_warning_percent": very_low,
        "unit": WATER_UNIT,
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
    }


def upsert_current_budget(profile, amount, *, reject_below_usage=True):
    period_start, period_end = current_period()
    budget = db.session.scalar(
        select(WaterBudget).where(
            WaterBudget.farmer_profile_id == profile.id,
            WaterBudget.period_start == period_start,
        )
    )
    if budget is None:
        budget = WaterBudget(
            farmer_profile=profile,
            amount_liters=amount,
            period_start=period_start,
            period_end=period_end,
        )
        db.session.add(budget)

    used, _ = current_usage(profile, period_start, period_end)
    if reject_below_usage and amount < used:
        raise WaterInputError(
            "మిగిలిన నీటి కంటే తక్కువ బడ్జెట్‌ను నిర్ణయించలేరు.", 409
        )
    budget.amount_liters = amount
    budget.period_end = period_end
    profile.available_water = amount
    return budget


def create_usage(profile, amount, notes):
    budget, period_start, period_end = _get_current_budget(profile)
    if budget is None:
        raise WaterInputError("ముందుగా అందుబాటులో ఉన్న నీటి బడ్జెట్‌ను నమోదు చేయండి.", 409)
    used, _ = current_usage(profile, period_start, period_end)
    if used + amount > budget.amount_liters:
        raise WaterInputError("ఈ వినియోగంతో మిగిలిన నీరు సున్నా కంటే తక్కువ అవుతుంది.", 409)
    usage = WaterUsage(
        farmer_profile=profile,
        amount_liters=amount,
        recorded_at=datetime.now(timezone.utc),
        notes=notes,
    )
    db.session.add(usage)
    db.session.commit()
    return usage


def serialize_usage(usage):
    return {
        "id": usage.id,
        "amount": float(usage.amount_liters),
        "unit": WATER_UNIT,
        "notes": usage.notes,
        "recorded_at": usage.recorded_at.isoformat(),
    }


def usage_history(profile):
    return db.session.scalars(
        select(WaterUsage)
        .where(WaterUsage.farmer_profile_id == profile.id)
        .order_by(WaterUsage.recorded_at.desc(), WaterUsage.id.desc())
    ).all()