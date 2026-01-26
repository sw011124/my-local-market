import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    PrismaModule,   // 우리가 만든 DB 모듈
    ProductsModule, // 우리가 만든 상품 모듈
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}