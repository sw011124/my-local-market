import type {
  AdminBanner,
  AdminBannerCreateRequest,
  AdminCreateProductRequest,
  AdminDeleteDeliveryZoneResponse,
  AdminDeleteHolidayResponse,
  AdminDeleteProductResponse,
  AdminDeliveryZone,
  AdminDeliveryZoneCreateRequest,
  AdminDeliveryZonePatchRequest,
  AdminHoliday,
  AdminHolidayCreateRequest,
  AdminHolidayPatchRequest,
  AdminInventoryUpdateRequest,
  AdminPickingListResponse,
  AdminLoginResponse,
  AdminNotice,
  AdminNoticeCreateRequest,
  AdminOrderRefundSummary,
  AdminOrderStatusLog,
  AdminOrderStatusUpdateRequest,
  AdminPolicy,
  AdminPolicyPatchRequest,
  AdminPromotion,
  AdminPromotionCreateRequest,
  AdminRefund,
  AdminRefundCreateRequest,
  AdminShortageActionRequest,
  AdminShortageActionResponse,
  AdminUpdateProductRequest,
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
  SavedAddress,
  SavedAddressCreateRequest,
  SavedAddressDeleteResponse,
  SavedAddressPatchRequest,
  UserAddress,
  UserAddressCreateRequest,
  UserAddressPatchRequest,
  UserAuthResponse,
  UserLoginRequest,
  UserLogoutRequest,
  UserMe,
  UserRefreshRequest,
  UserSignupRequest,
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

export class ApiError extends Error {
  readonly status: number;
  readonly path: string;
  readonly payload: unknown;

  constructor(path: string, status: number, message: string, payload: unknown) {
    super(`API request failed (${path}): ${message}`);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
    this.payload = payload;
  }
}

function extractErrorMessage(errorBody: unknown, status: number): string {
  if (!errorBody || typeof errorBody !== "object") {
    return String(status);
  }

  const root = errorBody as {
    message?: unknown;
    detail?: unknown;
  };
  const detail = root.detail;

  if (detail && typeof detail === "object") {
    const detailObject = detail as {
      message?: unknown;
      code?: unknown;
      errors?: unknown;
    };
    const detailMessage = typeof detailObject.message === "string" ? detailObject.message : undefined;
    const detailCode = typeof detailObject.code === "string" ? detailObject.code : undefined;
    const detailErrors = Array.isArray(detailObject.errors)
      ? detailObject.errors.filter((value): value is string => typeof value === "string")
      : [];

    if (detailMessage && detailErrors.length) {
      return `${detailMessage}: ${detailErrors.join(", ")}`;
    }
    if (detailMessage) {
      return detailMessage;
    }
    if (detailCode && detailErrors.length) {
      return `${detailCode}: ${detailErrors.join(", ")}`;
    }
    if (detailCode) {
      return detailCode;
    }
    if (detailErrors.length) {
      return detailErrors.join(", ");
    }
  }

  if (typeof detail === "string") {
    return detail;
  }

  if (typeof root.message === "string") {
    return root.message;
  }

  return JSON.stringify(errorBody);
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
    let errorBody: unknown = null;
    try {
      errorBody = await response.json();
      detailMessage = extractErrorMessage(errorBody, response.status);
    } catch {
      // Ignore parsing failures and keep status message.
    }
    throw new ApiError(path, response.status, detailMessage, errorBody);
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

function resolveUserAuthHeaders(accessToken?: string): HeadersInit | undefined {
  if (!accessToken) {
    return undefined;
  }
  return {
    Authorization: `Bearer ${accessToken}`,
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

export async function getCart(sessionKey?: string, accessToken?: string): Promise<CartResponse> {
  const queryString = buildQueryString({ session_key: sessionKey });
  return apiFetch<CartResponse>(`/cart${queryString}`, {
    headers: resolveUserAuthHeaders(accessToken),
  });
}

export async function addCartItem(
  sessionKey: string,
  productId: number,
  qty: number,
  accessToken?: string,
): Promise<CartResponse> {
  const queryString = buildQueryString({ session_key: sessionKey });
  return apiFetch<CartResponse>(`/cart/items${queryString}`, {
    method: "POST",
    headers: resolveUserAuthHeaders(accessToken),
    body: JSON.stringify({ product_id: productId, qty }),
  });
}

export async function updateCartItem(
  sessionKey: string,
  itemId: number,
  qty: number,
  accessToken?: string,
): Promise<CartResponse> {
  const queryString = buildQueryString({ session_key: sessionKey });
  return apiFetch<CartResponse>(`/cart/items/${itemId}${queryString}`, {
    method: "PATCH",
    headers: resolveUserAuthHeaders(accessToken),
    body: JSON.stringify({ qty }),
  });
}

export async function deleteCartItem(
  sessionKey: string,
  itemId: number,
  accessToken?: string,
): Promise<CartResponse> {
  const queryString = buildQueryString({ session_key: sessionKey });
  return apiFetch<CartResponse>(`/cart/items/${itemId}${queryString}`, {
    method: "DELETE",
    headers: resolveUserAuthHeaders(accessToken),
  });
}

export async function quoteCheckout(
  payload: CheckoutQuoteRequest,
  accessToken?: string,
): Promise<CheckoutQuoteResponse> {
  return apiFetch<CheckoutQuoteResponse>("/checkout/quote", {
    method: "POST",
    headers: resolveUserAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function getSavedAddresses(sessionKey: string): Promise<SavedAddress[]> {
  const queryString = buildQueryString({ session_key: sessionKey });
  return apiFetch<SavedAddress[]>(`/addresses${queryString}`);
}

export async function createSavedAddress(
  sessionKey: string,
  payload: SavedAddressCreateRequest,
): Promise<SavedAddress> {
  const queryString = buildQueryString({ session_key: sessionKey });
  return apiFetch<SavedAddress>(`/addresses${queryString}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSavedAddress(
  sessionKey: string,
  addressId: number,
  payload: SavedAddressPatchRequest,
): Promise<SavedAddress> {
  const queryString = buildQueryString({ session_key: sessionKey });
  return apiFetch<SavedAddress>(`/addresses/${addressId}${queryString}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteSavedAddress(sessionKey: string, addressId: number): Promise<SavedAddressDeleteResponse> {
  const queryString = buildQueryString({ session_key: sessionKey });
  return apiFetch<SavedAddressDeleteResponse>(`/addresses/${addressId}${queryString}`, {
    method: "DELETE",
  });
}

export async function createOrder(payload: CreateOrderRequest, accessToken?: string): Promise<OrderResponse> {
  return apiFetch<OrderResponse>("/orders", {
    method: "POST",
    headers: resolveUserAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function lookupOrder(
  orderNo: string,
  phone: string | undefined,
  accessToken?: string,
): Promise<OrderResponse> {
  const queryString = buildQueryString({ order_no: orderNo, phone });
  return apiFetch<OrderResponse>(`/orders/lookup${queryString}`, {
    headers: resolveUserAuthHeaders(accessToken),
  });
}

export async function getOrder(
  orderNo: string,
  phone: string | undefined,
  accessToken?: string,
): Promise<OrderResponse> {
  const queryString = buildQueryString({ phone });
  return apiFetch<OrderResponse>(`/orders/${orderNo}${queryString}`, {
    headers: resolveUserAuthHeaders(accessToken),
  });
}

export async function cancelOrder(
  orderNo: string,
  phone: string | undefined,
  reason: string,
  accessToken?: string,
): Promise<OrderCancelResponse> {
  const queryString = buildQueryString({ phone });
  return apiFetch<OrderCancelResponse>(`/orders/${orderNo}/cancel-requests${queryString}`, {
    method: "POST",
    headers: resolveUserAuthHeaders(accessToken),
    body: JSON.stringify({ reason }),
  });
}

export async function signupUser(payload: UserSignupRequest): Promise<UserAuthResponse> {
  return apiFetch<UserAuthResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload: UserLoginRequest): Promise<UserAuthResponse> {
  return apiFetch<UserAuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function refreshUserToken(payload: UserRefreshRequest): Promise<UserAuthResponse> {
  return apiFetch<UserAuthResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function logoutUser(payload: UserLogoutRequest): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/auth/logout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMyProfile(accessToken: string): Promise<UserMe> {
  return apiFetch<UserMe>("/auth/me", {
    headers: resolveUserAuthHeaders(accessToken),
  });
}

export async function getMyAddresses(accessToken: string): Promise<UserAddress[]> {
  return apiFetch<UserAddress[]>("/me/addresses", {
    headers: resolveUserAuthHeaders(accessToken),
  });
}

export async function createMyAddress(
  accessToken: string,
  payload: UserAddressCreateRequest,
): Promise<UserAddress> {
  return apiFetch<UserAddress>("/me/addresses", {
    method: "POST",
    headers: resolveUserAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function patchMyAddress(
  accessToken: string,
  addressId: number,
  payload: UserAddressPatchRequest,
): Promise<UserAddress> {
  return apiFetch<UserAddress>(`/me/addresses/${addressId}`, {
    method: "PATCH",
    headers: resolveUserAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function deleteMyAddress(
  accessToken: string,
  addressId: number,
): Promise<{ ok: boolean; address_id: number }> {
  return apiFetch<{ ok: boolean; address_id: number }>(`/me/addresses/${addressId}`, {
    method: "DELETE",
    headers: resolveUserAuthHeaders(accessToken),
  });
}

export async function getMyOrders(accessToken: string): Promise<OrderResponse[]> {
  return apiFetch<OrderResponse[]>("/me/orders", {
    headers: resolveUserAuthHeaders(accessToken),
  });
}

export async function getMyOrder(accessToken: string, orderNo: string): Promise<OrderResponse> {
  return apiFetch<OrderResponse>(`/me/orders/${orderNo}`, {
    headers: resolveUserAuthHeaders(accessToken),
  });
}

export async function cancelMyOrder(
  accessToken: string,
  orderNo: string,
  reason: string,
): Promise<OrderCancelResponse> {
  return apiFetch<OrderCancelResponse>(`/me/orders/${orderNo}/cancel-requests`, {
    method: "POST",
    headers: resolveUserAuthHeaders(accessToken),
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

export async function getAdminOrderStatusLogs(
  adminToken: string,
  orderId: number,
): Promise<AdminOrderStatusLog[]> {
  return apiFetch<AdminOrderStatusLog[]>(`/admin/orders/${orderId}/status-logs`, {
    headers: resolveAuthHeaders(adminToken),
  });
}

export async function getAdminOrderRefundSummary(
  adminToken: string,
  orderId: number,
): Promise<AdminOrderRefundSummary> {
  return apiFetch<AdminOrderRefundSummary>(`/admin/orders/${orderId}/refund-summary`, {
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

export async function updateAdminProduct(
  adminToken: string,
  productId: number,
  payload: AdminUpdateProductRequest,
): Promise<Product> {
  return apiFetch<Product>(`/admin/products/${productId}`, {
    method: "PATCH",
    headers: resolveAuthHeaders(adminToken),
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminProduct(adminToken: string, productId: number): Promise<AdminDeleteProductResponse> {
  return apiFetch<AdminDeleteProductResponse>(`/admin/products/${productId}`, {
    method: "DELETE",
    headers: resolveAuthHeaders(adminToken),
  });
}

export async function getAdminPickingList(
  adminToken: string,
  params: {
    statuses?: string;
    keyword?: string;
  } = {},
): Promise<AdminPickingListResponse> {
  const queryString = buildQueryString({
    statuses: params.statuses,
    keyword: params.keyword,
  });
  return apiFetch<AdminPickingListResponse>(`/admin/picking-list${queryString}`, {
    headers: resolveAuthHeaders(adminToken),
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

export async function getAdminDeliveryZones(adminToken: string): Promise<AdminDeliveryZone[]> {
  return apiFetch<AdminDeliveryZone[]>("/admin/delivery-zones", {
    headers: resolveAuthHeaders(adminToken),
  });
}

export async function createAdminDeliveryZone(
  adminToken: string,
  payload: AdminDeliveryZoneCreateRequest,
): Promise<AdminDeliveryZone> {
  return apiFetch<AdminDeliveryZone>("/admin/delivery-zones", {
    method: "POST",
    headers: resolveAuthHeaders(adminToken),
    body: JSON.stringify(payload),
  });
}

export async function patchAdminDeliveryZone(
  adminToken: string,
  zoneId: number,
  payload: AdminDeliveryZonePatchRequest,
): Promise<AdminDeliveryZone> {
  return apiFetch<AdminDeliveryZone>(`/admin/delivery-zones/${zoneId}`, {
    method: "PATCH",
    headers: resolveAuthHeaders(adminToken),
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminDeliveryZone(
  adminToken: string,
  zoneId: number,
): Promise<AdminDeleteDeliveryZoneResponse> {
  return apiFetch<AdminDeleteDeliveryZoneResponse>(`/admin/delivery-zones/${zoneId}`, {
    method: "DELETE",
    headers: resolveAuthHeaders(adminToken),
  });
}

export async function getAdminHolidays(adminToken: string): Promise<AdminHoliday[]> {
  return apiFetch<AdminHoliday[]>("/admin/holidays", {
    headers: resolveAuthHeaders(adminToken),
  });
}

export async function createAdminHoliday(
  adminToken: string,
  payload: AdminHolidayCreateRequest,
): Promise<AdminHoliday> {
  return apiFetch<AdminHoliday>("/admin/holidays", {
    method: "POST",
    headers: resolveAuthHeaders(adminToken),
    body: JSON.stringify(payload),
  });
}

export async function patchAdminHoliday(
  adminToken: string,
  holidayId: number,
  payload: AdminHolidayPatchRequest,
): Promise<AdminHoliday> {
  return apiFetch<AdminHoliday>(`/admin/holidays/${holidayId}`, {
    method: "PATCH",
    headers: resolveAuthHeaders(adminToken),
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminHoliday(
  adminToken: string,
  holidayId: number,
): Promise<AdminDeleteHolidayResponse> {
  return apiFetch<AdminDeleteHolidayResponse>(`/admin/holidays/${holidayId}`, {
    method: "DELETE",
    headers: resolveAuthHeaders(adminToken),
  });
}
