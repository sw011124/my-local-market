package com.localmarket.web.dto;

import java.math.BigDecimal;

public record AdminRefundCreateRequestDto(
    BigDecimal amount,
    String reason,
    String method
) {}
