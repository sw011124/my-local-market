"""add user auth and member address tables

Revision ID: 20260224_0004
Revises: 20260223_0003
Create Date: 2026-02-24
"""

from alembic import op
import sqlalchemy as sa


revision = '20260224_0004'
down_revision = '20260223_0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('phone', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('phone', name='uq_users_phone'),
    )
    op.create_index('ix_users_phone', 'users', ['phone'], unique=True)

    op.create_table(
        'user_refresh_tokens',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('token_hash', name='uq_user_refresh_tokens_token_hash'),
    )
    op.create_index('ix_user_refresh_tokens_user_id', 'user_refresh_tokens', ['user_id'], unique=False)

    op.create_table(
        'user_addresses',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
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
    op.create_index('ix_user_addresses_user_id', 'user_addresses', ['user_id'], unique=False)

    op.add_column('carts', sa.Column('user_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_carts_user_id_users',
        'carts',
        'users',
        ['user_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_index('ix_carts_user_id', 'carts', ['user_id'], unique=False)

    op.add_column('orders', sa.Column('user_id', sa.Integer(), nullable=True))
    op.add_column('orders', sa.Column('order_source', sa.String(length=20), nullable=False, server_default='GUEST'))
    op.create_foreign_key(
        'fk_orders_user_id_users',
        'orders',
        'users',
        ['user_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_index('ix_orders_user_id', 'orders', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_orders_user_id', table_name='orders')
    op.drop_constraint('fk_orders_user_id_users', 'orders', type_='foreignkey')
    op.drop_column('orders', 'order_source')
    op.drop_column('orders', 'user_id')

    op.drop_index('ix_carts_user_id', table_name='carts')
    op.drop_constraint('fk_carts_user_id_users', 'carts', type_='foreignkey')
    op.drop_column('carts', 'user_id')

    op.drop_index('ix_user_addresses_user_id', table_name='user_addresses')
    op.drop_table('user_addresses')

    op.drop_index('ix_user_refresh_tokens_user_id', table_name='user_refresh_tokens')
    op.drop_table('user_refresh_tokens')

    op.drop_index('ix_users_phone', table_name='users')
    op.drop_table('users')

