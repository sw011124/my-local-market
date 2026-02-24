import Link from "next/link";
import {
  BadgePercent,
  Flame,
  Heart,
  ReceiptText,
  Repeat2,
  ScanSearch,
  Sparkles,
  TicketPercent,
} from "lucide-react";

const QUICK_ACTIONS = [
  { href: "/products?promo=true", label: "전단", icon: TicketPercent },
  { href: "/products?promo=true", label: "특가", icon: BadgePercent },
  { href: "/products?sort=popular", label: "베스트", icon: Flame },
  { href: "/products?sort=new", label: "신상품", icon: Sparkles },
  { href: "/products?sort=popular", label: "재구매", icon: Repeat2 },
  { href: "/products", label: "찜", icon: Heart },
  { href: "/products?q=", label: "검색", icon: ScanSearch },
  { href: "/orders/complete-preview", label: "완료미리보기", icon: ReceiptText },
];

export default function HomeQuickActions() {
  return (
    <section className="rounded-2xl bg-white p-4 md:p-5">
      <div className="mb-3">
        <h3 className="text-base font-black text-gray-900 md:text-lg">
          빠른 메뉴
        </h3>
        <p className="mt-1 text-sm font-medium text-gray-500">
          자주 쓰는 메뉴를 빠르게 이동하세요
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="group flex min-h-14 flex-col items-center justify-center rounded-xl bg-gray-50 px-1 py-2 text-center text-[12px] font-semibold text-gray-700 transition hover:bg-red-50 hover:text-red-600"
              title={action.label}
            >
              <Icon size={19} className="mb-1.5" />
              <span className="w-full truncate">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
