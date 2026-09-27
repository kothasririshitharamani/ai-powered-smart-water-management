from decimal import Decimal
import pytest
from flask_jwt_extended import create_access_token

from app.extensions import db
from app.models import User

FARMER_1 = {
    "name": "రాము రైతు",
    "mobile": "9876543210",
    "password": "Password123",
    "village": "రామవరం",
    "district": "గుంటూరు",
    "preferred_language": "తెలుగు",
}

FARMER_2 = {
    "name": "కృష్ణ రైతు",
    "mobile": "9876543211",
    "password": "Password123",
    "village": "కృష్ణవరం",
    "district": "కృష్ణా",
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


def test_empty_query_validation(client):
    headers = register_and_login(client, FARMER_1)
    res = client.post("/api/voice-assistant/query", headers=headers, json={})
    assert res.status_code == 400
    assert "ప్రశ్నను అడగండి" in res.get_json()["message"]


def test_unauthenticated_request(client):
    res = client.post(
        "/api/voice-assistant/query",
        json={"query": "నా దగ్గర ఎంత నీరు ఉంది?"},
    )
    assert res.status_code == 401


def test_available_water_when_budget_not_set(client):
    headers = register_and_login(client, FARMER_1)
    res = client.post(
        "/api/voice-assistant/query",
        headers=headers,
        json={"query": "నా దగ్గర ఎంత నీరు ఉంది?"},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["intent"] == "available_water"
    assert "ఇంకా నీటి బడ్జెట్‌ను నమోదు చేయలేదు" in data["response_text"]


def test_water_queries_with_budget_and_usage(client):
    headers = register_and_login(client, FARMER_1)

    # 1. Set budget of 10,000 liters
    res_b = client.post(
        "/api/water-budget",
        headers=headers,
        json={"amount": 10000, "unit": "liters"},
    )
    assert res_b.status_code == 200

    # Test "నా దగ్గర ఎంత నీరు ఉంది?"
    res1 = client.post(
        "/api/voice-assistant/query",
        headers=headers,
        json={"query": "నా దగ్గర ఎంత నీరు ఉంది?"},
    )
    assert res1.status_code == 200
    d1 = res1.get_json()
    assert d1["intent"] == "available_water"
    assert "10,000" in d1["response_text"]
    assert "లీటర్లు" in d1["response_text"]

    # 2. Record usage of 3,000 liters
    res_u = client.post(
        "/api/water-usage",
        headers=headers,
        json={"amount": 3000, "unit": "liters", "notes": "మొదటి తడి"},
    )
    assert res_u.status_code == 201

    # Test "నేను ఎంత నీరు ఉపయోగించాను?"
    res2 = client.post(
        "/api/voice-assistant/query",
        headers=headers,
        json={"query": "నేను ఎంత నీరు ఉపయోగించాను?"},
    )
    assert res2.status_code == 200
    d2 = res2.get_json()
    assert d2["intent"] == "used_water"
    assert "3,000" in d2["response_text"]
    assert d2["data"]["total_used"] == 3000

    # Test "నా మిగిలిన నీరు ఎంత?"
    res3 = client.post(
        "/api/voice-assistant/query",
        headers=headers,
        json={"query": "నా మిగిలిన నీరు ఎంత?"},
    )
    assert res3.status_code == 200
    d3 = res3.get_json()
    assert d3["intent"] == "remaining_water"
    assert "7,000" in d3["response_text"]
    assert d3["data"]["remaining_water"] == 7000

    # Test "నీటి వినియోగ వివరాలు చూపించు"
    res4 = client.post(
        "/api/voice-assistant/query",
        headers=headers,
        json={"query": "నీటి వినియోగ వివరాలు చూపించు"},
    )
    assert res4.status_code == 200
    d4 = res4.get_json()
    assert d4["intent"] == "usage_details"
    assert "3,000" in d4["response_text"]
    assert d4["data"]["usage_count"] == 1


def test_crop_water_requirement_query(client):
    headers = register_and_login(client, FARMER_1)

    # Set complete profile
    res_prof = client.put(
        "/api/profile",
        headers=headers,
        json={
            "name": "రాము రైతు",
            "village": "రామవరం",
            "district": "గుంటూరు",
            "crop": "వరి",
            "land_area": 2,
            "crop_stage": "వృద్ధి దశ",
            "water_source": "బోర్‌వెల్",
            "available_water": 5000,
            "preferred_language": "తెలుగు",
        },
    )
    assert res_prof.status_code == 200

    # Asks crop requirement
    res = client.post(
        "/api/voice-assistant/query",
        headers=headers,
        json={"query": "పంటకు ఎంత నీరు కావాలి?"},
    )
    assert res.status_code == 200
    d = res.get_json()
    assert d["intent"] == "crop_requirement"
    assert "వరి" in d["response_text"]
    assert "2.0 ఎకరాలు" in d["response_text"] or "2 ఎకరాలు" in d["response_text"]
    assert "లీటర్ల నీరు అవసరం" in d["response_text"]


def test_help_and_unsupported_queries(client):
    headers = register_and_login(client, FARMER_1)

    # Greeting / Help
    res_help = client.post(
        "/api/voice-assistant/query",
        headers=headers,
        json={"query": "నమస్కారం సహాయం కావాలి"},
    )
    assert res_help.status_code == 200
    d_help = res_help.get_json()
    assert d_help["intent"] == "help"
    assert "రైతు మిత్ర" in d_help["response_text"]

    # Unsupported query
    res_unsupp = client.post(
        "/api/voice-assistant/query",
        headers=headers,
        json={"query": "రేపు సినిమా చూడటానికి వెళ్ళాలా?"},
    )
    assert res_unsupp.status_code == 200
    d_unsupp = res_unsupp.get_json()
    assert d_unsupp["intent"] == "unsupported"
    assert "క్షమించండి" in d_unsupp["response_text"]
    assert "నా దగ్గర ఎంత నీరు ఉంది?" in d_unsupp["response_text"]


def test_farmer_data_isolation(client):
    headers1 = register_and_login(client, FARMER_1)
    headers2 = register_and_login(client, FARMER_2)

    # Farmer 1 sets 8,000L
    client.post(
        "/api/water-budget",
        headers=headers1,
        json={"amount": 8000, "unit": "liters"},
    )

    # Farmer 2 sets 3,000L
    client.post(
        "/api/water-budget",
        headers=headers2,
        json={"amount": 3000, "unit": "liters"},
    )

    # Farmer 1 query
    res1 = client.post(
        "/api/voice-assistant/query",
        headers=headers1,
        json={"query": "నా దగ్గర ఎంత నీరు ఉంది?"},
    )
    assert "8,000" in res1.get_json()["response_text"]
    assert "3,000" not in res1.get_json()["response_text"]

    # Farmer 2 query
    res2 = client.post(
        "/api/voice-assistant/query",
        headers=headers2,
        json={"query": "నా దగ్గర ఎంత నీరు ఉంది?"},
    )
    assert "3,000" in res2.get_json()["response_text"]
    assert "8,000" not in res2.get_json()["response_text"]
