from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from sqlalchemy import select

from app.extensions import db
from app.models import FarmerCrop, FarmerProfile, User, WaterAllocationItem, WaterAllocationPlan
from app.services.water_service import budget_summary

MAX_AMOUNT = Decimal("999999999999.99")
MAX_AREA = Decimal("99999.99")


class ScarcityAllocationError(ValueError):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def authenticated_profile():
    from flask_jwt_extended import get_jwt_identity

    user = db.session.get(User, get_jwt_identity())
    if user is None:
        raise ScarcityAllocationError("ఖాతా కనుగొనబడలేదు.", 404)
    if user.farmer_profile is None:
        raise ScarcityAllocationError("రైతు ప్రొఫైల్ వివరాలు కనుగొనబడలేదు.", 404)
    return user, user.farmer_profile


def parse_decimal(value, field_name, *, allow_zero=True, max_val=MAX_AMOUNT):
    if isinstance(value, bool) or value is None:
        raise ScarcityAllocationError(f"{field_name} సంఖ్యగా నమోదు చేయండి.", 400)
    try:
        dec = Decimal(str(value).strip())
    except (InvalidOperation, ValueError, AttributeError):
        raise ScarcityAllocationError(f"{field_name} సరైన సంఖ్యగా నమోదు చేయండి.", 400) from None

    if not dec.is_finite() or dec < 0 or (not allow_zero and dec == 0):
        if allow_zero:
            raise ScarcityAllocationError(f"{field_name} సున్నా లేదా అంతకంటే ఎక్కువ ఉండాలి.", 400)
        else:
            raise ScarcityAllocationError(f"{field_name} సున్నా కంటే ఎక్కువగా ఉండాలి.", 400)
    if dec > max_val:
        raise ScarcityAllocationError(f"{field_name} పరిమితికి మించి ఉంది.", 400)
    return dec.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def get_or_sync_farmer_crops(profile):
    """
    Returns crops associated with the profile.
    If none exist and profile has a primary crop, syncs it as the first crop.
    """
    crops = db.session.scalars(
        select(FarmerCrop)
        .where(FarmerCrop.farmer_profile_id == profile.id)
        .order_by(FarmerCrop.priority.asc(), FarmerCrop.created_at.asc())
    ).all()

    if not crops and profile.crop and profile.land_area_acres and profile.land_area_acres > 0:
        crop_name = profile.crop.strip()
        if crop_name:
            initial_crop = FarmerCrop(
                farmer_profile_id=profile.id,
                crop_name=crop_name,
                area_acres=profile.land_area_acres,
                crop_stage=profile.crop_stage.strip() if profile.crop_stage else None,
                priority=1,
            )
            db.session.add(initial_crop)
            db.session.commit()
            crops = [initial_crop]

    return crops


def add_farmer_crop(profile, crop_name, area_acres, crop_stage=None, priority=None):
    if not crop_name or not str(crop_name).strip():
        raise ScarcityAllocationError("పంట పేరును నమోదు చేయండి.", 400)
    name = str(crop_name).strip()
    if len(name) > 120:
        raise ScarcityAllocationError("పంట పేరు 120 అక్షరాల కంటే తక్కువగా ఉండాలి.", 400)

    area = parse_decimal(area_acres, "భూమి విస్తీర్ణం", allow_zero=False, max_val=MAX_AREA)

    stage = str(crop_stage).strip() if crop_stage else None
    if stage and len(stage) > 120:
        raise ScarcityAllocationError("పంట దశ 120 అక్షరాల కంటే తక్కువగా ఉండాలి.", 400)

    # Ensure existing or initial profile crop is synced first
    get_or_sync_farmer_crops(profile)

    if priority is not None:
        try:
            prio = int(priority)
            if prio < 1:
                raise ValueError()
        except (ValueError, TypeError):
            raise ScarcityAllocationError("ప్రాధాన్యత 1 లేదా అంతకంటే ఎక్కువ సంఖ్య అయి ఉండాలి.", 400) from None
    else:
        # Default priority to highest existing + 1
        existing_crops = db.session.scalars(
            select(FarmerCrop).where(FarmerCrop.farmer_profile_id == profile.id)
        ).all()
        prio = max((c.priority for c in existing_crops), default=0) + 1

    crop = FarmerCrop(
        farmer_profile_id=profile.id,
        crop_name=name,
        area_acres=area,
        crop_stage=stage,
        priority=prio,
    )
    db.session.add(crop)
    db.session.commit()
    return crop


def delete_farmer_crop(profile, crop_id):
    crop = db.session.scalar(
        select(FarmerCrop).where(
            FarmerCrop.id == str(crop_id),
            FarmerCrop.farmer_profile_id == profile.id,
        )
    )
    if crop is None:
        raise ScarcityAllocationError("పంట వివరాలు కనుగొనబడలేదు.", 404)

    db.session.delete(crop)
    db.session.commit()
    return True


def get_scarcity_summary(profile):
    """
    Fetches real budget numbers and current scarcity allocation state.
    """
    summary = budget_summary(profile)
    available_water = summary["available_water"]
    total_used = summary["total_used"]
    remaining_water = summary["remaining_water"]
    remaining_percent = summary["remaining_percent"]

    if available_water is None or remaining_water is None:
        can_allocate = False
        message = "నీటి బడ్జెట్ నమోదు కాలేదు. దయచేసి ముందుగా నీటి బడ్జెట్‌ను నమోదు చేయండి."
        scarcity_level = "not_set"
    elif remaining_water <= 0:
        can_allocate = False
        message = "మిగిలిన నీరు లేదు. కేటాయింపు చేయడానికి నీరు అందుబాటులో లేదు."
        scarcity_level = "exhausted"
    else:
        can_allocate = True
        message = None
        if remaining_percent is not None:
            if remaining_percent <= 15:
                scarcity_level = "critical"
            elif remaining_percent <= 30:
                scarcity_level = "high"
            elif remaining_percent <= 50:
                scarcity_level = "moderate"
            else:
                scarcity_level = "normal"
        else:
            scarcity_level = "normal"

    crops = get_or_sync_farmer_crops(profile)

    plan = db.session.scalar(
        select(WaterAllocationPlan)
        .where(WaterAllocationPlan.farmer_profile_id == profile.id)
        .order_by(WaterAllocationPlan.updated_at.desc())
    )

    if plan:
        plan_dict = plan.to_dict()
        total_allocated = plan_dict["total_allocated_liters"]
        unallocated_water = plan_dict["unallocated_water_liters"]
    else:
        plan_dict = None
        total_allocated = 0.0
        unallocated_water = remaining_water if remaining_water is not None else 0.0

    return {
        "available_water": available_water,
        "total_used": total_used,
        "remaining_water": remaining_water,
        "remaining_percent": remaining_percent,
        "total_allocated": total_allocated,
        "unallocated_water": unallocated_water,
        "can_allocate": can_allocate,
        "scarcity_level": scarcity_level,
        "message": message,
        "crops": [c.to_dict() for c in crops],
        "current_plan": plan_dict,
        "unit": "liters",
    }


def save_allocation_plan(profile, items_data, notes=None):
    """
    Saves or updates a scarcity water allocation plan across crops.
    Strictly validates that total_allocated <= remaining_water.
    """
    summary = budget_summary(profile)
    available_water = summary["available_water"]
    total_used = summary["total_used"]
    remaining_water = summary["remaining_water"]

    if available_water is None or remaining_water is None or remaining_water <= 0:
        raise ScarcityAllocationError("కేటాయింపు చేయడానికి సరిపడా మిగిలిన నీరు అందుబాటులో లేదు.", 400)

    remaining_dec = Decimal(str(remaining_water))
    available_dec = Decimal(str(available_water))
    used_dec = Decimal(str(total_used))

    if not isinstance(items_data, list) or len(items_data) == 0:
        raise ScarcityAllocationError("కనీసం ఒక పంటకు నీటి కేటాయింపు వివరాలు ఇవ్వండి.", 400)

    parsed_items = []
    total_allocated = Decimal("0.00")

    for idx, item in enumerate(items_data, 1):
        if not isinstance(item, dict):
            raise ScarcityAllocationError(f"వరుస సంఖ్య {idx} లోని వివరాలు సరైనవి కావు.", 400)

        crop_name = item.get("crop_name")
        if not crop_name or not str(crop_name).strip():
            raise ScarcityAllocationError(f"వరుస సంఖ్య {idx} లో పంట పేరును నమోదు చేయండి.", 400)
        crop_name = str(crop_name).strip()

        area_acres = parse_decimal(
            item.get("area_acres"),
            f"వరుస సంఖ్య {idx} లోని భూమి విస్తీర్ణం",
            allow_zero=False,
            max_val=MAX_AREA,
        )

        allocated_liters = parse_decimal(
            item.get("allocated_liters"),
            f"వరుస సంఖ్య {idx} లోని కేటాయించిన నీరు",
            allow_zero=True,
            max_val=MAX_AMOUNT,
        )

        priority = item.get("priority", idx)
        try:
            priority = int(priority)
            if priority < 1:
                priority = idx
        except (ValueError, TypeError):
            priority = idx

        total_allocated += allocated_liters
        parsed_items.append({
            "crop_name": crop_name,
            "area_acres": area_acres,
            "allocated_liters": allocated_liters,
            "priority": priority,
            "notes": str(item.get("notes", "")).strip() if item.get("notes") else None,
        })

    # Strict scarcity check: allocation must not exceed available remaining water
    if total_allocated > remaining_dec:
        diff = total_allocated - remaining_dec
        raise ScarcityAllocationError(
            f"మొత్తం కేటాయింపు ({float(total_allocated):,.2f} లీ.) మిగిలిన నీటి ({float(remaining_dec):,.2f} లీ.) కంటే {float(diff):,.2f} లీ. ఎక్కువగా ఉంది. కేటాయింపును తగ్గించండి.",
            409,
        )

    unallocated = remaining_dec - total_allocated

    # Fetch existing plan or create new
    plan = db.session.scalar(
        select(WaterAllocationPlan)
        .where(WaterAllocationPlan.farmer_profile_id == profile.id)
        .order_by(WaterAllocationPlan.updated_at.desc())
    )

    if plan is None:
        plan = WaterAllocationPlan(
            farmer_profile_id=profile.id,
            total_budget_liters=available_dec,
            already_used_liters=used_dec,
            remaining_water_liters=remaining_dec,
            total_allocated_liters=total_allocated,
            unallocated_water_liters=unallocated,
            status="active",
            notes=str(notes).strip() if notes else None,
        )
        db.session.add(plan)
    else:
        plan.total_budget_liters = available_dec
        plan.already_used_liters = used_dec
        plan.remaining_water_liters = remaining_dec
        plan.total_allocated_liters = total_allocated
        plan.unallocated_water_liters = unallocated
        plan.status = "active"
        if notes is not None:
            plan.notes = str(notes).strip() if notes else None
        plan.updated_at = datetime.now(timezone.utc)

        # Clear previous items
        for old_item in list(plan.items):
            db.session.delete(old_item)

    db.session.flush()

    for it in parsed_items:
        pct = (
            (it["allocated_liters"] / remaining_dec * Decimal("100")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            if remaining_dec > 0
            else Decimal("0.00")
        )
        item_obj = WaterAllocationItem(
            plan_id=plan.id,
            crop_name=it["crop_name"],
            area_acres=it["area_acres"],
            allocated_liters=it["allocated_liters"],
            percentage_of_remaining=pct,
            priority=it["priority"],
            notes=it["notes"],
        )
        db.session.add(item_obj)

    db.session.commit()
    return plan.to_dict()
