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

function fallbackHomeData(): HomeResponse {
  return {
    categories: [],
    featured_products: [],
    promotions: [],
    notices: [],
  };
}

function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200">
      <Link href={`/products/${product.id}`} className="block">
        <div className="mb-3 aspect-square rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white" />
        <p className="text-xs font-semibold text-gray-500">{product.category_name ?? "기타"}</p>
        <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-gray-900">{product.name}</h3>
      </Link>

      <p className="mt-2 text-xs text-gray-500">{product.unit_label}</p>
      <p className="mt-1 text-xl font-black text-red-600">{formatPrice(product.effective_price)}</p>

      <div className="mt-3 flex gap-2">
        <Link
          href={`/products/${product.id}`}
          className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:border-red-300 hover:text-red-600"
        >
          상세
        </Link>
        <Link
          href={`/cart?addProductId=${product.id}&qty=1`}
          className="inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-red-500"
        >
          담기
        </Link>
      </div>
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

  const categories = homeData.categories.slice(0, 10);
  const promotions = homeData.promotions.slice(0, 3);
  const featuredProducts = homeData.featured_products.slice(0, 8);

  return (
    <div className="min-h-screen bg-[#f6f6f7] pb-24 text-black md:pb-0">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-baseline gap-2">
              <h1 className="text-3xl font-black leading-none tracking-tighter text-black">진로마트</h1>
              <span className="text-sm font-bold text-red-600">목감점</span>
            </Link>

            <div className="flex items-center gap-3 md:gap-6">
              <nav className="hidden items-center gap-4 text-sm font-bold text-gray-700 md:flex">
                <Link href="/" className="text-red-600">
                  홈
                </Link>
                <Link href="/products" className="transition-colors hover:text-red-600">
                  상품
                </Link>
                <Link href="/products?promo=true" className="transition-colors hover:text-red-600">
                  전단행사
                </Link>
                <Link href="/orders/lookup" className="transition-colors hover:text-red-600">
                  주문조회
                </Link>
              </nav>

              <Link href="/cart" className="relative rounded-full border border-gray-200 p-2 transition hover:border-red-200 hover:text-red-600">
                <ShoppingCart size={18} />
              </Link>
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-[1fr_2fr]">
            <Link
              href="/checkout"
              className="flex h-11 items-center gap-1 rounded-xl bg-gray-50 px-3 text-xs font-medium text-gray-600 transition hover:bg-red-50 hover:text-red-600"
            >
              <MapPin size={14} className="text-red-600" />
              <span className="truncate">배달지: 목감동 신안인스빌 정문 기준</span>
              <ChevronRight size={14} className="ml-auto" />
            </Link>

            <form action="/products" method="get" className="relative">
              <input
                type="text"
                name="q"
                placeholder="상품명, 브랜드, 행사 키워드 검색"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-24 text-sm placeholder:text-gray-400 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <button
                type="submit"
                className="absolute right-1 top-1/2 h-9 -translate-y-1/2 rounded-lg bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-500"
              >
                검색
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5">
        <section className="grid gap-3 lg:grid-cols-[2fr_1fr]">
          <article className="rounded-3xl bg-gradient-to-r from-black via-[#1a1a1a] to-[#300b12] p-6 text-white md:p-8">
            <p className="mb-3 inline-flex rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-red-200">이번 주 메인 행사</p>
            <h2 className="text-3xl font-black leading-tight md:text-4xl">오늘 장보기, 오늘 도착</h2>
            <p className="mt-2 max-w-lg text-sm text-zinc-300">검색부터 행사 확인, 주문까지 한 화면에서 빠르게 진행할 수 있도록 구성했습니다.</p>
            <div className="mt-5 flex gap-2">
              <Link href="/products" className="rounded-xl bg-red-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-red-500">
                상품 보러가기
              </Link>
              <Link href="/orders/lookup" className="rounded-xl border border-white/30 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10">
                주문 조회
              </Link>
            </div>
          </article>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500">배송 운영</p>
              <p className="mt-2 text-lg font-black">09:00 - 21:00</p>
              <p className="mt-1 text-xs text-gray-500">당일 주문 마감 19:00</p>
            </article>
            <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500">주문 정책</p>
              <p className="mt-2 text-lg font-black">최소 15,000원</p>
              <p className="mt-1 text-xs text-gray-500">40,000원 이상 무료배송</p>
            </article>
            <Link
              href="/products?promo=true"
              className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-red-200 sm:col-span-2 lg:col-span-1"
            >
              <p className="text-xs font-semibold text-gray-500">전단/특가</p>
              <p className="mt-2 text-base font-black">이번 주 행사 상품 보기</p>
              <p className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-red-600">
                바로가기 <ChevronRight size={14} className="transition group-hover:translate-x-0.5" />
              </p>
            </Link>
          </div>
        </section>

        {promotions.length > 0 && (
          <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-black">진행 중인 행사</h3>
              <Link href="/products?promo=true" className="text-sm font-bold text-red-600">
                전체보기
              </Link>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {promotions.map((promotion) => (
                <Link
                  key={promotion.id}
                  href="/products?promo=true"
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4 transition hover:border-red-200"
                >
                  <p className="text-xs font-semibold text-gray-500">{promotion.promo_type}</p>
                  <p className="mt-1 line-clamp-2 text-sm font-bold text-gray-900">{promotion.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-black">카테고리</h3>
            <Link href="/products" className="text-sm font-bold text-red-600">
              전체 카테고리
            </Link>
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {categories.length === 0 && (
              <span className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-500">카테고리 데이터가 없습니다.</span>
            )}
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/products?categoryId=${category.id}`}
                className="whitespace-nowrap rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-red-300 hover:text-red-600"
              >
                {category.name} 전체보기
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-black">추천 상품</h3>
            <Link href="/products" className="text-sm font-bold text-red-600">
              전체보기
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.length === 0 && (
              <article className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">추천 상품이 아직 없습니다.</article>
            )}
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        {apiError && (
          <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{apiError}</p>
        )}
      </main>

      <footer className="border-t border-gray-200 bg-white px-6 py-6 text-[11px] leading-relaxed text-gray-500">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
            <div>
              <h4 className="text-sm font-bold text-gray-700">고객센터</h4>
              <p className="mt-1 text-xl font-black text-gray-900">031) 411-0988</p>
              <p className="text-xs">영업 시간 08:00 - 22:00</p>
            </div>
            <button className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700">전화걸기</button>
          </div>
          <p className="mt-4">© 2026 Jinro Mart Mokgam. All rights reserved.</p>
        </div>
      </footer>

      <nav className="safe-area-bottom fixed bottom-0 left-0 z-50 grid h-16 w-full grid-cols-4 border-t border-gray-100 bg-white text-[11px] font-semibold text-gray-500 md:hidden">
        <Link href="/" className="flex flex-col items-center justify-center gap-1 text-red-600">
          <Home size={18} />
          <span>홈</span>
        </Link>
        <Link href="/products" className="flex flex-col items-center justify-center gap-1 transition-colors hover:text-red-600">
          <Menu size={18} />
          <span>카테고리</span>
        </Link>
        <Link href="/products?promo=true" className="flex flex-col items-center justify-center gap-1 transition-colors hover:text-red-600">
          <Megaphone size={18} />
          <span>행사</span>
        </Link>
        <Link href="/orders/lookup" className="flex flex-col items-center justify-center gap-1 transition-colors hover:text-red-600">
          <User size={18} />
          <span>주문조회</span>
        </Link>
      </nav>
    </div>
  );
}
