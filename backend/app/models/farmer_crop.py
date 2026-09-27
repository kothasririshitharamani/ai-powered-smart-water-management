from datetime import datetime, timezone
from uuid import uuid4

from app.extensions import db


class FarmerCrop(db.Model):
    __tablename__ = "farmer_crops"
    __table_args__ = (
        db.CheckConstraint("area_acres > 0", name="ck_farmer_crops_positive_area"),
        db.CheckConstraint("priority >= 1", name="ck_farmer_crops_valid_priority"),
    )

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    farmer_profile_id = db.Column(
        db.String(36),
        db.ForeignKey("farmer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    crop_name = db.Column(db.String(120), nullable=False)
    area_acres = db.Column(db.Numeric(10, 2), nullable=False)
    crop_stage = db.Column(db.String(120), nullable=True)
    priority = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    farmer_profile = db.relationship("FarmerProfile", back_populates="crops")

    def to_dict(self):
        return {
            "id": self.id,
            "crop_name": self.crop_name,
            "area_acres": float(self.area_acres),
            "crop_stage": self.crop_stage,
            "priority": self.priority,
            "created_at": (
                self.created_at.isoformat() if self.created_at else None
            ),
        }
