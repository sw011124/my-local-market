import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { PrismaService } from 'src/prisma/prisma.service'; 

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // 상품 등록 기능
  async create(createProductDto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: createProductDto,
    });
    return product;
  }

  // 전체 조회 기능 (등록된 거 확인용)
  async findAll() {
    return await this.prisma.product.findMany();
  }
}