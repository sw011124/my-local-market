"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, PackagePlus } from "lucide-react";

import { readAdminToken } from "@/lib/admin-session-client";
import { createAdminProduct, getHomeData } from "@/lib/market-api";
import type { Category } from "@/lib/market-types";

type SourceType = "origin" | "manufacturer";

type LeafNode = {
  id: string;
  name: string;
  categoryId: number | null;
};

type MidNode = {
  id: string;
  name: string;
  items: LeafNode[];
};

type ParentNode = {
  id: string;
  name: string;
  categoryId: number | null;
  children: MidNode[];
};

function buildCategoryTree(categories: Category[]): ParentNode[] {
  if (categories.length === 0) {
    return [
      {
        id: "fallback-fruit",
        name: "과일·채소",
        categoryId: 1,
        children: [
          {
            id: "fallback-fruit-fresh",
            name: "과일",
            items: [
              { id: "fallback-fruit-apple", name: "사과/배", categoryId: 1 },
              { id: "fallback-fruit-citrus", name: "감귤/오렌지", categoryId: 1 },
            ],
          },
        ],
      },
    ];
  }

  return categories.map((category) => {
    const baseId = `cat-${category.id}`;

    if (category.name.includes("과일") || category.name.includes("채소")) {
      return {
        id: baseId,
        name: category.name,
        categoryId: category.id,
        children: [
          {
            id: `${baseId}-fruit`,
            name: "과일",
            items: [
              { id: `${baseId}-apple`, name: "사과/배", categoryId: category.id },
              { id: `${baseId}-citrus`, name: "감귤/오렌지", categoryId: category.id },
              { id: `${baseId}-berry`, name: "베리류", categoryId: category.id },
            ],
          },
          {
            id: `${baseId}-veg`,
            name: "채소",
            items: [
              { id: `${baseId}-leaf`, name: "엽채류", categoryId: category.id },
              { id: `${baseId}-root`, name: "뿌리채소", categoryId: category.id },
              { id: `${baseId}-salad`, name: "샐러드", categoryId: category.id },
            ],
          },
        ],
      };
    }

    if (category.name.includes("정육")) {
      return {
        id: baseId,
        name: category.name,
        categoryId: category.id,
        children: [
          {
            id: `${baseId}-pork`,
            name: "돼지고기",
            items: [
              { id: `${baseId}-samgyeop`, name: "삼겹살", categoryId: category.id },
              { id: `${baseId}-neck`, name: "목살", categoryId: category.id },
              { id: `${baseId}-frontleg`, name: "앞다리", categoryId: category.id },
            ],
          },
          {
            id: `${baseId}-beef`,
            name: "소고기",
            items: [
              { id: `${baseId}-sirloin`, name: "등심", categoryId: category.id },
              { id: `${baseId}-brisket`, name: "차돌", categoryId: category.id },
              { id: `${baseId}-stew`, name: "국거리", categoryId: category.id },
            ],
          },
        ],
      };
    }

    if (category.name.includes("냉동")) {
      return {
        id: baseId,
        name: category.name,
        categoryId: category.id,
        children: [
          {
            id: `${baseId}-meal`,
            name: "간편식",
            items: [
              { id: `${baseId}-dumpling`, name: "만두", categoryId: category.id },
              { id: `${baseId}-friedrice`, name: "볶음밥", categoryId: category.id },
              { id: `${baseId}-pizza`, name: "피자", categoryId: category.id },
            ],
          },
          {
            id: `${baseId}-frozen`,
            name: "냉동재료",
            items: [
              { id: `${baseId}-seafood`, name: "냉동 수산", categoryId: category.id },
              { id: `${baseId}-meat`, name: "냉동 정육", categoryId: category.id },
              { id: `${baseId}-vegetable`, name: "냉동 채소", categoryId: category.id },
            ],
          },
        ],
      };
    }

    return {
      id: baseId,
      name: category.name,
      categoryId: category.id,
      children: [
        {
          id: `${baseId}-daily`,
          name: "생활",
          items: [
            { id: `${baseId}-kitchen`, name: "주방", categoryId: category.id },
            { id: `${baseId}-clean`, name: "세제/청소", categoryId: category.id },
            { id: `${baseId}-bath`, name: "욕실용품", categoryId: category.id },
          ],
        },
        {
          id: `${baseId}-grocery`,
          name: "가공식품",
          items: [
            { id: `${baseId}-snack`, name: "간식", categoryId: category.id },
            { id: `${baseId}-drink`, name: "음료", categoryId: category.id },
            { id: `${baseId}-ramen`, name: "라면", categoryId: category.id },
          ],
        },
      ],
    };
  });
}

function toNumber(value: string): number | null {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}

export default function AdminProductNewPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [loadingCategory, setLoadingCategory] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [sourceType, setSourceType] = useState<SourceType>("origin");
  const [sourceValue, setSourceValue] = useState("");
  const [deliveryAvailable, setDeliveryAvailable] = useState(true);

  const [categoryTree, setCategoryTree] = useState<ParentNode[]>([]);
  const [selectedParentIndex, setSelectedParentIndex] = useState(0);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [selectedLeafIndex, setSelectedLeafIndex] = useState(0);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    unitLabel: "ea",
    storageMethod: "",
    basePrice: "",
    discountPrice: "",
    stockQty: "0",
    maxPerOrder: "10",
    isWeightItem: false,
  });

  useEffect(() => {
    const savedToken = readAdminToken();
    if (!savedToken) {
      router.replace("/admin/login");
      return;
    }
    setToken(savedToken);
  }, [router]);

  useEffect(() => {
    let mounted = true;

    async function loadCategories(): Promise<void> {
      setLoadingCategory(true);
      try {
        const homeData = await getHomeData();
        if (!mounted) {
          return;
        }

        const tree = buildCategoryTree(homeData.categories);
        setCategoryTree(tree);
        setSelectedParentIndex(0);
        setSelectedChildIndex(0);
        setSelectedLeafIndex(0);
      } catch {
        if (!mounted) {
          return;
        }

        setCategoryTree(buildCategoryTree([]));
        setErrorMessage("카테고리 데이터를 불러오지 못해 기본 분류로 표시합니다.");
      } finally {
        if (mounted) {
          setLoadingCategory(false);
        }
      }
    }

    void loadCategories();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedParent = categoryTree[selectedParentIndex] ?? null;
  const selectedChild = selectedParent?.children[selectedChildIndex] ?? null;
  const selectedLeaf = selectedChild?.items[selectedLeafIndex] ?? null;

  const selectedPathLabel = useMemo(() => {
    const parts = [selectedParent?.name, selectedChild?.name, selectedLeaf?.name].filter(Boolean);
    if (!parts.length) {
      return "미선택";
    }
    return parts.join(" > ");
  }, [selectedParent?.name, selectedChild?.name, selectedLeaf?.name]);

  const discountRate = useMemo(() => {
    const base = toNumber(form.basePrice);
    const discount = toNumber(form.discountPrice);
    if (!base || !discount || discount >= base) {
      return null;
    }
    return Math.round(((base - discount) / base) * 100);
  }, [form.basePrice, form.discountPrice]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!token) {
      return;
    }

    const basePrice = toNumber(form.basePrice);
    const discountPrice = toNumber(form.discountPrice);

    if (!basePrice || basePrice <= 0) {
      setErrorMessage("판매가는 0보다 큰 값을 입력해 주세요.");
      return;
    }

    if (discountPrice && discountPrice >= basePrice) {
      setErrorMessage("할인가는 판매가보다 작아야 합니다.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await createAdminProduct(token, {
        category_id: selectedLeaf?.categoryId ?? selectedParent?.categoryId ?? null,
        name: form.name.trim(),
        sku: form.sku.trim(),
        description: form.description.trim() || undefined,
        unit_label: form.unitLabel.trim() || "ea",
        origin_country: sourceValue.trim() || undefined,
        storage_method: form.storageMethod.trim() || undefined,
        is_weight_item: form.isWeightItem,
        base_price: form.basePrice,
        sale_price: form.discountPrice.trim() || null,
        stock_qty: Math.max(0, Number(form.stockQty) || 0),
        max_per_order: Math.max(1, Number(form.maxPerOrder) || 1),
      });

      setInfoMessage("상품이 등록되었습니다. 상품 목록으로 이동합니다.");

      setTimeout(() => {
        router.push("/admin/products");
      }, 500);
    } catch (error) {
      const message = error instanceof Error ? error.message : "상품 등록에 실패했습니다.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 text-gray-900">
      <section className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-2xl bg-gray-900 p-5 text-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-300">Mart POS Admin</p>
              <h1 className="mt-1 text-2xl font-black">상품 등록</h1>
            </div>

            <Link
              href="/admin/products"
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold text-white/90 transition hover:bg-white/10"
            >
              <ArrowLeft size={14} />
              목록으로
            </Link>
          </div>
        </header>

        {infoMessage && <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">{infoMessage}</p>}
        {errorMessage && <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errorMessage}</p>}

        <form className="grid gap-4 lg:grid-cols-[1.05fr_1.35fr]" onSubmit={(event) => void handleSubmit(event)}>
          <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-black text-gray-900">카테고리 선택</h2>
            <p className="mt-1 text-xs text-gray-500">3단계 분류에서 마지막 항목을 선택하세요.</p>

            <div className="mt-3 grid h-[430px] grid-cols-3 gap-2">
              <section className="overflow-y-auto rounded-xl border border-gray-200 scrollbar-hover">
                <h3 className="sticky top-0 z-10 border-b border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600">대분류</h3>
                <div className="p-2">
                  {loadingCategory && <p className="px-2 py-2 text-xs text-gray-500">로딩 중...</p>}
                  {categoryTree.map((parent, index) => {
                    const selected = index === selectedParentIndex;
                    return (
                      <button
                        type="button"
                        key={parent.id}
                        onClick={() => {
                          setSelectedParentIndex(index);
                          setSelectedChildIndex(0);
                          setSelectedLeafIndex(0);
                        }}
                        className={`mb-1 flex w-full items-center rounded-lg px-2 py-2 text-left text-xs font-semibold transition ${
                          selected ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {parent.name}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="overflow-y-auto rounded-xl border border-gray-200 scrollbar-hover">
                <h3 className="sticky top-0 z-10 border-b border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600">중분류</h3>
                <div className="p-2">
                  {(selectedParent?.children ?? []).map((child, index) => {
                    const selected = index === selectedChildIndex;
                    return (
                      <button
                        type="button"
                        key={child.id}
                        onClick={() => {
                          setSelectedChildIndex(index);
                          setSelectedLeafIndex(0);
                        }}
                        className={`mb-1 flex w-full items-center rounded-lg px-2 py-2 text-left text-xs font-semibold transition ${
                          selected ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {child.name}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="overflow-y-auto rounded-xl border border-gray-200 scrollbar-hover">
                <h3 className="sticky top-0 z-10 border-b border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600">최종</h3>
                <div className="p-2">
                  {(selectedChild?.items ?? []).map((leaf, index) => {
                    const selected = index === selectedLeafIndex;
                    return (
                      <button
                        type="button"
                        key={leaf.id}
                        onClick={() => setSelectedLeafIndex(index)}
                        className={`mb-1 flex w-full items-center rounded-lg px-2 py-2 text-left text-xs font-semibold transition ${
                          selected ? "bg-red-600 text-white" : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {leaf.name}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
              Category: <strong>{selectedPathLabel}</strong>
            </p>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-black text-gray-900">상세 정보 입력</h2>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-bold text-gray-600">상품명</span>
                <input
                  required
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="h-10 rounded-xl border border-gray-200 px-3 text-sm focus:border-red-500 focus:outline-none"
                  placeholder="예) 한돈 삼겹살 500g"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-bold text-gray-600">SKU</span>
                <input
                  required
                  value={form.sku}
                  onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
                  className="h-10 rounded-xl border border-gray-200 px-3 text-sm focus:border-red-500 focus:outline-none"
                  placeholder="예) MEA-102"
                />
              </label>

              <label className="grid gap-1 md:col-span-2">
                <span className="text-xs font-bold text-gray-600">설명</span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                  placeholder="상품 소개 문구"
                />
              </label>
            </div>

            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-bold text-gray-600">Source</label>
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setSourceType("origin")}
                    className={`rounded-md px-2 py-1 text-xs font-bold transition ${
                      sourceType === "origin" ? "bg-gray-900 text-white" : "text-gray-600"
                    }`}
                  >
                    Origin
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType("manufacturer")}
                    className={`rounded-md px-2 py-1 text-xs font-bold transition ${
                      sourceType === "manufacturer" ? "bg-gray-900 text-white" : "text-gray-600"
                    }`}
                  >
                    Manufacturer
                  </button>
                </div>
              </div>
              <input
                value={sourceValue}
                onChange={(event) => setSourceValue(event.target.value)}
                className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-red-500 focus:outline-none"
                placeholder={sourceType === "origin" ? "예) 대한민국" : "예) OO식품"}
              />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-bold text-gray-600">Sale Price</span>
                <div className="relative">
                  <input
                    required
                    type="number"
                    min={0}
                    value={form.basePrice}
                    onChange={(event) => setForm((prev) => ({ ...prev, basePrice: event.target.value }))}
                    className="no-spin h-10 w-full rounded-xl border border-gray-200 pl-3 pr-8 text-sm focus:border-red-500 focus:outline-none"
                    placeholder="0"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500">원</span>
                </div>
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-bold text-gray-600">Discount Price</span>
                <div className="relative">
                  {discountRate && (
                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                      {discountRate}%
                    </span>
                  )}
                  <input
                    type="number"
                    min={0}
                    value={form.discountPrice}
                    onChange={(event) => setForm((prev) => ({ ...prev, discountPrice: event.target.value }))}
                    className={`no-spin h-10 w-full rounded-xl border border-gray-200 pr-8 text-sm focus:border-red-500 focus:outline-none ${
                      discountRate ? "pl-12" : "pl-3"
                    }`}
                    placeholder="0"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500">원</span>
                </div>
              </label>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-bold text-gray-600">단위</span>
                <input
                  value={form.unitLabel}
                  onChange={(event) => setForm((prev) => ({ ...prev, unitLabel: event.target.value }))}
                  className="h-10 rounded-xl border border-gray-200 px-3 text-sm focus:border-red-500 focus:outline-none"
                  placeholder="ea, 봉, 100g"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-bold text-gray-600">보관 방법</span>
                <input
                  value={form.storageMethod}
                  onChange={(event) => setForm((prev) => ({ ...prev, storageMethod: event.target.value }))}
                  className="h-10 rounded-xl border border-gray-200 px-3 text-sm focus:border-red-500 focus:outline-none"
                  placeholder="냉장/냉동/상온"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-bold text-gray-600">재고 수량</span>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={form.stockQty}
                    onChange={(event) => setForm((prev) => ({ ...prev, stockQty: event.target.value }))}
                    className="no-spin h-10 w-full rounded-xl border border-gray-200 pl-3 pr-8 text-sm focus:border-red-500 focus:outline-none"
                    placeholder="0"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500">개</span>
                </div>
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-bold text-gray-600">최대 구매 수량</span>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    value={form.maxPerOrder}
                    onChange={(event) => setForm((prev) => ({ ...prev, maxPerOrder: event.target.value }))}
                    className="no-spin h-10 w-full rounded-xl border border-gray-200 pl-3 pr-8 text-sm focus:border-red-500 focus:outline-none"
                    placeholder="1"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500">개</span>
                </div>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDeliveryAvailable(true)}
                className={`inline-flex h-9 items-center gap-1 rounded-lg px-3 text-xs font-bold transition ${
                  deliveryAvailable ? "bg-green-600 text-white" : "bg-gray-200 text-gray-600"
                }`}
              >
                {deliveryAvailable && <Check size={13} />}
                Delivery Available
              </button>
              <button
                type="button"
                onClick={() => setDeliveryAvailable(false)}
                className={`inline-flex h-9 items-center rounded-lg px-3 text-xs font-bold transition ${
                  !deliveryAvailable ? "bg-gray-700 text-white" : "bg-gray-200 text-gray-600"
                }`}
              >
                Unavailable
              </button>

              <label className="ml-auto inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isWeightItem}
                  onChange={(event) => setForm((prev) => ({ ...prev, isWeightItem: event.target.checked }))}
                />
                중량 상품
              </label>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-gray-900 px-5 text-sm font-extrabold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                <PackagePlus size={16} />
                {submitting ? "등록 중..." : "상품 등록"}
              </button>
            </div>
          </article>
        </form>
      </section>
    </main>
  );
}
