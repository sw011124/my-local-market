package com.localmarket.web.dto;

public record AdminShortageActionRequestDto(
    Integer order_item_id,
    String action,
    Integer fulfilled_qty,
    Integer substitution_product_id,
    Integer substitution_qty,
    String reason
) {}
