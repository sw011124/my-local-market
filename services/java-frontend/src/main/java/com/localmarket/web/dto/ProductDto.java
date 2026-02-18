package com.localmarket.web.dto;

import java.math.BigDecimal;

public record ProductDto(
    Integer id,
    Integer category_id,
    String category_name,
    String name,
    String sku,
    String description,
    String unit_label,
    String origin_country,
    String storage_method,
    Boolean is_weight_item,
    BigDecimal base_price,
    BigDecimal sale_price,
    BigDecimal effective_price,
    String status,
    Integer stock_qty,
    Integer max_per_order
) {}
