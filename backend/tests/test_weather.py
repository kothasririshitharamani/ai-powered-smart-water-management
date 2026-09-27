from datetime import datetime, timezone
from flask_jwt_extended import create_access_token

from app.extensions import db
from app.models import User, WeatherAlert

FARMER = {
    "name": "రైతు వాతావరణం",
    "mobile": "9000000005",
    "password": "Test@1234",
    "village": "వాతావరణ గ్రామం",
    "district": "కృష్ణా",
    "preferred_language": "తెలుగు",
}


def register_headers(client, mobile=None):
    registration = {**FARMER, "mobile": mobile or FARMER["mobile"]}
    assert client.post("/api/auth/register", json=registration).status_code == 201
    with client.application.app_context():
        user = db.session.scalar(
            db.select(User).where(User.mobile == registration["mobile"])
        )
        token = create_access_token(identity=user.id)
    return {"Authorization": f"Bearer {token}"}


SAMPLE_ALERT = {
    "title": "భారీ వర్ష సూచన",
    "details": "రాగల 24 గంటల్లో భారీ నుండి అతి భారీ వర్షాలు కురిసే అవకాశం ఉంది. పొలంలో నీటి నిల్వను సరిచూసుకోండి.",
    "alert_type": "heavy_rain",
    "severity": "high",
    "starts_at": "2026-09-28T06:00:00Z",
    "ends_at": "2026-09-29T18:00:00Z",
}


def test_weather_endpoints_require_authentication(client):
    assert client.get("/api/weather-alerts").status_code == 401
    assert client.post("/api/weather-alerts", json=SAMPLE_ALERT).status_code == 401
    assert client.get("/api/weather-alerts/non-existent-id").status_code == 401
    assert client.patch("/api/weather-alerts/non-existent-id/read").status_code == 401


def test_new_farmer_has_no_fake_weather_alerts(client):
    headers = register_headers(client)

    response = client.get("/api/weather-alerts", headers=headers)
    assert response.status_code == 200
    assert response.json["alerts"] == []
    assert response.json["unread_count"] == 0


def test_create_weather_alert_validates_and_persists(client, app):
    headers = register_headers(client)

    create_res = client.post(
        "/api/weather-alerts",
        headers=headers,
        json=SAMPLE_ALERT,
    )
    assert create_res.status_code == 201
    alert_data = create_res.json["alert"]
    assert alert_data["title"] == SAMPLE_ALERT["title"]
    assert alert_data["details"] == SAMPLE_ALERT["details"]
    assert alert_data["alert_type"] == "heavy_rain"
    assert alert_data["severity"] == "high"
    assert alert_data["is_read"] is False
    assert alert_data["id"] is not None

    with app.app_context():
        count = db.session.scalar(db.select(db.func.count()).select_from(WeatherAlert))
        assert count == 1
        saved = db.session.scalar(db.select(WeatherAlert))
        assert saved.title == SAMPLE_ALERT["title"]
        assert saved.is_read is False

    list_res = client.get("/api/weather-alerts", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json["alerts"]) == 1
    assert list_res.json["unread_count"] == 1
    assert list_res.json["alerts"][0]["id"] == alert_data["id"]

    get_single = client.get(f"/api/weather-alerts/{alert_data['id']}", headers=headers)
    assert get_single.status_code == 200
    assert get_single.json["alert"]["title"] == SAMPLE_ALERT["title"]


def test_create_weather_alert_rejects_invalid_inputs(client):
    headers = register_headers(client)

    assert client.post("/api/weather-alerts", headers=headers, data="bad").status_code == 400

    # Missing / empty title
    assert client.post(
        "/api/weather-alerts",
        headers=headers,
        json={**SAMPLE_ALERT, "title": ""},
    ).status_code == 400

    # Title too long
    assert client.post(
        "/api/weather-alerts",
        headers=headers,
        json={**SAMPLE_ALERT, "title": "A" * 181},
    ).status_code == 400

    # Missing / empty details
    assert client.post(
        "/api/weather-alerts",
        headers=headers,
        json={**SAMPLE_ALERT, "details": ""},
    ).status_code == 400

    # Invalid alert_type
    assert client.post(
        "/api/weather-alerts",
        headers=headers,
        json={**SAMPLE_ALERT, "alert_type": "invalid_type_xyz"},
    ).status_code == 400

    # Invalid severity
    assert client.post(
        "/api/weather-alerts",
        headers=headers,
        json={**SAMPLE_ALERT, "severity": "super_extreme"},
    ).status_code == 400

    # Invalid starts_at format
    assert client.post(
        "/api/weather-alerts",
        headers=headers,
        json={**SAMPLE_ALERT, "starts_at": "not-a-date"},
    ).status_code == 400

    # ends_at earlier than starts_at
    assert client.post(
        "/api/weather-alerts",
        headers=headers,
        json={
            **SAMPLE_ALERT,
            "starts_at": "2026-09-28T12:00:00Z",
            "ends_at": "2026-09-28T10:00:00Z",
        },
    ).status_code == 400


def test_mark_alert_as_read(client):
    headers = register_headers(client)

    create_res = client.post(
        "/api/weather-alerts",
        headers=headers,
        json=SAMPLE_ALERT,
    )
    alert_id = create_res.json["alert"]["id"]

    patch_res = client.patch(f"/api/weather-alerts/{alert_id}/read", headers=headers)
    assert patch_res.status_code == 200
    assert patch_res.json["alert"]["is_read"] is True

    list_res = client.get("/api/weather-alerts", headers=headers)
    assert list_res.json["unread_count"] == 0
    assert list_res.json["alerts"][0]["is_read"] is True

    unread_res = client.get("/api/weather-alerts?unread=true", headers=headers)
    assert unread_res.json["alerts"] == []

    not_found = client.patch("/api/weather-alerts/non-existent/read", headers=headers)
    assert not_found.status_code == 404


def test_farmers_cannot_access_each_others_alerts(client):
    headers_1 = register_headers(client, mobile="9000000011")
    create_res = client.post(
        "/api/weather-alerts",
        headers=headers_1,
        json=SAMPLE_ALERT,
    )
    alert_id = create_res.json["alert"]["id"]

    headers_2 = register_headers(client, mobile="9000000012")
    list_res = client.get("/api/weather-alerts", headers=headers_2)
    assert list_res.status_code == 200
    assert list_res.json["alerts"] == []
    assert list_res.json["unread_count"] == 0

    get_res = client.get(f"/api/weather-alerts/{alert_id}", headers=headers_2)
    assert get_res.status_code == 404

    patch_res = client.patch(f"/api/weather-alerts/{alert_id}/read", headers=headers_2)
    assert patch_res.status_code == 404
