package com.localmarket.web.dto;

import java.time.OffsetDateTime;

public record AdminNoticeDto(
    Integer id,
    String title,
    String body,
    OffsetDateTime start_at,
    OffsetDateTime end_at,
    Boolean is_pinned,
    Boolean is_active
) {}
