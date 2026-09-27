import re

_MOBILE_PATTERN = re.compile(r"^[6-9]\d{9}$")


def normalize_mobile(mobile):
    return mobile.strip()


def validate_registration(payload):
    name = payload.get("name")
    mobile = payload.get("mobile")
    password = payload.get("password")
    village = payload.get("village")
    district = payload.get("district")
    preferred_language = payload.get("preferred_language")

    required_values = (name, mobile, password, village, district, preferred_language)
    if not all(isinstance(value, str) and value.strip() for value in required_values):
        return None, "Name, mobile, password, village, district, and preferred language are required."

    values = {
        "name": name.strip(),
        "mobile": normalize_mobile(mobile),
        "password": password,
        "village": village.strip(),
        "district": district.strip(),
        "preferred_language": preferred_language.strip(),
    }
    if not _MOBILE_PATTERN.fullmatch(values["mobile"]):
        return None, "Mobile must be a valid 10-digit Indian mobile number."
    if (
        len(values["name"]) > 160
        or len(values["village"]) > 120
        or len(values["district"]) > 120
    ):
        return None, "Name, village, or district is too long."
    if values["preferred_language"] not in {"తెలుగు", "te", "te-IN"}:
        return None, "Preferred language must be Telugu."
    if len(password) < 8 or len(password) > 1024:
        return None, "Password must be between 8 and 1024 characters long."

    values["preferred_language"] = "తెలుగు"
    return values, None


def validate_login_credentials(payload):
    mobile = payload.get("mobile")
    password = payload.get("password")
    if not isinstance(mobile, str) or not isinstance(password, str) or not mobile.strip():
        return None, None, "Mobile and password are required."

    mobile = normalize_mobile(mobile)
    if not _MOBILE_PATTERN.fullmatch(mobile):
        return None, None, "A valid 10-digit mobile number is required."
    return mobile, password, None