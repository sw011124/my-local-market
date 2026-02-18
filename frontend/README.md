# Next Frontend

이 프론트엔드는 Python 백엔드(`services/python-backend`) REST API를 사용합니다.

## 로컬 실행

```bash
npm install
npm run dev -- -p 3001
```

환경변수(선택):

```bash
MARKET_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_MARKET_API_BASE_URL=http://localhost:8000/api/v1
```

## Docker 실행

루트에서:

```bash
docker compose --profile transition-next up -d --build db python-backend next-frontend
```

- 웹(Docker): http://localhost:3101
- API: http://localhost:8000/docs

## 현재 연동된 페이지
- `/` 홈 (카테고리/추천/행사)
- `/products` 상품 목록/검색
- `/products/[id]` 상품 상세
- `/cart` 장바구니 (담기/수량변경/삭제)
- `/checkout` 체크아웃 (주문 생성)
- `/orders/lookup` 비회원 주문 조회
- `/orders/[orderNo]?phone=...` 주문 상세/취소요청
