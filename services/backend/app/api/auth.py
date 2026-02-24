from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.api.utils import order_to_schema
from app.auth import (
    decode_token,
    hash_password,
    hash_token,
    issue_access_token,
    issue_refresh_token,
    verify_password,
)
from app.db import get_db
from app.models import CancellationRequest, Order, OrderStatus, User, UserAddress, UserRefreshToken
from app.schemas import (
    CancelRequestInput,
    OrderOut,
    UserAddressCreateInput,
    UserAddressOut,
    UserAddressPatchInput,
    UserAuthResponse,
    UserLoginInput,
    UserLogoutInput,
    UserMeOut,
    UserRefreshInput,
    UserSignupInput,
)
from app.services import get_or_create_cart, to_decimal, update_order_status

router = APIRouter(tags=['auth'])

MAX_USER_ADDRESSES = 20


def normalize_phone(raw_phone: str) -> str:
    cleaned = ''.join(ch for ch in raw_phone if ch.isdigit())
    if len(cleaned) < 8:
        raise HTTPException(status_code=400, detail={'code': 'INVALID_PHONE', 'message': '전화번호 형식이 올바르지 않습니다.'})
    return cleaned


def user_to_schema(user: User) -> UserMeOut:
    return UserMeOut(
        id=user.id,
        phone=user.phone,
        name=user.name,
        is_active=user.is_active,
        created_at=user.created_at,
    )


def parse_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail={'code': 'UNAUTHORIZED', 'message': '인증이 필요합니다.'})
    scheme, _, token = authorization.partition(' ')
    if scheme.lower() != 'bearer' or not token:
        raise HTTPException(status_code=401, detail={'code': 'UNAUTHORIZED', 'message': '토큰 형식이 올바르지 않습니다.'})
    return token


def resolve_user_from_access_token(db: Session, token: str) -> User:
    try:
        payload = decode_token(token, expected_type='access')
        user_id = int(payload.get('sub'))
    except Exception:
        raise HTTPException(status_code=401, detail={'code': 'UNAUTHORIZED', 'message': '유효하지 않은 토큰입니다.'})

    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail={'code': 'UNAUTHORIZED', 'message': '유효하지 않은 사용자입니다.'})
    return user


def get_current_user(
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
) -> User:
    token = parse_bearer_token(authorization)
    return resolve_user_from_access_token(db, token)


def get_current_user_optional(
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
) -> User | None:
    if not authorization:
        return None
    token = parse_bearer_token(authorization)
    return resolve_user_from_access_token(db, token)


def issue_user_tokens(db: Session, user: User) -> tuple[str, str, int]:
    access_token, expires_in = issue_access_token(user.id)
    refresh_token, refresh_expires_at = issue_refresh_token(user.id)
    db.add(
        UserRefreshToken(
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            expires_at=refresh_expires_at,
        )
    )
    return access_token, refresh_token, expires_in


def user_address_to_schema(address: UserAddress) -> UserAddressOut:
    return UserAddressOut(
        id=address.id,
        user_id=address.user_id,
        label=address.label,
        recipient_name=address.recipient_name,
        phone=address.phone,
        address_line1=address.address_line1,
        address_line2=address.address_line2,
        building=address.building,
        unit_no=address.unit_no,
        dong_code=address.dong_code,
        apartment_name=address.apartment_name,
        latitude=to_decimal(address.latitude) if address.latitude is not None else None,
        longitude=to_decimal(address.longitude) if address.longitude is not None else None,
        is_default=address.is_default,
        created_at=address.created_at,
        updated_at=address.updated_at,
    )


def clear_default_user_address(db: Session, user_id: int) -> None:
    rows = list(db.scalars(select(UserAddress).where(UserAddress.user_id == user_id)))
    for row in rows:
        row.is_default = False


@router.post('/auth/signup', response_model=UserAuthResponse)
def signup(payload: UserSignupInput, db: Session = Depends(get_db)) -> UserAuthResponse:
    phone = normalize_phone(payload.phone)
    duplicate = db.scalar(select(User).where(User.phone == phone))
    if duplicate:
        raise HTTPException(status_code=409, detail={'code': 'DUPLICATE_PHONE', 'message': '이미 가입된 전화번호입니다.'})

    user = User(
        phone=phone,
        name=payload.name.strip(),
        password_hash=hash_password(payload.password),
        is_active=True,
    )
    db.add(user)
    db.flush()

    if payload.session_key and payload.session_key.strip():
        get_or_create_cart(db, payload.session_key.strip(), user_id=user.id)

    access_token, refresh_token, expires_in = issue_user_tokens(db, user)
    db.commit()
    db.refresh(user)

    return UserAuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        user=user_to_schema(user),
    )


@router.post('/auth/login', response_model=UserAuthResponse)
def login(payload: UserLoginInput, db: Session = Depends(get_db)) -> UserAuthResponse:
    phone = normalize_phone(payload.phone)
    user = db.scalar(select(User).where(and_(User.phone == phone, User.is_active.is_(True))))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail={'code': 'INVALID_CREDENTIALS', 'message': '로그인에 실패했습니다.'})

    user.last_login_at = datetime.now(timezone.utc)
    if payload.session_key and payload.session_key.strip():
        get_or_create_cart(db, payload.session_key.strip(), user_id=user.id)

    access_token, refresh_token, expires_in = issue_user_tokens(db, user)
    db.commit()
    db.refresh(user)

    return UserAuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        user=user_to_schema(user),
    )


@router.post('/auth/refresh', response_model=UserAuthResponse)
def refresh_token(payload: UserRefreshInput, db: Session = Depends(get_db)) -> UserAuthResponse:
    now = datetime.now(timezone.utc)
    try:
        decoded = decode_token(payload.refresh_token, expected_type='refresh')
        user_id = int(decoded.get('sub'))
    except Exception:
        raise HTTPException(status_code=401, detail={'code': 'UNAUTHORIZED', 'message': '유효하지 않은 리프레시 토큰입니다.'})

    token_digest = hash_token(payload.refresh_token)
    token_row = db.scalar(
        select(UserRefreshToken).where(
            and_(
                UserRefreshToken.user_id == user_id,
                UserRefreshToken.token_hash == token_digest,
                UserRefreshToken.revoked_at.is_(None),
                UserRefreshToken.expires_at > now,
            )
        )
    )
    if not token_row:
        raise HTTPException(status_code=401, detail={'code': 'UNAUTHORIZED', 'message': '만료되었거나 폐기된 토큰입니다.'})

    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail={'code': 'UNAUTHORIZED', 'message': '유효하지 않은 사용자입니다.'})

    token_row.revoked_at = now
    access_token, refresh_token, expires_in = issue_user_tokens(db, user)
    db.commit()
    db.refresh(user)

    return UserAuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        user=user_to_schema(user),
    )


@router.post('/auth/logout')
def logout(payload: UserLogoutInput, db: Session = Depends(get_db)) -> dict:
    now = datetime.now(timezone.utc)
    try:
        decoded = decode_token(payload.refresh_token, expected_type='refresh')
        user_id = int(decoded.get('sub'))
    except Exception:
        return {'ok': True}

    token_digest = hash_token(payload.refresh_token)
    token_row = db.scalar(
        select(UserRefreshToken).where(
            and_(
                UserRefreshToken.user_id == user_id,
                UserRefreshToken.token_hash == token_digest,
                UserRefreshToken.revoked_at.is_(None),
            )
        )
    )
    if token_row:
        token_row.revoked_at = now
        db.commit()

    return {'ok': True}


@router.get('/auth/me', response_model=UserMeOut)
def me(user: User = Depends(get_current_user)) -> UserMeOut:
    return user_to_schema(user)


@router.get('/me/addresses', response_model=list[UserAddressOut])
def get_my_addresses(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[UserAddressOut]:
    rows = list(
        db.scalars(
            select(UserAddress)
            .where(UserAddress.user_id == user.id)
            .order_by(UserAddress.is_default.desc(), UserAddress.updated_at.desc(), UserAddress.id.desc())
        )
    )
    return [user_address_to_schema(row) for row in rows]


@router.post('/me/addresses', response_model=UserAddressOut)
def create_my_address(
    payload: UserAddressCreateInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserAddressOut:
    count = db.scalar(select(func.count(UserAddress.id)).where(UserAddress.user_id == user.id)) or 0
    if count >= MAX_USER_ADDRESSES:
        raise HTTPException(
            status_code=400,
            detail={'code': 'ADDRESS_LIMIT_EXCEEDED', 'message': f'주소는 최대 {MAX_USER_ADDRESSES}개까지 저장할 수 있습니다.'},
        )

    if payload.is_default or count == 0:
        clear_default_user_address(db, user.id)

    row = UserAddress(
        user_id=user.id,
        label=payload.label,
        recipient_name=payload.recipient_name,
        phone=payload.phone,
        address_line1=payload.address_line1,
        address_line2=payload.address_line2,
        building=payload.building,
        unit_no=payload.unit_no,
        dong_code=payload.dong_code,
        apartment_name=payload.apartment_name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        is_default=payload.is_default or count == 0,
        last_used_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return user_address_to_schema(row)


@router.patch('/me/addresses/{address_id}', response_model=UserAddressOut)
def patch_my_address(
    address_id: int,
    payload: UserAddressPatchInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserAddressOut:
    row = db.scalar(select(UserAddress).where(and_(UserAddress.id == address_id, UserAddress.user_id == user.id)))
    if not row:
        raise HTTPException(status_code=404, detail={'code': 'ADDRESS_NOT_FOUND', 'message': '주소를 찾을 수 없습니다.'})

    fields = payload.model_fields_set
    if 'label' in fields:
        row.label = payload.label
    if 'recipient_name' in fields:
        row.recipient_name = payload.recipient_name
    if 'phone' in fields:
        row.phone = payload.phone
    if 'address_line1' in fields and payload.address_line1 is not None:
        row.address_line1 = payload.address_line1
    if 'address_line2' in fields:
        row.address_line2 = payload.address_line2
    if 'building' in fields:
        row.building = payload.building
    if 'unit_no' in fields:
        row.unit_no = payload.unit_no
    if 'dong_code' in fields:
        row.dong_code = payload.dong_code
    if 'apartment_name' in fields:
        row.apartment_name = payload.apartment_name
    if 'latitude' in fields:
        row.latitude = payload.latitude
    if 'longitude' in fields:
        row.longitude = payload.longitude
    if 'is_default' in fields and payload.is_default is True:
        clear_default_user_address(db, user.id)
        row.is_default = True
    elif 'is_default' in fields and payload.is_default is False:
        row.is_default = False

    row.last_used_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)

    if not row.is_default:
        any_default = db.scalar(
            select(UserAddress).where(and_(UserAddress.user_id == user.id, UserAddress.is_default.is_(True))).limit(1)
        )
        if not any_default:
            row.is_default = True
            db.commit()
            db.refresh(row)

    return user_address_to_schema(row)


@router.delete('/me/addresses/{address_id}')
def delete_my_address(
    address_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    row = db.scalar(select(UserAddress).where(and_(UserAddress.id == address_id, UserAddress.user_id == user.id)))
    if not row:
        raise HTTPException(status_code=404, detail={'code': 'ADDRESS_NOT_FOUND', 'message': '주소를 찾을 수 없습니다.'})

    was_default = row.is_default
    db.delete(row)
    db.commit()

    if was_default:
        next_default = db.scalar(
            select(UserAddress)
            .where(UserAddress.user_id == user.id)
            .order_by(UserAddress.updated_at.desc(), UserAddress.id.desc())
            .limit(1)
        )
        if next_default:
            next_default.is_default = True
            db.commit()

    return {'ok': True, 'address_id': address_id}


@router.get('/me/orders', response_model=list[OrderOut])
def get_my_orders(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[OrderOut]:
    rows = list(
        db.scalars(
            select(Order)
            .where(Order.user_id == user.id)
            .order_by(Order.ordered_at.desc(), Order.id.desc())
            .limit(100)
        )
    )
    return [order_to_schema(row) for row in rows]


@router.get('/me/orders/{order_no}', response_model=OrderOut)
def get_my_order(
    order_no: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderOut:
    row = db.scalar(select(Order).where(and_(Order.user_id == user.id, Order.order_no == order_no)))
    if not row:
        raise HTTPException(status_code=404, detail={'code': 'ORDER_NOT_FOUND', 'message': '주문을 찾을 수 없습니다.'})
    return order_to_schema(row)


@router.post('/me/orders/{order_no}/cancel-requests')
def cancel_my_order(
    order_no: str,
    payload: CancelRequestInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    order = db.scalar(select(Order).where(and_(Order.user_id == user.id, Order.order_no == order_no)))
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
        changed_by=f'USER_{user.id}',
        reason=payload.reason,
        changed_by_type='CUSTOMER',
    )
    db.add(
        CancellationRequest(
            order_id=order.id,
            reason=payload.reason,
            status='APPROVED',
            processed_at=datetime.now(timezone.utc),
            processed_by=f'USER_{user.id}',
        )
    )
    db.commit()

    return {'ok': True, 'order_no': order_no, 'status': order.status.value}

