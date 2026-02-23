from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import SavedAddress
from app.schemas import SavedAddressCreateInput, SavedAddressOut, SavedAddressPatchInput
from app.services import to_decimal

router = APIRouter(prefix='/addresses', tags=['addresses'])

MAX_SAVED_ADDRESSES = 20


def require_session_key(session_key: str | None) -> str:
    if not session_key or not session_key.strip():
        raise HTTPException(status_code=400, detail={'code': 'INVALID_REQUEST', 'message': 'session_key가 필요합니다.'})
    return session_key.strip()


def saved_address_to_schema(address: SavedAddress) -> SavedAddressOut:
    return SavedAddressOut(
        id=address.id,
        session_key=address.session_key,
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


def clear_default_for_session(db: Session, session_key: str) -> None:
    rows = list(db.scalars(select(SavedAddress).where(SavedAddress.session_key == session_key)))
    for row in rows:
        row.is_default = False


@router.get('', response_model=list[SavedAddressOut])
def get_saved_addresses(
    session_key: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[SavedAddressOut]:
    key = require_session_key(session_key)
    rows = list(
        db.scalars(
            select(SavedAddress)
            .where(SavedAddress.session_key == key)
            .order_by(SavedAddress.is_default.desc(), SavedAddress.updated_at.desc(), SavedAddress.id.desc())
        )
    )
    return [saved_address_to_schema(row) for row in rows]


@router.post('', response_model=SavedAddressOut)
def create_saved_address(
    payload: SavedAddressCreateInput,
    session_key: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> SavedAddressOut:
    key = require_session_key(session_key)

    count = db.scalar(select(func.count(SavedAddress.id)).where(SavedAddress.session_key == key)) or 0
    if count >= MAX_SAVED_ADDRESSES:
        raise HTTPException(
            status_code=400,
            detail={'code': 'ADDRESS_LIMIT_EXCEEDED', 'message': f'주소는 최대 {MAX_SAVED_ADDRESSES}개까지 저장할 수 있습니다.'},
        )

    if payload.is_default or count == 0:
        clear_default_for_session(db, key)

    row = SavedAddress(
        session_key=key,
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
    return saved_address_to_schema(row)


@router.patch('/{address_id}', response_model=SavedAddressOut)
def patch_saved_address(
    address_id: int,
    payload: SavedAddressPatchInput,
    session_key: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> SavedAddressOut:
    key = require_session_key(session_key)
    row = db.scalar(select(SavedAddress).where(and_(SavedAddress.id == address_id, SavedAddress.session_key == key)))
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
        clear_default_for_session(db, key)
        row.is_default = True
    elif 'is_default' in fields and payload.is_default is False:
        row.is_default = False

    row.last_used_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(row)

    if not row.is_default:
        any_default = db.scalar(
            select(SavedAddress).where(and_(SavedAddress.session_key == key, SavedAddress.is_default.is_(True))).limit(1)
        )
        if not any_default:
            row.is_default = True
            db.commit()
            db.refresh(row)

    return saved_address_to_schema(row)


@router.delete('/{address_id}')
def delete_saved_address(
    address_id: int,
    session_key: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    key = require_session_key(session_key)
    row = db.scalar(select(SavedAddress).where(and_(SavedAddress.id == address_id, SavedAddress.session_key == key)))
    if not row:
        raise HTTPException(status_code=404, detail={'code': 'ADDRESS_NOT_FOUND', 'message': '주소를 찾을 수 없습니다.'})

    was_default = row.is_default
    db.delete(row)
    db.commit()

    if was_default:
        next_default = db.scalar(
            select(SavedAddress)
            .where(SavedAddress.session_key == key)
            .order_by(SavedAddress.updated_at.desc(), SavedAddress.id.desc())
            .limit(1)
        )
        if next_default:
            next_default.is_default = True
            db.commit()

    return {'ok': True, 'address_id': address_id}
