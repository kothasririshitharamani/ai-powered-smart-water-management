"""Make annual water budgets authoritative and synchronize profile water.

Revision ID: e4b209d6731f
Revises: d3f8a102c5e7
Create Date: 2026-09-27

"""
from datetime import date
from uuid import uuid4

from alembic import op
import sqlalchemy as sa


revision = "e4b209d6731f"
down_revision = "d3f8a102c5e7"
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    duplicates = connection.execute(
        sa.text(
            "SELECT farmer_profile_id, period_start, COUNT(*) AS row_count "
            "FROM water_budgets GROUP BY farmer_profile_id, period_start "
            "HAVING COUNT(*) > 1"
        )
    ).all()
    if duplicates:
        raise RuntimeError(
            "Cannot establish one water budget per farmer/year while duplicate budget rows "
            "exist. Resolve duplicates before upgrading."
        )

    period_start = date(date.today().year, 1, 1)
    period_end = date(date.today().year, 12, 31)
    existing_profiles = connection.execute(
        sa.text(
            "SELECT id, available_water FROM farmer_profiles "
            "WHERE available_water IS NOT NULL"
        )
    ).all()
    for profile_id, available_water in existing_profiles:
        budget = connection.execute(
            sa.text(
                "SELECT amount_liters FROM water_budgets "
                "WHERE farmer_profile_id = :profile_id AND period_start = :period_start"
            ),
            {"profile_id": profile_id, "period_start": period_start},
        ).first()
        if budget is None:
            connection.execute(
                sa.text(
                    "INSERT INTO water_budgets "
                    "(id, farmer_profile_id, amount_liters, period_start, period_end, crop) "
                    "VALUES (:id, :profile_id, :amount, :period_start, :period_end, NULL)"
                ),
                {
                    "id": str(uuid4()),
                    "profile_id": profile_id,
                    "amount": available_water,
                    "period_start": period_start,
                    "period_end": period_end,
                },
            )
        else:
            connection.execute(
                sa.text("UPDATE farmer_profiles SET available_water = :amount WHERE id = :id"),
                {"amount": budget.amount_liters, "id": profile_id},
            )

    with op.batch_alter_table("water_budgets") as batch_op:
        batch_op.create_unique_constraint(
            "uq_water_budgets_profile_period_start",
            ["farmer_profile_id", "period_start"],
        )


def downgrade():
    with op.batch_alter_table("water_budgets") as batch_op:
        batch_op.drop_constraint(
            "uq_water_budgets_profile_period_start", type_="unique"
        )
