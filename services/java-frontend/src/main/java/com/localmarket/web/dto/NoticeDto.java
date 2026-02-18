package com.localmarket.web.dto;

import java.time.OffsetDateTime;

public record NoticeDto(
    Integer id,
    String title,
    OffsetDateTime start_at,
    OffsetDateTime end_at
) {}
