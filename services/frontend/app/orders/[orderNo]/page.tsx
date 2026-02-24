import Link from "next/link";

import OrderCancelForm from "@/components/order-cancel-form";
import { getOrder } from "@/lib/market-api";
import type { OrderResponse } from "@/lib/market-types";

type OrderDetailPageProps = {
  params: Promise<{
    orderNo: string;
  }>;
  searchParams?: Promise<{
    phone?: string;
    placed?: string;
  }>;
};

function formatPrice(value: string): string {
  return `${new Intl.NumberFormat("ko-KR").format(Number(value))}원`;
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-[#f6f6f7] px-4 py-8 text-black">
      <section className="mx-auto max-w-4xl rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-red-700">{message}</p>
        <Link href="/orders/lookup" className="mt-3 inline-block text-sm font-bold text-red-600">
          주문 조회로 이동
        </Link>
      </section>
    </main>
  );
}

function formatOrderedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    RECEIVED: "접수완료",
    PICKING: "상품 준비중",
    SUBSTITUTION_PENDING: "대체 확인 대기",
    OUT_FOR_DELIVERY: "배달중",
    DELIVERED: "배달완료",
    CANCELED: "주문취소",
  };
  return labels[status] ?? status;
}

export default async function OrderDetailPage({ params, searchParams }: OrderDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) ?? {};

  const orderNo = resolvedParams.orderNo;
  const phone = resolvedSearchParams.phone;
  const placedFlag = (resolvedSearchParams.placed ?? "").toLowerCase();
  const showPlacedMessage =
    placedFlag === "1" || placedFlag === "true" || placedFlag === "yes";

  if (!phone) {
    return <ErrorState message="휴대폰 번호가 필요합니다." />;
  }

  let order: OrderResponse | null = null;
  try {
    order = await getOrder(orderNo, phone);
  } catch {
    order = null;
  }

  if (!order) {
    return <ErrorState message="주문을 찾을 수 없습니다." />;
  }

  const canCancel = order.status === "RECEIVED";

  return (
    <main className="min-h-screen bg-[#f6f6f7] px-4 py-8 text-black">
      <section className="mx-auto max-w-5xl space-y-4">
        {showPlacedMessage && (
          <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <p className="text-sm font-black text-emerald-700">
              주문이 성공적으로 접수되었습니다.
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-700">
              진로마트를 이용해 주셔서 감사합니다. 빠르게 준비해서 배송해드릴게요.
            </p>
          </article>
        )}

        <article className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-black">주문 영수증</h1>
            <Link href="/orders/lookup" className="text-sm font-bold text-red-600">
              조회로
            </Link>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                <span className="font-semibold text-gray-500">주문번호</span>
                <strong className="font-black">{order.order_no}</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                <span className="font-semibold text-gray-500">주문시각</span>
                <strong className="font-bold">{formatOrderedAt(order.ordered_at)}</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                <span className="font-semibold text-gray-500">주문상태</span>
                <strong className="font-bold">{formatStatusLabel(order.status)}</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                <span className="font-semibold text-gray-500">결제수단</span>
                <strong className="font-bold">현장결제</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                <span className="font-semibold text-gray-500">주문자</span>
                <strong className="font-bold">{order.customer_name}</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                <span className="font-semibold text-gray-500">연락처</span>
                <strong className="font-bold">{order.customer_phone}</strong>
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100">
            <div className="bg-gray-900 px-4 py-3 text-sm font-black text-white">
              주문 상품 내역
            </div>
            <ul className="divide-y divide-gray-100 bg-white">
              {order.items.map((item) => (
                <li key={item.id} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-bold text-gray-900">{item.product_name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      수량 {item.qty_ordered}개 x {formatPrice(item.unit_price_estimated)}
                    </p>
                  </div>
                  <p className="self-center text-sm font-black text-gray-900">
                    {formatPrice(item.line_estimated)}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-gray-600">상품금액</span>
              <strong>{formatPrice(order.subtotal_estimated)}</strong>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="font-semibold text-gray-600">배송비</span>
              <strong>{formatPrice(order.delivery_fee)}</strong>
            </div>
            <div className="mt-2 flex justify-between border-t border-gray-200 pt-2">
              <span className="font-bold">총 결제예정금액</span>
              <strong className="text-lg font-black text-red-600">
                {formatPrice(order.total_estimated)}
              </strong>
            </div>
          </div>
        </article>

        <OrderCancelForm orderNo={order.order_no} phone={order.customer_phone} canCancel={canCancel} />
      </section>
    </main>
  );
}
