"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { clearAdminToken, readAdminToken } from "@/lib/admin-session-client";
import {
  applyAdminShortageAction,
  createAdminRefund,
  getAdminOrder,
  getAdminOrderRefundSummary,
  getAdminOrderStatusLogs,
  getAdminRefunds,
  updateAdminOrderStatus,
} from "@/lib/market-api";
import type {
  AdminOrderRefundSummary,
  AdminOrderStatusLog,
  AdminRefund,
  AdminShortageAction,
  OrderResponse,
  OrderStatus,
} from "@/lib/market-types";

const ORDER_STATUSES: OrderStatus[] = ["RECEIVED", "PICKING", "SUBSTITUTION_PENDING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELED"];
const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  RECEIVED: ["PICKING", "CANCELED"],
  PICKING: ["SUBSTITUTION_PENDING", "OUT_FOR_DELIVERY", "CANCELED"],
  SUBSTITUTION_PENDING: ["PICKING", "CANCELED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELED: [],
};

type ItemActionDraft = {
  action: AdminShortageAction;
  fulfilledQty: string;
  substitutionProductId: string;
  substitutionQty: string;
  reason: string;
};

function formatPrice(value: string): string {
  return `${new Intl.NumberFormat("ko-KR").format(Number(value))}원`;
}

export default function AdminOrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [refunds, setRefunds] = useState<AdminRefund[]>([]);
  const [statusLogs, setStatusLogs] = useState<AdminOrderStatusLog[]>([]);
  const [refundSummary, setRefundSummary] = useState<AdminOrderRefundSummary | null>(
    null,
  );
  const [statusDraft, setStatusDraft] = useState<OrderStatus>("RECEIVED");
  const [statusReason, setStatusReason] = useState("");
  const [itemDrafts, setItemDrafts] = useState<Record<number, ItemActionDraft>>({});
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const canRender = useMemo(() => Number.isInteger(orderId) && orderId > 0, [orderId]);
  const allowedStatusOptions = useMemo(() => {
    if (!order) {
      return [];
    }
    return [order.status as OrderStatus, ...ALLOWED_STATUS_TRANSITIONS[order.status as OrderStatus]];
  }, [order]);
  const refundableRemaining = useMemo(() => Number(refundSummary?.refundable_remaining ?? "0"), [refundSummary?.refundable_remaining]);

  useEffect(() => {
    const savedToken = readAdminToken();
    if (!savedToken) {
      router.replace("/admin/login");
      return;
    }
    setToken(savedToken);
  }, [router]);

  useEffect(() => {
    if (!token || !canRender) {
      return;
    }
    const adminToken = token;

    let mounted = true;
    async function load(): Promise<void> {
      setLoading(true);
      setErrorMessage(null);
      try {
        const [orderResult, refundResult, statusLogResult, refundSummaryResult] = await Promise.all([
          getAdminOrder(adminToken, orderId),
          getAdminRefunds(adminToken, orderId),
          getAdminOrderStatusLogs(adminToken, orderId),
          getAdminOrderRefundSummary(adminToken, orderId),
        ]);
        if (!mounted) {
          return;
        }
        setOrder(orderResult);
        setRefunds(refundResult);
        setStatusLogs(statusLogResult);
        setRefundSummary(refundSummaryResult);

        const parsedStatus = ORDER_STATUSES.find((status) => status === orderResult.status) ?? "RECEIVED";
        setStatusDraft(parsedStatus);
        setItemDrafts((prev) => {
          const next = { ...prev };
          for (const item of orderResult.items) {
            if (!next[item.id]) {
              next[item.id] = {
                action: "PARTIAL_CANCEL",
                fulfilledQty: String(Math.max(0, item.qty_ordered - 1)),
                substitutionProductId: "",
                substitutionQty: "",
                reason: "",
              };
            }
          }
          return next;
        });
      } catch (error) {
        if (!mounted) {
          return;
        }
        const message = error instanceof Error ? error.message : "주문 상세를 불러오지 못했습니다.";
        setErrorMessage(message);
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
  }, [token, orderId, canRender]);

  function logout(): void {
    clearAdminToken();
    router.push("/admin/login");
  }

  async function reloadOrderData(): Promise<void> {
    if (!token || !canRender) {
      return;
    }
    const [orderResult, refundResult, statusLogResult, refundSummaryResult] = await Promise.all([
      getAdminOrder(token, orderId),
      getAdminRefunds(token, orderId),
      getAdminOrderStatusLogs(token, orderId),
      getAdminOrderRefundSummary(token, orderId),
    ]);
    setOrder(orderResult);
    setRefunds(refundResult);
    setStatusLogs(statusLogResult);
    setRefundSummary(refundSummaryResult);
    const parsedStatus = ORDER_STATUSES.find((status) => status === orderResult.status) ?? "RECEIVED";
    setStatusDraft(parsedStatus);
  }

  async function applyStatusChange(): Promise<void> {
    if (!token || !order) {
      return;
    }
    if (!allowedStatusOptions.includes(statusDraft)) {
      setErrorMessage("현재 상태에서 허용되지 않은 상태 변경입니다.");
      return;
    }
    try {
      const updated = await updateAdminOrderStatus(token, order.id, {
        status: statusDraft,
        reason: statusReason.trim() || undefined,
      });
      setOrder(updated);
      setInfoMessage("주문 상태를 변경했습니다.");
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "상태 변경에 실패했습니다.";
      setErrorMessage(message);
    }
  }

  async function applyShortage(itemId: number): Promise<void> {
    if (!token || !order) {
      return;
    }
    const draft = itemDrafts[itemId];
    if (!draft) {
      return;
    }

    try {
      const payload: {
        order_item_id: number;
        action: AdminShortageAction;
        fulfilled_qty?: number;
        substitution_product_id?: number;
        substitution_qty?: number;
        reason?: string;
      } = {
        order_item_id: itemId,
        action: draft.action,
        reason: draft.reason.trim() || undefined,
      };

      if (draft.action === "SUBSTITUTE") {
        const substitutionProductId = Number(draft.substitutionProductId);
        const substitutionQty = Number(draft.substitutionQty);
        if (!substitutionProductId || !substitutionQty) {
          setErrorMessage("대체상품 처리 시 상품ID와 수량이 필요합니다.");
          return;
        }
        payload.substitution_product_id = substitutionProductId;
        payload.substitution_qty = substitutionQty;
      } else if (draft.action === "OUT_OF_STOCK") {
        payload.fulfilled_qty = 0;
      } else {
        payload.fulfilled_qty = Number(draft.fulfilledQty);
      }

      await applyAdminShortageAction(token, order.id, payload);
      await reloadOrderData();
      setInfoMessage("부분품절/대체 처리를 적용했습니다.");
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "부분품절 처리가 실패했습니다.";
      setErrorMessage(message);
    }
  }

  async function submitRefund(): Promise<void> {
    if (!token || !order) {
      return;
    }
    const normalizedAmount = refundAmount.trim();
    const normalizedReason = refundReason.trim();
    if (!normalizedAmount || !normalizedReason) {
      setErrorMessage("환불 금액과 사유를 입력해 주세요.");
      return;
    }

    const amountNumber = Number(normalizedAmount);
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      setErrorMessage("환불 금액은 0보다 큰 숫자여야 합니다.");
      return;
    }
    if (refundSummary && amountNumber > refundableRemaining) {
      setErrorMessage("환불 가능 잔액을 초과했습니다.");
      return;
    }

    try {
      await createAdminRefund(token, order.id, {
        amount: normalizedAmount,
        reason: normalizedReason,
        method: "COD_ADJUSTMENT",
      });
      setRefundAmount("");
      setRefundReason("");
      await reloadOrderData();
      setInfoMessage("환불을 등록했습니다.");
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "환불 등록에 실패했습니다.";
      setErrorMessage(message);
    }
  }

  if (!canRender) {
    return (
      <main className="min-h-screen bg-[#f6f4ef] text-[#1a2f27] px-4 py-8">
        <section className="mx-auto max-w-3xl rounded-3xl border border-[#d8ddd3] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-[#8e3a30]">유효하지 않은 주문 ID입니다.</p>
          <Link href="/admin/orders" className="mt-3 inline-block text-sm font-bold text-[#166847]">
            주문목록으로
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#1a2f27] px-4 py-6">
      <section className="mx-auto max-w-6xl rounded-3xl border border-[#d8ddd3] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-black">주문 상세 관리</h1>
            <p className="text-sm text-[#60756c]">부분품절/대체/환불을 수동으로 처리합니다.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/orders" className="rounded-xl border border-[#d8ddd3] px-3 py-2 text-sm font-bold">
              주문목록
            </Link>
            <Link href="/admin/picking" className="rounded-xl border border-[#d8ddd3] px-3 py-2 text-sm font-bold">
              피킹리스트
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
        {loading && <p className="text-sm text-[#60756c]">주문 상세를 불러오는 중입니다...</p>}

        {!loading && order && (
          <>
            <article className="rounded-2xl border border-[#d8ddd3] bg-[#f9fcfa] p-4">
              <p className="text-xs font-semibold text-[#6a7e74]">주문번호</p>
              <p className="text-lg font-black">{order.order_no}</p>
              <p className="mt-1 text-sm">
                고객: {order.customer_name} / {order.customer_phone}
              </p>
              <p className="text-sm">예상총액: {formatPrice(order.total_estimated)}</p>
              {order.total_final && <p className="text-sm font-semibold">최종금액: {formatPrice(order.total_final)}</p>}
              {refundSummary && (
                <div className="mt-2 grid gap-1 text-sm md:grid-cols-3">
                  <p>누적 환불: {formatPrice(refundSummary.refunded_total)}</p>
                  <p className="font-semibold text-[#166847]">환불 가능 잔액: {formatPrice(refundSummary.refundable_remaining)}</p>
                  <p>환불 후 최종금액: {formatPrice(String(Math.max(0, Number(order.total_estimated) - Number(refundSummary.refunded_total))))}</p>
                </div>
              )}

              <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                <select
                  value={statusDraft}
                  onChange={(event) => setStatusDraft(event.target.value as OrderStatus)}
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                >
                  {ORDER_STATUSES.map((status) => (
                    <option
                      key={status}
                      value={status}
                      disabled={!allowedStatusOptions.includes(status)}
                    >
                      {status}
                    </option>
                  ))}
                </select>
                <input
                  value={statusReason}
                  onChange={(event) => setStatusReason(event.target.value)}
                  placeholder="상태 변경 사유(선택)"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <button type="button" onClick={() => void applyStatusChange()} className="rounded-lg bg-[#166847] px-3 py-1 text-sm font-bold text-white">
                  상태 적용
                </button>
              </div>
            </article>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#d8ddd3] text-left">
                    <th className="px-2 py-2">상품</th>
                    <th className="px-2 py-2">주문수량</th>
                    <th className="px-2 py-2">처리수량</th>
                    <th className="px-2 py-2">예상금액</th>
                    <th className="px-2 py-2">부분품절/대체 처리</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => {
                    const draft = itemDrafts[item.id] ?? {
                      action: "PARTIAL_CANCEL",
                      fulfilledQty: String(Math.max(0, item.qty_ordered - 1)),
                      substitutionProductId: "",
                      substitutionQty: "",
                      reason: "",
                    };
                    return (
                      <tr key={item.id} className="border-b border-[#eef1eb] align-top">
                        <td className="px-2 py-2">{item.product_name}</td>
                        <td className="px-2 py-2">{item.qty_ordered}</td>
                        <td className="px-2 py-2">{item.qty_fulfilled}</td>
                        <td className="px-2 py-2">{formatPrice(item.line_estimated)}</td>
                        <td className="px-2 py-2">
                          <div className="grid gap-1 md:grid-cols-6">
                            <select
                              value={draft.action}
                              onChange={(event) =>
                                setItemDrafts((prev) => ({
                                  ...prev,
                                  [item.id]: { ...draft, action: event.target.value as AdminShortageAction },
                                }))
                              }
                              className="rounded-lg border border-[#d8ddd3] px-2 py-1"
                            >
                              <option value="PARTIAL_CANCEL">부분취소</option>
                              <option value="OUT_OF_STOCK">전체품절</option>
                              <option value="SUBSTITUTE">대체상품</option>
                            </select>
                            <input
                              value={draft.fulfilledQty}
                              onChange={(event) =>
                                setItemDrafts((prev) => ({
                                  ...prev,
                                  [item.id]: { ...draft, fulfilledQty: event.target.value },
                                }))
                              }
                              type="number"
                              min={0}
                              max={item.qty_ordered}
                              placeholder="처리수량"
                              className="rounded-lg border border-[#d8ddd3] px-2 py-1"
                            />
                            <input
                              value={draft.substitutionProductId}
                              onChange={(event) =>
                                setItemDrafts((prev) => ({
                                  ...prev,
                                  [item.id]: { ...draft, substitutionProductId: event.target.value },
                                }))
                              }
                              type="number"
                              min={1}
                              placeholder="대체상품ID"
                              className="rounded-lg border border-[#d8ddd3] px-2 py-1"
                            />
                            <input
                              value={draft.substitutionQty}
                              onChange={(event) =>
                                setItemDrafts((prev) => ({
                                  ...prev,
                                  [item.id]: { ...draft, substitutionQty: event.target.value },
                                }))
                              }
                              type="number"
                              min={1}
                              placeholder="대체수량"
                              className="rounded-lg border border-[#d8ddd3] px-2 py-1"
                            />
                            <input
                              value={draft.reason}
                              onChange={(event) =>
                                setItemDrafts((prev) => ({
                                  ...prev,
                                  [item.id]: { ...draft, reason: event.target.value },
                                }))
                              }
                              placeholder="사유"
                              className="rounded-lg border border-[#d8ddd3] px-2 py-1"
                            />
                            <button
                              type="button"
                              onClick={() => void applyShortage(item.id)}
                              className="rounded-lg bg-[#166847] px-2 py-1 font-bold text-white"
                            >
                              적용
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <section className="mt-4 rounded-2xl border border-[#d8ddd3] p-4">
              <h2 className="text-base font-black">수동 환불 등록</h2>
              <div className="mt-2 grid gap-2 md:grid-cols-[1fr_2fr_auto]">
                <input
                  value={refundAmount}
                  onChange={(event) => setRefundAmount(event.target.value)}
                  type="number"
                  min={1}
                  placeholder="환불금액"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  value={refundReason}
                  onChange={(event) => setRefundReason(event.target.value)}
                  placeholder="환불 사유"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <button type="button" onClick={() => void submitRefund()} className="rounded-lg bg-[#8e3a30] px-3 py-1 text-sm font-bold text-white">
                  환불 등록
                </button>
              </div>
              {refundSummary && (
                <p className="mt-2 text-xs text-[#60756c]">
                  환불 가능 잔액: {formatPrice(refundSummary.refundable_remaining)}
                </p>
              )}
            </section>

            <section className="mt-4 rounded-2xl border border-[#d8ddd3] p-4">
              <h2 className="text-base font-black">환불 이력</h2>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#d8ddd3] text-left">
                      <th className="px-2 py-2">시간</th>
                      <th className="px-2 py-2">금액</th>
                      <th className="px-2 py-2">사유</th>
                      <th className="px-2 py-2">처리자</th>
                      <th className="px-2 py-2">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refunds.map((refund) => (
                      <tr key={refund.id} className="border-b border-[#eef1eb]">
                        <td className="px-2 py-2">{new Date(refund.processed_at).toLocaleString("ko-KR")}</td>
                        <td className="px-2 py-2">{formatPrice(refund.amount)}</td>
                        <td className="px-2 py-2">{refund.reason}</td>
                        <td className="px-2 py-2">{refund.processed_by ?? "-"}</td>
                        <td className="px-2 py-2">{refund.status}</td>
                      </tr>
                    ))}
                    {!refunds.length && (
                      <tr>
                        <td className="px-2 py-3 text-[#60756c]" colSpan={5}>
                          환불 이력이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-4 rounded-2xl border border-[#d8ddd3] p-4">
              <h2 className="text-base font-black">상태 변경 이력</h2>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#d8ddd3] text-left">
                      <th className="px-2 py-2">시간</th>
                      <th className="px-2 py-2">변경</th>
                      <th className="px-2 py-2">주체</th>
                      <th className="px-2 py-2">사유</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statusLogs.map((log) => (
                      <tr key={log.id} className="border-b border-[#eef1eb]">
                        <td className="px-2 py-2">{new Date(log.created_at).toLocaleString("ko-KR")}</td>
                        <td className="px-2 py-2">
                          {(log.from_status ?? "-")} → {log.to_status}
                        </td>
                        <td className="px-2 py-2">
                          {log.changed_by_type} / {log.changed_by_id ?? "-"}
                        </td>
                        <td className="px-2 py-2">{log.reason ?? "-"}</td>
                      </tr>
                    ))}
                    {!statusLogs.length && (
                      <tr>
                        <td className="px-2 py-3 text-[#60756c]" colSpan={4}>
                          상태 변경 이력이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
