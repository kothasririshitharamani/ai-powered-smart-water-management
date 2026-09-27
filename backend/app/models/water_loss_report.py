from datetime import datetime, timezone
from uuid import uuid4

from app.extensions import db


class WaterLossReport(db.Model):
    __tablename__ = "water_loss_reports"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    farmer_profile_id = db.Column(
        db.String(36), db.ForeignKey("farmer_profiles.id", ondelete="CASCADE"), nullable=False
    )
    description = db.Column(db.Text, nullable=False)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    status = db.Column(db.String(32), nullable=False, default="reported")
    reported_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    farmer_profile = db.relationship("FarmerProfile", back_populates="water_loss_reports")