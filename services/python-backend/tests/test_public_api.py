import os
from datetime import time

os.environ['DATABASE_URL'] = 'sqlite:///./test_api.db'

from fastapi.testclient import TestClient

from app.db import SessionLocal, engine
from app.main import app
from app.models import Base, StorePolicy
from app.seed import seed_if_empty


client = TestClient(app)


def setup_module() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_if_empty(db)
        policy = db.query(StorePolicy).first()
        if policy:
            policy.open_time = time(hour=0)
            policy.close_time = time(hour=23, minute=59)
            db.commit()


def test_home_returns_seed_data() -> None:
    response = client.get('/api/v1/public/home')

    assert response.status_code == 200
    payload = response.json()
    assert len(payload['categories']) > 0
    assert len(payload['featured_products']) > 0


def test_cart_and_quote_flow() -> None:
    cart_resp = client.get('/api/v1/cart')
    session_key = cart_resp.json()['session_key']

    add_resp = client.post(
        f'/api/v1/cart/items?session_key={session_key}',
        json={'product_id': 1, 'qty': 3},
    )
    assert add_resp.status_code == 200

    quote_resp = client.post(
        '/api/v1/checkout/quote',
        json={
            'session_key': session_key,
            'dong_code': '1535011000',
        },
    )
    assert quote_resp.status_code == 200
    quote_payload = quote_resp.json()
    assert quote_payload['valid'] is True
    assert float(quote_payload['subtotal']) > 0


def test_admin_shortage_refund_and_content_crud() -> None:
    login_resp = client.post(
        '/api/v1/admin/auth/login',
        json={'username': 'admin', 'password': 'admin1234'},
    )
    assert login_resp.status_code == 200
    admin_token = login_resp.json()['access_token']
    headers = {'X-Admin-Token': admin_token}

    cart_resp = client.get('/api/v1/cart')
    session_key = cart_resp.json()['session_key']
    add_resp = client.post(
        f'/api/v1/cart/items?session_key={session_key}',
        json={'product_id': 1, 'qty': 3},
    )
    assert add_resp.status_code == 200

    order_resp = client.post(
        '/api/v1/orders',
        json={
            'session_key': session_key,
            'customer_name': '테스터',
            'customer_phone': '01000000000',
            'address_line1': '시흥시 목감동',
            'dong_code': '1535011000',
            'allow_substitution': True,
        },
    )
    assert order_resp.status_code == 200
    order_payload = order_resp.json()
    order_id = order_payload['id']
    order_item_id = order_payload['items'][0]['id']

    shortage_resp = client.post(
        f'/api/v1/admin/orders/{order_id}/shortage-actions',
        headers=headers,
        json={
            'order_item_id': order_item_id,
            'action': 'PARTIAL_CANCEL',
            'fulfilled_qty': 1,
            'reason': '재고 부족',
        },
    )
    assert shortage_resp.status_code == 200
    shortage_payload = shortage_resp.json()
    assert shortage_payload['refund'] is not None

    refund_resp = client.post(
        f'/api/v1/admin/orders/{order_id}/refunds',
        headers=headers,
        json={'amount': '500', 'reason': '추가 조정', 'method': 'COD_ADJUSTMENT'},
    )
    assert refund_resp.status_code == 200

    notice_resp = client.post(
        '/api/v1/admin/notices',
        headers=headers,
        json={
            'title': '테스트 공지',
            'body': '공지 본문',
            'start_at': '2026-02-18T00:00:00+09:00',
            'end_at': '2026-02-28T23:59:00+09:00',
            'is_pinned': False,
            'is_active': True,
        },
    )
    assert notice_resp.status_code == 200

    banner_resp = client.post(
        '/api/v1/admin/banners',
        headers=headers,
        json={
            'title': '테스트 배너',
            'image_url': 'https://example.com/banner.jpg',
            'link_type': 'PROMOTION',
            'link_target': '/promotions',
            'display_order': 2,
            'is_active': True,
            'start_at': '2026-02-18T00:00:00+09:00',
            'end_at': '2026-02-28T23:59:00+09:00',
        },
    )
    assert banner_resp.status_code == 200

    promo_list = client.get('/api/v1/admin/promotions', headers=headers)
    assert promo_list.status_code == 200
