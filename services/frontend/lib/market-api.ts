import type {
  AdminBanner,
  AdminBannerCreateRequest,
  AdminCreateProductRequest,
  AdminInventoryUpdateRequest,
  AdminLoginResponse,
  AdminNotice,
  AdminNoticeCreateRequest,
  AdminOrderStatusUpdateRequest,
  AdminPolicy,
  AdminPolicyPatchRequest,
  AdminPromotion,
  AdminPromotionCreateRequest,
  AdminRefund,
  AdminRefundCreateRequest,
  AdminShortageActionRequest,
  AdminShortageActionResponse,
  CartResponse,
  CheckoutQuoteRequest,
  CheckoutQuoteResponse,
  CreateOrderRequest,
  HomeResponse,
  OrderCancelResponse,
  OrderStatus,
  OrderResponse,
  Product,
  ProductQuery,
} from "@/lib/market-types";

const SERVER_BASE_URL =
  process.env.MARKET_API_BASE_URL ??
  process.env.NEXT_PUBLIC_MARKET_API_BASE_URL ??
  "http://localhost:8000/api/v1";

const CLIENT_BASE_URL =
  process.env.NEXT_PUBLIC_MARKET_API_BASE_URL ?? "http://localhost:8000/api/v1";

function resolveBaseUrl(): string {
  return typeof window === "undefined" ? SERVER_BASE_URL : CLIENT_BASE_URL;
}

function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }
    query.set(key, String(value));
  }

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = resolveBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let detailMessage = `${response.status}`;
    try {
      const errorBody = await response.json();
      detailMessage =
        errorBody?.detail?.message ??
        errorBody?.detail?.code ??
        errorBody?.message ??
        JSON.stringify(errorBody);
    } catch {
      // Ignore parsing failures and keep status message.
    }
    throw new Error(`API request failed (${path}): ${detailMessage}`);
  }

  return (await response.json()) as T;
}

function resolveAuthHeaders(adminToken?: string): HeadersInit | undefined {
  if (!adminToken) {
    return undefined;
  }
  return {
    "X-Admin-Token": adminToken,
  };
}

export async function getHomeData(): Promise<HomeResponse> {
  return apiFetch<HomeResponse>("/public/home");
}

export async function getProducts(query: ProductQuery = {}): Promise<Product[]> {
  const queryString = buildQueryString({
    category_id: query.categoryId,
    q: query.q,
    min_price: query.minPrice,
    max_price: query.maxPrice,
    promo: query.promo,
    sort: query.sort,
  });
  return apiFetch<Product[]>(`/public/products${queryString}`);
}

export async function getProduct(productId: number): Promise<Product> {
  return apiFetch<Product>(`/public/products/${productId}`);
}

export async function getCart(sessionKey?: string): Promise<CartResponse> {
  const queryString = buildQueryString({ session_key: sessionKey });
  return apiFetch<CartResponse>(`/cart${queryString}`);
}

export async function addCartItem(sessionKey: string, productId: number, qty: number): Promise<CartResponse> {
  const queryString = buildQueryString({ session_key: sessionKey });
  return apiFetch<CartResponse>(`/cart/items${queryString}`, {
    method: "POST",
    body: JSON.stringify({ product_id: productId, qty }),
  });
}

export async function updateCartItem(sessionKey: string, itemId: number, qty: number): Promise<CartResponse> {
  const queryString = buildQueryString({ session_key: sessionKey });
  return apiFetch<CartResponse>(`/cart/items/${itemId}${queryString}`, {
    method: "PATCH",
    body: JSON.stringify({ qty }),
  });
}

export async function deleteCartItem(sessionKey: string, itemId: number): Promise<CartResponse> {
  const queryString = buildQueryString({ session_key: sessionKey });
  return apiFetch<CartResponse>(`/cart/items/${itemId}${queryString}`, {
    method: "DELETE",
  });
}

export async function quoteCheckout(payload: CheckoutQuoteRequest): Promise<CheckoutQuoteResponse> {
  return apiFetch<CheckoutQuoteResponse>("/checkout/quote", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createOrder(payload: CreateOrderRequest): Promise<OrderResponse> {
  return apiFetch<OrderResponse>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function lookupOrder(orderNo: string, phone: string): Promise<OrderResponse> {
  const queryString = buildQueryString({ order_no: orderNo, phone });
  return apiFetch<OrderResponse>(`/orders/lookup${queryString}`);
}

export async function getOrder(orderNo: string, phone: string): Promise<OrderResponse> {
  const queryString = buildQueryString({ phone });
  return apiFetch<OrderResponse>(`/orders/${orderNo}${queryString}`);
}

export async function cancelOrder(orderNo: string, phone: string, reason: string): Promise<OrderCancelResponse> {
  const queryString = buildQueryString({ phone });
  return apiFetch<OrderCancelResponse>(`/orders/${orderNo}/cancel-requests${queryString}`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function adminLogin(username: string, password: string): Promise<AdminLoginResponse> {
  return apiFetch<AdminLoginResponse>("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function getAdminOrders(adminToken: string, status?: OrderStatus): Promise<OrderResponse[]> {
  const queryString = buildQueryString({ status });
  return apiFetch<OrderResponse[]>(`/admin/orders${queryString}`, {
    headers: resolveAuthHeaders(adminToken),
  });
}

export async function getAdminOrder(adminToken: string, orderId: number): Promise<OrderResponse> {
  return apiFetch<OrderResponse>(`/admin/orders/${orderId}`, {
    headers: resolveAuthHeaders(adminToken),
  });
}

export async function updateAdminOrderStatus(
  adminToken: string,
  orderId: number,
  payload: AdminOrderStatusUpdateRequest,
): Promise<OrderResponse> {
  return apiFetch<OrderResponse>(`/admin/orders/${orderId}/status`, {
    method: "PATCH",
    headers: resolveAuthHeaders(adminToken),
    body: JSON.stringify(payload),
  });
}

export async function applyAdminShortageAction(
  adminToken: string,
  orderId: number,
  payload: AdminShortageActionRequest,
): Promise<AdminShortageActionResponse> {
  return apiFetch<AdminShortageActionResponse>(`/admin/orders/${orderId}/shortage-actions`, {
    method: "POST",
    headers: resolveAuthHeaders(adminToken),
    body: JSON.stringify(payload),
  });
}

export async function getAdminRefunds(adminToken: string, orderId: number): Promise<AdminRefund[]> {
  return apiFetch<AdminRefund[]>(`/admin/orders/${orderId}/refunds`, {
    headers: resolveAuthHeaders(adminToken),
  });
}

export async function createAdminRefund(
  adminToken: string,
  orderId: number,
  payload: AdminRefundCreateRequest,
): Promise<AdminRefund> {
  return apiFetch<AdminRefund>(`/admin/orders/${orderId}/refunds`, {
    method: "POST",
    headers: resolveAuthHeaders(adminToken),
    body: JSON.stringify(payload),
  });
}

export async function getAdminProducts(adminToken: string): Promise<Product[]> {
  return apiFetch<Product[]>("/admin/products", {
    headers: resolveAuthHeaders(adminToken),
  });
}

export async function createAdminProduct(adminToken: string, payload: AdminCreateProductRequest): Promise<Product> {
  return apiFetch<Product>("/admin/products", {
    method: "POST",
    headers: resolveAuthHeaders(adminToken),
    body: JSON.stringify(payload),
  });
}

export async function updateAdminInventory(
  adminToken: string,
  productId: number,
  payload: AdminInventoryUpdateRequest,
): Promise<Product> {
  return apiFetch<Product>(`/admin/products/${productId}/inventory`, {
    method: "PATCH",
    headers: resolveAuthHeaders(adminToken),
    body: JSON.stringify(payload),
  });
}

export async function getAdminPromotions(adminToken: string): Promise<AdminPromotion[]> {
  return apiFetch<AdminPromotion[]>("/admin/promotions", {
    headers: resolveAuthHeaders(adminToken),
  });
}

export async function createAdminPromotion(
  adminToken: string,
  payload: AdminPromotionCreateRequest,
): Promise<AdminPromotion> {
  return apiFetch<AdminPromotion>("/admin/promotions", {
    method: "POST",
    headers: resolveAuthHeaders(adminToken),
    body: JSON.stringify(payload),
  });
}

export async function getAdminBanners(adminToken: string): Promise<AdminBanner[]> {
  return apiFetch<AdminBanner[]>("/admin/banners", {
    headers: resolveAuthHeaders(adminToken),
  });
}

export async function createAdminBanner(adminToken: string, payload: AdminBannerCreateRequest): Promise<AdminBanner> {
  return apiFetch<AdminBanner>("/admin/banners", {
    method: "POST",
    headers: resolveAuthHeaders(adminToken),
    body: JSON.stringify(payload),
  });
}

export async function getAdminNotices(adminToken: string): Promise<AdminNotice[]> {
  return apiFetch<AdminNotice[]>("/admin/notices", {
    headers: resolveAuthHeaders(adminToken),
  });
}

export async function createAdminNotice(adminToken: string, payload: AdminNoticeCreateRequest): Promise<AdminNotice> {
  return apiFetch<AdminNotice>("/admin/notices", {
    method: "POST",
    headers: resolveAuthHeaders(adminToken),
    body: JSON.stringify(payload),
  });
}

export async function getAdminPolicy(adminToken: string): Promise<AdminPolicy> {
  return apiFetch<AdminPolicy>("/admin/policies", {
    headers: resolveAuthHeaders(adminToken),
  });
}

export async function patchAdminPolicy(
  adminToken: string,
  payload: AdminPolicyPatchRequest,
): Promise<AdminPolicy> {
  return apiFetch<AdminPolicy>("/admin/policies", {
    method: "PATCH",
    headers: resolveAuthHeaders(adminToken),
    body: JSON.stringify(payload),
  });
}
