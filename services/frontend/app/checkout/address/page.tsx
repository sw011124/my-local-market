"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, MapPin, Plus } from "lucide-react";

import { trackEvent } from "@/lib/analytics";
import { getSavedAddresses } from "@/lib/market-api";
import {
  type CheckoutDeliveryProfile,
  loadCheckoutDeliveryProfile,
  saveCheckoutDeliveryProfile,
} from "@/lib/checkout-delivery-profile";
import type { SavedAddress } from "@/lib/market-types";
import { ensureMarketSessionKey } from "@/lib/session-client";

function toProfileFromAddress(address: SavedAddress): Partial<CheckoutDeliveryProfile> {
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

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedAddress = useMemo(
    () => savedAddresses.find((address) => address.id === selectedAddressId) ?? null,
    [savedAddresses, selectedAddressId],
  );

  useEffect(() => {
    let mounted = true;

    async function bootstrapSavedAddresses(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const key = await ensureMarketSessionKey();
        const addresses = await getSavedAddresses(key);

        if (!mounted) {
          return;
        }

        setSavedAddresses(addresses);

        const storedProfile = loadCheckoutDeliveryProfile();
        const matched =
          addresses.find(
            (address) =>
              address.address_line1 === storedProfile.addressLine1 &&
              (address.address_line2 ?? "") === storedProfile.addressLine2,
          ) ?? null;

        const fallback =
          addresses.find((address) => address.is_default) ?? addresses[0] ?? null;

        setSelectedAddressId((matched ?? fallback)?.id ?? null);
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
          setIsLoading(false);
        }
      }
    }

    void bootstrapSavedAddresses();

    return () => {
      mounted = false;
    };
  }, []);

  function handleSelectAddress(addressId: number): void {
    setSelectedAddressId(addressId);
    setErrorMessage(null);

    const target = savedAddresses.find((address) => address.id === addressId);
    if (!target) {
      return;
    }

    trackEvent("address_selected", {
      source: "address_selector",
      address_id: target.id,
      is_default: target.is_default,
    });
  }

  function handleGoNewAddress(): void {
    trackEvent("address_change_click", {
      source: "address_selector",
      action: "new",
    });
    router.push("/checkout/address/new");
  }

  function handleApplySelectedAddress(): void {
    if (!selectedAddress) {
      setErrorMessage("변경할 배송지를 선택해 주세요.");
      return;
    }

    const currentProfile = loadCheckoutDeliveryProfile();
    saveCheckoutDeliveryProfile({
      ...currentProfile,
      ...toProfileFromAddress(selectedAddress),
    });

    trackEvent("address_change_click", {
      source: "address_selector",
      action: "apply",
      address_id: selectedAddress.id,
    });

    router.push("/checkout");
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
          <h1 className="text-lg font-bold text-gray-900">배송지 변경</h1>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">저장된 배송지</h2>
            <span className="text-xs font-semibold text-gray-500">
              {savedAddresses.length}개
            </span>
          </div>

          {isLoading ? (
            <p className="mt-3 text-xs text-gray-500">
              저장된 배송지를 불러오는 중입니다...
            </p>
          ) : null}

          {!isLoading && !errorMessage && savedAddresses.length === 0 ? (
            <p className="mt-3 text-xs text-gray-500">
              저장된 배송지가 없습니다. 아래 버튼으로 신규 배송지를 추가해 주세요.
            </p>
          ) : null}

          <div className="mt-3 space-y-2">
            {savedAddresses.map((address) => {
              const isSelected = selectedAddressId === address.id;
              return (
                <button
                  key={address.id}
                  type="button"
                  onClick={() => handleSelectAddress(address.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    isSelected
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {isSelected ? (
                        <CheckCircle2 size={16} className="shrink-0 text-red-600" />
                      ) : (
                        <MapPin size={16} className="shrink-0 text-gray-400" />
                      )}
                      <p className="truncate text-sm font-bold text-gray-900">
                        {address.label?.trim() || "배송지"}
                      </p>
                    </div>
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

                  {(address.recipient_name || address.phone) ? (
                    <p className="mt-1 text-[11px] font-medium text-gray-500">
                      {address.recipient_name ?? "수령인 미입력"}
                      {address.phone ? ` · ${address.phone}` : ""}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>

          {errorMessage ? (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleGoNewAddress}
            className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-xl bg-gray-900 text-sm font-bold text-white transition hover:bg-black"
          >
            <Plus size={16} className="mr-1.5" />
            신규 배송지 추가
          </button>

          <button
            type="button"
            onClick={handleApplySelectedAddress}
            disabled={!selectedAddress || isLoading}
            className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-xl bg-red-600 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            선택한 배송지로 변경
          </button>
        </section>
      </section>
    </main>
  );
}
