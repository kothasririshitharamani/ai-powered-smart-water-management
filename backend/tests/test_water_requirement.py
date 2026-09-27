from decimal import Decimal
from flask_jwt_extended import create_access_token

from app.extensions import db
from app.models import FarmerProfile, User, WaterRequirementEstimate

FARMER_1 = {
    "name": "రైతు అంచనా 1",
    "mobile": "9000000021",
    "password": "Test@1234",
    "village": "అంచనా గ్రామం",
    "district": "కృష్ణా",
    "preferred_language": "తెలుగు",
}

FARMER_2 = {
    "name": "రైతు అంచనా 2",
    "mobile": "9000000022",
    "password": "Test@1234",
    "village": "రెండో గ్రామం",
    "district": "గుంటూరు",
    "preferred_language": "తెలుగు",
}


def register_headers(client, farmer_data):
    res = client.post("/api/auth/register", json=farmer_data)
    assert res.status_code == 201
    with client.application.app_context():
        user = db.session.scalar(
            db.select(User).where(User.mobile == farmer_data["mobile"])
        )
        token = create_access_token(identity=user.id)
    return {"Authorization": f"Bearer {token}"}


def update_profile(client, headers, **kwargs):
    profile_payload = {
        "name": kwargs.get("name", "రైతు అంచనా"),
        "village": kwargs.get("village", "గ్రామం"),
        "district": kwargs.get("district", "జిల్లా"),
        "crop": kwargs.get("crop", "వరి"),
        "land_area": kwargs.get("land_area", 2.0),
        "crop_stage": kwargs.get("crop_stage", "వృద్ధి దశ"),
        "water_source": kwargs.get("water_source", "బోర్‌వెల్"),
        "available_water": kwargs.get("available_water", 2500000),
        "preferred_language": "తెలుగు",
    }
    return client.put("/api/profile", headers=headers, json=profile_payload)


def test_water_requirement_endpoints_require_authentication(client):
    assert client.get("/api/water-requirement").status_code == 401
    assert client.post("/api/water-requirement/calculate").status_code == 401
    assert client.get("/api/water-requirement/history").status_code == 401


def test_missing_profile_inputs_returns_clear_telugu_guidance(client):
    headers = register_headers(client, FARMER_1)

    # Initially, new registration only has name, mobile, village, district; crop & area are None
    get_res = client.get("/api/water-requirement", headers=headers)
    assert get_res.status_code == 200
    data = get_res.json
    assert data["has_required_inputs"] is False
    assert "crop" in data["missing_fields"]
    assert "land_area" in data["missing_fields"]
    assert "crop_stage" in data["missing_fields"]
    assert "పంట" in data["message"]
    assert "భూమి విస్తీర్ణం" in data["message"]
    assert "పంట దశ" in data["message"]
    assert data["estimate"] is None

    # Triggering calculate directly returns 422 with the missing fields
    calc_res = client.post("/api/water-requirement/calculate", headers=headers)
    assert calc_res.status_code == 422
    assert "crop" in calc_res.json["missing_fields"]


def test_valid_profile_inputs_calculate_and_persist_estimate(client, app):
    headers = register_headers(client, FARMER_1)

    # Set profile: Paddy (వరి - 1,200,000 L/acre), 2.0 acres, Vegetative (వృద్ధి దశ - factor 1.0)
    # Available water budget: 2,500,000 L
    update_res = update_profile(
        client,
        headers,
        crop="వరి",
        land_area=2.0,
        crop_stage="వృద్ధి దశ",
        available_water=2500000,
    )
    assert update_res.status_code == 200

    get_res = client.get("/api/water-requirement", headers=headers)
    assert get_res.status_code == 200
    data = get_res.json
    assert data["has_required_inputs"] is True
    assert data["missing_fields"] == []

    estimate = data["estimate"]
    assert estimate is not None
    assert estimate["crop"] == "వరి"
    assert estimate["land_area_acres"] == 2.0
    assert estimate["crop_stage"] == "వృద్ధి దశ"
    assert estimate["base_liters_per_acre"] == 1200000.0
    assert estimate["stage_factor"] == 1.0
    # Expected: 2.0 * 1,200,000 * 1.0 = 2,400,000
    assert estimate["estimated_liters"] == 2400000.0
    assert estimate["available_water_liters"] == 2500000.0
    assert estimate["remaining_water_liters"] == 2500000.0
    # Balance: 2,500,000 - 2,400,000 = +100,000
    assert estimate["water_balance_liters"] == 100000.0
    assert estimate["is_sufficient"] is True
    assert "లెక్కింపు వివరాలు:" in estimate["explanation"]
    assert "భూమి విస్తీర్ణం × ప్రామాణిక నీటి అవసరం × పంట దశ గుణకం" in estimate["explanation"]

    # Verify database persistence
    with app.app_context():
        saved = db.session.scalar(db.select(WaterRequirementEstimate))
        assert saved is not None
        assert saved.estimated_liters == Decimal("2400000.00")
        assert saved.is_sufficient is True


def test_calculation_consistency_across_crops_and_stages(client):
    headers = register_headers(client, FARMER_1)

    # 1. Paddy in Flowering stage: factor 1.2
    # 2.0 acres * 1,200,000 * 1.2 = 2,880,000 liters.
    # Available budget: 2,500,000. Deficit: -380,000. is_sufficient: False
    update_profile(
        client,
        headers,
        crop="వరి",
        land_area=2.0,
        crop_stage="పూత దశ",
        available_water=2500000,
    )
    res1 = client.post("/api/water-requirement/calculate", headers=headers)
    assert res1.status_code == 200
    est1 = res1.json["estimate"]
    assert est1["stage_factor"] == 1.2
    assert est1["estimated_liters"] == 2880000.0
    assert est1["is_sufficient"] is False
    assert est1["water_balance_liters"] == -380000.0
    assert "నీటి కొరత" in est1["explanation"]

    # 2. Cotton in Sowing stage: base 700,000, factor 0.6
    # 3.0 acres * 700,000 * 0.6 = 1,260,000 liters.
    update_profile(
        client,
        headers,
        crop="పత్తి",
        land_area=3.0,
        crop_stage="విత్తే దశ",
        available_water=2000000,
    )
    res2 = client.post("/api/water-requirement/calculate", headers=headers)
    assert res2.status_code == 200
    est2 = res2.json["estimate"]
    assert est2["crop"] == "పత్తి"
    assert est2["base_liters_per_acre"] == 700000.0
    assert est2["stage_factor"] == 0.6
    assert est2["estimated_liters"] == 1260000.0
    assert est2["is_sufficient"] is True


def test_history_records_past_estimates(client):
    headers = register_headers(client, FARMER_1)
    update_profile(client, headers, crop="వరి", land_area=1.0, crop_stage="వృద్ధి దశ")
    client.post("/api/water-requirement/calculate", headers=headers)

    update_profile(client, headers, crop="మొక్కజొన్న", land_area=2.0, crop_stage="విత్తే దశ")
    client.post("/api/water-requirement/calculate", headers=headers)

    history_res = client.get("/api/water-requirement/history", headers=headers)
    assert history_res.status_code == 200
    history = history_res.json["history"]
    assert len(history) == 2
    assert history[0]["crop"] == "మొక్కజొన్న"
    assert history[1]["crop"] == "వరి"


def test_farmer_isolation_for_water_requirement(client):
    headers_1 = register_headers(client, FARMER_1)
    update_profile(client, headers_1, crop="చెరకు", land_area=5.0, crop_stage="వృద్ధి దశ")
    client.post("/api/water-requirement/calculate", headers=headers_1)

    headers_2 = register_headers(client, FARMER_2)
    history_2 = client.get("/api/water-requirement/history", headers=headers_2)
    assert history_2.status_code == 200
    assert history_2.json["history"] == []

    req_2 = client.get("/api/water-requirement", headers=headers_2)
    assert req_2.status_code == 200
    assert req_2.json["has_required_inputs"] is False
