from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import select

from app.extensions import db
from app.models import FarmerProfile, User, WaterRequirementEstimate
from app.services.water_service import budget_summary


class WaterRequirementInputError(ValueError):
    def __init__(self, message, status=400, missing_fields=None):
        super().__init__(message)
        self.status = status
        self.missing_fields = missing_fields or []


# Documented base crop water requirements per acre per stage (ANGRAU / ICAR baseline norms)
CROP_WATER_NORMS = [
    ({"వరి", "rice", "paddy", "vari"}, "వరి", Decimal("1200000.00")),
    ({"పత్తి", "cotton", "patti"}, "పత్తి", Decimal("700000.00")),
    ({"మిరప", "chilli", "chili", "mirapa"}, "మిరప", Decimal("750000.00")),
    ({"మొక్కజొన్న", "maize", "corn", "mokkajonna"}, "మొక్కజొన్న", Decimal("500000.00")),
    ({"వేరుశనగ", "groundnut", "peanut", "verusanaga"}, "వేరుశనగ", Decimal("450000.00")),
    ({"చెరకు", "sugarcane", "cheraku"}, "చెరకు", Decimal("1800000.00")),
    (
        {"పప్పుదినుసులు", "మినుములు", "పెసలు", "కందులు", "శనగలు", "pulses", "gram"},
        "పప్పుదినుసులు",
        Decimal("350000.00"),
    ),
]
DEFAULT_CROP_NORM = Decimal("500000.00")

# Documented crop stage multipliers (Kc stage coefficients)
STAGE_FACTORS = [
    (
        {"విత్తే దశ", "విత్తనం", "ప్రారంభ దశ", "sowing", "initial", "seedling"},
        "విత్తే దశ",
        Decimal("0.60"),
    ),
    (
        {"వృద్ధి దశ", "శాఖీయ దశ", "ఎదుగుదల దశ", "vegetative", "growth"},
        "వృద్ధి దశ",
        Decimal("1.00"),
    ),
    (
        {"పూత దశ", "గింజ దశ", "పునరుత్పత్తి దశ", "flowering", "reproductive", "grain"},
        "పూత దశ",
        Decimal("1.20"),
    ),
    (
        {"పక్వత దశ", "కోత దశ", "ముగింపు దశ", "maturity", "harvest"},
        "పక్వత దశ",
        Decimal("0.70"),
    ),
]
DEFAULT_STAGE_FACTOR = Decimal("1.00")


def authenticated_profile():
    from flask_jwt_extended import get_jwt_identity

    user = db.session.get(User, get_jwt_identity())
    if user is None:
        raise WaterRequirementInputError("ఖాతా కనుగొనబడలేదు.", status=404)
    if user.farmer_profile is None:
        raise WaterRequirementInputError("రైతు వివరాలు కనుగొనబడలేదు.", status=404)
    return user, user.farmer_profile


def get_crop_norm(crop_name):
    if not crop_name:
        return crop_name, DEFAULT_CROP_NORM
    normalized = crop_name.strip().lower()
    for keywords, canonical_name, rate in CROP_WATER_NORMS:
        for keyword in keywords:
            if keyword in normalized or normalized in keyword:
                return canonical_name, rate
    return crop_name.strip(), DEFAULT_CROP_NORM


def get_stage_factor(crop_stage):
    if not crop_stage:
        return crop_stage, DEFAULT_STAGE_FACTOR
    normalized = crop_stage.strip().lower()
    for keywords, canonical_name, factor in STAGE_FACTORS:
        for keyword in keywords:
            if keyword in normalized or normalized in keyword:
                return canonical_name, factor
    return crop_stage.strip(), DEFAULT_STAGE_FACTOR


def check_profile_readiness(profile):
    missing = []
    if not profile.crop or not profile.crop.strip():
        missing.append("crop")
    if profile.land_area_acres is None or profile.land_area_acres <= 0:
        missing.append("land_area")
    if not profile.crop_stage or not profile.crop_stage.strip():
        missing.append("crop_stage")
    return len(missing) == 0, missing


def format_number_te(number):
    try:
        val = int(round(number))
        return f"{val:,}"
    except (ValueError, TypeError):
        return str(number)


def build_explanation(
    crop,
    land_area,
    crop_stage,
    base_liters,
    stage_factor,
    estimated_liters,
    remaining_water=None,
    water_balance=None,
    is_sufficient=None,
):
    lines = [
        f"లెక్కింపు వివరాలు:",
        f"• పంట: {crop} (ప్రామాణిక అవసరం: {format_number_te(base_liters)} లీటర్లు/ఎకరం)",
        f"• భూమి విస్తీర్ణం: {land_area} ఎకరాలు",
        f"• పంట దశ: {crop_stage} (దశ గుణకం: {stage_factor})",
        f"• లెక్కింపు సూత్రం: భూమి విస్తీర్ణం × ప్రామాణిక నీటి అవసరం × పంట దశ గుణకం",
        f"• అంచనా వేసిన మొత్తం నీటి అవసరం: {format_number_te(estimated_liters)} లీటర్లు",
    ]
    if remaining_water is not None and water_balance is not None and is_sufficient is not None:
        if is_sufficient:
            lines.append(
                f"• నీటి సమతుల్యత: ప్రస్తుతం మిగిలిన నీరు ({format_number_te(remaining_water)} లీటర్లు) ఈ దశకు సరిపోతుంది. మిగిలే అదనపు నీరు: {format_number_te(water_balance)} లీటర్లు."
            )
        else:
            deficit = abs(water_balance)
            lines.append(
                f"• నీటి సమతుల్యత: ప్రస్తుతం మిగిలిన నీరు ({format_number_te(remaining_water)} లీటర్లు) ఈ దశకు సరిపోదు. అంచనా వేసిన నీటి కొరత: {format_number_te(deficit)} లీటర్లు."
            )
    else:
        lines.append(
            "• నీటి సమతుల్యత: నీటి బడ్జెట్ నమోదు కాలేదు. నీటి నిర్వహణ విభాగంలో అందుబాటులో ఉన్న నీటిని నమోదు చేయండి."
        )
    return "\n".join(lines)


def calculate_water_requirement(profile, persist=True):
    is_ready, missing = check_profile_readiness(profile)
    if not is_ready:
        missing_labels = []
        if "crop" in missing:
            missing_labels.append("పంట")
        if "land_area" in missing:
            missing_labels.append("భూమి విస్తీర్ణం")
        if "crop_stage" in missing:
            missing_labels.append("పంట దశ")
        fields_str = ", ".join(missing_labels)
        raise WaterRequirementInputError(
            f"పంట నీటి అవసరాన్ని లెక్కించడానికి మీ ప్రొఫైల్‌లో {fields_str} వివరాలను నమోదు చేయండి.",
            status=422,
            missing_fields=missing,
        )

    crop = profile.crop.strip()
    land_area = Decimal(str(profile.land_area_acres))
    crop_stage = profile.crop_stage.strip()

    _, base_liters = get_crop_norm(crop)
    _, stage_factor = get_stage_factor(crop_stage)

    estimated = (land_area * base_liters * stage_factor).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

    available_water = None
    remaining_water = None
    water_balance = None
    is_sufficient = None

    try:
        summary = budget_summary(profile, commit_sync=False)
        if summary.get("available_water") is not None:
            available_water = Decimal(str(summary["available_water"]))
        if summary.get("remaining_water") is not None:
            remaining_water = Decimal(str(summary["remaining_water"]))
            water_balance = remaining_water - estimated
            is_sufficient = water_balance >= 0
    except Exception:
        pass

    explanation = build_explanation(
        crop=crop,
        land_area=land_area,
        crop_stage=crop_stage,
        base_liters=base_liters,
        stage_factor=stage_factor,
        estimated_liters=estimated,
        remaining_water=remaining_water,
        water_balance=water_balance,
        is_sufficient=is_sufficient,
    )

    estimate = None
    if persist:
        estimate = WaterRequirementEstimate(
            farmer_profile=profile,
            crop=crop,
            land_area_acres=land_area,
            crop_stage=crop_stage,
            stage_factor=stage_factor,
            base_liters_per_acre=base_liters,
            estimated_liters=estimated,
            available_water_liters=available_water,
            remaining_water_liters=remaining_water,
            water_balance_liters=water_balance,
            is_sufficient=is_sufficient,
            explanation=explanation,
            created_at=datetime.now(timezone.utc),
        )
        db.session.add(estimate)
        db.session.commit()

    return {
        "id": estimate.id if estimate else None,
        "crop": crop,
        "land_area_acres": float(land_area),
        "crop_stage": crop_stage,
        "stage_factor": float(stage_factor),
        "base_liters_per_acre": float(base_liters),
        "estimated_liters": float(estimated),
        "available_water_liters": float(available_water) if available_water is not None else None,
        "remaining_water_liters": float(remaining_water) if remaining_water is not None else None,
        "water_balance_liters": float(water_balance) if water_balance is not None else None,
        "is_sufficient": is_sufficient,
        "explanation": explanation,
        "created_at": estimate.created_at.isoformat() if estimate else datetime.now(timezone.utc).isoformat(),
    }


def get_latest_estimate(profile):
    return db.session.scalar(
        select(WaterRequirementEstimate)
        .where(WaterRequirementEstimate.farmer_profile_id == profile.id)
        .order_by(WaterRequirementEstimate.created_at.desc(), WaterRequirementEstimate.id.desc())
    )


def get_estimate_history(profile):
    return db.session.scalars(
        select(WaterRequirementEstimate)
        .where(WaterRequirementEstimate.farmer_profile_id == profile.id)
        .order_by(WaterRequirementEstimate.created_at.desc(), WaterRequirementEstimate.id.desc())
    ).all()
