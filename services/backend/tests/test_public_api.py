import os
from datetime import date, time, timedelta
from decimal import Decimal

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
            policy.same_day_cutoff_time = time(hour=23, minute=59)
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
        json={'product_id': 1, 'qty': 5},
    )
    assert add_resp.status_code == 200
    add_more_resp = client.post(
        f'/api/v1/cart/items?session_key={session_key}',
        json={'product_id': 4, 'qty': 1},
    )
    assert add_more_resp.status_code == 200

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
        json={'product_id': 1, 'qty': 5},
    )
    assert add_resp.status_code == 200
    add_more_resp = client.post(
        f'/api/v1/cart/items?session_key={session_key}',
        json={'product_id': 4, 'qty': 1},
    )
    assert add_more_resp.status_code == 200

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


def test_admin_product_patch_and_delete_flow() -> None:
    login_resp = client.post(
        '/api/v1/admin/auth/login',
        json={'username': 'admin', 'password': 'admin1234'},
    )
    assert login_resp.status_code == 200
    admin_token = login_resp.json()['access_token']
    headers = {'X-Admin-Token': admin_token}

    create_resp = client.post(
        '/api/v1/admin/products',
        headers=headers,
        json={
            'category_id': 1,
            'name': '테스트 상품 CRUD',
            'sku': 'TEST-CRUD-001',
            'description': 'CRUD 기능 검증용',
            'unit_label': '개',
            'base_price': '6000',
            'sale_price': '5000',
            'stock_qty': 11,
            'max_per_order': 3,
            'pick_location': 'A-01',
        },
    )
    assert create_resp.status_code == 200
    created = create_resp.json()
    product_id = created['id']
    assert created['pick_location'] == 'A-01'

    patch_resp = client.patch(
        f'/api/v1/admin/products/{product_id}',
        headers=headers,
        json={
            'name': '테스트 상품 CRUD 수정',
            'sale_price': '4500',
            'status': 'PAUSED',
            'stock_qty': 7,
            'max_per_order': 2,
            'pick_location': 'A-02',
        },
    )
    assert patch_resp.status_code == 200
    patched = patch_resp.json()
    assert patched['name'] == '테스트 상품 CRUD 수정'
    assert patched['sale_price'] == '4500.00'
    assert patched['status'] == 'PAUSED'
    assert patched['stock_qty'] == 7
    assert patched['max_per_order'] == 2
    assert patched['pick_location'] == 'A-02'

    invalid_price_resp = client.patch(
        f'/api/v1/admin/products/{product_id}',
        headers=headers,
        json={'sale_price': '7000'},
    )
    assert invalid_price_resp.status_code == 400

    delete_resp = client.delete(f'/api/v1/admin/products/{product_id}', headers=headers)
    assert delete_resp.status_code == 200
    assert delete_resp.json()['ok'] is True

    admin_products_resp = client.get('/api/v1/admin/products', headers=headers)
    assert admin_products_resp.status_code == 200
    remaining_ids = [product['id'] for product in admin_products_resp.json()]
    assert product_id not in remaining_ids

    public_detail_resp = client.get(f'/api/v1/public/products/{product_id}')
    assert public_detail_resp.status_code == 404


def test_admin_picking_list_flow() -> None:
    login_resp = client.post(
        '/api/v1/admin/auth/login',
        json={'username': 'admin', 'password': 'admin1234'},
    )
    assert login_resp.status_code == 200
    admin_token = login_resp.json()['access_token']
    headers = {'X-Admin-Token': admin_token}

    create_resp = client.post(
        '/api/v1/admin/products',
        headers=headers,
        json={
            'category_id': 1,
            'name': '피킹 테스트 상품',
            'sku': 'TEST-PICK-001',
            'unit_label': '개',
            'base_price': '30000',
            'stock_qty': 50,
            'max_per_order': 10,
            'pick_location': 'B-02',
        },
    )
    assert create_resp.status_code == 200
    created_product = create_resp.json()

    cart_resp = client.get('/api/v1/cart')
    assert cart_resp.status_code == 200
    session_key = cart_resp.json()['session_key']

    add_resp = client.post(
        f'/api/v1/cart/items?session_key={session_key}',
        json={'product_id': created_product['id'], 'qty': 2},
    )
    assert add_resp.status_code == 200

    order_resp = client.post(
        '/api/v1/orders',
        json={
            'session_key': session_key,
            'customer_name': '피킹테스터',
            'customer_phone': '01012345678',
            'address_line1': '시흥시 목감동',
            'dong_code': '1535011000',
            'allow_substitution': False,
        },
    )
    assert order_resp.status_code == 200

    picking_resp = client.get('/api/v1/admin/picking-list?statuses=RECEIVED,PICKING', headers=headers)
    assert picking_resp.status_code == 200
    picking_payload = picking_resp.json()
    assert picking_payload['order_count'] >= 1
    assert picking_payload['line_count'] >= 1
    assert any(item['product_id'] == created_product['id'] for item in picking_payload['items'])

    keyword_resp = client.get('/api/v1/admin/picking-list?statuses=RECEIVED,PICKING&keyword=B-02', headers=headers)
    assert keyword_resp.status_code == 200
    keyword_payload = keyword_resp.json()
    assert any(item['pick_location'] == 'B-02' for item in keyword_payload['items'])

    invalid_status_resp = client.get('/api/v1/admin/picking-list?statuses=INVALID_STATUS', headers=headers)
    assert invalid_status_resp.status_code == 400


def test_admin_delivery_policy_zone_holiday_flow() -> None:
    login_resp = client.post(
        '/api/v1/admin/auth/login',
        json={'username': 'admin', 'password': 'admin1234'},
    )
    assert login_resp.status_code == 200
    admin_token = login_resp.json()['access_token']
    headers = {'X-Admin-Token': admin_token}

    policy_resp = client.patch(
        '/api/v1/admin/policies',
        headers=headers,
        json={
            'open_time': '09:00',
            'close_time': '21:00',
            'same_day_cutoff_time': '19:00',
            'allow_reservation_days': 2,
        },
    )
    assert policy_resp.status_code == 200
    assert policy_resp.json()['open_time'] == '09:00:00'

    invalid_zone_resp = client.post(
        '/api/v1/admin/delivery-zones',
        headers=headers,
        json={'zone_type': 'DONG'},
    )
    assert invalid_zone_resp.status_code == 400

    zone_resp = client.post(
        '/api/v1/admin/delivery-zones',
        headers=headers,
        json={
            'zone_type': 'DONG',
            'dong_code': '9999999999',
            'min_order_amount': '10000',
            'base_fee': '2500',
            'free_delivery_threshold': '30000',
            'is_active': True,
        },
    )
    assert zone_resp.status_code == 200
    zone_id = zone_resp.json()['id']

    target_date = date.today() + timedelta(days=1)
    holiday_resp = client.post(
        '/api/v1/admin/holidays',
        headers=headers,
        json={
            'holiday_date': target_date.isoformat(),
            'reason': '정기 휴무',
            'is_closed': True,
        },
    )
    assert holiday_resp.status_code == 200
    holiday_id = holiday_resp.json()['id']

    cart_resp = client.get('/api/v1/cart')
    session_key = cart_resp.json()['session_key']
    add_resp = client.post(
        f'/api/v1/cart/items?session_key={session_key}',
        json={'product_id': 1, 'qty': 2},
    )
    assert add_resp.status_code == 200

    holiday_quote_resp = client.post(
        '/api/v1/checkout/quote',
        json={
            'session_key': session_key,
            'dong_code': '9999999999',
            'requested_slot_start': f'{target_date.isoformat()}T10:00:00+09:00',
        },
    )
    assert holiday_quote_resp.status_code == 200
    holiday_quote_payload = holiday_quote_resp.json()
    assert holiday_quote_payload['valid'] is False
    assert 'HOLIDAY_CLOSED' in holiday_quote_payload['errors']

    reopen_holiday_resp = client.patch(
        f'/api/v1/admin/holidays/{holiday_id}',
        headers=headers,
        json={'is_closed': False},
    )
    assert reopen_holiday_resp.status_code == 200

    valid_quote_resp = client.post(
        '/api/v1/checkout/quote',
        json={
            'session_key': session_key,
            'dong_code': '9999999999',
            'requested_slot_start': f'{target_date.isoformat()}T10:00:00+09:00',
        },
    )
    assert valid_quote_resp.status_code == 200
    valid_quote_payload = valid_quote_resp.json()
    assert valid_quote_payload['valid'] is True
    assert valid_quote_payload['delivery_fee'] == '0'

    deactivate_zone_resp = client.delete(f'/api/v1/admin/delivery-zones/{zone_id}', headers=headers)
    assert deactivate_zone_resp.status_code == 200

    out_of_zone_quote_resp = client.post(
        '/api/v1/checkout/quote',
        json={
            'session_key': session_key,
            'dong_code': '9999999999',
            'requested_slot_start': f'{target_date.isoformat()}T10:00:00+09:00',
        },
    )
    assert out_of_zone_quote_resp.status_code == 200
    out_of_zone_quote_payload = out_of_zone_quote_resp.json()
    assert out_of_zone_quote_payload['valid'] is False
    assert 'OUT_OF_DELIVERY_ZONE' in out_of_zone_quote_payload['errors']

    delete_holiday_resp = client.delete(f'/api/v1/admin/holidays/{holiday_id}', headers=headers)
    assert delete_holiday_resp.status_code == 200


def test_saved_addresses_crud_flow() -> None:
    session_key = 'session-address-test'

    empty_list_resp = client.get(f'/api/v1/addresses?session_key={session_key}')
    assert empty_list_resp.status_code == 200
    assert empty_list_resp.json() == []

    create_first_resp = client.post(
        f'/api/v1/addresses?session_key={session_key}',
        json={
            'label': '집',
            'recipient_name': '홍길동',
            'phone': '01012345678',
            'address_line1': '경기도 시흥시 목감동 100',
            'address_line2': '101동 1001호',
            'dong_code': '1535011000',
            'is_default': True,
        },
    )
    assert create_first_resp.status_code == 200
    first = create_first_resp.json()
    assert first['is_default'] is True

    create_second_resp = client.post(
        f'/api/v1/addresses?session_key={session_key}',
        json={
            'label': '회사',
            'recipient_name': '홍길동',
            'phone': '01012345678',
            'address_line1': '서울시 금천구 가산동 200',
            'address_line2': 'A동 902호',
            'dong_code': '1154510200',
            'is_default': False,
        },
    )
    assert create_second_resp.status_code == 200
    second = create_second_resp.json()
    assert second['is_default'] is False

    set_second_default_resp = client.patch(
        f"/api/v1/addresses/{second['id']}?session_key={session_key}",
        json={'is_default': True, 'label': '회사(기본)'},
    )
    assert set_second_default_resp.status_code == 200
    assert set_second_default_resp.json()['is_default'] is True

    list_resp = client.get(f'/api/v1/addresses?session_key={session_key}')
    assert list_resp.status_code == 200
    address_list = list_resp.json()
    assert len(address_list) == 2
    default_rows = [row for row in address_list if row['is_default']]
    assert len(default_rows) == 1
    assert default_rows[0]['id'] == second['id']

    delete_resp = client.delete(f"/api/v1/addresses/{second['id']}?session_key={session_key}")
    assert delete_resp.status_code == 200
    assert delete_resp.json()['ok'] is True

    remaining_resp = client.get(f'/api/v1/addresses?session_key={session_key}')
    assert remaining_resp.status_code == 200
    remaining = remaining_resp.json()
    assert len(remaining) == 1
    assert remaining[0]['id'] == first['id']
    assert remaining[0]['is_default'] is True


def test_order_status_transition_rules_and_logs() -> None:
    login_resp = client.post(
        '/api/v1/admin/auth/login',
        json={'username': 'admin', 'password': 'admin1234'},
    )
    assert login_resp.status_code == 200
    admin_token = login_resp.json()['access_token']
    headers = {'X-Admin-Token': admin_token}

    create_product_resp = client.post(
        '/api/v1/admin/products',
        headers=headers,
        json={
            'category_id': 1,
            'name': '상태전이 테스트 상품',
            'sku': 'TEST-STATE-ORDER-001',
            'unit_label': '개',
            'base_price': '12000',
            'stock_qty': 30,
            'max_per_order': 10,
            'pick_location': 'S-01',
        },
    )
    assert create_product_resp.status_code == 200
    product_id = create_product_resp.json()['id']

    cart_resp = client.get('/api/v1/cart')
    assert cart_resp.status_code == 200
    session_key = cart_resp.json()['session_key']
    add_resp = client.post(
        f'/api/v1/cart/items?session_key={session_key}',
        json={'product_id': product_id, 'qty': 3},
    )
    assert add_resp.status_code == 200

    order_resp = client.post(
        '/api/v1/orders',
        json={
            'session_key': session_key,
            'customer_name': '상태테스터',
            'customer_phone': '01011112222',
            'address_line1': '시흥시 목감동',
            'dong_code': '1535011000',
            'allow_substitution': False,
        },
    )
    assert order_resp.status_code == 200
    order = order_resp.json()
    order_id = order['id']

    logs_resp = client.get(f'/api/v1/admin/orders/{order_id}/status-logs', headers=headers)
    assert logs_resp.status_code == 200
    logs = logs_resp.json()
    assert len(logs) == 1
    assert logs[0]['to_status'] == 'RECEIVED'

    # Same-status update should be treated as no-op and should not create a new log.
    noop_resp = client.patch(
        f'/api/v1/admin/orders/{order_id}/status',
        headers=headers,
        json={'status': 'RECEIVED'},
    )
    assert noop_resp.status_code == 200
    logs_after_noop_resp = client.get(f'/api/v1/admin/orders/{order_id}/status-logs', headers=headers)
    assert logs_after_noop_resp.status_code == 200
    assert len(logs_after_noop_resp.json()) == 1

    invalid_transition_resp = client.patch(
        f'/api/v1/admin/orders/{order_id}/status',
        headers=headers,
        json={'status': 'DELIVERED'},
    )
    assert invalid_transition_resp.status_code == 400
    assert invalid_transition_resp.json()['detail']['code'] == 'INVALID_STATUS_TRANSITION'

    to_picking_resp = client.patch(
        f'/api/v1/admin/orders/{order_id}/status',
        headers=headers,
        json={'status': 'PICKING'},
    )
    assert to_picking_resp.status_code == 200

    to_delivery_resp = client.patch(
        f'/api/v1/admin/orders/{order_id}/status',
        headers=headers,
        json={'status': 'OUT_FOR_DELIVERY'},
    )
    assert to_delivery_resp.status_code == 200

    to_delivered_resp = client.patch(
        f'/api/v1/admin/orders/{order_id}/status',
        headers=headers,
        json={'status': 'DELIVERED'},
    )
    assert to_delivered_resp.status_code == 200

    backward_resp = client.patch(
        f'/api/v1/admin/orders/{order_id}/status',
        headers=headers,
        json={'status': 'PICKING'},
    )
    assert backward_resp.status_code == 400
    assert backward_resp.json()['detail']['code'] == 'INVALID_STATUS_TRANSITION'

    final_logs_resp = client.get(f'/api/v1/admin/orders/{order_id}/status-logs', headers=headers)
    assert final_logs_resp.status_code == 200
    final_logs = final_logs_resp.json()
    transitions = [(row['from_status'], row['to_status']) for row in final_logs]
    assert ('OUT_FOR_DELIVERY', 'DELIVERED') in transitions
    assert ('PICKING', 'OUT_FOR_DELIVERY') in transitions
    assert ('RECEIVED', 'PICKING') in transitions


def test_cancel_restriction_shortage_reapply_and_refund_limit() -> None:
    login_resp = client.post(
        '/api/v1/admin/auth/login',
        json={'username': 'admin', 'password': 'admin1234'},
    )
    assert login_resp.status_code == 200
    admin_token = login_resp.json()['access_token']
    headers = {'X-Admin-Token': admin_token}

    create_product_resp = client.post(
        '/api/v1/admin/products',
        headers=headers,
        json={
            'category_id': 1,
            'name': '환불정책 테스트 상품',
            'sku': 'TEST-REFUND-POLICY-001',
            'unit_label': '개',
            'base_price': '20000',
            'stock_qty': 30,
            'max_per_order': 10,
            'pick_location': 'R-01',
        },
    )
    assert create_product_resp.status_code == 200
    product_id = create_product_resp.json()['id']

    cart_resp = client.get('/api/v1/cart')
    assert cart_resp.status_code == 200
    session_key = cart_resp.json()['session_key']
    add_resp = client.post(
        f'/api/v1/cart/items?session_key={session_key}',
        json={'product_id': product_id, 'qty': 2},
    )
    assert add_resp.status_code == 200

    order_resp = client.post(
        '/api/v1/orders',
        json={
            'session_key': session_key,
            'customer_name': '정책테스터',
            'customer_phone': '01033334444',
            'address_line1': '시흥시 목감동',
            'dong_code': '1535011000',
            'allow_substitution': True,
        },
    )
    assert order_resp.status_code == 200
    order = order_resp.json()
    order_id = order['id']
    order_no = order['order_no']
    order_item_id = order['items'][0]['id']

    to_picking_resp = client.patch(
        f'/api/v1/admin/orders/{order_id}/status',
        headers=headers,
        json={'status': 'PICKING'},
    )
    assert to_picking_resp.status_code == 200

    cancel_resp = client.post(
        f'/api/v1/orders/{order_no}/cancel-requests?phone=01033334444',
        json={'reason': '취소요청'},
    )
    assert cancel_resp.status_code == 400
    assert cancel_resp.json()['detail']['code'] == 'ORDER_NOT_CANCELABLE'

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
    assert shortage_payload.get('summary') is not None

    shortage_reapply_resp = client.post(
        f'/api/v1/admin/orders/{order_id}/shortage-actions',
        headers=headers,
        json={
            'order_item_id': order_item_id,
            'action': 'OUT_OF_STOCK',
            'fulfilled_qty': 0,
            'reason': '중복 처리',
        },
    )
    assert shortage_reapply_resp.status_code == 400
    assert shortage_reapply_resp.json()['detail']['code'] == 'ITEM_ALREADY_PROCESSED'

    refund_summary_resp = client.get(f'/api/v1/admin/orders/{order_id}/refund-summary', headers=headers)
    assert refund_summary_resp.status_code == 200
    refund_summary = refund_summary_resp.json()
    assert Decimal(refund_summary['refundable_remaining']) >= Decimal('0')

    over_refund_resp = client.post(
        f'/api/v1/admin/orders/{order_id}/refunds',
        headers=headers,
        json={
            'amount': '99999999',
            'reason': '과환불 테스트',
            'method': 'COD_ADJUSTMENT',
        },
    )
    assert over_refund_resp.status_code == 400
    assert over_refund_resp.json()['detail']['code'] == 'REFUND_LIMIT_EXCEEDED'


def test_user_auth_refresh_logout_flow() -> None:
    signup_resp = client.post(
        '/api/v1/auth/signup',
        json={
            'phone': '010-7000-0001',
            'name': '회원테스터1',
            'password': 'password123',
        },
    )
    assert signup_resp.status_code == 200
    signup_payload = signup_resp.json()
    assert signup_payload['token_type'] == 'bearer'
    assert signup_payload['user']['phone'] == '01070000001'

    access_token = signup_payload['access_token']
    refresh_token = signup_payload['refresh_token']
    auth_headers = {'Authorization': f'Bearer {access_token}'}

    me_resp = client.get('/api/v1/auth/me', headers=auth_headers)
    assert me_resp.status_code == 200
    assert me_resp.json()['phone'] == '01070000001'

    refresh_resp = client.post('/api/v1/auth/refresh', json={'refresh_token': refresh_token})
    assert refresh_resp.status_code == 200
    refresh_payload = refresh_resp.json()
    assert refresh_payload['access_token'] != access_token
    assert refresh_payload['refresh_token'] != refresh_token

    logout_resp = client.post('/api/v1/auth/logout', json={'refresh_token': refresh_payload['refresh_token']})
    assert logout_resp.status_code == 200
    assert logout_resp.json()['ok'] is True

    refresh_after_logout_resp = client.post(
        '/api/v1/auth/refresh',
        json={'refresh_token': refresh_payload['refresh_token']},
    )
    assert refresh_after_logout_resp.status_code == 401


def test_member_address_and_order_flow() -> None:
    cart_resp = client.get('/api/v1/cart')
    assert cart_resp.status_code == 200
    session_key = cart_resp.json()['session_key']

    add_resp = client.post(
        f'/api/v1/cart/items?session_key={session_key}',
        json={'product_id': 1, 'qty': 5},
    )
    assert add_resp.status_code == 200
    add_more_resp = client.post(
        f'/api/v1/cart/items?session_key={session_key}',
        json={'product_id': 4, 'qty': 1},
    )
    assert add_more_resp.status_code == 200

    signup_resp = client.post(
        '/api/v1/auth/signup',
        json={
            'phone': '01070000002',
            'name': '회원테스터2',
            'password': 'password123',
            'session_key': session_key,
        },
    )
    assert signup_resp.status_code == 200
    access_token = signup_resp.json()['access_token']
    user_id = signup_resp.json()['user']['id']
    headers = {'Authorization': f'Bearer {access_token}'}

    create_addr_resp = client.post(
        '/api/v1/me/addresses',
        headers=headers,
        json={
            'label': '집',
            'recipient_name': '회원테스터2',
            'phone': '01070000002',
            'address_line1': '경기도 시흥시 목감동 100',
            'dong_code': '1535011000',
            'is_default': True,
        },
    )
    assert create_addr_resp.status_code == 200
    created_address = create_addr_resp.json()
    assert created_address['is_default'] is True

    list_addr_resp = client.get('/api/v1/me/addresses', headers=headers)
    assert list_addr_resp.status_code == 200
    assert len(list_addr_resp.json()) >= 1

    order_resp = client.post(
        '/api/v1/orders',
        headers=headers,
        json={
            'session_key': session_key,
            'customer_name': '회원테스터2',
            'customer_phone': '01070000002',
            'address_line1': '경기도 시흥시 목감동 100',
            'dong_code': '1535011000',
            'allow_substitution': False,
        },
    )
    assert order_resp.status_code == 200
    order_payload = order_resp.json()
    assert order_payload['order_source'] == 'MEMBER'
    assert order_payload['user_id'] == user_id

    my_orders_resp = client.get('/api/v1/me/orders', headers=headers)
    assert my_orders_resp.status_code == 200
    assert any(row['id'] == order_payload['id'] for row in my_orders_resp.json())

    lookup_resp = client.get(
        f"/api/v1/orders/lookup?order_no={order_payload['order_no']}",
        headers=headers,
    )
    assert lookup_resp.status_code == 200
    assert lookup_resp.json()['order_no'] == order_payload['order_no']
