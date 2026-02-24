from decimal import Decimal

from app.models import Cart, CartItem, Order, Product
from app.schemas import CartItemOut, CartOut, OrderItemOut, OrderOut, ProductOut
from app.services import effective_price, to_decimal


def product_to_schema(product: Product) -> ProductOut:
    return ProductOut(
        id=product.id,
        category_id=product.category_id,
        category_name=product.category.name if product.category else None,
        name=product.name,
        sku=product.sku,
        description=product.description,
        unit_label=product.unit_label,
        origin_country=product.origin_country,
        storage_method=product.storage_method,
        is_weight_item=product.is_weight_item,
        base_price=to_decimal(product.base_price),
        sale_price=to_decimal(product.sale_price) if product.sale_price is not None else None,
        effective_price=effective_price(product),
        status=product.status,
        stock_qty=product.stock_qty,
        max_per_order=product.max_per_order,
        pick_location=product.pick_location,
    )


def cart_to_schema(cart: Cart, items: list[CartItem]) -> CartOut:
    lines: list[CartItemOut] = []
    subtotal = Decimal('0')

    for item in items:
        line_total = to_decimal(item.unit_snapshot_price) * item.qty
        subtotal += line_total
        lines.append(
            CartItemOut(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product.name if item.product else '',
                qty=item.qty,
                unit_price=to_decimal(item.unit_snapshot_price),
                line_total=line_total,
                stock_qty=item.product.stock_qty if item.product else 0,
                is_weight_item=item.product.is_weight_item if item.product else False,
            )
        )

    return CartOut(session_key=cart.session_key, items=lines, subtotal=subtotal)


def order_to_schema(order: Order) -> OrderOut:
    return OrderOut(
        id=order.id,
        order_no=order.order_no,
        status=order.status,
        user_id=order.user_id,
        order_source=order.order_source,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        subtotal_estimated=to_decimal(order.subtotal_estimated),
        delivery_fee=to_decimal(order.delivery_fee),
        total_estimated=to_decimal(order.total_estimated),
        total_final=to_decimal(order.total_final) if order.total_final is not None else None,
        allow_substitution=order.allow_substitution,
        ordered_at=order.ordered_at,
        requested_slot_start=order.requested_slot_start,
        items=[
            OrderItemOut(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product_name_snapshot,
                qty_ordered=item.qty_ordered,
                qty_fulfilled=item.qty_fulfilled,
                unit_price_estimated=to_decimal(item.unit_price_estimated),
                line_estimated=to_decimal(item.line_estimated),
                is_weight_item=item.is_weight_item,
            )
            for item in order.items
        ],
    )
