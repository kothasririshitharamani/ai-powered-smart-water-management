from datetime import datetime, timezone
from sqlalchemy import select, func

from app.extensions import db
from app.models import FarmerProfile, User, WeatherAlert

SEVERITY_LEVELS = {"low", "medium", "high", "critical"}
ALERT_TYPES = {
    "heavy_rain",
    "thunderstorm",
    "heatwave",
    "flood",
    "cyclone",
    "dry_spell",
    "general",
}


class WeatherInputError(ValueError):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def authenticated_profile():
    from flask_jwt_extended import get_jwt_identity

    user = db.session.get(User, get_jwt_identity())
    if user is None:
        raise WeatherInputError("ఖాతా కనుగొనబడలేదు.", 404)
    if user.farmer_profile is None:
        raise WeatherInputError("రైతు వివరాలు కనుగొనబడలేదు.", 404)
    return user, user.farmer_profile


def parse_iso_datetime(value, field_name):
    if not isinstance(value, str) or not value.strip():
        raise WeatherInputError(f"{field_name} సమయాన్ని నమోదు చేయండి.")
    normalized = value.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(normalized)
    except (ValueError, TypeError):
        raise WeatherInputError(f"{field_name} సమయం సరైన ఫార్మాట్‌లో లేదు.")
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def validate_weather_alert(payload):
    if not isinstance(payload, dict):
        raise WeatherInputError("JSON వివరాలు పంపండి.")

    title = payload.get("title")
    if not isinstance(title, str) or not title.strip():
        raise WeatherInputError("హెచ్చరిక శీర్షికను నమోదు చేయండి.")
    title = title.strip()
    if len(title) > 180:
        raise WeatherInputError("హెచ్చరిక శీర్షిక 180 అక్షరాలకు మించకూడదు.")

    details = payload.get("details")
    if not isinstance(details, str) or not details.strip():
        raise WeatherInputError("హెచ్చరిక వివరాలను నమోదు చేయండి.")
    details = details.strip()
    if len(details) > 5000:
        raise WeatherInputError("హెచ్చరిక వివరాలు 5000 అక్షరాలకు మించకూడదు.")

    alert_type = payload.get("alert_type")
    if not isinstance(alert_type, str) or not alert_type.strip():
        raise WeatherInputError("సరైన హెచ్చరిక రకాన్ని ఎంచుకోండి.")
    alert_type = alert_type.strip().lower()
    if alert_type not in ALERT_TYPES:
        raise WeatherInputError("సరైన హెచ్చరిక రకాన్ని ఎంచుకోండి.")

    severity = payload.get("severity")
    if not isinstance(severity, str) or not severity.strip():
        raise WeatherInputError("సరైన తీవ్రత స్థాయిని ఎంచుకోండి.")
    severity = severity.strip().lower()
    if severity not in SEVERITY_LEVELS:
        raise WeatherInputError("సరైన తీవ్రత స్థాయిని ఎంచుకోండి.")

    starts_at = parse_iso_datetime(payload.get("starts_at"), "ప్రారంభ")

    ends_at_val = payload.get("ends_at")
    ends_at = None
    if ends_at_val is not None and str(ends_at_val).strip():
        ends_at = parse_iso_datetime(ends_at_val, "ముగింపు")
        if ends_at < starts_at:
            raise WeatherInputError("ముగింపు సమయం ప్రారంభ సమయం కంటే ముందు ఉండకూడదు.")

    return {
        "title": title,
        "details": details,
        "alert_type": alert_type,
        "severity": severity,
        "starts_at": starts_at,
        "ends_at": ends_at,
    }


def get_weather_alerts(profile, unread_only=False):
    query = select(WeatherAlert).where(WeatherAlert.farmer_profile_id == profile.id)
    if unread_only:
        query = query.where(WeatherAlert.is_read.is_(False))
    query = query.order_by(WeatherAlert.starts_at.desc(), WeatherAlert.created_at.desc())
    return db.session.scalars(query).all()


def get_unread_count(profile):
    return db.session.scalar(
        select(func.count(WeatherAlert.id)).where(
            WeatherAlert.farmer_profile_id == profile.id,
            WeatherAlert.is_read.is_(False),
        )
    ) or 0


def create_weather_alert(profile, data):
    alert = WeatherAlert(
        farmer_profile=profile,
        title=data["title"],
        details=data["details"],
        alert_type=data["alert_type"],
        severity=data["severity"],
        starts_at=data["starts_at"],
        ends_at=data.get("ends_at"),
        created_at=datetime.now(timezone.utc),
        is_read=False,
    )
    db.session.add(alert)
    db.session.commit()
    return alert


def mark_alert_read(profile, alert_id):
    alert = db.session.scalar(
        select(WeatherAlert).where(
            WeatherAlert.id == alert_id,
            WeatherAlert.farmer_profile_id == profile.id,
        )
    )
    if alert is None:
        raise WeatherInputError("హెచ్చరిక కనుగొనబడలేదు.", 404)
    alert.is_read = True
    db.session.commit()
    return alert


def get_alert_by_id(profile, alert_id):
    alert = db.session.scalar(
        select(WeatherAlert).where(
            WeatherAlert.id == alert_id,
            WeatherAlert.farmer_profile_id == profile.id,
        )
    )
    if alert is None:
        raise WeatherInputError("హెచ్చరిక కనుగొనబడలేదు.", 404)
    return alert
