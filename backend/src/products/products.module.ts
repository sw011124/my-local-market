import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from 'src/prisma/prisma.module'; // PrismaModule 임포트 필요

@Module({
  imports: [PrismaModule], // DB를 써야 하니 PrismaModule을 가져옵니다.
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}