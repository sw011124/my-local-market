package com.localmarket.web.dto;

import java.time.OffsetDateTime;

public record CheckoutRequestDto(
    String session_key,
    String dong_code,
    String apartment_name,
    Double latitude,
    Double longitude,
    OffsetDateTime requested_slot_start
) {}
