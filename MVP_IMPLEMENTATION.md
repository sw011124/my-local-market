# 동네 마트 자체배달 MVP 구현 가이드

## 구성
- `services/python-backend`: FastAPI + SQLAlchemy + Alembic + Seed
- `services/java-frontend`: Spring Boot + Thymeleaf
- `docker-compose.yml`: PostgreSQL + Python 백엔드 + Java 프론트 통합 실행

## 기본 정책 반영
- 계정: 비회원 주문 + 주문번호/휴대폰 조회
- 배송권역: 하이브리드(동/아파트 + 반경)
- 운영시간: 09:00~21:00
- 당일마감: 19:00
- 중량상품: 예상금액 안내 + 실중량 정산 구조

## 실행
```bash
docker compose up -d --build db python-backend java-frontend
```

- 고객 웹: http://localhost:8080
- 백엔드 API: http://localhost:8000/docs
- DB: `localhost:5433` (`postgres/postgres`, DB: `market`)

## 시드 데이터
- 카테고리 4종, 상품 4종, 행사 1건
- 배송권역: 동 1건, 아파트 1건, 반경 1건
- 관리자 계정: `admin / admin1234`

## 핵심 API
- 고객: `/api/v1/public/*`, `/api/v1/cart`, `/api/v1/checkout/*`, `/api/v1/orders/*`
- 관리자: `/api/v1/admin/auth/login`, `/api/v1/admin/orders`, `/api/v1/admin/orders/{id}/status`

## 최소 테스트
- Python: `services/python-backend/tests/test_public_api.py`
- Java: `services/java-frontend/src/test/java/com/localmarket/web/LocalMarketWebApplicationTests.java`
