import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateProductDto {
  // 1. 필수 입력 항목 (DB에 꼭 있어야 하는 것)
  @IsString()
  name: string;

  @IsNumber()
  price: number;

  @IsString()
  category: string;

  // 2. 선택 입력 항목 (없으면 null로 들어감)
  @IsOptional()
  @IsString()
  description_origin?: string;

  @IsOptional()
  @IsNumber()
  originalPrice?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  badge?: string;

  @IsOptional()
  @IsBoolean()
  isSoldOut?: boolean;
}