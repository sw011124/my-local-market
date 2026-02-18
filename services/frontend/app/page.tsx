import Link from "next/link";
import {
  Search,
  Home,
  Menu,
  ShoppingCart,
  User,
  Megaphone,
  ChevronRight,
  MapPin,
  Plus,
} from "lucide-react";

type CategoryItem = {
  name: string;
  emoji: string;
  href: string;
};

type ProductSectionProps = {
  title: string;
  moreHref: string;
  imageLabel: string;
  originText: string;
  productName: string;
  priceText: string;
  oldPriceText?: string;
  badgeText?: string;
};

const CATEGORIES: CategoryItem[] = [
  { name: "전단행사", emoji: "🔥", href: "/products?promo=true" },
  { name: "과일", emoji: "🍎", href: "/products?categoryId=1" },
  { name: "야채", emoji: "🥬", href: "/products?categoryId=1" },
  { name: "정육", emoji: "🥩", href: "/products?categoryId=2" },
  { name: "수산", emoji: "🐟", href: "/products" },
  { name: "계란/두부", emoji: "🥚", href: "/products" },
  { name: "유제품", emoji: "🥛", href: "/products" },
  { name: "쌀/잡곡", emoji: "🍚", href: "/products" },
  { name: "음료", emoji: "🥤", href: "/products" },
  { name: "공산품", emoji: "🥫", href: "/products" },
];

function ProductStripSection({
  title,
  moreHref,
  imageLabel,
  originText,
  productName,
  priceText,
  oldPriceText,
  badgeText,
}: ProductSectionProps) {
  return (
    <section className="mt-3 border-t-[4px] border-gray-50 pl-4 pt-4 lg:rounded-3xl lg:border lg:border-gray-100 lg:bg-white lg:p-6">
      <div className="mb-4 flex items-center justify-between pr-6 lg:pr-0">
        <h3 className="text-xl font-black text-black">{title}</h3>
        <Link href={moreHref} className="cursor-pointer text-xs font-bold text-red-600">
          더보기 &gt;
        </Link>
      </div>

      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-4 pr-4 lg:grid lg:grid-cols-6 lg:overflow-visible lg:pb-0 lg:pr-0">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <article
            key={item}
            className="group flex w-[138px] min-w-[138px] cursor-pointer flex-col lg:w-auto lg:min-w-0"
          >
            <div className="relative mb-3 aspect-square overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 transition-colors group-hover:border-red-600">
              <div className="flex h-full w-full items-center justify-center bg-gray-50 text-xs font-semibold text-gray-300">
                {imageLabel}
              </div>
              {badgeText && item <= 2 && (
                <span className="absolute left-0 top-0 z-10 rounded-br-xl bg-red-600 px-2 py-1 text-[10px] font-bold text-white">
                  {badgeText}
                </span>
              )}
              <Link
                href="/products"
                className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full border border-gray-100 bg-white text-black shadow-md transition-all hover:border-red-600 hover:bg-red-600 hover:text-white"
              >
                <Plus size={16} strokeWidth={3} />
              </Link>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-medium text-gray-400">{originText}</p>
              <h4 className="mb-1 h-10 line-clamp-2 text-sm font-bold leading-snug text-gray-900">{productName}</h4>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black text-red-600">{priceText}</span>
                {oldPriceText && <span className="text-xs font-medium text-gray-400 line-through">{oldPriceText}</span>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f6f6f7] pb-24 font-sans selection:bg-red-100 md:pb-0">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <h1 className="text-3xl font-black leading-none tracking-tighter text-black">진로마트</h1>
              <span className="mb-0.5 text-sm font-bold text-red-600">목감점</span>
            </div>

            <div className="flex items-center gap-3 md:gap-6">
              <nav className="hidden items-center gap-4 text-sm font-bold text-gray-700 md:flex">
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

              <Link href="/cart" className="group relative cursor-pointer">
                <ShoppingCart size={24} className="text-black transition-colors group-hover:text-red-600" />
                <span className="absolute -right-1.5 -top-1.5 box-content flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-red-600 text-[10px] font-bold text-white">
                  0
                </span>
              </Link>
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1.8fr] md:items-center">
            <Link
              href="/checkout"
              className="flex h-11 items-center gap-1 rounded-xl bg-gray-50 px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <MapPin size={14} className="text-red-600" />
              <span className="truncate">배달지: 목감동 신안인스빌 정문...</span>
              <ChevronRight size={14} className="ml-auto" />
            </Link>

            <form action="/products" method="get" className="relative">
              <input
                type="text"
                name="q"
                placeholder="오늘 세일하는 계란 찾아보세요!"
                className="h-11 w-full rounded-xl border border-gray-100 bg-gray-50 px-4 pl-11 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl pb-8">
        <section className="mt-4 grid gap-4 px-4 lg:grid-cols-[2fr_1fr]">
          <article className="group relative h-72 overflow-hidden rounded-3xl bg-gray-900 lg:h-[360px]">
            <div className="absolute inset-0 flex items-center justify-between bg-gradient-to-r from-black via-gray-900 to-red-900 p-6 text-white md:px-8">
              <div className="z-10 flex h-full max-w-md flex-col justify-center">
                <div className="mb-4 w-fit animate-pulse rounded-full bg-red-600 px-3 py-1 text-[10px] font-bold">
                  🔥 강력 추천 행사
                </div>
                <h2 className="mb-3 text-3xl font-black leading-tight md:text-4xl">
                  주말 강력추천
                  <br />
                  <span className="text-red-500">한우 1++ 등심</span>
                </h2>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-bold leading-none md:text-3xl">50% 할인</p>
                  <span className="mb-0.5 text-sm font-medium text-gray-400 line-through">120,000원</span>
                </div>
              </div>
              <div className="absolute -bottom-12 -right-12 h-48 w-48 rounded-full border-4 border-red-600/20 blur-sm"></div>
            </div>

            <div className="absolute bottom-6 left-8 flex gap-2">
              <div className="h-1.5 w-6 rounded-full bg-red-600"></div>
              <div className="h-1.5 w-1.5 rounded-full bg-gray-600"></div>
              <div className="h-1.5 w-1.5 rounded-full bg-gray-600"></div>
            </div>
          </article>

          <Link
            href="/products?promo=true"
            className="group flex cursor-pointer items-center justify-between rounded-3xl bg-black p-5 text-white shadow-lg shadow-gray-200 transition-colors hover:bg-gray-900 lg:flex-col lg:items-start lg:justify-center"
          >
            <div className="flex items-center gap-4 lg:flex-col lg:items-start">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white transition-transform group-hover:scale-110">
                <Megaphone size={20} fill="white" />
              </div>
              <div>
                <p className="mb-0.5 text-base font-bold">종이 전단지 보기</p>
                <p className="text-xs text-gray-300">이번주 행사상품 80종 한눈에!</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-500 transition-all group-hover:translate-x-1 group-hover:text-white" />
          </Link>
        </section>

        <section className="mt-8 px-4">
          <div className="grid grid-cols-5 gap-y-6 rounded-3xl bg-white p-4 shadow-sm lg:grid-cols-10 lg:gap-y-4">
            {CATEGORIES.map((category, idx) => (
              <Link
                href={category.href}
                key={category.name}
                className="group flex cursor-pointer flex-col items-center gap-2"
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-2xl shadow-sm transition-all ${
                    idx === 0
                      ? "border-red-100 bg-red-50 font-bold text-red-600"
                      : "border-gray-50 bg-gray-50 group-hover:border-black group-hover:bg-white"
                  }`}
                >
                  {category.emoji}
                </div>
                <span className={`text-[11px] font-bold tracking-tight ${idx === 0 ? "text-red-600" : "text-gray-600"}`}>
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-3 grid gap-3 lg:grid-cols-1 lg:px-4">
          <ProductStripSection
            title="⚡ 지금 안사면 손해!"
            moreHref="/products?sort=popular"
            imageLabel="IMAGE"
            originText="국내산/성주"
            productName="[진로] 당도선별 꿀참외 1.5kg 박스"
            priceText="9,900"
            oldPriceText="15,000"
            badgeText="품절임박"
          />

          <ProductStripSection
            title="🍎 당도최고! 제철 청과"
            moreHref="/products?categoryId=1"
            imageLabel="FRUIT"
            originText="국내산/특"
            productName="고랭지 세척사과 1.2kg 봉지"
            priceText="8,900"
          />

          <ProductStripSection
            title="🥩 믿고 먹는 정육 코너"
            moreHref="/products?categoryId=2"
            imageLabel="MEAT"
            originText="한돈/1등급"
            productName="한돈 1등급 삼겹살 구이용 500g"
            priceText="12,900"
            oldPriceText="16,500"
            badgeText="한정수량"
          />
        </div>
      </div>

      <footer className="mt-4 border-t border-gray-200 bg-gray-100 px-6 py-6 text-[11px] leading-relaxed text-gray-500">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex flex-col items-start justify-between gap-4 md:flex-row">
            <div>
              <h5 className="mb-1 text-sm font-bold text-gray-700">고객센터</h5>
              <p className="mb-1 text-xl font-black text-gray-900">031) 411-0988</p>
              <p>
                <span className="text-xs font-bold text-gray-600">영업 시간: </span>
                <span className="text-xs">08:00 - 22:00</span>
              </p>
            </div>
            <button className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm">
              전화걸기
            </button>
          </div>

          <hr className="my-4 border-gray-200" />

          <div className="space-y-1">
            <p>
              <span className="font-bold text-gray-600">상호명:</span> 진로마트 목감점
            </p>
            <p>
              <span className="font-bold text-gray-600">대표자:</span> 양웅철 | <span className="font-bold text-gray-600">사업자번호:</span> 031) 411-0988
            </p>
            <p>
              <span className="font-bold text-gray-600">주소:</span> 경기도 시흥시 목감동 244-1
            </p>
          </div>
          <p className="mt-6 text-gray-300">© 2026 Jinro Mart Mokgam. All rights reserved.</p>
        </div>
      </footer>

      <nav className="safe-area-bottom fixed bottom-0 left-0 z-50 grid h-16 w-full grid-cols-5 border-t border-gray-100 bg-white pb-2 text-[10px] font-medium text-gray-400 md:hidden">
        <Link href="/" className="flex cursor-pointer flex-col items-center justify-center gap-1 font-bold text-red-600">
          <Home size={24} className="stroke-[2.5]" />
          <span>홈</span>
        </Link>

        <Link href="/products" className="flex cursor-pointer flex-col items-center justify-center gap-1 transition-colors hover:text-gray-900">
          <Menu size={24} />
          <span>카테고리</span>
        </Link>

        <Link href="/products" className="group flex cursor-pointer flex-col items-center justify-center gap-1 transition-colors hover:text-gray-900">
          <div className="rounded-full bg-gray-50 p-1 transition-colors group-hover:bg-red-50 group-hover:text-red-600">
            <Search size={22} className="stroke-[2.5]" />
          </div>
          <span className="group-hover:text-red-600">검색</span>
        </Link>

        <Link href="/products?promo=true" className="flex cursor-pointer flex-col items-center justify-center gap-1 transition-colors hover:text-gray-900">
          <Megaphone size={24} />
          <span>전단행사</span>
        </Link>

        <Link href="/orders/lookup" className="flex cursor-pointer flex-col items-center justify-center gap-1 transition-colors hover:text-gray-900">
          <User size={24} />
          <span>내 정보</span>
        </Link>
      </nav>
    </div>
  );
}
