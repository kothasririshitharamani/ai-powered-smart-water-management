"""Add crop and water details to farmer profiles.

Revision ID: d3f8a102c5e7
Revises: c7a91e4d2b63
Create Date: 2026-09-27

"""
from alembic import op
import sqlalchemy as sa


revision = "d3f8a102c5e7"
down_revision = "c7a91e4d2b63"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("farmer_profiles", sa.Column("crop", sa.String(length=120)))
    op.add_column("farmer_profiles", sa.Column("crop_stage", sa.String(length=120)))
    op.add_column("farmer_profiles", sa.Column("water_source", sa.String(length=80)))
    op.add_column(
        "farmer_profiles", sa.Column("available_water", sa.Numeric(precision=14, scale=2))
    )
    with op.batch_alter_table("farmer_profiles") as batch_op:
        batch_op.create_check_constraint(
            "ck_farmer_profiles_nonnegative_land_area",
            "land_area_acres IS NULL OR land_area_acres >= 0",
        )

        batch_op.create_check_constraint(
            "ck_farmer_profiles_nonnegative_available_water",
            "available_water IS NULL OR available_water >= 0",
        )


def downgrade():
    with op.batch_alter_table("farmer_profiles") as batch_op:
        batch_op.drop_constraint("ck_farmer_profiles_nonnegative_available_water", type_="check")
        batch_op.drop_constraint("ck_farmer_profiles_nonnegative_land_area", type_="check")
        batch_op.drop_column("available_water")
        batch_op.drop_column("water_source")
        batch_op.drop_column("crop_stage")
        batch_op.drop_column("crop")