"use client";

const ADMIN_TOKEN_STORAGE_KEY = "MARKET_ADMIN_TOKEN";

export function readAdminToken(): string | null {
  return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
}

export function saveAdminToken(token: string): void {
  window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
}

export function clearAdminToken(): void {
  window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
}
