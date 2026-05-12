"""add portfolio_bio and portfolio_projects tables

Revision ID: e6c2a7f51b03
Revises: d4e7a91b3f02
Create Date: 2026-05-11 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e6c2a7f51b03'
down_revision: Union[str, Sequence[str], None] = 'd4e7a91b3f02'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'portfolio_bio',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=True),
        sa.Column('tagline', sa.String(length=300), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('photo_url', sa.String(length=500), nullable=True),
        sa.Column('cv_url', sa.String(length=500), nullable=True),
        sa.Column('email', sa.String(length=200), nullable=True),
        sa.Column('github_url', sa.String(length=300), nullable=True),
        sa.Column('linkedin_url', sa.String(length=300), nullable=True),
        sa.Column('location', sa.String(length=200), nullable=True),
        sa.Column(
            'skills',
            sa.ARRAY(sa.String()),
            server_default=sa.text("'{}'::varchar[]"),
            nullable=False,
        ),
        sa.Column(
            'education',
            sa.JSON(),
            server_default=sa.text("'[]'::json"),
            nullable=False,
        ),
        sa.Column(
            'experience',
            sa.JSON(),
            server_default=sa.text("'[]'::json"),
            nullable=False,
        ),
        sa.Column(
            'public_enabled',
            sa.Boolean(),
            server_default=sa.text('false'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'portfolio_projects',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('slug', sa.String(length=200), nullable=False),
        sa.Column('description_short', sa.String(length=500), nullable=True),
        sa.Column('description_long', sa.Text(), nullable=True),
        sa.Column('screenshot_url', sa.String(length=500), nullable=True),
        sa.Column('demo_url', sa.String(length=500), nullable=True),
        sa.Column('repo_url', sa.String(length=500), nullable=True),
        sa.Column(
            'tech_stack',
            sa.ARRAY(sa.String()),
            server_default=sa.text("'{}'::varchar[]"),
            nullable=False,
        ),
        sa.Column(
            'is_featured',
            sa.Boolean(),
            server_default=sa.text('false'),
            nullable=False,
        ),
        sa.Column(
            'is_visible',
            sa.Boolean(),
            server_default=sa.text('true'),
            nullable=False,
        ),
        sa.Column(
            'display_order',
            sa.Integer(),
            server_default=sa.text('0'),
            nullable=False,
        ),
        sa.Column('github_repo_id', sa.Integer(), nullable=True),
        sa.Column('github_synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug', name='uq_portfolio_projects_slug'),
        sa.UniqueConstraint(
            'github_repo_id', name='uq_portfolio_projects_github_repo_id'
        ),
    )
    op.create_index(
        op.f('ix_portfolio_projects_slug'),
        'portfolio_projects',
        ['slug'],
        unique=True,
    )

    # Seed singleton bio (id=1)
    op.execute(
        """
        INSERT INTO portfolio_bio (id, skills, education, experience, public_enabled)
        VALUES (1, '{}'::varchar[], '[]'::json, '[]'::json, false)
        ON CONFLICT (id) DO NOTHING
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f('ix_portfolio_projects_slug'), table_name='portfolio_projects'
    )
    op.drop_table('portfolio_projects')
    op.drop_table('portfolio_bio')
