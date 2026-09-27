from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import User
from app.models.farmer_profile import FarmerProfile
from app.services.auth_service import validate_login_credentials, validate_registration

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify(error="A JSON request body is required."), 400

    registration, error = validate_registration(payload)
    if error:
        return jsonify(error=error), 400

    user = User(mobile=registration["mobile"])
    user.set_password(registration["password"])
    user.farmer_profile = FarmerProfile(
        full_name=registration["name"],
        village=registration["village"],
        district=registration["district"],
        preferred_language=registration["preferred_language"],
    )
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="An account with this mobile number already exists."), 409

    return jsonify(user=user.to_dict()), 201


@auth_bp.post("/login")
def login():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify(error="A JSON request body is required."), 400

    mobile, password, error = validate_login_credentials(payload)
    if error:
        return jsonify(error=error), 400

    user = db.session.scalar(db.select(User).where(User.mobile == mobile))
    if user is None or not user.check_password(password):
        return jsonify(error="Invalid mobile or password."), 401

    token = create_access_token(identity=user.id)
    return jsonify(access_token=token, token_type="Bearer", user=user.to_dict()), 200


@auth_bp.get("/me")
@jwt_required()
def current_user():
    user = db.session.get(User, get_jwt_identity())
    if user is None:
        return jsonify(error="Authenticated account was not found."), 401
    return jsonify(user=user.to_dict()), 200