"""add resume profile achievements

Revision ID: b7f9c2a41e20
Revises: 08ff16f56941
Create Date: 2026-06-09 23:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "b7f9c2a41e20"
down_revision: Union[str, None] = "08ff16f56941"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "resume_profiles",
        sa.Column(
            "achievements",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.alter_column("resume_profiles", "achievements", server_default=None)


def downgrade() -> None:
    op.drop_column("resume_profiles", "achievements")
