import Link from "next/link";

import { getProduct } from "@/lib/market-api";
import type { Product } from "@/lib/market-types";

type ProductDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatPrice(value: string): string {
  return `${new Intl.NumberFormat("ko-KR").format(Number(value))}원`;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const resolvedParams = await params;
  const productId = Number(resolvedParams.id);

  if (!Number.isInteger(productId) || productId <= 0) {
    return (
      <main className="min-h-screen bg-[#f6f4ef] text-[#1a2f27] px-4 py-8">
        <section className="mx-auto max-w-3xl rounded-3xl border border-[#d8ddd3] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-[#8e3a30]">유효하지 않은 상품입니다.</p>
          <Link href="/products" className="mt-3 inline-block text-sm font-bold text-[#166847]">
            상품 목록으로
          </Link>
        </section>
      </main>
    );
  }

  let product: Product | null = null;
  try {
    product = await getProduct(productId);
  } catch {
    product = null;
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-[#f6f4ef] text-[#1a2f27] px-4 py-8">
        <section className="mx-auto max-w-3xl rounded-3xl border border-[#d8ddd3] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-[#8e3a30]">상품 정보를 불러오지 못했습니다.</p>
          <Link href="/products" className="mt-3 inline-block text-sm font-bold text-[#166847]">
            상품 목록으로
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#1a2f27] px-4 py-8">
      <section className="mx-auto max-w-4xl rounded-3xl border border-[#d8ddd3] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold text-[#6a7e74]">{product.category_name ?? "기타"}</p>
          <Link href="/products" className="text-sm font-bold text-[#166847]">
            목록으로
          </Link>
        </div>

        <h1 className="text-2xl font-black">{product.name}</h1>
        <p className="mt-2 text-sm text-[#5a6c64]">{product.description ?? "상품 설명이 준비 중입니다."}</p>

        <div className="mt-5 grid gap-3 rounded-2xl border border-[#d8ddd3] bg-[#f9fcfa] p-4 md:grid-cols-2">
          <div>
            <p className="text-xs text-[#6a7e74]">판매가</p>
            <p className="text-2xl font-black text-[#145c3f]">{formatPrice(product.effective_price)}</p>
            {product.sale_price && <p className="text-xs font-semibold text-[#b06f21]">행사 적용가</p>}
          </div>
          <div className="grid gap-1 text-sm text-[#334b42]">
            <p>단위: {product.unit_label}</p>
            <p>재고 상태: {product.stock_qty > 0 ? `재고 ${product.stock_qty}` : "품절"}</p>
            <p>원산지: {product.origin_country ?? "별도표기"}</p>
            <p>보관방법: {product.storage_method ?? "상품 라벨 참조"}</p>
          </div>
        </div>

        {product.is_weight_item && (
          <p className="mt-3 rounded-xl bg-[#fff7eb] px-3 py-2 text-xs font-semibold text-[#945f1e]">
            중량 상품은 예상 금액으로 결제 예약되며, 실제 중량 기준으로 최종 정산됩니다.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={`/cart?addProductId=${product.id}&qty=1`}
            className="inline-flex items-center justify-center rounded-xl bg-[#166847] px-4 py-2 text-sm font-extrabold text-white"
          >
            장바구니 담기
          </Link>
          <Link href="/cart" className="inline-flex items-center justify-center rounded-xl border border-[#d8ddd3] px-4 py-2 text-sm font-bold">
            장바구니 보기
          </Link>
        </div>
      </section>
    </main>
  );
}
