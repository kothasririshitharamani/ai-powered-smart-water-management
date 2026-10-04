import base64
import io
import json
import logging
import os
import re
from PIL import Image
from flask import current_app
from sqlalchemy import select

from app.extensions import db
from app.models import SoilAnalysisReport, User

logger = logging.getLogger(__name__)

ALLOWED_MIME_TYPES = {
    "image/jpeg": "JPEG",
    "image/jpg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WEBP",
}

MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB
MIN_IMAGE_BYTES = 50

TELUGU_DISCLAIMER = (
    "ఇది దృశ్య ఆధారిత ప్రాథమిక పరిశీలన మాత్రమే. కచ్చితమైన నేల పోషకాలు (నత్రజని, భాస్వరం, పొటాష్ - NPK), "
    "pH మరియు లవణీయత వివరాల కోసం Rythu Bharosa Kendram / వ్యవసాయ ప్రయోగశాలలో భౌతిక నేల పరీక్ష తప్పనిసరి."
)


class SoilAnalysisError(Exception):
    def __init__(self, message, status=400, code="SOIL_ANALYSIS_ERROR", detail=None):
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code
        self.detail = detail


class SoilAnalysisInputError(SoilAnalysisError):
    def __init__(self, message, status=400, code="INPUT_ERROR", detail=None):
        super().__init__(message, status=status, code=code, detail=detail)


class SoilAnalysisUnavailableError(SoilAnalysisError):
    def __init__(self, message, status=503, code="SERVICE_UNAVAILABLE", detail=None):
        super().__init__(message, status=status, code=code, detail=detail)


def authenticated_profile():
    from flask_jwt_extended import get_jwt_identity

    user = db.session.get(User, get_jwt_identity())
    if user is None:
        raise SoilAnalysisInputError("ఖాతా కనుగొనబడలేదు.", 404)
    if user.farmer_profile is None:
        raise SoilAnalysisInputError("రైతు ప్రొఫైల్ వివరాలు కనుగొనబడలేదు.", 404)
    return user, user.farmer_profile


def validate_and_extract_image_bytes(raw_base64, declared_mime=None):
    if not raw_base64 or not isinstance(raw_base64, str):
        raise SoilAnalysisInputError("దయచేసి నేల లేదా పంట ఫోటోను ఎంచుకోండి.", 400)

    # Strip data URL header if present (e.g. data:image/jpeg;base64,...)
    cleaned = raw_base64.strip()
    if ";base64," in cleaned:
        header, cleaned = cleaned.split(";base64,", 1)
        if not declared_mime and ":" in header:
            declared_mime = header.split(":", 1)[1]

    try:
        image_bytes = base64.b64decode(cleaned, validate=True)
    except Exception:
        raise SoilAnalysisInputError("ఫోటో సమాచారం సరైన ఫార్మాట్‌లో లేదు.", 400) from None

    if len(image_bytes) < MIN_IMAGE_BYTES:
        raise SoilAnalysisInputError("ఎంచుకున్న ఫోటో ఖాళీగా ఉంది లేదా చాలా చిన్నదిగా ఉంది.", 400)

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise SoilAnalysisInputError("ఫోటో సైజు గరిష్ఠంగా 10MB వరకు మాత్రమే ఉండాలి.", 400)

    # Validate image integrity and format using Pillow
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            detected_format = img.format
    except Exception:
        raise SoilAnalysisInputError("దయచేసి సరైన ఫోటో (JPEG, PNG లేదా WebP) ఎంచుకోండి.", 400) from None

    # Resolve MIME type
    if detected_format == "JPEG":
        resolved_mime = "image/jpeg"
    elif detected_format == "PNG":
        resolved_mime = "image/png"
    elif detected_format == "WEBP":
        resolved_mime = "image/webp"
    else:
        raise SoilAnalysisInputError("కేవలం JPEG, PNG లేదా WebP ఫోటోలు మాత్రమే అనుమతించబడతాయి.", 400)

    return image_bytes, resolved_mime


def build_analysis_prompt():
    return (
        "You are an agricultural soil and farm observation expert assisting Indian farmers. "
        "Analyze this farm or soil photograph and provide a structured visual observation report.\n\n"
        "STRICT MANDATORY RULES:\n"
        "1. DO NOT invent, hallucinate, or estimate numerical laboratory values such as pH, NPK levels, EC (salinity), or organic carbon percentage. "
        "Explicitly remind that nutrient and chemical properties require physical soil testing at an agricultural laboratory.\n"
        "2. Provide useful, actionable VISUAL observations only:\n"
        "   - apparent_soil_characteristics: visible color, texture appearance (clayey, sandy, loamy, cloddy, cracked, smooth), surface condition.\n"
        "   - possible_moisture_condition: visible moisture state (dry, moist, waterlogged, dry crust).\n"
        "   - visible_issues: list of visible surface issues (crusting, erosion, salt efflorescence, weeds, compaction cracks, standing water, or 'ఎటువంటి స్పష్టమైన సమస్యలు కనిపించలేదు').\n"
        "   - recommended_next_steps: list of practical next steps (such as soil sampling for Rythu Bharosa Kendram / Krishi Vigyan Kendra testing, adding organic matter, mulching, checking drainage).\n"
        "   - uncertainty_and_limitations: explicit statement explaining that visual assessment cannot replace physical soil testing.\n"
        "3. ALL text values in your JSON output MUST be in natural, clear Telugu (తెలుగు).\n"
        "4. Return ONLY a valid JSON object matching this exact schema without markdown formatting:\n"
        "{\n"
        '  "apparent_soil_characteristics": "...",\n'
        '  "possible_moisture_condition": "...",\n'
        '  "visible_issues": ["..."],\n'
        '  "recommended_next_steps": ["..."],\n'
        '  "uncertainty_and_limitations": "...",\n'
        '  "requires_laboratory_testing": true\n'
        "}"
    )


def parse_and_validate_ai_response(raw_text):
    if not raw_text or not isinstance(raw_text, str):
        raise SoilAnalysisUnavailableError("AI నుండి స్పందన రాలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.", 502)

    # Clean markdown fences like ```json ... ```
    cleaned = raw_text.strip()
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.DOTALL)
    if match:
        cleaned = match.group(1).strip()
    elif cleaned.startswith("{") and cleaned.endswith("}"):
        cleaned = cleaned.strip()

    try:
        data = json.loads(cleaned)
    except Exception:
        raise SoilAnalysisUnavailableError("AI విశ్లేషణను సరిగ్గా అర్థం చేసుకోలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.", 502) from None

    if not isinstance(data, dict):
        raise SoilAnalysisUnavailableError("AI విశ్లేషణ ఫలితం సరైన రూపంలో లేదు.", 502)

    apparent = str(data.get("apparent_soil_characteristics", "")).strip()
    moisture = str(data.get("possible_moisture_condition", "")).strip()
    issues = data.get("visible_issues", [])
    steps = data.get("recommended_next_steps", [])
    uncertainty = str(data.get("uncertainty_and_limitations", "")).strip()

    if not apparent:
        apparent = "నేల రంగు మరియు ప్రాథమిక ఉపరితల లక్షణాలు గమనించబడ్డాయి."
    if not moisture:
        moisture = "ఉపరితల తేమ సాధారణంగా కనిపిస్తోంది."
    if not isinstance(issues, list) or len(issues) == 0:
        issues = ["స్పష్టమైన ఉపరితల లోపాలు గమనించబడలేదు."]
    else:
        issues = [str(item).strip() for item in issues if str(item).strip()]
    if not isinstance(steps, list) or len(steps) == 0:
        steps = ["రైతు భరోసా కేంద్రం లేదా వ్యవసాయ శాఖ ప్రయోగశాలలో నేల నమూనా పరీక్ష చేయించండి."]
    else:
        steps = [str(item).strip() for item in steps if str(item).strip()]
    if not uncertainty:
        uncertainty = "ఇది కేవలం దృశ్య ఆధారిత పరిశీలన మాత్రమే. అంతర్గత పోషకాల కొరకు ప్రయోగశాల పరీక్ష అవసరం."

    return {
        "apparent_soil_characteristics": apparent,
        "possible_moisture_condition": moisture,
        "visible_issues": issues,
        "recommended_next_steps": steps,
        "uncertainty_and_limitations": uncertainty,
        "requires_laboratory_testing": True,
    }


def call_gemini_api(image_bytes, mime_type, api_key, model_name="gemini-1.5-flash"):
    try:
        import google.generativeai as genai
    except ImportError:
        logger.error("[AI Soil Analysis] google-generativeai package is not installed.")
        raise SoilAnalysisUnavailableError(
            "AI సేవల లైబ్రరీ అందుబాటులో లేదు.",
            503,
            code="DEPENDENCY_MISSING",
            detail="google-generativeai is not installed",
        ) from None

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)
        prompt = build_analysis_prompt()

        # Open image with PIL for standard GenerativeModel image multimodal input
        pil_image = Image.open(io.BytesIO(image_bytes))

        response = model.generate_content([pil_image, prompt])
        return response.text
    except Exception as exc:
        err_type = type(exc).__name__
        err_msg = str(exc)
        logger.error("[Gemini API] Generation call failed: %s (%s)", err_type, err_msg)
        print(f"[Gemini API Error] {err_type}: {err_msg}", flush=True)
        raise SoilAnalysisUnavailableError(
            "AI విశ్లేషణను పూర్తి చేయలేకపోయాము. దయచేసి స్పష్టమైన ఫోటోతో కొద్దిసేపటి తర్వాత మళ్లీ ప్రయత్నించండి.",
            502,
            code="GEMINI_API_FAILED",
            detail=f"{err_type}: {err_msg}",
        ) from None


def process_soil_image_analysis(profile, raw_base64, mime_type=None, *, gemini_caller=None):
    """
    Validates the image, invokes the Gemini API (or caller override for testing),
    validates the AI response, persists the report, and returns the structured dictionary.
    """
    image_bytes, resolved_mime = validate_and_extract_image_bytes(raw_base64, mime_type)

    api_key = current_app.config.get("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY", "")
    model_name = current_app.config.get("GEMINI_MODEL", "gemini-1.5-flash")

    # If no caller override and no API key configured, fail honestly with clear Telugu message
    # and explain exactly what configuration is missing in the developer/terminal output.
    if gemini_caller is None and (not api_key or not str(api_key).strip()):
        missing_msg = (
            "[AI Soil Analysis] GEMINI_API_KEY is not configured in backend/.env or system environment. "
            "Please configure GEMINI_API_KEY=<your_api_key> in backend/.env to enable live Gemini AI soil analysis."
        )
        logger.warning(missing_msg)
        print(missing_msg, flush=True)
        raise SoilAnalysisUnavailableError(
            "AI నేల విశ్లేషణ సేవ ప్రస్తుతం కాన్ఫిగర్ చేయబడలేదు. దయచేసి కాసేపటి తర్వాత ప్రయత్నించండి.",
            status=503,
            code="CONFIG_MISSING",
            detail="GEMINI_API_KEY is not configured in backend/.env",
        )

    try:
        if gemini_caller is not None:
            raw_ai_text = gemini_caller(image_bytes, resolved_mime)
        else:
            raw_ai_text = call_gemini_api(image_bytes, resolved_mime, api_key.strip(), model_name)
    except SoilAnalysisUnavailableError:
        raise
    except Exception as exc:
        err_type = type(exc).__name__
        err_msg = str(exc)
        logger.error("Gemini invocation failed: %s (%s)", err_type, err_msg)
        print(f"[Gemini Error] {err_type}: {err_msg}", flush=True)
        raise SoilAnalysisUnavailableError(
            "AI విశ్లేషణను పూర్తి చేయలేకపోయాము. దయచేసి స్పష్టమైన ఫోటోతో కొద్దిసేపటి తర్వాత మళ్లీ ప్రయత్నించండి.",
            502,
            code="INVOCATION_FAILED",
            detail=f"{err_type}: {err_msg}",
        ) from None

    validated_result = parse_and_validate_ai_response(raw_ai_text)

    report = SoilAnalysisReport(
        farmer_profile_id=profile.id,
        apparent_soil_characteristics=validated_result["apparent_soil_characteristics"],
        possible_moisture_condition=validated_result["possible_moisture_condition"],
        visible_issues=validated_result["visible_issues"],
        recommended_next_steps=validated_result["recommended_next_steps"],
        uncertainty_and_limitations=validated_result["uncertainty_and_limitations"],
        requires_laboratory_testing=True,
        disclaimer_te=TELUGU_DISCLAIMER,
        image_mime_type=resolved_mime,
    )
    db.session.add(report)
    db.session.commit()

    return report.to_dict()


def list_soil_analysis_history(profile, limit=10):
    reports = db.session.scalars(
        select(SoilAnalysisReport)
        .where(SoilAnalysisReport.farmer_profile_id == profile.id)
        .order_by(SoilAnalysisReport.created_at.desc())
        .limit(limit)
    ).all()
    return [r.to_dict() for r in reports]
