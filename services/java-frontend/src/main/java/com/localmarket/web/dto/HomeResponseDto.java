package com.localmarket.web.dto;

import java.util.List;

public record HomeResponseDto(
    List<CategoryDto> categories,
    List<ProductDto> featured_products,
    List<PromotionDto> promotions,
    List<NoticeDto> notices
) {}
