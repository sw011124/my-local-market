package com.localmarket.web.dto;

import java.time.OffsetDateTime;

public record OrderCreateRequestDto(
    String session_key,
    String customer_name,
    String customer_phone,
    String address_line1,
    String address_line2,
    String building,
    String unit_no,
    String dong_code,
    String apartment_name,
    Double latitude,
    Double longitude,
    OffsetDateTime requested_slot_start,
    Boolean allow_substitution,
    String delivery_request_note
) {}
