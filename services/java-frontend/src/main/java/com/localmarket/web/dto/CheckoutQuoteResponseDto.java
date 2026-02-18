package com.localmarket.web.dto;

import java.math.BigDecimal;
import java.util.List;

public record CheckoutQuoteResponseDto(
    Boolean valid,
    List<String> errors,
    BigDecimal subtotal,
    BigDecimal delivery_fee,
    BigDecimal total_estimated,
    BigDecimal min_order_amount,
    BigDecimal free_delivery_threshold
) {}
