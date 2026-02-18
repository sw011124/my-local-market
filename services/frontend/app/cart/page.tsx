"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { addCartItem, deleteCartItem, getCart, updateCartItem } from "@/lib/market-api";
import type { CartResponse } from "@/lib/market-types";
import { ensureMarketSessionKey } from "@/lib/session-client";

function formatPrice(value: string): string {
  return `${new Intl.NumberFormat("ko-KR").format(Number(value))}원`;
}

function CartPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const addProductId = searchParams.get("addProductId");
  const addQtyRaw = searchParams.get("qty");

  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const hasItems = useMemo(() => (cart?.items?.length ?? 0) > 0, [cart]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const sessionKey = await ensureMarketSessionKey();
        const qty = addQtyRaw ? Number(addQtyRaw) : 1;

        let nextCart: CartResponse;
        if (addProductId && Number(addProductId) > 0) {
          nextCart = await addCartItem(sessionKey, Number(addProductId), Number.isNaN(qty) ? 1 : Math.max(1, qty));
          if (mounted) {
            setInfoMessage("상품을 장바구니에 담았습니다.");
          }
          router.replace("/cart");
        } else {
          nextCart = await getCart(sessionKey);
        }

        if (mounted) {
          setCart(nextCart);
        }
      } catch (error) {
        if (mounted) {
          const message = error instanceof Error ? error.message : "장바구니를 불러오지 못했습니다.";
          setErrorMessage(message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [addProductId, addQtyRaw, router]);

  async function changeQty(itemId: number, qty: number): Promise<void> {
    try {
      const sessionKey = await ensureMarketSessionKey();
      const nextCart = await updateCartItem(sessionKey, itemId, Math.max(1, qty));
      setCart(nextCart);
      setInfoMessage("수량을 변경했습니다.");
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "수량 변경에 실패했습니다.";
      setErrorMessage(message);
    }
  }

  async function removeItem(itemId: number): Promise<void> {
    try {
      const sessionKey = await ensureMarketSessionKey();
      const nextCart = await deleteCartItem(sessionKey, itemId);
      setCart(nextCart);
      setInfoMessage("상품을 삭제했습니다.");
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "상품 삭제에 실패했습니다.";
      setErrorMessage(message);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f6f7] px-4 py-6 text-black">
      <section className="mx-auto max-w-7xl">
        <div className="mb-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black">장바구니</h1>
            <Link href="/products" className="text-sm font-bold text-red-600">
              상품 더보기
            </Link>
          </div>
          <p className="mt-1 text-xs font-medium text-gray-500">수량 변경 후 체크아웃으로 이동하세요.</p>
        </div>

        {infoMessage && <p className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{infoMessage}</p>}
        {errorMessage && <p className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errorMessage}</p>}

        {loading && (
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">장바구니를 불러오는 중입니다...</p>
          </section>
        )}

        {!loading && !hasItems && (
          <section className="rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-500">장바구니가 비어 있습니다.</p>
            <Link href="/products" className="mt-3 inline-flex rounded-xl bg-red-600 px-4 py-2 text-sm font-extrabold text-white">
              상품 보러가기
            </Link>
          </section>
        )}

        {!loading && hasItems && cart && (
          <section className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
            <div className="space-y-3">
              {cart.items.map((item) => (
                <article key={item.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold leading-5 text-gray-900">{item.product_name}</h2>
                      <p className="mt-1 text-xs text-gray-500">단가 {formatPrice(item.unit_price)}</p>
                      {item.is_weight_item && <p className="text-[11px] font-semibold text-red-600">중량상품: 실중량 정산</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeItem(item.id)}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-bold text-gray-600 transition hover:border-red-300 hover:text-red-600"
                    >
                      삭제
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void changeQty(item.id, Math.max(1, item.qty - 1))}
                        className="h-8 w-8 rounded-lg border border-gray-200 text-sm font-black"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-bold">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => void changeQty(item.id, item.qty + 1)}
                        className="h-8 w-8 rounded-lg border border-gray-200 text-sm font-black"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-lg font-black text-red-600">{formatPrice(item.line_total)}</p>
                  </div>
                </article>
              ))}
            </div>

            <aside className="h-fit rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:sticky lg:top-24">
              <h2 className="text-base font-black">주문 요약</h2>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-500">상품 합계</span>
                <strong className="text-xl font-black text-red-600">{formatPrice(cart.subtotal)}</strong>
              </div>
              <Link
                href="/checkout"
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-red-500"
              >
                체크아웃으로 이동
              </Link>
            </aside>
          </section>
        )}
      </section>
    </main>
  );
}

function CartPageFallback() {
  return (
    <main className="min-h-screen bg-[#f6f6f7] px-4 py-6 text-black">
      <section className="mx-auto max-w-7xl rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-black">장바구니</h1>
        <p className="mt-3 text-sm text-gray-500">장바구니를 불러오는 중입니다...</p>
      </section>
    </main>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<CartPageFallback />}>
      <CartPageContent />
    </Suspense>
  );
}
