"""master_upgrade

Revision ID: 9fd229d41af8
Revises: b7f9c2a41e20
Create Date: 2026-06-10 11:44:16.828671

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '9fd229d41af8'
down_revision: Union[str, None] = 'b7f9c2a41e20'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Drop foreign key constraints on tables that we are renaming
    op.drop_constraint('resume_profiles_resume_id_fkey', 'resume_profiles', type_='foreignkey')
    op.drop_constraint('resume_profiles_user_id_fkey', 'resume_profiles', type_='foreignkey')
    op.drop_constraint('email_digest_logs_user_id_fkey', 'email_digest_logs', type_='foreignkey')
    op.drop_constraint('resumes_user_id_fkey', 'resumes', type_='foreignkey')

    # 2. Rename tables
    op.rename_table('resumes', 'user_resumes')
    op.rename_table('resume_profiles', 'user_profiles')
    op.rename_table('email_digest_logs', 'digest_logs')

    # 3. Add foreign key constraints back
    op.create_foreign_key('user_resumes_user_id_fkey', 'user_resumes', 'users', ['user_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('user_profiles_resume_id_fkey', 'user_profiles', 'user_resumes', ['resume_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('user_profiles_user_id_fkey', 'user_profiles', 'users', ['user_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('digest_logs_user_id_fkey', 'digest_logs', 'users', ['user_id'], ['id'], ondelete='CASCADE')

    # 4. Rename indexes or drops/recreate them
    op.drop_index('ix_resumes_uploaded_at', table_name='user_resumes')
    op.drop_index('ix_resumes_user_active', table_name='user_resumes')
    op.drop_index('ix_resumes_user_id', table_name='user_resumes')
    op.drop_index('ix_resumes_user_uploaded', table_name='user_resumes')

    op.create_index('ix_resumes_user_active', 'user_resumes', ['user_id', 'is_active'], unique=False)
    op.create_index('ix_resumes_user_uploaded', 'user_resumes', ['user_id', 'uploaded_at'], unique=False)
    op.create_index(op.f('ix_user_resumes_uploaded_at'), 'user_resumes', ['uploaded_at'], unique=False)
    op.create_index(op.f('ix_user_resumes_user_id'), 'user_resumes', ['user_id'], unique=False)

    op.drop_index('ix_resume_profiles_user_id', table_name='user_profiles')
    op.create_index('ix_user_profiles_user_id', 'user_profiles', ['user_id'], unique=False)

    op.drop_index('ix_email_digest_logs_id', table_name='digest_logs')
    op.drop_index('ix_email_digest_logs_user_id', table_name='digest_logs')
    op.create_index(op.f('ix_digest_logs_id'), 'digest_logs', ['id'], unique=False)
    op.create_index(op.f('ix_digest_logs_user_id'), 'digest_logs', ['user_id'], unique=False)

    # 5. Add new columns
    op.add_column('users', sa.Column('role', sa.String(length=50), nullable=False, server_default='FREE'))
    op.add_column('users', sa.Column('last_login', sa.DateTime(timezone=True), nullable=True))

    op.add_column('user_profiles', sa.Column('career_interests', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'))
    op.add_column('user_profiles', sa.Column('locations', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'))
    op.add_column('user_profiles', sa.Column('preferred_domains', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'))
    op.add_column('user_profiles', sa.Column('experience_level', sa.String(length=50), nullable=False, server_default='0 Years'))
    op.add_column('user_profiles', sa.Column('resume_url', sa.String(length=512), nullable=True))

    op.add_column('user_preferences', sa.Column('notification_preferences', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'))
    op.add_column('user_preferences', sa.Column('email_digest_enabled', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('user_preferences', sa.Column('digest_time', sa.String(length=50), nullable=False, server_default='09:00 AM'))
    op.add_column('user_preferences', sa.Column('timezone', sa.String(length=100), nullable=False, server_default='UTC'))
    op.add_column('user_preferences', sa.Column('preferred_job_types', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'))

    op.add_column('digest_logs', sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('digest_logs', sa.Column('opened_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('digest_logs', sa.Column('clicked_at', sa.DateTime(timezone=True), nullable=True))

    # 6. Create email_preferences table
    op.create_table('email_preferences',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('digest_enabled', sa.Boolean(), nullable=False, server_default='true'),
    sa.Column('digest_time', sa.String(length=50), nullable=False, server_default='09:00 AM'),
    sa.Column('timezone', sa.String(length=100), nullable=False, server_default='UTC'),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_email_preferences_id'), 'email_preferences', ['id'], unique=False)
    op.create_index(op.f('ix_email_preferences_user_id'), 'email_preferences', ['user_id'], unique=True)


def downgrade() -> None:
    # 1. Drop email_preferences
    op.drop_table('email_preferences')

    # 2. Drop columns
    op.drop_column('digest_logs', 'clicked_at')
    op.drop_column('digest_logs', 'opened_at')
    op.drop_column('digest_logs', 'delivered_at')

    op.drop_column('user_preferences', 'preferred_job_types')
    op.drop_column('user_preferences', 'timezone')
    op.drop_column('user_preferences', 'digest_time')
    op.drop_column('user_preferences', 'email_digest_enabled')
    op.drop_column('user_preferences', 'notification_preferences')

    op.drop_column('user_profiles', 'resume_url')
    op.drop_column('user_profiles', 'experience_level')
    op.drop_column('user_profiles', 'preferred_domains')
    op.drop_column('user_profiles', 'locations')
    op.drop_column('user_profiles', 'career_interests')

    op.drop_column('users', 'last_login')
    op.drop_column('users', 'role')

    # 3. Drop foreign keys on renamed tables
    op.drop_constraint('user_resumes_user_id_fkey', 'user_resumes', type_='foreignkey')
    op.drop_constraint('user_profiles_resume_id_fkey', 'user_profiles', type_='foreignkey')
    op.drop_constraint('user_profiles_user_id_fkey', 'user_profiles', type_='foreignkey')
    op.drop_constraint('digest_logs_user_id_fkey', 'digest_logs', type_='foreignkey')

    # 4. Rename tables back
    op.rename_table('user_resumes', 'resumes')
    op.rename_table('user_profiles', 'resume_profiles')
    op.rename_table('digest_logs', 'email_digest_logs')

    # 5. Restore constraints
    op.create_foreign_key('resumes_user_id_fkey', 'resumes', 'users', ['user_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('resume_profiles_resume_id_fkey', 'resume_profiles', 'resumes', ['resume_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('resume_profiles_user_id_fkey', 'resume_profiles', 'users', ['user_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('email_digest_logs_user_id_fkey', 'email_digest_logs', 'users', ['user_id'], ['id'], ondelete='CASCADE')

    # 6. Recreate old indexes
    op.drop_index('ix_resumes_user_active', table_name='resumes')
    op.drop_index('ix_resumes_user_uploaded', table_name='resumes')
    op.drop_index(op.f('ix_user_resumes_uploaded_at'), table_name='resumes')
    op.drop_index(op.f('ix_user_resumes_user_id'), table_name='resumes')

    op.create_index('ix_resumes_uploaded_at', 'resumes', ['uploaded_at'], unique=False)
    op.create_index('ix_resumes_user_active', 'resumes', ['user_id', 'is_active'], unique=False)
    op.create_index('ix_resumes_user_id', 'resumes', ['user_id'], unique=False)
    op.create_index('ix_resumes_user_uploaded', 'resumes', ['user_id', 'uploaded_at'], unique=False)

    op.drop_index('ix_user_profiles_user_id', table_name='resume_profiles')
    op.create_index('ix_resume_profiles_user_id', 'resume_profiles', ['user_id'], unique=False)

    op.drop_index(op.f('ix_digest_logs_id'), table_name='email_digest_logs')
    op.drop_index(op.f('ix_digest_logs_user_id'), table_name='email_digest_logs')
    op.create_index('ix_email_digest_logs_id', 'email_digest_logs', ['id'], unique=False)
    op.create_index('ix_email_digest_logs_user_id', 'email_digest_logs', ['user_id'], unique=False)
