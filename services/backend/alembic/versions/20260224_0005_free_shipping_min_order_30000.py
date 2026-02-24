"""set free shipping and minimum order 30000

Revision ID: 20260224_0005
Revises: 20260224_0004
Create Date: 2026-02-24
"""

from alembic import op


revision = '20260224_0005'
down_revision = '20260224_0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE store_policies
        SET
            min_order_amount_default = 30000,
            base_delivery_fee_default = 0,
            free_delivery_threshold_default = 0
        """
    )
    op.execute(
        """
        UPDATE delivery_zones
        SET
            min_order_amount = 30000,
            base_fee = 0,
            free_delivery_threshold = 0
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE store_policies
        SET
            min_order_amount_default = 15000,
            base_delivery_fee_default = 3000,
            free_delivery_threshold_default = 40000
        """
    )

