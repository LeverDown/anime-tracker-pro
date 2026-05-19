"""Phase 5 & 6 — id_mapping table and multi-title columns

Revision ID: a1b2c3d4e5f6
Revises: 7f7d19bba091
Create Date: 2026-05-16 22:00:00.000000

Changes:
  Phase 5:
    - Creates ``id_mapping`` table for local MAL↔AniList ID resolution.

  Phase 6:
    - Adds ``title_native``, ``title_sort``, ``title_source`` to ``anime``.
      (title_english and title_romaji already exist from the initial schema.)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '7f7d19bba091'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Phase 5: id_mapping table ─────────────────────────────────────────────
    op.create_table(
        'id_mapping',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('mal_id', sa.Integer(), nullable=False),
        sa.Column('anilist_id', sa.Integer(), nullable=True),
        sa.Column('kitsu_id', sa.Text(), nullable=True),
        # confidence: 'verified' | 'inferred' | 'missing'
        sa.Column('confidence', sa.String(16), nullable=False, server_default='missing'),
        sa.Column('title_romaji', sa.Text(), nullable=True),
        sa.Column('last_checked', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('mal_id'),
    )
    op.create_index('ix_id_mapping_mal_id', 'id_mapping', ['mal_id'], unique=True)
    op.create_index('ix_id_mapping_anilist_id', 'id_mapping', ['anilist_id'], unique=False)

    # ── Phase 6: multi-title columns on the anime table ───────────────────────
    # title_english and title_romaji already exist — only add the new ones.
    op.add_column(
        'anime',
        sa.Column('title_native', sa.Text(), nullable=True)
    )
    op.add_column(
        'anime',
        # Computed sort key — lowercase, articles stripped, season suffixes normalised.
        sa.Column('title_sort', sa.Text(), nullable=True)
    )
    op.add_column(
        'anime',
        # Source of the title data: 'official' or 'community'
        sa.Column('title_source', sa.String(16), nullable=True, server_default='official')
    )

    # ── Phase 6: title_preference on the users table ──────────────────────────
    op.add_column(
        'users',
        sa.Column(
            'title_preference',
            sa.String(16),
            nullable=True,
            server_default='english',
            comment="User display title preference: 'english' | 'romaji' | 'native'"
        )
    )


def downgrade() -> None:
    op.drop_column('users', 'title_preference')
    op.drop_column('anime', 'title_source')
    op.drop_column('anime', 'title_sort')
    op.drop_column('anime', 'title_native')
    op.drop_index('ix_id_mapping_anilist_id', table_name='id_mapping')
    op.drop_index('ix_id_mapping_mal_id', table_name='id_mapping')
    op.drop_table('id_mapping')
