import Link from "next/link";
import { ChevronRight, Home, MapPin, Megaphone, Menu, Search, ShoppingCart, User } from "lucide-react";

import { getHomeData } from "@/lib/market-api";
import type { HomeResponse, Product } from "@/lib/market-types";

function formatPrice(value: string): string {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return value;
  }
  return `${new Intl.NumberFormat("ko-KR").format(numeric)}원`;
}

function toNumber(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
}

function discountRate(product: Product): number | null {
  const base = toNumber(product.base_price);
  const sale = toNumber(product.sale_price);
  if (!base || !sale || sale >= base) {
    return null;
  }
  return Math.round(((base - sale) / base) * 100);
}

function fallbackHomeData(): HomeResponse {
  return {
    categories: [],
    featured_products: [],
    promotions: [],
    notices: [],
  };
}

function ProductCard({ product }: { product: Product }) {
  const discount = discountRate(product);

  return (
    <article className="group rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200">
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative mb-3 aspect-square overflow-hidden rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white">
          {discount && (
            <span className="absolute left-2 top-2 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
              {discount}%
            </span>
          )}
        </div>
        <p className="text-[11px] font-semibold text-gray-500">{product.category_name ?? "기타"}</p>
        <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-gray-900">{product.name}</h3>
      </Link>

      <div className="mt-2">
        {product.sale_price && (
          <p className="text-[11px] font-semibold text-gray-400 line-through">{formatPrice(product.base_price)}</p>
        )}
        <p className="text-lg font-black text-red-600">{formatPrice(product.effective_price)}</p>
      </div>

      <Link
        href={`/cart?addProductId=${product.id}&qty=1`}
        className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-red-600 py-2 text-xs font-extrabold text-white transition hover:bg-red-500"
      >
        담기
      </Link>
    </article>
  );
}

export default async function HomePage() {
  let homeData = fallbackHomeData();
  let apiError: string | null = null;

  try {
    homeData = await getHomeData();
  } catch {
    apiError = "백엔드 API 연결에 실패했습니다. 서비스 상태를 확인해 주세요.";
  }

  const featuredProducts = homeData.featured_products.slice(0, 10);
  const hotDealProducts = featuredProducts.slice(0, 6);

  return (
    <div className="min-h-screen bg-[#f6f6f7] pb-24 md:pb-0">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 pb-4 pt-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-baseline gap-2">
              <h1 className="text-[30px] font-black leading-none tracking-tighter text-black">진로마트</h1>
              <span className="text-sm font-bold text-red-600">목감점</span>
            </Link>

            <Link href="/cart" className="rounded-full border border-gray-200 p-2 text-gray-700 transition hover:border-red-300 hover:text-red-600">
              <ShoppingCart size={18} />
            </Link>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-[1fr_2fr]">
            <Link
              href="/checkout"
              className="flex h-11 items-center gap-1 rounded-xl bg-gray-50 px-3 text-xs font-semibold text-gray-600 transition hover:bg-red-50 hover:text-red-600"
            >
              <MapPin size={14} className="text-red-600" />
              <span className="truncate">배달지: 목감동 신안인스빌</span>
              <ChevronRight size={14} className="ml-auto" />
            </Link>

            <form action="/products" method="get" className="relative">
              <input
                type="text"
                name="q"
                placeholder="상품명으로 바로 찾기"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-20 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 rounded-lg bg-red-600 px-3 text-xs font-bold text-white transition hover:bg-red-500"
              >
                검색
              </button>
            </form>
          </div>

          <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1 text-[11px] font-semibold text-gray-600 no-scrollbar">
            <span className="whitespace-nowrap rounded-full bg-red-50 px-3 py-1 text-red-600">당일배송 마감 19:00</span>
            <span className="whitespace-nowrap rounded-full bg-gray-100 px-3 py-1">최소주문 15,000원</span>
            <span className="whitespace-nowrap rounded-full bg-gray-100 px-3 py-1">40,000원 이상 무료배송</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4">
        <section className="rounded-3xl bg-gradient-to-r from-[#111111] via-[#1b1b1b] to-[#3d0d16] p-5 text-white md:p-7">
          <p className="mb-2 inline-flex rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold text-red-200">
            오늘의 전단 특가
          </p>
          <h2 className="text-2xl font-black leading-tight md:text-3xl">지금 많이 담는 신선식품, 오늘 도착</h2>
          <p className="mt-2 text-sm text-zinc-300">바로 담기 가능한 특가 상품을 먼저 보여드립니다.</p>
          <div className="mt-4 flex gap-2">
            <Link href="/products?promo=true" className="rounded-xl bg-red-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-red-500">
              특가 보러가기
            </Link>
            <Link href="/orders/lookup" className="rounded-xl border border-white/30 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10">
              주문 조회
            </Link>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-black text-black">인기 카테고리</h3>
            <Link href="/products" className="text-xs font-bold text-red-600">
              전체보기
            </Link>
          </div>

          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {homeData.categories.length === 0 && (
              <span className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-500">카테고리 없음</span>
            )}
            {homeData.categories.map((category) => (
              <Link
                key={category.id}
                href={`/products?categoryId=${category.id}`}
                className="whitespace-nowrap rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-red-300 hover:text-red-600"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-black text-black">지금 특가</h3>
            <Link href="/products?promo=true" className="text-xs font-bold text-red-600">
              더보기
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {hotDealProducts.length === 0 && (
              <article className="col-span-2 rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 md:col-span-3 lg:col-span-5">
                노출할 상품이 없습니다.
              </article>
            )}
            {hotDealProducts.map((product) => (
              <ProductCard key={`hot-${product.id}`} product={product} />
            ))}
          </div>
        </section>

        {homeData.promotions.length > 0 && (
          <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-black text-black">행사 배너</h3>
              <Link href="/products?promo=true" className="text-xs font-bold text-red-600">
                전체 행사
              </Link>
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              {homeData.promotions.slice(0, 3).map((promotion) => (
                <Link
                  key={promotion.id}
                  href="/products?promo=true"
                  className="rounded-xl border border-gray-100 bg-gray-50 p-3 transition hover:border-red-300"
                >
                  <p className="text-[11px] font-semibold text-gray-500">{promotion.promo_type}</p>
                  <p className="mt-1 line-clamp-2 text-sm font-bold text-gray-900">{promotion.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-black text-black">추천 상품</h3>
            <Link href="/products" className="text-xs font-bold text-red-600">
              전체보기
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {featuredProducts.length === 0 && (
              <article className="col-span-2 rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 md:col-span-3 lg:col-span-5">
                추천 상품이 없습니다.
              </article>
            )}
            {featuredProducts.map((product) => (
              <ProductCard key={`featured-${product.id}`} product={product} />
            ))}
          </div>
        </section>

        {homeData.notices.length > 0 && (
          <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-base font-black text-black">공지</h3>
            <ul className="space-y-2">
              {homeData.notices.slice(0, 2).map((notice) => (
                <li key={notice.id} className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {notice.title}
                </li>
              ))}
            </ul>
          </section>
        )}

        {apiError && <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{apiError}</p>}
      </main>

      <nav className="fixed bottom-0 left-0 z-50 grid h-16 w-full grid-cols-4 border-t border-gray-100 bg-white text-[11px] font-semibold text-gray-500 md:hidden">
        <Link href="/" className="flex flex-col items-center justify-center gap-1 text-red-600">
          <Home size={18} />
          <span>홈</span>
        </Link>
        <Link href="/products" className="flex flex-col items-center justify-center gap-1">
          <Menu size={18} />
          <span>카테고리</span>
        </Link>
        <Link href="/products?promo=true" className="flex flex-col items-center justify-center gap-1">
          <Megaphone size={18} />
          <span>행사</span>
        </Link>
        <Link href="/orders/lookup" className="flex flex-col items-center justify-center gap-1">
          <User size={18} />
          <span>주문조회</span>
        </Link>
      </nav>
    </div>
  );
}
