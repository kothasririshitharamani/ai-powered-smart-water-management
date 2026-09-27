from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.services.weather_service import (
    WeatherInputError,
    authenticated_profile,
    create_weather_alert,
    get_alert_by_id,
    get_unread_count,
    get_weather_alerts,
    mark_alert_read,
    validate_weather_alert,
)

weather_bp = Blueprint("weather", __name__)


@weather_bp.get("/weather-alerts")
@jwt_required()
def list_weather_alerts():
    try:
        _, profile = authenticated_profile()
        unread_only = request.args.get("unread", "").lower() in {"true", "1"}
        alerts = get_weather_alerts(profile, unread_only=unread_only)
        unread_count = get_unread_count(profile)
        return (
            jsonify(
                alerts=[alert.to_dict() for alert in alerts],
                unread_count=unread_count,
            ),
            200,
        )
    except WeatherInputError as error:
        db.session.rollback()
        return jsonify(error=str(error)), error.status


@weather_bp.post("/weather-alerts")
@jwt_required()
def create_alert():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify(error="JSON వివరాలు పంపండి."), 400
    try:
        _, profile = authenticated_profile()
        data = validate_weather_alert(payload)
        alert = create_weather_alert(profile, data)
        return jsonify(alert=alert.to_dict()), 201
    except WeatherInputError as error:
        db.session.rollback()
        return jsonify(error=str(error)), error.status


@weather_bp.get("/weather-alerts/<alert_id>")
@jwt_required()
def get_alert(alert_id):
    try:
        _, profile = authenticated_profile()
        alert = get_alert_by_id(profile, alert_id)
        return jsonify(alert=alert.to_dict()), 200
    except WeatherInputError as error:
        db.session.rollback()
        return jsonify(error=str(error)), error.status


@weather_bp.route("/weather-alerts/<alert_id>/read", methods=["PATCH", "POST"])
@jwt_required()
def read_alert(alert_id):
    try:
        _, profile = authenticated_profile()
        alert = mark_alert_read(profile, alert_id)
        return jsonify(alert=alert.to_dict()), 200
    except WeatherInputError as error:
        db.session.rollback()
        return jsonify(error=str(error)), error.status
