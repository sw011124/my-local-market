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
      {/* --- Header Section --- */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="px-4 py-4 flex justify-between items-end">
          <div className="flex items-baseline gap-2">
            <h1 className="text-3xl font-black text-black tracking-tighter leading-none">
              진로마트
            </h1>
            <span className="text-sm font-bold text-red-600 mb-0.5">
              목감점
            </span>
          </div>

          <div className="flex gap-4 mb-1">
            <div className="relative cursor-pointer group">
              <ShoppingCart
                size={24}
                className="text-black group-hover:text-red-600 transition-colors"
              />
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white box-content">
                2
              </span>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-center gap-1 mb-3 text-xs font-medium text-gray-500">
            <MapPin size={14} className="text-red-600" />
            <span>배달지: 목감동 신안인스빌 정문...</span>
            <ChevronRight size={14} />
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="오늘 세일하는 계란 찾아보세요!"
              className="w-full h-12 bg-gray-50 border border-gray-100 text-sm text-gray-900 rounded-xl px-4 pl-11 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 placeholder:text-gray-400 transition-all"
            />
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>
      </header>

      {/* --- Hero Banner --- */}
      <section className="relative w-full h-72 bg-gray-900 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-gray-900 to-red-900 flex items-center justify-between p-6 text-white px-8">
          <div className="flex flex-col justify-center h-full z-10">
            <div className="bg-red-600 w-fit px-3 py-1 rounded-full text-[10px] font-bold mb-4 animate-pulse">
              🔥 강력 추천 행사
            </div>
            <h2 className="text-3xl font-black leading-tight mb-3">
              주말 강력추천
              <br />
              <span className="text-red-500">한우 1++ 등심</span>
            </h2>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold leading-none">50% 할인</p>
              <span className="text-sm font-medium text-gray-400 line-through mb-0.5">
                120,000원
              </span>
            </div>
          </div>
          <div className="w-48 h-48 border-4 border-red-600/20 rounded-full absolute -right-12 -bottom-12 blur-sm"></div>
        </div>

        <div className="absolute bottom-6 left-8 flex gap-2">
          <div className="w-6 h-1.5 rounded-full bg-red-600"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
        </div>
      </section>

      {/* --- Flyer Banner Link --- */}
      <section className="px-4 mt-4">
        <div className="bg-black text-white rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-gray-200 cursor-pointer group hover:bg-gray-900 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform">
              <Megaphone size={20} fill="white" />
            </div>
            <div>
              <p className="font-bold text-base mb-0.5">종이 전단지 보기</p>
              <p className="text-xs text-gray-300">
                이번주 행사상품 80종 한눈에!
              </p>
            </div>
          </div>
          <ChevronRight
            size={20}
            className="text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all"
          />
        </div>
      </section>

      {/* --- Category Grid --- */}
      <section className="mt-8 px-4">
        <div className="grid grid-cols-5 gap-y-6">
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
              className="flex flex-col items-center gap-2 cursor-pointer group"
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-all
                  ${
                    idx === 0
                      ? "bg-red-50 border border-red-100 text-red-600 font-bold"
                      : "bg-gray-50 border border-gray-50 group-hover:bg-white group-hover:border-black"
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
                  idx === 0 ? "text-red-600" : "text-gray-600"
                }`}
              >
                {cate}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* --- Section: Time Sale --- */}
      <section className="mt-6 pl-4 border-t-[4px] border-gray-50 pt-4">
        <div className="flex items-center justify-between pr-6 mb-4">
          <h3 className="text-xl font-black text-black">
            ⚡ 지금 안사면 손해!
          </h3>
          <span className="text-xs font-bold text-red-600 cursor-pointer">
            더보기 &gt;
          </span>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 pr-4 no-scrollbar">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="min-w-[128px] w-[128px] flex flex-col group cursor-pointer"
            >
              <div className="aspect-square bg-gray-50 rounded-2xl relative mb-3 overflow-hidden border border-gray-100 group-hover:border-red-600 transition-colors">
                <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50 text-xs font-medium">
                  IMAGE
                </div>
                {item <= 2 && (
                  <span className="absolute top-0 left-0 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-br-xl z-10">
                    품절임박
                  </span>
                )}
                <button className="absolute bottom-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-100 text-black hover:bg-red-600 hover:text-white hover:border-red-600 transition-all">
                  <Plus size={16} strokeWidth={3} />
                </button>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-1 font-medium">
                  국내산/성주
                </p>
                <h4 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 mb-1 h-10">
                  [진로] 당도선별 꿀참외 1.5kg 박스
                </h4>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black text-red-600">9,900</span>
                  <span className="text-xs font-medium text-gray-400 line-through">
                    15,000
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- Section: Fruit & Vegetables --- */}
      <section className="mt-2 pl-4 border-t-[4px] border-gray-50 pt-4">
        <div className="flex items-center justify-between pr-6 mb-4">
          <h3 className="text-xl font-black text-black">
            🍎 당도최고! 제철 청과
          </h3>
          <span className="text-xs font-bold text-red-600 cursor-pointer">
            더보기 &gt;
          </span>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 pr-4 no-scrollbar">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="min-w-[128px] w-[128px] flex flex-col group cursor-pointer"
            >
              <div className="aspect-square bg-gray-50 rounded-2xl relative mb-3 overflow-hidden border border-gray-100 group-hover:border-red-600 transition-colors">
                <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50 text-xs font-medium">
                  FRUIT
                </div>
                <button className="absolute bottom-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-100 text-black hover:bg-red-600 hover:text-white hover:border-red-600 transition-all">
                  <Plus size={16} strokeWidth={3} />
                </button>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-1 font-medium">
                  국내산/특
                </p>
                <h4 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 mb-2 h-10">
                  고랭지 세척사과 1.2kg 봉지
                </h4>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black text-red-600">8,900</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- Section: Meat --- */}
      <section className="mt-2 pl-4 border-t-[4px] border-gray-50 pt-4">
        <div className="flex items-center justify-between pr-6 mb-4">
          <h3 className="text-xl font-black text-black">
            🥩 믿고 먹는 정육 코너
          </h3>
          <span className="text-xs font-bold text-red-600 cursor-pointer">
            더보기 &gt;
          </span>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 pr-4 no-scrollbar">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="min-w-[128px] w-[128px] flex flex-col group cursor-pointer"
            >
              <div className="aspect-square bg-gray-50 rounded-2xl relative mb-3 overflow-hidden border border-gray-100 group-hover:border-red-600 transition-colors">
                <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50 text-xs font-medium">
                  MEAT
                </div>
                {item <= 2 && (
                  <span className="absolute top-0 left-0 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-br-xl z-10">
                    한정수량
                  </span>
                )}
                <button className="absolute bottom-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-100 text-black hover:bg-red-600 hover:text-white hover:border-red-600 transition-all">
                  <Plus size={16} strokeWidth={3} />
                </button>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-1 font-medium">
                  한돈/1등급
                </p>
                <h4 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 mb-2 h-10">
                  한돈 1등급 삼겹살 구이용 500g
                </h4>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black text-red-600">
                    12,900
                  </span>
                  <span className="text-xs font-medium text-gray-400 line-through">
                    16,500
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- Footer Info --- */}
      <footer className="bg-gray-100 px-6 py-6 mt-4 text-[11px] text-gray-500 leading-relaxed border-t border-gray-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h5 className="font-bold text-gray-700 text-sm mb-1">고객센터</h5>
            <p className="text-xl font-black text-gray-900 mb-1">
              031) 411-0988
            </p>
            <p>
              <span className="text-xs font-bold text-gray-600">
                영업 시간:{" "}
              </span>
              <span className="text-xs">08:00 - 22:00</span>
            </p>
          </div>
          <button className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm">
            전화걸기
          </button>
        </div>

        <hr className="border-gray-200 my-4" />

        <div className="space-y-1">
          <p>
            <span className="font-bold text-gray-600">상호명:</span> 진로마트
            목감점
          </p>
          <p>
            <span className="font-bold text-gray-600">대표자:</span> 양웅철 |{" "}
            <span className="font-bold text-gray-600">사업자번호:</span> 031)
            411-0988
          </p>
          <p>
            <span className="font-bold text-gray-600">주소:</span> 경기도 시흥시
            목감동 244-1
          </p>
        </div>
        <p className="mt-6 text-gray-300 font-montserrat">
          © 2026 Jinro Mart Mokgam. All rights reserved.
        </p>
      </footer>

      {/* --- Bottom Navigation (5 Cols) --- */}
      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white border-t border-gray-100 grid grid-cols-5 h-16 pb-2 z-50 text-[10px] font-medium text-gray-400 safe-area-bottom">
        <div className="flex flex-col items-center justify-center gap-1 text-red-600 font-bold cursor-pointer">
          <Home size={24} className="stroke-[2.5]" />
          <span>홈</span>
        </div>

        <div className="flex flex-col items-center justify-center gap-1 hover:text-gray-900 cursor-pointer transition-colors">
          <Menu size={24} />
          <span>카테고리</span>
        </div>

        <div className="flex flex-col items-center justify-center gap-1 hover:text-gray-900 cursor-pointer transition-colors group">
          <div className="bg-gray-50 rounded-full p-1 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
            <Search size={22} className="stroke-[2.5]" />
          </div>
          <span className="group-hover:text-red-600">검색</span>
        </div>

        <div className="flex flex-col items-center justify-center gap-1 hover:text-gray-900 cursor-pointer transition-colors">
          <Megaphone size={24} />
          <span>전단행사</span>
        </div>

        <div className="flex flex-col items-center justify-center gap-1 hover:text-gray-900 cursor-pointer transition-colors">
          <User size={24} />
          <span>내 정보</span>
        </div>
      </nav>
    </div>
  );
}
