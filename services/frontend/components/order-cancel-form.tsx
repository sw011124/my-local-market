"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { cancelOrder } from "@/lib/market-api";

type OrderCancelFormProps = {
  orderNo: string;
  phone: string;
  canCancel: boolean;
};

export default function OrderCancelForm({ orderNo, phone, canCancel }: OrderCancelFormProps) {
  const router = useRouter();
  const [reason, setReason] = useState("고객 단순변심");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCancelRequest(): Promise<void> {
    if (!canCancel) {
      return;
    }

    if (reason.trim().length < 2) {
      setErrorMessage("취소 사유를 2자 이상 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      await cancelOrder(orderNo, phone, reason.trim());
      setInfoMessage("주문 취소가 접수되었습니다.");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "주문 취소 요청에 실패했습니다.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <h2 className="text-base font-black">주문 취소 요청</h2>
      {!canCancel && <p className="mt-2 text-sm font-semibold text-red-700">현재 상태에서는 취소할 수 없습니다.</p>}
      {canCancel && (
        <>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
            placeholder="취소 사유"
          />
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleCancelRequest()}
            className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {submitting ? "요청 중..." : "취소 요청"}
          </button>
        </>
      )}
      {errorMessage && <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errorMessage}</p>}
      {infoMessage && <p className="mt-3 rounded-xl border border-green-100 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">{infoMessage}</p>}
    </section>
  );
}
