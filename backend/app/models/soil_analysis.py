from datetime import datetime, timezone
from uuid import uuid4

from app.extensions import db


class SoilAnalysisReport(db.Model):
    __tablename__ = "soil_analysis_reports"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    farmer_profile_id = db.Column(
        db.String(36),
        db.ForeignKey("farmer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    apparent_soil_characteristics = db.Column(db.Text, nullable=False)
    possible_moisture_condition = db.Column(db.String(160), nullable=False)
    visible_issues = db.Column(db.JSON, nullable=False, default=list)
    recommended_next_steps = db.Column(db.JSON, nullable=False, default=list)
    uncertainty_and_limitations = db.Column(db.Text, nullable=False)
    requires_laboratory_testing = db.Column(db.Boolean, nullable=False, default=True)
    disclaimer_te = db.Column(db.Text, nullable=False)
    image_mime_type = db.Column(db.String(64), nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    farmer_profile = db.relationship("FarmerProfile", back_populates="soil_analysis_reports")

    def to_dict(self):
        return {
            "id": self.id,
            "apparent_soil_characteristics": self.apparent_soil_characteristics,
            "possible_moisture_condition": self.possible_moisture_condition,
            "visible_issues": (
                self.visible_issues if isinstance(self.visible_issues, list) else []
            ),
            "recommended_next_steps": (
                self.recommended_next_steps
                if isinstance(self.recommended_next_steps, list)
                else []
            ),
            "uncertainty_and_limitations": self.uncertainty_and_limitations,
            "requires_laboratory_testing": self.requires_laboratory_testing,
            "disclaimer_te": self.disclaimer_te,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
