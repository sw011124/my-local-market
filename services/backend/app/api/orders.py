from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.api.utils import order_to_schema
from app.db import get_db
from app.models import CancellationRequest, Order, OrderStatus
from app.schemas import CancelRequestInput, OrderCreateRequest, OrderOut
from app.services import create_order, get_or_create_cart, update_order_status, validate_checkout

router = APIRouter(prefix='/orders', tags=['orders'])


@router.post('', response_model=OrderOut)
def create_new_order(payload: OrderCreateRequest, db: Session = Depends(get_db)) -> OrderOut:
    cart = get_or_create_cart(db, payload.session_key)
    quote = validate_checkout(
        db,
        cart,
        payload.dong_code,
        payload.apartment_name,
        payload.latitude,
        payload.longitude,
        payload.requested_slot_start,
    )
    if not quote.valid:
        raise HTTPException(status_code=400, detail={'code': 'CHECKOUT_INVALID', 'errors': quote.errors})

    try:
        order = create_order(
            db=db,
            cart=cart,
            customer_name=payload.customer_name,
            customer_phone=payload.customer_phone,
            address_line1=payload.address_line1,
            address_line2=payload.address_line2,
            building=payload.building,
            unit_no=payload.unit_no,
            allow_substitution=payload.allow_substitution,
            requested_slot_start=payload.requested_slot_start,
            zone=quote.zone,
            quote=quote,
        )
        db.commit()
    except Exception as exc:  # pragma: no cover - safe rollback path
        db.rollback()
        if isinstance(exc, HTTPException):
            raise
        raise

    return order_to_schema(order)


@router.get('/lookup', response_model=OrderOut)
def lookup_order(order_no: str, phone: str, db: Session = Depends(get_db)) -> OrderOut:
    order = db.scalar(select(Order).where(and_(Order.order_no == order_no, Order.customer_phone == phone)))
    if not order:
        raise HTTPException(status_code=404, detail={'code': 'ORDER_NOT_FOUND', 'message': '주문을 찾을 수 없습니다.'})
    return order_to_schema(order)


@router.get('/{order_no}', response_model=OrderOut)
def get_order(order_no: str, phone: str = Query(...), db: Session = Depends(get_db)) -> OrderOut:
    order = db.scalar(select(Order).where(and_(Order.order_no == order_no, Order.customer_phone == phone)))
    if not order:
        raise HTTPException(status_code=404, detail={'code': 'ORDER_NOT_FOUND', 'message': '주문을 찾을 수 없습니다.'})
    return order_to_schema(order)


@router.post('/{order_no}/cancel-requests')
def cancel_order(order_no: str, payload: CancelRequestInput, phone: str = Query(...), db: Session = Depends(get_db)) -> dict:
    order = db.scalar(select(Order).where(and_(Order.order_no == order_no, Order.customer_phone == phone)))
    if not order:
        raise HTTPException(status_code=404, detail={'code': 'ORDER_NOT_FOUND', 'message': '주문을 찾을 수 없습니다.'})

    if order.status != OrderStatus.RECEIVED:
        raise HTTPException(status_code=400, detail={'code': 'ORDER_NOT_CANCELABLE', 'message': '피킹 시작 후 취소할 수 없습니다.'})

    if order.cancelable_until and datetime.now(timezone.utc) > order.cancelable_until:
        raise HTTPException(status_code=400, detail={'code': 'ORDER_NOT_CANCELABLE', 'message': '취소 가능 시간이 지났습니다.'})

    update_order_status(
        db,
        order,
        OrderStatus.CANCELED,
        changed_by='CUSTOMER_SELF',
        reason=payload.reason,
        changed_by_type='CUSTOMER',
    )
    db.add(
        CancellationRequest(
            order_id=order.id,
            reason=payload.reason,
            status='APPROVED',
            processed_at=datetime.now(timezone.utc),
            processed_by='CUSTOMER_SELF',
        )
    )
    db.commit()

    return {'ok': True, 'order_no': order_no, 'status': order.status.value}
