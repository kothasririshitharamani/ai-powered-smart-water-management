from datetime import datetime, timezone
from uuid import uuid4

from app.extensions import db


class WaterRequirementEstimate(db.Model):
    __tablename__ = "water_requirement_estimates"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    farmer_profile_id = db.Column(
        db.String(36),
        db.ForeignKey("farmer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    crop = db.Column(db.String(120), nullable=False)
    land_area_acres = db.Column(db.Numeric(10, 2), nullable=False)
    crop_stage = db.Column(db.String(120), nullable=False)
    stage_factor = db.Column(db.Numeric(4, 2), nullable=False)
    base_liters_per_acre = db.Column(db.Numeric(14, 2), nullable=False)
    estimated_liters = db.Column(db.Numeric(14, 2), nullable=False)
    available_water_liters = db.Column(db.Numeric(14, 2), nullable=True)
    remaining_water_liters = db.Column(db.Numeric(14, 2), nullable=True)
    water_balance_liters = db.Column(db.Numeric(14, 2), nullable=True)
    is_sufficient = db.Column(db.Boolean, nullable=True)
    explanation = db.Column(db.Text, nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    farmer_profile = db.relationship(
        "FarmerProfile", back_populates="water_requirement_estimates"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "crop": self.crop,
            "land_area_acres": float(self.land_area_acres),
            "crop_stage": self.crop_stage,
            "stage_factor": float(self.stage_factor),
            "base_liters_per_acre": float(self.base_liters_per_acre),
            "estimated_liters": float(self.estimated_liters),
            "available_water_liters": (
                float(self.available_water_liters)
                if self.available_water_liters is not None
                else None
            ),
            "remaining_water_liters": (
                float(self.remaining_water_liters)
                if self.remaining_water_liters is not None
                else None
            ),
            "water_balance_liters": (
                float(self.water_balance_liters)
                if self.water_balance_liters is not None
                else None
            ),
            "is_sufficient": self.is_sufficient,
            "explanation": self.explanation,
            "created_at": (
                self.created_at.isoformat() if self.created_at else None
            ),
        }
