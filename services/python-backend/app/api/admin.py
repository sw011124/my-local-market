from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.api.utils import order_to_schema, product_to_schema
from app.db import get_db
from app.models import AdminUser, Order, Product
from app.schemas import (
    AdminLoginInput,
    AdminLoginResponse,
    AdminOrderStatusUpdate,
    InventoryUpdateInput,
    PolicyOut,
    PolicyPatchInput,
    ProductCreateInput,
    ProductOut,
)
from app.services import get_or_create_policy, require_admin, update_order_status

router = APIRouter(prefix='/admin', tags=['admin'])


def parse_admin_token(token: str) -> int:
    if not token.startswith('admin-'):
        raise ValueError('invalid token format')
    return int(token.split('-', maxsplit=1)[1])


def require_admin_token(
    db: Session,
    x_admin_token: str | None,
) -> AdminUser:
    if not x_admin_token:
        raise HTTPException(status_code=401, detail={'code': 'UNAUTHORIZED', 'message': '관리자 토큰이 필요합니다.'})

    try:
        admin_id = parse_admin_token(x_admin_token)
    except Exception:
        raise HTTPException(status_code=401, detail={'code': 'UNAUTHORIZED', 'message': '유효하지 않은 토큰입니다.'})

    admin = db.get(AdminUser, admin_id)
    if not admin or not admin.is_active:
        raise HTTPException(status_code=401, detail={'code': 'UNAUTHORIZED', 'message': '유효하지 않은 관리자 계정입니다.'})

    return admin


@router.post('/auth/login', response_model=AdminLoginResponse)
def admin_login(payload: AdminLoginInput, db: Session = Depends(get_db)) -> AdminLoginResponse:
    admin = require_admin(db, payload.username, payload.password)
    admin.last_login_at = datetime.now()
    db.commit()
    return AdminLoginResponse(access_token=f'admin-{admin.id}', role=admin.role)


@router.get('/orders')
def admin_orders(
    status: str | None = None,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> list:
    require_admin_token(db, x_admin_token)

    stmt = select(Order).order_by(Order.ordered_at.desc())
    if status:
        stmt = stmt.where(Order.status == status)

    orders = list(db.scalars(stmt.limit(200)))
    return [order_to_schema(order) for order in orders]


@router.patch('/orders/{order_id}/status')
def admin_update_order_status(
    order_id: int,
    payload: AdminOrderStatusUpdate,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    admin = require_admin_token(db, x_admin_token)

    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail={'code': 'ORDER_NOT_FOUND', 'message': '주문을 찾을 수 없습니다.'})

    update_order_status(db, order, payload.status, changed_by=admin.username, reason=payload.reason)
    db.commit()
    db.refresh(order)

    return order_to_schema(order)


@router.get('/products', response_model=list[ProductOut])
def admin_get_products(
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    require_admin_token(db, x_admin_token)
    products = list(db.scalars(select(Product).order_by(Product.id.asc()).limit(500)))
    return [product_to_schema(product) for product in products]


@router.post('/products', response_model=ProductOut)
def admin_create_product(
    payload: ProductCreateInput,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    require_admin_token(db, x_admin_token)

    duplicate = db.scalar(select(Product).where(Product.sku == payload.sku))
    if duplicate:
        raise HTTPException(status_code=409, detail={'code': 'DUPLICATE_SKU', 'message': '중복 SKU 입니다.'})

    product = Product(
        category_id=payload.category_id,
        name=payload.name,
        sku=payload.sku,
        description=payload.description,
        unit_label=payload.unit_label,
        origin_country=payload.origin_country,
        storage_method=payload.storage_method,
        is_weight_item=payload.is_weight_item,
        base_price=payload.base_price,
        sale_price=payload.sale_price,
        stock_qty=payload.stock_qty,
        max_per_order=payload.max_per_order,
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    return product_to_schema(product)


@router.patch('/products/{product_id}/inventory', response_model=ProductOut)
def admin_update_inventory(
    product_id: int,
    payload: InventoryUpdateInput,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    require_admin_token(db, x_admin_token)
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail={'code': 'PRODUCT_NOT_FOUND', 'message': '상품을 찾을 수 없습니다.'})

    product.stock_qty = payload.stock_qty
    product.max_per_order = payload.max_per_order
    db.commit()
    db.refresh(product)

    return product_to_schema(product)


@router.get('/policies', response_model=PolicyOut)
def admin_get_policy(
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> PolicyOut:
    require_admin_token(db, x_admin_token)
    policy = get_or_create_policy(db)
    db.commit()

    return PolicyOut(
        open_time=str(policy.open_time),
        close_time=str(policy.close_time),
        same_day_cutoff_time=str(policy.same_day_cutoff_time),
        min_order_amount_default=policy.min_order_amount_default,
        base_delivery_fee_default=policy.base_delivery_fee_default,
        free_delivery_threshold_default=policy.free_delivery_threshold_default,
        allow_reservation_days=policy.allow_reservation_days,
    )


@router.patch('/policies', response_model=PolicyOut)
def admin_patch_policy(
    payload: PolicyPatchInput,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> PolicyOut:
    require_admin_token(db, x_admin_token)
    policy = get_or_create_policy(db)

    if payload.min_order_amount_default is not None:
        policy.min_order_amount_default = payload.min_order_amount_default
    if payload.base_delivery_fee_default is not None:
        policy.base_delivery_fee_default = payload.base_delivery_fee_default
    if payload.free_delivery_threshold_default is not None:
        policy.free_delivery_threshold_default = payload.free_delivery_threshold_default
    if payload.allow_reservation_days is not None:
        policy.allow_reservation_days = payload.allow_reservation_days

    db.commit()
    db.refresh(policy)

    return PolicyOut(
        open_time=str(policy.open_time),
        close_time=str(policy.close_time),
        same_day_cutoff_time=str(policy.same_day_cutoff_time),
        min_order_amount_default=policy.min_order_amount_default,
        base_delivery_fee_default=policy.base_delivery_fee_default,
        free_delivery_threshold_default=policy.free_delivery_threshold_default,
        allow_reservation_days=policy.allow_reservation_days,
    )
