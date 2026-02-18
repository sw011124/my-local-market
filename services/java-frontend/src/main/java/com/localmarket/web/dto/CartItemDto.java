package com.localmarket.web.dto;

import java.math.BigDecimal;

public record CartItemDto(
    Integer id,
    Integer product_id,
    String product_name,
    Integer qty,
    BigDecimal unit_price,
    BigDecimal line_total,
    Integer stock_qty,
    Boolean is_weight_item
) {}
