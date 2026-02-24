from __future__ import annotations

import math
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.models import (
    AdminUser,
    CancellationRequest,
    Cart,
    CartItem,
    DeliveryZone,
    Holiday,
    Order,
    OrderItem,
    OrderStatus,
    OrderStatusLog,
    Product,
    ProductStatus,
    StorePolicy,
    ZoneType,
)
from app.core import get_settings

settings = get_settings()
LOCAL_TZ = ZoneInfo(settings.time_zone)

ALLOWED_ORDER_STATUS_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.RECEIVED: {OrderStatus.PICKING, OrderStatus.CANCELED},
    OrderStatus.PICKING: {
        OrderStatus.SUBSTITUTION_PENDING,
        OrderStatus.OUT_FOR_DELIVERY,
        OrderStatus.CANCELED,
    },
    OrderStatus.SUBSTITUTION_PENDING: {OrderStatus.PICKING, OrderStatus.CANCELED},
    OrderStatus.OUT_FOR_DELIVERY: {OrderStatus.DELIVERED},
    OrderStatus.DELIVERED: set(),
    OrderStatus.CANCELED: set(),
}


class DomainError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def get_allowed_next_order_statuses(from_status: OrderStatus) -> list[OrderStatus]:
    candidates = ALLOWED_ORDER_STATUS_TRANSITIONS.get(from_status, set())
    return sorted(candidates, key=lambda status: status.value)


def is_order_status_transition_allowed(
    from_status: OrderStatus,
    to_status: OrderStatus,
) -> bool:
    if from_status == to_status:
        return True
    return to_status in ALLOWED_ORDER_STATUS_TRANSITIONS.get(from_status, set())


def effective_price(product: Product) -> Decimal:
    return product.sale_price if product.sale_price is not None else product.base_price


def to_decimal(value: float | Decimal | int | None) -> Decimal:
    if value is None:
        return Decimal('0')
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def generate_session_key() -> str:
    return secrets.token_urlsafe(24)


def generate_order_no() -> str:
    now = datetime.now(timezone.utc)
    return f"LM{now.strftime('%Y%m%d%H%M%S')}{secrets.randbelow(900)+100}"


def get_or_create_policy(db: Session) -> StorePolicy:
    policy = db.scalar(select(StorePolicy).limit(1))
    if policy:
        return policy

    policy = StorePolicy(
        open_time=datetime.strptime('09:00', '%H:%M').time(),
        close_time=datetime.strptime('21:00', '%H:%M').time(),
        same_day_cutoff_time=datetime.strptime('19:00', '%H:%M').time(),
        min_order_amount_default=Decimal('15000'),
        base_delivery_fee_default=Decimal('3000'),
        free_delivery_threshold_default=Decimal('40000'),
        allow_reservation_days=2,
    )
    db.add(policy)
    db.flush()
    return policy


def get_or_create_cart(db: Session, session_key: str, user_id: int | None = None) -> Cart:
    cart = db.scalar(select(Cart).where(Cart.session_key == session_key))
    if cart:
        if user_id is not None:
            if cart.user_id is None:
                cart.user_id = user_id
                db.flush()
            elif cart.user_id != user_id:
                raise DomainError('CART_OWNERSHIP_MISMATCH', '다른 사용자의 장바구니입니다.')
        return cart

    cart = Cart(
        session_key=session_key,
        user_id=user_id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(cart)
    db.flush()
    return cart


def fetch_cart_items(db: Session, cart_id: int) -> list[CartItem]:
    return list(
        db.scalars(
            select(CartItem)
            .where(CartItem.cart_id == cart_id)
            .order_by(CartItem.created_at.asc())
        )
    )


def calculate_cart_subtotal(items: list[CartItem]) -> Decimal:
    subtotal = Decimal('0')
    for item in items:
        subtotal += to_decimal(item.unit_snapshot_price) * item.qty
    return subtotal


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lng2 - lng1)

    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def match_delivery_zone(
    db: Session,
    dong_code: str | None,
    apartment_name: str | None,
    latitude: float | None,
    longitude: float | None,
) -> DeliveryZone | None:
    base_query = select(DeliveryZone).where(DeliveryZone.is_active.is_(True))

    if apartment_name:
        apartment_zone = db.scalar(
            base_query.where(
                and_(
                    DeliveryZone.zone_type == ZoneType.APARTMENT,
                    DeliveryZone.apartment_name == apartment_name,
                )
            ).order_by(DeliveryZone.id.desc())
        )
        if apartment_zone:
            return apartment_zone

    if dong_code:
        dong_zone = db.scalar(
            base_query.where(
                and_(
                    DeliveryZone.zone_type == ZoneType.DONG,
                    DeliveryZone.dong_code == dong_code,
                )
            ).order_by(DeliveryZone.id.desc())
        )
        if dong_zone:
            return dong_zone

    if latitude is not None and longitude is not None:
        radius_zones = list(
            db.scalars(
                base_query.where(DeliveryZone.zone_type == ZoneType.RADIUS).order_by(
                    DeliveryZone.radius_m.asc(),
                    DeliveryZone.id.desc(),
                )
            )
        )
        for zone in radius_zones:
            if zone.center_lat is None or zone.center_lng is None or zone.radius_m is None:
                continue
            distance = haversine_m(float(zone.center_lat), float(zone.center_lng), latitude, longitude)
            if distance <= zone.radius_m:
                return zone

    return None


@dataclass
class ValidationResult:
    valid: bool
    errors: list[str]
    subtotal: Decimal
    delivery_fee: Decimal
    total_estimated: Decimal
    min_order_amount: Decimal
    free_delivery_threshold: Decimal
    zone: DeliveryZone | None


def validate_checkout(
    db: Session,
    cart: Cart,
    dong_code: str | None,
    apartment_name: str | None,
    latitude: float | None,
    longitude: float | None,
    requested_slot_start: datetime | None,
) -> ValidationResult:
    now_local = datetime.now(LOCAL_TZ)
    errors: list[str] = []

    policy = get_or_create_policy(db)
    today_local = now_local.date()
    local_now_time = now_local.time()

    local_slot = None
    if requested_slot_start is not None:
        if requested_slot_start.tzinfo is None:
            local_slot = requested_slot_start.replace(tzinfo=LOCAL_TZ)
        else:
            local_slot = requested_slot_start.astimezone(LOCAL_TZ)

    if local_slot is None:
        is_holiday_today = db.scalar(
            select(Holiday).where(and_(Holiday.holiday_date == today_local, Holiday.is_closed.is_(True)))
        )
        if is_holiday_today:
            errors.append('HOLIDAY_CLOSED')

        if not (policy.open_time <= local_now_time <= policy.close_time):
            errors.append('STORE_CLOSED')

        if local_now_time > policy.same_day_cutoff_time:
            errors.append('CUTOFF_PASSED')
    else:
        if local_slot <= now_local:
            errors.append('SLOT_UNAVAILABLE')

        max_reservation_date = today_local + timedelta(days=policy.allow_reservation_days)
        if local_slot.date() > max_reservation_date:
            errors.append('SLOT_UNAVAILABLE')

        if not (policy.open_time <= local_slot.time() <= policy.close_time):
            errors.append('SLOT_UNAVAILABLE')

        slot_holiday = db.scalar(
            select(Holiday).where(and_(Holiday.holiday_date == local_slot.date(), Holiday.is_closed.is_(True)))
        )
        if slot_holiday:
            errors.append('HOLIDAY_CLOSED')

        if local_slot.date() == today_local and local_now_time > policy.same_day_cutoff_time:
            errors.append('CUTOFF_PASSED')

    zone = match_delivery_zone(db, dong_code, apartment_name, latitude, longitude)
    if not zone:
        errors.append('OUT_OF_DELIVERY_ZONE')

    items = fetch_cart_items(db, cart.id)
    if not items:
        errors.append('INVALID_REQUEST')

    subtotal = Decimal('0')
    for item in items:
        product = db.get(Product, item.product_id)
        if product is None or not product.is_visible or product.status != ProductStatus.ACTIVE:
            errors.append('OUT_OF_STOCK')
            continue
        if item.qty > product.max_per_order:
            errors.append('MAX_QTY_EXCEEDED')
            continue
        available = product.stock_qty - product.reserved_qty
        if available < item.qty:
            errors.append('INSUFFICIENT_STOCK')
            continue
        subtotal += to_decimal(item.unit_snapshot_price) * item.qty

    min_order = to_decimal(zone.min_order_amount if zone and zone.min_order_amount is not None else policy.min_order_amount_default)
    if subtotal < min_order:
        errors.append('MIN_ORDER_NOT_MET')

    base_delivery = to_decimal(zone.base_fee if zone and zone.base_fee is not None else policy.base_delivery_fee_default)
    free_threshold = to_decimal(
        zone.free_delivery_threshold if zone and zone.free_delivery_threshold is not None else policy.free_delivery_threshold_default
    )

    delivery_fee = Decimal('0') if subtotal >= free_threshold else base_delivery
    total_estimated = subtotal + delivery_fee

    return ValidationResult(
        valid=len(errors) == 0,
        errors=sorted(set(errors)),
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        total_estimated=total_estimated,
        min_order_amount=min_order,
        free_delivery_threshold=free_threshold,
        zone=zone,
    )


def require_admin(db: Session, username: str, password: str) -> AdminUser:
    user = db.scalar(
        select(AdminUser).where(
            and_(AdminUser.username == username, AdminUser.password_hash == password, AdminUser.is_active.is_(True))
        )
    )
    if not user:
        raise DomainError('UNAUTHORIZED', '관리자 인증에 실패했습니다.')
    return user


def create_order(
    db: Session,
    cart: Cart,
    customer_name: str,
    customer_phone: str,
    address_line1: str,
    address_line2: str | None,
    building: str | None,
    unit_no: str | None,
    allow_substitution: bool,
    requested_slot_start: datetime | None,
    zone: DeliveryZone | None,
    quote: ValidationResult,
    user_id: int | None = None,
    order_source: str = 'GUEST',
) -> Order:
    if not quote.valid:
        raise DomainError('INVALID_REQUEST', '주문 생성 전 검증에 실패했습니다.')

    order = Order(
        order_no=generate_order_no(),
        user_id=user_id,
        order_source=order_source,
        customer_name=customer_name,
        customer_phone=customer_phone,
        address_line1=address_line1,
        address_line2=address_line2,
        building=building,
        unit_no=unit_no,
        delivery_zone_id=zone.id if zone else None,
        requested_slot_start=requested_slot_start,
        requested_slot_end=(requested_slot_start + timedelta(hours=1)) if requested_slot_start else None,
        allow_substitution=allow_substitution,
        subtotal_estimated=quote.subtotal,
        delivery_fee=quote.delivery_fee,
        total_estimated=quote.total_estimated,
        cancelable_until=datetime.now(timezone.utc) + timedelta(minutes=30),
    )
    db.add(order)
    db.flush()

    items = fetch_cart_items(db, cart.id)
    for item in items:
        product = db.get(Product, item.product_id)
        if product is None:
            raise DomainError('OUT_OF_STOCK', '상품을 찾을 수 없습니다.')

        if product.stock_qty - product.reserved_qty < item.qty:
            raise DomainError('INSUFFICIENT_STOCK', f'{product.name} 재고가 부족합니다.')

        product.stock_qty -= item.qty
        line_estimated = to_decimal(item.unit_snapshot_price) * item.qty

        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            product_name_snapshot=product.name,
            unit_snapshot=product.unit_label,
            qty_ordered=item.qty,
            qty_fulfilled=item.qty,
            unit_price_estimated=item.unit_snapshot_price,
            is_weight_item=product.is_weight_item,
            line_estimated=line_estimated,
        )
        db.add(order_item)

    status_log = OrderStatusLog(
        order_id=order.id,
        from_status=None,
        to_status=OrderStatus.RECEIVED.value,
        changed_by_type='SYSTEM',
        changed_by_id='system',
        reason='ORDER_CREATED',
    )
    db.add(status_log)

    for item in items:
        db.delete(item)

    return order


def update_order_status(
    db: Session,
    order: Order,
    to_status: OrderStatus,
    changed_by: str,
    reason: str | None,
    changed_by_type: str = 'ADMIN',
) -> tuple[Order, bool]:
    from_status = order.status
    if from_status == to_status:
        return order, False

    if not is_order_status_transition_allowed(from_status, to_status):
        allowed = [status.value for status in get_allowed_next_order_statuses(from_status)]
        raise DomainError(
            'INVALID_STATUS_TRANSITION',
            f'허용되지 않은 상태 전이입니다: {from_status.value} -> {to_status.value} (allowed={allowed})',
        )

    order.status = to_status

    now = datetime.now(timezone.utc)
    if to_status == OrderStatus.PICKING:
        order.picked_at = now
    if to_status == OrderStatus.DELIVERED:
        order.delivered_at = now
        order.total_final = order.total_estimated

    db.add(
        OrderStatusLog(
            order_id=order.id,
            from_status=from_status.value,
            to_status=to_status.value,
            changed_by_type=changed_by_type,
            changed_by_id=changed_by,
            reason=reason,
        )
    )
    db.flush()
    return order, True
