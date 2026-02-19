"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCcw } from "lucide-react";

import { clearAdminToken, readAdminToken } from "@/lib/admin-session-client";
import { getAdminPickingList } from "@/lib/market-api";
import type { AdminPickingListResponse, OrderStatus } from "@/lib/market-types";

const PICKING_STATUSES: OrderStatus[] = ["RECEIVED", "PICKING", "SUBSTITUTION_PENDING"];

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function AdminPickingListPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<AdminPickingListResponse | null>(null);
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statuses, setStatuses] = useState<OrderStatus[]>([...PICKING_STATUSES]);

  useEffect(() => {
    const savedToken = readAdminToken();
    if (!savedToken) {
      router.replace("/admin/login");
      return;
    }
    setToken(savedToken);
  }, [router]);

  async function loadPickingList(adminToken: string, targetStatuses: OrderStatus[], targetKeyword: string): Promise<void> {
    if (targetStatuses.length === 0) {
      setErrorMessage("최소 1개 이상의 주문 상태를 선택해 주세요.");
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await getAdminPickingList(adminToken, {
        statuses: targetStatuses.join(","),
        keyword: targetKeyword.trim() || undefined,
      });
      setData(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "피킹리스트를 불러오지 못했습니다.";
      setErrorMessage(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      return;
    }
    void loadPickingList(token, statuses, keyword);
  }, [token, statuses, keyword]);

  function toggleStatus(status: OrderStatus): void {
    setStatuses((prev) => {
      if (prev.includes(status)) {
        return prev.filter((item) => item !== status);
      }
      return [...prev, status];
    });
  }

  function submitKeywordSearch(): void {
    setKeyword(keywordInput.trim());
  }

  function logout(): void {
    clearAdminToken();
    router.push("/admin/login");
  }

  const generatedAtLabel = useMemo(() => formatDateTime(data?.generated_at ?? null), [data?.generated_at]);

  return (
    <main className="min-h-screen bg-[#f6f4ef] px-4 py-6 text-[#1a2f27]">
      <section className="mx-auto max-w-7xl rounded-3xl border border-[#d8ddd3] bg-white p-5 shadow-sm">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-black">피킹리스트</h1>
            <p className="text-sm text-[#60756c]">주문별 피킹 항목과 상품별 합산 수량을 확인합니다.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/products" className="rounded-xl border border-[#d8ddd3] px-3 py-2 text-sm font-bold">
              상품관리
            </Link>
            <Link href="/admin/orders" className="rounded-xl border border-[#d8ddd3] px-3 py-2 text-sm font-bold">
              주문관리
            </Link>
            <button
              type="button"
              onClick={() => token && void loadPickingList(token, statuses, keyword)}
              className="inline-flex items-center gap-1 rounded-xl border border-[#d8ddd3] px-3 py-2 text-sm font-bold hover:bg-[#f4f6f5]"
            >
              <RefreshCcw size={14} />
              새로고침
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-[#d8ddd3] px-3 py-2 text-sm font-bold hover:bg-[#f4f6f5]"
            >
              로그아웃
            </button>
          </div>
        </header>

        <section className="mb-4 grid gap-3 rounded-2xl border border-[#d8ddd3] bg-[#f9fcfa] p-4 md:grid-cols-[2fr_1fr]">
          <div>
            <p className="mb-2 text-sm font-bold text-[#3c4f47]">주문 상태 필터</p>
            <div className="flex flex-wrap gap-2">
              {PICKING_STATUSES.map((status) => {
                const selected = statuses.includes(status);
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => toggleStatus(status)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      selected ? "bg-[#166847] text-white" : "border border-[#d8ddd3] bg-white text-[#4f635a]"
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-[#3c4f47]">검색</p>
            <div className="flex gap-2">
              <input
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitKeywordSearch();
                  }
                }}
                placeholder="주문번호, 상품명, 위치"
                className="h-10 flex-1 rounded-lg border border-[#d8ddd3] px-3 text-sm focus:border-[#166847] focus:outline-none"
              />
              <button
                type="button"
                onClick={submitKeywordSearch}
                className="h-10 rounded-lg bg-[#166847] px-3 text-sm font-bold text-white"
              >
                조회
              </button>
            </div>
          </div>
        </section>

        {errorMessage && <p className="mb-3 rounded-xl bg-[#ffeceb] px-3 py-2 text-sm font-semibold text-[#8e3a30]">{errorMessage}</p>}

        {loading && <p className="text-sm text-[#60756c]">피킹리스트를 불러오는 중입니다...</p>}

        {!loading && data && (
          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <article className="rounded-2xl border border-[#d8ddd3] bg-white p-3">
                <p className="text-xs font-semibold text-[#60756c]">대상 주문 수</p>
                <p className="mt-1 text-2xl font-black">{data.order_count.toLocaleString("ko-KR")}</p>
              </article>
              <article className="rounded-2xl border border-[#d8ddd3] bg-white p-3">
                <p className="text-xs font-semibold text-[#60756c]">피킹 라인 수</p>
                <p className="mt-1 text-2xl font-black">{data.line_count.toLocaleString("ko-KR")}</p>
              </article>
              <article className="rounded-2xl border border-[#d8ddd3] bg-white p-3">
                <p className="text-xs font-semibold text-[#60756c]">생성 시각</p>
                <p className="mt-1 text-lg font-black">{generatedAtLabel}</p>
              </article>
            </div>

            <article className="overflow-hidden rounded-2xl border border-[#d8ddd3] bg-white">
              <div className="border-b border-[#d8ddd3] px-4 py-3">
                <h2 className="text-sm font-black">상품별 합계</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-[#f9fcfa] text-left">
                    <tr>
                      <th className="px-3 py-2">상품</th>
                      <th className="px-3 py-2">위치</th>
                      <th className="px-3 py-2 text-right">합계 수량</th>
                      <th className="px-3 py-2 text-right">주문 수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.summary.map((row) => (
                      <tr key={row.product_id} className="border-t border-[#eef1eb]">
                        <td className="px-3 py-2 font-semibold">
                          {row.product_name} ({row.unit_label})
                        </td>
                        <td className="px-3 py-2">{row.pick_location || "-"}</td>
                        <td className="px-3 py-2 text-right font-bold">{row.total_qty_ordered.toLocaleString("ko-KR")}</td>
                        <td className="px-3 py-2 text-right">{row.order_count.toLocaleString("ko-KR")}</td>
                      </tr>
                    ))}
                    {data.summary.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-[#60756c]">
                          해당 조건의 피킹 데이터가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl border border-[#d8ddd3] bg-white">
              <div className="border-b border-[#d8ddd3] px-4 py-3">
                <h2 className="text-sm font-black">주문별 피킹 라인</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-[#f9fcfa] text-left">
                    <tr>
                      <th className="px-3 py-2">주문번호</th>
                      <th className="px-3 py-2">상태</th>
                      <th className="px-3 py-2">상품</th>
                      <th className="px-3 py-2 text-right">주문수량</th>
                      <th className="px-3 py-2 text-right">처리수량</th>
                      <th className="px-3 py-2">위치</th>
                      <th className="px-3 py-2">희망시간</th>
                      <th className="px-3 py-2">상세</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <tr key={item.order_item_id} className="border-t border-[#eef1eb]">
                        <td className="px-3 py-2 font-semibold">{item.order_no}</td>
                        <td className="px-3 py-2">{item.order_status}</td>
                        <td className="px-3 py-2">
                          {item.product_name} ({item.unit_label})
                        </td>
                        <td className="px-3 py-2 text-right">{item.qty_ordered.toLocaleString("ko-KR")}</td>
                        <td className="px-3 py-2 text-right">{item.qty_fulfilled.toLocaleString("ko-KR")}</td>
                        <td className="px-3 py-2">{item.pick_location || "-"}</td>
                        <td className="px-3 py-2">{formatDateTime(item.requested_slot_start)}</td>
                        <td className="px-3 py-2">
                          <Link href={`/admin/orders/${item.order_id}`} className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-xs font-bold">
                            이동
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {data.items.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 py-8 text-center text-[#60756c]">
                          해당 조건의 피킹 데이터가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        )}
      </section>
    </main>
  );
}
