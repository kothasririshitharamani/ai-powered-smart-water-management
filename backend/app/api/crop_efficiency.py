from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import User
from app.services.crop_efficiency_service import (
    CropEfficiencyError,
    compare_crops,
    list_crop_efficiency_registry,
)

crop_efficiency_bp = Blueprint("crop_efficiency", __name__)


def get_current_profile():
    identity = get_jwt_identity()
    if not identity:
        return None
    user = db.session.get(User, identity)
    return user.farmer_profile if user else None


@crop_efficiency_bp.get("/crop-efficiency")
@jwt_required()
def get_crop_efficiency():
    try:
        data = list_crop_efficiency_registry()
        return jsonify(data), 200
    except CropEfficiencyError as err:
        return jsonify(message=str(err)), err.status


@crop_efficiency_bp.post("/crop-efficiency/compare")
@jwt_required()
def compare():
    try:
        profile = get_current_profile()
        payload = request.get_json(silent=True) or {}
        crop_keys = payload.get("crop_keys")
        land_area_acres = payload.get("land_area_acres")

        result = compare_crops(
            crop_keys=crop_keys,
            land_area_acres=land_area_acres,
            profile=profile,
        )
        return jsonify(result), 200
    except CropEfficiencyError as err:
        return jsonify(message=str(err)), err.status
