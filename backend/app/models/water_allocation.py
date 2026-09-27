from datetime import datetime, timezone
from uuid import uuid4

from app.extensions import db


class WaterAllocationPlan(db.Model):
    __tablename__ = "water_allocation_plans"
    __table_args__ = (
        db.CheckConstraint("total_budget_liters >= 0", name="ck_alloc_plan_nonneg_budget"),
        db.CheckConstraint("already_used_liters >= 0", name="ck_alloc_plan_nonneg_used"),
        db.CheckConstraint("remaining_water_liters >= 0", name="ck_alloc_plan_nonneg_remaining"),
        db.CheckConstraint("total_allocated_liters >= 0", name="ck_alloc_plan_nonneg_allocated"),
        db.CheckConstraint("unallocated_water_liters >= 0", name="ck_alloc_plan_nonneg_unallocated"),
        db.CheckConstraint(
            "total_allocated_liters <= remaining_water_liters",
            name="ck_alloc_plan_allocated_le_remaining",
        ),
    )

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    farmer_profile_id = db.Column(
        db.String(36),
        db.ForeignKey("farmer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    total_budget_liters = db.Column(db.Numeric(14, 2), nullable=False)
    already_used_liters = db.Column(db.Numeric(14, 2), nullable=False)
    remaining_water_liters = db.Column(db.Numeric(14, 2), nullable=False)
    total_allocated_liters = db.Column(db.Numeric(14, 2), nullable=False)
    unallocated_water_liters = db.Column(db.Numeric(14, 2), nullable=False)
    status = db.Column(db.String(32), nullable=False, default="active")
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    farmer_profile = db.relationship("FarmerProfile", back_populates="water_allocation_plans")
    items = db.relationship(
        "WaterAllocationItem",
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="WaterAllocationItem.priority",
    )

    def to_dict(self):
        allocated = float(self.total_allocated_liters)
        remaining = float(self.remaining_water_liters)
        percent = round((allocated / remaining * 100), 2) if remaining > 0 else 0.0
        return {
            "id": self.id,
            "total_budget_liters": float(self.total_budget_liters),
            "already_used_liters": float(self.already_used_liters),
            "remaining_water_liters": remaining,
            "total_allocated_liters": allocated,
            "unallocated_water_liters": float(self.unallocated_water_liters),
            "allocation_percentage": percent,
            "status": self.status,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "items": [item.to_dict() for item in self.items],
        }


class WaterAllocationItem(db.Model):
    __tablename__ = "water_allocation_items"
    __table_args__ = (
        db.CheckConstraint("area_acres > 0", name="ck_alloc_item_positive_area"),
        db.CheckConstraint("allocated_liters >= 0", name="ck_alloc_item_nonneg_liters"),
        db.CheckConstraint("percentage_of_remaining >= 0", name="ck_alloc_item_nonneg_pct"),
    )

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    plan_id = db.Column(
        db.String(36),
        db.ForeignKey("water_allocation_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    crop_name = db.Column(db.String(120), nullable=False)
    area_acres = db.Column(db.Numeric(10, 2), nullable=False)
    allocated_liters = db.Column(db.Numeric(14, 2), nullable=False)
    percentage_of_remaining = db.Column(db.Numeric(5, 2), nullable=False)
    priority = db.Column(db.Integer, nullable=False, default=1)
    notes = db.Column(db.Text, nullable=True)

    plan = db.relationship("WaterAllocationPlan", back_populates="items")

    def to_dict(self):
        liters = float(self.allocated_liters)
        acres = float(self.area_acres)
        per_acre = round(liters / acres, 2) if acres > 0 else 0.0
        return {
            "id": self.id,
            "crop_name": self.crop_name,
            "area_acres": acres,
            "allocated_liters": liters,
            "percentage_of_remaining": float(self.percentage_of_remaining),
            "liters_per_acre": per_acre,
            "priority": self.priority,
            "notes": self.notes,
        }
