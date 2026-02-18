"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { clearAdminToken, readAdminToken } from "@/lib/admin-session-client";
import {
  createAdminBanner,
  createAdminNotice,
  createAdminPromotion,
  getAdminBanners,
  getAdminNotices,
  getAdminPolicy,
  getAdminPromotions,
  patchAdminPolicy,
} from "@/lib/market-api";
import type { AdminBanner, AdminNotice, AdminPolicy, AdminPromotion } from "@/lib/market-types";

function toIsoOrNull(value: string): string | null {
  if (!value.trim()) {
    return null;
  }
  return new Date(value).toISOString();
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("ko-KR");
}

export default function AdminContentPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  const [policy, setPolicy] = useState<AdminPolicy | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [promotionForm, setPromotionForm] = useState({
    title: "",
    promoType: "WEEKLY",
    productIdsCsv: "",
    promoPrice: "",
    startAt: "",
    endAt: "",
    bannerImageUrl: "",
  });

  const [bannerForm, setBannerForm] = useState({
    title: "",
    imageUrl: "",
    linkType: "PROMOTION",
    linkTarget: "",
    displayOrder: "0",
    startAt: "",
    endAt: "",
  });

  const [noticeForm, setNoticeForm] = useState({
    title: "",
    body: "",
    startAt: "",
    endAt: "",
    pinned: false,
  });

  const [policyForm, setPolicyForm] = useState({
    minOrderAmount: "",
    baseDeliveryFee: "",
    freeDeliveryThreshold: "",
    allowReservationDays: "",
  });

  useEffect(() => {
    const savedToken = readAdminToken();
    if (!savedToken) {
      router.replace("/admin/login");
      return;
    }
    setToken(savedToken);
  }, [router]);

  async function loadAll(nextToken: string): Promise<void> {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [promotionResult, bannerResult, noticeResult, policyResult] = await Promise.all([
        getAdminPromotions(nextToken),
        getAdminBanners(nextToken),
        getAdminNotices(nextToken),
        getAdminPolicy(nextToken),
      ]);
      setPromotions(promotionResult);
      setBanners(bannerResult);
      setNotices(noticeResult);
      setPolicy(policyResult);
      setPolicyForm({
        minOrderAmount: policyResult.min_order_amount_default,
        baseDeliveryFee: policyResult.base_delivery_fee_default,
        freeDeliveryThreshold: policyResult.free_delivery_threshold_default,
        allowReservationDays: String(policyResult.allow_reservation_days),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "콘텐츠를 불러오지 못했습니다.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      return;
    }
    void loadAll(token);
  }, [token]);

  function logout(): void {
    clearAdminToken();
    router.push("/admin/login");
  }

  async function submitPromotion(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!token) {
      return;
    }
    const startAt = toIsoOrNull(promotionForm.startAt);
    const endAt = toIsoOrNull(promotionForm.endAt);
    if (!startAt || !endAt) {
      setErrorMessage("행사 시작/종료 시간을 입력해 주세요.");
      return;
    }
    const productIds = promotionForm.productIdsCsv
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);

    try {
      await createAdminPromotion(token, {
        title: promotionForm.title.trim(),
        promo_type: promotionForm.promoType || "WEEKLY",
        start_at: startAt,
        end_at: endAt,
        is_active: true,
        banner_image_url: promotionForm.bannerImageUrl.trim() || null,
        product_ids: productIds,
        promo_price: promotionForm.promoPrice.trim() || null,
      });
      setPromotionForm({
        title: "",
        promoType: "WEEKLY",
        productIdsCsv: "",
        promoPrice: "",
        startAt: "",
        endAt: "",
        bannerImageUrl: "",
      });
      await loadAll(token);
      setInfoMessage("행사를 등록했습니다.");
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "행사 등록에 실패했습니다.";
      setErrorMessage(message);
    }
  }

  async function submitBanner(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!token) {
      return;
    }
    const startAt = toIsoOrNull(bannerForm.startAt);
    const endAt = toIsoOrNull(bannerForm.endAt);
    if (!startAt || !endAt) {
      setErrorMessage("배너 시작/종료 시간을 입력해 주세요.");
      return;
    }

    try {
      await createAdminBanner(token, {
        title: bannerForm.title.trim(),
        image_url: bannerForm.imageUrl.trim(),
        link_type: bannerForm.linkType || "PROMOTION",
        link_target: bannerForm.linkTarget.trim() || null,
        display_order: Number(bannerForm.displayOrder) || 0,
        is_active: true,
        start_at: startAt,
        end_at: endAt,
      });
      setBannerForm({
        title: "",
        imageUrl: "",
        linkType: "PROMOTION",
        linkTarget: "",
        displayOrder: "0",
        startAt: "",
        endAt: "",
      });
      await loadAll(token);
      setInfoMessage("배너를 등록했습니다.");
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "배너 등록에 실패했습니다.";
      setErrorMessage(message);
    }
  }

  async function submitNotice(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!token) {
      return;
    }
    const startAt = toIsoOrNull(noticeForm.startAt);
    const endAt = toIsoOrNull(noticeForm.endAt);
    if (!startAt || !endAt) {
      setErrorMessage("공지 시작/종료 시간을 입력해 주세요.");
      return;
    }

    try {
      await createAdminNotice(token, {
        title: noticeForm.title.trim(),
        body: noticeForm.body.trim(),
        start_at: startAt,
        end_at: endAt,
        is_pinned: noticeForm.pinned,
        is_active: true,
      });
      setNoticeForm({
        title: "",
        body: "",
        startAt: "",
        endAt: "",
        pinned: false,
      });
      await loadAll(token);
      setInfoMessage("공지를 등록했습니다.");
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "공지 등록에 실패했습니다.";
      setErrorMessage(message);
    }
  }

  async function submitPolicyPatch(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!token) {
      return;
    }
    try {
      const updated = await patchAdminPolicy(token, {
        min_order_amount_default: policyForm.minOrderAmount.trim() || undefined,
        base_delivery_fee_default: policyForm.baseDeliveryFee.trim() || undefined,
        free_delivery_threshold_default: policyForm.freeDeliveryThreshold.trim() || undefined,
        allow_reservation_days: policyForm.allowReservationDays.trim() ? Number(policyForm.allowReservationDays) : undefined,
      });
      setPolicy(updated);
      setInfoMessage("운영 정책을 저장했습니다.");
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "운영 정책 저장에 실패했습니다.";
      setErrorMessage(message);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#1a2f27] px-4 py-6">
      <section className="mx-auto max-w-7xl rounded-3xl border border-[#d8ddd3] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-black">콘텐츠/정책 관리</h1>
            <p className="text-sm text-[#60756c]">행사, 배너, 공지와 기본 배송 정책을 관리합니다.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/orders" className="rounded-xl border border-[#d8ddd3] px-3 py-2 text-sm font-bold">
              주문관리
            </Link>
            <Link href="/admin/products" className="rounded-xl border border-[#d8ddd3] px-3 py-2 text-sm font-bold">
              상품관리
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
        {loading && <p className="text-sm text-[#60756c]">콘텐츠를 불러오는 중입니다...</p>}

        {!loading && (
          <div className="grid gap-4">
            <section className="rounded-2xl border border-[#d8ddd3] p-4">
              <h2 className="text-lg font-black">운영 정책</h2>
              <p className="mt-1 text-xs text-[#60756c]">
                운영시간 {policy?.open_time} ~ {policy?.close_time} / 당일마감 {policy?.same_day_cutoff_time}
              </p>
              <form className="mt-3 grid gap-2 md:grid-cols-4" onSubmit={(event) => void submitPolicyPatch(event)}>
                <input
                  value={policyForm.minOrderAmount}
                  onChange={(event) => setPolicyForm((prev) => ({ ...prev, minOrderAmount: event.target.value }))}
                  placeholder="최소 주문금액"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  value={policyForm.baseDeliveryFee}
                  onChange={(event) => setPolicyForm((prev) => ({ ...prev, baseDeliveryFee: event.target.value }))}
                  placeholder="기본 배송비"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  value={policyForm.freeDeliveryThreshold}
                  onChange={(event) => setPolicyForm((prev) => ({ ...prev, freeDeliveryThreshold: event.target.value }))}
                  placeholder="무료배송 기준"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <div className="flex gap-2">
                  <input
                    value={policyForm.allowReservationDays}
                    onChange={(event) => setPolicyForm((prev) => ({ ...prev, allowReservationDays: event.target.value }))}
                    placeholder="예약 가능일수"
                    className="w-full rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                  />
                  <button type="submit" className="rounded-lg bg-[#166847] px-3 py-1 text-sm font-bold text-white">
                    저장
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-2xl border border-[#d8ddd3] p-4">
              <h2 className="text-lg font-black">행사 등록</h2>
              <form className="mt-3 grid gap-2 md:grid-cols-4" onSubmit={(event) => void submitPromotion(event)}>
                <input
                  required
                  value={promotionForm.title}
                  onChange={(event) => setPromotionForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="행사 제목"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  value={promotionForm.promoType}
                  onChange={(event) => setPromotionForm((prev) => ({ ...prev, promoType: event.target.value }))}
                  placeholder="타입"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  value={promotionForm.productIdsCsv}
                  onChange={(event) => setPromotionForm((prev) => ({ ...prev, productIdsCsv: event.target.value }))}
                  placeholder="상품ID CSV (예:1,2)"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  value={promotionForm.promoPrice}
                  onChange={(event) => setPromotionForm((prev) => ({ ...prev, promoPrice: event.target.value }))}
                  placeholder="행사가"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  required
                  type="datetime-local"
                  value={promotionForm.startAt}
                  onChange={(event) => setPromotionForm((prev) => ({ ...prev, startAt: event.target.value }))}
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  required
                  type="datetime-local"
                  value={promotionForm.endAt}
                  onChange={(event) => setPromotionForm((prev) => ({ ...prev, endAt: event.target.value }))}
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  value={promotionForm.bannerImageUrl}
                  onChange={(event) => setPromotionForm((prev) => ({ ...prev, bannerImageUrl: event.target.value }))}
                  placeholder="배너 이미지 URL"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <button type="submit" className="rounded-lg bg-[#166847] px-3 py-1 text-sm font-bold text-white">
                  행사 등록
                </button>
              </form>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#d8ddd3] text-left">
                      <th className="px-2 py-2">ID</th>
                      <th className="px-2 py-2">제목</th>
                      <th className="px-2 py-2">상품</th>
                      <th className="px-2 py-2">기간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promotions.map((promotion) => (
                      <tr key={promotion.id} className="border-b border-[#eef1eb]">
                        <td className="px-2 py-2">{promotion.id}</td>
                        <td className="px-2 py-2">{promotion.title}</td>
                        <td className="px-2 py-2">{promotion.product_ids.join(", ")}</td>
                        <td className="px-2 py-2">
                          {formatDate(promotion.start_at)} ~ {formatDate(promotion.end_at)}
                        </td>
                      </tr>
                    ))}
                    {!promotions.length && (
                      <tr>
                        <td className="px-2 py-3 text-[#60756c]" colSpan={4}>
                          등록된 행사가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-[#d8ddd3] p-4">
              <h2 className="text-lg font-black">배너 등록</h2>
              <form className="mt-3 grid gap-2 md:grid-cols-4" onSubmit={(event) => void submitBanner(event)}>
                <input
                  required
                  value={bannerForm.title}
                  onChange={(event) => setBannerForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="배너 제목"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  required
                  value={bannerForm.imageUrl}
                  onChange={(event) => setBannerForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                  placeholder="이미지 URL"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  value={bannerForm.linkType}
                  onChange={(event) => setBannerForm((prev) => ({ ...prev, linkType: event.target.value }))}
                  placeholder="링크 타입"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  value={bannerForm.linkTarget}
                  onChange={(event) => setBannerForm((prev) => ({ ...prev, linkTarget: event.target.value }))}
                  placeholder="링크 타겟"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  value={bannerForm.displayOrder}
                  onChange={(event) => setBannerForm((prev) => ({ ...prev, displayOrder: event.target.value }))}
                  type="number"
                  placeholder="노출순서"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  required
                  type="datetime-local"
                  value={bannerForm.startAt}
                  onChange={(event) => setBannerForm((prev) => ({ ...prev, startAt: event.target.value }))}
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  required
                  type="datetime-local"
                  value={bannerForm.endAt}
                  onChange={(event) => setBannerForm((prev) => ({ ...prev, endAt: event.target.value }))}
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <button type="submit" className="rounded-lg bg-[#166847] px-3 py-1 text-sm font-bold text-white">
                  배너 등록
                </button>
              </form>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#d8ddd3] text-left">
                      <th className="px-2 py-2">ID</th>
                      <th className="px-2 py-2">제목</th>
                      <th className="px-2 py-2">순서</th>
                      <th className="px-2 py-2">활성</th>
                    </tr>
                  </thead>
                  <tbody>
                    {banners.map((banner) => (
                      <tr key={banner.id} className="border-b border-[#eef1eb]">
                        <td className="px-2 py-2">{banner.id}</td>
                        <td className="px-2 py-2">{banner.title}</td>
                        <td className="px-2 py-2">{banner.display_order}</td>
                        <td className="px-2 py-2">{String(banner.is_active)}</td>
                      </tr>
                    ))}
                    {!banners.length && (
                      <tr>
                        <td className="px-2 py-3 text-[#60756c]" colSpan={4}>
                          등록된 배너가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-[#d8ddd3] p-4">
              <h2 className="text-lg font-black">공지 등록</h2>
              <form className="mt-3 grid gap-2 md:grid-cols-5" onSubmit={(event) => void submitNotice(event)}>
                <input
                  required
                  value={noticeForm.title}
                  onChange={(event) => setNoticeForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="공지 제목"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  required
                  value={noticeForm.body}
                  onChange={(event) => setNoticeForm((prev) => ({ ...prev, body: event.target.value }))}
                  placeholder="공지 내용"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  required
                  type="datetime-local"
                  value={noticeForm.startAt}
                  onChange={(event) => setNoticeForm((prev) => ({ ...prev, startAt: event.target.value }))}
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  required
                  type="datetime-local"
                  value={noticeForm.endAt}
                  onChange={(event) => setNoticeForm((prev) => ({ ...prev, endAt: event.target.value }))}
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <label className="flex items-center gap-1 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={noticeForm.pinned}
                    onChange={(event) => setNoticeForm((prev) => ({ ...prev, pinned: event.target.checked }))}
                  />
                  고정
                </label>
                <button type="submit" className="rounded-lg bg-[#166847] px-3 py-1 text-sm font-bold text-white">
                  공지 등록
                </button>
              </form>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#d8ddd3] text-left">
                      <th className="px-2 py-2">ID</th>
                      <th className="px-2 py-2">제목</th>
                      <th className="px-2 py-2">고정</th>
                      <th className="px-2 py-2">기간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notices.map((notice) => (
                      <tr key={notice.id} className="border-b border-[#eef1eb]">
                        <td className="px-2 py-2">{notice.id}</td>
                        <td className="px-2 py-2">{notice.title}</td>
                        <td className="px-2 py-2">{String(notice.is_pinned)}</td>
                        <td className="px-2 py-2">
                          {formatDate(notice.start_at)} ~ {formatDate(notice.end_at)}
                        </td>
                      </tr>
                    ))}
                    {!notices.length && (
                      <tr>
                        <td className="px-2 py-3 text-[#60756c]" colSpan={4}>
                          등록된 공지가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
