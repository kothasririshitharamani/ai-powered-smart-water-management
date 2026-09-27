import base64
import io
import json
from unittest.mock import patch

from PIL import Image
from flask_jwt_extended import create_access_token

from app.extensions import db
from app.models import SoilAnalysisReport, User

FARMER_1 = {
    "name": "రైతు నేల 1",
    "mobile": "9000000051",
    "password": "Test@1234",
    "village": "నేల గ్రామం 1",
    "district": "గుంటూరు",
    "preferred_language": "తెలుగు",
}

FARMER_2 = {
    "name": "రైతు నేల 2",
    "mobile": "9000000052",
    "password": "Test@1234",
    "village": "నేల గ్రామం 2",
    "district": "కృష్ణా",
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


def create_dummy_jpeg_base64(width=100, height=100, color=(120, 80, 50)):
    image = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    image.save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


SAMPLE_VALID_AI_RESPONSE = json.dumps({
    "apparent_soil_characteristics": "నల్లరేగడి నేల స్వభావం, గడ్డలతో కూడిన ఉపరితలం గమనించబడింది.",
    "possible_moisture_condition": "ఉపరితలం స్వల్పంగా పొడిగా ఉంది, లోతైన పొరల్లో తేమ ఉండే అవకాశం ఉంది.",
    "visible_issues": ["ఎండ తీవ్రత వల్ల ఉపరితలంపై స్వల్ప పగుళ్లు", "సేంద్రీయ పదార్థ లోపం కనిపించవచ్చు"],
    "recommended_next_steps": [
        "రైతు భరోసా కేంద్రం (RBK) లేదా KVK వద్ద భౌతిక నేల నమూనా పరీక్ష చేయించండి.",
        "భూసారాన్ని పెంచడానికి పశువుల ఎరువు లేదా పచ్చిరొట్ట ఎరువులను చేర్చండి.",
        "తేమ ఆవిరి కాకుండా అవసరమైతే మల్చింగ్ చేపట్టండి.",
    ],
    "uncertainty_and_limitations": "ఇది కేవలం ఫోటో ఆధారిత దృశ్య పరిశీలన మాత్రమే. అంతర్గత పోషకాల కొరకు ల్యాబ్ పరీక్ష అవసరం.",
    "requires_laboratory_testing": True,
})


def test_soil_analysis_endpoints_require_authentication(client):
    assert client.post("/api/soil-analysis", json={}).status_code == 401
    assert client.get("/api/soil-analysis/history").status_code == 401
    assert client.get("/api/soil-analysis/latest").status_code == 401


def test_missing_or_invalid_image_payload(client):
    headers = register_headers(client, FARMER_1)

    # Empty payload
    res = client.post("/api/soil-analysis", headers=headers, json={})
    assert res.status_code == 400
    assert "ఫోటోను ఎంచుకోండి" in res.get_json()["message"]

    # Not a base64 image
    res = client.post(
        "/api/soil-analysis",
        headers=headers,
        json={"image_base64": "invalid-not-base64", "mime_type": "image/jpeg"},
    )
    assert res.status_code == 400

    # Corrupted / invalid image bytes (longer than min 50 bytes)
    corrupt_b64 = base64.b64encode(b"hello world this is not an image but it is long enough to exceed min bytes").decode()
    res = client.post(
        "/api/soil-analysis",
        headers=headers,
        json={"image_base64": corrupt_b64, "mime_type": "image/jpeg"},
    )
    assert res.status_code == 400
    assert "సరైన ఫోటో" in res.get_json()["message"]


def test_gemini_unavailable_when_api_key_not_configured(client):
    headers = register_headers(client, FARMER_1)
    b64_img = create_dummy_jpeg_base64()

    # In test client, GEMINI_API_KEY is unset/empty
    with patch.dict("os.environ", {"GEMINI_API_KEY": ""}):
        client.application.config["GEMINI_API_KEY"] = ""
        res = client.post(
            "/api/soil-analysis",
            headers=headers,
            json={"image_base64": b64_img, "mime_type": "image/jpeg"},
        )
        assert res.status_code == 503
        data = res.get_json()
        assert "కాన్ఫిగర్ చేయబడలేదు" in data["message"]


def test_gemini_mocked_success_full_integration(client):
    headers = register_headers(client, FARMER_1)
    b64_img = create_dummy_jpeg_base64()

    client.application.config["GEMINI_API_KEY"] = "fake-test-key-for-mock"

    with patch("app.services.soil_analysis_service.call_gemini_api") as mock_gemini:
        mock_gemini.return_value = SAMPLE_VALID_AI_RESPONSE

        res = client.post(
            "/api/soil-analysis",
            headers=headers,
            json={"image_base64": b64_img, "mime_type": "image/jpeg"},
        )

        assert res.status_code == 200
        data = res.get_json()
        assert "report" in data
        rep = data["report"]
        assert "నల్లరేగడి" in rep["apparent_soil_characteristics"]
        assert "తేమ" in rep["possible_moisture_condition"]
        assert len(rep["visible_issues"]) >= 1
        assert len(rep["recommended_next_steps"]) >= 1
        assert rep["requires_laboratory_testing"] is True
        assert "భౌతిక నేల పరీక్ష" in rep["disclaimer_te"]

        # Verify no laboratory measurements were fabricated
        assert "pH 6" not in rep["apparent_soil_characteristics"]
        assert "NPK:" not in rep["apparent_soil_characteristics"]

        # Verify persisted in database
        history_res = client.get("/api/soil-analysis/history", headers=headers)
        assert history_res.status_code == 200
        hist = history_res.get_json()["history"]
        assert len(hist) == 1
        assert hist[0]["id"] == rep["id"]

        latest_res = client.get("/api/soil-analysis/latest", headers=headers)
        assert latest_res.status_code == 200
        assert latest_res.get_json()["report"]["id"] == rep["id"]


def test_gemini_error_handling_when_api_fails(client):
    headers = register_headers(client, FARMER_1)
    b64_img = create_dummy_jpeg_base64()

    client.application.config["GEMINI_API_KEY"] = "fake-test-key-for-mock"

    with patch("app.services.soil_analysis_service.call_gemini_api") as mock_gemini:
        mock_gemini.side_effect = RuntimeError("Quota exceeded or connection error")

        res = client.post(
            "/api/soil-analysis",
            headers=headers,
            json={"image_base64": b64_img, "mime_type": "image/jpeg"},
        )

        assert res.status_code == 502
        data = res.get_json()
        assert "AI విశ్లేషణను పూర్తి చేయలేకపోయాము" in data["message"]


def test_gemini_malformed_json_response_handling(client):
    headers = register_headers(client, FARMER_1)
    b64_img = create_dummy_jpeg_base64()

    client.application.config["GEMINI_API_KEY"] = "fake-test-key-for-mock"

    with patch("app.services.soil_analysis_service.call_gemini_api") as mock_gemini:
        mock_gemini.return_value = "Sorry, I cannot format this in JSON. Just some plain text."

        res = client.post(
            "/api/soil-analysis",
            headers=headers,
            json={"image_base64": b64_img, "mime_type": "image/jpeg"},
        )

        assert res.status_code == 502
        data = res.get_json()
        assert "సరిగ్గా అర్థం చేసుకోలేకపోయాము" in data["message"]


def test_farmer_isolation_for_soil_history(client):
    headers_1 = register_headers(client, FARMER_1)
    headers_2 = register_headers(client, FARMER_2)
    b64_img = create_dummy_jpeg_base64()

    client.application.config["GEMINI_API_KEY"] = "fake-test-key-for-mock"

    with patch("app.services.soil_analysis_service.call_gemini_api") as mock_gemini:
        mock_gemini.return_value = SAMPLE_VALID_AI_RESPONSE
        client.post(
            "/api/soil-analysis",
            headers=headers_1,
            json={"image_base64": b64_img, "mime_type": "image/jpeg"},
        )

    # Farmer 2's history should be empty
    f2_res = client.get("/api/soil-analysis/history", headers=headers_2)
    assert f2_res.status_code == 200
    assert len(f2_res.get_json()["history"]) == 0

    f2_latest = client.get("/api/soil-analysis/latest", headers=headers_2)
    assert f2_latest.status_code == 200
    assert f2_latest.get_json()["report"] is None
