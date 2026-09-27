from app.extensions import db
from app.models import FarmerProfile, User

FARMER = {
    "name": "రమేష్",
    "mobile": "9000000001",
    "password": "Test@1234",
    "village": "కొత్తపల్లి",
    "district": "కృష్ణా",
    "preferred_language": "తెలుగు",
}


def test_successful_registration_creates_mobile_farmer(client):
    response = client.post("/api/auth/register", json=FARMER)

    assert response.status_code == 201
    assert response.json["user"]["mobile"] == FARMER["mobile"]
    assert response.json["user"]["farmer_profile"] == {
        "name": FARMER["name"],
        "village": FARMER["village"],
        "district": FARMER["district"],
        "crop": None,
        "land_area": None,
        "crop_stage": None,
        "water_source": None,
        "available_water": None,
        "preferred_language": FARMER["preferred_language"],
    }
    assert "email" not in response.json["user"]


def test_password_is_hashed_and_never_returned(client, app):
    response = client.post("/api/auth/register", json=FARMER)

    assert response.status_code == 201
    assert FARMER["password"] not in response.get_data(as_text=True)
    with app.app_context():
        user = db.session.scalar(db.select(User))
        assert user is not None
        assert user.password_hash != FARMER["password"]
        assert user.check_password(FARMER["password"])
        profile = db.session.scalar(
            db.select(FarmerProfile).where(FarmerProfile.user_id == user.id)
        )
        assert profile is not None


def test_register_rejects_duplicate_mobile(client):
    assert client.post("/api/auth/register", json=FARMER).status_code == 201

    response = client.post("/api/auth/register", json=FARMER)

    assert response.status_code == 409


def test_login_with_mobile_and_password_succeeds(client):
    client.post("/api/auth/register", json=FARMER)

    response = client.post(
        "/api/auth/login",
        json={"mobile": FARMER["mobile"], "password": FARMER["password"]},
    )

    assert response.status_code == 200
    assert response.json["user"]["mobile"] == FARMER["mobile"]


def test_login_rejects_incorrect_password(client):
    client.post("/api/auth/register", json=FARMER)

    response = client.post(
        "/api/auth/login",
        json={"mobile": FARMER["mobile"], "password": "incorrect-password"},
    )

    assert response.status_code == 401


def test_email_is_not_a_login_identifier(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "farmer@example.com", "password": FARMER["password"]},
    )

    assert response.status_code == 400


def test_login_returns_a_jwt(client):
    client.post("/api/auth/register", json=FARMER)

    response = client.post(
        "/api/auth/login",
        json={"mobile": FARMER["mobile"], "password": FARMER["password"]},
    )

    assert response.status_code == 200
    assert response.json["token_type"] == "Bearer"
    assert response.json["access_token"]


def test_current_user_requires_a_valid_jwt(client):
    assert client.get("/api/auth/me").status_code == 401

    client.post("/api/auth/register", json=FARMER)
    login_response = client.post(
        "/api/auth/login",
        json={"mobile": FARMER["mobile"], "password": FARMER["password"]},
    )
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {login_response.json['access_token']}"},
    )

    assert response.status_code == 200
    assert response.json["user"]["mobile"] == FARMER["mobile"]


def test_register_requires_all_farmer_fields(client):
    response = client.post(
        "/api/auth/register",
        json={"mobile": FARMER["mobile"], "password": FARMER["password"]},
    )

    assert response.status_code == 400