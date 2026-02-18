from datetime import datetime, time, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    AdminUser,
    Category,
    DeliveryZone,
    Notice,
    Product,
    Promotion,
    PromotionProduct,
    StorePolicy,
    ZoneType,
)


def seed_if_empty(db: Session) -> None:
    existing = db.scalar(select(Category.id).limit(1))
    if existing:
        return

    categories = [
        Category(name='과일·채소', display_order=1),
        Category(name='정육', display_order=2),
        Category(name='냉동', display_order=3),
        Category(name='생필품', display_order=4),
    ]
    db.add_all(categories)
    db.flush()

    products = [
        Product(
            category_id=categories[0].id,
            name='제주 감귤 1봉',
            sku='FRU-001',
            description='당도 높은 제주 감귤',
            unit_label='봉',
            origin_country='대한민국',
            storage_method='상온',
            base_price=Decimal('6900'),
            sale_price=Decimal('5900'),
            stock_qty=80,
            max_per_order=5,
            popularity=95,
        ),
        Product(
            category_id=categories[1].id,
            name='국내산 돼지앞다리 (100g)',
            sku='MEA-001',
            description='중량 상품, 실중량 정산',
            unit_label='100g',
            origin_country='대한민국',
            storage_method='냉장',
            is_weight_item=True,
            base_price=Decimal('1890'),
            stock_qty=400,
            max_per_order=20,
            popularity=88,
        ),
        Product(
            category_id=categories[2].id,
            name='냉동만두 1kg',
            sku='FRO-001',
            description='인기 냉동만두',
            unit_label='개',
            origin_country='대한민국',
            storage_method='냉동',
            base_price=Decimal('8900'),
            stock_qty=60,
            max_per_order=5,
            popularity=70,
        ),
        Product(
            category_id=categories[3].id,
            name='주방세제 1L',
            sku='LIV-001',
            description='저자극 주방세제',
            unit_label='개',
            origin_country='대한민국',
            storage_method='상온',
            base_price=Decimal('4200'),
            stock_qty=120,
            max_per_order=10,
            popularity=65,
        ),
    ]
    db.add_all(products)
    db.flush()

    now = datetime.now(timezone.utc)
    promotion = Promotion(
        title='이번 주 행사',
        promo_type='WEEKLY',
        start_at=now - timedelta(days=1),
        end_at=now + timedelta(days=6),
        is_active=True,
        banner_image_url='https://picsum.photos/1200/400',
    )
    db.add(promotion)
    db.flush()

    db.add(
        PromotionProduct(
            promotion_id=promotion.id,
            product_id=products[0].id,
            promo_price=Decimal('5900'),
            is_featured=True,
        )
    )

    db.add(
        StorePolicy(
            open_time=time(hour=9),
            close_time=time(hour=21),
            same_day_cutoff_time=time(hour=19),
            min_order_amount_default=Decimal('15000'),
            base_delivery_fee_default=Decimal('3000'),
            free_delivery_threshold_default=Decimal('40000'),
            allow_reservation_days=2,
        )
    )

    db.add_all(
        [
            DeliveryZone(
                zone_type=ZoneType.DONG,
                dong_code='1535011000',
                min_order_amount=Decimal('15000'),
                base_fee=Decimal('3000'),
                free_delivery_threshold=Decimal('40000'),
                is_active=True,
            ),
            DeliveryZone(
                zone_type=ZoneType.APARTMENT,
                dong_code='1535011000',
                apartment_name='목감대림아파트',
                min_order_amount=Decimal('12000'),
                base_fee=Decimal('2000'),
                free_delivery_threshold=Decimal('35000'),
                is_active=True,
            ),
            DeliveryZone(
                zone_type=ZoneType.RADIUS,
                center_lat=Decimal('37.3800000'),
                center_lng=Decimal('126.8600000'),
                radius_m=1500,
                min_order_amount=Decimal('15000'),
                base_fee=Decimal('3500'),
                free_delivery_threshold=Decimal('45000'),
                is_active=True,
            ),
        ]
    )

    db.add(
        Notice(
            title='배달 마감 안내',
            body='당일 주문은 19:00까지 접수됩니다.',
            start_at=now - timedelta(days=1),
            end_at=now + timedelta(days=60),
            is_pinned=True,
            is_active=True,
        )
    )

    db.add(
        AdminUser(
            username='admin',
            password_hash='admin1234',
            role='OWNER',
            is_active=True,
        )
    )

    db.commit()
