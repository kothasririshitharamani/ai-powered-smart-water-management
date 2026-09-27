from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.services.scarcity_allocation_service import (
    ScarcityAllocationError,
    add_farmer_crop,
    authenticated_profile,
    delete_farmer_crop,
    get_or_sync_farmer_crops,
    get_scarcity_summary,
    save_allocation_plan,
)

scarcity_bp = Blueprint("scarcity_allocation", __name__)


@scarcity_bp.get("/scarcity-allocation")
@jwt_required()
def get_allocation():
    try:
        _, profile = authenticated_profile()
        summary = get_scarcity_summary(profile)
        return jsonify(summary), 200
    except ScarcityAllocationError as err:
        return jsonify(message=str(err)), err.status


@scarcity_bp.post("/scarcity-allocation")
@jwt_required()
def create_or_update_allocation():
    try:
        _, profile = authenticated_profile()
        payload = request.get_json(silent=True) or {}
        items = payload.get("items")
        notes = payload.get("notes")

        if not items:
            return jsonify(message="కనీసం ఒక పంటకు నీటి కేటాయింపు వివరాలు ఇవ్వండి."), 400

        plan = save_allocation_plan(profile, items, notes=notes)
        summary = get_scarcity_summary(profile)
        return (
            jsonify(
                plan=plan,
                summary=summary,
                message="నీటి కేటాయింపు ప్రణాళిక విజయవంతంగా భద్రపరచబడింది.",
            ),
            200,
        )
    except ScarcityAllocationError as err:
        return jsonify(message=str(err)), err.status


@scarcity_bp.get("/scarcity-allocation/crops")
@jwt_required()
def list_crops():
    try:
        _, profile = authenticated_profile()
        crops = get_or_sync_farmer_crops(profile)
        return jsonify(crops=[c.to_dict() for c in crops]), 200
    except ScarcityAllocationError as err:
        return jsonify(message=str(err)), err.status


@scarcity_bp.post("/scarcity-allocation/crops")
@jwt_required()
def create_crop():
    try:
        _, profile = authenticated_profile()
        payload = request.get_json(silent=True) or {}

        crop_name = payload.get("crop_name")
        area_acres = payload.get("area_acres")
        crop_stage = payload.get("crop_stage")
        priority = payload.get("priority")

        crop = add_farmer_crop(
            profile,
            crop_name=crop_name,
            area_acres=area_acres,
            crop_stage=crop_stage,
            priority=priority,
        )
        return (
            jsonify(
                crop=crop.to_dict(),
                message="పంట వివరాలు విజయవంతంగా జోడించబడ్డాయి.",
            ),
            201,
        )
    except ScarcityAllocationError as err:
        return jsonify(message=str(err)), err.status


@scarcity_bp.delete("/scarcity-allocation/crops/<crop_id>")
@jwt_required()
def remove_crop(crop_id):
    try:
        _, profile = authenticated_profile()
        delete_farmer_crop(profile, crop_id)
        return jsonify(message="పంట వివరాలు విజయవంతంగా తొలగించబడ్డాయి."), 200
    except ScarcityAllocationError as err:
        return jsonify(message=str(err)), err.status
