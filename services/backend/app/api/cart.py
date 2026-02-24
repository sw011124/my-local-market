from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.api.auth import get_current_user_optional
from app.api.utils import cart_to_schema
from app.db import get_db
from app.models import CartItem, Product, ProductStatus, User
from app.schemas import CartItemInput, CartItemQtyUpdate, CartOut
from app.services import effective_price, fetch_cart_items, generate_session_key, get_or_create_cart

router = APIRouter(prefix='/cart', tags=['cart'])


def resolve_session_key(session_key: str | None) -> str:
    if session_key and session_key.strip():
        return session_key.strip()
    return generate_session_key()


@router.get('', response_model=CartOut)
def get_cart(
    session_key: str | None = Query(default=None, description='비회원 장바구니 세션키'),
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> CartOut:
    key = resolve_session_key(session_key)
    cart = get_or_create_cart(db, key, user_id=current_user.id if current_user else None)
    items = fetch_cart_items(db, cart.id)
    return cart_to_schema(cart, items)


@router.post('/items', response_model=CartOut)
def add_cart_item(
    payload: CartItemInput,
    session_key: str | None = Query(default=None),
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> CartOut:
    key = resolve_session_key(session_key)
    cart = get_or_create_cart(db, key, user_id=current_user.id if current_user else None)

    product = db.get(Product, payload.product_id)
    if product is None or product.status != ProductStatus.ACTIVE or not product.is_visible:
        raise HTTPException(status_code=400, detail={'code': 'OUT_OF_STOCK', 'message': '판매 불가능한 상품입니다.'})

    if payload.qty > product.max_per_order:
        raise HTTPException(status_code=400, detail={'code': 'MAX_QTY_EXCEEDED', 'message': '최대 구매 수량을 초과했습니다.'})

    if payload.qty > product.stock_qty - product.reserved_qty:
        raise HTTPException(status_code=400, detail={'code': 'INSUFFICIENT_STOCK', 'message': '재고가 부족합니다.'})

    existing = db.scalar(
        select(CartItem).where(and_(CartItem.cart_id == cart.id, CartItem.product_id == product.id))
    )
    if existing:
        new_qty = existing.qty + payload.qty
        if new_qty > product.max_per_order:
            raise HTTPException(status_code=400, detail={'code': 'MAX_QTY_EXCEEDED', 'message': '최대 구매 수량을 초과했습니다.'})
        if new_qty > product.stock_qty - product.reserved_qty:
            raise HTTPException(status_code=400, detail={'code': 'INSUFFICIENT_STOCK', 'message': '재고가 부족합니다.'})
        existing.qty = new_qty
    else:
        db.add(
            CartItem(
                cart_id=cart.id,
                product_id=product.id,
                qty=payload.qty,
                unit_snapshot_price=effective_price(product),
            )
        )

    db.commit()
    db.refresh(cart)

    items = fetch_cart_items(db, cart.id)
    return cart_to_schema(cart, items)


@router.patch('/items/{item_id}', response_model=CartOut)
def update_cart_item_qty(
    item_id: int,
    payload: CartItemQtyUpdate,
    session_key: str = Query(...),
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> CartOut:
    cart = get_or_create_cart(db, session_key, user_id=current_user.id if current_user else None)
    item = db.scalar(select(CartItem).where(and_(CartItem.id == item_id, CartItem.cart_id == cart.id)))
    if not item:
        raise HTTPException(status_code=404, detail={'code': 'CART_ITEM_NOT_FOUND', 'message': '장바구니 항목을 찾을 수 없습니다.'})

    product = db.get(Product, item.product_id)
    if not product:
        raise HTTPException(status_code=404, detail={'code': 'PRODUCT_NOT_FOUND', 'message': '상품을 찾을 수 없습니다.'})

    if payload.qty > product.max_per_order:
        raise HTTPException(status_code=400, detail={'code': 'MAX_QTY_EXCEEDED', 'message': '최대 구매 수량을 초과했습니다.'})

    if payload.qty > product.stock_qty - product.reserved_qty:
        raise HTTPException(status_code=400, detail={'code': 'INSUFFICIENT_STOCK', 'message': '재고가 부족합니다.'})

    item.qty = payload.qty
    item.unit_snapshot_price = effective_price(product)

    db.commit()
    db.refresh(cart)

    items = fetch_cart_items(db, cart.id)
    return cart_to_schema(cart, items)


@router.delete('/items/{item_id}', response_model=CartOut)
def delete_cart_item(
    item_id: int,
    session_key: str = Query(...),
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> CartOut:
    cart = get_or_create_cart(db, session_key, user_id=current_user.id if current_user else None)
    item = db.scalar(select(CartItem).where(and_(CartItem.id == item_id, CartItem.cart_id == cart.id)))
    if not item:
        raise HTTPException(status_code=404, detail={'code': 'CART_ITEM_NOT_FOUND', 'message': '장바구니 항목을 찾을 수 없습니다.'})

    db.delete(item)
    db.commit()
    db.refresh(cart)

    items = fetch_cart_items(db, cart.id)
    return cart_to_schema(cart, items)
