import Link from "next/link";
import { ChevronRight, Megaphone, Search, ShoppingBasket, Truck } from "lucide-react";

import { getHomeData } from "@/lib/market-api";
import type { HomeResponse, Product } from "@/lib/market-types";

function formatPrice(value: string): string {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return value;
  }
  return `${new Intl.NumberFormat("ko-KR").format(numeric)}원`;
}

function fallbackHomeData(): HomeResponse {
  return {
    categories: [],
    featured_products: [],
    promotions: [],
    notices: [],
  };
}

export default async function HomePage() {
  let homeData = fallbackHomeData();
  let apiError: string | null = null;

  try {
    homeData = await getHomeData();
  } catch {
    apiError = "백엔드 API 연결에 실패했습니다. Python 백엔드 상태를 확인해 주세요.";
  }

  const featuredProducts: Product[] = homeData.featured_products.slice(0, 8);

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#1a2f27]">
      <header className="sticky top-0 z-30 border-b border-[#d8ddd3] bg-[#f6f4ef]/95 backdrop-blur px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#688378]">동네 중소마트 자체배달</p>
            <h1 className="text-2xl font-black tracking-tight">목감 로컬마켓</h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <Link className="hover:text-[#145c3f]" href="/products">
              상품
            </Link>
            <Link className="rounded-full border border-[#d8ddd3] p-2 hover:bg-white" href="/cart">
              <ShoppingBasket size={18} />
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto mt-5 grid max-w-6xl gap-4 px-4 md:grid-cols-[1.35fr_1fr]">
        <article className="rounded-3xl bg-gradient-to-br from-[#145c3f] via-[#1f7a56] to-[#2a8f66] p-7 text-white shadow-lg">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
            <Truck size={14} /> 09:00~21:00 / 당일마감 19:00
          </p>
          <h2 className="text-3xl font-black leading-tight md:text-4xl">오늘 장보기, 오늘 도착</h2>
          <p className="mt-3 text-sm text-white/90">비회원 주문 + 주문번호/휴대폰 조회로 빠르게 이용할 수 있습니다.</p>
          <div className="mt-6 flex gap-2">
            <Link
              href="/products"
              className="rounded-xl bg-[#f3c860] px-4 py-2 text-sm font-extrabold text-[#33443d] hover:bg-[#ffd067]"
            >
              상품 보러가기
            </Link>
            <Link
              href="/orders/lookup"
              className="rounded-xl border border-white/50 px-4 py-2 text-sm font-bold text-white hover:bg-white/10"
            >
              주문 조회
            </Link>
          </div>
        </article>

        <article className="rounded-3xl border border-[#d8ddd3] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-[#5a6c64]">
            <Megaphone size={16} /> 이번 주 행사
          </div>
          <ul className="mt-3 space-y-2">
            {homeData.promotions.length === 0 && (
              <li className="rounded-xl bg-[#f7faf8] px-3 py-2 text-sm text-[#5a6c64]">현재 진행 중인 행사가 없습니다.</li>
            )}
            {homeData.promotions.map((promotion) => (
              <li key={promotion.id} className="rounded-xl bg-[#f7faf8] px-3 py-2 text-sm">
                <p className="font-bold">{promotion.title}</p>
                <p className="text-xs text-[#657a71]">{promotion.promo_type}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="mx-auto mt-4 max-w-6xl px-4">
        <div className="rounded-2xl border border-[#d8ddd3] bg-white p-3">
          <div className="flex items-center gap-2 rounded-xl border border-[#d8ddd3] bg-[#f8faf8] px-3 py-2 text-sm text-[#516860]">
            <Search size={16} />
            <span>검색은 상품 페이지에서 사용 가능합니다.</span>
            <Link className="ml-auto inline-flex items-center gap-1 font-bold text-[#166847]" href="/products">
              이동 <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-5 max-w-6xl px-4">
        <h3 className="mb-3 text-lg font-black">카테고리</h3>
        <div className="flex flex-wrap gap-2">
          {homeData.categories.length === 0 && (
            <span className="rounded-full border border-[#d8ddd3] bg-white px-4 py-2 text-sm text-[#5a6c64]">데이터 없음</span>
          )}
          {homeData.categories.map((category) => (
            <Link
              key={category.id}
              href={`/products?categoryId=${category.id}`}
              className="rounded-full border border-[#c8d4cd] bg-white px-4 py-2 text-sm font-bold hover:border-[#145c3f] hover:text-[#145c3f]"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-6xl px-4 pb-16">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-black">추천 상품</h3>
          <Link className="text-sm font-bold text-[#166847]" href="/products">
            전체보기
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {featuredProducts.length === 0 && (
            <article className="rounded-2xl border border-[#d8ddd3] bg-white p-4 text-sm text-[#5a6c64]">노출할 상품이 없습니다.</article>
          )}
          {featuredProducts.map((product) => (
            <article key={product.id} className="rounded-2xl border border-[#d8ddd3] bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-[#6a7e74]">{product.category_name ?? "기타"}</p>
              <h4 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-5">{product.name}</h4>
              <p className="mt-2 text-xs text-[#6a7e74]">
                {product.unit_label} | 재고 {product.stock_qty}
              </p>
              <p className="mt-2 text-lg font-black text-[#145c3f]">{formatPrice(product.effective_price)}</p>
              {product.is_weight_item && (
                <p className="mt-1 text-[11px] font-semibold text-[#b06f21]">중량상품: 실중량 정산</p>
              )}
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/products/${product.id}`}
                  className="inline-flex items-center justify-center rounded-lg border border-[#d8ddd3] px-3 py-1.5 text-xs font-bold"
                >
                  상세
                </Link>
                <Link
                  href={`/cart?addProductId=${product.id}&qty=1`}
                  className="inline-flex items-center justify-center rounded-lg bg-[#166847] px-3 py-1.5 text-xs font-extrabold text-white"
                >
                  담기
                </Link>
              </div>
            </article>
          ))}
        </div>

        {apiError && <p className="mt-4 rounded-xl bg-[#ffeceb] px-4 py-2 text-sm font-semibold text-[#8e3a30]">{apiError}</p>}
      </section>
    </main>
  );
}
