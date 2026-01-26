import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // ⭐ 핵심: 앱 전체에서 PrismaService를 쓸 수 있게 해줍니다.
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // 다른 모듈이 쓸 수 있게 내보냅니다.
})
export class PrismaModule {}