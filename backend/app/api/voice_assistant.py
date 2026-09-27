from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.services.voice_assistant_service import (
    authenticated_profile,
    process_assistant_query,
    VoiceAssistantError,
)

voice_assistant_bp = Blueprint("voice_assistant", __name__)


@voice_assistant_bp.post("/voice-assistant/query")
@jwt_required()
def query_assistant():
    try:
        _, profile = authenticated_profile()
        payload = request.get_json(silent=True) or {}
        query = payload.get("query")
        audio_base64 = payload.get("audio_base64")

        result = process_assistant_query(
            profile=profile,
            raw_query=query,
            audio_base64=audio_base64,
        )
        return jsonify(result), 200
    except VoiceAssistantError as err:
        return jsonify(message=err.message), err.status
