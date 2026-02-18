package com.localmarket.web.dto;

import java.time.OffsetDateTime;

public record PromotionDto(
    Integer id,
    String title,
    String promo_type,
    OffsetDateTime start_at,
    OffsetDateTime end_at,
    Boolean is_active
) {}
