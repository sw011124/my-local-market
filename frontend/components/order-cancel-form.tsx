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
    <section className="mt-5 rounded-2xl border border-[#d8ddd3] bg-white p-4">
      <h2 className="text-base font-black">주문 취소 요청</h2>
      {!canCancel && <p className="mt-2 text-sm text-[#8e3a30]">현재 상태에서는 취소할 수 없습니다.</p>}
      {canCancel && (
        <>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-3 w-full rounded-xl border border-[#d8ddd3] px-3 py-2 text-sm"
            placeholder="취소 사유"
          />
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleCancelRequest()}
            className="mt-3 rounded-xl bg-[#8e3a30] px-4 py-2 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-[#c48f87]"
          >
            {submitting ? "요청 중..." : "취소 요청"}
          </button>
        </>
      )}
      {errorMessage && <p className="mt-3 rounded-xl bg-[#ffeceb] px-3 py-2 text-sm font-semibold text-[#8e3a30]">{errorMessage}</p>}
      {infoMessage && <p className="mt-3 rounded-xl bg-[#e9f8f0] px-3 py-2 text-sm font-semibold text-[#146341]">{infoMessage}</p>}
    </section>
  );
}
