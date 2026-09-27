from decimal import Decimal, InvalidOperation

WATER_SOURCE_OPTIONS = {"బోర్‌వెల్", "బావి", "కాలువ", "వర్షపు నీరు", "ఇతర"}
_NUMERIC_LIMITS = {
    "land_area": Decimal("99999999.99"),
    "available_water": Decimal("999999999999.99"),
}


def _nonnegative_number(value, field_name):
    if isinstance(value, bool) or value is None:
        return None, f"{field_name} సంఖ్యగా నమోదు చేయండి."
    try:
        number = Decimal(str(value).strip())
    except (InvalidOperation, ValueError, AttributeError):
        return None, f"{field_name} సంఖ్యగా నమోదు చేయండి."
    if not number.is_finite() or number < 0:
        return None, f"{field_name} సున్నా కంటే తక్కువ ఉండకూడదు."
    if number > _NUMERIC_LIMITS[field_name]:
        return None, f"{field_name} విలువ చాలా ఎక్కువగా ఉంది."
    return number, None


def validate_profile(payload):
    string_fields = {
        "name": ("full_name", 160),
        "village": ("village", 120),
        "district": ("district", 120),
        "crop": ("crop", 120),
        "crop_stage": ("crop_stage", 120),
    }
    values = {}
    for request_field, (model_field, max_length) in string_fields.items():
        value = payload.get(request_field)
        if not isinstance(value, str) or not value.strip():
            return None, f"{request_field} వివరాన్ని నమోదు చేయండి."
        value = value.strip()
        if len(value) > max_length:
            return None, f"{request_field} వివరము చాలా పొడవుగా ఉంది."
        values[model_field] = value

    water_source = payload.get("water_source")
    if not isinstance(water_source, str) or water_source not in WATER_SOURCE_OPTIONS:
        return None, "నీటి వనరును జాబితా నుంచి ఎంచుకోండి."
    values["water_source"] = water_source

    land_area, error = _nonnegative_number(payload.get("land_area"), "land_area")
    if error:
        return None, error
    available_water, error = _nonnegative_number(
        payload.get("available_water"), "available_water"
    )
    if error:
        return None, error
    values["land_area_acres"] = land_area
    values["available_water"] = available_water

    preferred_language = payload.get("preferred_language", "తెలుగు")
    if not isinstance(preferred_language, str) or preferred_language not in {
        "తెలుగు",
        "te",
        "te-IN",
    }:
        return None, "భాష తెలుగు మాత్రమే ఉండాలి."
    values["preferred_language"] = "తెలుగు"
    return values, None


def profile_is_complete(profile):
    if profile is None:
        return False
    return all(
        value is not None and (not isinstance(value, str) or bool(value.strip()))
        for value in (
            profile.full_name,
            profile.village,
            profile.district,
            profile.crop,
            profile.land_area_acres,
            profile.crop_stage,
            profile.water_source,
            profile.available_water,
            profile.preferred_language,
        )
    )