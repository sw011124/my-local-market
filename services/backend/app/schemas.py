from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models import OrderStatus, ProductStatus, ZoneType


class CategoryOut(BaseModel):
    id: int
    name: str
    display_order: int


class ProductOut(BaseModel):
    id: int
    category_id: int | None
    category_name: str | None
    name: str
    sku: str
    description: str | None
    unit_label: str
    origin_country: str | None
    storage_method: str | None
    is_weight_item: bool
    base_price: Decimal
    sale_price: Decimal | None
    effective_price: Decimal
    status: ProductStatus
    stock_qty: int
    max_per_order: int
    pick_location: str | None


class PromotionOut(BaseModel):
    id: int
    title: str
    promo_type: str
    start_at: datetime
    end_at: datetime
    is_active: bool


class HomeResponse(BaseModel):
    categories: list[CategoryOut]
    featured_products: list[ProductOut]
    promotions: list[PromotionOut]
    notices: list[dict]


class CartItemInput(BaseModel):
    product_id: int
    qty: int = Field(ge=1, le=99)


class CartItemQtyUpdate(BaseModel):
    qty: int = Field(ge=1, le=99)


class CartItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    qty: int
    unit_price: Decimal
    line_total: Decimal
    stock_qty: int
    is_weight_item: bool


class CartOut(BaseModel):
    session_key: str
    items: list[CartItemOut]
    subtotal: Decimal


class CheckoutRequest(BaseModel):
    session_key: str
    dong_code: str | None = None
    apartment_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    requested_slot_start: datetime | None = None


class CheckoutValidateResponse(BaseModel):
    valid: bool
    errors: list[str]


class CheckoutQuoteResponse(BaseModel):
    valid: bool
    errors: list[str]
    subtotal: Decimal
    delivery_fee: Decimal
    total_estimated: Decimal
    min_order_amount: Decimal
    free_delivery_threshold: Decimal


class OrderCreateRequest(BaseModel):
    session_key: str
    customer_name: str
    customer_phone: str
    address_line1: str
    address_line2: str | None = None
    building: str | None = None
    unit_no: str | None = None
    dong_code: str | None = None
    apartment_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    requested_slot_start: datetime | None = None
    allow_substitution: bool = False
    delivery_request_note: str | None = None


class OrderItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    qty_ordered: int
    qty_fulfilled: int
    unit_price_estimated: Decimal
    line_estimated: Decimal
    is_weight_item: bool


class OrderOut(BaseModel):
    id: int
    order_no: str
    status: OrderStatus
    customer_name: str
    customer_phone: str
    subtotal_estimated: Decimal
    delivery_fee: Decimal
    total_estimated: Decimal
    total_final: Decimal | None
    allow_substitution: bool
    ordered_at: datetime
    requested_slot_start: datetime | None
    items: list[OrderItemOut]


class CancelRequestInput(BaseModel):
    reason: str = Field(min_length=2, max_length=300)


class AdminLoginInput(BaseModel):
    username: str
    password: str


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    role: str


class AdminOrderStatusUpdate(BaseModel):
    status: OrderStatus
    reason: str | None = None


class ProductCreateInput(BaseModel):
    category_id: int | None = None
    name: str
    sku: str
    description: str | None = None
    unit_label: str = 'ea'
    origin_country: str | None = None
    storage_method: str | None = None
    is_weight_item: bool = False
    base_price: Decimal
    sale_price: Decimal | None = None
    stock_qty: int = 0
    max_per_order: int = 10
    pick_location: str | None = None


class ProductPatchInput(BaseModel):
    category_id: int | None = None
    name: str | None = None
    sku: str | None = None
    description: str | None = None
    unit_label: str | None = None
    origin_country: str | None = None
    storage_method: str | None = None
    is_weight_item: bool | None = None
    base_price: Decimal | None = None
    sale_price: Decimal | None = None
    status: ProductStatus | None = None
    is_visible: bool | None = None
    stock_qty: int | None = Field(default=None, ge=0)
    max_per_order: int | None = Field(default=None, ge=1, le=99)
    pick_location: str | None = None


class PickingListItemOut(BaseModel):
    order_id: int
    order_no: str
    order_status: OrderStatus
    ordered_at: datetime
    requested_slot_start: datetime | None
    order_item_id: int
    product_id: int
    product_name: str
    unit_label: str
    qty_ordered: int
    qty_fulfilled: int
    pick_location: str | None


class PickingListSummaryOut(BaseModel):
    product_id: int
    product_name: str
    unit_label: str
    pick_location: str | None
    total_qty_ordered: int
    order_count: int


class PickingListOut(BaseModel):
    generated_at: datetime
    order_count: int
    line_count: int
    items: list[PickingListItemOut]
    summary: list[PickingListSummaryOut]


class InventoryUpdateInput(BaseModel):
    stock_qty: int = Field(ge=0)
    max_per_order: int = Field(ge=1, le=99)


class PolicyOut(BaseModel):
    open_time: str
    close_time: str
    same_day_cutoff_time: str
    min_order_amount_default: Decimal
    base_delivery_fee_default: Decimal
    free_delivery_threshold_default: Decimal
    allow_reservation_days: int


class PolicyPatchInput(BaseModel):
    open_time: time | None = None
    close_time: time | None = None
    same_day_cutoff_time: time | None = None
    min_order_amount_default: Decimal | None = None
    base_delivery_fee_default: Decimal | None = None
    free_delivery_threshold_default: Decimal | None = None
    allow_reservation_days: int | None = Field(default=None, ge=0, le=14)


class DeliveryZoneOut(BaseModel):
    id: int
    zone_type: ZoneType
    dong_code: str | None
    apartment_name: str | None
    center_lat: Decimal | None
    center_lng: Decimal | None
    radius_m: int | None
    min_order_amount: Decimal | None
    base_fee: Decimal | None
    free_delivery_threshold: Decimal | None
    is_active: bool


class DeliveryZoneUpsertInput(BaseModel):
    zone_type: ZoneType
    dong_code: str | None = None
    apartment_name: str | None = None
    center_lat: Decimal | None = None
    center_lng: Decimal | None = None
    radius_m: int | None = Field(default=None, ge=50, le=20000)
    min_order_amount: Decimal | None = Field(default=None, ge=0)
    base_fee: Decimal | None = Field(default=None, ge=0)
    free_delivery_threshold: Decimal | None = Field(default=None, ge=0)
    is_active: bool = True


class DeliveryZonePatchInput(BaseModel):
    zone_type: ZoneType | None = None
    dong_code: str | None = None
    apartment_name: str | None = None
    center_lat: Decimal | None = None
    center_lng: Decimal | None = None
    radius_m: int | None = Field(default=None, ge=50, le=20000)
    min_order_amount: Decimal | None = Field(default=None, ge=0)
    base_fee: Decimal | None = Field(default=None, ge=0)
    free_delivery_threshold: Decimal | None = Field(default=None, ge=0)
    is_active: bool | None = None


class HolidayOut(BaseModel):
    id: int
    holiday_date: date
    reason: str | None
    is_closed: bool


class HolidayUpsertInput(BaseModel):
    holiday_date: date
    reason: str | None = None
    is_closed: bool = True


class HolidayPatchInput(BaseModel):
    holiday_date: date | None = None
    reason: str | None = None
    is_closed: bool | None = None


class ShortageActionInput(BaseModel):
    order_item_id: int
    action: str = Field(pattern='^(SUBSTITUTE|PARTIAL_CANCEL|OUT_OF_STOCK)$')
    fulfilled_qty: int | None = Field(default=None, ge=0, le=99)
    substitution_product_id: int | None = None
    substitution_qty: int | None = Field(default=None, ge=1, le=99)
    reason: str | None = None


class RefundCreateInput(BaseModel):
    amount: Decimal = Field(gt=0)
    reason: str = Field(min_length=2, max_length=300)
    method: str = 'COD_ADJUSTMENT'


class RefundOut(BaseModel):
    id: int
    order_id: int
    amount: Decimal
    reason: str
    method: str
    status: str
    processed_at: datetime
    processed_by: str | None


class AdminPromotionOut(BaseModel):
    id: int
    title: str
    promo_type: str
    start_at: datetime
    end_at: datetime
    is_active: bool
    banner_image_url: str | None
    product_ids: list[int]
    promo_price: Decimal | None


class PromotionUpsertInput(BaseModel):
    title: str
    promo_type: str = 'WEEKLY'
    start_at: datetime
    end_at: datetime
    is_active: bool = True
    banner_image_url: str | None = None
    product_ids: list[int] = Field(default_factory=list)
    promo_price: Decimal | None = None


class PromotionPatchInput(BaseModel):
    title: str | None = None
    promo_type: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    is_active: bool | None = None
    banner_image_url: str | None = None
    product_ids: list[int] | None = None
    promo_price: Decimal | None = None


class BannerOut(BaseModel):
    id: int
    title: str
    image_url: str
    link_type: str
    link_target: str | None
    display_order: int
    is_active: bool
    start_at: datetime
    end_at: datetime


class BannerUpsertInput(BaseModel):
    title: str
    image_url: str
    link_type: str = 'PROMOTION'
    link_target: str | None = None
    display_order: int = 0
    is_active: bool = True
    start_at: datetime
    end_at: datetime


class BannerPatchInput(BaseModel):
    title: str | None = None
    image_url: str | None = None
    link_type: str | None = None
    link_target: str | None = None
    display_order: int | None = None
    is_active: bool | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None


class NoticeOut(BaseModel):
    id: int
    title: str
    body: str
    start_at: datetime
    end_at: datetime
    is_pinned: bool
    is_active: bool


class NoticeUpsertInput(BaseModel):
    title: str
    body: str
    start_at: datetime
    end_at: datetime
    is_pinned: bool = False
    is_active: bool = True


class NoticePatchInput(BaseModel):
    title: str | None = None
    body: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    is_pinned: bool | None = None
    is_active: bool | None = None
