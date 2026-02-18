export type ProductStatus = "ACTIVE" | "SOLD_OUT" | "PAUSED";

export type Category = {
  id: number;
  name: string;
  display_order: number;
};

export type Product = {
  id: number;
  category_id: number | null;
  category_name: string | null;
  name: string;
  sku: string;
  description: string | null;
  unit_label: string;
  origin_country: string | null;
  storage_method: string | null;
  is_weight_item: boolean;
  base_price: string;
  sale_price: string | null;
  effective_price: string;
  status: ProductStatus;
  stock_qty: number;
  max_per_order: number;
};

export type Promotion = {
  id: number;
  title: string;
  promo_type: string;
  start_at: string;
  end_at: string;
  is_active: boolean;
};

export type Notice = {
  id: number;
  title: string;
  start_at: string;
  end_at: string;
};

export type HomeResponse = {
  categories: Category[];
  featured_products: Product[];
  promotions: Promotion[];
  notices: Notice[];
};

export type CartItem = {
  id: number;
  product_id: number;
  product_name: string;
  qty: number;
  unit_price: string;
  line_total: string;
  stock_qty: number;
  is_weight_item: boolean;
};

export type CartResponse = {
  session_key: string;
  items: CartItem[];
  subtotal: string;
};

export type CheckoutQuoteResponse = {
  valid: boolean;
  errors: string[];
  subtotal: string;
  delivery_fee: string;
  total_estimated: string;
  min_order_amount: string;
  free_delivery_threshold: string;
};

export type ProductQuery = {
  categoryId?: number;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  promo?: boolean;
  sort?: "popular" | "new" | "priceAsc" | "priceDesc";
};

export type CheckoutQuoteRequest = {
  session_key: string;
  dong_code?: string;
  apartment_name?: string;
  latitude?: number;
  longitude?: number;
  requested_slot_start?: string;
};

export type CreateOrderRequest = {
  session_key: string;
  customer_name: string;
  customer_phone: string;
  address_line1: string;
  address_line2?: string;
  building?: string;
  unit_no?: string;
  dong_code?: string;
  apartment_name?: string;
  latitude?: number;
  longitude?: number;
  requested_slot_start?: string;
  allow_substitution?: boolean;
  delivery_request_note?: string;
};

export type OrderItem = {
  id: number;
  product_id: number;
  product_name: string;
  qty_ordered: number;
  qty_fulfilled: number;
  unit_price_estimated: string;
  line_estimated: string;
  is_weight_item: boolean;
};

export type OrderResponse = {
  id: number;
  order_no: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  subtotal_estimated: string;
  delivery_fee: string;
  total_estimated: string;
  total_final: string | null;
  allow_substitution: boolean;
  ordered_at: string;
  requested_slot_start: string | null;
  items: OrderItem[];
};

export type OrderCancelResponse = {
  ok: boolean;
  order_no: string;
  status: string;
};

export type OrderStatus = "RECEIVED" | "PICKING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELED";

export type AdminLoginResponse = {
  access_token: string;
  token_type: string;
  role: string;
};

export type AdminOrderStatusUpdateRequest = {
  status: OrderStatus;
  reason?: string;
};

export type AdminShortageAction = "SUBSTITUTE" | "PARTIAL_CANCEL" | "OUT_OF_STOCK";

export type AdminShortageActionRequest = {
  order_item_id: number;
  action: AdminShortageAction;
  fulfilled_qty?: number;
  substitution_product_id?: number;
  substitution_qty?: number;
  reason?: string;
};

export type AdminRefund = {
  id: number;
  order_id: number;
  amount: string;
  reason: string;
  method: string;
  status: string;
  processed_at: string;
  processed_by: string | null;
};

export type AdminRefundCreateRequest = {
  amount: string;
  reason: string;
  method?: string;
};

export type AdminShortageActionResponse = {
  order: OrderResponse;
  refund: AdminRefund | null;
};

export type AdminPromotion = {
  id: number;
  title: string;
  promo_type: string;
  start_at: string;
  end_at: string;
  is_active: boolean;
  banner_image_url: string | null;
  product_ids: number[];
  promo_price: string | null;
};

export type AdminPromotionCreateRequest = {
  title: string;
  promo_type: string;
  start_at: string;
  end_at: string;
  is_active: boolean;
  banner_image_url?: string | null;
  product_ids: number[];
  promo_price?: string | null;
};

export type AdminBanner = {
  id: number;
  title: string;
  image_url: string;
  link_type: string;
  link_target: string | null;
  display_order: number;
  is_active: boolean;
  start_at: string;
  end_at: string;
};

export type AdminBannerCreateRequest = {
  title: string;
  image_url: string;
  link_type: string;
  link_target?: string | null;
  display_order: number;
  is_active: boolean;
  start_at: string;
  end_at: string;
};

export type AdminNotice = {
  id: number;
  title: string;
  body: string;
  start_at: string;
  end_at: string;
  is_pinned: boolean;
  is_active: boolean;
};

export type AdminNoticeCreateRequest = {
  title: string;
  body: string;
  start_at: string;
  end_at: string;
  is_pinned: boolean;
  is_active: boolean;
};

export type AdminPolicy = {
  open_time: string;
  close_time: string;
  same_day_cutoff_time: string;
  min_order_amount_default: string;
  base_delivery_fee_default: string;
  free_delivery_threshold_default: string;
  allow_reservation_days: number;
};

export type AdminPolicyPatchRequest = {
  min_order_amount_default?: string;
  base_delivery_fee_default?: string;
  free_delivery_threshold_default?: string;
  allow_reservation_days?: number;
};

export type AdminCreateProductRequest = {
  category_id?: number | null;
  name: string;
  sku: string;
  description?: string;
  unit_label?: string;
  origin_country?: string;
  storage_method?: string;
  is_weight_item?: boolean;
  base_price: string;
  sale_price?: string | null;
  stock_qty?: number;
  max_per_order?: number;
};

export type AdminInventoryUpdateRequest = {
  stock_qty: number;
  max_per_order: number;
};
