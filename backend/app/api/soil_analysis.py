import base64
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.services.soil_analysis_service import (
    SoilAnalysisError,
    authenticated_profile,
    list_soil_analysis_history,
    process_soil_image_analysis,
)

soil_analysis_bp = Blueprint("soil_analysis", __name__)


@soil_analysis_bp.post("/soil-analysis")
@jwt_required()
def analyze_soil():
    try:
        _, profile = authenticated_profile()

        # Support both JSON payload with base64 and multipart file upload
        raw_base64 = None
        mime_type = None

        if request.is_json:
            payload = request.get_json(silent=True) or {}
            raw_base64 = payload.get("image_base64")
            mime_type = payload.get("mime_type")
        elif "image" in request.files:
            file_obj = request.files["image"]
            mime_type = file_obj.mimetype
            raw_base64 = base64.b64encode(file_obj.read()).decode("utf-8")

        if not raw_base64:
            return jsonify(message="దయచేసి నేల లేదా పంట ఫోటోను ఎంచుకోండి."), 400

        report = process_soil_image_analysis(
            profile=profile,
            raw_base64=raw_base64,
            mime_type=mime_type,
        )

        return (
            jsonify(
                report=report,
                message="నేల విశ్లేషణ విజయవంతంగా పూర్తయింది.",
            ),
            200,
        )
    except SoilAnalysisError as err:
        return jsonify(message=err.message), err.status


@soil_analysis_bp.get("/soil-analysis/history")
@jwt_required()
def get_history():
    try:
        _, profile = authenticated_profile()
        history = list_soil_analysis_history(profile)
        return jsonify(history=history, reports=history), 200
    except SoilAnalysisError as err:
        return jsonify(message=err.message), err.status


@soil_analysis_bp.get("/soil-analysis/latest")
@jwt_required()
def get_latest():
    try:
        _, profile = authenticated_profile()
        history = list_soil_analysis_history(profile, limit=1)
        latest = history[0] if history else None
        return jsonify(report=latest), 200
    except SoilAnalysisError as err:
        return jsonify(message=err.message), err.status
