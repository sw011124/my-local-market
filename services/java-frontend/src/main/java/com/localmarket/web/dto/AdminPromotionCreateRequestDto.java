package com.localmarket.web.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record AdminPromotionCreateRequestDto(
    String title,
    String promo_type,
    OffsetDateTime start_at,
    OffsetDateTime end_at,
    Boolean is_active,
    String banner_image_url,
    List<Integer> product_ids,
    BigDecimal promo_price
) {}
