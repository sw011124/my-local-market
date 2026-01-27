"use client";

import { useState, useRef } from "react";
import {
  ChevronLeft,
  X,
  Check,
  Package,
  Search,
  ChevronRight,
  ScanBarcode,
  Snowflake,
  LayoutGrid,
  Tag,
  Truck,
  MapPin,
  Factory,
} from "lucide-react";

// ----------------------------------------------------------------------
// 1. 데이터 & 상수
// ----------------------------------------------------------------------

const IMAGE_DATABASE = [
  {
    id: 1,
    url: "https://placehold.co/200x200/ff6b6b/fff?text=딸기",
    name: "딸기",
    category: "과일",
  },
  {
    id: 2,
    url: "https://placehold.co/200x200/51cf66/fff?text=배추",
    name: "배추",
    category: "야채",
  },
  {
    id: 3,
    url: "https://placehold.co/200x200/ff8787/fff?text=삼겹살",
    name: "삼겹살",
    category: "정육",
  },
  {
    id: 4,
    url: "https://placehold.co/200x200/339af0/fff?text=고등어",
    name: "고등어",
    category: "수산",
  },
  {
    id: 5,
    url: "https://placehold.co/200x200/ffd43b/fff?text=새우깡",
    name: "새우깡",
    category: "공산품",
  },
  {
    id: 6,
    url: "https://placehold.co/200x200/74c0fc/fff?text=콜라",
    name: "코카콜라",
    category: "음료",
  },
];

const CATEGORY_TREE: Record<string, Record<string, string[]>> = {
  과일: {
    국내산: ["사과", "배", "딸기", "참외", "수박"],
    수입: ["바나나", "오렌지", "파인애플", "망고", "키위"],
  },
  야채: {
    엽채류: ["배추", "양배추", "상추", "깻잎"],
    근채류: ["무", "당근", "감자", "고구마", "양파"],
  },
  정육: {
    소고기: ["안심", "등심", "채끝", "국거리"],
    돼지고기: ["삼겹살", "목살", "앞다리", "뒷다리"],
    닭고기: ["닭다리", "닭가슴살", "통닭"],
  },
  수산: {
    생선: ["고등어", "갈치", "삼치", "조기"],
    해산물: ["오징어", "낙지", "새우", "조개"],
  },
  공산품: {
    과자: ["새우깡", "포카칩", "오감자", "홈런볼"],
    라면: ["신라면", "짜파게티", "너구리", "안성탕면"],
  },
  음료: {
    탄산: ["코카콜라", "사이다", "환타"],
    주스: ["오렌지주스", "포도주스", "사과주스"],
  },
};

const STORAGE_METHODS = ["실온", "냉장", "냉동"];

// ----------------------------------------------------------------------
// 2. 메인 컴포넌트
// ----------------------------------------------------------------------

export default function CreateProductPage() {
  const [activeTab, setActiveTab] = useState<"single" | "excel">("single");
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState("");
  const [sourceMode, setSourceMode] = useState<"origin" | "manufacturer">(
    "origin",
  );

  // Refs for Keyboard Navigation
  const nameRef = useRef<HTMLInputElement>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const unitRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<HTMLInputElement>(null);
  const salePriceRef = useRef<HTMLInputElement>(null);
  const originalPriceRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    categoryLarge: "",
    categoryMedium: "",
    categorySmall: "",
    barcode: "",
    unit: "",
    origin: "",
    manufacturer: "",
    description: "",
    storageMethod: "",
    isDeliveryAvailable: true,
    isBest: false,
    isNew: false,
  });

  const [priceData, setPriceData] = useState({
    base: "", // 판매가
    discount: "", // 할인가
  });

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string>("");

  // --- Helpers ---

  const handleEnterKey = (
    e: React.KeyboardEvent,
    nextRef: React.RefObject<HTMLInputElement>,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      nextRef.current?.focus();
    }
  };

  const discountRate = (() => {
    const base = Number(priceData.base);
    const discount = Number(priceData.discount);
    if (base > discount && discount > 0) {
      return Math.floor(((base - discount) / base) * 100);
    }
    return 0;
  })();

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (sourceMode === "origin") {
      setFormData((prev) => ({ ...prev, origin: value, manufacturer: "" }));
    } else {
      setFormData((prev) => ({ ...prev, manufacturer: value, origin: "" }));
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPriceData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim() !== "") {
      e.preventDefault();
      const trimmedTag = tagInput.trim();
      if (!tags.includes(trimmedTag)) {
        setTags([...tags, trimmedTag]);
      }
      setTagInput("");
    }
  };

  const handleCategorySelect = (
    level: "large" | "medium" | "small",
    value: string,
  ) => {
    setFormData((prev) => {
      const newData = { ...prev };
      if (level === "large") {
        newData.categoryLarge = value;
        newData.categoryMedium = "";
        newData.categorySmall = "";
      } else if (level === "medium") {
        newData.categoryMedium = value;
        newData.categorySmall = "";
      } else {
        newData.categorySmall = value;
      }
      return newData;
    });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.barcode || !priceData.base) {
      alert("필수 항목(* 표시된 값)을 입력해주세요.");
      return;
    }

    const hasDiscount = priceData.discount && Number(priceData.discount) > 0;
    const finalSalePrice = hasDiscount
      ? Number(priceData.discount)
      : Number(priceData.base);
    const finalOriginalPrice = hasDiscount ? Number(priceData.base) : null;

    const payload = {
      ...formData,
      salePrice: finalSalePrice,
      originalPrice: finalOriginalPrice,
      tags: tags,
      imageUrl: selectedImage,
      origin: sourceMode === "origin" ? formData.origin : null,
      manufacturer:
        sourceMode === "manufacturer" ? formData.manufacturer : null,
    };

    console.log("📦 [최종 등록 데이터]:", payload);
    alert(`'${formData.name}' 상품이 등록되었습니다!`);
  };

  const largeCategories = Object.keys(CATEGORY_TREE);
  const mediumCategories = formData.categoryLarge
    ? Object.keys(CATEGORY_TREE[formData.categoryLarge] || {})
    : [];
  const smallCategories =
    formData.categoryMedium && formData.categoryLarge
      ? CATEGORY_TREE[formData.categoryLarge][formData.categoryMedium] || []
      : [];
  const filteredImages = IMAGE_DATABASE.filter((img) =>
    img.name.toLowerCase().includes(imageSearchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-32">
      {/* Header */}
      <header className="bg-white sticky top-0 z-30 shadow-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft size={24} className="text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">상품 등록</h1>
          </div>
          <div className="text-sm font-bold text-red-600 border border-red-200 bg-red-50 px-3 py-1 rounded-full">
            관리자 모드
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 flex gap-1">
          <button
            onClick={() => setActiveTab("single")}
            className={`px-6 py-3 font-semibold text-sm transition-all relative ${activeTab === "single" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
          >
            개별 등록
            {activeTab === "single" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("excel")}
            className={`px-6 py-3 font-semibold text-sm transition-all relative ${activeTab === "excel" ? "text-green-600" : "text-gray-500 hover:text-gray-800"}`}
          >
            엑셀 대량 등록
            {activeTab === "excel" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600"></div>
            )}
          </button>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {activeTab === "single" ? (
          <>
            {/* 1. 이미지 & 상품명 & 바코드 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="flex flex-col items-center gap-6">
                <div
                  onClick={() => setShowImageModal(true)}
                  className="w-full max-w-[300px] aspect-square bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-red-400 hover:bg-red-50/30 transition-all overflow-hidden group relative p-6"
                >
                  {selectedImage ? (
                    <div className="w-full h-full relative flex items-center justify-center">
                      <img
                        src={selectedImage}
                        alt="Selected"
                        className="w-full h-full object-contain drop-shadow-md"
                      />
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                        <div className="bg-white/90 p-2 rounded-full shadow-sm">
                          <Search size={24} className="text-gray-800" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-gray-100 group-hover:scale-105 transition-transform">
                        <Search
                          size={28}
                          className="text-gray-300 group-hover:text-red-400 transition-colors"
                        />
                      </div>
                      <span className="block font-bold text-gray-600 group-hover:text-red-500">
                        사진 등록
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 w-full">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-800">
                    <Package size={18} className="text-gray-900" /> 상품명{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={nameRef}
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onKeyDown={(e) => handleEnterKey(e, barcodeRef)}
                    className="w-full h-14 px-5 border-2 border-gray-200 bg-gray-50 rounded-xl text-lg font-bold text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:bg-white outline-none transition-all"
                    placeholder="예) 성주 꿀참외 2kg"
                  />
                </div>

                <div className="space-y-2 w-full">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-800">
                    <ScanBarcode size={18} className="text-red-600" /> 바코드{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <input
                      ref={barcodeRef}
                      name="barcode"
                      value={formData.barcode}
                      onChange={handleChange}
                      onKeyDown={(e) => handleEnterKey(e, unitRef)}
                      className="w-full h-14 px-5 pl-12 border-2 border-gray-200 bg-gray-50 rounded-xl text-lg font-bold text-gray-900 placeholder:text-gray-400 focus:border-red-500 focus:bg-white outline-none transition-all font-mono"
                      placeholder="스캔 또는 직접 입력"
                    />
                    <ScanBarcode
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors"
                      size={24}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. 카테고리 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                <LayoutGrid size={20} className="text-gray-900" />
                <h2 className="text-lg font-bold text-gray-900">
                  카테고리 선택
                </h2>
              </div>

              {/* Grid Container with Stealth Scroll Class */}
              <div className="grid grid-cols-3 h-64 divide-x divide-gray-100 relative group/scroll">
                {/* 대분류 */}
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="px-3 py-2 bg-gray-100/95 backdrop-blur-sm text-xs font-bold text-gray-500 mb-1 px-2 text-center sticky top-0 z-10 border-b border-gray-200">
                    대분류
                  </div>
                  <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
                    {largeCategories.map((cat) => (
                      <div
                        key={cat}
                        onClick={() => handleCategorySelect("large", cat)}
                        className={`px-4 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center justify-between mb-1 ${
                          formData.categoryLarge === cat
                            ? "bg-gray-900 text-white shadow-md transform scale-[1.02]"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                      >
                        {cat}
                        {formData.categoryLarge === cat && (
                          <ChevronRight size={14} className="text-white" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 중분류 */}
                <div className="flex flex-col h-full bg-gray-50/30 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-100/95 backdrop-blur-sm text-xs font-bold text-gray-500 mb-1 px-2 text-center sticky top-0 z-10 border-b border-gray-200">
                    중분류
                  </div>
                  <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
                    {!formData.categoryLarge ? (
                      <div className="h-full flex flex-col items-center justify-center text-xs text-gray-400 gap-2">
                        <span className="bg-gray-100 p-2 rounded-full">
                          <ChevronLeft size={16} />
                        </span>
                        대분류를 먼저
                        <br />
                        선택해주세요
                      </div>
                    ) : (
                      mediumCategories.map((cat) => (
                        <div
                          key={cat}
                          onClick={() => handleCategorySelect("medium", cat)}
                          className={`px-4 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center justify-between mb-1 ${
                            formData.categoryMedium === cat
                              ? "bg-gray-900 text-white shadow-md transform scale-[1.02]"
                              : "text-gray-600 hover:bg-white hover:shadow-sm"
                          }`}
                        >
                          {cat}
                          {formData.categoryMedium === cat && (
                            <ChevronRight size={14} className="text-white" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 소분류 */}
                <div className="flex flex-col h-full bg-gray-50/60 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-100/95 backdrop-blur-sm text-xs font-bold text-gray-500 mb-1 px-2 text-center sticky top-0 z-10 border-b border-gray-200">
                    소분류
                  </div>
                  <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
                    {!formData.categoryMedium ? (
                      <div className="h-full flex items-center justify-center text-xs text-gray-400">
                        -
                      </div>
                    ) : smallCategories.length > 0 ? (
                      smallCategories.map((cat) => (
                        <div
                          key={cat}
                          onClick={() => handleCategorySelect("small", cat)}
                          className={`px-4 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center justify-between mb-1 ${
                            formData.categorySmall === cat
                              ? "bg-red-600 text-white shadow-md transform scale-[1.02]"
                              : "text-gray-600 hover:bg-white hover:shadow-sm"
                          }`}
                        >
                          {cat}
                          {formData.categorySmall === cat && (
                            <Check size={14} className="text-white" />
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-gray-400">
                        하위 분류 없음
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 선택 경로 Footer (수정됨: 심플한 텍스트 방식) */}
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-600 flex items-center gap-2">
                <span className="font-bold text-gray-500">카테고리:</span>
                {formData.categoryLarge ? (
                  <span className="flex items-center gap-1 text-gray-500 font-medium text-sm">
                    <span>{formData.categoryLarge}</span>
                    {formData.categoryMedium && (
                      <>
                        <ChevronRight size={12} className="text-gray-400" />
                        <span>{formData.categoryMedium}</span>
                      </>
                    )}
                    {formData.categorySmall && (
                      <>
                        <ChevronRight size={12} className="text-gray-400" />
                        <span className="text-gray-500">
                          {formData.categorySmall}
                        </span>
                      </>
                    )}
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">선택되지 않음</span>
                )}
              </div>
            </div>

            {/* 3. 상세 정보 & 가격 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
              <div className="flex items-center gap-2 mb-2 border-b border-gray-100 pb-3">
                <Tag size={20} className="text-gray-900" />
                <h2 className="text-lg font-bold text-gray-900">
                  상세 정보 & 가격
                </h2>
              </div>

              {/* 1. 단위 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  단위
                </label>
                <input
                  ref={unitRef}
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  onKeyDown={(e) => handleEnterKey(e, sourceRef)}
                  className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:border-gray-900 outline-none transition-all"
                  placeholder="예: 1봉, 100g, 1box"
                />
              </div>

              {/* 2. 출처 */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <label className="text-sm font-bold text-gray-700">
                    출처
                  </label>
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setSourceMode("origin")}
                      className={`text-xs px-3 py-1.5 rounded-md transition-all font-bold flex items-center gap-1 ${sourceMode === "origin" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                    >
                      <MapPin size={12} /> 원산지
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceMode("manufacturer")}
                      className={`text-xs px-3 py-1.5 rounded-md transition-all font-bold flex items-center gap-1 ${sourceMode === "manufacturer" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                    >
                      <Factory size={12} /> 제조사
                    </button>
                  </div>
                </div>
                <input
                  ref={sourceRef}
                  value={
                    sourceMode === "origin"
                      ? formData.origin
                      : formData.manufacturer
                  }
                  onChange={handleSourceChange}
                  onKeyDown={(e) => handleEnterKey(e, salePriceRef)}
                  className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:border-gray-900 outline-none transition-all"
                  placeholder={
                    sourceMode === "origin"
                      ? "예: 국내산, 칠레산"
                      : "예: 농심, CJ제일제당"
                  }
                />
              </div>

              {/* 3. 가격 (판매가 & 할인가) */}
              <div className="grid grid-cols-2 gap-6">
                {/* 판매가 (필수) */}
                <div className="col-span-1">
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    판매가 <span>*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={salePriceRef}
                      name="base"
                      type="number"
                      value={priceData.base}
                      onChange={handlePriceChange}
                      onKeyDown={(e) => handleEnterKey(e, originalPriceRef)}
                      className="w-full h-12 px-4 pr-9 border border-gray-300 rounded-xl text-gray-900 font-bold focus:border-gray-900 outline-none transition-all text-right text-lg placeholder:font-normal"
                      placeholder="0"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">
                      원
                    </span>
                  </div>
                </div>

                {/* 할인가 (선택) - 배지 왼쪽 배치 */}
                <div className="col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    할인가{" "}
                    <span className="font-normal text-gray-400 text-xs ml-1">
                      (선택)
                    </span>
                  </label>
                  <div className="relative">
                    {/* 할인율 배지 (왼쪽) */}
                    {discountRate > 0 && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 bg-red-600 text-white text-[11px] px-1.5 py-0.5 rounded-md shadow-sm font-bold z-10 animate-pulse">
                        {discountRate}%
                      </span>
                    )}

                    <input
                      ref={originalPriceRef}
                      name="discount"
                      type="number"
                      value={priceData.discount}
                      onChange={handlePriceChange}
                      // 배지가 있으면 왼쪽 여백을 줘서 겹치지 않게 함
                      className={`w-full h-12 px-4 pr-9 border border-gray-300 rounded-xl text-gray-900 font-bold focus:border-gray-900 outline-none transition-all text-right text-lg placeholder:font-normal ${discountRate > 0 ? "pl-14" : ""}`}
                      placeholder="0"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">
                      원
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. 선택 사항 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
              <div className="flex items-center gap-2 mb-2 border-b border-gray-100 pb-3">
                <Snowflake size={20} className="text-gray-900" />
                <h2 className="text-lg font-bold text-gray-900">선택 사항</h2>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-1">
                  <Truck size={16} className="text-gray-500" /> 배달 옵션
                </label>
                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
                  <button
                    onClick={() =>
                      setFormData((p) => ({ ...p, isDeliveryAvailable: true }))
                    }
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${formData.isDeliveryAvailable ? "bg-green-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    <Check size={14} /> 배달 가능
                  </button>
                  <button
                    onClick={() =>
                      setFormData((p) => ({ ...p, isDeliveryAvailable: false }))
                    }
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${!formData.isDeliveryAvailable ? "bg-gray-700 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    <X size={14} /> 배달 불가
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  보관 방법
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setFormData((p) => ({ ...p, storageMethod: "" }))
                    }
                    className={`px-4 py-2 rounded-lg text-sm border transition-all ${!formData.storageMethod ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
                  >
                    선택 안 함
                  </button>
                  {STORAGE_METHODS.map((method) => (
                    <button
                      key={method}
                      onClick={() =>
                        setFormData((p) => ({ ...p, storageMethod: method }))
                      }
                      className={`px-4 py-2 rounded-lg text-sm border transition-all ${formData.storageMethod === method ? "bg-blue-50 text-blue-600 border-blue-200 font-bold" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  검색 태그
                </label>
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:border-gray-900 outline-none transition-all"
                  placeholder="태그 입력 후 Enter (예: #세일, #신선)"
                />
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {tags.map((tag, i) => (
                      <span
                        key={i}
                        className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => setTags(tags.filter((t) => t !== tag))}
                          className="hover:bg-gray-300 rounded-full p-0.5"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  상세 설명
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full h-24 px-4 py-3 border border-gray-300 rounded-xl focus:border-gray-900 outline-none transition-all resize-none text-sm"
                  placeholder="상품 특징이나 안내 사항을 입력하세요."
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 text-lg active:scale-[0.98]"
            >
              <Check size={24} /> 상품 등록 완료
            </button>
          </>
        ) : (
          <div className="max-w-2xl mx-auto text-center py-10">
            <p className="text-gray-500">엑셀 등록 기능은 유지됩니다.</p>
          </div>
        )}
      </main>

      {/* 이미지 모달 */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                이미지 라이브러리
              </h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4 bg-gray-50 flex gap-2">
              <input
                type="text"
                placeholder="상품명 검색..."
                value={imageSearchQuery}
                onChange={(e) => setImageSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-4 gap-4">
                {filteredImages.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => {
                      setSelectedImage(img.url);
                      setShowImageModal(false);
                    }}
                    className="cursor-pointer group"
                  >
                    <div className="aspect-square rounded-xl border border-gray-200 p-2 flex items-center justify-center hover:border-red-500 transition-all relative">
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-xs text-center mt-2 text-gray-600 truncate">
                      {img.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS: 스핀 버튼 제거 및 스크롤바 스타일 */}
      <style jsx global>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: transparent;
          border-radius: 10px;
        }
        .group\/scroll:hover .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #d1d5db;
        }
      `}</style>
    </div>
  );
}
