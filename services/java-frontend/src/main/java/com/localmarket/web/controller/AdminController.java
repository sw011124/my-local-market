package com.localmarket.web.controller;

import com.localmarket.web.client.MarketApiClient;
import java.util.List;
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
    String token = (String) session.getAttribute(ADMIN_TOKEN);
    if (token == null || token.isBlank()) {
      redirectAttributes.addFlashAttribute("errorMessage", "관리자 로그인이 필요합니다.");
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

  @PostMapping("/admin/orders/{orderId}/status")
  public String updateOrderStatus(
      @PathVariable Integer orderId,
      @RequestParam String status,
      @RequestParam(required = false) String reason,
      HttpSession session,
      RedirectAttributes redirectAttributes
  ) {
    String token = (String) session.getAttribute(ADMIN_TOKEN);
    if (token == null || token.isBlank()) {
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
}
