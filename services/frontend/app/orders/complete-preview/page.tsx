import Link from "next/link";
import { PackageCheck } from "lucide-react";

function formatPrice(value: number): string {
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

const PREVIEW_ORDER = {
  orderNo: "LM202602240001",
  orderedAt: "2026-02-24T14:30:00+09:00",
  status: "접수완료",
  customerName: "홍길동",
  customerPhone: "010-1234-5678",
  items: [
    { id: 1, name: "제주 감귤 1봉", qty: 2, unitPrice: 5900, lineTotal: 11800 },
    { id: 2, name: "주방세제 1L", qty: 1, unitPrice: 4200, lineTotal: 4200 },
    { id: 3, name: "냉동만두 1kg", qty: 2, unitPrice: 8900, lineTotal: 17800 },
  ],
  subtotal: 33800,
  deliveryFee: 0,
  total: 33800,
};

function formatOrderedAt(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export default function OrderCompletePreviewPage() {
  return (
    <main className="min-h-screen bg-[#f6f6f7] px-4 py-8 text-black">
      <section className="mx-auto max-w-5xl space-y-4">
        <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-5 inline-flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-b from-red-100 to-red-50 text-red-600 shadow-inner">
              <PackageCheck size={84} strokeWidth={1.8} />
            </div>
            <p className="text-4xl font-black tracking-tight text-gray-900">
              주문완료!
            </p>
            <p className="mt-3 text-xl font-semibold text-gray-700">
              예쁘게 포장해서 보내드릴게요!
            </p>
            <p className="text-xl font-semibold text-gray-700">
              조금만 기다려요 :)
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <a
                href="#order-receipt"
                className="inline-flex h-12 items-center justify-center rounded-full bg-gray-100 px-6 text-base font-extrabold text-gray-800 transition hover:bg-gray-200"
              >
                주문 상세보기
              </a>
              <Link
                href="/"
                className="inline-flex h-12 items-center justify-center rounded-full bg-gray-100 px-6 text-base font-extrabold text-gray-800 transition hover:bg-gray-200"
              >
                쇼핑 계속하기
              </Link>
            </div>
          </div>
        </article>

        <article
          id="order-receipt"
          className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-black">주문 영수증 (미리보기)</h1>
            <Link href="/" className="text-sm font-bold text-red-600">
              홈으로
            </Link>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                <span className="font-semibold text-gray-500">주문번호</span>
                <strong className="font-black">{PREVIEW_ORDER.orderNo}</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                <span className="font-semibold text-gray-500">주문시각</span>
                <strong className="font-bold">
                  {formatOrderedAt(PREVIEW_ORDER.orderedAt)}
                </strong>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                <span className="font-semibold text-gray-500">주문상태</span>
                <strong className="font-bold">{PREVIEW_ORDER.status}</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                <span className="font-semibold text-gray-500">결제수단</span>
                <strong className="font-bold">현장결제</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                <span className="font-semibold text-gray-500">주문자</span>
                <strong className="font-bold">{PREVIEW_ORDER.customerName}</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                <span className="font-semibold text-gray-500">연락처</span>
                <strong className="font-bold">{PREVIEW_ORDER.customerPhone}</strong>
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100">
            <div className="bg-gray-900 px-4 py-3 text-sm font-black text-white">
              주문 상품 내역
            </div>
            <ul className="divide-y divide-gray-100 bg-white">
              {PREVIEW_ORDER.items.map((item) => (
                <li key={item.id} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-bold text-gray-900">{item.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      수량 {item.qty}개 x {formatPrice(item.unitPrice)}
                    </p>
                  </div>
                  <p className="self-center text-sm font-black text-gray-900">
                    {formatPrice(item.lineTotal)}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-gray-600">상품금액</span>
              <strong>{formatPrice(PREVIEW_ORDER.subtotal)}</strong>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="font-semibold text-gray-600">배송비</span>
              <strong>{formatPrice(PREVIEW_ORDER.deliveryFee)}</strong>
            </div>
            <div className="mt-2 flex justify-between border-t border-gray-200 pt-2">
              <span className="font-bold">총 결제예정금액</span>
              <strong className="text-lg font-black text-red-600">
                {formatPrice(PREVIEW_ORDER.total)}
              </strong>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
