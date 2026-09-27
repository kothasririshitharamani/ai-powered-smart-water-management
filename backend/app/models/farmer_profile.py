from uuid import uuid4

from app.extensions import db


class FarmerProfile(db.Model):
    __tablename__ = "farmer_profiles"
    __table_args__ = (
        db.CheckConstraint(
            "land_area_acres IS NULL OR land_area_acres >= 0",
            name="ck_farmer_profiles_nonnegative_land_area",
        ),
        db.CheckConstraint(
            "available_water IS NULL OR available_water >= 0",
            name="ck_farmer_profiles_nonnegative_available_water",
        ),
    )

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(
        db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    full_name = db.Column(db.String(160), nullable=True)
    village = db.Column(db.String(120), nullable=True)
    district = db.Column(db.String(120), nullable=True)
    preferred_language = db.Column(
        db.String(32), nullable=False, default="తెలుగు", server_default="తెలుగు"
    )
    state = db.Column(db.String(120), nullable=True)
    land_area_acres = db.Column(db.Numeric(10, 2), nullable=True)
    crop = db.Column(db.String(120), nullable=True)
    crop_stage = db.Column(db.String(120), nullable=True)
    water_source = db.Column(db.String(80), nullable=True)
    available_water = db.Column(db.Numeric(14, 2), nullable=True)

    user = db.relationship("User", back_populates="farmer_profile")
    water_budgets = db.relationship("WaterBudget", back_populates="farmer_profile")
    water_usages = db.relationship("WaterUsage", back_populates="farmer_profile")
    weather_alerts = db.relationship("WeatherAlert", back_populates="farmer_profile")
    water_loss_reports = db.relationship("WaterLossReport", back_populates="farmer_profile")

    def to_dict(self):
        return {
            "name": self.full_name,
            "village": self.village,
            "district": self.district,
            "crop": self.crop,
            "land_area": float(self.land_area_acres)
            if self.land_area_acres is not None
            else None,
            "crop_stage": self.crop_stage,
            "water_source": self.water_source,
            "available_water": float(self.available_water)
            if self.available_water is not None
            else None,
            "preferred_language": self.preferred_language,
        }