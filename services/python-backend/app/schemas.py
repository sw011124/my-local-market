from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models import OrderStatus, ProductStatus


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
    min_order_amount_default: Decimal | None = None
    base_delivery_fee_default: Decimal | None = None
    free_delivery_threshold_default: Decimal | None = None
    allow_reservation_days: int | None = None
