# 동네 마트 자체배달 MVP 구현 가이드

## 구성
- `services/python-backend`: FastAPI + SQLAlchemy + Alembic + Seed
- `frontend`: Next.js 고객/관리자 웹 (Python API 연동)
- `services/java-frontend`: Spring Boot + Thymeleaf
- `docker-compose.yml`: PostgreSQL + Python 백엔드 + (Next 또는 Java) 프론트 프로필 실행

## 정리 상태 (2026-02-18)
- 레거시 Nest 백엔드 폴더(`backend/`) 제거 완료
- 루트 `npm run dev`는 `Python + Next(local:3001)` 기준으로 동작

## 기본 정책 반영
- 계정: 비회원 주문 + 주문번호/휴대폰 조회
- 배송권역: 하이브리드(동/아파트 + 반경)
- 운영시간: 09:00~21:00
- 당일마감: 19:00
- 중량상품: 예상금액 안내 + 실중량 정산 구조

## 실행 (전환 모드: Next + Python)
```bash
docker compose --profile transition-next up -d --build db python-backend next-frontend
```

- 고객 웹(Next, Docker): http://localhost:3101
- 백엔드 API: http://localhost:8000/docs
- DB: `localhost:5433` (`postgres/postgres`, DB: `market`)

## 실행 (레거시 모드: Java + Python)
```bash
docker compose --profile legacy-java up -d --build db python-backend java-frontend
```

- 고객/관리자 웹(Java): http://localhost:8080

## npm 스크립트
```bash
npm run transition:up   # Next + Python
npm run legacy:up       # Java + Python
npm run db:down         # 전체 종료
```

- 참고: 로컬 Next 개발 서버는 `3001`, Docker Next는 `3101` 포트를 사용합니다.

## 시드 데이터
- 카테고리 4종, 상품 4종, 행사 1건
- 배송권역: 동 1건, 아파트 1건, 반경 1건
- 관리자 계정: `admin / admin1234`

## 핵심 API
- 고객: `/api/v1/public/*`, `/api/v1/cart`, `/api/v1/checkout/*`, `/api/v1/orders/*`
- 관리자: `/api/v1/admin/auth/login`, `/api/v1/admin/orders`, `/api/v1/admin/orders/{id}/status`

## 관리자 고급 API (추가)
- 부분품절/대체 처리: `POST /api/v1/admin/orders/{id}/shortage-actions`
- 환불 처리/조회: `POST /api/v1/admin/orders/{id}/refunds`, `GET /api/v1/admin/orders/{id}/refunds`
- 행사 관리: `GET/POST/PATCH /api/v1/admin/promotions`
- 배너 관리: `GET/POST/PATCH /api/v1/admin/banners`
- 공지 관리: `GET/POST/PATCH /api/v1/admin/notices`

## 관리자 화면 (추가)
- 주문 상세 관리: `/admin/orders/{id}` (부분품절/대체/환불)
- 콘텐츠 관리: `/admin/content` (행사/배너/공지)

## Next 연동 상태 (Sprint 1 착수)
- Python REST API 클라이언트 레이어 추가: `frontend/lib/market-api.ts`
- 타입 정의 추가: `frontend/lib/market-types.ts`
- 홈 화면 API 연동: `frontend/app/page.tsx`
- 상품 목록 API 연동: `frontend/app/products/page.tsx`
- 상품 상세 API 연동: `frontend/app/products/[id]/page.tsx`
- 장바구니 API 연동: `frontend/app/cart/page.tsx`
- 체크아웃/주문생성 API 연동: `frontend/app/checkout/page.tsx`
- 주문 조회 API 연동: `frontend/app/orders/lookup/page.tsx`
- 주문 상세/취소 API 연동: `frontend/app/orders/[orderNo]/page.tsx`, `frontend/components/order-cancel-form.tsx`

## 최소 테스트
- Python: `services/python-backend/tests/test_public_api.py`
- Java: `services/java-frontend/src/test/java/com/localmarket/web/LocalMarketWebApplicationTests.java`
