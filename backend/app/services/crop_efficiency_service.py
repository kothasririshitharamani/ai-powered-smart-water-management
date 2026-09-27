from decimal import Decimal, InvalidOperation

from app.data.crop_efficiency_data import (
    CROP_EFFICIENCY_REGISTRY,
    CROP_LOOKUP,
    DECISION_SUPPORT_DISCLAIMER,
    DOCUMENTED_SOURCE,
    PADDY_BASELINE_LITERS_PER_ACRE,
    find_crop_by_name,
)
from app.services.water_service import budget_summary


class CropEfficiencyError(ValueError):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def list_crop_efficiency_registry():
    return {
        "crops": CROP_EFFICIENCY_REGISTRY,
        "paddy_baseline_liters_per_acre": PADDY_BASELINE_LITERS_PER_ACRE,
        "source": DOCUMENTED_SOURCE,
        "disclaimer": DECISION_SUPPORT_DISCLAIMER,
        "unit": "liters_per_acre",
    }


def compare_crops(crop_keys, land_area_acres=None, profile=None):
    if not isinstance(crop_keys, list) or len(crop_keys) < 2:
        raise CropEfficiencyError("పోల్చడానికి కనీసం 2 వేర్వేరు పంటలను ఎంచుకోండి.", 400)

    # Resolve crops and ensure uniqueness
    resolved_crops = []
    seen_keys = set()
    for raw_key in crop_keys:
        crop_data = CROP_LOOKUP.get(str(raw_key).strip().lower()) or find_crop_by_name(str(raw_key).strip())
        if crop_data is None:
            raise CropEfficiencyError(
                f"'{raw_key}' పంటకు సంబంధించిన ప్రామాణిక వివరాలు అందుబాటులో లేవు.",
                400,
            )
        if crop_data["crop_key"] not in seen_keys:
            seen_keys.add(crop_data["crop_key"])
            resolved_crops.append(crop_data)

    if len(resolved_crops) < 2:
        raise CropEfficiencyError("పోల్చడానికి కనీసం 2 వేర్వేరు పంటలను ఎంచుకోండి.", 400)

    # Determine land area
    if land_area_acres is not None:
        try:
            area = float(Decimal(str(land_area_acres).strip()))
        except (InvalidOperation, ValueError, TypeError):
            raise CropEfficiencyError("భూమి విస్తీర్ణాన్ని సరైన సంఖ్యగా నమోదు చేయండి.", 400) from None
        if area <= 0:
            raise CropEfficiencyError("భూమి విస్తీర్ణం సున్నా కంటే ఎక్కువగా ఉండాలి.", 400)
        if area > 99999.99:
            raise CropEfficiencyError("భూమి విస్తీర్ణం పరిమితికి మించి ఉంది.", 400)
    elif profile and profile.land_area_acres and profile.land_area_acres > 0:
        area = float(profile.land_area_acres)
    else:
        area = 1.0

    # Retrieve farmer water context if profile is available
    remaining_water = None
    available_water = None
    if profile:
        try:
            summary = budget_summary(profile, commit_sync=False)
            remaining_water = summary.get("remaining_water")
            available_water = summary.get("available_water")
        except Exception:
            remaining_water = None
            available_water = None

    # Sort crops by water requirement ascending (most water efficient first)
    sorted_crops = sorted(
        resolved_crops,
        key=lambda c: c["water_requirement_liters_per_acre"],
    )

    highest_water_crop = sorted_crops[-1]
    lowest_water_crop = sorted_crops[0]
    highest_req_total = highest_water_crop["water_requirement_liters_per_acre"] * area

    detailed_crops = []
    for crop in sorted_crops:
        per_acre = crop["water_requirement_liters_per_acre"]
        total_liters = round(per_acre * area, 2)
        savings_vs_highest = round(highest_req_total - total_liters, 2)
        savings_vs_highest_pct = (
            round((savings_vs_highest / highest_req_total) * 100, 2)
            if highest_req_total > 0
            else 0.0
        )

        cultivable_acres = None
        if remaining_water is not None and remaining_water > 0 and per_acre > 0:
            cultivable_acres = round(remaining_water / per_acre, 2)

        detailed_crops.append({
            "crop_key": crop["crop_key"],
            "crop_name_te": crop["crop_name_te"],
            "crop_name_en": crop["crop_name_en"],
            "water_requirement_liters_per_acre": per_acre,
            "water_requirement_mm": crop["water_requirement_mm"],
            "total_water_liters": total_liters,
            "efficiency_category_key": crop["efficiency_category_key"],
            "efficiency_category_te": crop["efficiency_category_te"],
            "water_use_intensity_te": crop["water_use_intensity_te"],
            "water_savings_vs_paddy_percent": crop["water_savings_vs_paddy_percent"],
            "water_savings_vs_selected_max_liters": savings_vs_highest,
            "water_savings_vs_selected_max_percent": savings_vs_highest_pct,
            "cultivable_acres_with_remaining_water": cultivable_acres,
            "drought_resilience_te": crop["drought_resilience_te"],
            "season_te": crop["season_te"],
            "duration_days": crop["duration_days"],
            "soil_suitability_te": crop["soil_suitability_te"],
            "key_benefit_te": crop["key_benefit_te"],
        })

    max_savings_liters = round(
        (highest_water_crop["water_requirement_liters_per_acre"] - lowest_water_crop["water_requirement_liters_per_acre"]) * area,
        2,
    )
    max_savings_pct = (
        round(
            (max_savings_liters / highest_req_total) * 100,
            2,
        )
        if highest_req_total > 0
        else 0.0
    )

    return {
        "land_area_acres": area,
        "selected_crops": detailed_crops,
        "most_water_efficient": {
            "crop_key": lowest_water_crop["crop_key"],
            "crop_name_te": lowest_water_crop["crop_name_te"],
            "total_water_liters": round(lowest_water_crop["water_requirement_liters_per_acre"] * area, 2),
        },
        "least_water_efficient": {
            "crop_key": highest_water_crop["crop_key"],
            "crop_name_te": highest_water_crop["crop_name_te"],
            "total_water_liters": round(highest_water_crop["water_requirement_liters_per_acre"] * area, 2),
        },
        "max_water_savings_liters": max_savings_liters,
        "max_water_savings_percent": max_savings_pct,
        "farmer_context": {
            "profile_crop": profile.crop if profile else None,
            "profile_land_area": float(profile.land_area_acres) if profile and profile.land_area_acres else None,
            "remaining_water_liters": remaining_water,
            "available_water_liters": available_water,
        },
        "source": DOCUMENTED_SOURCE,
        "disclaimer": DECISION_SUPPORT_DISCLAIMER,
        "unit": "liters",
    }
