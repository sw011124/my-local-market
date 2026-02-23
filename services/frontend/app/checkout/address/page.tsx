"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Search } from "lucide-react";

import { trackEvent } from "@/lib/analytics";
import {
  createSavedAddress,
  getSavedAddresses,
  updateSavedAddress,
} from "@/lib/market-api";
import {
  type CheckoutDeliveryProfile,
  type DeliveryMemoType,
  DELIVERY_MEMO_OPTIONS,
  getDefaultDeliveryMemoNote,
  loadCheckoutDeliveryProfile,
  saveCheckoutDeliveryProfile,
} from "@/lib/checkout-delivery-profile";
import type { SavedAddress } from "@/lib/market-types";
import { ensureMarketSessionKey } from "@/lib/session-client";

const DAUM_POSTCODE_SCRIPT_ID = "daum-postcode-script";
const DAUM_POSTCODE_SCRIPT_SRC =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

type DaumPostcodeData = {
  address: string;
  roadAddress: string;
  jibunAddress: string;
  bcode: string;
  buildingName: string;
};

type DaumPostcodeOptions = {
  oncomplete: (data: DaumPostcodeData) => void;
};

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: DaumPostcodeOptions) => {
        open: () => void;
      };
    };
  }
}

const EMPTY_PROFILE: CheckoutDeliveryProfile = {
  customerName: "",
  customerPhone: "",
  addressLine1: "",
  addressLine2: "",
  building: "",
  unitNo: "",
  dongCode: "1535011000",
  apartmentName: "",
  latitude: "",
  longitude: "",
  deliveryMemoType: "door",
  deliveryRequestNote: getDefaultDeliveryMemoNote("door"),
};

function parseCoordinate(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toAddressProfile(address: SavedAddress): Partial<CheckoutDeliveryProfile> {
  return {
    customerName: address.recipient_name ?? "",
    customerPhone: address.phone ?? "",
    addressLine1: address.address_line1,
    addressLine2: address.address_line2 ?? "",
    building: address.building ?? "",
    unitNo: address.unit_no ?? "",
    dongCode: address.dong_code ?? "1535011000",
    apartmentName: address.apartment_name ?? "",
    latitude: address.latitude ?? "",
    longitude: address.longitude ?? "",
  };
}

export default function CheckoutAddressPage() {
  const router = useRouter();

  const [form, setForm] = useState<CheckoutDeliveryProfile>(() => {
    if (typeof window === "undefined") {
      return EMPTY_PROFILE;
    }
    return loadCheckoutDeliveryProfile();
  });
  const [isAddressSearchReady, setIsAddressSearchReady] = useState<boolean>(
    () => {
      if (typeof window === "undefined") {
        return false;
      }
      return Boolean(window.daum?.Postcode);
    },
  );
  const [isAddressSearchLoading, setIsAddressSearchLoading] =
    useState<boolean>(() => {
      if (typeof window === "undefined") {
        return true;
      }
      return !window.daum?.Postcode;
    });
  const [addressSearchError, setAddressSearchError] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(
    null,
  );
  const [isSavedAddressesLoading, setIsSavedAddressesLoading] =
    useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.daum?.Postcode) {
      return;
    }

    const existingScript = document.getElementById(
      DAUM_POSTCODE_SCRIPT_ID,
    ) as HTMLScriptElement | null;

    if (existingScript) {
      const onLoad = (): void => {
        setIsAddressSearchReady(true);
        setIsAddressSearchLoading(false);
      };
      const onError = (): void => {
        setIsAddressSearchReady(false);
        setIsAddressSearchLoading(false);
        setAddressSearchError("주소 검색 모듈을 불러오지 못했습니다.");
      };
      existingScript.addEventListener("load", onLoad);
      existingScript.addEventListener("error", onError);
      return () => {
        existingScript.removeEventListener("load", onLoad);
        existingScript.removeEventListener("error", onError);
      };
    }

    const script = document.createElement("script");
    script.id = DAUM_POSTCODE_SCRIPT_ID;
    script.src = DAUM_POSTCODE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      setIsAddressSearchReady(true);
      setIsAddressSearchLoading(false);
    };
    script.onerror = () => {
      setIsAddressSearchReady(false);
      setIsAddressSearchLoading(false);
      setAddressSearchError("주소 검색 모듈을 불러오지 못했습니다.");
    };
    document.body.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function bootstrapSavedAddresses(): Promise<void> {
      setIsSavedAddressesLoading(true);
      try {
        const key = await ensureMarketSessionKey();
        const addresses = await getSavedAddresses(key);
        if (!mounted) {
          return;
        }

        setSessionKey(key);
        setSavedAddresses(addresses);

        const storedProfile = loadCheckoutDeliveryProfile();
        const hasStoredAddress = Boolean(storedProfile.addressLine1.trim());
        const matchedStoredAddress =
          addresses.find(
            (address) =>
              address.address_line1 === storedProfile.addressLine1 &&
              (address.address_line2 ?? "") === storedProfile.addressLine2,
          ) ?? null;

        if (matchedStoredAddress) {
          setSelectedAddressId(matchedStoredAddress.id);
        } else {
          const fallbackAddress =
            addresses.find((address) => address.is_default) ?? addresses[0] ?? null;
          if (fallbackAddress) {
            setSelectedAddressId(fallbackAddress.id);
            if (!hasStoredAddress) {
              setForm((prev) => ({
                ...prev,
                ...toAddressProfile(fallbackAddress),
              }));
            }
          }
        }
      } catch (error) {
        if (!mounted) {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "저장된 배송지 목록을 불러오지 못했습니다.";
        setErrorMessage(message);
      } finally {
        if (mounted) {
          setIsSavedAddressesLoading(false);
        }
      }
    }

    void bootstrapSavedAddresses();

    return () => {
      mounted = false;
    };
  }, []);

  function setField<K extends keyof CheckoutDeliveryProfile>(
    key: K,
    value: CheckoutDeliveryProfile[K],
  ): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleDeliveryMemoTypeChange(nextMemoType: DeliveryMemoType): void {
    setForm((prev) => {
      if (nextMemoType === "custom") {
        return {
          ...prev,
          deliveryMemoType: nextMemoType,
          deliveryRequestNote:
            prev.deliveryMemoType === "custom" ? prev.deliveryRequestNote : "",
        };
      }
      return {
        ...prev,
        deliveryMemoType: nextMemoType,
        deliveryRequestNote: getDefaultDeliveryMemoNote(nextMemoType),
      };
    });
  }

  function openAddressSearch(): void {
    trackEvent("address_change_click", { source: "address_page" });

    if (!window.daum?.Postcode) {
      setAddressSearchError("주소 검색 모듈이 아직 준비되지 않았습니다.");
      return;
    }

    setAddressSearchError(null);
    const postcode = new window.daum.Postcode({
      oncomplete: (data) => {
        const selectedAddress = data.roadAddress || data.jibunAddress || data.address;
        setForm((prev) => ({
          ...prev,
          addressLine1: selectedAddress,
          addressLine2: "",
          building: data.buildingName || prev.building,
          apartmentName: data.buildingName || prev.apartmentName,
          dongCode: data.bcode || prev.dongCode,
        }));
        trackEvent("address_selected", {
          dong_code: data.bcode || null,
          apartment_name: data.buildingName || null,
        });
      },
    });
    postcode.open();
  }

  function handleSelectSavedAddress(address: SavedAddress): void {
    setSelectedAddressId(address.id);
    setErrorMessage(null);
    setForm((prev) => ({
      ...prev,
      ...toAddressProfile(address),
    }));
    trackEvent("address_selected", {
      source: "address_page",
      address_id: address.id,
      is_default: address.is_default,
    });
  }

  function handleCreateNewAddress(): void {
    setSelectedAddressId(null);
    setErrorMessage(null);
    setForm((prev) => ({
      ...prev,
      customerName: "",
      customerPhone: "",
      addressLine1: "",
      addressLine2: "",
      building: "",
      unitNo: "",
      dongCode: "1535011000",
      apartmentName: "",
      latitude: "",
      longitude: "",
    }));
    trackEvent("address_change_click", {
      source: "address_page",
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);

    const normalizedForm: CheckoutDeliveryProfile = {
      ...form,
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim(),
      building: form.building.trim(),
      unitNo: form.unitNo.trim(),
      dongCode: form.dongCode.trim() || "1535011000",
      apartmentName: form.apartmentName.trim(),
      latitude: form.latitude.trim(),
      longitude: form.longitude.trim(),
      deliveryRequestNote: form.deliveryRequestNote.trim(),
    };

    if (!normalizedForm.customerName || !normalizedForm.customerPhone) {
      setErrorMessage("수령인 이름과 연락처를 입력해 주세요.");
      return;
    }
    if (!normalizedForm.addressLine1) {
      setErrorMessage("기본 주소를 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const key = sessionKey ?? (await ensureMarketSessionKey());
      if (!sessionKey) {
        setSessionKey(key);
      }

      const payload = {
        recipient_name: normalizedForm.customerName || null,
        phone: normalizedForm.customerPhone || null,
        address_line1: normalizedForm.addressLine1,
        address_line2: normalizedForm.addressLine2 || null,
        building: normalizedForm.building || null,
        unit_no: normalizedForm.unitNo || null,
        dong_code: normalizedForm.dongCode || null,
        apartment_name: normalizedForm.apartmentName || null,
        latitude: parseCoordinate(normalizedForm.latitude),
        longitude: parseCoordinate(normalizedForm.longitude),
      };

      if (selectedAddressId) {
        await updateSavedAddress(key, selectedAddressId, payload);
        trackEvent("address_change_click", {
          source: "address_page",
          address_id: selectedAddressId,
          mode: "update",
        });
      } else {
        const created = await createSavedAddress(key, {
          ...payload,
          is_default: savedAddresses.length === 0,
        });
        setSelectedAddressId(created.id);
        trackEvent("address_change_click", {
          source: "address_page",
          address_id: created.id,
          mode: "create",
        });
      }

      saveCheckoutDeliveryProfile(normalizedForm);
      router.push("/checkout");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "배송지 저장 중 오류가 발생했습니다.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 pb-6 pt-2 text-black">
      <section className="mx-auto max-w-3xl">
        <header className="mb-3 flex items-center gap-2 border-b border-gray-200 py-2">
          <button
            type="button"
            onClick={() => router.push("/checkout")}
            className="inline-flex h-11 w-11 items-center justify-center text-gray-700 transition hover:text-red-600"
            aria-label="뒤로가기"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold text-gray-900">배송지 입력</h1>
        </header>

        <form onSubmit={handleSubmit} className="space-y-3">
          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">저장된 배송지</h2>
              <span className="text-xs font-semibold text-gray-500">
                {savedAddresses.length}개
              </span>
            </div>

            {isSavedAddressesLoading ? (
              <p className="mt-2 text-xs text-gray-500">
                저장된 배송지를 불러오는 중입니다...
              </p>
            ) : null}

            {!isSavedAddressesLoading && savedAddresses.length === 0 ? (
              <p className="mt-2 text-xs text-gray-500">
                아직 저장된 배송지가 없습니다. 아래 버튼으로 신규 배송지를 추가해 주세요.
              </p>
            ) : null}

            <div className="mt-2 space-y-2">
              {savedAddresses.map((address) => {
                const isSelected = selectedAddressId === address.id;
                return (
                  <button
                    key={address.id}
                    type="button"
                    onClick={() => handleSelectSavedAddress(address)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      isSelected
                        ? "border-red-500 bg-red-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-gray-900">
                        {address.label?.trim() || "배송지"}
                      </p>
                      {address.is_default ? (
                        <span className="rounded-full bg-black px-2 py-1 text-[10px] font-bold text-white">
                          기본
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-gray-700">
                      {address.address_line1}
                      {address.address_line2 ? ` ${address.address_line2}` : ""}
                    </p>
                    {(address.recipient_name || address.phone) && (
                      <p className="mt-1 text-[11px] font-medium text-gray-500">
                        {address.recipient_name ?? "수령인 미입력"}
                        {address.phone ? ` · ${address.phone}` : ""}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleCreateNewAddress}
              className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-sm font-semibold text-gray-700 transition hover:border-red-300 hover:text-red-600"
            >
              <Plus size={16} className="mr-1.5" />
              신규 배송지 추가
            </button>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-bold text-gray-900">수령인 정보</h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-semibold text-gray-700">
                수령인
                <input
                  required
                  value={form.customerName}
                  onChange={(event) => setField("customerName", event.target.value)}
                  placeholder="수령인 이름"
                  className="h-11 rounded-xl border border-gray-200 px-3 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-gray-700">
                연락처
                <input
                  required
                  value={form.customerPhone}
                  onChange={(event) => setField("customerPhone", event.target.value)}
                  placeholder="휴대폰 번호"
                  className="h-11 rounded-xl border border-gray-200 px-3 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-gray-900">배송지 주소</h2>
              <button
                type="button"
                onClick={openAddressSearch}
                disabled={isAddressSearchLoading}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
              >
                <Search className="mr-1.5" size={14} />
                주소 검색
              </button>
            </div>

            <label className="mt-3 grid gap-1 text-xs font-semibold text-gray-700">
              기본 주소
              <input
                required
                value={form.addressLine1}
                onChange={(event) => setField("addressLine1", event.target.value)}
                placeholder="주소 검색 또는 직접 입력"
                className="h-11 rounded-xl border border-gray-200 px-3 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
            </label>

            <label className="mt-2 grid gap-1 text-xs font-semibold text-gray-700">
              상세 주소
              <input
                value={form.addressLine2}
                onChange={(event) => setField("addressLine2", event.target.value)}
                placeholder="동/호수, 층 정보"
                className="h-11 rounded-xl border border-gray-200 px-3 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
            </label>

            {isAddressSearchLoading ? (
              <p className="mt-2 text-xs text-gray-500">
                주소 검색 모듈을 준비하고 있습니다...
              </p>
            ) : null}
            {addressSearchError ? (
              <p className="mt-2 text-xs font-semibold text-red-600">
                {addressSearchError}
              </p>
            ) : null}
            {!isAddressSearchLoading && !isAddressSearchReady && !addressSearchError ? (
              <p className="mt-2 text-xs font-semibold text-red-600">
                주소 검색 기능을 사용할 수 없습니다. 주소를 직접 입력해 주세요.
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-bold text-gray-900">배송 메모</h2>
            <select
              value={form.deliveryMemoType}
              onChange={(event) =>
                handleDeliveryMemoTypeChange(
                  event.target.value as DeliveryMemoType,
                )
              }
              className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
            >
              {DELIVERY_MEMO_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>

            {form.deliveryMemoType === "custom" ? (
              <textarea
                value={form.deliveryRequestNote}
                onChange={(event) =>
                  setField("deliveryRequestNote", event.target.value)
                }
                rows={2}
                placeholder="배송 시 요청사항"
                className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
            ) : (
              <p className="mt-2 text-xs text-gray-500">
                선택된 메모: {form.deliveryRequestNote}
              </p>
            )}
          </section>

          {errorMessage ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => router.push("/checkout")}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 transition hover:border-red-300 hover:text-red-600"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-red-600 text-sm font-bold text-white transition hover:bg-red-500"
            >
              {isSubmitting
                ? "저장 중..."
                : selectedAddressId
                  ? "배송지 수정 후 돌아가기"
                  : "배송지 저장 후 돌아가기"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
