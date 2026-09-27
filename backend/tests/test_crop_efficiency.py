from flask_jwt_extended import create_access_token

from app.extensions import db
from app.models import User

FARMER_DATA = {
    "name": "రైతు పోలిక",
    "mobile": "9000000041",
    "password": "Test@1234",
    "village": "సామర్థ్య గ్రామం",
    "district": "విజయవాడ",
    "preferred_language": "తెలుగు",
}


def register_headers(client, farmer_data=FARMER_DATA):
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
        "name": kwargs.get("name", "రైతు పోలిక"),
        "village": kwargs.get("village", "గ్రామం"),
        "district": kwargs.get("district", "జిల్లా"),
        "crop": kwargs.get("crop", "వరి"),
        "land_area": kwargs.get("land_area", 2.0),
        "crop_stage": kwargs.get("crop_stage", "వృద్ధి దశ"),
        "water_source": kwargs.get("water_source", "బోర్‌వెల్"),
        "available_water": kwargs.get("available_water", 2000000),
        "preferred_language": "తెలుగు",
    }
    return client.put("/api/profile", headers=headers, json=profile_payload)


def test_crop_efficiency_endpoints_require_authentication(client):
    assert client.get("/api/crop-efficiency").status_code == 401
    assert client.post("/api/crop-efficiency/compare", json={"crop_keys": ["rice", "maize"]}).status_code == 401


def test_get_crop_efficiency_list(client):
    headers = register_headers(client)
    res = client.get("/api/crop-efficiency", headers=headers)
    assert res.status_code == 200
    data = res.get_json()

    assert "crops" in data
    assert len(data["crops"]) >= 7
    assert "source" in data
    assert "ANGRAU" in data["source"] or "ఆచార్య" in data["source"]
    assert "disclaimer" in data
    assert "హామీ కాదు" in data["disclaimer"]

    # Verify documented data for Rice and Groundnut
    crop_keys = [c["crop_key"] for c in data["crops"]]
    assert "rice" in crop_keys
    assert "groundnut" in crop_keys
    assert "millets" in crop_keys

    rice = next(c for c in data["crops"] if c["crop_key"] == "rice")
    assert rice["crop_name_te"] == "వరి (వరి ధాన్యం)"
    assert rice["water_requirement_liters_per_acre"] == 1200000.0
    assert rice["efficiency_category_key"] == "low"

    millets = next(c for c in data["crops"] if c["crop_key"] == "millets")
    assert millets["water_requirement_liters_per_acre"] == 300000.0
    assert millets["efficiency_category_key"] == "very_high"
    assert millets["water_savings_vs_paddy_percent"] == 75.0


def test_compare_crops_success(client):
    headers = register_headers(client)
    payload = {
        "crop_keys": ["rice", "groundnut"],
        "land_area_acres": 2.0,
    }
    res = client.post("/api/crop-efficiency/compare", headers=headers, json=payload)
    assert res.status_code == 200
    data = res.get_json()

    assert data["land_area_acres"] == 2.0
    assert len(data["selected_crops"]) == 2
    assert "disclaimer" in data
    assert "హామీ కాదు" in data["disclaimer"]

    # Groundnut (450,000 * 2 = 900,000) vs Rice (1,200,000 * 2 = 2,400,000)
    groundnut = next(c for c in data["selected_crops"] if c["crop_key"] == "groundnut")
    rice = next(c for c in data["selected_crops"] if c["crop_key"] == "rice")

    assert groundnut["total_water_liters"] == 900000.0
    assert rice["total_water_liters"] == 2400000.0

    assert data["most_water_efficient"]["crop_key"] == "groundnut"
    assert data["least_water_efficient"]["crop_key"] == "rice"
    assert data["max_water_savings_liters"] == 1500000.0
    assert data["max_water_savings_percent"] == 62.5


def test_compare_crops_uses_profile_defaults_and_remaining_water(client):
    headers = register_headers(client)
    # Profile has 3.0 acres and 1,800,000 L available water
    update_profile(client, headers, crop="వరి", land_area=3.0, available_water=1800000)

    # Record 900,000 L usage => Remaining water is 900,000 L
    client.post(
        "/api/water-usage",
        headers=headers,
        json={"amount": 900000, "unit": "liters"},
    )

    # Compare millets and groundnut without specifying land_area_acres
    payload = {
        "crop_keys": ["millets", "groundnut"],
    }
    res = client.post("/api/crop-efficiency/compare", headers=headers, json=payload)
    assert res.status_code == 200
    data = res.get_json()

    # Should default to profile's 3.0 acres
    assert data["land_area_acres"] == 3.0
    assert data["farmer_context"]["remaining_water_liters"] == 900000.0

    millets = next(c for c in data["selected_crops"] if c["crop_key"] == "millets")
    groundnut = next(c for c in data["selected_crops"] if c["crop_key"] == "groundnut")

    # With 900,000 L remaining:
    # Millets (300,000 L/ac) => 900,000 / 300,000 = 3.0 acres
    assert millets["cultivable_acres_with_remaining_water"] == 3.0
    # Groundnut (450,000 L/ac) => 900,000 / 450,000 = 2.0 acres
    assert groundnut["cultivable_acres_with_remaining_water"] == 2.0


def test_compare_crops_validation_errors(client):
    headers = register_headers(client)

    # Fewer than 2 crops
    res = client.post("/api/crop-efficiency/compare", headers=headers, json={"crop_keys": ["rice"]})
    assert res.status_code == 400
    assert "కనీసం 2" in res.get_json()["message"]

    # Same crop duplicated
    res = client.post("/api/crop-efficiency/compare", headers=headers, json={"crop_keys": ["rice", "rice"]})
    assert res.status_code == 400
    assert "కనీసం 2" in res.get_json()["message"]

    # Invalid crop key
    res = client.post("/api/crop-efficiency/compare", headers=headers, json={"crop_keys": ["rice", "unknown_crop_xyz"]})
    assert res.status_code == 400
    assert "అందుబాటులో లేవు" in res.get_json()["message"]

    # Negative land area
    res = client.post(
        "/api/crop-efficiency/compare",
        headers=headers,
        json={"crop_keys": ["rice", "maize"], "land_area_acres": -2},
    )
    assert res.status_code == 400
    assert "సున్నా కంటే ఎక్కువ" in res.get_json()["message"]
