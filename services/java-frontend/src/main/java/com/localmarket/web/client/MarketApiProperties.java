package com.localmarket.web.client;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "market.api")
public record MarketApiProperties(String baseUrl) {}
