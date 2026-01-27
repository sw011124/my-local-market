"use client";

import { useState } from "react";
import {
  ChevronLeft,
  Upload,
  Download,
  X,
  Check,
  FileSpreadsheet,
  Package,
  Search,
  List,
  ChevronRight,
  ScanBarcode,
  Snowflake,
  LayoutGrid,
  Tag,
} from "lucide-react";

// ----------------------------------------------------------------------
// 1. 더미 데이터 & 상수
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
    url: "https://placehold.co/200x200/74c0fc/fff?text=코카콜라",
    name: "코카콜라",
    category: "음료",
  },
  {
    id: 7,
    url: "https://placehold.co/200x200/ff6b6b/fff?text=사과",
    name: "사과",
    category: "과일",
  },
  {
    id: 8,
    url: "https://placehold.co/200x200/51cf66/fff?text=양배추",
    name: "양배추",
    category: "야채",
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

interface Product {
  id: string;
  name: string;
  barcode: string;
  categoryLarge: string;
  categoryMedium: string;
  categorySmall: string;
  unit: string;
  origin: string;
  manufacturer: string;
  description: string;
  originalPrice: string;
  salePrice: string;
  stock: string;
  tags: string[];
  imageUrl: string;
  storageMethod: string;
  isBest: boolean;
  isNew: boolean;
}

// ----------------------------------------------------------------------
// 2. 메인 컴포넌트
// ----------------------------------------------------------------------

export default function ImprovedUploadPage() {
  const [activeTab, setActiveTab] = useState<"single" | "excel">("single");
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState("");
  const [imageFilterCategory, setImageFilterCategory] = useState("전체");

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
    isBest: false,
    isNew: false,
  });

  const [priceData, setPriceData] = useState({
    originalPrice: "",
    salePrice: "",
    stock: "",
  });

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [productList, setProductList] = useState<Product[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);

  // --- Helpers ---
  const discountRate = (() => {
    const original = Number(priceData.originalPrice);
    const sale = Number(priceData.salePrice);
    if (original > sale && original > 0)
      return Math.round(((original - sale) / original) * 100);
    return 0;
  })();

  const largeCategories = Object.keys(CATEGORY_TREE);
  const mediumCategories = formData.categoryLarge
    ? Object.keys(CATEGORY_TREE[formData.categoryLarge] || {})
    : [];
  const smallCategories =
    formData.categoryMedium && formData.categoryLarge
      ? CATEGORY_TREE[formData.categoryLarge][formData.categoryMedium] || []
      : [];

  const filteredImages = IMAGE_DATABASE.filter((img) => {
    const matchesSearch = img.name
      .toLowerCase()
      .includes(imageSearchQuery.toLowerCase());
    const matchesCategory =
      imageFilterCategory === "전체" || img.category === imageFilterCategory;
    return matchesSearch && matchesCategory;
  });

  // --- Handlers ---
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

  const handleImageSelect = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageModal(false);
  };

  const addToProductList = () => {
    if (!formData.name || !priceData.salePrice || !formData.barcode) {
      alert("필수 항목을 입력해주세요: 상품명, 판매가, 바코드");
      return;
    }
    const newProduct: Product = {
      id: Date.now().toString(),
      ...formData,
      ...priceData,
      tags,
      imageUrl:
        selectedImage ||
        "https://placehold.co/200x200/e0e0e0/666?text=No+Image",
    };
    setProductList([...productList, newProduct]);

    setFormData({
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
      isBest: false,
      isNew: false,
    });
    setPriceData({ originalPrice: "", salePrice: "", stock: "" });
    setTags([]);
    setSelectedImage("");
    alert("상품이 등록되었습니다!");
  };

  const uploadAllProducts = async () => {
    if (productList.length === 0) return;
    alert(`${productList.length}개 상품을 일괄 등록합니다! (데모)`);
    setProductList([]);
  };

  const downloadTemplate = () => {
    alert("양식 다운로드");
  };

  const handleExcelUpload = () => {
    if (!excelFile) return;
    alert(`엑셀 파일 "${excelFile.name}" 업로드 (데모)`);
    setExcelFile(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {/* Header */}
      <header className="bg-white sticky top-0 z-30 shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft size={24} className="text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">상품 등록 (PC)</h1>
          </div>
          {/* 목록 관련 버튼 제거됨 */}
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 flex gap-1">
          <button
            onClick={() => setActiveTab("single")}
            className={`px-6 py-3 font-semibold text-sm transition-all relative ${
              activeTab === "single"
                ? "text-red-600"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            개별 등록
            {activeTab === "single" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("excel")}
            className={`px-6 py-3 font-semibold text-sm transition-all relative ${
              activeTab === "excel"
                ? "text-green-600"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            엑셀 대량 등록
            {activeTab === "excel" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600"></div>
            )}
          </button>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8 pb-32">
        {activeTab === "single" ? (
          <div className="space-y-4">
            {" "}
            {/* 간격 축소 (space-y-8 -> space-y-4) */}
            {/* 1. 이미지 & 상품명 & 바코드 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="flex flex-col items-center gap-6">
                {/* 1-1. 이미지 선택 */}
                <div
                  onClick={() => setShowImageModal(true)}
                  className="w-full max-w-[400px] aspect-square bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-red-400 hover:bg-red-50/50 transition-all overflow-hidden group relative p-6"
                >
                  {selectedImage ? (
                    <div className="w-full h-full relative flex items-center justify-center">
                      <img
                        src={selectedImage}
                        alt="Selected"
                        className="w-full h-full object-contain drop-shadow-md"
                      />
                      <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                        <Search size={32} className="text-gray-700" />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100 group-hover:scale-105 transition-transform">
                        <Search
                          size={32}
                          className="text-gray-300 group-hover:text-red-400 transition-colors"
                        />
                      </div>
                      <span className="block text-lg font-bold text-gray-700 group-hover:text-red-600 transition-colors">
                        상품 사진 등록
                      </span>
                      <span className="text-sm text-gray-400 mt-2">
                        클릭하여 이미지를 선택하세요
                      </span>
                    </div>
                  )}
                </div>

                {/* 1-2. 상품명 (바코드 위로 이동) */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-800">
                    <Package size={18} className="text-gray-900" />
                    상품명 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-85 h-14 px-5 border-2 border-gray-200 bg-gray-50 rounded-xl text-lg font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all"
                      placeholder="예) 성주 꿀참외 2kg"
                    />
                  </div>
                </div>

                {/* 1-3. 바코드 (하단) */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-800">
                    <ScanBarcode size={18} className="text-red-600" />
                    바코드 정보 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <input
                      name="barcode"
                      value={formData.barcode}
                      onChange={handleChange}
                      className="w-85 h-14 px-5 pl-12 border-2 border-gray-200 bg-gray-50 rounded-xl text-lg font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all"
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
                <LayoutGrid size={20} className="text-gray-600" />
                <h2 className="text-lg font-bold text-gray-900">
                  카테고리 선택
                </h2>
              </div>

              <div className="grid grid-cols-3 h-64 divide-x divide-gray-100">
                <div className="overflow-y-auto p-2 scrollbar-hide">
                  <div className="text-xs font-semibold text-gray-400 mb-2 px-2">
                    대분류
                  </div>
                  {largeCategories.map((cat) => (
                    <div
                      key={cat}
                      onClick={() => handleCategorySelect("large", cat)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium cursor-pointer transition-colors flex items-center justify-between ${
                        formData.categoryLarge === cat
                          ? "bg-red-50 text-red-700 font-bold"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {cat}
                      {formData.categoryLarge === cat && (
                        <ChevronRight size={14} />
                      )}
                    </div>
                  ))}
                </div>

                <div className="overflow-y-auto p-2 bg-gray-50/30">
                  <div className="text-xs font-semibold text-gray-400 mb-2 px-2">
                    중분류
                  </div>
                  {!formData.categoryLarge ? (
                    <div className="h-full flex items-center justify-center text-xs text-gray-400">
                      대분류를 먼저
                      <br />
                      선택해주세요
                    </div>
                  ) : (
                    mediumCategories.map((cat) => (
                      <div
                        key={cat}
                        onClick={() => handleCategorySelect("medium", cat)}
                        className={`px-4 py-3 rounded-lg text-sm font-medium cursor-pointer transition-colors flex items-center justify-between ${
                          formData.categoryMedium === cat
                            ? "bg-red-50 text-red-700 font-bold"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {cat}
                        {formData.categoryMedium === cat && (
                          <ChevronRight size={14} />
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="overflow-y-auto p-2 bg-gray-50/60">
                  <div className="text-xs font-semibold text-gray-400 mb-2 px-2">
                    소분류
                  </div>
                  {!formData.categoryMedium ? (
                    <div className="h-full flex items-center justify-center text-xs text-gray-400">
                      -
                    </div>
                  ) : (
                    smallCategories.map((cat) => (
                      <div
                        key={cat}
                        onClick={() => handleCategorySelect("small", cat)}
                        className={`px-4 py-3 rounded-lg text-sm font-medium cursor-pointer transition-colors flex items-center justify-between ${
                          formData.categorySmall === cat
                            ? "bg-red-50 text-red-700 font-bold"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {cat}
                        {formData.categorySmall === cat && <Check size={14} />}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-600 flex items-center gap-2">
                <span className="font-semibold text-gray-400">선택 경로:</span>
                {formData.categoryLarge ? (
                  <span className="flex items-center gap-1 text-gray-800">
                    {formData.categoryLarge}
                    {formData.categoryMedium && (
                      <>
                        <ChevronRight size={12} className="text-gray-400" />{" "}
                        {formData.categoryMedium}
                      </>
                    )}
                    {formData.categorySmall && (
                      <>
                        <ChevronRight size={12} className="text-gray-400" />{" "}
                        {formData.categorySmall}
                      </>
                    )}
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">선택되지 않음</span>
                )}
              </div>
            </div>
            {/* 3. 상세 정보 & 가격 (단위 이동됨) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <Package size={20} className="text-gray-600" />
                <h2 className="text-lg font-bold text-gray-900">상세 정보</h2>
              </div>

              {/* 단위 & 재고 */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    단위
                  </label>
                  <input
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="w-full h-12 px-4 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-gray-900 outline-none transition-all text-center"
                    placeholder="EA/Box"
                  />
                </div>
                <div className="flex-[2]">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    현재 재고
                  </label>
                  <input
                    name="stock"
                    type="number"
                    value={priceData.stock}
                    onChange={handlePriceChange}
                    className="w-full h-12 px-4 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-gray-900 outline-none transition-all text-right"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    원산지
                  </label>
                  <input
                    name="origin"
                    value={formData.origin}
                    onChange={handleChange}
                    className="w-full h-12 px-4 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-gray-900 outline-none transition-all"
                    placeholder="예) 국내산"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    제조사/브랜드
                  </label>
                  <input
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleChange}
                    className="w-full h-12 px-4 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-gray-900 outline-none transition-all"
                    placeholder="예) 농심"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    정상가
                  </label>
                  <div className="relative">
                    <input
                      name="originalPrice"
                      type="number"
                      value={priceData.originalPrice}
                      onChange={handlePriceChange}
                      className="w-full h-12 px-4 pr-8 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-gray-900 outline-none transition-all text-right"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                      원
                    </span>
                  </div>
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-bold text-red-600 mb-2">
                    판매가
                  </label>
                  <div className="relative">
                    <input
                      name="salePrice"
                      type="number"
                      value={priceData.salePrice}
                      onChange={handlePriceChange}
                      className="w-full h-12 px-4 pr-8 border-2 border-red-100 bg-red-50/30 rounded-xl text-red-600 font-bold placeholder:text-red-200 focus:border-red-500 focus:bg-white outline-none transition-all text-right"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-red-600">
                      원
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {/* 4. 선택 사항 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <List size={20} className="text-gray-600" />
                <h2 className="text-lg font-bold text-gray-900">선택 사항</h2>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
                  <Snowflake size={14} className="text-gray-400" /> 보관 방법
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setFormData((p) => ({ ...p, storageMethod: "" }))
                    }
                    className={`px-4 py-2 rounded-lg text-sm border transition-all ${!formData.storageMethod ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
                  >
                    (선택)
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
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <Tag size={14} className="text-gray-400" /> 검색 태그
                </label>
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  className="w-full h-12 px-4 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-gray-900 outline-none transition-all"
                  placeholder="태그 입력 후 Enter (예: 세일, 신선)"
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
                          className="hover:bg-gray-300 rounded-full p-0.5 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  상세 설명
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full h-24 px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-gray-900 outline-none transition-all resize-none text-sm"
                  placeholder="상품 특징이나 안내 사항을 입력하세요."
                />
              </div>
            </div>
            {/* 하단 버튼 */}
            <button
              onClick={addToProductList}
              className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 text-lg active:scale-[0.98]"
            >
              <Check size={24} />
              등록 완료
            </button>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto text-center py-10">
            <p className="text-gray-500">엑셀 등록 기능은 유지됩니다.</p>
          </div>
        )}
      </main>

      {/* 이미지 검색 모달 */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowImageModal(false)}
          />
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
                    onClick={() => handleImageSelect(img.url)}
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
    </div>
  );
}
