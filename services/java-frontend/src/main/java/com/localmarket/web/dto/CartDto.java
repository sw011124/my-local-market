package com.localmarket.web.dto;

import java.math.BigDecimal;
import java.util.List;

public record CartDto(
    String session_key,
    List<CartItemDto> items,
    BigDecimal subtotal
) {}
