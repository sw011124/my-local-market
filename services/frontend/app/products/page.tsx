import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";

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
    <main className="min-h-screen bg-[#f6f6f7] px-4 py-5 text-black">
      <section className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-500">Product Market</p>
              <h1 className="text-2xl font-black md:text-3xl">상품 목록</h1>
            </div>
            <Link className="text-sm font-bold text-red-600 transition-colors hover:text-red-500" href="/">
              홈으로
            </Link>
          </div>

          <form className="grid gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-3 md:grid-cols-[1.2fr_1fr_1fr_auto]" method="get">
            <label className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                name="q"
                defaultValue={params.q ?? ""}
                className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                placeholder="상품 검색"
              />
            </label>
            <select
              name="categoryId"
              defaultValue={params.categoryId ?? ""}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
            >
              <option value="">전체 카테고리</option>
              {home.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              name="sort"
              defaultValue={params.sort ?? "popular"}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
            >
              <option value="popular">인기순</option>
              <option value="new">신상품순</option>
              <option value="priceAsc">가격 낮은순</option>
              <option value="priceDesc">가격 높은순</option>
            </select>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-extrabold text-white transition hover:bg-red-500"
            >
              <SlidersHorizontal size={16} />
              검색
            </button>
          </form>
        </header>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {products.length === 0 && (
            <article className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
              검색 조건에 맞는 상품이 없습니다.
            </article>
          )}
          {products.map((product) => (
            <article
              key={product.id}
              className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200"
            >
              <div className="mb-3 aspect-square rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white" />
              <p className="text-xs font-semibold text-gray-500">{product.category_name ?? "기타"}</p>
              <h2 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-gray-900">{product.name}</h2>
              <p className="mt-2 text-xs text-gray-500">
                {product.unit_label} | 재고 {product.stock_qty}
              </p>
              <p className="mt-2 text-lg font-black text-red-600">{formatPrice(product.effective_price)}</p>
              {product.sale_price && <p className="text-xs font-semibold text-red-500">행사가 적용 상품</p>}
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/products/${product.id}`}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:border-red-300 hover:text-red-600"
                >
                  상세보기
                </Link>
                <Link
                  href={`/cart?addProductId=${product.id}&qty=1`}
                  className="inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-red-500"
                >
                  담기
                </Link>
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
