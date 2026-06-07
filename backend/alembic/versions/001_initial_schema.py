"""Initial schema creation

Revision ID: 001_initial_schema
Revises: None
Create Date: 2026-06-07 17:00:00.000000

"""
from __future__ import annotations
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Dialect Detection ─────────────────────────────────────────────────────
    bind = op.get_bind()
    is_postgresql = bind.dialect.name == 'postgresql'
    
    # Use JSONB on Postgres for efficiency, standard JSON on SQLite/others
    json_type = postgresql.JSONB(astext_type=sa.Text()) if is_postgresql else sa.JSON()
    # UUID type configuration
    uuid_type = sa.UUID()

    # 1. Create users table
    op.create_table(
        'users',
        sa.Column('id', uuid_type, nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    # 2. Create resumes table
    op.create_table(
        'resumes',
        sa.Column('id', uuid_type, nullable=False),
        sa.Column('user_id', uuid_type, nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('stored_filename', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=512), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('stored_filename')
    )
    op.create_index(op.f('ix_resumes_user_id'), 'resumes', ['user_id'], unique=False)
    op.create_index(op.f('ix_resumes_uploaded_at'), 'resumes', ['uploaded_at'], unique=False)
    op.create_index('ix_resumes_user_uploaded', 'resumes', ['user_id', 'uploaded_at'], unique=False)
    op.create_index('ix_resumes_user_active', 'resumes', ['user_id', 'is_active'], unique=False)

    # 3. Create resume_profiles table
    op.create_table(
        'resume_profiles',
        sa.Column('id', uuid_type, nullable=False),
        sa.Column('resume_id', uuid_type, nullable=False),
        sa.Column('user_id', uuid_type, nullable=False),
        sa.Column('skills', json_type, nullable=False),
        sa.Column('projects', json_type, nullable=False),
        sa.Column('technologies', json_type, nullable=False),
        sa.Column('education', json_type, nullable=False),
        sa.Column('certifications', json_type, nullable=False),
        sa.Column('experience', json_type, nullable=False),
        sa.Column('raw_text', sa.Text(), nullable=True),
        sa.Column('parsed_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['resume_id'], ['resumes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('resume_id')
    )
    op.create_index(op.f('ix_resume_profiles_user_id'), 'resume_profiles', ['user_id'], unique=False)

    # 4. Create user_preferences table
    op.create_table(
        'user_preferences',
        sa.Column('id', uuid_type, nullable=False),
        sa.Column('user_id', uuid_type, nullable=False),
        sa.Column('preferred_roles', json_type, nullable=False),
        sa.Column('preferred_domains', json_type, nullable=False),
        sa.Column('preferred_locations', json_type, nullable=False),
        sa.Column('preferred_countries', json_type, nullable=False),
        sa.Column('work_mode', sa.String(length=20), nullable=False),
        sa.Column('minimum_stipend', sa.Integer(), nullable=True),
        sa.Column('preferred_company_size', sa.String(length=50), nullable=True),
        sa.Column('notification_email', sa.Boolean(), nullable=False),
        sa.Column('notification_whatsapp', sa.Boolean(), nullable=False),
        sa.Column('notification_in_app', sa.Boolean(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_user_preferences_user_id'), 'user_preferences', ['user_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_preferences_user_id'), table_name='user_preferences')
    op.drop_table('user_preferences')
    op.drop_index(op.f('ix_resume_profiles_user_id'), table_name='resume_profiles')
    op.drop_table('resume_profiles')
    op.drop_index('ix_resumes_user_active', table_name='resumes')
    op.drop_index('ix_resumes_user_uploaded', table_name='resumes')
    op.drop_index(op.f('ix_resumes_uploaded_at'), table_name='resumes')
    op.drop_index(op.f('ix_resumes_user_id'), table_name='resumes')
    op.drop_table('resumes')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
