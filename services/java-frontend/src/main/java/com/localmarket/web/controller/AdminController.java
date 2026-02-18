package com.localmarket.web.controller;

import com.localmarket.web.client.MarketApiClient;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import jakarta.servlet.http.HttpSession;

@Controller
public class AdminController {

  private static final String ADMIN_TOKEN = "ADMIN_TOKEN";
  private final MarketApiClient apiClient;

  public AdminController(MarketApiClient apiClient) {
    this.apiClient = apiClient;
  }

  @GetMapping("/admin/login")
  public String loginPage() {
    return "admin/login";
  }

  @PostMapping("/admin/login")
  public String login(
      @RequestParam String username,
      @RequestParam String password,
      HttpSession session,
      RedirectAttributes redirectAttributes
  ) {
    try {
      var login = apiClient.adminLogin(username, password);
      session.setAttribute(ADMIN_TOKEN, login.access_token());
      return "redirect:/admin/orders";
    } catch (HttpStatusCodeException ex) {
      redirectAttributes.addFlashAttribute("errorMessage", "로그인에 실패했습니다.");
      return "redirect:/admin/login";
    }
  }

  @GetMapping("/admin/orders")
  public String orders(HttpSession session, Model model, RedirectAttributes redirectAttributes) {
    String token = ensureToken(session, redirectAttributes);
    if (token == null) {
      return "redirect:/admin/login";
    }

    try {
      model.addAttribute("orders", apiClient.getAdminOrders(token));
      model.addAttribute("statuses", List.of("RECEIVED", "PICKING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELED"));
      return "admin/orders";
    } catch (HttpStatusCodeException ex) {
      session.removeAttribute(ADMIN_TOKEN);
      redirectAttributes.addFlashAttribute("errorMessage", "세션이 만료되었습니다. 다시 로그인해 주세요.");
      return "redirect:/admin/login";
    }
  }

  @GetMapping("/admin/orders/{orderId}")
  public String orderDetail(
      @PathVariable Integer orderId,
      HttpSession session,
      Model model,
      RedirectAttributes redirectAttributes
  ) {
    String token = ensureToken(session, redirectAttributes);
    if (token == null) {
      return "redirect:/admin/login";
    }

    try {
      model.addAttribute("order", apiClient.getAdminOrder(token, orderId));
      return "admin/order-detail";
    } catch (HttpStatusCodeException ex) {
      redirectAttributes.addFlashAttribute("errorMessage", "주문 상세 조회에 실패했습니다.");
      return "redirect:/admin/orders";
    }
  }

  @PostMapping("/admin/orders/{orderId}/status")
  public String updateOrderStatus(
      @PathVariable Integer orderId,
      @RequestParam String status,
      @RequestParam(required = false) String reason,
      HttpSession session,
      RedirectAttributes redirectAttributes
  ) {
    String token = ensureToken(session, redirectAttributes);
    if (token == null) {
      return "redirect:/admin/login";
    }

    try {
      apiClient.updateAdminOrderStatus(token, orderId, status, reason);
      redirectAttributes.addFlashAttribute("successMessage", "주문 상태를 변경했습니다.");
    } catch (HttpStatusCodeException ex) {
      redirectAttributes.addFlashAttribute("errorMessage", "상태 변경에 실패했습니다.");
    }

    return "redirect:/admin/orders";
  }

  @PostMapping("/admin/orders/{orderId}/shortage")
  public String applyShortageAction(
      @PathVariable Integer orderId,
      @RequestParam Integer orderItemId,
      @RequestParam String action,
      @RequestParam(required = false) Integer fulfilledQty,
      @RequestParam(required = false) Integer substitutionProductId,
      @RequestParam(required = false) Integer substitutionQty,
      @RequestParam(required = false) String reason,
      HttpSession session,
      RedirectAttributes redirectAttributes
  ) {
    String token = ensureToken(session, redirectAttributes);
    if (token == null) {
      return "redirect:/admin/login";
    }

    try {
      apiClient.applyShortageAction(
          token,
          orderId,
          orderItemId,
          action,
          fulfilledQty,
          substitutionProductId,
          substitutionQty,
          reason
      );
      redirectAttributes.addFlashAttribute("successMessage", "부분품절/대체 처리를 적용했습니다.");
    } catch (HttpStatusCodeException ex) {
      redirectAttributes.addFlashAttribute("errorMessage", "부분품절 처리에 실패했습니다.");
    }

    return "redirect:/admin/orders/" + orderId;
  }

  @PostMapping("/admin/orders/{orderId}/refunds")
  public String createRefund(
      @PathVariable Integer orderId,
      @RequestParam BigDecimal amount,
      @RequestParam String reason,
      @RequestParam(defaultValue = "COD_ADJUSTMENT") String method,
      HttpSession session,
      RedirectAttributes redirectAttributes
  ) {
    String token = ensureToken(session, redirectAttributes);
    if (token == null) {
      return "redirect:/admin/login";
    }

    try {
      apiClient.createAdminRefund(token, orderId, amount, reason, method);
      redirectAttributes.addFlashAttribute("successMessage", "환불을 등록했습니다.");
    } catch (HttpStatusCodeException ex) {
      redirectAttributes.addFlashAttribute("errorMessage", "환불 등록에 실패했습니다.");
    }

    return "redirect:/admin/orders/" + orderId;
  }

  @GetMapping("/admin/content")
  public String contentPage(HttpSession session, Model model, RedirectAttributes redirectAttributes) {
    String token = ensureToken(session, redirectAttributes);
    if (token == null) {
      return "redirect:/admin/login";
    }

    try {
      model.addAttribute("promotions", apiClient.getAdminPromotions(token));
      model.addAttribute("banners", apiClient.getAdminBanners(token));
      model.addAttribute("notices", apiClient.getAdminNotices(token));
      return "admin/content";
    } catch (HttpStatusCodeException ex) {
      redirectAttributes.addFlashAttribute("errorMessage", "콘텐츠 조회에 실패했습니다.");
      return "redirect:/admin/orders";
    }
  }

  @PostMapping("/admin/content/promotions")
  public String createPromotion(
      @RequestParam String title,
      @RequestParam(defaultValue = "WEEKLY") String promoType,
      @RequestParam String startAt,
      @RequestParam String endAt,
      @RequestParam(required = false) String bannerImageUrl,
      @RequestParam(required = false) String productIds,
      @RequestParam(required = false) BigDecimal promoPrice,
      HttpSession session,
      RedirectAttributes redirectAttributes
  ) {
    String token = ensureToken(session, redirectAttributes);
    if (token == null) {
      return "redirect:/admin/login";
    }

    try {
      apiClient.createAdminPromotion(
          token,
          title,
          promoType,
          parseOffsetDateTime(startAt),
          parseOffsetDateTime(endAt),
          bannerImageUrl,
          parseProductIds(productIds),
          promoPrice
      );
      redirectAttributes.addFlashAttribute("successMessage", "행사를 등록했습니다.");
    } catch (Exception ex) {
      redirectAttributes.addFlashAttribute("errorMessage", "행사 등록에 실패했습니다.");
    }

    return "redirect:/admin/content";
  }

  @PostMapping("/admin/content/banners")
  public String createBanner(
      @RequestParam String title,
      @RequestParam String imageUrl,
      @RequestParam(defaultValue = "PROMOTION") String linkType,
      @RequestParam(required = false) String linkTarget,
      @RequestParam(defaultValue = "0") Integer displayOrder,
      @RequestParam String startAt,
      @RequestParam String endAt,
      HttpSession session,
      RedirectAttributes redirectAttributes
  ) {
    String token = ensureToken(session, redirectAttributes);
    if (token == null) {
      return "redirect:/admin/login";
    }

    try {
      apiClient.createAdminBanner(
          token,
          title,
          imageUrl,
          linkType,
          linkTarget,
          displayOrder,
          parseOffsetDateTime(startAt),
          parseOffsetDateTime(endAt)
      );
      redirectAttributes.addFlashAttribute("successMessage", "배너를 등록했습니다.");
    } catch (Exception ex) {
      redirectAttributes.addFlashAttribute("errorMessage", "배너 등록에 실패했습니다.");
    }

    return "redirect:/admin/content";
  }

  @PostMapping("/admin/content/notices")
  public String createNotice(
      @RequestParam String title,
      @RequestParam String body,
      @RequestParam String startAt,
      @RequestParam String endAt,
      @RequestParam(required = false, defaultValue = "false") boolean pinned,
      HttpSession session,
      RedirectAttributes redirectAttributes
  ) {
    String token = ensureToken(session, redirectAttributes);
    if (token == null) {
      return "redirect:/admin/login";
    }

    try {
      apiClient.createAdminNotice(
          token,
          title,
          body,
          parseOffsetDateTime(startAt),
          parseOffsetDateTime(endAt),
          pinned
      );
      redirectAttributes.addFlashAttribute("successMessage", "공지를 등록했습니다.");
    } catch (Exception ex) {
      redirectAttributes.addFlashAttribute("errorMessage", "공지 등록에 실패했습니다.");
    }

    return "redirect:/admin/content";
  }

  private String ensureToken(HttpSession session, RedirectAttributes redirectAttributes) {
    String token = (String) session.getAttribute(ADMIN_TOKEN);
    if (token == null || token.isBlank()) {
      redirectAttributes.addFlashAttribute("errorMessage", "관리자 로그인이 필요합니다.");
      return null;
    }
    return token;
  }

  private OffsetDateTime parseOffsetDateTime(String value) {
    return LocalDateTime.parse(value).atZone(ZoneId.systemDefault()).toOffsetDateTime();
  }

  private List<Integer> parseProductIds(String csv) {
    if (csv == null || csv.isBlank()) {
      return Collections.emptyList();
    }

    try {
      return Arrays.stream(csv.split(","))
          .map(String::trim)
          .filter(s -> !s.isBlank())
          .map(Integer::valueOf)
          .collect(Collectors.toList());
    } catch (Exception ex) {
      return Collections.emptyList();
    }
  }
}
