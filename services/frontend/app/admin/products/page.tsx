"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { clearAdminToken, readAdminToken } from "@/lib/admin-session-client";
import { createAdminProduct, getAdminProducts, updateAdminInventory } from "@/lib/market-api";
import type { Product } from "@/lib/market-types";

function formatPrice(value: string): string {
  return `${new Intl.NumberFormat("ko-KR").format(Number(value))}원`;
}

export default function AdminProductsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [inventoryDrafts, setInventoryDrafts] = useState<Record<number, { stockQty: string; maxPerOrder: string }>>({});

  const [createForm, setCreateForm] = useState({
    categoryId: "",
    name: "",
    sku: "",
    description: "",
    unitLabel: "ea",
    originCountry: "",
    storageMethod: "",
    isWeightItem: false,
    basePrice: "",
    salePrice: "",
    stockQty: "0",
    maxPerOrder: "10",
  });

  useEffect(() => {
    const savedToken = readAdminToken();
    if (!savedToken) {
      router.replace("/admin/login");
      return;
    }
    setToken(savedToken);
  }, [router]);

  async function loadProducts(nextToken: string): Promise<void> {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await getAdminProducts(nextToken);
      setProducts(result);
      setInventoryDrafts(
        Object.fromEntries(
          result.map((product) => [
            product.id,
            {
              stockQty: String(product.stock_qty),
              maxPerOrder: String(product.max_per_order),
            },
          ]),
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "상품 목록을 불러오지 못했습니다.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      return;
    }
    void loadProducts(token);
  }, [token]);

  function logout(): void {
    clearAdminToken();
    router.push("/admin/login");
  }

  async function submitCreate(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!token) {
      return;
    }

    try {
      await createAdminProduct(token, {
        category_id: createForm.categoryId.trim() ? Number(createForm.categoryId) : null,
        name: createForm.name.trim(),
        sku: createForm.sku.trim(),
        description: createForm.description.trim() || undefined,
        unit_label: createForm.unitLabel.trim() || "ea",
        origin_country: createForm.originCountry.trim() || undefined,
        storage_method: createForm.storageMethod.trim() || undefined,
        is_weight_item: createForm.isWeightItem,
        base_price: createForm.basePrice.trim(),
        sale_price: createForm.salePrice.trim() || null,
        stock_qty: Number(createForm.stockQty) || 0,
        max_per_order: Number(createForm.maxPerOrder) || 10,
      });
      setCreateForm({
        categoryId: "",
        name: "",
        sku: "",
        description: "",
        unitLabel: "ea",
        originCountry: "",
        storageMethod: "",
        isWeightItem: false,
        basePrice: "",
        salePrice: "",
        stockQty: "0",
        maxPerOrder: "10",
      });
      await loadProducts(token);
      setInfoMessage("상품을 등록했습니다.");
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "상품 등록에 실패했습니다.";
      setErrorMessage(message);
    }
  }

  async function applyInventory(productId: number): Promise<void> {
    if (!token) {
      return;
    }
    const draft = inventoryDrafts[productId];
    if (!draft) {
      return;
    }
    try {
      const updated = await updateAdminInventory(token, productId, {
        stock_qty: Number(draft.stockQty),
        max_per_order: Number(draft.maxPerOrder),
      });
      setProducts((prev) => prev.map((product) => (product.id === updated.id ? updated : product)));
      setInfoMessage("재고/수량 제한을 업데이트했습니다.");
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "재고 업데이트에 실패했습니다.";
      setErrorMessage(message);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#1a2f27] px-4 py-6">
      <section className="mx-auto max-w-7xl rounded-3xl border border-[#d8ddd3] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-black">상품 관리</h1>
            <p className="text-sm text-[#60756c]">상품 등록과 재고/수량 제한을 관리합니다.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/orders" className="rounded-xl border border-[#d8ddd3] px-3 py-2 text-sm font-bold">
              주문관리
            </Link>
            <Link href="/admin/content" className="rounded-xl border border-[#d8ddd3] px-3 py-2 text-sm font-bold">
              콘텐츠관리
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-[#d8ddd3] px-3 py-2 text-sm font-bold hover:bg-[#f4f6f5]"
            >
              로그아웃
            </button>
          </div>
        </div>

        {infoMessage && <p className="mb-3 rounded-xl bg-[#e9f8f0] px-3 py-2 text-sm font-semibold text-[#146341]">{infoMessage}</p>}
        {errorMessage && <p className="mb-3 rounded-xl bg-[#ffeceb] px-3 py-2 text-sm font-semibold text-[#8e3a30]">{errorMessage}</p>}

        <section className="rounded-2xl border border-[#d8ddd3] p-4">
          <h2 className="text-lg font-black">상품 등록</h2>
          <form className="mt-3 grid gap-2 md:grid-cols-4" onSubmit={(event) => void submitCreate(event)}>
            <input
              value={createForm.categoryId}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, categoryId: event.target.value }))}
              placeholder="카테고리ID(선택)"
              className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
            />
            <input
              required
              value={createForm.name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="상품명"
              className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
            />
            <input
              required
              value={createForm.sku}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, sku: event.target.value }))}
              placeholder="SKU"
              className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
            />
            <input
              value={createForm.unitLabel}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, unitLabel: event.target.value }))}
              placeholder="단위(ea/봉/100g)"
              className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
            />
            <input
              value={createForm.originCountry}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, originCountry: event.target.value }))}
              placeholder="원산지"
              className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
            />
            <input
              value={createForm.storageMethod}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, storageMethod: event.target.value }))}
              placeholder="보관방법"
              className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
            />
            <input
              required
              value={createForm.basePrice}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, basePrice: event.target.value }))}
              placeholder="기본가"
              className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
            />
            <input
              value={createForm.salePrice}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, salePrice: event.target.value }))}
              placeholder="할인가(선택)"
              className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
            />
            <input
              value={createForm.stockQty}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, stockQty: event.target.value }))}
              type="number"
              min={0}
              placeholder="재고"
              className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
            />
            <input
              value={createForm.maxPerOrder}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, maxPerOrder: event.target.value }))}
              type="number"
              min={1}
              placeholder="최대구매수량"
              className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
            />
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={createForm.isWeightItem}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, isWeightItem: event.target.checked }))}
              />
              중량상품
            </label>
            <input
              value={createForm.description}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="설명(선택)"
              className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm md:col-span-2"
            />
            <button type="submit" className="rounded-lg bg-[#166847] px-3 py-1 text-sm font-bold text-white">
              상품 등록
            </button>
          </form>
        </section>

        <section className="mt-4 rounded-2xl border border-[#d8ddd3] p-4">
          <h2 className="text-lg font-black">상품 목록 / 재고 업데이트</h2>
          {loading && <p className="mt-2 text-sm text-[#60756c]">상품을 불러오는 중입니다...</p>}
          {!loading && (
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#d8ddd3] text-left">
                    <th className="px-2 py-2">ID</th>
                    <th className="px-2 py-2">SKU</th>
                    <th className="px-2 py-2">상품명</th>
                    <th className="px-2 py-2">판매가</th>
                    <th className="px-2 py-2">재고</th>
                    <th className="px-2 py-2">최대수량</th>
                    <th className="px-2 py-2">적용</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-[#eef1eb]">
                      <td className="px-2 py-2">{product.id}</td>
                      <td className="px-2 py-2">{product.sku}</td>
                      <td className="px-2 py-2">{product.name}</td>
                      <td className="px-2 py-2">{formatPrice(product.effective_price)}</td>
                      <td className="px-2 py-2">
                        <input
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
                          type="number"
                          min={0}
                          className="w-20 rounded-lg border border-[#d8ddd3] px-2 py-1"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
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
                          type="number"
                          min={1}
                          className="w-20 rounded-lg border border-[#d8ddd3] px-2 py-1"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => void applyInventory(product.id)}
                          className="rounded-lg bg-[#166847] px-3 py-1 font-bold text-white"
                        >
                          저장
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!products.length && (
                    <tr>
                      <td className="px-2 py-3 text-[#60756c]" colSpan={7}>
                        등록된 상품이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
