from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.orm import Session

from app.api.utils import product_to_schema
from app.db import get_db
from app.models import Category, Notice, Product, ProductStatus, Promotion, PromotionProduct
from app.schemas import CategoryOut, HomeResponse, ProductOut, PromotionOut

router = APIRouter(prefix='/public', tags=['public'])


@router.get('/home', response_model=HomeResponse)
def get_home(db: Session = Depends(get_db)) -> HomeResponse:
    now = datetime.now(timezone.utc)

    categories = list(
        db.scalars(
            select(Category)
            .where(Category.is_active.is_(True))
            .order_by(Category.display_order.asc(), Category.id.asc())
        )
    )

    featured_products = list(
        db.scalars(
            select(Product)
            .where(and_(Product.is_visible.is_(True), Product.status == ProductStatus.ACTIVE))
            .order_by(Product.popularity.desc(), Product.id.asc())
            .limit(12)
        )
    )

    promotions = list(
        db.scalars(
            select(Promotion)
            .where(
                and_(
                    Promotion.is_active.is_(True),
                    Promotion.start_at <= now,
                    Promotion.end_at >= now,
                )
            )
            .order_by(Promotion.start_at.desc())
            .limit(5)
        )
    )

    notices = list(
        db.execute(
            select(Notice.id, Notice.title, Notice.start_at, Notice.end_at)
            .where(
                and_(Notice.is_active.is_(True), Notice.start_at <= now, Notice.end_at >= now)
            )
            .order_by(Notice.is_pinned.desc(), Notice.created_at.desc())
            .limit(5)
        )
    )

    return HomeResponse(
        categories=[CategoryOut(id=c.id, name=c.name, display_order=c.display_order) for c in categories],
        featured_products=[product_to_schema(p) for p in featured_products],
        promotions=[
            PromotionOut(
                id=p.id,
                title=p.title,
                promo_type=p.promo_type,
                start_at=p.start_at,
                end_at=p.end_at,
                is_active=p.is_active,
            )
            for p in promotions
        ],
        notices=[
            {
                'id': n.id,
                'title': n.title,
                'start_at': n.start_at,
                'end_at': n.end_at,
            }
            for n in notices
        ],
    )


@router.get('/categories', response_model=list[CategoryOut])
def get_categories(db: Session = Depends(get_db)) -> list[CategoryOut]:
    categories = list(
        db.scalars(
            select(Category)
            .where(Category.is_active.is_(True))
            .order_by(Category.display_order.asc(), Category.id.asc())
        )
    )
    return [CategoryOut(id=c.id, name=c.name, display_order=c.display_order) for c in categories]


@router.get('/products', response_model=list[ProductOut])
def get_products(
    category_id: int | None = None,
    q: str | None = None,
    min_price: int | None = Query(default=None, ge=0),
    max_price: int | None = Query(default=None, ge=0),
    promo: bool | None = None,
    sort: str = Query(default='popular', pattern='^(popular|new|priceAsc|priceDesc)$'),
    db: Session = Depends(get_db),
) -> list[ProductOut]:
    stmt = select(Product).where(and_(Product.is_visible.is_(True), Product.status == ProductStatus.ACTIVE))

    if category_id:
        stmt = stmt.where(Product.category_id == category_id)

    if q:
        pattern = f'%{q.strip()}%'
        stmt = stmt.where(or_(Product.name.ilike(pattern), Product.description.ilike(pattern)))

    effective_price_expr = func.coalesce(Product.sale_price, Product.base_price)
    if min_price is not None:
        stmt = stmt.where(effective_price_expr >= min_price)
    if max_price is not None:
        stmt = stmt.where(effective_price_expr <= max_price)

    if promo is True:
        now = datetime.now(timezone.utc)
        stmt = stmt.join(PromotionProduct, PromotionProduct.product_id == Product.id).join(
            Promotion,
            and_(Promotion.id == PromotionProduct.promotion_id, Promotion.start_at <= now, Promotion.end_at >= now),
        )

    if sort == 'popular':
        stmt = stmt.order_by(desc(Product.popularity), Product.id.asc())
    elif sort == 'new':
        stmt = stmt.order_by(desc(Product.created_at), Product.id.asc())
    elif sort == 'priceAsc':
        stmt = stmt.order_by(effective_price_expr.asc(), Product.id.asc())
    else:
        stmt = stmt.order_by(effective_price_expr.desc(), Product.id.asc())

    products = list(db.scalars(stmt.limit(100)))
    return [product_to_schema(product) for product in products]


@router.get('/products/{product_id}', response_model=ProductOut)
def get_product_detail(product_id: int, db: Session = Depends(get_db)) -> ProductOut:
    product = db.get(Product, product_id)
    if product is None or not product.is_visible:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail={'code': 'PRODUCT_NOT_FOUND', 'message': '상품을 찾을 수 없습니다.'})
    return product_to_schema(product)


@router.get('/promotions/current', response_model=list[PromotionOut])
def get_current_promotions(db: Session = Depends(get_db)) -> list[PromotionOut]:
    now = datetime.now(timezone.utc)
    promotions = list(
        db.scalars(
            select(Promotion)
            .where(and_(Promotion.is_active.is_(True), Promotion.start_at <= now, Promotion.end_at >= now))
            .order_by(Promotion.start_at.desc())
        )
    )
    return [
        PromotionOut(
            id=p.id,
            title=p.title,
            promo_type=p.promo_type,
            start_at=p.start_at,
            end_at=p.end_at,
            is_active=p.is_active,
        )
        for p in promotions
    ]
