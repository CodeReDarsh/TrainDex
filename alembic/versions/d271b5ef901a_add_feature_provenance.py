"""Label per-feature estimates and reconstructed reference declarations.

Revision ID: d271b5ef901a
Revises: c038d9e806c5
"""

from alembic import op
import sqlalchemy as sa

revision = "d271b5ef901a"
down_revision = "c038d9e806c5"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "sign_designs",
        sa.Column("feature_provenance", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
    )


def downgrade():
    with op.batch_alter_table("sign_designs") as batch:
        batch.drop_column("feature_provenance")
