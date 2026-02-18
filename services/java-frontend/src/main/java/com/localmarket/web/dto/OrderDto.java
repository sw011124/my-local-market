package com.localmarket.web.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record OrderDto(
    Integer id,
    String order_no,
    String status,
    String customer_name,
    String customer_phone,
    BigDecimal subtotal_estimated,
    BigDecimal delivery_fee,
    BigDecimal total_estimated,
    BigDecimal total_final,
    Boolean allow_substitution,
    OffsetDateTime ordered_at,
    OffsetDateTime requested_slot_start,
    List<OrderItemDto> items
) {}
