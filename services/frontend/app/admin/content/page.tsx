"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { clearAdminToken, readAdminToken } from "@/lib/admin-session-client";
import {
  createAdminDeliveryZone,
  createAdminHoliday,
  createAdminBanner,
  createAdminNotice,
  createAdminPromotion,
  deleteAdminDeliveryZone,
  deleteAdminHoliday,
  getAdminDeliveryZones,
  getAdminHolidays,
  getAdminBanners,
  getAdminNotices,
  getAdminPolicy,
  getAdminPromotions,
  patchAdminDeliveryZone,
  patchAdminHoliday,
  patchAdminPolicy,
} from "@/lib/market-api";
import type {
  AdminBanner,
  AdminDeliveryZone,
  AdminHoliday,
  AdminNotice,
  AdminPolicy,
  AdminPromotion,
  DeliveryZoneType,
} from "@/lib/market-types";

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
  const [deliveryZones, setDeliveryZones] = useState<AdminDeliveryZone[]>([]);
  const [holidays, setHolidays] = useState<AdminHoliday[]>([]);
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
    openTime: "",
    closeTime: "",
    sameDayCutoffTime: "",
    minOrderAmount: "",
    baseDeliveryFee: "",
    freeDeliveryThreshold: "",
    allowReservationDays: "",
  });

  const [zoneForm, setZoneForm] = useState({
    zoneType: "DONG" as DeliveryZoneType,
    dongCode: "",
    apartmentName: "",
    centerLat: "",
    centerLng: "",
    radiusM: "",
    minOrderAmount: "",
    baseFee: "",
    freeDeliveryThreshold: "",
  });

  const [holidayForm, setHolidayForm] = useState({
    holidayDate: "",
    reason: "",
    isClosed: true,
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
      const [promotionResult, bannerResult, noticeResult, policyResult, zoneResult, holidayResult] = await Promise.all([
        getAdminPromotions(nextToken),
        getAdminBanners(nextToken),
        getAdminNotices(nextToken),
        getAdminPolicy(nextToken),
        getAdminDeliveryZones(nextToken),
        getAdminHolidays(nextToken),
      ]);
      setPromotions(promotionResult);
      setBanners(bannerResult);
      setNotices(noticeResult);
      setPolicy(policyResult);
      setDeliveryZones(zoneResult);
      setHolidays(holidayResult);
      setPolicyForm({
        openTime: policyResult.open_time.slice(0, 5),
        closeTime: policyResult.close_time.slice(0, 5),
        sameDayCutoffTime: policyResult.same_day_cutoff_time.slice(0, 5),
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
        open_time: policyForm.openTime.trim() || undefined,
        close_time: policyForm.closeTime.trim() || undefined,
        same_day_cutoff_time: policyForm.sameDayCutoffTime.trim() || undefined,
        min_order_amount_default: policyForm.minOrderAmount.trim() || undefined,
        base_delivery_fee_default: policyForm.baseDeliveryFee.trim() || undefined,
        free_delivery_threshold_default: policyForm.freeDeliveryThreshold.trim() || undefined,
        allow_reservation_days: policyForm.allowReservationDays.trim() ? Number(policyForm.allowReservationDays) : undefined,
      });
      setPolicy(updated);
      setPolicyForm((prev) => ({
        ...prev,
        openTime: updated.open_time.slice(0, 5),
        closeTime: updated.close_time.slice(0, 5),
        sameDayCutoffTime: updated.same_day_cutoff_time.slice(0, 5),
      }));
      setInfoMessage("운영 정책을 저장했습니다.");
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "운영 정책 저장에 실패했습니다.";
      setErrorMessage(message);
    }
  }

  async function submitDeliveryZone(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!token) {
      return;
    }

    try {
      await createAdminDeliveryZone(token, {
        zone_type: zoneForm.zoneType,
        dong_code: zoneForm.dongCode.trim() || null,
        apartment_name: zoneForm.apartmentName.trim() || null,
        center_lat: zoneForm.centerLat.trim() || null,
        center_lng: zoneForm.centerLng.trim() || null,
        radius_m: zoneForm.radiusM.trim() ? Number(zoneForm.radiusM) : null,
        min_order_amount: zoneForm.minOrderAmount.trim() || null,
        base_fee: zoneForm.baseFee.trim() || null,
        free_delivery_threshold: zoneForm.freeDeliveryThreshold.trim() || null,
        is_active: true,
      });

      setZoneForm({
        zoneType: "DONG",
        dongCode: "",
        apartmentName: "",
        centerLat: "",
        centerLng: "",
        radiusM: "",
        minOrderAmount: "",
        baseFee: "",
        freeDeliveryThreshold: "",
      });
      await loadAll(token);
      setInfoMessage("배송 권역을 등록했습니다.");
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "배송 권역 등록에 실패했습니다.";
      setErrorMessage(message);
    }
  }

  async function toggleZoneActive(zone: AdminDeliveryZone): Promise<void> {
    if (!token) {
      return;
    }
    try {
      if (zone.is_active) {
        await deleteAdminDeliveryZone(token, zone.id);
      } else {
        await patchAdminDeliveryZone(token, zone.id, { is_active: true });
      }
      await loadAll(token);
      setInfoMessage("배송 권역 상태를 변경했습니다.");
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "배송 권역 상태 변경에 실패했습니다.";
      setErrorMessage(message);
    }
  }

  async function submitHoliday(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!token) {
      return;
    }
    if (!holidayForm.holidayDate.trim()) {
      setErrorMessage("휴무일 날짜를 입력해 주세요.");
      return;
    }

    try {
      await createAdminHoliday(token, {
        holiday_date: holidayForm.holidayDate.trim(),
        reason: holidayForm.reason.trim() || null,
        is_closed: holidayForm.isClosed,
      });
      setHolidayForm({
        holidayDate: "",
        reason: "",
        isClosed: true,
      });
      await loadAll(token);
      setInfoMessage("휴무일을 등록했습니다.");
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "휴무일 등록에 실패했습니다.";
      setErrorMessage(message);
    }
  }

  async function toggleHolidayClosed(holiday: AdminHoliday): Promise<void> {
    if (!token) {
      return;
    }
    try {
      await patchAdminHoliday(token, holiday.id, { is_closed: !holiday.is_closed });
      await loadAll(token);
      setInfoMessage("휴무일 상태를 변경했습니다.");
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "휴무일 상태 변경에 실패했습니다.";
      setErrorMessage(message);
    }
  }

  async function removeHoliday(holidayId: number): Promise<void> {
    if (!token) {
      return;
    }
    try {
      await deleteAdminHoliday(token, holidayId);
      await loadAll(token);
      setInfoMessage("휴무일을 삭제했습니다.");
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "휴무일 삭제에 실패했습니다.";
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
              <form className="mt-3 grid gap-2 md:grid-cols-4 lg:grid-cols-7" onSubmit={(event) => void submitPolicyPatch(event)}>
                <input
                  type="time"
                  value={policyForm.openTime}
                  onChange={(event) => setPolicyForm((prev) => ({ ...prev, openTime: event.target.value }))}
                  placeholder="영업 시작"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  type="time"
                  value={policyForm.closeTime}
                  onChange={(event) => setPolicyForm((prev) => ({ ...prev, closeTime: event.target.value }))}
                  placeholder="영업 종료"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  type="time"
                  value={policyForm.sameDayCutoffTime}
                  onChange={(event) => setPolicyForm((prev) => ({ ...prev, sameDayCutoffTime: event.target.value }))}
                  placeholder="당일 마감"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
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
              <h2 className="text-lg font-black">배송 권역</h2>
              <p className="mt-1 text-xs text-[#60756c]">동/아파트/반경을 혼합해서 운영합니다. 우선순위: 아파트 → 동 → 반경</p>

              <form className="mt-3 grid gap-2 md:grid-cols-4" onSubmit={(event) => void submitDeliveryZone(event)}>
                <select
                  value={zoneForm.zoneType}
                  onChange={(event) => setZoneForm((prev) => ({ ...prev, zoneType: event.target.value as DeliveryZoneType }))}
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                >
                  <option value="DONG">DONG</option>
                  <option value="APARTMENT">APARTMENT</option>
                  <option value="RADIUS">RADIUS</option>
                </select>
                <input
                  value={zoneForm.dongCode}
                  onChange={(event) => setZoneForm((prev) => ({ ...prev, dongCode: event.target.value }))}
                  placeholder="dong_code"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  value={zoneForm.apartmentName}
                  onChange={(event) => setZoneForm((prev) => ({ ...prev, apartmentName: event.target.value }))}
                  placeholder="apartment_name"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  value={zoneForm.radiusM}
                  onChange={(event) => setZoneForm((prev) => ({ ...prev, radiusM: event.target.value }))}
                  placeholder="radius(m)"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  value={zoneForm.centerLat}
                  onChange={(event) => setZoneForm((prev) => ({ ...prev, centerLat: event.target.value }))}
                  placeholder="center_lat"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  value={zoneForm.centerLng}
                  onChange={(event) => setZoneForm((prev) => ({ ...prev, centerLng: event.target.value }))}
                  placeholder="center_lng"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  value={zoneForm.minOrderAmount}
                  onChange={(event) => setZoneForm((prev) => ({ ...prev, minOrderAmount: event.target.value }))}
                  placeholder="최소 주문금액(override)"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <div className="flex gap-2">
                  <input
                    value={zoneForm.baseFee}
                    onChange={(event) => setZoneForm((prev) => ({ ...prev, baseFee: event.target.value }))}
                    placeholder="배송비(override)"
                    className="w-full rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                  />
                  <input
                    value={zoneForm.freeDeliveryThreshold}
                    onChange={(event) => setZoneForm((prev) => ({ ...prev, freeDeliveryThreshold: event.target.value }))}
                    placeholder="무료배송 기준"
                    className="w-full rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                  />
                  <button type="submit" className="rounded-lg bg-[#166847] px-3 py-1 text-sm font-bold text-white">
                    권역 등록
                  </button>
                </div>
              </form>

              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#d8ddd3] text-left">
                      <th className="px-2 py-2">타입</th>
                      <th className="px-2 py-2">식별자</th>
                      <th className="px-2 py-2">정책</th>
                      <th className="px-2 py-2">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryZones.map((zone) => (
                      <tr key={zone.id} className="border-b border-[#eef1eb]">
                        <td className="px-2 py-2 font-semibold">{zone.zone_type}</td>
                        <td className="px-2 py-2">
                          {zone.apartment_name || zone.dong_code || `${zone.center_lat}, ${zone.center_lng} / ${zone.radius_m}m`}
                        </td>
                        <td className="px-2 py-2">
                          최소 {zone.min_order_amount ?? "-"} / 배송비 {zone.base_fee ?? "-"} / 무료 {zone.free_delivery_threshold ?? "-"}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => void toggleZoneActive(zone)}
                              className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-xs font-bold"
                            >
                              {zone.is_active ? "비활성화" : "활성화"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!deliveryZones.length && (
                      <tr>
                        <td className="px-2 py-3 text-[#60756c]" colSpan={4}>
                          등록된 배송 권역이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-[#d8ddd3] p-4">
              <h2 className="text-lg font-black">휴무일</h2>
              <form className="mt-3 grid gap-2 md:grid-cols-4" onSubmit={(event) => void submitHoliday(event)}>
                <input
                  type="date"
                  value={holidayForm.holidayDate}
                  onChange={(event) => setHolidayForm((prev) => ({ ...prev, holidayDate: event.target.value }))}
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <input
                  value={holidayForm.reason}
                  onChange={(event) => setHolidayForm((prev) => ({ ...prev, reason: event.target.value }))}
                  placeholder="사유"
                  className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm"
                />
                <label className="inline-flex items-center gap-2 rounded-lg border border-[#d8ddd3] px-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={holidayForm.isClosed}
                    onChange={(event) => setHolidayForm((prev) => ({ ...prev, isClosed: event.target.checked }))}
                  />
                  주문 차단
                </label>
                <button type="submit" className="rounded-lg bg-[#166847] px-3 py-1 text-sm font-bold text-white">
                  휴무일 등록
                </button>
              </form>

              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#d8ddd3] text-left">
                      <th className="px-2 py-2">날짜</th>
                      <th className="px-2 py-2">사유</th>
                      <th className="px-2 py-2">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holidays.map((holiday) => (
                      <tr key={holiday.id} className="border-b border-[#eef1eb]">
                        <td className="px-2 py-2">{holiday.holiday_date}</td>
                        <td className="px-2 py-2">{holiday.reason || "-"}</td>
                        <td className="px-2 py-2">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => void toggleHolidayClosed(holiday)}
                              className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-xs font-bold"
                            >
                              {holiday.is_closed ? "휴무 해제" : "휴무 전환"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void removeHoliday(holiday.id)}
                              className="rounded-lg border border-[#d8ddd3] px-2 py-1 text-xs font-bold"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!holidays.length && (
                      <tr>
                        <td className="px-2 py-3 text-[#60756c]" colSpan={3}>
                          등록된 휴무일이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
