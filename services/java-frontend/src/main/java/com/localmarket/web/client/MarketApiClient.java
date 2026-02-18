package com.localmarket.web.client;

import com.localmarket.web.dto.AdminLoginRequestDto;
import com.localmarket.web.dto.AdminLoginResponseDto;
import com.localmarket.web.dto.AdminNoticeCreateRequestDto;
import com.localmarket.web.dto.AdminNoticeDto;
import com.localmarket.web.dto.AdminOrderStatusUpdateDto;
import com.localmarket.web.dto.AdminPromotionCreateRequestDto;
import com.localmarket.web.dto.AdminPromotionDto;
import com.localmarket.web.dto.AdminRefundCreateRequestDto;
import com.localmarket.web.dto.AdminShortageActionRequestDto;
import com.localmarket.web.dto.BannerCreateRequestDto;
import com.localmarket.web.dto.BannerDto;
import com.localmarket.web.dto.CancelRequestDto;
import com.localmarket.web.dto.CartDto;
import com.localmarket.web.dto.CheckoutQuoteResponseDto;
import com.localmarket.web.dto.CheckoutRequestDto;
import com.localmarket.web.dto.HomeResponseDto;
import com.localmarket.web.dto.OrderCreateRequestDto;
import com.localmarket.web.dto.OrderDto;
import com.localmarket.web.dto.ProductDto;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class MarketApiClient {

  private final RestClient restClient;

  public MarketApiClient(RestClient.Builder restClientBuilder, MarketApiProperties properties) {
    this.restClient = restClientBuilder.baseUrl(properties.baseUrl()).build();
  }

  public HomeResponseDto getHome() {
    return restClient.get()
        .uri("/public/home")
        .retrieve()
        .body(HomeResponseDto.class);
  }

  public List<ProductDto> getProducts(
      Integer categoryId,
      String q,
      Integer minPrice,
      Integer maxPrice,
      Boolean promo,
      String sort
  ) {
    return restClient.get()
        .uri(uriBuilder -> {
          var builder = uriBuilder.path("/public/products");
          if (categoryId != null) {
            builder.queryParam("category_id", categoryId);
          }
          if (q != null && !q.isBlank()) {
            builder.queryParam("q", q);
          }
          if (minPrice != null) {
            builder.queryParam("min_price", minPrice);
          }
          if (maxPrice != null) {
            builder.queryParam("max_price", maxPrice);
          }
          if (promo != null) {
            builder.queryParam("promo", promo);
          }
          if (sort != null && !sort.isBlank()) {
            builder.queryParam("sort", sort);
          }
          return builder.build();
        })
        .retrieve()
        .body(new ParameterizedTypeReference<List<ProductDto>>() {});
  }

  public ProductDto getProduct(Integer productId) {
    return restClient.get()
        .uri("/public/products/{id}", productId)
        .retrieve()
        .body(ProductDto.class);
  }

  public CartDto getCart(String sessionKey) {
    return restClient.get()
        .uri(uriBuilder -> uriBuilder.path("/cart").queryParam("session_key", sessionKey).build())
        .retrieve()
        .body(CartDto.class);
  }

  public CartDto addCartItem(String sessionKey, Integer productId, Integer qty) {
    return restClient.post()
        .uri(uriBuilder -> uriBuilder.path("/cart/items").queryParam("session_key", sessionKey).build())
        .body(Map.of("product_id", productId, "qty", qty))
        .retrieve()
        .body(CartDto.class);
  }

  public CartDto updateCartItem(String sessionKey, Integer itemId, Integer qty) {
    return restClient.patch()
        .uri(uriBuilder -> uriBuilder.path("/cart/items/{itemId}").queryParam("session_key", sessionKey).build(itemId))
        .body(Map.of("qty", qty))
        .retrieve()
        .body(CartDto.class);
  }

  public CartDto deleteCartItem(String sessionKey, Integer itemId) {
    return restClient.delete()
        .uri(uriBuilder -> uriBuilder.path("/cart/items/{itemId}").queryParam("session_key", sessionKey).build(itemId))
        .retrieve()
        .body(CartDto.class);
  }

  public CheckoutQuoteResponseDto quote(CheckoutRequestDto payload) {
    return restClient.post()
        .uri("/checkout/quote")
        .body(payload)
        .retrieve()
        .body(CheckoutQuoteResponseDto.class);
  }

  public OrderDto createOrder(OrderCreateRequestDto payload) {
    return restClient.post()
        .uri("/orders")
        .body(payload)
        .retrieve()
        .body(OrderDto.class);
  }

  public OrderDto lookupOrder(String orderNo, String phone) {
    return restClient.get()
        .uri(uriBuilder -> uriBuilder.path("/orders/lookup").queryParam("order_no", orderNo).queryParam("phone", phone).build())
        .retrieve()
        .body(OrderDto.class);
  }

  public OrderDto getOrder(String orderNo, String phone) {
    return restClient.get()
        .uri(uriBuilder -> uriBuilder.path("/orders/{orderNo}").queryParam("phone", phone).build(orderNo))
        .retrieve()
        .body(OrderDto.class);
  }

  public Map<String, Object> cancelOrder(String orderNo, String phone, String reason) {
    return restClient.post()
        .uri(uriBuilder -> uriBuilder.path("/orders/{orderNo}/cancel-requests").queryParam("phone", phone).build(orderNo))
        .body(new CancelRequestDto(reason))
        .retrieve()
        .body(new ParameterizedTypeReference<Map<String, Object>>() {});
  }

  public AdminLoginResponseDto adminLogin(String username, String password) {
    return restClient.post()
        .uri(uriBuilder -> uriBuilder.path("/admin/auth/login").queryParam("username", username).queryParam("password", password).build())
        .retrieve()
        .body(AdminLoginResponseDto.class);
  }

  public List<OrderDto> getAdminOrders(String adminToken) {
    return restClient.get()
        .uri("/admin/orders")
        .header("X-Admin-Token", adminToken)
        .retrieve()
        .body(new ParameterizedTypeReference<List<OrderDto>>() {});
  }

  public OrderDto getAdminOrder(String adminToken, Integer orderId) {
    return restClient.get()
        .uri("/admin/orders/{orderId}", orderId)
        .header("X-Admin-Token", adminToken)
        .retrieve()
        .body(OrderDto.class);
  }

  public OrderDto updateAdminOrderStatus(String adminToken, Integer orderId, String status, String reason) {
    return restClient.patch()
        .uri("/admin/orders/{orderId}/status", orderId)
        .header("X-Admin-Token", adminToken)
        .body(new AdminOrderStatusUpdateDto(status, reason))
        .retrieve()
        .body(OrderDto.class);
  }

  public Map<String, Object> applyShortageAction(
      String adminToken,
      Integer orderId,
      Integer orderItemId,
      String action,
      Integer fulfilledQty,
      Integer substitutionProductId,
      Integer substitutionQty,
      String reason
  ) {
    return restClient.post()
        .uri("/admin/orders/{orderId}/shortage-actions", orderId)
        .header("X-Admin-Token", adminToken)
        .body(new AdminShortageActionRequestDto(
            orderItemId,
            action,
            fulfilledQty,
            substitutionProductId,
            substitutionQty,
            reason
        ))
        .retrieve()
        .body(new ParameterizedTypeReference<Map<String, Object>>() {});
  }

  public Map<String, Object> createAdminRefund(
      String adminToken,
      Integer orderId,
      BigDecimal amount,
      String reason,
      String method
  ) {
    return restClient.post()
        .uri("/admin/orders/{orderId}/refunds", orderId)
        .header("X-Admin-Token", adminToken)
        .body(new AdminRefundCreateRequestDto(amount, reason, method))
        .retrieve()
        .body(new ParameterizedTypeReference<Map<String, Object>>() {});
  }

  public List<AdminPromotionDto> getAdminPromotions(String adminToken) {
    return restClient.get()
        .uri("/admin/promotions")
        .header("X-Admin-Token", adminToken)
        .retrieve()
        .body(new ParameterizedTypeReference<List<AdminPromotionDto>>() {});
  }

  public AdminPromotionDto createAdminPromotion(
      String adminToken,
      String title,
      String promoType,
      OffsetDateTime startAt,
      OffsetDateTime endAt,
      String bannerImageUrl,
      List<Integer> productIds,
      BigDecimal promoPrice
  ) {
    return restClient.post()
        .uri("/admin/promotions")
        .header("X-Admin-Token", adminToken)
        .body(new AdminPromotionCreateRequestDto(
            title,
            promoType,
            startAt,
            endAt,
            true,
            bannerImageUrl,
            productIds,
            promoPrice
        ))
        .retrieve()
        .body(AdminPromotionDto.class);
  }

  public List<BannerDto> getAdminBanners(String adminToken) {
    return restClient.get()
        .uri("/admin/banners")
        .header("X-Admin-Token", adminToken)
        .retrieve()
        .body(new ParameterizedTypeReference<List<BannerDto>>() {});
  }

  public BannerDto createAdminBanner(
      String adminToken,
      String title,
      String imageUrl,
      String linkType,
      String linkTarget,
      Integer displayOrder,
      OffsetDateTime startAt,
      OffsetDateTime endAt
  ) {
    return restClient.post()
        .uri("/admin/banners")
        .header("X-Admin-Token", adminToken)
        .body(new BannerCreateRequestDto(
            title,
            imageUrl,
            linkType,
            linkTarget,
            displayOrder,
            true,
            startAt,
            endAt
        ))
        .retrieve()
        .body(BannerDto.class);
  }

  public List<AdminNoticeDto> getAdminNotices(String adminToken) {
    return restClient.get()
        .uri("/admin/notices")
        .header("X-Admin-Token", adminToken)
        .retrieve()
        .body(new ParameterizedTypeReference<List<AdminNoticeDto>>() {});
  }

  public AdminNoticeDto createAdminNotice(
      String adminToken,
      String title,
      String body,
      OffsetDateTime startAt,
      OffsetDateTime endAt,
      boolean pinned
  ) {
    return restClient.post()
        .uri("/admin/notices")
        .header("X-Admin-Token", adminToken)
        .body(new AdminNoticeCreateRequestDto(title, body, startAt, endAt, pinned, true))
        .retrieve()
        .body(AdminNoticeDto.class);
  }
}
