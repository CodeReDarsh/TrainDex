"""Normalize all website listings without duplicating shared reference graphics.

Revision ID: f19ce201310a
Revises: d271b5ef901a
"""

from alembic import op
import sqlalchemy as sa

revision = "f19ce201310a"
down_revision = "d271b5ef901a"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "specimen_sets",
        sa.Column("set_id", sa.String(40), primary_key=True),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("font_file", sa.String(200), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("source_id", sa.String(160), sa.ForeignKey("sources.source_id"), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=False),
    )
    op.create_table(
        "specimen_entries",
        sa.Column("set_id", sa.String(40), sa.ForeignKey("specimen_sets.set_id"), primary_key=True),
        sa.Column("key", sa.String(160), primary_key=True),
        sa.Column("sign_id", sa.String(160), sa.ForeignKey("sign_designs.sign_id"), nullable=False),
        sa.Column("codepoint", sa.String(8), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("service_label", sa.Text(), nullable=False),
        sa.Column("filename", sa.Text(), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("listing_status", sa.String(20), nullable=False),
        sa.Column("source_id", sa.String(160), sa.ForeignKey("sources.source_id"), nullable=False),
        sa.CheckConstraint(
            "listing_status IN ('listed', 'unassigned', 'proposed', 'blank')",
            name=op.f("ck_specimen_entries_listing_status"),
        ),
    )
    op.create_index("ix_specimen_entries_sign_id", "specimen_entries", ["sign_id"])


def downgrade():
    op.drop_table("specimen_entries")
    op.drop_table("specimen_sets")
