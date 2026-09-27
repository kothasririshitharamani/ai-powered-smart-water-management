from datetime import date
from uuid import uuid4

from app.extensions import db


class WaterBudget(db.Model):
    __tablename__ = "water_budgets"
    __table_args__ = (
        db.CheckConstraint("amount_liters >= 0", name="ck_water_budgets_nonnegative_amount"),
        db.CheckConstraint("period_end >= period_start", name="ck_water_budgets_valid_period"),
        db.UniqueConstraint(
            "farmer_profile_id", "period_start", name="uq_water_budgets_profile_period_start"
        ),
    )

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    farmer_profile_id = db.Column(
        db.String(36), db.ForeignKey("farmer_profiles.id", ondelete="CASCADE"), nullable=False
    )
    amount_liters = db.Column(db.Numeric(14, 2), nullable=False)
    period_start = db.Column(db.Date, nullable=False, default=date.today)
    period_end = db.Column(db.Date, nullable=False)
    crop = db.Column(db.String(120), nullable=True)

    farmer_profile = db.relationship("FarmerProfile", back_populates="water_budgets")