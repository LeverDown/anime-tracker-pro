"""merge heads

Revision ID: 07e339fcd389
Revises: a1b2c3d4e5f6, 2c26d0842572
Create Date: 2026-05-17 15:04:30.081959

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '07e339fcd389'
down_revision: Union[str, Sequence[str], None] = ('a1b2c3d4e5f6', '2c26d0842572')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
