from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.services.water_service import (
    WATER_UNIT,
    WaterInputError,
    authenticated_profile,
    budget_summary,
    create_usage,
    parse_amount,
    serialize_usage,
    upsert_current_budget,
    usage_history,
    validate_unit,
)

water_bp = Blueprint("water", __name__)


@water_bp.get("/water-budget")
@jwt_required()
def get_water_budget():
    try:
        _, profile = authenticated_profile()
        return jsonify(budget=budget_summary(profile)), 200
    except WaterInputError as error:
        db.session.rollback()
        return jsonify(error=str(error)), error.status


@water_bp.post("/water-budget")
@jwt_required()
def set_water_budget():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify(error="JSON వివరాలు పంపండి."), 400
    try:
        validate_unit(payload)
        amount = parse_amount(payload)
        _, profile = authenticated_profile()
        upsert_current_budget(profile, amount)
        db.session.commit()
        return jsonify(budget=budget_summary(profile, commit_sync=False)), 200
    except WaterInputError as error:
        db.session.rollback()
        return jsonify(error=str(error)), error.status


@water_bp.get("/water-usage")
@jwt_required()
def get_water_usage():
    try:
        _, profile = authenticated_profile()
        return jsonify(usages=[serialize_usage(item) for item in usage_history(profile)]), 200
    except WaterInputError as error:
        db.session.rollback()
        return jsonify(error=str(error)), error.status


@water_bp.post("/water-usage")
@jwt_required()
def record_water_usage():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify(error="JSON వివరాలు పంపండి."), 400
    try:
        validate_unit(payload)
        amount = parse_amount(payload)
        notes = payload.get("notes", "")
        if not isinstance(notes, str) or len(notes) > 500:
            raise WaterInputError("గమనిక 500 అక్షరాలకు మించకూడదు.")
        _, profile = authenticated_profile()
        usage = create_usage(profile, amount, notes.strip() or None)
        return jsonify(
            usage=serialize_usage(usage),
            budget=budget_summary(profile, commit_sync=False),
        ), 201
    except WaterInputError as error:
        db.session.rollback()
        return jsonify(error=str(error)), error.status