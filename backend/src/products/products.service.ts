import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    // [데이터 변환]
    // DTO의 tags 배열(["신선", "세일"])을 DB 저장을 위해 문자열("신선,세일")로 변환
    const { tags, ...productData } = createProductDto;

    // SQLite 호환용 태그 변환 (배열 -> 문자열)
    const tagsString = tags ? tags.join(',') : null;

    return this.prisma.product.create({
      data: {
        ...productData,
        tags: tagsString, // 변환된 태그 저장
        isActive: true, // 기본값 설정
      },
    });
  }

  findAll() {
    return this.prisma.product.findMany();
  }

  findOne(id: number) {
    return this.prisma.product.findUnique({ where: { id } });
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }
}
