import Link from "next/link";

import { lookupOrder } from "@/lib/market-api";

type LookupPageProps = {
  searchParams?: Promise<{
    orderNo?: string;
    phone?: string;
  }>;
};

function formatPrice(value: string): string {
  return `${new Intl.NumberFormat("ko-KR").format(Number(value))}원`;
}

export default async function LookupPage({ searchParams }: LookupPageProps) {
  const params = (await searchParams) ?? {};

  let order = null;
  let error: string | null = null;

  if (params.orderNo && params.phone) {
    try {
      order = await lookupOrder(params.orderNo, params.phone);
    } catch {
      error = "주문번호 또는 휴대폰 정보를 확인해 주세요.";
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f6f7] px-4 py-8 text-black">
      <section className="mx-auto max-w-4xl rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-black">비회원 주문 조회</h1>
          <Link className="text-sm font-bold text-red-600" href="/">
            홈으로
          </Link>
        </div>

        <form className="grid gap-2 md:grid-cols-[1fr_1fr_auto]" method="get">
          <input
            required
            name="orderNo"
            defaultValue={params.orderNo ?? ""}
            placeholder="주문번호"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
          />
          <input
            required
            name="phone"
            defaultValue={params.phone ?? ""}
            placeholder="휴대폰 번호"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
          />
          <button type="submit" className="rounded-xl bg-red-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-red-500">
            조회
          </button>
        </form>

        {error && <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}

        {order && (
          <article className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-semibold text-gray-500">주문번호</p>
            <p className="text-lg font-black">{order.order_no}</p>
            <p className="mt-2 text-sm font-semibold">상태: {order.status}</p>
            <p className="text-sm">예상총액: {formatPrice(order.total_estimated)}</p>
            <ul className="mt-3 space-y-1 text-sm text-gray-700">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.product_name} x {item.qty_ordered}
                </li>
              ))}
            </ul>
            <Link
              href={`/orders/${order.order_no}?phone=${order.customer_phone}`}
              className="mt-3 inline-flex rounded-xl bg-red-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-red-500"
            >
              주문 상세 보기
            </Link>
          </article>
        )}
      </section>
    </main>
  );
}
