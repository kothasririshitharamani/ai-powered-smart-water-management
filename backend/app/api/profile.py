from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import FarmerProfile, User
from app.services.profile_service import validate_profile
from app.services.water_service import WaterInputError, parse_amount, upsert_current_budget

profile_bp = Blueprint("profile", __name__)


def _get_authenticated_user():
    return db.session.get(User, get_jwt_identity())


@profile_bp.get("")
@jwt_required()
def get_profile():
    user = _get_authenticated_user()
    if user is None:
        return jsonify(error="ఖాతా కనుగొనబడలేదు."), 404
    if user.farmer_profile is None:
        return jsonify(error="రైతు వివరాలు కనుగొనబడలేదు."), 404

    return jsonify(profile={"mobile": user.mobile, **user.farmer_profile.to_dict()}), 200


@profile_bp.put("")
@jwt_required()
def update_profile():
    user = _get_authenticated_user()
    if user is None:
        return jsonify(error="ఖాతా కనుగొనబడలేదు."), 404

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify(error="JSON వివరాలు పంపండి."), 400

    values, error = validate_profile(payload)
    if error:
        return jsonify(error=error), 400

    profile = user.farmer_profile
    if profile is None:
        profile = FarmerProfile(user=user)
        db.session.add(profile)

    for field, value in values.items():
        if field != "available_water":
            setattr(profile, field, value)
    try:
        upsert_current_budget(
            profile,
            parse_amount({"amount": values["available_water"]}, positive=False),
        )
        db.session.commit()
    except WaterInputError as error:
        db.session.rollback()
        return jsonify(error=str(error)), error.status

    return jsonify(profile={"mobile": user.mobile, **profile.to_dict()}), 200