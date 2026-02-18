package com.localmarket.web.dto;

import java.time.OffsetDateTime;

public record BannerDto(
    Integer id,
    String title,
    String image_url,
    String link_type,
    String link_target,
    Integer display_order,
    Boolean is_active,
    OffsetDateTime start_at,
    OffsetDateTime end_at
) {}
