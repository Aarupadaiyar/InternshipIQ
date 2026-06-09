"""create rejection_logs table

Revision ID: a1b2c3d4e5f6
Revises: ef1635e5e1f0
Create Date: 2026-06-09 07:14:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'a1b2c3d4e5f6'
down_revision = 'ef1635e5e1f0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'rejection_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source', sa.String(100), nullable=False),
        sa.Column('external_id', sa.String(255), nullable=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('company', sa.String(255), nullable=True),
        sa.Column('url', sa.Text(), nullable=True),
        sa.Column('rejection_reason', sa.String(100), nullable=False),
        sa.Column('rejection_detail', sa.Text(), nullable=True),
        sa.Column('pipeline_stage', sa.String(50), nullable=False),
        sa.Column('scrape_run_id', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_rejection_logs_id', 'rejection_logs', ['id'])
    op.create_index('ix_rejection_logs_source', 'rejection_logs', ['source'])
    op.create_index('ix_rejection_logs_rejection_reason', 'rejection_logs', ['rejection_reason'])
    op.create_index('ix_rejection_logs_scrape_run_id', 'rejection_logs', ['scrape_run_id'])
    op.create_index('ix_rejection_logs_external_id', 'rejection_logs', ['external_id'])


def downgrade() -> None:
    op.drop_index('ix_rejection_logs_external_id', table_name='rejection_logs')
    op.drop_index('ix_rejection_logs_scrape_run_id', table_name='rejection_logs')
    op.drop_index('ix_rejection_logs_rejection_reason', table_name='rejection_logs')
    op.drop_index('ix_rejection_logs_source', table_name='rejection_logs')
    op.drop_index('ix_rejection_logs_id', table_name='rejection_logs')
    op.drop_table('rejection_logs')
