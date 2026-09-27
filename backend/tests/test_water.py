from datetime import date
from decimal import Decimal

from flask_jwt_extended import create_access_token

from app.extensions import db
from app.models import FarmerProfile, User, WaterBudget, WaterUsage

FARMER = {
    "name": "రైతు పరీక్ష",
    "mobile": "9000000003",
    "password": "Test@1234",
    "village": "పరీక్ష గ్రామం",
    "district": "పరీక్ష జిల్లా",
    "preferred_language": "తెలుగు",
}

PROFILE = {
    "name": FARMER["name"],
    "village": FARMER["village"],
    "district": FARMER["district"],
    "crop": "పంట పరీక్ష",
    "land_area": 2,
    "crop_stage": "పంట దశ పరీక్ష",
    "water_source": "బోర్‌వెల్",
    "available_water": 100,
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


def set_budget(client, headers, amount):
    return client.post(
        "/api/water-budget",
        headers=headers,
        json={"amount": amount, "unit": "liters"},
    )


def test_water_endpoints_require_authentication(client):
    assert client.get("/api/water-budget").status_code == 401
    assert client.post("/api/water-budget", json={"amount": 100, "unit": "liters"}).status_code == 401
    assert client.get("/api/water-usage").status_code == 401
    assert client.post(
        "/api/water-usage", json={"amount": 1, "unit": "liters"}
    ).status_code == 401


def test_new_farmer_has_no_fake_water_data(client):
    headers = register_headers(client)

    budget = client.get("/api/water-budget", headers=headers)
    history = client.get("/api/water-usage", headers=headers)

    assert budget.status_code == 200
    assert budget.json["budget"]["available_water"] is None
    assert budget.json["budget"]["total_used"] == 0
    assert budget.json["budget"]["remaining_water"] is None
    assert budget.json["budget"]["warning_level"] == "not_set"
    assert history.status_code == 200
    assert history.json["usages"] == []


def test_budget_updates_real_profile_and_returns_summary(client, app):
    headers = register_headers(client)

    saved = set_budget(client, headers, 100)

    assert saved.status_code == 200
    assert saved.json["budget"]["available_water"] == 100
    assert saved.json["budget"]["total_used"] == 0
    assert saved.json["budget"]["remaining_water"] == 100
    assert saved.json["budget"]["usage_percent"] == 0
    assert saved.json["budget"]["unit"] == "liters"
    assert saved.json["budget"]["low_warning_percent"] == 30
    assert saved.json["budget"]["very_low_warning_percent"] == 15
    with app.app_context():
        profile = db.session.scalar(db.select(FarmerProfile))
        budget = db.session.scalar(db.select(WaterBudget))
        assert profile.available_water == Decimal("100.00")
        assert budget.amount_liters == profile.available_water
        assert budget.period_start == date(date.today().year, 1, 1)

    received = client.get("/api/water-budget", headers=headers)
    assert received.json["budget"]["available_water"] == 100
    profile_response = client.get("/api/profile", headers=headers)
    assert profile_response.json["profile"]["available_water"] == 100

    updated = set_budget(client, headers, 120)
    assert updated.status_code == 200
    with app.app_context():
        assert db.session.scalar(db.select(db.func.count()).select_from(WaterBudget)) == 1
        profile = db.session.scalar(db.select(FarmerProfile))
        assert profile.available_water == Decimal("120.00")
    assert client.get("/api/profile", headers=headers).json["profile"]["available_water"] == 120


def test_usage_persists_history_and_calculates_remaining_water(client, app):
    headers = register_headers(client)
    assert set_budget(client, headers, 100).status_code == 200

    saved = client.post(
        "/api/water-usage",
        headers=headers,
        json={"amount": 25, "unit": "liters", "notes": "పరీక్ష గమనిక"},
    )

    assert saved.status_code == 201
    assert saved.json["budget"]["total_used"] == 25
    assert saved.json["budget"]["remaining_water"] == 75
    assert saved.json["budget"]["usage_percent"] == 25
    history = client.get("/api/water-usage", headers=headers)
    assert len(history.json["usages"]) == 1
    assert history.json["usages"][0]["amount"] == 25
    assert history.json["usages"][0]["notes"] == "పరీక్ష గమనిక"
    assert history.json["usages"][0]["unit"] == "liters"

    with app.app_context():
        assert db.session.scalar(db.select(db.func.count()).select_from(WaterBudget)) == 1
        assert db.session.scalar(
            db.select(db.func.count()).select_from(WaterUsage)
        ) == 1


def test_usage_cannot_exceed_budget_and_remaining_never_goes_negative(client):
    headers = register_headers(client)
    set_budget(client, headers, 30)

    response = client.post(
        "/api/water-usage",
        headers=headers,
        json={"amount": 31, "unit": "liters"},
    )

    assert response.status_code == 409
    assert client.get("/api/water-budget", headers=headers).json["budget"]["remaining_water"] == 30


def test_budget_cannot_be_lowered_below_current_period_usage(client):
    headers = register_headers(client)
    set_budget(client, headers, 50)
    client.post(
        "/api/water-usage",
        headers=headers,
        json={"amount": 20, "unit": "liters"},
    )

    response = set_budget(client, headers, 19)

    assert response.status_code == 409
    summary = client.get("/api/water-budget", headers=headers).json["budget"]
    assert summary["available_water"] == 50
    assert summary["remaining_water"] == 30


def test_budget_and_usage_reject_invalid_amounts_and_units(client):
    headers = register_headers(client)
    for amount in (0, -1, "bad", True, None):
        response = set_budget(client, headers, amount)
        assert response.status_code == 400
    assert client.post(
        "/api/water-budget",
        headers=headers,
        json={"amount": 10, "unit": "gallons"},
    ).status_code == 400

    assert set_budget(client, headers, 100).status_code == 200
    for amount in (0, -1, "bad", True, None):
        response = client.post(
            "/api/water-usage",
            headers=headers,
            json={"amount": amount, "unit": "liters"},
        )
        assert response.status_code == 400

    assert client.post(
        "/api/water-usage",
        headers=headers,
        json={"amount": 1, "unit": "gallons"},
    ).status_code == 400
    assert client.post(
        "/api/water-usage",
        headers=headers,
        json={"amount": 1, "unit": "liters", "notes": []},
    ).status_code == 400
    assert set_budget(client, headers, 10).status_code == 200
    assert set_budget(client, headers, 10.999).status_code == 400


def test_warning_levels_use_documented_percentage_thresholds(client):
    headers = register_headers(client)
    set_budget(client, headers, 100)

    assert client.get("/api/water-budget", headers=headers).json["budget"]["warning_level"] == "normal"
    client.post("/api/water-usage", headers=headers, json={"amount": 70, "unit": "liters"})
    assert client.get("/api/water-budget", headers=headers).json["budget"]["warning_level"] == "low"
    client.post("/api/water-usage", headers=headers, json={"amount": 15, "unit": "liters"})
    assert client.get("/api/water-budget", headers=headers).json["budget"]["warning_level"] == "very_low"


def test_users_cannot_access_each_others_water_data(client):
    first_headers = register_headers(client)
    set_budget(client, first_headers, 100)
    client.post(
        "/api/water-usage",
        headers=first_headers,
        json={"amount": 10, "unit": "liters", "notes": "వ్యక్తిగత గమనిక"},
    )
    second_headers = register_headers(client, mobile="9000000004")

    second_budget = client.get("/api/water-budget", headers=second_headers)
    second_history = client.get("/api/water-usage", headers=second_headers)

    assert second_budget.json["budget"]["available_water"] is None
    assert second_budget.json["budget"]["total_used"] == 0
    assert second_history.json["usages"] == []


def test_profile_update_synchronizes_the_authoritative_budget(client):
    headers = register_headers(client)
    response = client.put("/api/profile", headers=headers, json=PROFILE)

    assert response.status_code == 200
    budget = client.get("/api/water-budget", headers=headers).json["budget"]
    assert budget["available_water"] == PROFILE["available_water"]
    assert budget["remaining_water"] == PROFILE["available_water"]


def test_profile_cannot_set_budget_below_recorded_usage(client):
    headers = register_headers(client)
    assert client.put("/api/profile", headers=headers, json=PROFILE).status_code == 200
    client.post(
        "/api/water-usage",
        headers=headers,
        json={"amount": 40, "unit": "liters"},
    )
    reduced_profile = {**PROFILE, "available_water": 39}

    response = client.put("/api/profile", headers=headers, json=reduced_profile)

    assert response.status_code == 409
    assert client.get("/api/water-budget", headers=headers).json["budget"]["available_water"] == 100
