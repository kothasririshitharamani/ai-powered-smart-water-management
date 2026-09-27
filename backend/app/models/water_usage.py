from datetime import datetime, timezone
from uuid import uuid4

from app.extensions import db


class WaterUsage(db.Model):
    __tablename__ = "water_usages"
    __table_args__ = (
        db.CheckConstraint("amount_liters >= 0", name="ck_water_usages_nonnegative_amount"),
    )

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    farmer_profile_id = db.Column(
        db.String(36), db.ForeignKey("farmer_profiles.id", ondelete="CASCADE"), nullable=False
    )
    amount_liters = db.Column(db.Numeric(14, 2), nullable=False)
    recorded_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    source = db.Column(db.String(120), nullable=True)
    notes = db.Column(db.Text, nullable=True)

    farmer_profile = db.relationship("FarmerProfile", back_populates="water_usages")