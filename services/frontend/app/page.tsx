import Link from "next/link";
import {
  BadgePercent,
  ChevronRight,
  Clock3,
  MapPin,
  Megaphone,
  Search,
  ShoppingBasket,
  Sparkles,
  Truck,
} from "lucide-react";

import { getHomeData } from "@/lib/market-api";
import type { HomeResponse, Product, Promotion } from "@/lib/market-types";

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

function fallbackPromotions(): Promotion[] {
  return [
    {
      id: -1,
      title: "이번 주 전단 특가",
      promo_type: "WEEKLY_FLYER",
      start_at: "",
      end_at: "",
      is_active: true,
    },
    {
      id: -2,
      title: "오늘의 신선식품 한정 할인",
      promo_type: "TODAY_SPECIAL",
      start_at: "",
      end_at: "",
      is_active: true,
    },
    {
      id: -3,
      title: "인기 생필품 묶음 프로모션",
      promo_type: "BEST_BUNDLE",
      start_at: "",
      end_at: "",
      is_active: true,
    },
  ];
}

const OPERATION = {
  open: "09:00",
  close: "21:00",
  cutoff: "19:00",
  minOrder: 15000,
  freeDelivery: 40000,
} as const;

export default async function HomePage() {
  let homeData = fallbackHomeData();
  let apiError: string | null = null;

  try {
    homeData = await getHomeData();
  } catch {
    apiError = "백엔드 API 연결에 실패했습니다. Python 백엔드 상태를 확인해 주세요.";
  }

  const featuredProducts: Product[] = homeData.featured_products.slice(0, 8);
  const promotionCards = (homeData.promotions.length > 0 ? homeData.promotions : fallbackPromotions()).slice(0, 3);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#321015_0%,#16090b_34%,#090909_70%,#050505_100%)] text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#090909]/95 px-4 pb-4 pt-3 backdrop-blur">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-300/80">local premium delivery</p>
              <h1 className="text-2xl font-black tracking-tight text-white">목감 로컬마켓</h1>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Link className="rounded-full border border-white/20 px-3 py-1.5 text-zinc-200 hover:border-red-400 hover:text-red-200" href="/products">
                전체 상품
              </Link>
              <Link className="rounded-full border border-white/20 px-3 py-1.5 text-zinc-200 hover:border-red-400 hover:text-red-200" href="/orders/lookup">
                주문 조회
              </Link>
              <Link className="rounded-full border border-red-500/50 bg-red-500/15 p-2 text-red-100 hover:bg-red-500/25" href="/cart">
                <ShoppingBasket size={16} />
              </Link>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1.2fr_2fr] lg:grid-cols-[1.15fr_2fr_auto]">
            <article className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="mb-1 inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-300">
                <MapPin size={13} /> 현재 주소
              </p>
              <p className="text-sm font-bold text-white">경기 시흥시 목감중앙로 45, 102동 1203호</p>
              <p className="mt-1 text-xs text-zinc-400">배송 권역 확인 완료 (하이브리드 존)</p>
            </article>

            <form action="/products" method="get" className="flex items-center gap-2 rounded-2xl border border-red-500/35 bg-[#111111] px-3 py-2">
              <Search size={17} className="text-red-300" />
              <input
                name="q"
                placeholder="상품명, 브랜드, 행사 키워드 검색"
                className="h-10 w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex h-10 min-w-20 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-extrabold text-white transition hover:bg-red-500"
              >
                검색
              </button>
            </form>

            <article className="grid grid-cols-2 gap-2 lg:w-64">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-[11px] text-zinc-400">당일 주문</p>
                <p className="mt-1 text-sm font-black text-red-300">{OPERATION.cutoff} 마감</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-[11px] text-zinc-400">최소 주문</p>
                <p className="mt-1 text-sm font-black text-white">{formatPrice(String(OPERATION.minOrder))}</p>
              </div>
            </article>
          </div>
        </div>
      </header>

      <section className="mx-auto mt-5 grid max-w-7xl gap-4 px-4 lg:grid-cols-[1.35fr_1fr]">
        <article className="rounded-3xl border border-red-500/30 bg-gradient-to-br from-[#61131f] via-[#390d14] to-[#1b0b0e] p-7 shadow-[0_25px_65px_rgba(180,24,43,0.35)]">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-300/30 bg-red-600/20 px-3 py-1 text-xs font-bold text-red-100">
            <Truck size={14} /> {OPERATION.open}~{OPERATION.close} 운영 / 당일마감 {OPERATION.cutoff}
          </p>
          <h2 className="text-3xl font-black leading-tight text-white md:text-4xl">첫 화면에서 바로 장보기</h2>
          <p className="mt-3 max-w-xl text-sm text-zinc-200">
            주소 확인, 검색, 전단 행사, 추천 상품까지 한 번에 확인하고 바로 주문하세요. 비회원 주문도 빠르게 진행됩니다.
          </p>
          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-white/15 bg-black/25 px-3 py-2">
              <p className="text-[11px] text-zinc-300">무료배송 기준</p>
              <p className="mt-1 text-sm font-black text-white">{formatPrice(String(OPERATION.freeDelivery))}</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-black/25 px-3 py-2">
              <p className="text-[11px] text-zinc-300">결제 방식</p>
              <p className="mt-1 text-sm font-black text-white">현장결제 기본</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-black/25 px-3 py-2">
              <p className="text-[11px] text-zinc-300">중량상품</p>
              <p className="mt-1 text-sm font-black text-white">실중량 정산</p>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <Link
              href="/products"
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-red-500"
            >
              상품 보러가기
            </Link>
            <Link
              href="/orders/lookup"
              className="rounded-xl border border-white/40 px-4 py-2 text-sm font-bold text-zinc-100 transition hover:bg-white/10"
            >
              주문 조회
            </Link>
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-[#101010] p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-red-200">
            <Megaphone size={16} /> 전단/할인 배너
          </div>
          <ul className="mt-3 space-y-2">
            {promotionCards.map((promotion) => (
              <li key={promotion.id} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm">
                <p className="font-bold text-white">{promotion.title}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-zinc-300">
                  <BadgePercent size={13} /> {promotion.promo_type}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-600/10 px-3 py-2">
            <p className="text-xs text-red-100">행사 상품은 결제 직전 재고/가격이 최종 반영됩니다.</p>
          </div>
        </article>
      </section>

      <section className="mx-auto mt-4 max-w-7xl px-4">
        <div className="grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-300">
              <Clock3 size={14} /> 배송 시간
            </p>
            <p className="mt-2 text-sm font-bold text-white">오늘 {OPERATION.open} - {OPERATION.close}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-300">
              <Sparkles size={14} /> 추천 기능
            </p>
            <p className="mt-2 text-sm font-bold text-white">인기/신상품 중심 자동 진열</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-300">
              <ChevronRight size={14} /> 빠른 진입
            </p>
            <Link className="mt-2 inline-flex text-sm font-extrabold text-red-300 hover:text-red-200" href="/checkout">
              장바구니에서 바로 결제
            </Link>
          </article>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-7xl px-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-black text-white">카테고리</h3>
          <Link className="text-sm font-bold text-red-300 hover:text-red-200" href="/products">
            전체보기
          </Link>
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
          {homeData.categories.length === 0 && (
            <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-zinc-300">등록된 카테고리가 없습니다.</span>
          )}
          {homeData.categories.map((category) => (
            <Link
              key={category.id}
              href={`/products?categoryId=${category.id}`}
              className="whitespace-nowrap rounded-full border border-white/20 bg-[#111111] px-4 py-2 text-sm font-bold text-zinc-200 transition hover:border-red-400 hover:text-red-200"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-4 max-w-7xl px-4">
        <h3 className="mb-3 text-lg font-black text-white">행사 하이라이트</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {promotionCards.map((promotion, index) => (
            <article
              key={`highlight-${promotion.id}`}
              className="rounded-2xl border border-red-400/25 bg-gradient-to-br from-[#2b0d12] via-[#1c0b0f] to-[#12090b] p-4 shadow-[0_10px_35px_rgba(120,16,32,0.28)]"
            >
              <p className="text-xs font-bold text-red-200">#{index + 1} EVENT</p>
              <h4 className="mt-2 line-clamp-2 min-h-10 text-sm font-extrabold text-white">{promotion.title}</h4>
              <p className="mt-2 text-xs text-zinc-300">{promotion.promo_type}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-7xl px-4 pb-16">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-black text-white">추천 상품</h3>
          <Link className="text-sm font-bold text-red-300 hover:text-red-200" href="/products">
            전체보기
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {featuredProducts.length === 0 && (
            <article className="rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-zinc-300">노출할 상품이 없습니다.</article>
          )}
          {featuredProducts.map((product) => (
            <article
              key={product.id}
              className="group rounded-2xl border border-white/10 bg-gradient-to-b from-[#181818] to-[#101010] p-4 shadow-[0_12px_24px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:border-red-500/45"
            >
              <div className="mb-3 h-28 rounded-xl bg-[linear-gradient(135deg,#282828_0%,#141414_50%,#3a1117_100%)] p-3">
                <p className="text-xs font-semibold text-zinc-300">{product.category_name ?? "기타"}</p>
                <h4 className="mt-2 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-white">{product.name}</h4>
              </div>
              <p className="text-xs text-zinc-400">
                {product.unit_label} | 재고 {product.stock_qty}
              </p>
              <p className="mt-2 text-xl font-black text-red-300">{formatPrice(product.effective_price)}</p>
              {product.is_weight_item && (
                <p className="mt-1 text-[11px] font-semibold text-red-200/90">중량상품: 실중량 정산</p>
              )}
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/products/${product.id}`}
                  className="inline-flex items-center justify-center rounded-lg border border-white/25 px-3 py-1.5 text-xs font-bold text-zinc-200 transition hover:border-red-300 hover:text-red-200"
                >
                  상세
                </Link>
                <Link
                  href={`/cart?addProductId=${product.id}&qty=1`}
                  className="inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-1.5 text-xs font-extrabold text-white transition group-hover:bg-red-500"
                >
                  담기
                </Link>
              </div>
            </article>
          ))}
        </div>

        {apiError && <p className="mt-4 rounded-xl bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-200">{apiError}</p>}
      </section>
    </main>
  );
}
