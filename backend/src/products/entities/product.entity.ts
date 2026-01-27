export class Product {
  id: number; // 웹사이트 내부 관리용 고유번호
  barcode: string; // 투게더 POS와 매칭될 바코드

  name: string;

  salePrice: number;
  originalPrice?: number;
  stock: number;

  // 카테고리
  categoryLarge: string;
  categoryMedium?: string;
  categorySmall?: string;

  // 상세 스펙
  unit?: string;
  origin?: string;
  manufacturer?: string;
  storageMethod?: string;
  description?: string;
  imageUrl?: string;

  // 태그 및 상태
  tags: string[]; // DB에는 JSON 배열이나 별도 테이블로 저장됨
  isBest: boolean;
  isNew: boolean;
  isActive: boolean; // 판매 중지 여부 (품절 처리 등)

  createdAt: Date;
  updatedAt: Date;
}
