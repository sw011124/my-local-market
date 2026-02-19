"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createOrder, getCart, quoteCheckout } from "@/lib/market-api";
import type { CartResponse, CheckoutQuoteResponse, CreateOrderRequest } from "@/lib/market-types";
import { ensureMarketSessionKey } from "@/lib/session-client";

function formatPrice(value: string): string {
  return `${new Intl.NumberFormat("ko-KR").format(Number(value))}원`;
}

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
  deliveryRequestNote: string;
};

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
  deliveryRequestNote: "",
};

function parseNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export default function CheckoutPage() {
  const router = useRouter();

  const [form, setForm] = useState<CheckoutForm>(INITIAL_FORM);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [quote, setQuote] = useState<CheckoutQuoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasItems = useMemo(() => (cart?.items?.length ?? 0) > 0, [cart]);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setLoading(true);
      try {
        const key = await ensureMarketSessionKey();
        const [cartData, quoteData] = await Promise.all([
          getCart(key),
          quoteCheckout({
            session_key: key,
            dong_code: form.dongCode || undefined,
            apartment_name: form.apartmentName || undefined,
            latitude: parseNumber(form.latitude),
            longitude: parseNumber(form.longitude),
            requested_slot_start: form.requestedSlot ? new Date(form.requestedSlot).toISOString() : undefined,
          }),
        ]);

        if (!mounted) {
          return;
        }

        setSessionKey(key);
        setCart(cartData);
        setQuote(quoteData);
      } catch (error) {
        if (mounted) {
          const message = error instanceof Error ? error.message : "체크아웃 데이터를 불러오지 못했습니다.";
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
  }, [form.dongCode, form.apartmentName, form.latitude, form.longitude, form.requestedSlot]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!sessionKey) {
      setErrorMessage("세션 정보를 찾을 수 없습니다. 다시 시도해 주세요.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: CreateOrderRequest = {
        session_key: sessionKey,
        customer_name: form.customerName,
        customer_phone: form.customerPhone,
        address_line1: form.addressLine1,
        address_line2: form.addressLine2 || undefined,
        building: form.building || undefined,
        unit_no: form.unitNo || undefined,
        dong_code: form.dongCode || undefined,
        apartment_name: form.apartmentName || undefined,
        latitude: parseNumber(form.latitude),
        longitude: parseNumber(form.longitude),
        requested_slot_start: form.requestedSlot ? new Date(form.requestedSlot).toISOString() : undefined,
        allow_substitution: form.allowSubstitution,
        delivery_request_note: form.deliveryRequestNote || undefined,
      };

      const order = await createOrder(payload);
      router.push(`/orders/${order.order_no}?phone=${form.customerPhone}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "주문 생성에 실패했습니다.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  function setField<K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <main className="min-h-screen bg-[#f6f6f7] px-4 py-6 text-black">
      <section className="mx-auto max-w-7xl">
        <header className="mb-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black">체크아웃</h1>
            <Link href="/cart" className="text-sm font-bold text-red-600">
              장바구니로
            </Link>
          </div>
          <p className="mt-1 text-xs text-gray-500">현장결제 기본 / 주문 전 재고와 금액이 재확인됩니다.</p>
        </header>

        {errorMessage && <p className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errorMessage}</p>}

        <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <article className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            {loading && <p className="text-sm text-gray-500">체크아웃 정보를 불러오는 중입니다...</p>}

            {!loading && !hasItems && (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                <p className="text-sm text-gray-500">주문할 상품이 없습니다.</p>
                <Link href="/products" className="mt-3 inline-block rounded-xl bg-red-600 px-4 py-2 text-sm font-extrabold text-white">
                  상품 보러가기
                </Link>
              </div>
            )}

            {!loading && hasItems && (
              <form className="grid gap-3" onSubmit={(event) => void handleSubmit(event)}>
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    required
                    value={form.customerName}
                    onChange={(event) => setField("customerName", event.target.value)}
                    placeholder="이름"
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                  />
                  <input
                    required
                    value={form.customerPhone}
                    onChange={(event) => setField("customerPhone", event.target.value)}
                    placeholder="휴대폰 번호"
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>
                <input
                  required
                  value={form.addressLine1}
                  onChange={(event) => setField("addressLine1", event.target.value)}
                  placeholder="기본 주소"
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                />
                <input
                  value={form.addressLine2}
                  onChange={(event) => setField("addressLine2", event.target.value)}
                  placeholder="상세 주소 (동/호수)"
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                />
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    value={form.building}
                    onChange={(event) => setField("building", event.target.value)}
                    placeholder="건물명"
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                  />
                  <input
                    value={form.unitNo}
                    onChange={(event) => setField("unitNo", event.target.value)}
                    placeholder="동/호수"
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    value={form.dongCode}
                    onChange={(event) => setField("dongCode", event.target.value)}
                    placeholder="행정동 코드"
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                  />
                  <input
                    value={form.apartmentName}
                    onChange={(event) => setField("apartmentName", event.target.value)}
                    placeholder="아파트명(선택)"
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    value={form.latitude}
                    onChange={(event) => setField("latitude", event.target.value)}
                    placeholder="위도(선택, 반경권역용)"
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                  />
                  <input
                    value={form.longitude}
                    onChange={(event) => setField("longitude", event.target.value)}
                    placeholder="경도(선택, 반경권역용)"
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>
                <input
                  type="datetime-local"
                  value={form.requestedSlot}
                  onChange={(event) => setField("requestedSlot", event.target.value)}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                />
                <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.allowSubstitution}
                    onChange={(event) => setField("allowSubstitution", event.target.checked)}
                  />
                  품절 시 대체상품 허용
                </label>
                <textarea
                  value={form.deliveryRequestNote}
                  onChange={(event) => setField("deliveryRequestNote", event.target.value)}
                  placeholder="배송 요청사항"
                  rows={3}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                />

                <button
                  type="submit"
                  disabled={submitting || !quote?.valid}
                  className="rounded-xl bg-red-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {submitting ? "주문 처리 중..." : "현장결제로 주문하기"}
                </button>
              </form>
            )}
          </article>

          <aside className="h-fit rounded-3xl border border-gray-100 bg-white p-5 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-lg font-black">주문 요약</h2>
            <div className="mt-3 space-y-2 text-sm">
              {(cart?.items ?? []).map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-2">
                  <span className="text-gray-700">
                    {item.product_name} x {item.qty}
                  </span>
                  <span className="font-bold">{formatPrice(item.line_total)}</span>
                </div>
              ))}
            </div>

            {quote && (
              <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm">
                <div className="flex justify-between">
                  <span>상품금액</span>
                  <strong>{formatPrice(quote.subtotal)}</strong>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>배송비</span>
                  <strong>{formatPrice(quote.delivery_fee)}</strong>
                </div>
                <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-base">
                  <span className="font-bold">예상총액</span>
                  <strong className="font-black text-red-600">{formatPrice(quote.total_estimated)}</strong>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  최소주문 {formatPrice(quote.min_order_amount)} / 무료배송 {formatPrice(quote.free_delivery_threshold)}
                </p>
              </div>
            )}

            {quote && !quote.valid && (
              <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                주문 조건을 확인해 주세요: {quote.errors.join(", ")}
              </p>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
