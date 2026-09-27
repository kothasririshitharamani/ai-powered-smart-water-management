"""Replace email auth with mobile farmer authentication.

Revision ID: c7a91e4d2b63
Revises: 848265c76bd8
Create Date: 2026-09-27

"""
import re

from alembic import op
import sqlalchemy as sa


revision = "c7a91e4d2b63"
down_revision = "848265c76bd8"
branch_labels = None
depends_on = None


def upgrade():
    user_columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("users")}
    if "mobile" not in user_columns:
        op.add_column("users", sa.Column("mobile", sa.String(length=10), nullable=True))
    connection = op.get_bind()
    existing_users = connection.execute(
        sa.text(
            "SELECT users.id, farmer_profiles.phone_number "
            "FROM users LEFT JOIN farmer_profiles "
            "ON farmer_profiles.user_id = users.id"
        )
    ).all()

    unmapped_users = []
    mobile_owners = {}
    for user_id, phone_number in existing_users:
        if not phone_number:
            unmapped_users.append(user_id)
            continue

        mobile = re.sub(r"\D", "", phone_number)
        if len(mobile) == 12 and mobile.startswith("91"):
            mobile = mobile[2:]
        if not re.fullmatch(r"[6-9]\d{9}", mobile):
            unmapped_users.append(user_id)
            continue
        if mobile in mobile_owners:
            raise RuntimeError(
                "Cannot migrate duplicate farmer mobile numbers for users "
                f"{mobile_owners[mobile]} and {user_id}. Resolve duplicates before migrating."
            )
        mobile_owners[mobile] = user_id
        connection.execute(
            sa.text("UPDATE users SET mobile = :mobile WHERE id = :user_id"),
            {"mobile": mobile, "user_id": user_id},
        )

    if unmapped_users:
        raise RuntimeError(
            "Cannot migrate users without a valid mobile number in their farmer profile: "
            f"{', '.join(unmapped_users)}. Assign each account a mobile number before migrating."
        )

    with op.batch_alter_table("users", recreate="always") as batch_op:
        batch_op.alter_column(
            "mobile",
            existing_type=sa.String(length=10),
            nullable=False,
        )
        batch_op.create_index("ix_users_mobile", ["mobile"], unique=True)
        batch_op.drop_index("ix_users_email")
        batch_op.drop_column("email")

    op.add_column(
        "farmer_profiles",
        sa.Column(
            "preferred_language",
            sa.String(length=32),
            nullable=False,
            server_default="తెలుగు",
        ),
    )
    with op.batch_alter_table("farmer_profiles", recreate="always") as batch_op:
        batch_op.drop_column("phone_number")


def downgrade():
    raise RuntimeError(
        "This migration removes email identifiers and cannot be downgraded without restoring "
        "the pre-migration database backup."
    )