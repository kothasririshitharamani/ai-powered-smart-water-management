from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.services.water_requirement_service import (
    WaterRequirementInputError,
    authenticated_profile,
    calculate_water_requirement,
    check_profile_readiness,
    get_estimate_history,
    get_latest_estimate,
)

water_requirement_bp = Blueprint("water_requirement", __name__)


@water_requirement_bp.get("/water-requirement")
@jwt_required()
def get_water_requirement():
    try:
        _, profile = authenticated_profile()
        is_ready, missing = check_profile_readiness(profile)
        if not is_ready:
            missing_labels = []
            if "crop" in missing:
                missing_labels.append("పంట")
            if "land_area" in missing:
                missing_labels.append("భూమి విస్తీర్ణం")
            if "crop_stage" in missing:
                missing_labels.append("పంట దశ")
            fields_str = ", ".join(missing_labels)
            return (
                jsonify(
                    has_required_inputs=False,
                    missing_fields=missing,
                    message=f"పంట నీటి అవసరాన్ని లెక్కించడానికి మీ ప్రొఫైల్‌లో {fields_str} వివరాలను నమోదు చేయండి.",
                    estimate=None,
                ),
                200,
            )

        latest = get_latest_estimate(profile)
        if latest is not None:
            # Check if current profile matches the latest estimate
            same_crop = latest.crop == profile.crop.strip()
            same_area = float(latest.land_area_acres) == float(profile.land_area_acres)
            same_stage = latest.crop_stage == profile.crop_stage.strip()
            if same_crop and same_area and same_stage:
                return (
                    jsonify(
                        has_required_inputs=True,
                        missing_fields=[],
                        estimate=latest.to_dict(),
                    ),
                    200,
                )

        # Calculate a new estimate if profile changed or none existed
        estimate = calculate_water_requirement(profile, persist=True)
        return (
            jsonify(
                has_required_inputs=True,
                missing_fields=[],
                estimate=estimate,
            ),
            200,
        )
    except WaterRequirementInputError as error:
        db.session.rollback()
        return (
            jsonify(
                error=str(error),
                missing_fields=error.missing_fields,
            ),
            error.status,
        )


@water_requirement_bp.post("/water-requirement/calculate")
@jwt_required()
def trigger_calculate():
    try:
        _, profile = authenticated_profile()
        estimate = calculate_water_requirement(profile, persist=True)
        return (
            jsonify(
                has_required_inputs=True,
                missing_fields=[],
                estimate=estimate,
            ),
            200,
        )
    except WaterRequirementInputError as error:
        db.session.rollback()
        return (
            jsonify(
                error=str(error),
                missing_fields=error.missing_fields,
            ),
            error.status,
        )


@water_requirement_bp.get("/water-requirement/history")
@jwt_required()
def list_history():
    try:
        _, profile = authenticated_profile()
        history = get_estimate_history(profile)
        return jsonify(history=[item.to_dict() for item in history]), 200
    except WaterRequirementInputError as error:
        db.session.rollback()
        return jsonify(error=str(error)), error.status
