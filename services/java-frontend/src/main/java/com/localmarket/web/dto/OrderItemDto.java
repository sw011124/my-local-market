package com.localmarket.web.dto;

import java.math.BigDecimal;

public record OrderItemDto(
    Integer id,
    Integer product_id,
    String product_name,
    Integer qty_ordered,
    Integer qty_fulfilled,
    BigDecimal unit_price_estimated,
    BigDecimal line_estimated,
    Boolean is_weight_item
) {}
