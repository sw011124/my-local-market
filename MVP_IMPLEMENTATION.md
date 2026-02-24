# 동네 마트 자체배달 MVP 구현 가이드

## 구성
- `services/backend`: FastAPI + SQLAlchemy + Alembic + Seed
- `services/frontend`: Next.js 고객/관리자 웹
- `docker-compose.yml`: PostgreSQL + Backend + Frontend

## 정리 상태 (2026-02-18)
- 레거시 Nest 백엔드(`backend/`) 제거 완료
- 레거시 Java 프론트(`services/java-frontend`) 제거 완료
- 루트 구조는 `services/frontend`, `services/backend` 기준으로 통합

## 기본 정책 반영
- 계정: 비회원 주문 + 간편 회원(전화번호/비밀번호) 병행
- 배송권역: 하이브리드(동/아파트 + 반경)
- 운영시간: 09:00~21:00
- 당일마감: 19:00
- 중량상품: 예상금액 안내 + 실중량 정산 구조

## 실행
```bash
docker compose up -d --build db backend frontend
```

- 고객/관리자 웹(Next, Docker): http://localhost:3101
- 백엔드 API: http://localhost:8000/docs
- DB: `localhost:5433` (`postgres/postgres`, DB: `market`)

## npm 스크립트
```bash
npm run dev         # backend(docker) + frontend(local:3001)
npm run stack:up    # backend+frontend+db (docker)
npm run db:down     # 전체 종료
```

## 시드 데이터
- 카테고리 4종, 상품 4종, 행사 1건
- 배송권역: 동 1건, 아파트 1건, 반경 1건
- 관리자 계정: `admin / admin1234`

## 핵심 API
- 고객: `/api/v1/public/*`, `/api/v1/cart`, `/api/v1/checkout/*`, `/api/v1/orders/*`
- 회원 인증: `/api/v1/auth/signup`, `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`, `/api/v1/auth/me`
- 회원 전용: `/api/v1/me/addresses`, `/api/v1/me/orders/*`
- 관리자: `/api/v1/admin/auth/login`, `/api/v1/admin/orders`, `/api/v1/admin/orders/{id}/status`

## 관리자 고급 API
- 부분품절/대체 처리: `POST /api/v1/admin/orders/{id}/shortage-actions`
- 환불 처리/조회: `POST /api/v1/admin/orders/{id}/refunds`, `GET /api/v1/admin/orders/{id}/refunds`
- 환불 요약: `GET /api/v1/admin/orders/{id}/refund-summary`
- 상태 이력 조회: `GET /api/v1/admin/orders/{id}/status-logs`
- 행사 관리: `GET/POST/PATCH /api/v1/admin/promotions`
- 배너 관리: `GET/POST/PATCH /api/v1/admin/banners`
- 공지 관리: `GET/POST/PATCH /api/v1/admin/notices`
- 정책 관리: `GET/PATCH /api/v1/admin/policies`
- 상품 관리: `GET/POST /api/v1/admin/products`, `PATCH /api/v1/admin/products/{id}/inventory`

## 주문 운영 정책(2026-02 업데이트)
- 상태 전이 규칙:
  - `RECEIVED -> PICKING | CANCELED`
  - `PICKING -> SUBSTITUTION_PENDING | OUT_FOR_DELIVERY | CANCELED`
  - `SUBSTITUTION_PENDING -> PICKING | CANCELED`
  - `OUT_FOR_DELIVERY -> DELIVERED`
  - `DELIVERED`, `CANCELED`는 종결 상태
- 동일 상태 재요청은 no-op 처리(상태 로그 추가 생성 안 함)
- 고객 취소는 `RECEIVED` 상태 + `cancelable_until` 이내에서만 허용
- 품절 처리(`shortage-actions`)는 이미 처리 완료된 아이템(`SUBSTITUTED`, `PARTIAL_CANCELED`, `OUT_OF_STOCK`) 재처리 불가
- 환불은 누적 금액이 주문 예상총액(`total_estimated`)을 초과할 수 없음 (`REFUND_LIMIT_EXCEEDED`)

## Next 화면 범위
- 고객: `/`, `/products`, `/products/[id]`, `/cart`, `/checkout`, `/orders/lookup`, `/orders/[orderNo]`
- 관리자: `/admin/login`, `/admin/orders`, `/admin/orders/[id]`, `/admin/content`, `/admin/products`

## 최소 테스트
- Python: `services/backend/tests/test_public_api.py`
- Frontend: `npm run lint --prefix services/frontend`, `npm run build --prefix services/frontend`
