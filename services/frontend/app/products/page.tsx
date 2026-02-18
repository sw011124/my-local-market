import Link from "next/link";

import { getHomeData, getProducts } from "@/lib/market-api";
import type { ProductQuery } from "@/lib/market-types";

type ProductsPageProps = {
  searchParams?: Promise<{
    categoryId?: string;
    q?: string;
    sort?: "popular" | "new" | "priceAsc" | "priceDesc";
  }>;
};

function formatPrice(value: string): string {
  return `${new Intl.NumberFormat("ko-KR").format(Number(value))}원`;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = (await searchParams) ?? {};

  const query: ProductQuery = {
    categoryId: params.categoryId ? Number(params.categoryId) : undefined,
    q: params.q,
    sort: params.sort ?? "popular",
  };

  const [home, products] = await Promise.all([getHomeData(), getProducts(query)]);

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#1a2f27]">
      <header className="border-b border-[#d8ddd3] bg-white px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-2xl font-black">상품 목록</h1>
          <Link className="text-sm font-bold text-[#166847]" href="/">
            홈으로
          </Link>
        </div>
      </header>

      <section className="mx-auto mt-4 max-w-6xl px-4">
        <form className="grid gap-2 rounded-2xl border border-[#d8ddd3] bg-white p-3 md:grid-cols-[1.2fr_1fr_1fr_auto]" method="get">
          <input
            name="q"
            defaultValue={params.q ?? ""}
            className="rounded-xl border border-[#d8ddd3] px-3 py-2 text-sm"
            placeholder="상품 검색"
          />
          <select name="categoryId" defaultValue={params.categoryId ?? ""} className="rounded-xl border border-[#d8ddd3] px-3 py-2 text-sm">
            <option value="">전체 카테고리</option>
            {home.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select name="sort" defaultValue={params.sort ?? "popular"} className="rounded-xl border border-[#d8ddd3] px-3 py-2 text-sm">
            <option value="popular">인기순</option>
            <option value="new">신상품순</option>
            <option value="priceAsc">가격 낮은순</option>
            <option value="priceDesc">가격 높은순</option>
          </select>
          <button type="submit" className="rounded-xl bg-[#166847] px-4 py-2 text-sm font-extrabold text-white">
            검색
          </button>
        </form>
      </section>

      <section className="mx-auto mt-4 max-w-6xl px-4 pb-16">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {products.length === 0 && (
            <article className="rounded-2xl border border-[#d8ddd3] bg-white p-4 text-sm text-[#5a6c64]">검색 조건에 맞는 상품이 없습니다.</article>
          )}
          {products.map((product) => (
            <article key={product.id} className="rounded-2xl border border-[#d8ddd3] bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-[#6a7e74]">{product.category_name ?? "기타"}</p>
              <h2 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-5">{product.name}</h2>
              <p className="mt-2 text-xs text-[#6a7e74]">
                {product.unit_label} | 재고 {product.stock_qty}
              </p>
              <p className="mt-2 text-lg font-black text-[#145c3f]">{formatPrice(product.effective_price)}</p>
              {product.sale_price && <p className="text-xs text-[#a07438]">행사가 적용 상품</p>}
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/products/${product.id}`}
                  className="inline-flex items-center justify-center rounded-lg border border-[#d8ddd3] px-3 py-1.5 text-xs font-bold"
                >
                  상세보기
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
      </section>
    </main>
  );
}
