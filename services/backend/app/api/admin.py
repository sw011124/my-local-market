from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.api.utils import order_to_schema, product_to_schema
from app.db import get_db
from app.models import (
    AdminUser,
    AuditLog,
    Banner,
    Notice,
    Order,
    OrderItem,
    OrderStatus,
    Product,
    ProductStatus,
    Promotion,
    PromotionProduct,
    Refund,
)
from app.schemas import (
    AdminLoginResponse,
    AdminOrderStatusUpdate,
    AdminPromotionOut,
    BannerOut,
    BannerPatchInput,
    BannerUpsertInput,
    InventoryUpdateInput,
    NoticeOut,
    NoticePatchInput,
    NoticeUpsertInput,
    PolicyOut,
    PolicyPatchInput,
    ProductCreateInput,
    ProductPatchInput,
    ProductOut,
    PromotionPatchInput,
    PromotionUpsertInput,
    RefundCreateInput,
    RefundOut,
    ShortageActionInput,
)
from app.services import effective_price, get_or_create_policy, require_admin, to_decimal, update_order_status

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


def add_audit(db: Session, admin: AdminUser, entity_type: str, entity_id: str, action: str, after_json: dict | None = None) -> None:
    db.add(
        AuditLog(
            actor_type='ADMIN',
            actor_id=str(admin.id),
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            after_json=after_json,
        )
    )


def sum_approved_refunds(db: Session, order_id: int) -> Decimal:
    total = db.scalar(
        select(func.coalesce(func.sum(Refund.amount), 0)).where(
            and_(Refund.order_id == order_id, Refund.status.in_(['APPROVED', 'DONE']))
        )
    )
    return to_decimal(total)


def refresh_order_final_total(db: Session, order: Order) -> None:
    refunded = sum_approved_refunds(db, order.id)
    recalculated = to_decimal(order.total_estimated) - refunded
    if recalculated < Decimal('0'):
        recalculated = Decimal('0')
    order.total_final = recalculated


def refund_to_schema(refund: Refund) -> RefundOut:
    return RefundOut(
        id=refund.id,
        order_id=refund.order_id,
        amount=to_decimal(refund.amount),
        reason=refund.reason,
        method=refund.method,
        status=refund.status,
        processed_at=refund.processed_at,
        processed_by=refund.processed_by,
    )


def promotion_to_schema(db: Session, promotion: Promotion) -> AdminPromotionOut:
    rows = list(
        db.scalars(
            select(PromotionProduct).where(PromotionProduct.promotion_id == promotion.id).order_by(PromotionProduct.id.asc())
        )
    )
    product_ids = [row.product_id for row in rows]
    promo_price = rows[0].promo_price if rows else None
    return AdminPromotionOut(
        id=promotion.id,
        title=promotion.title,
        promo_type=promotion.promo_type,
        start_at=promotion.start_at,
        end_at=promotion.end_at,
        is_active=promotion.is_active,
        banner_image_url=promotion.banner_image_url,
        product_ids=product_ids,
        promo_price=to_decimal(promo_price) if promo_price is not None else None,
    )


def validate_promotion_products(db: Session, product_ids: list[int]) -> None:
    if not product_ids:
        return
    existing_ids = set(db.scalars(select(Product.id).where(Product.id.in_(product_ids))))
    missing = [pid for pid in product_ids if pid not in existing_ids]
    if missing:
        raise HTTPException(
            status_code=400,
            detail={'code': 'INVALID_PRODUCT', 'message': f'존재하지 않는 상품 ID: {missing}'},
        )


@router.post('/auth/login', response_model=AdminLoginResponse)
async def admin_login(request: Request, db: Session = Depends(get_db)) -> AdminLoginResponse:
    username = None
    password = None

    content_type = request.headers.get('content-type', '')
    if 'application/json' in content_type:
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        username = payload.get('username')
        password = payload.get('password')
    else:
        try:
            form = await request.form()
        except Exception:
            form = {}
        username = form.get('username')
        password = form.get('password')

    if not username:
        username = request.query_params.get('username')
    if not password:
        password = request.query_params.get('password')

    if not username or not password:
        raise HTTPException(status_code=400, detail={'code': 'INVALID_REQUEST', 'message': '아이디/비밀번호가 필요합니다.'})

    admin = require_admin(db, str(username), str(password))
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


@router.get('/orders/{order_id}')
def admin_order_detail(
    order_id: int,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    require_admin_token(db, x_admin_token)

    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail={'code': 'ORDER_NOT_FOUND', 'message': '주문을 찾을 수 없습니다.'})

    return order_to_schema(order)


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
    add_audit(db, admin, 'ORDER', str(order.id), 'ORDER_STATUS_UPDATED', {'status': payload.status.value})

    db.commit()
    db.refresh(order)

    return order_to_schema(order)


@router.post('/orders/{order_id}/shortage-actions')
def admin_shortage_action(
    order_id: int,
    payload: ShortageActionInput,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    admin = require_admin_token(db, x_admin_token)

    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail={'code': 'ORDER_NOT_FOUND', 'message': '주문을 찾을 수 없습니다.'})

    item = db.get(OrderItem, payload.order_item_id)
    if not item or item.order_id != order_id:
        raise HTTPException(status_code=404, detail={'code': 'ORDER_ITEM_NOT_FOUND', 'message': '주문 상품을 찾을 수 없습니다.'})

    refund_amount = Decimal('0')
    action = payload.action

    if action == 'SUBSTITUTE':
        if not order.allow_substitution:
            raise HTTPException(status_code=400, detail={'code': 'SUBSTITUTE_NOT_ALLOWED', 'message': '대체상품 비허용 주문입니다.'})
        if payload.substitution_product_id is None or payload.substitution_qty is None:
            raise HTTPException(status_code=400, detail={'code': 'INVALID_REQUEST', 'message': '대체 상품/수량이 필요합니다.'})

        substitution = db.get(Product, payload.substitution_product_id)
        if not substitution or substitution.status != ProductStatus.ACTIVE:
            raise HTTPException(status_code=400, detail={'code': 'INVALID_SUBSTITUTION', 'message': '대체 가능한 상품이 아닙니다.'})

        available = substitution.stock_qty - substitution.reserved_qty
        if available < payload.substitution_qty:
            raise HTTPException(status_code=400, detail={'code': 'INSUFFICIENT_STOCK', 'message': '대체상품 재고가 부족합니다.'})

        substitution.stock_qty -= payload.substitution_qty
        unit_final = to_decimal(effective_price(substitution))
        line_final = unit_final * payload.substitution_qty

        item.substitution_product_id = substitution.id
        item.qty_fulfilled = payload.substitution_qty
        item.unit_price_final = unit_final
        item.line_final = line_final
        item.item_status = 'SUBSTITUTED'
        item.note = payload.reason
        refund_amount = to_decimal(item.line_estimated) - line_final
    else:
        fulfilled_qty = payload.fulfilled_qty if payload.fulfilled_qty is not None else 0
        if fulfilled_qty > item.qty_ordered:
            raise HTTPException(status_code=400, detail={'code': 'INVALID_QTY', 'message': '처리 수량이 주문 수량을 초과합니다.'})

        unit_final = to_decimal(item.unit_price_estimated)
        line_final = unit_final * fulfilled_qty

        item.qty_fulfilled = fulfilled_qty
        item.unit_price_final = unit_final
        item.line_final = line_final
        item.item_status = 'OUT_OF_STOCK' if action == 'OUT_OF_STOCK' or fulfilled_qty == 0 else 'PARTIAL_CANCELED'
        item.note = payload.reason

        refund_amount = to_decimal(item.line_estimated) - line_final

    created_refund = None
    if refund_amount > Decimal('0'):
        created_refund = Refund(
            order_id=order.id,
            amount=refund_amount,
            reason=payload.reason or f'SHORTAGE_{action}',
            method='COD_ADJUSTMENT',
            status='APPROVED',
            processed_by=admin.username,
        )
        db.add(created_refund)

    if order.status == OrderStatus.RECEIVED:
        order.status = OrderStatus.PICKING

    refresh_order_final_total(db, order)
    add_audit(
        db,
        admin,
        'ORDER_ITEM',
        str(item.id),
        f'SHORTAGE_{action}',
        {
            'order_id': order.id,
            'item_status': item.item_status,
            'refund_amount': str(refund_amount),
        },
    )

    db.commit()
    db.refresh(order)
    if created_refund:
        db.refresh(created_refund)

    return {
        'order': order_to_schema(order),
        'refund': refund_to_schema(created_refund) if created_refund else None,
    }


@router.get('/orders/{order_id}/refunds', response_model=list[RefundOut])
def admin_get_refunds(
    order_id: int,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    require_admin_token(db, x_admin_token)

    rows = list(
        db.scalars(
            select(Refund).where(Refund.order_id == order_id).order_by(Refund.processed_at.desc(), Refund.id.desc())
        )
    )
    return [refund_to_schema(row) for row in rows]


@router.post('/orders/{order_id}/refunds', response_model=RefundOut)
def admin_create_refund(
    order_id: int,
    payload: RefundCreateInput,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    admin = require_admin_token(db, x_admin_token)

    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail={'code': 'ORDER_NOT_FOUND', 'message': '주문을 찾을 수 없습니다.'})

    refund = Refund(
        order_id=order_id,
        amount=payload.amount,
        reason=payload.reason,
        method=payload.method,
        status='APPROVED',
        processed_by=admin.username,
    )
    db.add(refund)

    refresh_order_final_total(db, order)
    add_audit(db, admin, 'ORDER', str(order.id), 'REFUND_CREATED', {'amount': str(payload.amount), 'reason': payload.reason})

    db.commit()
    db.refresh(refund)

    return refund_to_schema(refund)


@router.get('/products', response_model=list[ProductOut])
def admin_get_products(
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    require_admin_token(db, x_admin_token)
    products = list(
        db.scalars(
            select(Product)
            .where(Product.is_visible.is_(True))
            .order_by(Product.id.asc())
            .limit(500)
        )
    )
    return [product_to_schema(product) for product in products]


@router.post('/products', response_model=ProductOut)
def admin_create_product(
    payload: ProductCreateInput,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    admin = require_admin_token(db, x_admin_token)

    duplicate = db.scalar(select(Product).where(Product.sku == payload.sku))
    if duplicate:
        raise HTTPException(status_code=409, detail={'code': 'DUPLICATE_SKU', 'message': '중복 SKU 입니다.'})
    if payload.sale_price is not None and to_decimal(payload.sale_price) >= to_decimal(payload.base_price):
        raise HTTPException(status_code=400, detail={'code': 'INVALID_PRICE', 'message': '할인가는 판매가보다 작아야 합니다.'})

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
    add_audit(db, admin, 'PRODUCT', payload.sku, 'PRODUCT_CREATED', {'name': payload.name})

    db.commit()
    db.refresh(product)

    return product_to_schema(product)


@router.patch('/products/{product_id}', response_model=ProductOut)
def admin_patch_product(
    product_id: int,
    payload: ProductPatchInput,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    admin = require_admin_token(db, x_admin_token)
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail={'code': 'PRODUCT_NOT_FOUND', 'message': '상품을 찾을 수 없습니다.'})

    payload_fields = payload.model_fields_set

    if 'sku' in payload_fields and payload.sku:
        duplicate = db.scalar(select(Product).where(and_(Product.sku == payload.sku, Product.id != product_id)))
        if duplicate:
            raise HTTPException(status_code=409, detail={'code': 'DUPLICATE_SKU', 'message': '중복 SKU 입니다.'})

    if 'category_id' in payload_fields:
        product.category_id = payload.category_id
    if 'name' in payload_fields and payload.name is not None:
        product.name = payload.name
    if 'sku' in payload_fields and payload.sku is not None:
        product.sku = payload.sku
    if 'description' in payload_fields:
        product.description = payload.description
    if 'unit_label' in payload_fields and payload.unit_label is not None:
        product.unit_label = payload.unit_label
    if 'origin_country' in payload_fields:
        product.origin_country = payload.origin_country
    if 'storage_method' in payload_fields:
        product.storage_method = payload.storage_method
    if 'is_weight_item' in payload_fields and payload.is_weight_item is not None:
        product.is_weight_item = payload.is_weight_item
    if 'base_price' in payload_fields and payload.base_price is not None:
        product.base_price = payload.base_price
    if 'sale_price' in payload_fields:
        product.sale_price = payload.sale_price
    if 'status' in payload_fields and payload.status is not None:
        product.status = payload.status
    if 'is_visible' in payload_fields and payload.is_visible is not None:
        product.is_visible = payload.is_visible
    if 'stock_qty' in payload_fields and payload.stock_qty is not None:
        product.stock_qty = payload.stock_qty
    if 'max_per_order' in payload_fields and payload.max_per_order is not None:
        product.max_per_order = payload.max_per_order

    if product.sale_price is not None and to_decimal(product.sale_price) >= to_decimal(product.base_price):
        raise HTTPException(status_code=400, detail={'code': 'INVALID_PRICE', 'message': '할인가는 판매가보다 작아야 합니다.'})

    def to_audit_value(raw_value):
        if isinstance(raw_value, Decimal):
            return str(raw_value)
        if isinstance(raw_value, ProductStatus):
            return raw_value.value
        return raw_value

    add_audit(
        db,
        admin,
        'PRODUCT',
        str(product_id),
        'PRODUCT_UPDATED',
        {field: to_audit_value(getattr(product, field)) for field in payload_fields},
    )

    db.commit()
    db.refresh(product)

    return product_to_schema(product)


@router.delete('/products/{product_id}')
def admin_delete_product(
    product_id: int,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    admin = require_admin_token(db, x_admin_token)
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail={'code': 'PRODUCT_NOT_FOUND', 'message': '상품을 찾을 수 없습니다.'})

    product.is_visible = False
    product.status = ProductStatus.PAUSED

    add_audit(
        db,
        admin,
        'PRODUCT',
        str(product_id),
        'PRODUCT_DELETED',
        {'is_visible': product.is_visible, 'status': product.status.value},
    )

    db.commit()

    return {'ok': True, 'product_id': product_id, 'status': product.status.value, 'is_visible': product.is_visible}


@router.patch('/products/{product_id}/inventory', response_model=ProductOut)
def admin_update_inventory(
    product_id: int,
    payload: InventoryUpdateInput,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    admin = require_admin_token(db, x_admin_token)
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail={'code': 'PRODUCT_NOT_FOUND', 'message': '상품을 찾을 수 없습니다.'})

    product.stock_qty = payload.stock_qty
    product.max_per_order = payload.max_per_order
    add_audit(db, admin, 'PRODUCT', str(product_id), 'INVENTORY_UPDATED', {'stock_qty': payload.stock_qty})

    db.commit()
    db.refresh(product)

    return product_to_schema(product)


@router.get('/promotions', response_model=list[AdminPromotionOut])
def admin_get_promotions(
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    require_admin_token(db, x_admin_token)

    promotions = list(db.scalars(select(Promotion).order_by(Promotion.start_at.desc(), Promotion.id.desc())))
    return [promotion_to_schema(db, promotion) for promotion in promotions]


@router.post('/promotions', response_model=AdminPromotionOut)
def admin_create_promotion(
    payload: PromotionUpsertInput,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    admin = require_admin_token(db, x_admin_token)
    validate_promotion_products(db, payload.product_ids)

    promotion = Promotion(
        title=payload.title,
        promo_type=payload.promo_type,
        start_at=payload.start_at,
        end_at=payload.end_at,
        is_active=payload.is_active,
        banner_image_url=payload.banner_image_url,
    )
    db.add(promotion)
    db.flush()

    for product_id in payload.product_ids:
        db.add(
            PromotionProduct(
                promotion_id=promotion.id,
                product_id=product_id,
                promo_price=payload.promo_price,
                is_featured=False,
            )
        )

    add_audit(db, admin, 'PROMOTION', str(promotion.id), 'PROMOTION_CREATED', {'title': payload.title})
    db.commit()
    db.refresh(promotion)

    return promotion_to_schema(db, promotion)


@router.patch('/promotions/{promotion_id}', response_model=AdminPromotionOut)
def admin_patch_promotion(
    promotion_id: int,
    payload: PromotionPatchInput,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    admin = require_admin_token(db, x_admin_token)

    promotion = db.get(Promotion, promotion_id)
    if not promotion:
        raise HTTPException(status_code=404, detail={'code': 'PROMOTION_NOT_FOUND', 'message': '행사를 찾을 수 없습니다.'})

    if payload.title is not None:
        promotion.title = payload.title
    if payload.promo_type is not None:
        promotion.promo_type = payload.promo_type
    if payload.start_at is not None:
        promotion.start_at = payload.start_at
    if payload.end_at is not None:
        promotion.end_at = payload.end_at
    if payload.is_active is not None:
        promotion.is_active = payload.is_active
    if payload.banner_image_url is not None:
        promotion.banner_image_url = payload.banner_image_url

    if payload.product_ids is not None:
        validate_promotion_products(db, payload.product_ids)
        rows = list(db.scalars(select(PromotionProduct).where(PromotionProduct.promotion_id == promotion.id)))
        for row in rows:
            db.delete(row)

        for product_id in payload.product_ids:
            db.add(
                PromotionProduct(
                    promotion_id=promotion.id,
                    product_id=product_id,
                    promo_price=payload.promo_price,
                    is_featured=False,
                )
            )

    add_audit(db, admin, 'PROMOTION', str(promotion.id), 'PROMOTION_UPDATED')
    db.commit()
    db.refresh(promotion)

    return promotion_to_schema(db, promotion)


@router.get('/banners', response_model=list[BannerOut])
def admin_get_banners(
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    require_admin_token(db, x_admin_token)

    banners = list(db.scalars(select(Banner).order_by(Banner.display_order.asc(), Banner.id.asc())))
    return [
        BannerOut(
            id=banner.id,
            title=banner.title,
            image_url=banner.image_url,
            link_type=banner.link_type,
            link_target=banner.link_target,
            display_order=banner.display_order,
            is_active=banner.is_active,
            start_at=banner.start_at,
            end_at=banner.end_at,
        )
        for banner in banners
    ]


@router.post('/banners', response_model=BannerOut)
def admin_create_banner(
    payload: BannerUpsertInput,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    admin = require_admin_token(db, x_admin_token)

    banner = Banner(
        title=payload.title,
        image_url=payload.image_url,
        link_type=payload.link_type,
        link_target=payload.link_target,
        display_order=payload.display_order,
        is_active=payload.is_active,
        start_at=payload.start_at,
        end_at=payload.end_at,
    )
    db.add(banner)
    add_audit(db, admin, 'BANNER', 'new', 'BANNER_CREATED', {'title': payload.title})

    db.commit()
    db.refresh(banner)

    return BannerOut(
        id=banner.id,
        title=banner.title,
        image_url=banner.image_url,
        link_type=banner.link_type,
        link_target=banner.link_target,
        display_order=banner.display_order,
        is_active=banner.is_active,
        start_at=banner.start_at,
        end_at=banner.end_at,
    )


@router.patch('/banners/{banner_id}', response_model=BannerOut)
def admin_patch_banner(
    banner_id: int,
    payload: BannerPatchInput,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    admin = require_admin_token(db, x_admin_token)

    banner = db.get(Banner, banner_id)
    if not banner:
        raise HTTPException(status_code=404, detail={'code': 'BANNER_NOT_FOUND', 'message': '배너를 찾을 수 없습니다.'})

    if payload.title is not None:
        banner.title = payload.title
    if payload.image_url is not None:
        banner.image_url = payload.image_url
    if payload.link_type is not None:
        banner.link_type = payload.link_type
    if payload.link_target is not None:
        banner.link_target = payload.link_target
    if payload.display_order is not None:
        banner.display_order = payload.display_order
    if payload.is_active is not None:
        banner.is_active = payload.is_active
    if payload.start_at is not None:
        banner.start_at = payload.start_at
    if payload.end_at is not None:
        banner.end_at = payload.end_at

    add_audit(db, admin, 'BANNER', str(banner_id), 'BANNER_UPDATED')
    db.commit()
    db.refresh(banner)

    return BannerOut(
        id=banner.id,
        title=banner.title,
        image_url=banner.image_url,
        link_type=banner.link_type,
        link_target=banner.link_target,
        display_order=banner.display_order,
        is_active=banner.is_active,
        start_at=banner.start_at,
        end_at=banner.end_at,
    )


@router.get('/notices', response_model=list[NoticeOut])
def admin_get_notices(
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    require_admin_token(db, x_admin_token)

    rows = list(db.scalars(select(Notice).order_by(Notice.is_pinned.desc(), Notice.created_at.desc())))
    return [
        NoticeOut(
            id=notice.id,
            title=notice.title,
            body=notice.body,
            start_at=notice.start_at,
            end_at=notice.end_at,
            is_pinned=notice.is_pinned,
            is_active=notice.is_active,
        )
        for notice in rows
    ]


@router.post('/notices', response_model=NoticeOut)
def admin_create_notice(
    payload: NoticeUpsertInput,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    admin = require_admin_token(db, x_admin_token)

    notice = Notice(
        title=payload.title,
        body=payload.body,
        start_at=payload.start_at,
        end_at=payload.end_at,
        is_pinned=payload.is_pinned,
        is_active=payload.is_active,
    )
    db.add(notice)
    add_audit(db, admin, 'NOTICE', 'new', 'NOTICE_CREATED', {'title': payload.title})

    db.commit()
    db.refresh(notice)

    return NoticeOut(
        id=notice.id,
        title=notice.title,
        body=notice.body,
        start_at=notice.start_at,
        end_at=notice.end_at,
        is_pinned=notice.is_pinned,
        is_active=notice.is_active,
    )


@router.patch('/notices/{notice_id}', response_model=NoticeOut)
def admin_patch_notice(
    notice_id: int,
    payload: NoticePatchInput,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    admin = require_admin_token(db, x_admin_token)

    notice = db.get(Notice, notice_id)
    if not notice:
        raise HTTPException(status_code=404, detail={'code': 'NOTICE_NOT_FOUND', 'message': '공지를 찾을 수 없습니다.'})

    if payload.title is not None:
        notice.title = payload.title
    if payload.body is not None:
        notice.body = payload.body
    if payload.start_at is not None:
        notice.start_at = payload.start_at
    if payload.end_at is not None:
        notice.end_at = payload.end_at
    if payload.is_pinned is not None:
        notice.is_pinned = payload.is_pinned
    if payload.is_active is not None:
        notice.is_active = payload.is_active

    add_audit(db, admin, 'NOTICE', str(notice_id), 'NOTICE_UPDATED')
    db.commit()
    db.refresh(notice)

    return NoticeOut(
        id=notice.id,
        title=notice.title,
        body=notice.body,
        start_at=notice.start_at,
        end_at=notice.end_at,
        is_pinned=notice.is_pinned,
        is_active=notice.is_active,
    )


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
