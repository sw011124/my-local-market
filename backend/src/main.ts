import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 👇 [추가] CORS 설정: 프론트엔드와의 통신을 허용합니다.
  app.enableCors({
    origin: true, // 개발 중이니까 모든 주소 허용 (나중엔 프론트엔드 주소만 넣어야 함)
    credentials: true,
  });
  
  // 입력값 검사(DTO)를 위해 이 줄이 꼭 필요합니다!
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // DTO에 없는 속성은 거름
    transform: true, // 타입 자동 변환
  }));

  await app.listen(3000);
}
bootstrap();