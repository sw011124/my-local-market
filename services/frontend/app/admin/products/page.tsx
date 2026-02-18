"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  LogOut,
  PackageSearch,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  XCircle,
} from "lucide-react";

import { clearAdminToken, readAdminToken } from "@/lib/admin-session-client";
import { getAdminOrders, getAdminProducts, updateAdminInventory } from "@/lib/market-api";
import type { OrderResponse, Product } from "@/lib/market-types";

function formatPrice(value: string): string {
  return `${new Intl.NumberFormat("ko-KR").format(Number(value))}원`;
}

function toNumber(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function calculateDiscountRate(product: Product): number | null {
  const base = toNumber(product.base_price);
  const sale = toNumber(product.sale_price);
  if (!base || !sale || sale >= base) {
    return null;
  }
  return Math.round(((base - sale) / base) * 100);
}

export default function AdminProductsPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [inventoryDrafts, setInventoryDrafts] = useState<Record<number, { stockQty: string; maxPerOrder: string }>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = readAdminToken();
    if (!savedToken) {
      router.replace("/admin/login");
      return;
    }
    setToken(savedToken);
  }, [router]);

  async function loadDashboard(nextToken: string): Promise<void> {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [productsResult, ordersResult] = await Promise.allSettled([getAdminProducts(nextToken), getAdminOrders(nextToken)]);

      if (productsResult.status === "fulfilled") {
        const productList = productsResult.value;
        setProducts(productList);
        setInventoryDrafts(
          Object.fromEntries(
            productList.map((product) => [
              product.id,
              {
                stockQty: String(product.stock_qty),
                maxPerOrder: String(product.max_per_order),
              },
            ]),
          ),
        );
      } else {
        throw productsResult.reason;
      }

      if (ordersResult.status === "fulfilled") {
        setOrders(ordersResult.value);
      } else {
        setOrders([]);
        setInfoMessage("주문 통계는 일시적으로 불러오지 못했습니다.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "상품 대시보드를 불러오지 못했습니다.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      return;
    }
    void loadDashboard(token);
  }, [token]);

  const filteredProducts = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) {
      return products;
    }
    return products.filter((product) => {
      const searchable = [product.name, product.sku, product.category_name ?? ""]
        .join(" ")
        .toLowerCase();
      return searchable.includes(keyword);
    });
  }, [products, searchKeyword]);

  const dashboardStats = useMemo(() => {
    const completedOrders = orders.filter((order) => order.status !== "CANCELED");
    const totalSales = completedOrders.reduce((sum, order) => sum + Number(order.total_final ?? order.total_estimated), 0);
    const totalOrders = orders.length;
    const activeProducts = products.filter((product) => product.status === "ACTIVE").length;
    const lowStockProducts = products.filter((product) => product.stock_qty <= 10).length;

    return {
      totalSales,
      totalOrders,
      activeProducts,
      lowStockProducts,
    };
  }, [orders, products]);

  function logout(): void {
    clearAdminToken();
    router.push("/admin/login");
  }

  function beginEdit(product: Product): void {
    setEditingProductId(product.id);
    setInventoryDrafts((prev) => ({
      ...prev,
      [product.id]: {
        stockQty: prev[product.id]?.stockQty ?? String(product.stock_qty),
        maxPerOrder: prev[product.id]?.maxPerOrder ?? String(product.max_per_order),
      },
    }));
  }

  function cancelEdit(product: Product): void {
    setEditingProductId(null);
    setInventoryDrafts((prev) => ({
      ...prev,
      [product.id]: {
        stockQty: String(product.stock_qty),
        maxPerOrder: String(product.max_per_order),
      },
    }));
  }

  async function saveInventory(productId: number): Promise<void> {
    if (!token) {
      return;
    }

    const draft = inventoryDrafts[productId];
    if (!draft) {
      return;
    }

    try {
      const updated = await updateAdminInventory(token, productId, {
        stock_qty: Math.max(0, Number(draft.stockQty) || 0),
        max_per_order: Math.max(1, Number(draft.maxPerOrder) || 1),
      });

      setProducts((prev) => prev.map((product) => (product.id === updated.id ? updated : product)));
      setEditingProductId(null);
      setInfoMessage("상품 재고 정보를 저장했습니다.");
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "재고 저장에 실패했습니다.";
      setErrorMessage(message);
    }
  }

  function showDeleteNotice(): void {
    setInfoMessage("삭제 API는 아직 준비 중입니다. 현재는 재고 0 또는 상태 변경으로 관리해 주세요.");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 text-gray-900">
      <section className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-2xl bg-gray-900 p-5 text-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-300">Mart POS Admin</p>
              <h1 className="mt-1 text-2xl font-black">상품 대시보드</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link href="/admin/orders" className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold text-white/90 transition hover:bg-white/10">
                주문 관리
              </Link>
              <Link href="/admin/content" className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold text-white/90 transition hover:bg-white/10">
                콘텐츠 관리
              </Link>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold text-white/90 transition hover:bg-white/10"
              >
                <LogOut size={14} />
                로그아웃
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label className="relative min-w-60 flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder="상품명, SKU, 카테고리 검색"
                className="h-11 w-full rounded-xl border border-gray-700 bg-gray-800 pl-9 pr-3 text-sm text-white placeholder:text-gray-400 focus:border-red-500 focus:outline-none"
              />
            </label>

            <Link
              href="/admin/products/new"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-black px-4 text-sm font-extrabold text-white ring-1 ring-white/15 transition hover:bg-gray-800"
            >
              <Plus size={16} />
              Register Product
            </Link>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500">총 매출 (예상)</p>
            <p className="mt-2 text-2xl font-black text-gray-900">{formatPrice(String(Math.round(dashboardStats.totalSales)))}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-red-600">
              <TrendingUp size={14} /> +8.4% WoW
            </p>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500">주문 건수</p>
            <p className="mt-2 text-2xl font-black text-gray-900">{dashboardStats.totalOrders.toLocaleString("ko-KR")}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
              <TrendingUp size={14} /> +4.2% WoW
            </p>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500">활성 상품</p>
            <p className="mt-2 text-2xl font-black text-gray-900">{dashboardStats.activeProducts.toLocaleString("ko-KR")}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-orange-600">
              <TrendingDown size={14} /> -1.0% WoW
            </p>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500">저재고 주의</p>
            <p className="mt-2 text-2xl font-black text-gray-900">{dashboardStats.lowStockProducts.toLocaleString("ko-KR")}</p>
            <p className="mt-1 text-xs font-semibold text-orange-600">재고 10개 이하 상품</p>
          </article>
        </section>

        {infoMessage && <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">{infoMessage}</p>}
        {errorMessage && <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errorMessage}</p>}

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">상품</th>
                  <th className="px-4 py-3">가격</th>
                  <th className="px-4 py-3 text-center">배송</th>
                  <th className="px-4 py-3 text-center">활성</th>
                  <th className="px-4 py-3">재고</th>
                  <th className="px-4 py-3">제한</th>
                  <th className="px-4 py-3 text-right">작업</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                      상품 데이터를 불러오는 중입니다...
                    </td>
                  </tr>
                )}

                {!loading && filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                )}

                {!loading &&
                  filteredProducts.map((product) => {
                    const discount = calculateDiscountRate(product);
                    const isEditing = editingProductId === product.id;
                    const deliveryEnabled = product.status === "ACTIVE" && product.stock_qty > 0;
                    const isActive = product.status === "ACTIVE";

                    return (
                      <tr key={product.id} className="group border-t border-gray-100 transition hover:bg-gray-50/70">
                        <td className="px-4 py-3 align-top">
                          <p className="font-bold text-gray-900">{product.name}</p>
                          <p className="mt-0.5 text-xs text-gray-500">SKU {product.sku}</p>
                        </td>

                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center gap-2">
                            <strong className="text-base font-black text-gray-900">{formatPrice(product.effective_price)}</strong>
                            {discount && (
                              <span className="rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">-{discount}%</span>
                            )}
                          </div>
                          {discount && <p className="text-xs text-gray-400 line-through">{formatPrice(product.base_price)}</p>}
                        </td>

                        <td className="px-4 py-3 text-center align-top">
                          <span className="inline-flex" title={deliveryEnabled ? "배송 가능" : "배송 불가"}>
                            <Truck size={17} className={deliveryEnabled ? "text-blue-600" : "text-gray-400"} />
                            <span className="sr-only">{deliveryEnabled ? "배송 가능" : "배송 불가"}</span>
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center align-top">
                          <span className="inline-flex" title={isActive ? "활성" : "비활성"}>
                            {isActive ? <CheckCircle2 size={17} className="text-green-600" /> : <XCircle size={17} className="text-gray-400" />}
                            <span className="sr-only">{isActive ? "활성" : "비활성"}</span>
                          </span>
                        </td>

                        <td className="px-4 py-3 align-top">
                          {isEditing ? (
                            <input
                              type="number"
                              min={0}
                              value={inventoryDrafts[product.id]?.stockQty ?? String(product.stock_qty)}
                              onChange={(event) =>
                                setInventoryDrafts((prev) => ({
                                  ...prev,
                                  [product.id]: {
                                    stockQty: event.target.value,
                                    maxPerOrder: prev[product.id]?.maxPerOrder ?? String(product.max_per_order),
                                  },
                                }))
                              }
                              className="no-spin h-9 w-20 rounded-lg border border-gray-200 px-2 text-sm focus:border-red-500 focus:outline-none"
                            />
                          ) : (
                            <span className="font-semibold text-gray-800">{product.stock_qty}</span>
                          )}
                        </td>

                        <td className="px-4 py-3 align-top">
                          {isEditing ? (
                            <input
                              type="number"
                              min={1}
                              value={inventoryDrafts[product.id]?.maxPerOrder ?? String(product.max_per_order)}
                              onChange={(event) =>
                                setInventoryDrafts((prev) => ({
                                  ...prev,
                                  [product.id]: {
                                    stockQty: prev[product.id]?.stockQty ?? String(product.stock_qty),
                                    maxPerOrder: event.target.value,
                                  },
                                }))
                              }
                              className="no-spin h-9 w-20 rounded-lg border border-gray-200 px-2 text-sm focus:border-red-500 focus:outline-none"
                            />
                          ) : (
                            <span className="font-semibold text-gray-800">{product.max_per_order}</span>
                          )}
                        </td>

                        <td className="px-4 py-3 align-top">
                          <div className="flex justify-end">
                            <div className="flex items-center gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                              {!isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => beginEdit(product)}
                                    className="inline-flex h-8 items-center gap-1 rounded-md border border-gray-200 px-2 text-xs font-bold text-gray-700 transition hover:border-gray-900 hover:text-gray-900"
                                  >
                                    <Pencil size={13} />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={showDeleteNotice}
                                    className="inline-flex h-8 items-center gap-1 rounded-md border border-gray-200 px-2 text-xs font-bold text-gray-500 transition hover:border-red-300 hover:text-red-600"
                                  >
                                    <Trash2 size={13} />
                                    Delete
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => void saveInventory(product.id)}
                                    className="inline-flex h-8 items-center rounded-md bg-gray-900 px-2 text-xs font-bold text-white transition hover:bg-black"
                                  >
                                    저장
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => cancelEdit(product)}
                                    className="inline-flex h-8 items-center rounded-md border border-gray-200 px-2 text-xs font-bold text-gray-600 transition hover:border-gray-300"
                                  >
                                    취소
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {!loading && filteredProducts.length > 0 && (
            <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3 text-xs text-gray-500">
              <p>총 {filteredProducts.length}개 상품</p>
              <p className="inline-flex items-center gap-1">
                <PackageSearch size={14} /> Hover 시 빠른 편집 버튼이 노출됩니다.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
