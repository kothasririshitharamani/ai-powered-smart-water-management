from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import select

from app.extensions import db
from app.models import FarmerProfile, User, WeatherAlert
from app.data.disaster_preparedness_data import (
    DISASTER_DISCLAIMER_TE,
    NO_ACTIVE_ALERT_MESSAGE_TE,
    ACTIVE_ALERT_MESSAGE_TE,
    DISASTER_PREPAREDNESS_REGISTRY,
    map_alert_to_disaster_category,
    get_all_disaster_categories,
    get_disaster_category_data,
)


class DisasterInputError(ValueError):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def authenticated_profile():
    from flask_jwt_extended import get_jwt_identity

    user = db.session.get(User, get_jwt_identity())
    if user is None:
        raise DisasterInputError("ఖాతా కనుగొనబడలేదు.", 404)
    if user.farmer_profile is None:
        raise DisasterInputError("రైతు వివరాలు కనుగొనబడలేదు.", 404)
    return user, user.farmer_profile


def is_alert_active(alert: WeatherAlert, current_time: Optional[datetime] = None) -> bool:
    """
    Determines whether a WeatherAlert is currently active or upcoming within the active window.
    An alert is active if:
    - Starts within the next 48 hours or has already started (within the last 7 days).
    - And hasn't ended (or ended within the last 4 hours).
    """
    if current_time is None:
        current_time = datetime.now(timezone.utc)
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)

    alert_start = alert.starts_at
    if alert_start and alert_start.tzinfo is None:
        alert_start = alert_start.replace(tzinfo=timezone.utc)

    alert_end = alert.ends_at
    if alert_end and alert_end.tzinfo is None:
        alert_end = alert_end.replace(tzinfo=timezone.utc)

    # If alert starts too far in the future (> 48 hours), it's not active yet
    if alert_start and alert_start > current_time + timedelta(hours=48):
        return False

    # If alert has a specific end time
    if alert_end:
        return alert_end >= current_time - timedelta(hours=4)

    # If no end time, consider active if started within the last 7 days
    if alert_start:
        return alert_start >= current_time - timedelta(days=7)

    return True


def get_active_disaster_alerts(
    profile: FarmerProfile, current_time: Optional[datetime] = None
) -> List[WeatherAlert]:
    """
    Retrieves active weather alerts for the farmer profile that map to a disaster category.
    """
    stmt = (
        select(WeatherAlert)
        .where(WeatherAlert.farmer_profile_id == profile.id)
        .order_by(WeatherAlert.starts_at.desc(), WeatherAlert.created_at.desc())
    )
    all_alerts = db.session.scalars(stmt).all()
    active_alerts = []
    for alert in all_alerts:
        if is_alert_active(alert, current_time):
            # Check if this alert maps to a disaster
            category = map_alert_to_disaster_category(alert.alert_type)
            if category is not None:
                active_alerts.append(alert)
    return active_alerts


def get_disaster_preparedness_overview(
    profile: FarmerProfile, current_time: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Provides the full disaster preparedness overview:
    - Clearly checks if any real active alert exists in the backend.
    - If active alert exists, maps it to the specific disaster category and emergency guidance.
    - If NO active alert exists, explicitly states that no disaster is occurring or imminent.
    - Keeps general preparedness guidance available for all 3 disaster categories at all times.
    - Clearly separates active alerts from general preparedness information.
    """
    active_disaster_alerts = get_active_disaster_alerts(profile, current_time)
    has_active_alerts = len(active_disaster_alerts) > 0

    active_alerts_guidance = []
    for alert in active_disaster_alerts:
        category_key = map_alert_to_disaster_category(alert.alert_type)
        cat_data = get_disaster_category_data(category_key) if category_key else None
        active_alerts_guidance.append(
            {
                "alert": alert.to_dict(),
                "disaster_category": category_key,
                "category_name_te": cat_data["category_name_te"] if cat_data else alert.title,
                "urgency_level": alert.severity,
                "emergency_actions": cat_data["active_alert_actions"] if cat_data else [],
            }
        )

    categories_list = []
    for cat in get_all_disaster_categories():
        # Check if an active alert applies to this specific category
        matching_active = [
            a for a in active_disaster_alerts
            if map_alert_to_disaster_category(a.alert_type) == cat["category_key"]
        ]
        categories_list.append(
            {
                "category_key": cat["category_key"],
                "category_name_te": cat["category_name_te"],
                "category_name_en": cat["category_name_en"],
                "icon": cat["icon"],
                "summary_te": cat["summary_te"],
                "has_active_alert": len(matching_active) > 0,
                "active_alert_count": len(matching_active),
                "general_preparedness": cat["general_preparedness"],
                "active_alert_actions": cat["active_alert_actions"],
            }
        )

    return {
        "has_active_alerts": has_active_alerts,
        "active_alert_count": len(active_disaster_alerts),
        "status_message_te": ACTIVE_ALERT_MESSAGE_TE if has_active_alerts else NO_ACTIVE_ALERT_MESSAGE_TE,
        "disaster_occurring": has_active_alerts,
        "active_alerts_guidance": active_alerts_guidance,
        "general_categories": categories_list,
        "disclaimer_te": DISASTER_DISCLAIMER_TE,
    }


def get_disaster_category_overview(
    profile: FarmerProfile, category_key: str, current_time: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Provides detailed preparedness information for a single disaster category (flood, drought, cyclone).
    """
    category_data = get_disaster_category_data(category_key)
    if not category_data:
        raise DisasterInputError(f"చెల్లని విపత్తు విభాగం: {category_key}.", 404)

    active_disaster_alerts = get_active_disaster_alerts(profile, current_time)
    matching_alerts = [
        alert.to_dict()
        for alert in active_disaster_alerts
        if map_alert_to_disaster_category(alert.alert_type) == category_key
    ]
    has_active_alert = len(matching_alerts) > 0

    return {
        "category_key": category_data["category_key"],
        "category_name_te": category_data["category_name_te"],
        "category_name_en": category_data["category_name_en"],
        "icon": category_data["icon"],
        "summary_te": category_data["summary_te"],
        "has_active_alert": has_active_alert,
        "active_alerts": matching_alerts,
        "general_preparedness": category_data["general_preparedness"],
        "active_alert_actions": category_data["active_alert_actions"],
        "status_message_te": (
            f"మీ ప్రాంతంలో {category_data['category_name_te']}కు సంబంధించి క్రియాశీల హెచ్చరిక ఉంది."
            if has_active_alert
            else f"ప్రస్తుతం {category_data['category_name_te']}కు సంబంధించి ఎటువంటి క్రియాశీల హెచ్చరికలు లేవు."
        ),
        "disclaimer_te": DISASTER_DISCLAIMER_TE,
    }
