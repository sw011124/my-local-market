"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { clearAdminToken, readAdminToken } from "@/lib/admin-session-client";
import { getAdminOrders, updateAdminOrderStatus } from "@/lib/market-api";
import type { OrderResponse, OrderStatus } from "@/lib/market-types";

const ORDER_STATUSES: OrderStatus[] = ["RECEIVED", "PICKING", "SUBSTITUTION_PENDING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELED"];

function formatPrice(value: string): string {
  return `${new Intl.NumberFormat("ko-KR").format(Number(value))}원`;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [statusDrafts, setStatusDrafts] = useState<Record<number, OrderStatus>>({});
  const [reasonDrafts, setReasonDrafts] = useState<Record<number, string>>({});

  const filteredOrders = useMemo(() => {
    if (statusFilter === "ALL") {
      return orders;
    }
    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  useEffect(() => {
    const savedToken = readAdminToken();
    if (!savedToken) {
      router.replace("/admin/login");
      return;
    }
    setToken(savedToken);
  }, [router]);

  useEffect(() => {
    if (!token) {
      return;
    }
    const adminToken = token;

    let mounted = true;
    async function loadOrders() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const result = await getAdminOrders(adminToken);
        if (!mounted) {
          return;
        }
        setOrders(result);
        setStatusDrafts(
          Object.fromEntries(
            result.map((order) => [order.id, (ORDER_STATUSES.find((status) => status === order.status) ?? "RECEIVED") as OrderStatus]),
          ),
        );
      } catch (error) {
        if (!mounted) {
          return;
        }
        const message = error instanceof Error ? error.message : "주문 목록을 불러오지 못했습니다.";
        setErrorMessage(message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadOrders();
    return () => {
      mounted = false;
    };
  }, [token]);

  async function applyStatus(orderId: number): Promise<void> {
    if (!token) {
      return;
    }
    const nextStatus = statusDrafts[orderId];
    if (!nextStatus) {
      return;
    }

    try {
      const updated = await updateAdminOrderStatus(token, orderId, {
        status: nextStatus,
        reason: reasonDrafts[orderId]?.trim() || undefined,
      });
      setOrders((prev) => prev.map((order) => (order.id === updated.id ? updated : order)));
      setInfoMessage("주문 상태를 변경했습니다.");
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "상태 변경에 실패했습니다.";
      setErrorMessage(message);
    }
  }

  function logout(): void {
    clearAdminToken();
    router.push("/admin/login");
  }

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#1a2f27] px-4 py-6">
      <section className="mx-auto max-w-7xl rounded-3xl border border-[#d8ddd3] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-black">관리자 주문 관리</h1>
            <p className="text-sm text-[#60756c]">상태 변경, 부분품절/환불은 주문 상세에서 처리합니다.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/products" className="rounded-xl border border-[#d8ddd3] px-3 py-2 text-sm font-bold">
              상품관리
            </Link>
            <Link href="/admin/picking" className="rounded-xl border border-[#d8ddd3] px-3 py-2 text-sm font-bold">
              피킹리스트
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

        <div className="mb-4 flex items-center gap-2">
          <label className="text-sm font-semibold">상태 필터</label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
          >
            <option value="ALL">전체</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {infoMessage && <p className="mb-3 rounded-xl bg-[#e9f8f0] px-3 py-2 text-sm font-semibold text-[#146341]">{infoMessage}</p>}
        {errorMessage && <p className="mb-3 rounded-xl bg-[#ffeceb] px-3 py-2 text-sm font-semibold text-[#8e3a30]">{errorMessage}</p>}

        {loading && <p className="text-sm text-[#60756c]">주문 목록을 불러오는 중입니다...</p>}

        {!loading && (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#d8ddd3] text-left">
                  <th className="px-2 py-2">주문번호</th>
                  <th className="px-2 py-2">고객</th>
                  <th className="px-2 py-2">현재상태</th>
                  <th className="px-2 py-2">예상총액</th>
                  <th className="px-2 py-2">상태변경</th>
                  <th className="px-2 py-2">상세</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-[#eef1eb]">
                    <td className="px-2 py-2 font-semibold">{order.order_no}</td>
                    <td className="px-2 py-2">
                      {order.customer_name} / {order.customer_phone}
                    </td>
                    <td className="px-2 py-2 font-bold">{order.status}</td>
                    <td className="px-2 py-2">{formatPrice(order.total_estimated)}</td>
                    <td className="px-2 py-2">
                      <div className="grid gap-1 md:grid-cols-[1fr_1fr_auto]">
                        <select
                          value={statusDrafts[order.id] ?? "RECEIVED"}
                          onChange={(event) =>
                            setStatusDrafts((prev) => ({ ...prev, [order.id]: event.target.value as OrderStatus }))
                          }
                          className="rounded-lg border border-[#d8ddd3] px-2 py-1"
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <input
                          value={reasonDrafts[order.id] ?? ""}
                          onChange={(event) => setReasonDrafts((prev) => ({ ...prev, [order.id]: event.target.value }))}
                          placeholder="사유(선택)"
                          className="rounded-lg border border-[#d8ddd3] px-2 py-1"
                        />
                        <button
                          type="button"
                          onClick={() => void applyStatus(order.id)}
                          className="rounded-lg bg-[#166847] px-3 py-1 font-bold text-white"
                        >
                          적용
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <Link href={`/admin/orders/${order.id}`} className="rounded-lg border border-[#d8ddd3] px-3 py-1 font-bold">
                        주문상세
                      </Link>
                    </td>
                  </tr>
                ))}
                {!filteredOrders.length && (
                  <tr>
                    <td className="px-2 py-8 text-center text-[#60756c]" colSpan={6}>
                      조건에 맞는 주문이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
