package com.localmarket.web.controller;

import com.localmarket.web.client.MarketApiClient;
import com.localmarket.web.dto.CartDto;
import com.localmarket.web.dto.CheckoutQuoteResponseDto;
import com.localmarket.web.dto.CheckoutRequestDto;
import com.localmarket.web.dto.OrderCreateRequestDto;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Controller
public class CustomerController {

  private static final String SESSION_COOKIE = "MARKET_SESSION";
  private static final String DEFAULT_DONG = "1535011000";
  private final MarketApiClient apiClient;

  public CustomerController(MarketApiClient apiClient) {
    this.apiClient = apiClient;
  }

  @GetMapping("/")
  public String home(Model model) {
    var home = apiClient.getHome();
    model.addAttribute("categories", home.categories());
    model.addAttribute("featuredProducts", home.featured_products());
    model.addAttribute("promotions", home.promotions());
    model.addAttribute("notices", home.notices());
    return "home";
  }

  @GetMapping("/products")
  public String products(
      @RequestParam(required = false) Integer categoryId,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Integer minPrice,
      @RequestParam(required = false) Integer maxPrice,
      @RequestParam(required = false) Boolean promo,
      @RequestParam(defaultValue = "popular") String sort,
      Model model
  ) {
    var products = apiClient.getProducts(categoryId, q, minPrice, maxPrice, promo, sort);
    var categories = apiClient.getHome().categories();

    model.addAttribute("products", products);
    model.addAttribute("categories", categories);
    model.addAttribute("selectedCategoryId", categoryId);
    model.addAttribute("q", q);
    model.addAttribute("sort", sort);
    return "products";
  }

  @GetMapping("/products/{id}")
  public String productDetail(@PathVariable Integer id, Model model) {
    model.addAttribute("product", apiClient.getProduct(id));
    return "product-detail";
  }

  @PostMapping("/cart/items")
  public String addCartItem(
      @RequestParam Integer productId,
      @RequestParam Integer qty,
      HttpServletRequest request,
      HttpServletResponse response,
      RedirectAttributes redirectAttributes
  ) {
    String sessionKey = resolveSessionKey(request, response);
    try {
      apiClient.addCartItem(sessionKey, productId, qty);
      redirectAttributes.addFlashAttribute("successMessage", "장바구니에 담았습니다.");
    } catch (HttpStatusCodeException ex) {
      redirectAttributes.addFlashAttribute("errorMessage", "장바구니 추가에 실패했습니다.");
    }
    return "redirect:/cart";
  }

  @GetMapping("/cart")
  public String cart(HttpServletRequest request, HttpServletResponse response, Model model) {
    String sessionKey = resolveSessionKey(request, response);
    CartDto cart = apiClient.getCart(sessionKey);
    model.addAttribute("cart", cart);
    model.addAttribute("dongCode", DEFAULT_DONG);
    return "cart";
  }

  @PostMapping("/cart/items/{itemId}/qty")
  public String updateCartQty(
      @PathVariable Integer itemId,
      @RequestParam Integer qty,
      HttpServletRequest request,
      HttpServletResponse response,
      RedirectAttributes redirectAttributes
  ) {
    String sessionKey = resolveSessionKey(request, response);
    try {
      apiClient.updateCartItem(sessionKey, itemId, qty);
    } catch (HttpStatusCodeException ex) {
      redirectAttributes.addFlashAttribute("errorMessage", "수량 변경에 실패했습니다.");
    }
    return "redirect:/cart";
  }

  @PostMapping("/cart/items/{itemId}/delete")
  public String deleteCartItem(
      @PathVariable Integer itemId,
      HttpServletRequest request,
      HttpServletResponse response
  ) {
    String sessionKey = resolveSessionKey(request, response);
    apiClient.deleteCartItem(sessionKey, itemId);
    return "redirect:/cart";
  }

  @GetMapping("/checkout")
  public String checkout(
      @RequestParam(required = false, defaultValue = DEFAULT_DONG) String dongCode,
      HttpServletRequest request,
      HttpServletResponse response,
      Model model
  ) {
    String sessionKey = resolveSessionKey(request, response);
    CartDto cart = apiClient.getCart(sessionKey);

    CheckoutQuoteResponseDto quote = apiClient.quote(new CheckoutRequestDto(
        sessionKey,
        dongCode,
        null,
        null,
        null,
        null
    ));

    model.addAttribute("cart", cart);
    model.addAttribute("quote", quote);
    model.addAttribute("dongCode", dongCode);
    return "checkout";
  }

  @PostMapping("/checkout/submit")
  public String submitCheckout(
      @RequestParam String customerName,
      @RequestParam String customerPhone,
      @RequestParam String addressLine1,
      @RequestParam(required = false) String addressLine2,
      @RequestParam(required = false) String building,
      @RequestParam(required = false) String unitNo,
      @RequestParam(defaultValue = DEFAULT_DONG) String dongCode,
      @RequestParam(required = false) String apartmentName,
      @RequestParam(required = false) String requestedSlot,
      @RequestParam(required = false, defaultValue = "false") boolean allowSubstitution,
      @RequestParam(required = false) String deliveryRequestNote,
      HttpServletRequest request,
      HttpServletResponse response,
      RedirectAttributes redirectAttributes
  ) {
    String sessionKey = resolveSessionKey(request, response);

    OffsetDateTime slot = null;
    if (requestedSlot != null && !requestedSlot.isBlank()) {
      slot = LocalDateTime.parse(requestedSlot).atZone(ZoneId.systemDefault()).toOffsetDateTime();
    }

    try {
      var order = apiClient.createOrder(new OrderCreateRequestDto(
          sessionKey,
          customerName,
          customerPhone,
          addressLine1,
          addressLine2,
          building,
          unitNo,
          dongCode,
          apartmentName,
          null,
          null,
          slot,
          allowSubstitution,
          deliveryRequestNote
      ));
      return "redirect:/orders/" + order.order_no() + "?phone=" + customerPhone;
    } catch (HttpStatusCodeException ex) {
      redirectAttributes.addFlashAttribute("errorMessage", "주문 생성에 실패했습니다. 장바구니와 배송 정보를 다시 확인해 주세요.");
      return "redirect:/checkout?dongCode=" + dongCode;
    }
  }

  @GetMapping("/orders/lookup")
  public String orderLookupPage() {
    return "order-lookup";
  }

  @PostMapping("/orders/lookup")
  public String orderLookupSubmit(
      @RequestParam String orderNo,
      @RequestParam String phone
  ) {
    return "redirect:/orders/" + orderNo + "?phone=" + phone;
  }

  @GetMapping("/orders/{orderNo}")
  public String orderDetail(
      @PathVariable String orderNo,
      @RequestParam String phone,
      Model model,
      RedirectAttributes redirectAttributes
  ) {
    try {
      var order = apiClient.getOrder(orderNo, phone);
      model.addAttribute("order", order);
      model.addAttribute("phone", phone);
      return "order-detail";
    } catch (HttpStatusCodeException ex) {
      redirectAttributes.addFlashAttribute("errorMessage", "주문을 찾을 수 없습니다.");
      return "redirect:/orders/lookup";
    }
  }

  @PostMapping("/orders/{orderNo}/cancel")
  public String cancelOrder(
      @PathVariable String orderNo,
      @RequestParam String phone,
      @RequestParam(defaultValue = "고객 요청 취소") String reason,
      RedirectAttributes redirectAttributes
  ) {
    try {
      apiClient.cancelOrder(orderNo, phone, reason);
      redirectAttributes.addFlashAttribute("successMessage", "취소 요청이 처리되었습니다.");
    } catch (HttpStatusCodeException ex) {
      redirectAttributes.addFlashAttribute("errorMessage", "취소가 불가능한 주문 상태입니다.");
    }
    return "redirect:/orders/" + orderNo + "?phone=" + phone;
  }

  private String resolveSessionKey(HttpServletRequest request, HttpServletResponse response) {
    if (request.getCookies() != null) {
      for (Cookie cookie : request.getCookies()) {
        if (SESSION_COOKIE.equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
          return cookie.getValue();
        }
      }
    }

    String sessionKey = UUID.randomUUID().toString();
    Cookie cookie = new Cookie(SESSION_COOKIE, sessionKey);
    cookie.setHttpOnly(true);
    cookie.setPath("/");
    cookie.setMaxAge(60 * 60 * 24 * 30);
    response.addCookie(cookie);
    return sessionKey;
  }
}
