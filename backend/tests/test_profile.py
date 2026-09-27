import pytest
from flask_jwt_extended import create_access_token

from app.extensions import db
from app.models import FarmerProfile, User

REGISTRATION = {
    "name": "రమేష్",
    "mobile": "9000000001",
    "password": "Test@1234",
    "village": "కొత్తపల్లి",
    "district": "కృష్ణా",
    "preferred_language": "తెలుగు",
}

PROFILE = {
    "name": "రమేష్",
    "village": "కొత్తపల్లి",
    "district": "కృష్ణా",
    "crop": "వరి",
    "land_area": 2,
    "crop_stage": "వృద్ధి దశ",
    "water_source": "బోర్‌వెల్",
    "available_water": 2400,
    "preferred_language": "తెలుగు",
}


def register_and_get_headers(client, registration=REGISTRATION):
    assert client.post("/api/auth/register", json=registration).status_code == 201
    with client.application.app_context():
        user = db.session.scalar(
            db.select(User).where(User.mobile == registration["mobile"])
        )
        token = create_access_token(identity=user.id)
    return {"Authorization": f"Bearer {token}"}


def test_profile_requires_authentication(client):
    assert client.get("/api/profile").status_code == 401
    assert client.put("/api/profile", json=PROFILE).status_code == 401


def test_profile_is_initially_incomplete(client):
    headers = register_and_get_headers(client)

    response = client.get("/api/profile", headers=headers)

    assert response.status_code == 200
    assert response.json["profile"] == {
        "mobile": REGISTRATION["mobile"],
        "name": REGISTRATION["name"],
        "village": REGISTRATION["village"],
        "district": REGISTRATION["district"],
        "crop": None,
        "land_area": None,
        "crop_stage": None,
        "water_source": None,
        "available_water": None,
        "preferred_language": "తెలుగు",
    }


def test_put_profile_persists_complete_profile_and_get_returns_it(client, app):
    headers = register_and_get_headers(client)

    response = client.put("/api/profile", headers=headers, json=PROFILE)

    assert response.status_code == 200
    expected = {"mobile": REGISTRATION["mobile"], **PROFILE}
    assert response.json["profile"] == expected
    assert client.get("/api/profile", headers=headers).json["profile"] == expected

    with app.app_context():
        profiles = db.session.scalars(db.select(FarmerProfile)).all()
        assert len(profiles) == 1
        assert profiles[0].user.mobile == REGISTRATION["mobile"]
        assert profiles[0].land_area_acres == 2
        assert profiles[0].available_water == 2400


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("name", "  "),
        ("village", ""),
        ("district", ""),
        ("crop", ""),
        ("crop_stage", ""),
        ("land_area", "not-a-number"),
        ("land_area", -1),
        ("available_water", "not-a-number"),
        ("available_water", -1),
        ("water_source", "చెరువు"),
        ("water_source", []),
        ("preferred_language", []),
    ],
)
def test_put_profile_rejects_invalid_fields(client, field, value):
    headers = register_and_get_headers(client)
    invalid_profile = {**PROFILE, field: value}

    response = client.put("/api/profile", headers=headers, json=invalid_profile)

    assert response.status_code == 400


def test_profile_is_scoped_to_authenticated_user(client):
    first_headers = register_and_get_headers(client)
    second_registration = {
        **REGISTRATION,
        "name": "సీత",
        "mobile": "9000000002",
    }
    second_headers = register_and_get_headers(client, second_registration)
    client.put("/api/profile", headers=first_headers, json=PROFILE)

    response = client.get("/api/profile", headers=second_headers)

    assert response.status_code == 200
    assert response.json["profile"]["mobile"] == second_registration["mobile"]
    assert response.json["profile"]["crop"] is None