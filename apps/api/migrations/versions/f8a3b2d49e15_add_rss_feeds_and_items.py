"""add rss_feeds and rss_items tables with default feeds seed

Revision ID: f8a3b2d49e15
Revises: e6c2a7f51b03
Create Date: 2026-05-12 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f8a3b2d49e15'
down_revision: Union[str, Sequence[str], None] = 'e6c2a7f51b03'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_DEFAULT_FEEDS = [
    # Cybersécurité (5)
    ("Krebs on Security", "https://krebsonsecurity.com/feed/", "cyber", 10),
    ("The Hacker News", "https://feeds.feedburner.com/TheHackersNews", "cyber", 20),
    ("BleepingComputer", "https://www.bleepingcomputer.com/feed/", "cyber", 30),
    ("The Register Security", "https://www.theregister.com/security/headlines.atom", "cyber", 40),
    ("Bonjour la fuite", "https://bonjourlafuite.eu.org/feed.xml", "cyber", 50),
    # Hardware & Tech (3)
    ("AnandTech", "https://www.anandtech.com/rss/", "hardware", 60),
    ("Tom's Hardware FR", "https://www.tomshardware.fr/feed/", "hardware", 70),
    ("Phoronix", "https://www.phoronix.com/rss.php", "hardware", 80),
    # IA & ML (3)
    ("OpenAI Blog", "https://openai.com/blog/rss.xml", "ia", 90),
    ("Anthropic News", "https://www.anthropic.com/news/rss.xml", "ia", 100),
    ("Hugging Face Blog", "https://huggingface.co/blog/feed.xml", "ia", 110),
    # Actualité tech (2)
    ("Ars Technica", "https://feeds.arstechnica.com/arstechnica/technology-lab", "tech", 120),
    ("TechCrunch", "https://techcrunch.com/feed/", "tech", 130),
    # Dev (2)
    ("HackerNews", "https://hnrss.org/frontpage", "dev", 140),
    ("DEV.to", "https://dev.to/feed/", "dev", 150),
    # DevOps / Cloud (2)
    ("The New Stack", "https://thenewstack.io/feed/", "devops", 160),
    ("HashiCorp Blog", "https://www.hashicorp.com/blog/feed.xml", "devops", 170),
    # Gaming / Esport (2)
    ("IGN", "https://feeds.ign.com/ign/all", "gaming", 180),
    ("Eurogamer", "https://www.eurogamer.net/feed", "gaming", 190),
    # Informatique (4)
    ("Cisco Blog Networking", "https://blogs.cisco.com/networking/feed", "info", 200),
    ("DistroWatch", "https://distrowatch.com/news/dw.xml", "info", 210),
    ("Numerama", "https://www.numerama.com/feed/", "info", 220),
    ("Korben", "https://korben.info/feed", "info", 230),
]


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'rss_feeds',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('url', sa.String(length=500), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=True),
        sa.Column(
            'is_active', sa.Boolean(),
            server_default=sa.text('true'), nullable=False,
        ),
        sa.Column(
            'display_order', sa.Integer(),
            server_default=sa.text('0'), nullable=False,
        ),
        sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column(
            'created_at', sa.DateTime(timezone=True),
            server_default=sa.text('now()'), nullable=False,
        ),
        sa.Column(
            'updated_at', sa.DateTime(timezone=True),
            server_default=sa.text('now()'), nullable=False,
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('url', name='uq_rss_feeds_url'),
    )
    op.create_index(op.f('ix_rss_feeds_url'), 'rss_feeds', ['url'], unique=True)
    op.create_index(op.f('ix_rss_feeds_category'), 'rss_feeds', ['category'], unique=False)

    op.create_table(
        'rss_items',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('feed_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('link', sa.String(length=1000), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('author', sa.String(length=200), nullable=True),
        sa.Column('guid', sa.String(length=500), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            'is_read', sa.Boolean(),
            server_default=sa.text('false'), nullable=False,
        ),
        sa.Column(
            'is_favorited', sa.Boolean(),
            server_default=sa.text('false'), nullable=False,
        ),
        sa.Column(
            'created_at', sa.DateTime(timezone=True),
            server_default=sa.text('now()'), nullable=False,
        ),
        sa.Column(
            'updated_at', sa.DateTime(timezone=True),
            server_default=sa.text('now()'), nullable=False,
        ),
        sa.ForeignKeyConstraint(['feed_id'], ['rss_feeds.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('feed_id', 'link', name='uq_rss_items_feed_link'),
    )
    op.create_index(op.f('ix_rss_items_feed_id'), 'rss_items', ['feed_id'], unique=False)
    op.create_index(op.f('ix_rss_items_published_at'), 'rss_items', ['published_at'], unique=False)
    op.create_index(op.f('ix_rss_items_is_read'), 'rss_items', ['is_read'], unique=False)
    op.create_index(op.f('ix_rss_items_is_favorited'), 'rss_items', ['is_favorited'], unique=False)
    op.create_index(
        'ix_rss_items_feed_published', 'rss_items',
        ['feed_id', 'published_at'], unique=False,
    )

    # Seed default feeds.
    bind = op.get_bind()
    insert_stmt = sa.text(
        """
        INSERT INTO rss_feeds (name, url, category, is_active, display_order, created_at, updated_at)
        VALUES (:name, :url, :category, true, :display_order, now(), now())
        ON CONFLICT (url) DO NOTHING
        """
    )
    for name, url, category, display_order in _DEFAULT_FEEDS:
        bind.execute(
            insert_stmt,
            {
                "name": name,
                "url": url,
                "category": category,
                "display_order": display_order,
            },
        )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_rss_items_feed_published', table_name='rss_items')
    op.drop_index(op.f('ix_rss_items_is_favorited'), table_name='rss_items')
    op.drop_index(op.f('ix_rss_items_is_read'), table_name='rss_items')
    op.drop_index(op.f('ix_rss_items_published_at'), table_name='rss_items')
    op.drop_index(op.f('ix_rss_items_feed_id'), table_name='rss_items')
    op.drop_table('rss_items')
    op.drop_index(op.f('ix_rss_feeds_category'), table_name='rss_feeds')
    op.drop_index(op.f('ix_rss_feeds_url'), table_name='rss_feeds')
    op.drop_table('rss_feeds')
