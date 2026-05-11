"""add user_preferences and system_logs tables

Revision ID: d4e7a91b3f02
Revises: bbb0d9ba3445
Create Date: 2026-05-11 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e7a91b3f02'
down_revision: Union[str, Sequence[str], None] = 'bbb0d9ba3445'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'user_preferences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ui_density', sa.String(length=20), nullable=False, server_default='comfortable'),
        sa.Column('locale', sa.String(length=5), nullable=False, server_default='fr'),
        sa.Column('display_name', sa.String(length=100), nullable=True),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('weather_location_lat', sa.Float(), nullable=True),
        sa.Column('weather_location_lon', sa.Float(), nullable=True),
        sa.Column('weather_location_name', sa.String(length=200), nullable=True),
        sa.Column('github_username', sa.String(length=100), nullable=True),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'system_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            'timestamp',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'level',
            sa.Enum(
                'debug',
                'info',
                'warning',
                'error',
                'critical',
                name='log_level_enum',
            ),
            nullable=False,
        ),
        sa.Column('module', sa.String(length=50), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('context', sa.JSON(), nullable=True),
        sa.Column('http_method', sa.String(length=10), nullable=True),
        sa.Column('http_path', sa.String(length=500), nullable=True),
        sa.Column('http_status', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_system_logs_id'), 'system_logs', ['id'], unique=False)
    op.create_index(
        op.f('ix_system_logs_timestamp'), 'system_logs', ['timestamp'], unique=False
    )
    op.create_index(op.f('ix_system_logs_level'), 'system_logs', ['level'], unique=False)
    op.create_index(op.f('ix_system_logs_module'), 'system_logs', ['module'], unique=False)
    op.create_index(
        'ix_system_logs_timestamp_level',
        'system_logs',
        ['timestamp', 'level'],
        unique=False,
    )
    op.create_index(
        'ix_system_logs_module_timestamp',
        'system_logs',
        ['module', 'timestamp'],
        unique=False,
    )

    # Seed the singleton row for user_preferences
    op.execute(
        """
        INSERT INTO user_preferences (id, ui_density, locale, display_name, github_username, updated_at)
        VALUES (1, 'comfortable', 'fr', 'Mathias', 'Kiwi6212', now())
        ON CONFLICT (id) DO NOTHING
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_system_logs_module_timestamp', table_name='system_logs')
    op.drop_index('ix_system_logs_timestamp_level', table_name='system_logs')
    op.drop_index(op.f('ix_system_logs_module'), table_name='system_logs')
    op.drop_index(op.f('ix_system_logs_level'), table_name='system_logs')
    op.drop_index(op.f('ix_system_logs_timestamp'), table_name='system_logs')
    op.drop_index(op.f('ix_system_logs_id'), table_name='system_logs')
    op.drop_table('system_logs')
    op.drop_table('user_preferences')
    sa.Enum(name='log_level_enum').drop(op.get_bind(), checkfirst=False)
