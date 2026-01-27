import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class CreateProductDto {
  // [필수] POS와 연동할 핵심 키
  @IsString()
  barcode: string;

  // [필수] 상품 기본 정보
  @IsString()
  name: string;

  @IsNumber()
  salePrice: number; // 판매가

  // [선택] 할인 전 가격 (표시용) - 고객에게 "할인 중"임을 보여주기 위함
  @IsOptional()
  @IsNumber()
  originalPrice?: number;

  @IsNumber()
  stock: number; // 웹사이트 재고 (POS 재고와 연동 전까지는 수동 관리)

  // [카테고리] - 트리 구조 반영
  @IsString()
  categoryLarge: string;

  @IsOptional()
  @IsString()
  categoryMedium?: string;

  @IsOptional()
  @IsString()
  categorySmall?: string;

  // [상세 정보] - MD의 영역
  @IsOptional()
  @IsString()
  unit?: string; // 단위 (1봉, 1kg)

  @IsOptional()
  @IsString()
  origin?: string; // 원산지

  @IsOptional()
  @IsString()
  manufacturer?: string; // 제조사

  @IsOptional()
  @IsString()
  storageMethod?: string; // 보관 방법 (냉장/냉동/실온)

  @IsOptional()
  @IsString()
  description?: string; // 상세 설명

  @IsOptional()
  @IsString()
  imageUrl?: string;

  // [마케팅/검색]
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]; // ["#세일", "#오늘입고"]

  @IsBoolean()
  @IsOptional()
  isBest?: boolean;

  @IsBoolean()
  @IsOptional()
  isNew?: boolean;
}
