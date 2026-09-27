from datetime import datetime, timezone
from uuid import uuid4

from app.extensions import db


class WeatherAlert(db.Model):
    __tablename__ = "weather_alerts"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    farmer_profile_id = db.Column(
        db.String(36), db.ForeignKey("farmer_profiles.id", ondelete="CASCADE"), nullable=False
    )
    alert_type = db.Column(db.String(80), nullable=False)
    title = db.Column(db.String(180), nullable=False)
    details = db.Column(db.Text, nullable=False)
    severity = db.Column(db.String(32), nullable=False)
    starts_at = db.Column(db.DateTime(timezone=True), nullable=False)
    ends_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    is_read = db.Column(db.Boolean, default=False, nullable=False, server_default=db.text("0"))

    farmer_profile = db.relationship("FarmerProfile", back_populates="weather_alerts")

    def to_dict(self):
        return {
            "id": self.id,
            "alert_type": self.alert_type,
            "title": self.title,
            "details": self.details,
            "severity": self.severity,
            "starts_at": self.starts_at.isoformat() if self.starts_at else None,
            "ends_at": self.ends_at.isoformat() if self.ends_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "is_read": bool(self.is_read),
        }