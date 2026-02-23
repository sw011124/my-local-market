"""add saved addresses table

Revision ID: 20260223_0003
Revises: 20260218_0002
Create Date: 2026-02-23
"""

from alembic import op
import sqlalchemy as sa


revision = '20260223_0003'
down_revision = '20260218_0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'saved_addresses',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('session_key', sa.String(length=120), nullable=False),
        sa.Column('label', sa.String(length=60), nullable=True),
        sa.Column('recipient_name', sa.String(length=100), nullable=True),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('address_line1', sa.String(length=200), nullable=False),
        sa.Column('address_line2', sa.String(length=200), nullable=True),
        sa.Column('building', sa.String(length=80), nullable=True),
        sa.Column('unit_no', sa.String(length=40), nullable=True),
        sa.Column('dong_code', sa.String(length=30), nullable=True),
        sa.Column('apartment_name', sa.String(length=120), nullable=True),
        sa.Column('latitude', sa.Numeric(10, 7), nullable=True),
        sa.Column('longitude', sa.Numeric(10, 7), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_saved_addresses_session_key', 'saved_addresses', ['session_key'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_saved_addresses_session_key', table_name='saved_addresses')
    op.drop_table('saved_addresses')
