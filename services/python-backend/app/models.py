import enum
from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class ProductStatus(str, enum.Enum):
    ACTIVE = 'ACTIVE'
    SOLD_OUT = 'SOLD_OUT'
    PAUSED = 'PAUSED'


class ZoneType(str, enum.Enum):
    DONG = 'DONG'
    APARTMENT = 'APARTMENT'
    RADIUS = 'RADIUS'


class OrderStatus(str, enum.Enum):
    RECEIVED = 'RECEIVED'
    PICKING = 'PICKING'
    SUBSTITUTION_PENDING = 'SUBSTITUTION_PENDING'
    OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY'
    DELIVERED = 'DELIVERED'
    CANCELED = 'CANCELED'


class PaymentMethod(str, enum.Enum):
    COD = 'COD'


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Category(TimestampMixin, Base):
    __tablename__ = 'categories'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    products: Mapped[list['Product']] = relationship(back_populates='category')


class Product(TimestampMixin, Base):
    __tablename__ = 'products'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey('categories.id'))
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    sku: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    origin_country: Mapped[str | None] = mapped_column(String(80))
    storage_method: Mapped[str | None] = mapped_column(String(80))
    unit_label: Mapped[str] = mapped_column(String(30), nullable=False, default='ea')
    is_weight_item: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    base_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    sale_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    status: Mapped[ProductStatus] = mapped_column(Enum(ProductStatus), default=ProductStatus.ACTIVE, nullable=False)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    pick_location: Mapped[str | None] = mapped_column(String(60))
    popularity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stock_qty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reserved_qty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_per_order: Mapped[int] = mapped_column(Integer, default=10, nullable=False)

    category: Mapped[Category | None] = relationship(back_populates='products')


class Promotion(TimestampMixin, Base):
    __tablename__ = 'promotions'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    promo_type: Mapped[str] = mapped_column(String(40), nullable=False, default='WEEKLY')
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    banner_image_url: Mapped[str | None] = mapped_column(String(400))


class PromotionProduct(Base):
    __tablename__ = 'promotion_products'
    __table_args__ = (UniqueConstraint('promotion_id', 'product_id', name='uq_promotion_product'),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    promotion_id: Mapped[int] = mapped_column(ForeignKey('promotions.id'), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id'), nullable=False)
    promo_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class Cart(TimestampMixin, Base):
    __tablename__ = 'carts'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_key: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    customer_phone: Mapped[str | None] = mapped_column(String(20))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    items: Mapped[list['CartItem']] = relationship(back_populates='cart', cascade='all, delete-orphan')


class CartItem(TimestampMixin, Base):
    __tablename__ = 'cart_items'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cart_id: Mapped[int] = mapped_column(ForeignKey('carts.id', ondelete='CASCADE'), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id'), nullable=False)
    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_snapshot_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    cart: Mapped[Cart] = relationship(back_populates='items')
    product: Mapped[Product] = relationship()


class StorePolicy(TimestampMixin, Base):
    __tablename__ = 'store_policies'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    open_time: Mapped[time] = mapped_column(Time, nullable=False)
    close_time: Mapped[time] = mapped_column(Time, nullable=False)
    same_day_cutoff_time: Mapped[time] = mapped_column(Time, nullable=False)
    min_order_amount_default: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    base_delivery_fee_default: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    free_delivery_threshold_default: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    allow_reservation_days: Mapped[int] = mapped_column(Integer, nullable=False, default=2)


class DeliveryZone(TimestampMixin, Base):
    __tablename__ = 'delivery_zones'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    zone_type: Mapped[ZoneType] = mapped_column(Enum(ZoneType), nullable=False)
    dong_code: Mapped[str | None] = mapped_column(String(30))
    apartment_name: Mapped[str | None] = mapped_column(String(120))
    center_lat: Mapped[Decimal | None] = mapped_column(Numeric(10, 7))
    center_lng: Mapped[Decimal | None] = mapped_column(Numeric(10, 7))
    radius_m: Mapped[int | None] = mapped_column(Integer)
    min_order_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    base_fee: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    free_delivery_threshold: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Holiday(TimestampMixin, Base):
    __tablename__ = 'holidays'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    holiday_date: Mapped[date] = mapped_column(Date, nullable=False, unique=True)
    reason: Mapped[str | None] = mapped_column(String(200))
    is_closed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Order(TimestampMixin, Base):
    __tablename__ = 'orders'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_no: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    customer_name: Mapped[str] = mapped_column(String(100), nullable=False)
    customer_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    address_line1: Mapped[str] = mapped_column(String(200), nullable=False)
    address_line2: Mapped[str | None] = mapped_column(String(200))
    building: Mapped[str | None] = mapped_column(String(80))
    unit_no: Mapped[str | None] = mapped_column(String(40))
    delivery_zone_id: Mapped[int | None] = mapped_column(ForeignKey('delivery_zones.id'))
    requested_slot_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    requested_slot_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    allow_substitution: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    payment_method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod), default=PaymentMethod.COD, nullable=False)
    payment_status: Mapped[str] = mapped_column(String(30), default='PENDING', nullable=False)
    subtotal_estimated: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    delivery_fee: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total_estimated: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total_final: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), default=OrderStatus.RECEIVED, nullable=False)
    cancelable_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ordered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    picked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    items: Mapped[list['OrderItem']] = relationship(back_populates='order', cascade='all, delete-orphan')


class OrderItem(Base):
    __tablename__ = 'order_items'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(ForeignKey('orders.id', ondelete='CASCADE'), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id'), nullable=False)
    product_name_snapshot: Mapped[str] = mapped_column(String(160), nullable=False)
    unit_snapshot: Mapped[str] = mapped_column(String(30), nullable=False)
    qty_ordered: Mapped[int] = mapped_column(Integer, nullable=False)
    qty_fulfilled: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_estimated: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    unit_price_final: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    is_weight_item: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    est_weight_g: Mapped[int | None] = mapped_column(Integer)
    final_weight_g: Mapped[int | None] = mapped_column(Integer)
    line_estimated: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    line_final: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    item_status: Mapped[str] = mapped_column(String(30), default='CONFIRMED', nullable=False)
    substitution_product_id: Mapped[int | None] = mapped_column(ForeignKey('products.id'))
    note: Mapped[str | None] = mapped_column(String(200))

    order: Mapped[Order] = relationship(back_populates='items')


class OrderStatusLog(Base):
    __tablename__ = 'order_status_logs'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(ForeignKey('orders.id', ondelete='CASCADE'), nullable=False)
    from_status: Mapped[str | None] = mapped_column(String(40))
    to_status: Mapped[str] = mapped_column(String(40), nullable=False)
    changed_by_type: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by_id: Mapped[str | None] = mapped_column(String(50))
    reason: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class CancellationRequest(Base):
    __tablename__ = 'cancellation_requests'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(ForeignKey('orders.id', ondelete='CASCADE'), nullable=False)
    reason: Mapped[str] = mapped_column(String(300), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default='REQUESTED', nullable=False)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    processed_by: Mapped[str | None] = mapped_column(String(60))


class Notice(TimestampMixin, Base):
    __tablename__ = 'notices'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class AdminUser(TimestampMixin, Base):
    __tablename__ = 'admin_users'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(30), default='MANAGER', nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AuditLog(Base):
    __tablename__ = 'audit_logs'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    actor_type: Mapped[str] = mapped_column(String(30), nullable=False)
    actor_id: Mapped[str | None] = mapped_column(String(60))
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(60), nullable=False)
    action: Mapped[str] = mapped_column(String(60), nullable=False)
    before_json: Mapped[dict | None] = mapped_column(JSON)
    after_json: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ip: Mapped[str | None] = mapped_column(String(60))


class NotificationLog(Base):
    __tablename__ = 'notification_logs'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    event_type: Mapped[str] = mapped_column(String(60), nullable=False)
    target: Mapped[str] = mapped_column(String(120), nullable=False)
    payload_json: Mapped[dict | None] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[str | None] = mapped_column(String(300))
