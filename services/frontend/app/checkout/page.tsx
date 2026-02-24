"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  CircleCheck,
  CircleHelp,
  Home,
  Info,
  RefreshCw,
} from "lucide-react";

import { trackEvent } from "@/lib/analytics";
import { buildCartSummary } from "@/lib/cart-summary";
import { emitCartSummaryUpdated } from "@/lib/cart-events";
import {
  type DeliveryMemoType,
  DELIVERY_MEMO_OPTIONS,
  getDefaultDeliveryMemoNote,
  loadCheckoutDeliveryProfile,
  saveCheckoutDeliveryProfile,
} from "@/lib/checkout-delivery-profile";
import {
  formatKrw,
  getDeliveryThresholdState,
  toKrwNumber,
} from "@/lib/delivery-policy";
import {
  ApiError,
  createOrder,
  getCart,
  getSavedAddresses,
  quoteCheckout,
} from "@/lib/market-api";
import type {
  CartItem,
  CartResponse,
  CheckoutQuoteRequest,
  CheckoutQuoteResponse,
  CreateOrderRequest,
} from "@/lib/market-types";
import { ensureMarketSessionKey } from "@/lib/session-client";

type PaymentMethodId = "CARD" | "EASY_PAY" | "BANK_TRANSFER" | "ON_SITE";
type PayBlockedReason =
  | "under_minimum"
  | "no_address"
  | "out_of_stock"
  | "terms_missing"
  | "payment_method_missing"
  | "delivery_unavailable"
  | "store_closed"
  | "checkout_invalid"
  | "network_error";

type CheckoutToast = {
  tone: "success" | "error" | "info";
  message: string;
};

type PaymentMethodOption = {
  id: PaymentMethodId;
  label: string;
  description: string;
  caution: string;
  enabled: boolean;
  badge?: string;
};

type TermItem = {
  id: string;
  label: string;
  summary: string;
};

type CheckoutForm = {
  customerName: string;
  customerPhone: string;
  addressLine1: string;
  addressLine2: string;
  building: string;
  unitNo: string;
  dongCode: string;
  apartmentName: string;
  latitude: string;
  longitude: string;
  requestedSlot: string;
  allowSubstitution: boolean;
  deliveryMemoType: DeliveryMemoType;
  deliveryRequestNote: string;
};

const PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
  {
    id: "CARD",
    label: "카드결제",
    description: "신용/체크카드 온라인 결제",
    caution: "카드결제는 준비중입니다.",
    enabled: false,
    badge: "준비중",
  },
  {
    id: "EASY_PAY",
    label: "간편결제",
    description: "네이버페이/카카오페이 등 간편결제",
    caution: "간편결제 연동 준비중입니다.",
    enabled: false,
    badge: "준비중",
  },
  {
    id: "BANK_TRANSFER",
    label: "계좌이체",
    description: "실시간 계좌이체",
    caution: "계좌이체는 준비중입니다.",
    enabled: false,
    badge: "준비중",
  },
  {
    id: "ON_SITE",
    label: "현장결제",
    description: "상품 수령 시 결제",
    caution: "현장결제는 현금영수증을 현장에서 요청해 주세요.",
    enabled: true,
  },
];

const REQUIRED_TERMS: TermItem[] = [
  {
    id: "order_confirmation",
    label: "주문 내용 확인 및 결제 진행 동의 (필수)",
    summary: "주문 상품/수량/금액을 확인하고 결제를 진행합니다.",
  },
  {
    id: "payment_delegate",
    label: "개인정보 제3자 제공 및 결제대행 동의 (필수)",
    summary: "배송 및 결제 처리를 위해 필요한 정보 제공에 동의합니다.",
  },
];

const OPTIONAL_TERMS: TermItem[] = [
  {
    id: "marketing",
    label: "혜택/이벤트 알림 수신 (선택)",
    summary: "할인 및 이벤트 소식을 문자로 받아봅니다.",
  },
];

const INITIAL_FORM: CheckoutForm = {
  customerName: "",
  customerPhone: "",
  addressLine1: "",
  addressLine2: "",
  building: "",
  unitNo: "",
  dongCode: "1535011000",
  apartmentName: "",
  latitude: "",
  longitude: "",
  requestedSlot: "",
  allowSubstitution: false,
  deliveryMemoType: "door",
  deliveryRequestNote: getDefaultDeliveryMemoNote("door"),
};

const STOCK_ERROR_CODES = new Set([
  "OUT_OF_STOCK",
  "INSUFFICIENT_STOCK",
  "MAX_QTY_EXCEEDED",
]);
const DELIVERY_ERROR_CODES = new Set([
  "OUT_OF_DELIVERY_ZONE",
  "HOLIDAY_CLOSED",
  "STORE_CLOSED",
  "CUTOFF_PASSED",
  "SLOT_UNAVAILABLE",
]);
const STORE_CLOSED_CODES = new Set([
  "HOLIDAY_CLOSED",
  "STORE_CLOSED",
  "CUTOFF_PASSED",
  "SLOT_UNAVAILABLE",
]);

const CHECKOUT_ERROR_MESSAGES: Record<string, string> = {
  HOLIDAY_CLOSED: "선택한 날짜는 휴무일이라 주문이 불가합니다.",
  STORE_CLOSED: "현재 영업시간이 아닙니다.",
  CUTOFF_PASSED: "당일 주문 마감시간이 지났습니다.",
  SLOT_UNAVAILABLE: "선택한 배송시간은 예약이 불가합니다.",
  OUT_OF_DELIVERY_ZONE: "현재 주소는 배송 가능 지역이 아닙니다.",
  INVALID_REQUEST: "요청 정보가 올바르지 않습니다.",
  OUT_OF_STOCK: "장바구니 상품 중 품절 상품이 있습니다.",
  MAX_QTY_EXCEEDED: "일부 상품이 최대 구매 수량을 초과했습니다.",
  INSUFFICIENT_STOCK: "장바구니 상품 재고가 부족합니다.",
  MIN_ORDER_NOT_MET: "최소 주문금액을 충족하지 못했습니다.",
};

function parseNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function formatPrice(value: string | number): string {
  return formatKrw(toKrwNumber(value));
}

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
  return phone || "연락처 미입력";
}

function normalizeErrorCodes(codes: string[]): string[] {
  return Array.from(
    new Set(codes.filter((value) => /^[A-Z_]+$/.test(value))),
  );
}

function mapCheckoutErrorMessage(code: string): string {
  return CHECKOUT_ERROR_MESSAGES[code] ?? "주문 조건을 다시 확인해 주세요.";
}

function extractCheckoutErrorCodes(error: ApiError): string[] {
  const payload = error.payload;

  if (payload && typeof payload === "object") {
    const detail = (payload as { detail?: unknown }).detail;
    if (detail && typeof detail === "object") {
      const detailObject = detail as { code?: unknown; errors?: unknown };
      if (Array.isArray(detailObject.errors)) {
        const errors = detailObject.errors.filter(
          (value): value is string => typeof value === "string",
        );
        return normalizeErrorCodes(errors);
      }
      if (
        typeof detailObject.code === "string" &&
        detailObject.code !== "CHECKOUT_INVALID"
      ) {
        return normalizeErrorCodes([detailObject.code]);
      }
    }
  }

  const matched = error.message.match(/[A-Z_]{3,}/g) ?? [];
  return normalizeErrorCodes(
    matched.filter((value) => value in CHECKOUT_ERROR_MESSAGES),
  );
}

function buildQuotePayload(
  currentSessionKey: string,
  dongCode: string,
  apartmentName: string,
  latitude: string,
  longitude: string,
  requestedSlot: string,
): CheckoutQuoteRequest {
  return {
    session_key: currentSessionKey,
    dong_code: dongCode || undefined,
    apartment_name: apartmentName || undefined,
    latitude: parseNumber(latitude),
    longitude: parseNumber(longitude),
    requested_slot_start: requestedSlot
      ? new Date(requestedSlot).toISOString()
      : undefined,
  };
}

function getPrimaryItemLabel(items: CartItem[]): string {
  if (!items.length) {
    return "주문 상품이 없습니다.";
  }

  const [first, ...rest] = items;
  if (!first) {
    return "주문 상품이 없습니다.";
  }
  if (!rest.length) {
    return first.product_name;
  }
  return `${first.product_name} 외 ${rest.length}개`;
}

function isNetworkError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("failed to fetch") ||
    normalized.includes("network") ||
    normalized.includes("timeout")
  );
}

function mapErrorCodesToBlockedReason(codes: string[]): PayBlockedReason {
  if (codes.includes("MIN_ORDER_NOT_MET")) {
    return "under_minimum";
  }
  if (codes.includes("OUT_OF_DELIVERY_ZONE")) {
    return "delivery_unavailable";
  }
  if (codes.some((code) => STORE_CLOSED_CODES.has(code))) {
    return "store_closed";
  }
  if (codes.some((code) => STOCK_ERROR_CODES.has(code))) {
    return "out_of_stock";
  }
  return "checkout_invalid";
}

function toastClassName(tone: CheckoutToast["tone"]): string {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (tone === "error") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-gray-200 bg-gray-50 text-gray-700";
}

function CheckoutLoadingSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-3">
        <div className="h-40 animate-pulse rounded-2xl border border-gray-100 bg-gray-100" />
        <div className="h-36 animate-pulse rounded-2xl border border-gray-100 bg-gray-100" />
        <div className="h-40 animate-pulse rounded-2xl border border-gray-100 bg-gray-100" />
      </div>
      <div className="hidden h-72 animate-pulse rounded-2xl border border-gray-100 bg-gray-100 lg:block" />
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const checkoutViewTrackedRef = useRef(false);
  const addressSectionRef = useRef<HTMLElement | null>(null);
  const paymentSectionRef = useRef<HTMLElement | null>(null);
  const termsSectionRef = useRef<HTMLElement | null>(null);

  const [form, setForm] = useState<CheckoutForm>(INITIAL_FORM);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [quote, setQuote] = useState<CheckoutQuoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitErrorCodes, setSubmitErrorCodes] = useState<string[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethodId | null>(null);
  const [requiredTerms, setRequiredTerms] = useState<string[]>([]);
  const [optionalTerms, setOptionalTerms] = useState<string[]>([]);
  const [paymentSelectionError, setPaymentSelectionError] = useState<
    string | null
  >(null);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [toast, setToast] = useState<CheckoutToast | null>(null);
  const [slowNetworkHint, setSlowNetworkHint] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const cartItems = useMemo(() => cart?.items ?? [], [cart?.items]);
  const itemCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.qty, 0),
    [cartItems],
  );
  const hasItems = itemCount > 0;
  const hasDeliveryAddress = form.addressLine1.trim().length > 0;
  const subtotal = useMemo(
    () => toKrwNumber(quote?.subtotal ?? cart?.subtotal),
    [quote?.subtotal, cart?.subtotal],
  );
  const deliveryFee = 0;
  const finalPaymentAmount = useMemo(
    () => toKrwNumber(quote?.total_estimated ?? subtotal),
    [quote?.total_estimated, subtotal],
  );
  const discountAmount = useMemo(
    () => Math.max(0, subtotal - finalPaymentAmount),
    [finalPaymentAmount, subtotal],
  );
  const deliveryState = useMemo(
    () => getDeliveryThresholdState(subtotal),
    [subtotal],
  );
  const deliveryEligible = deliveryState.eligible;
  const primaryItemLabel = useMemo(
    () => getPrimaryItemLabel(cartItems),
    [cartItems],
  );

  const checkoutErrorCodes = useMemo(() => {
    if (submitErrorCodes.length > 0) {
      return normalizeErrorCodes(submitErrorCodes);
    }
    if (quote && !quote.valid) {
      return normalizeErrorCodes(quote.errors);
    }
    return [];
  }, [quote, submitErrorCodes]);

  const checkoutErrorMessages = useMemo(
    () =>
      checkoutErrorCodes.map(
        (code) => `${mapCheckoutErrorMessage(code)} (${code})`,
      ),
    [checkoutErrorCodes],
  );

  const hasStockBlockingError = checkoutErrorCodes.some((code) =>
    STOCK_ERROR_CODES.has(code),
  );
  const hasDeliveryBlockingError = checkoutErrorCodes.some((code) =>
    DELIVERY_ERROR_CODES.has(code),
  );
  const hasOutOfDeliveryZoneError =
    checkoutErrorCodes.includes("OUT_OF_DELIVERY_ZONE");
  const hasStoreClosedError = checkoutErrorCodes.some((code) =>
    STORE_CLOSED_CODES.has(code),
  );

  const allRequiredTermsChecked = useMemo(
    () => REQUIRED_TERMS.every((term) => requiredTerms.includes(term.id)),
    [requiredTerms],
  );
  const allTermsChecked = useMemo(
    () =>
      allRequiredTermsChecked &&
      OPTIONAL_TERMS.every((term) => optionalTerms.includes(term.id)),
    [allRequiredTermsChecked, optionalTerms],
  );

  const selectedPaymentMeta = useMemo(
    () =>
      PAYMENT_METHOD_OPTIONS.find(
        (method) => method.id === selectedPaymentMethod,
      ) ?? null,
    [selectedPaymentMethod],
  );

  const canSubmitButton = !loading && !submitting && hasItems;
  const isCheckoutReady = useMemo(
    () =>
      hasDeliveryAddress &&
      Boolean(form.customerName.trim()) &&
      Boolean(form.customerPhone.trim()) &&
      !hasOutOfDeliveryZoneError &&
      !hasStoreClosedError &&
      !hasStockBlockingError &&
      deliveryEligible &&
      Boolean(selectedPaymentMethod) &&
      allRequiredTermsChecked &&
      quote?.valid === true,
    [
      allRequiredTermsChecked,
      deliveryEligible,
      form.customerName,
      form.customerPhone,
      hasDeliveryAddress,
      hasOutOfDeliveryZoneError,
      hasStockBlockingError,
      hasStoreClosedError,
      quote?.valid,
      selectedPaymentMethod,
    ],
  );

  const ctaSupportMessage = useMemo(() => {
    if (!hasDeliveryAddress) {
      return "배송지를 등록하면 결제를 진행할 수 있습니다.";
    }
    if (!form.customerName.trim() || !form.customerPhone.trim()) {
      return "배송지 정보에서 수령인 이름/연락처를 등록해 주세요.";
    }
    if (!deliveryEligible) {
      return `3만원까지 ${formatKrw(deliveryState.remaining)} 더 담아주세요.`;
    }
    if (hasOutOfDeliveryZoneError) {
      return "현재 주소는 배달 가능 지역이 아닙니다.";
    }
    if (hasStoreClosedError) {
      return "영업 종료 또는 배달 마감 상태입니다.";
    }
    if (hasStockBlockingError) {
      return "재고 변동 상품을 확인한 뒤 다시 결제해 주세요.";
    }
    if (!selectedPaymentMethod) {
      return "결제수단을 선택해 주세요.";
    }
    if (!allRequiredTermsChecked) {
      return "필수 약관 동의가 필요합니다.";
    }
    return "결제 직전에 재고/가격을 다시 검증합니다.";
  }, [
    allRequiredTermsChecked,
    deliveryEligible,
    deliveryState.remaining,
    form.customerName,
    form.customerPhone,
    hasDeliveryAddress,
    hasOutOfDeliveryZoneError,
    hasStockBlockingError,
    hasStoreClosedError,
    selectedPaymentMethod,
  ]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => {
      setToast(null);
    }, 3200);
    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  useEffect(() => {
    const profile = loadCheckoutDeliveryProfile();
    setForm((prev) => ({
      ...prev,
      ...profile,
    }));
  }, []);

  useEffect(() => {
    saveCheckoutDeliveryProfile({
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      addressLine1: form.addressLine1,
      addressLine2: form.addressLine2,
      building: form.building,
      unitNo: form.unitNo,
      dongCode: form.dongCode,
      apartmentName: form.apartmentName,
      latitude: form.latitude,
      longitude: form.longitude,
      deliveryMemoType: form.deliveryMemoType,
      deliveryRequestNote: form.deliveryRequestNote,
    });
  }, [form]);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const key = await ensureMarketSessionKey();
        const [cartData, addresses] = await Promise.all([getCart(key), getSavedAddresses(key)]);

        if (!mounted) {
          return;
        }

        setSessionKey(key);
        setCart(cartData);
        setSubmitErrorCodes([]);
        emitCartSummaryUpdated(buildCartSummary(cartData));

        const defaultAddress = addresses.find((address) => address.is_default) ?? addresses[0] ?? null;
        if (defaultAddress) {
          setForm((prev) => ({
            ...prev,
            customerName: prev.customerName || defaultAddress.recipient_name || "",
            customerPhone: prev.customerPhone || defaultAddress.phone || "",
            addressLine1: prev.addressLine1 || defaultAddress.address_line1,
            addressLine2: prev.addressLine2 || defaultAddress.address_line2 || "",
            building: prev.building || defaultAddress.building || "",
            unitNo: prev.unitNo || defaultAddress.unit_no || "",
            dongCode: defaultAddress.dong_code || prev.dongCode || "1535011000",
            apartmentName: prev.apartmentName || defaultAddress.apartment_name || "",
            latitude: prev.latitude || defaultAddress.latitude || "",
            longitude: prev.longitude || defaultAddress.longitude || "",
          }));
        }

        if (!checkoutViewTrackedRef.current) {
          trackEvent("checkout_view", {
            item_count: cartData.items.reduce((sum, item) => sum + item.qty, 0),
            subtotal: toKrwNumber(cartData.subtotal),
          });
          checkoutViewTrackedRef.current = true;
        }
      } catch (error) {
        if (mounted) {
          const message =
            error instanceof Error
              ? error.message
              : "주문/결제 데이터를 불러오지 못했습니다.";
          setErrorMessage(message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, [reloadToken]);

  useEffect(() => {
    if (!sessionKey) {
      return;
    }
    const currentSessionKey = sessionKey;

    let mounted = true;
    async function refreshQuote() {
      try {
        const quoteData = await quoteCheckout(
          buildQuotePayload(
            currentSessionKey,
            form.dongCode,
            form.apartmentName,
            form.latitude,
            form.longitude,
            form.requestedSlot,
          ),
        );
        if (!mounted) {
          return;
        }
        setQuote(quoteData);
      } catch (error) {
        if (!mounted) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "배송 조건을 불러오지 못했습니다.";
        setErrorMessage(message);
      }
    }

    void refreshQuote();
    return () => {
      mounted = false;
    };
  }, [
    sessionKey,
    form.apartmentName,
    form.dongCode,
    form.latitude,
    form.longitude,
    form.requestedSlot,
  ]);

  useEffect(() => {
    if (quote?.valid) {
      setSubmitErrorCodes([]);
    }
  }, [quote?.valid]);

  function pushToast(tone: CheckoutToast["tone"], message: string): void {
    setToast({ tone, message });
  }

  function scrollToSection(section: React.RefObject<HTMLElement | null>): void {
    section.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleGoBack(): void {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/cart");
  }

  function goToAddressSelector(source: "change" | "add"): void {
    trackEvent("address_change_click", { source, route: "selector" });
    router.push("/checkout/address");
  }

  function goToNewAddressPage(source: "add" | "selector"): void {
    trackEvent("address_change_click", { source, route: "new" });
    router.push("/checkout/address/new");
  }

  function handleDeliveryMemoTypeChange(nextMemoType: DeliveryMemoType): void {
    setForm((prev) => ({
      ...prev,
      deliveryMemoType: nextMemoType,
      deliveryRequestNote: getDefaultDeliveryMemoNote(nextMemoType),
    }));
  }

  function reloadCheckout(): void {
    setReloadToken((prev) => prev + 1);
  }

  function handlePaymentMethodSelect(method: PaymentMethodOption): void {
    if (!method.enabled) {
      return;
    }

    setSelectedPaymentMethod(method.id);
    setPaymentSelectionError(null);
    trackEvent("payment_method_selected", { method: method.id });
  }

  function handleRequiredTermToggle(termId: string): void {
    const isChecked = requiredTerms.includes(termId);
    const nextTerms = isChecked
      ? requiredTerms.filter((id) => id !== termId)
      : [...requiredTerms, termId];
    setRequiredTerms(nextTerms);
    setTermsError(null);
    trackEvent("terms_checked", {
      term_id: termId,
      checked: !isChecked,
      required: true,
    });
  }

  function handleOptionalTermToggle(termId: string): void {
    const isChecked = optionalTerms.includes(termId);
    const nextTerms = isChecked
      ? optionalTerms.filter((id) => id !== termId)
      : [...optionalTerms, termId];
    setOptionalTerms(nextTerms);
    trackEvent("terms_checked", {
      term_id: termId,
      checked: !isChecked,
      required: false,
    });
  }

  function handleAllTermsToggle(): void {
    const nextChecked = !allTermsChecked;
    setRequiredTerms(nextChecked ? REQUIRED_TERMS.map((term) => term.id) : []);
    setOptionalTerms(nextChecked ? OPTIONAL_TERMS.map((term) => term.id) : []);
    setTermsError(null);
    trackEvent("terms_checked", {
      term_id: "all",
      checked: nextChecked,
      required: false,
    });
  }

  function resolvePayBlockedReason(): PayBlockedReason | null {
    if (!hasDeliveryAddress || !form.customerName.trim() || !form.customerPhone.trim()) {
      return "no_address";
    }
    if (hasOutOfDeliveryZoneError) {
      return "delivery_unavailable";
    }
    if (hasStoreClosedError) {
      return "store_closed";
    }
    if (hasStockBlockingError) {
      return "out_of_stock";
    }
    if (!deliveryEligible) {
      return "under_minimum";
    }
    if (!selectedPaymentMethod) {
      return "payment_method_missing";
    }
    if (!allRequiredTermsChecked) {
      return "terms_missing";
    }
    if (!quote?.valid) {
      return "checkout_invalid";
    }
    return null;
  }

  function handleBlockedReason(reason: PayBlockedReason): void {
    if (reason === "payment_method_missing") {
      setPaymentSelectionError("결제수단을 선택해 주세요.");
      scrollToSection(paymentSectionRef);
      pushToast("info", "결제수단을 선택해야 결제를 진행할 수 있습니다.");
      return;
    }

    if (reason === "terms_missing") {
      setTermsError("필수 약관 동의가 필요합니다.");
      scrollToSection(termsSectionRef);
      pushToast("info", "필수 약관 동의 후 결제를 진행해 주세요.");
      return;
    }

    if (reason === "no_address") {
      scrollToSection(addressSectionRef);
      pushToast("error", "배송지 정보에서 주소와 수령인 정보를 먼저 등록해 주세요.");
      return;
    }

    if (reason === "under_minimum") {
      pushToast(
        "info",
        `3만원까지 ${formatKrw(deliveryState.remaining)} 더 담아야 주문할 수 있습니다.`,
      );
      return;
    }

    if (reason === "delivery_unavailable" || reason === "store_closed") {
      scrollToSection(addressSectionRef);
      pushToast("error", "현재 배송 조건으로는 결제가 불가합니다.");
      return;
    }

    if (reason === "out_of_stock") {
      scrollToSection(addressSectionRef);
      pushToast("error", "품절/재고 부족 상품이 있어 결제가 차단되었습니다.");
      return;
    }

    if (reason === "checkout_invalid") {
      pushToast("error", "주문 조건을 확인한 후 다시 결제를 시도해 주세요.");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!sessionKey) {
      setErrorMessage("세션 정보를 찾을 수 없습니다. 새로고침 후 다시 시도해 주세요.");
      return;
    }

    setErrorMessage(null);
    setSubmitErrorCodes([]);
    setPaymentSelectionError(null);
    setTermsError(null);

    trackEvent("pay_click", {
      item_count: itemCount,
      amount: finalPaymentAmount,
      payment_method: selectedPaymentMethod ?? "UNSELECTED",
    });

    const blockedReason = resolvePayBlockedReason();
    if (blockedReason) {
      trackEvent("pay_blocked", { reason: blockedReason });
      handleBlockedReason(blockedReason);
      return;
    }

    setSubmitting(true);
    setSlowNetworkHint(false);
    const slowTimer = window.setTimeout(() => {
      setSlowNetworkHint(true);
    }, 1200);

    try {
      const refreshedQuote = await quoteCheckout(
        buildQuotePayload(
          sessionKey,
          form.dongCode,
          form.apartmentName,
          form.latitude,
          form.longitude,
          form.requestedSlot,
        ),
      );
      setQuote(refreshedQuote);

      if (!refreshedQuote.valid) {
        const codes = normalizeErrorCodes(refreshedQuote.errors);
        setSubmitErrorCodes(codes);
        setErrorMessage(
          "결제 직전에 장바구니 조건이 변경되었습니다. 내용을 확인한 뒤 다시 결제해 주세요.",
        );
        const reason = mapErrorCodesToBlockedReason(codes);
        trackEvent("pay_blocked", { reason });
        handleBlockedReason(reason);
        return;
      }

      const totalsChanged =
        quote !== null &&
        (quote.subtotal !== refreshedQuote.subtotal ||
          quote.total_estimated !== refreshedQuote.total_estimated);

      if (totalsChanged) {
        const confirmed = window.confirm(
          `결제 직전 금액이 변경되었습니다.\n기존: ${formatPrice(
            quote.total_estimated,
          )}\n변경: ${formatPrice(refreshedQuote.total_estimated)}\n변경된 금액으로 결제를 진행할까요?`,
        );
        if (!confirmed) {
          pushToast("info", "변경된 금액을 확인하고 다시 결제를 진행해 주세요.");
          return;
        }
      }

      const payload: CreateOrderRequest = {
        session_key: sessionKey,
        customer_name: form.customerName.trim(),
        customer_phone: form.customerPhone.trim(),
        address_line1: form.addressLine1.trim(),
        address_line2: form.addressLine2.trim() || undefined,
        building: form.building || undefined,
        unit_no: form.addressLine2 || form.unitNo || undefined,
        dong_code: form.dongCode || undefined,
        apartment_name: form.apartmentName || undefined,
        latitude: parseNumber(form.latitude),
        longitude: parseNumber(form.longitude),
        requested_slot_start: form.requestedSlot
          ? new Date(form.requestedSlot).toISOString()
          : undefined,
        allow_substitution: false,
        delivery_request_note: form.deliveryRequestNote.trim() || undefined,
      };

      const order = await createOrder(payload);
      trackEvent("pay_success", {
        order_no: order.order_no,
        payment_method: selectedPaymentMethod,
        amount: toKrwNumber(order.total_estimated),
      });
      router.push(
        `/orders/${order.order_no}?phone=${form.customerPhone.trim()}&placed=1`,
      );
    } catch (error) {
      if (error instanceof ApiError) {
        let codes = extractCheckoutErrorCodes(error);
        if (!codes.length) {
          try {
            const latestQuote = await quoteCheckout(
              buildQuotePayload(
                sessionKey,
                form.dongCode,
                form.apartmentName,
                form.latitude,
                form.longitude,
                form.requestedSlot,
              ),
            );
            setQuote(latestQuote);
            if (!latestQuote.valid) {
              codes = normalizeErrorCodes(latestQuote.errors);
            }
          } catch {
            // Quote 재요청 실패 시 API 에러 메시지를 그대로 사용한다.
          }
        }

        if (codes.length > 0) {
          const reason = mapErrorCodesToBlockedReason(codes);
          setSubmitErrorCodes(codes);
          setErrorMessage(
            "주문 조건이 변경되어 결제가 완료되지 않았습니다. 아래 상태를 확인해 주세요.",
          );
          trackEvent("pay_blocked", { reason });
        } else {
          setErrorMessage(error.message);
        }

        trackEvent("pay_fail", {
          reason: codes[0] ?? error.message,
          payment_method: selectedPaymentMethod ?? "UNSELECTED",
        });

        if (isNetworkError(error.message)) {
          pushToast("error", "네트워크 연결이 불안정합니다. 재시도해 주세요.");
        } else {
          pushToast("error", "결제 처리 중 문제가 발생했습니다.");
        }
      } else {
        const fallbackMessage =
          error instanceof Error ? error.message : "결제 처리에 실패했습니다.";
        setErrorMessage(fallbackMessage);
        trackEvent("pay_fail", {
          reason: fallbackMessage,
          payment_method: selectedPaymentMethod ?? "UNSELECTED",
        });
        pushToast("error", "결제를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      window.clearTimeout(slowTimer);
      setSubmitting(false);
      setSlowNetworkHint(false);
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 pb-[calc(190px+env(safe-area-inset-bottom))] pt-2 text-black">
      <header className="mx-auto mb-1 flex max-w-7xl items-center justify-between border-b border-gray-200 py-2">
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex h-10 w-10 items-center justify-center text-gray-700 transition hover:text-red-600"
            aria-label="뒤로가기"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-center text-[22px] font-bold tracking-tight text-gray-900">
            주문/결제
          </h1>
          <div className="flex items-center gap-1">
            <Link
              href="/cart"
              className="inline-flex h-10 items-center justify-center rounded-md border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            >
              장바구니
            </Link>
            <Link
              href="/"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 text-gray-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
              aria-label="홈"
            >
              <Home size={18} />
            </Link>
          </div>
      </header>

      <section className="mx-auto max-w-7xl">

        {toast ? (
          <div
            className={`mb-3 rounded-xl border px-3 py-2 text-sm font-semibold ${toastClassName(
              toast.tone,
            )}`}
            role="status"
            aria-live="polite"
          >
            {toast.message}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 shrink-0" size={16} />
              <div className="min-w-0">
                <p className="font-semibold">{errorMessage}</p>
                <p className="mt-1 text-xs">
                  네트워크 오류가 계속되면 연결 상태를 확인한 뒤 재시도해 주세요.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={reloadCheckout}
              className="mt-2 inline-flex h-10 items-center justify-center rounded-lg border border-red-300 bg-white px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100"
            >
              <RefreshCw className="mr-1.5" size={14} />
              다시 불러오기
            </button>
          </div>
        ) : null}

        {loading ? <CheckoutLoadingSkeleton /> : null}

        {!loading && !hasItems ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
            <p className="text-sm font-semibold text-gray-700">
              주문할 상품이 없습니다.
            </p>
            <Link
              href="/products"
              className="mt-3 inline-flex h-11 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-500"
            >
              상품 보러가기
            </Link>
          </div>
        ) : null}

        {!loading && hasItems ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <form
              id="checkout-form"
              onSubmit={(event) => void handleSubmit(event)}
              className="space-y-5"
            >
              <section
                ref={addressSectionRef}
                aria-labelledby="checkout-address-title"
                className="pt-4"
              >
                <h2
                  id="checkout-address-title"
                  className="ml-[5px] text-lg font-bold text-gray-900"
                >
                  배송지
                </h2>

                {hasDeliveryAddress ? (
                  <div className="mt-2 rounded-2xl border border-gray-200 bg-white px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-base font-bold leading-5 text-gray-900">
                        {form.customerName || "수령인 미입력"}
                      </p>
                      <button
                        type="button"
                        onClick={() => goToAddressSelector("change")}
                        className="inline-flex h-[30px] items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                      >
                        변경
                      </button>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-700">
                      <span className="font-medium">
                        {formatPhoneDisplay(form.customerPhone)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <CircleCheck size={13} className="text-gray-400" />
                        안심번호 사용
                        <CircleHelp size={12} className="text-gray-400" />
                      </span>
                    </div>

                    <div className="mt-3 border-t border-gray-200" />

                    <div className="mt-3 space-y-1">
                      <p className="text-sm font-semibold leading-5 text-gray-900">
                        {form.addressLine1}
                      </p>
                      <p className="text-sm font-semibold leading-5 text-gray-900">
                        {form.addressLine2.trim() || "상세주소 없음"}
                      </p>
                    </div>

                    <div className="relative mt-3">
                      <select
                        value={form.deliveryMemoType}
                        onChange={(event) =>
                          handleDeliveryMemoTypeChange(
                            event.target.value as DeliveryMemoType,
                          )
                        }
                        className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 pr-9 text-sm text-gray-700 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                      >
                        {DELIVERY_MEMO_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.id === "custom"
                              ? "배송메모를 선택해주세요"
                              : option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                      />
                    </div>

                    <div className="mt-3 inline-flex items-center gap-1 text-sm text-gray-700">
                      <CircleCheck size={14} className="text-gray-400" />
                      다음에도 사용할게요
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-3">
                    <p className="text-sm font-semibold text-gray-700">
                      배송지가 설정되지 않았습니다.
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      결제를 위해 배송지 정보 등록이 필요합니다.
                    </p>
                    <button
                      type="button"
                      onClick={() => goToNewAddressPage("add")}
                      className="mt-2 inline-flex h-11 items-center justify-center rounded-lg bg-gray-900 px-3 text-sm font-semibold text-white transition hover:bg-red-600"
                    >
                      신규 배송지 추가 +
                    </button>
                  </div>
                )}

                {hasOutOfDeliveryZoneError ? (
                  <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-3">
                    <p className="text-sm font-semibold text-red-700">
                      배달 불가 지역입니다.
                    </p>
                    <p className="mt-1 text-xs text-red-700">
                      현재 주소는 배달 가능 범위를 벗어났습니다. 픽업 문의 또는 오픈
                      알림을 이용해 주세요.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a
                        href="tel:0310000000"
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-red-300 bg-white px-3 text-xs font-semibold text-red-700"
                      >
                        픽업 문의
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          pushToast(
                            "info",
                            "오픈 알림 기능은 추후 업데이트로 제공됩니다.",
                          )
                        }
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-red-300 bg-white px-3 text-xs font-semibold text-red-700"
                      >
                        오픈 알림
                      </button>
                    </div>
                  </div>
                ) : null}

                {hasStoreClosedError ? (
                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
                    <p className="text-sm font-semibold text-amber-700">
                      영업 종료 또는 배달 마감 상태입니다.
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      다음 영업 시간에 다시 결제를 진행해 주세요.
                    </p>
                  </div>
                ) : null}
              </section>

              <section
                aria-labelledby="checkout-items-title"
                className="pt-4"
              >
                <div>
                  <h2
                    id="checkout-items-title"
                    className="ml-[5px] text-lg font-bold text-gray-900"
                  >
                    주문 상품
                  </h2>
                  <p className="ml-[5px] mt-0.5 text-xs text-gray-600">
                    총 {itemCount}개 상품
                  </p>
                </div>

                <div id="checkout-order-items" className="mt-3 space-y-3">
                  {cartItems.map((item) => {
                    const stockBlocked =
                      item.stock_qty <= 0 || item.qty > item.stock_qty;

                    return (
                      <article
                        key={item.id}
                        className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3"
                      >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-lg font-bold text-gray-500">
                          {item.product_name.slice(0, 1)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {item.product_name}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            옵션: 기본 · 수량 {item.qty}개
                          </p>
                          <div className="mt-1 flex items-center justify-between">
                            <p className="text-sm font-bold text-gray-900">
                              {formatPrice(item.line_total)}
                            </p>
                            {stockBlocked ? (
                              <span className="text-xs font-semibold text-red-600">
                                재고 부족
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-emerald-600">
                                주문 가능
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {hasStockBlockingError ? (
                  <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    품절 또는 재고 부족 상품이 있어 결제를 진행할 수 없습니다.
                  </p>
                ) : null}
              </section>

              <section className="pt-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="ml-[5px] text-lg font-bold text-gray-900">
                      할인/포인트
                    </h2>
                    <Info className="text-gray-500" size={15} />
                  </div>
                  <p className="ml-[5px] mt-0.5 text-xs text-gray-600">
                    포인트/쿠폰은 준비중입니다. 현재는 주문 안정화를 위해 일반 결제만
                    제공하고 있습니다.
                  </p>
                </div>
                <div className="mt-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-3">
                  <p className="text-sm font-semibold text-gray-600">
                    포인트/쿠폰 기능 준비중
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    기능 오픈 시 자동으로 이 섹션이 활성화됩니다.
                  </p>
                </div>
              </section>

              <section
                ref={paymentSectionRef}
                aria-labelledby="checkout-payment-title"
                className="pt-4"
              >
                <h2
                  id="checkout-payment-title"
                  className="ml-[5px] text-lg font-bold text-gray-900"
                >
                  결제 수단
                </h2>
                <p className="ml-[5px] mt-0.5 text-xs text-gray-600">
                  결제 수단 1개를 선택해 주세요.
                </p>

                <div
                  className={`mt-2 rounded-2xl border bg-white px-3 py-3 ${
                    paymentSelectionError ? "border-red-300" : "border-gray-200"
                  }`}
                >
                  <div className="space-y-3">
                    {PAYMENT_METHOD_OPTIONS.map((method) => (
                      <label
                        key={method.id}
                        className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition ${
                          selectedPaymentMethod === method.id
                            ? "border-red-400 bg-red-50"
                            : "border-gray-200 bg-white"
                        } ${
                          method.enabled
                            ? "hover:border-red-300"
                            : "cursor-not-allowed opacity-65"
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment-method"
                          value={method.id}
                          checked={selectedPaymentMethod === method.id}
                          disabled={!method.enabled}
                          onChange={() => handlePaymentMethodSelect(method)}
                          className="mt-1 h-4 w-4 accent-red-600"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">
                              {method.label}
                            </p>
                            {method.badge ? (
                              <span className="bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
                                {method.badge}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-xs text-gray-600">
                            {method.description}
                          </p>
                          {selectedPaymentMethod === method.id ? (
                            <p className="mt-1 text-[11px] text-gray-500">
                              {method.caution}
                            </p>
                          ) : null}
                        </div>
                      </label>
                    ))}
                  </div>

                  {paymentSelectionError ? (
                    <p className="mt-2 text-xs font-semibold text-red-600">
                      {paymentSelectionError}
                    </p>
                  ) : null}
                </div>
              </section>

              <section
                aria-labelledby="checkout-amount-title"
                className="pt-4"
              >
                <div className="rounded-2xl border border-gray-200 bg-white px-3 py-3">
                <h2
                  id="checkout-amount-title"
                  className="ml-[5px] text-lg font-bold text-gray-900"
                >
                  결제 금액
                </h2>

                <dl className="mt-3 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-gray-600">상품금액</dt>
                    <dd className="text-right font-semibold text-gray-900">
                      {formatKrw(subtotal)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-gray-600">배송비</dt>
                    <dd className="text-right font-semibold text-gray-900">
                      {formatKrw(deliveryFee)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-gray-600">할인</dt>
                    <dd
                      className={`text-right font-semibold ${
                        discountAmount > 0 ? "text-red-600" : "text-gray-900"
                      }`}
                    >
                      {discountAmount > 0 ? `-${formatKrw(discountAmount)}` : "0원"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-gray-200 pt-2">
                    <dt className="text-base font-bold text-gray-900">
                      최종 결제금액
                    </dt>
                    <dd className="text-right text-lg font-black text-red-600">
                      {formatKrw(finalPaymentAmount)}
                    </dd>
                  </div>
                </dl>

                <p className="mt-2 text-xs text-gray-500">
                  3만원 이상 배달 가능(배송비 0원)
                </p>
                {!deliveryEligible ? (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-xs font-semibold text-amber-700">
                      배달까지 {formatKrw(deliveryState.remaining)} 더 담아야 합니다.
                    </p>
                    <Link
                      href="/cart"
                      onClick={() =>
                        trackEvent("topup_click", {
                          remaining_to_delivery: deliveryState.remaining,
                        })
                      }
                      className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-amber-300 bg-white px-2 text-[11px] font-semibold text-amber-700"
                    >
                      더 담기
                    </Link>
                  </div>
                ) : null}
                </div>
              </section>

              <section
                ref={termsSectionRef}
                aria-labelledby="checkout-terms-title"
                className="pt-4"
              >
                <div
                  className={`rounded-2xl border bg-white px-3 py-3 ${
                    termsError ? "border-red-300" : "border-gray-200"
                  }`}
                >
                <h2
                  id="checkout-terms-title"
                  className="ml-[5px] text-lg font-bold text-gray-900"
                >
                  약관/동의
                </h2>

                <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900">
                  <input
                    type="checkbox"
                    checked={allTermsChecked}
                    onChange={handleAllTermsToggle}
                    className="h-4 w-4 accent-red-600"
                  />
                  전체 동의
                </label>

                <div className="mt-3 space-y-3">
                  {REQUIRED_TERMS.map((term) => (
                    <div
                      key={term.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2"
                    >
                      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-gray-800">
                        <input
                          type="checkbox"
                          checked={requiredTerms.includes(term.id)}
                          onChange={() => handleRequiredTermToggle(term.id)}
                          className="h-4 w-4 accent-red-600"
                        />
                        <span>{term.label}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => pushToast("info", term.summary)}
                        className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 px-2 text-[11px] font-semibold text-gray-700"
                      >
                        상세보기
                      </button>
                    </div>
                  ))}

                  {OPTIONAL_TERMS.map((term) => (
                    <div
                      key={term.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2"
                    >
                      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-gray-800">
                        <input
                          type="checkbox"
                          checked={optionalTerms.includes(term.id)}
                          onChange={() => handleOptionalTermToggle(term.id)}
                          className="h-4 w-4 accent-red-600"
                        />
                        <span>{term.label}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => pushToast("info", term.summary)}
                        className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 px-2 text-[11px] font-semibold text-gray-700"
                      >
                        상세보기
                      </button>
                    </div>
                  ))}
                </div>

                {termsError ? (
                  <p className="mt-2 text-xs font-semibold text-red-600">
                    {termsError}
                  </p>
                ) : null}
                </div>
              </section>

              {checkoutErrorMessages.length > 0 ? (
                <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <p className="font-semibold">주문 조건을 확인해 주세요.</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
                    {checkoutErrorMessages.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </form>

            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-4 pt-4">
                <section className="rounded-2xl border border-gray-200 bg-white p-4">
                  <h3 className="ml-[5px] text-lg font-bold text-gray-900">결제 요약</h3>
                  <p className="ml-[5px] mt-1 text-xs text-gray-600">
                    총 {itemCount}개 상품 · {primaryItemLabel}
                  </p>

                  <div className="mt-3 space-y-3 border-t border-gray-100 pt-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">상품금액</span>
                      <strong>{formatKrw(subtotal)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">배송비</span>
                      <strong>{formatKrw(deliveryFee)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">할인</span>
                      <strong className={discountAmount > 0 ? "text-red-600" : ""}>
                        {discountAmount > 0 ? `-${formatKrw(discountAmount)}` : "0원"}
                      </strong>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-2 text-base">
                      <span className="font-bold">최종 결제금액</span>
                      <strong className="font-black text-red-600">
                        {formatKrw(finalPaymentAmount)}
                      </strong>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    3만원 이상 배달 가능(배송비 0원)
                  </p>
                  {selectedPaymentMeta ? (
                    <p className="mt-1 text-xs text-gray-500">
                      선택 결제수단: {selectedPaymentMeta.label}
                    </p>
                  ) : null}
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-4">
                  <h3 className="ml-[5px] text-lg font-bold text-gray-900">진행 상태</h3>
                  <p className="ml-[5px] mt-1 text-xs text-gray-600">{ctaSupportMessage}</p>
                  {hasDeliveryBlockingError ? (
                    <p className="mt-2 text-xs font-semibold text-red-600">
                      배송 조건이 충족되지 않아 결제가 제한됩니다.
                    </p>
                  ) : null}
                </section>
              </div>
            </aside>
          </div>
        ) : null}
      </section>

      {hasItems ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <div className="mb-2 flex items-center justify-between px-1 py-1">
              <p className="text-sm font-semibold text-gray-700">결제금액</p>
              <div className="min-w-0 flex items-center justify-end gap-2">
                {discountAmount > 0 ? (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                    {formatKrw(discountAmount)} 할인
                  </span>
                ) : null}
                <p className="text-right text-lg font-black text-gray-900">
                  {formatKrw(finalPaymentAmount)}
                </p>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={!canSubmitButton}
              className="inline-flex h-14 w-full items-center justify-center rounded-xl bg-red-600 px-4 text-base font-extrabold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              결제하기
            </button>
            {!isCheckoutReady ? (
              <p className="mt-2 truncate text-center text-xs font-medium text-gray-500">
                {ctaSupportMessage}
              </p>
            ) : null}
          </div>
          {slowNetworkHint ? (
            <p className="pb-2 text-center text-xs font-semibold text-amber-700">
              네트워크가 느립니다. 10초 이상 지연되면 다시 시도해 주세요.
            </p>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
