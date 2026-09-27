from datetime import datetime, timedelta, timezone
from flask_jwt_extended import create_access_token

from app.extensions import db
from app.models import FarmerProfile, User, WeatherAlert
from app.data.disaster_preparedness_data import (
    map_alert_to_disaster_category,
    ALERT_TYPE_TO_DISASTER_CATEGORY,
    DISASTER_PREPAREDNESS_REGISTRY,
)

FARMER_1 = {
    "name": "రమేష్ రైతు",
    "mobile": "9876543210",
    "password": "Password123",
    "village": "కొత్తపల్లి",
    "district": "కృష్ణా",
    "preferred_language": "తెలుగు",
}

FARMER_2 = {
    "name": "సురేష్ రైతు",
    "mobile": "9876543211",
    "password": "Password123",
    "village": "రామవరం",
    "district": "గుంటూరు",
    "preferred_language": "తెలుగు",
}


def register_and_login(client, farmer):
    res = client.post("/api/auth/register", json=farmer)
    assert res.status_code == 201
    with client.application.app_context():
        user = db.session.scalar(
            db.select(User).where(User.mobile == farmer["mobile"])
        )
        token = create_access_token(identity=user.id)
    return {"Authorization": f"Bearer {token}"}


def test_alert_type_mapping():
    """Verify mapping of weather alert types to disaster categories."""
    assert map_alert_to_disaster_category("flood") == "flood"
    assert map_alert_to_disaster_category("heavy_rain") == "flood"
    assert map_alert_to_disaster_category("cyclone") == "cyclone"
    assert map_alert_to_disaster_category("thunderstorm") == "cyclone"
    assert map_alert_to_disaster_category("dry_spell") == "drought"
    assert map_alert_to_disaster_category("heatwave") == "drought"

    # Non-disaster alerts must not trigger false disaster alarms
    assert map_alert_to_disaster_category("general") is None
    assert map_alert_to_disaster_category("") is None
    assert map_alert_to_disaster_category(None) is None
    assert map_alert_to_disaster_category("unknown_type") is None


def test_unauthenticated_access(client):
    """Ensure disaster preparedness endpoints require authentication."""
    res1 = client.get("/api/disaster-preparedness")
    assert res1.status_code == 401

    res2 = client.get("/api/disaster-preparedness/flood")
    assert res2.status_code == 401


def test_overview_without_active_alerts(client):
    """
    When no active alerts exist:
    - Do NOT falsely claim disaster is occurring.
    - General preparedness guidance is available for flood, drought, cyclone.
    - Status clearly says no active disaster alert exists.
    """
    headers = register_and_login(client, FARMER_1)
    res = client.get("/api/disaster-preparedness", headers=headers)
    assert res.status_code == 200
    data = res.get_json()

    assert data["has_active_alerts"] is False
    assert data["disaster_occurring"] is False
    assert data["active_alert_count"] == 0
    assert data["active_alerts_guidance"] == []
    assert "ఎటువంటి క్రియాశీల విపత్తు హెచ్చరికలు లేవు" in data["status_message_te"]

    # All 3 categories are provided
    categories = data["general_categories"]
    assert len(categories) == 3
    cat_keys = [c["category_key"] for c in categories]
    assert "flood" in cat_keys
    assert "drought" in cat_keys
    assert "cyclone" in cat_keys

    # Check that each category has general practical preparedness items
    for cat in categories:
        assert len(cat["general_preparedness"]) >= 4
        assert cat["has_active_alert"] is False

    # Check disclaimer mentions it's not a government relief scheme
    assert "ప్రభుత్వ సహాయ" in data["disclaimer_te"]


def test_overview_with_flood_alert_mapping(client, app):
    """
    When a heavy rain/flood alert exists:
    - Automatically links to Flood Preparedness.
    - Shows emergency actions and alert details.
    - Maintains separation from general preparedness info.
    """
    headers = register_and_login(client, FARMER_1)
    with app.app_context():
        user = db.session.scalar(db.select(User).where(User.mobile == FARMER_1["mobile"]))
        profile = user.farmer_profile
        now = datetime.now(timezone.utc)
        alert = WeatherAlert(
            farmer_profile=profile,
            alert_type="heavy_rain",
            title="భారీ వర్ష హెచ్చరిక",
            details="రాగల 24 గంటల్లో మీ మండలంలో అతి భారీ వర్షాలు కురిసే అవకాశం ఉంది.",
            severity="high",
            starts_at=now,
            ends_at=now + timedelta(hours=24),
            is_read=False,
        )
        db.session.add(alert)
        db.session.commit()

    res = client.get("/api/disaster-preparedness", headers=headers)
    assert res.status_code == 200
    data = res.get_json()

    assert data["has_active_alerts"] is True
    assert data["disaster_occurring"] is True
    assert data["active_alert_count"] == 1
    assert len(data["active_alerts_guidance"]) == 1

    active_item = data["active_alerts_guidance"][0]
    assert active_item["disaster_category"] == "flood"
    assert active_item["category_name_te"] == "వరద సంసిద్ధత"
    assert active_item["alert"]["title"] == "భారీ వర్ష హెచ్చరిక"
    assert len(active_item["emergency_actions"]) >= 4

    # Flood category in general_categories marks has_active_alert=True
    flood_cat = next(c for c in data["general_categories"] if c["category_key"] == "flood")
    assert flood_cat["has_active_alert"] is True

    # Drought category remains has_active_alert=False
    drought_cat = next(c for c in data["general_categories"] if c["category_key"] == "drought")
    assert drought_cat["has_active_alert"] is False


def test_expired_alert_does_not_trigger_active_guidance(client, app):
    """
    An alert that ended in the past should not claim a disaster is occurring.
    """
    headers = register_and_login(client, FARMER_1)
    with app.app_context():
        user = db.session.scalar(db.select(User).where(User.mobile == FARMER_1["mobile"]))
        profile = user.farmer_profile
        db.session.query(WeatherAlert).filter(WeatherAlert.farmer_profile_id == profile.id).delete()
        now = datetime.now(timezone.utc)
        old_alert = WeatherAlert(
            farmer_profile=profile,
            alert_type="cyclone",
            title="పాత తుఫాను హెచ్చరిక",
            details="ముగిసిన తుఫాను వివరాలు.",
            severity="critical",
            starts_at=now - timedelta(days=5),
            ends_at=now - timedelta(days=2),
            is_read=True,
        )
        db.session.add(old_alert)
        db.session.commit()

    res = client.get("/api/disaster-preparedness", headers=headers)
    assert res.status_code == 200
    data = res.get_json()

    assert data["has_active_alerts"] is False
    assert data["disaster_occurring"] is False
    assert len(data["active_alerts_guidance"]) == 0


def test_category_detail_endpoints(client):
    """Test detailed views for flood, drought, and cyclone."""
    headers = register_and_login(client, FARMER_1)
    for cat_key in ["flood", "drought", "cyclone"]:
        res = client.get(f"/api/disaster-preparedness/{cat_key}", headers=headers)
        assert res.status_code == 200
        data = res.get_json()
        assert data["category_key"] == cat_key
        assert len(data["general_preparedness"]) >= 4
        assert len(data["active_alert_actions"]) >= 4

    # Invalid category
    res_inv = client.get("/api/disaster-preparedness/earthquake", headers=headers)
    assert res_inv.status_code == 404
    assert "చెల్లని విపత్తు విభాగం" in res_inv.get_json()["error"]


def test_farmer_isolation(client, app):
    """Alerts belonging to another farmer must never trigger guidance for the current farmer."""
    headers1 = register_and_login(client, FARMER_1)
    headers2 = register_and_login(client, FARMER_2)

    with app.app_context():
        user2 = db.session.scalar(db.select(User).where(User.mobile == FARMER_2["mobile"]))
        profile2 = user2.farmer_profile

        # Add cyclone alert to profile2 only
        now = datetime.now(timezone.utc)
        alert2 = WeatherAlert(
            farmer_profile_id=profile2.id,
            alert_type="cyclone",
            title="తీవ్ర తుఫాను హెచ్చరిక రైతు 2",
            details="రైతు 2 ప్రాంతానికి మాత్రమే వర్తించే హెచ్చరిక.",
            severity="critical",
            starts_at=now,
            ends_at=now + timedelta(days=1),
        )
        db.session.add(alert2)
        db.session.commit()

    # Query with user1 headers
    res1 = client.get("/api/disaster-preparedness", headers=headers1)
    assert res1.status_code == 200
    data1 = res1.get_json()

    # User 1 must not see user 2's cyclone alert
    for item in data1["active_alerts_guidance"]:
        assert item["alert"]["title"] != "తీవ్ర తుఫాను హెచ్చరిక రైతు 2"

    # Query with user2 headers
    res2 = client.get("/api/disaster-preparedness", headers=headers2)
    assert res2.status_code == 200
    data2 = res2.get_json()
    assert data2["has_active_alerts"] is True
    assert any(item["alert"]["title"] == "తీవ్ర తుఫాను హెచ్చరిక రైతు 2" for item in data2["active_alerts_guidance"])


def test_voice_assistant_disaster_routing(client):
    """Verify voice assistant routes disaster preparedness queries truthfully."""
    headers = register_and_login(client, FARMER_1)
    res = client.post(
        "/api/voice-assistant/query",
        headers=headers,
        json={"query": "వరద వస్తే ఏం చేయాలి?"},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["intent"] == "disaster_preparedness"
    assert "వరద" in data["response_text"]
    assert "data" in data
    assert "general_categories" in data["data"]
