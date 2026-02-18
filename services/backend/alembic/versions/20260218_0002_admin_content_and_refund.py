"""add banner and refund tables

Revision ID: 20260218_0002
Revises: 20260218_0001
Create Date: 2026-02-18
"""

from alembic import op
import sqlalchemy as sa


revision = '20260218_0002'
down_revision = '20260218_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'banners',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('image_url', sa.String(length=400), nullable=False),
        sa.Column('link_type', sa.String(length=40), nullable=False, server_default='PROMOTION'),
        sa.Column('link_target', sa.String(length=200), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('start_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        'refunds',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('order_id', sa.Integer(), sa.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('reason', sa.String(length=300), nullable=False),
        sa.Column('method', sa.String(length=40), nullable=False, server_default='COD_ADJUSTMENT'),
        sa.Column('status', sa.String(length=40), nullable=False, server_default='APPROVED'),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('processed_by', sa.String(length=60), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('refunds')
    op.drop_table('banners')
