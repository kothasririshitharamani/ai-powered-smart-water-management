from decimal import Decimal
from flask_jwt_extended import create_access_token

from app.extensions import db
from app.models import FarmerCrop, FarmerProfile, User, WaterAllocationPlan

FARMER_1 = {
    "name": "రైతు కొరత 1",
    "mobile": "9000000031",
    "password": "Test@1234",
    "village": "కొరత గ్రామం 1",
    "district": "కర్నూలు",
    "preferred_language": "తెలుగు",
}

FARMER_2 = {
    "name": "రైతు కొరత 2",
    "mobile": "9000000032",
    "password": "Test@1234",
    "village": "కొరత గ్రామం 2",
    "district": "అనంతపురం",
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
        "name": kwargs.get("name", "రైతు కొరత"),
        "village": kwargs.get("village", "కొరత గ్రామం"),
        "district": kwargs.get("district", "కర్నూలు"),
        "crop": kwargs.get("crop", "వరి"),
        "land_area": kwargs.get("land_area", 2.0),
        "crop_stage": kwargs.get("crop_stage", "వృద్ధి దశ"),
        "water_source": kwargs.get("water_source", "బోర్‌వెల్"),
        "available_water": kwargs.get("available_water", 1000000),
        "preferred_language": "తెలుగు",
    }
    return client.put("/api/profile", headers=headers, json=profile_payload)


def test_scarcity_endpoints_require_authentication(client):
    assert client.get("/api/scarcity-allocation").status_code == 401
    assert client.post("/api/scarcity-allocation", json={"items": []}).status_code == 401
    assert client.get("/api/scarcity-allocation/crops").status_code == 401
    assert client.post("/api/scarcity-allocation/crops", json={}).status_code == 401
    assert client.delete("/api/scarcity-allocation/crops/fake-id").status_code == 401


def test_scarcity_summary_no_budget(client):
    headers = register_headers(client, FARMER_1)
    res = client.get("/api/scarcity-allocation", headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["can_allocate"] is False
    assert data["available_water"] is None
    assert data["remaining_water"] is None
    assert "బడ్జెట్" in data["message"]


def test_scarcity_summary_auto_syncs_initial_crop_from_profile(client):
    headers = register_headers(client, FARMER_1)
    update_profile(client, headers, crop="వరి", land_area=3.5, crop_stage="వృద్ధి దశ", available_water=1200000)

    res = client.get("/api/scarcity-allocation", headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["can_allocate"] is True
    assert data["available_water"] == 1200000.0
    assert data["remaining_water"] == 1200000.0
    assert len(data["crops"]) == 1
    assert data["crops"][0]["crop_name"] == "వరి"
    assert data["crops"][0]["area_acres"] == 3.5


def test_add_and_delete_farmer_crop(client):
    headers = register_headers(client, FARMER_1)
    update_profile(client, headers, crop="వరి", land_area=3.0, available_water=1000000)

    # Add second crop
    add_res = client.post(
        "/api/scarcity-allocation/crops",
        headers=headers,
        json={
            "crop_name": "మొక్కజొన్న",
            "area_acres": 2.0,
            "crop_stage": "ప్రారంభ దశ",
            "priority": 2,
        },
    )
    assert add_res.status_code == 201
    crop_data = add_res.get_json()["crop"]
    assert crop_data["crop_name"] == "మొక్కజొన్న"
    assert crop_data["area_acres"] == 2.0
    crop_id = crop_data["id"]

    # Verify crops list
    list_res = client.get("/api/scarcity-allocation/crops", headers=headers)
    assert list_res.status_code == 200
    crops = list_res.get_json()["crops"]
    assert len(crops) == 2

    # Delete second crop
    del_res = client.delete(f"/api/scarcity-allocation/crops/{crop_id}", headers=headers)
    assert del_res.status_code == 200

    # Verify only 1 crop left
    list_res_after = client.get("/api/scarcity-allocation/crops", headers=headers)
    crops_after = list_res_after.get_json()["crops"]
    assert len(crops_after) == 1
    assert crops_after[0]["crop_name"] == "వరి"


def test_save_scarcity_allocation_plan_success(client):
    headers = register_headers(client, FARMER_1)
    # Available water = 1,000,000 L
    update_profile(client, headers, crop="వరి", land_area=3.0, available_water=1000000)

    # Record some usage: 200,000 L => Remaining = 800,000 L
    usage_res = client.post(
        "/api/water-usage",
        headers=headers,
        json={"amount": 200000, "unit": "liters"},
    )
    assert usage_res.status_code == 201

    # Allocate across 2 crops: 500,000 L to వరి (3 ac), 200,000 L to పత్తి (2 ac)
    plan_payload = {
        "items": [
            {
                "crop_name": "వరి",
                "area_acres": 3.0,
                "allocated_liters": 500000,
                "priority": 1,
            },
            {
                "crop_name": "పత్తి",
                "area_acres": 2.0,
                "allocated_liters": 200000,
                "priority": 2,
            },
        ],
        "notes": "నీటి కొరత తాత్కాలిక ప్రణాళిక",
    }
    save_res = client.post("/api/scarcity-allocation", headers=headers, json=plan_payload)
    assert save_res.status_code == 200
    data = save_res.get_json()
    plan = data["plan"]
    assert plan["total_budget_liters"] == 1000000.0
    assert plan["already_used_liters"] == 200000.0
    assert plan["remaining_water_liters"] == 800000.0
    assert plan["total_allocated_liters"] == 700000.0
    assert plan["unallocated_water_liters"] == 100000.0
    assert plan["allocation_percentage"] == 87.5  # 700000 / 800000 * 100
    assert plan["notes"] == "నీటి కొరత తాత్కాలిక ప్రణాళిక"

    items = plan["items"]
    assert len(items) == 2
    assert items[0]["crop_name"] == "వరి"
    assert items[0]["allocated_liters"] == 500000.0
    assert items[0]["percentage_of_remaining"] == 62.5
    assert items[0]["liters_per_acre"] == round(500000.0 / 3.0, 2)

    assert items[1]["crop_name"] == "పత్తి"
    assert items[1]["allocated_liters"] == 200000.0
    assert items[1]["percentage_of_remaining"] == 25.0
    assert items[1]["liters_per_acre"] == 100000.0

    # Check summary endpoint reflects plan
    summary_res = client.get("/api/scarcity-allocation", headers=headers)
    assert summary_res.status_code == 200
    sum_data = summary_res.get_json()
    assert sum_data["total_allocated"] == 700000.0
    assert sum_data["unallocated_water"] == 100000.0
    assert sum_data["current_plan"] is not None


def test_reject_allocation_exceeding_remaining_water(client):
    headers = register_headers(client, FARMER_1)
    update_profile(client, headers, crop="వరి", land_area=2.0, available_water=500000)

    # Remaining water is 500,000 L. Attempt to allocate 600,000 L.
    plan_payload = {
        "items": [
            {
                "crop_name": "వరి",
                "area_acres": 2.0,
                "allocated_liters": 600000,
                "priority": 1,
            }
        ]
    }
    save_res = client.post("/api/scarcity-allocation", headers=headers, json=plan_payload)
    assert save_res.status_code == 409
    err = save_res.get_json()
    assert "మొత్తం కేటాయింపు" in err["message"]
    assert "ఎక్కువగా ఉంది" in err["message"]


def test_scarcity_validation_errors(client):
    headers = register_headers(client, FARMER_1)
    update_profile(client, headers, crop="వరి", land_area=2.0, available_water=500000)

    # Empty items
    res = client.post("/api/scarcity-allocation", headers=headers, json={"items": []})
    assert res.status_code == 400

    # Negative liters
    res = client.post(
        "/api/scarcity-allocation",
        headers=headers,
        json={"items": [{"crop_name": "వరి", "area_acres": 2.0, "allocated_liters": -50}]},
    )
    assert res.status_code == 400

    # Zero area
    res = client.post(
        "/api/scarcity-allocation",
        headers=headers,
        json={"items": [{"crop_name": "వరి", "area_acres": 0, "allocated_liters": 100}]},
    )
    assert res.status_code == 400

    # Missing crop name
    res = client.post(
        "/api/scarcity-allocation",
        headers=headers,
        json={"items": [{"crop_name": "   ", "area_acres": 2.0, "allocated_liters": 100}]},
    )
    assert res.status_code == 400


def test_scarcity_farmer_isolation(client):
    headers_1 = register_headers(client, FARMER_1)
    update_profile(client, headers_1, crop="వరి", land_area=2.0, available_water=500000)

    # Farmer 1 creates crop and plan
    crop_res = client.post(
        "/api/scarcity-allocation/crops",
        headers=headers_1,
        json={"crop_name": "మిరప", "area_acres": 1.5, "priority": 2},
    )
    assert crop_res.status_code == 201
    crop_1_id = crop_res.get_json()["crop"]["id"]

    client.post(
        "/api/scarcity-allocation",
        headers=headers_1,
        json={
            "items": [
                {"crop_name": "వరి", "area_acres": 2.0, "allocated_liters": 300000},
                {"crop_name": "మిరప", "area_acres": 1.5, "allocated_liters": 150000},
            ]
        },
    )

    # Farmer 2 registers
    headers_2 = register_headers(client, FARMER_2)
    update_profile(client, headers_2, crop="పత్తి", land_area=4.0, available_water=800000)

    # Farmer 2 should not see Farmer 1's crops or plan
    f2_res = client.get("/api/scarcity-allocation", headers=headers_2)
    assert f2_res.status_code == 200
    f2_data = f2_res.get_json()
    assert f2_data["current_plan"] is None
    assert len(f2_data["crops"]) == 1
    assert f2_data["crops"][0]["crop_name"] == "పత్తి"

    # Farmer 2 cannot delete Farmer 1's crop
    del_res = client.delete(f"/api/scarcity-allocation/crops/{crop_1_id}", headers=headers_2)
    assert del_res.status_code == 404
