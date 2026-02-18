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
