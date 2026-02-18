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

export default async function OrderDetailPage({ params, searchParams }: OrderDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) ?? {};

  const orderNo = resolvedParams.orderNo;
  const phone = resolvedSearchParams.phone;

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
        <article className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-black">주문 상세</h1>
            <Link href="/orders/lookup" className="text-sm font-bold text-red-600">
              조회로
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs font-semibold text-gray-500">주문번호</p>
              <p className="text-lg font-black">{order.order_no}</p>
              <p className="mt-2 text-sm font-semibold">상태: {order.status}</p>
              <p className="text-sm">주문자: {order.customer_name}</p>
              <p className="text-sm">연락처: {order.customer_phone}</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 md:min-w-72">
              <div className="flex justify-between text-sm">
                <span>상품금액</span>
                <strong>{formatPrice(order.subtotal_estimated)}</strong>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span>배송비</span>
                <strong>{formatPrice(order.delivery_fee)}</strong>
              </div>
              <div className="mt-2 flex justify-between border-t border-gray-200 pt-2">
                <span className="font-bold">예상 총액</span>
                <strong className="font-black text-red-600">{formatPrice(order.total_estimated)}</strong>
              </div>
            </div>
          </div>

          <ul className="mt-4 space-y-2 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-2">
                <span>
                  {item.product_name} x {item.qty_ordered}
                </span>
                <strong>{formatPrice(item.line_estimated)}</strong>
              </li>
            ))}
          </ul>
        </article>

        <OrderCancelForm orderNo={order.order_no} phone={order.customer_phone} canCancel={canCancel} />
      </section>
    </main>
  );
}
