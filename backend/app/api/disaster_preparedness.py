from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.services.disaster_preparedness_service import (
    DisasterInputError,
    authenticated_profile,
    get_disaster_preparedness_overview,
    get_disaster_category_overview,
)

disaster_preparedness_bp = Blueprint("disaster_preparedness", __name__)


@disaster_preparedness_bp.get("/disaster-preparedness")
@jwt_required()
def disaster_preparedness_overview():
    try:
        _, profile = authenticated_profile()
        overview = get_disaster_preparedness_overview(profile)
        return jsonify(overview), 200
    except DisasterInputError as error:
        db.session.rollback()
        return jsonify(error=str(error)), error.status


@disaster_preparedness_bp.get("/disaster-preparedness/<category_key>")
@jwt_required()
def disaster_category_detail(category_key):
    try:
        _, profile = authenticated_profile()
        detail = get_disaster_category_overview(profile, category_key)
        return jsonify(detail), 200
    except DisasterInputError as error:
        db.session.rollback()
        return jsonify(error=str(error)), error.status
