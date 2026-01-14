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

export default function HomePage() {
  return (
    <div className="bg-white min-h-screen pb-24 font-sans selection:bg-red-100">
      {/* [Header Section] 
        - Sticky positioning for accessibility
        - Contains: Brand Logo, Branch Name, Cart, Location, Search
      */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        {/* Top Row: Brand & Actions */}
        <div className="px-5 py-4 flex justify-between items-end">
          <div className="flex items-baseline gap-1.5">
            <h1 className="text-3xl font-black text-black tracking-tighter leading-none">
              진로마트
            </h1>
            <span className="text-sm font-bold text-red-600 mb-0.5">
              목감점
            </span>
          </div>

          {/* Action Icons (Cart) */}
          <div className="flex gap-4 mb-1">
            <div className="relative cursor-pointer group">
              <ShoppingCart
                size={26}
                className="text-black group-hover:text-red-600 transition-colors"
              />
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                2
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Row: Location Info & Search Input */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-1 mb-2 text-xs font-medium text-gray-600">
            <MapPin size={12} className="text-red-600" />
            <span>배달지: 목감동 신안인스빌 정문...</span>
            <ChevronRight size={12} />
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="오늘 세일하는 계란 찾아보세요!"
              className="w-full bg-gray-50 border border-gray-200 text-sm text-gray-900 rounded-lg py-3 px-4 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 placeholder:text-gray-400 transition-all"
            />
            <Search
              size={18}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>
      </header>

      {/* [Hero Banner Section]
        - Main promotional visual
        - Gradient overlay with call-to-action details
      */}
      <section className="relative w-full h-72 bg-gray-900 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-gray-900 to-red-900 flex items-center justify-between p-6 text-white px-8">
          <div className="flex flex-col justify-center h-full z-10">
            <div className="bg-red-600 w-fit px-3 py-1 rounded-full text-[10px] font-bold mb-3 animate-pulse">
              🔥 강력 추천 행사
            </div>
            <h2 className="text-3xl font-black leading-tight mb-2">
              주말 강력추천
              <br />
              <span className="text-red-500">한우 1++ 등심</span>
            </h2>
            <p className="text-xl font-bold mt-1">
              50% 할인{" "}
              <span className="text-sm font-normal text-gray-300 line-through ml-2">
                120,000원
              </span>
            </p>
          </div>
          {/* Decorative Element */}
          <div className="w-40 h-40 border-4 border-red-600/30 rounded-full absolute -right-10 -bottom-10"></div>
        </div>
        {/* Slider Indicators */}
        <div className="absolute bottom-4 left-6 flex gap-1.5">
          <div className="w-5 h-1.5 rounded-full bg-red-600"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
        </div>
      </section>

      {/* [Flyer Access Button]
        - Direct link to digital flyer image
      */}
      <section className="px-4 mt-4">
        <div className="bg-black text-white rounded-xl p-4 flex items-center justify-between shadow-md cursor-pointer group hover:bg-gray-900 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform">
              <Megaphone size={20} fill="white" />
            </div>
            <div>
              <p className="font-bold text-base">종이 전단지 보기</p>
              <p className="text-xs text-gray-300">
                이번주 행사상품 80종 한눈에!
              </p>
            </div>
          </div>
          <ChevronRight
            size={20}
            className="text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all"
          />
        </div>
      </section>

      {/* [Category Grid]
        - 5 columns grid layout
        - Dynamic rendering based on category array
      */}
      <section className="mt-8 px-4">
        <div className="grid grid-cols-5 gap-y-5">
          {[
            "전단행사",
            "과일",
            "야채",
            "정육",
            "수산",
            "계란/두부",
            "유제품",
            "쌀/잡곡",
            "음료",
            "공산품",
          ].map((cate, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center gap-1 cursor-pointer group"
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm transition-all
                  ${
                    idx === 0
                      ? "bg-red-100 border border-red-200 text-red-600 font-bold"
                      : "bg-white border border-gray-100 group-hover:border-black"
                  }
              `}
              >
                {
                  ["🔥", "🍎", "🥬", "🥩", "🐟", "🥚", "🥛", "🍚", "🥤", "🥫"][
                    idx
                  ]
                }
              </div>
              <span
                className={`text-[11px] font-bold tracking-tight ${
                  idx === 0 ? "text-red-600" : "text-gray-700"
                }`}
              >
                {cate}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* [Product Section: Time Sale]
        - Horizontal scroll layout (Compact View)
        - Card Width: 120px
      */}
      <section className="mt-8 pl-5 border-t-4 border-gray-50 pt-6">
        <div className="flex items-center justify-between pr-5 mb-6">
          <h3 className="text-xl font-black text-black">
            ⚡ 지금 안사면 손해!
          </h3>
          <span className="text-xs font-bold text-red-600 cursor-pointer">
            더보기 &gt;
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-3 pr-4 no-scrollbar">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="min-w-[120px] w-[120px] flex flex-col group cursor-pointer"
            >
              {/* Product Image Area */}
              <div className="aspect-square bg-gray-50 rounded-xl relative mb-2 overflow-hidden border border-gray-100 group-hover:border-red-600 transition-colors">
                <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50 text-xs">
                  IMG
                </div>

                {/* Conditional Rendering: Low Stock Badge */}
                {item <= 2 && (
                  <span className="absolute top-0 left-0 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-br-lg z-10">
                    품절임박
                  </span>
                )}

                {/* Quick Add Button */}
                <button className="absolute bottom-1.5 right-1.5 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow-md text-black hover:bg-red-600 hover:text-white transition-all">
                  <Plus size={14} strokeWidth={3} />
                </button>
              </div>

              {/* Product Details */}
              <div>
                <p className="text-[10px] text-gray-400 mb-0.5">국내산/성주</p>
                <h4 className="text-[13px] font-bold text-gray-900 leading-tight line-clamp-2 mb-1 h-9">
                  [진로] 당도선별 꿀참외 1.5kg
                </h4>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base font-black text-red-600">
                    9,900
                  </span>
                  <span className="text-[10px] font-bold text-gray-800">
                    원
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 line-through">
                  15,000
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* [Product Section: MD Recommendation]
        - Horizontal scroll layout
      */}
      <section className="mt-8 pl-5 border-t-4 border-gray-50 pt-6">
        <div className="flex items-center justify-between pr-5 mb-6">
          <h3 className="text-xl font-black text-black">🥩 정육코너 BEST</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-6 pr-4 no-scrollbar">
          {[1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="min-w-[120px] w-[120px] flex flex-col group cursor-pointer"
            >
              <div className="aspect-square bg-red-50 rounded-xl relative mb-2 overflow-hidden border border-red-100 group-hover:border-red-600 transition-colors">
                <div className="w-full h-full flex items-center justify-center text-red-200 text-xs">
                  MEAT
                </div>
                <button className="absolute bottom-1.5 right-1.5 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow-md text-black hover:bg-red-600 hover:text-white transition-all">
                  <Plus size={14} strokeWidth={3} />
                </button>
              </div>
              <div>
                <h4 className="text-[13px] font-bold text-gray-900 leading-tight line-clamp-2 mb-1">
                  한돈 1등급 삼겹살 구이용
                </h4>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-base font-black text-red-600">
                    12,900
                  </span>
                  <span className="text-[10px] font-bold text-gray-800">
                    원
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* [Bottom Navigation Bar]
        - Fixed positioning at bottom
        - Tab switching interface
      */}
      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white/95 backdrop-blur-md border-t border-gray-100 flex justify-around py-2 pb-5 z-50 text-[10px] font-medium text-gray-400">
        <div className="flex flex-col items-center gap-1 text-red-600 font-bold cursor-pointer">
          <Home size={24} className="stroke-[2.5]" />
          <span>홈</span>
        </div>
        <div className="flex flex-col items-center gap-1 hover:text-gray-900 cursor-pointer transition-colors">
          <Menu size={24} />
          <span>카테고리</span>
        </div>
        <div className="flex flex-col items-center gap-1 hover:text-gray-900 cursor-pointer transition-colors">
          <Megaphone size={24} />
          <span>전단행사</span>
        </div>
        <div className="flex flex-col items-center gap-1 hover:text-gray-900 cursor-pointer transition-colors">
          <User size={24} />
          <span>내 정보</span>
        </div>
      </nav>
    </div>
  );
}
