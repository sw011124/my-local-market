from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import CheckoutQuoteResponse, CheckoutRequest, CheckoutValidateResponse
from app.services import get_or_create_cart, validate_checkout

router = APIRouter(prefix='/checkout', tags=['checkout'])


@router.post('/validate', response_model=CheckoutValidateResponse)
def validate(payload: CheckoutRequest, db: Session = Depends(get_db)) -> CheckoutValidateResponse:
    cart = get_or_create_cart(db, payload.session_key)
    result = validate_checkout(
        db,
        cart,
        payload.dong_code,
        payload.apartment_name,
        payload.latitude,
        payload.longitude,
        payload.requested_slot_start,
    )
    return CheckoutValidateResponse(valid=result.valid, errors=result.errors)


@router.post('/quote', response_model=CheckoutQuoteResponse)
def quote(payload: CheckoutRequest, db: Session = Depends(get_db)) -> CheckoutQuoteResponse:
    cart = get_or_create_cart(db, payload.session_key)
    result = validate_checkout(
        db,
        cart,
        payload.dong_code,
        payload.apartment_name,
        payload.latitude,
        payload.longitude,
        payload.requested_slot_start,
    )
    return CheckoutQuoteResponse(
        valid=result.valid,
        errors=result.errors,
        subtotal=result.subtotal,
        delivery_fee=result.delivery_fee,
        total_estimated=result.total_estimated,
        min_order_amount=result.min_order_amount,
        free_delivery_threshold=result.free_delivery_threshold,
    )
