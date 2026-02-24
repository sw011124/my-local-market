"use client";

const USER_ACCESS_TOKEN_STORAGE_KEY = "MARKET_USER_ACCESS_TOKEN";
const USER_REFRESH_TOKEN_STORAGE_KEY = "MARKET_USER_REFRESH_TOKEN";

export function readUserAccessToken(): string | null {
  return window.localStorage.getItem(USER_ACCESS_TOKEN_STORAGE_KEY);
}

export function readUserRefreshToken(): string | null {
  return window.localStorage.getItem(USER_REFRESH_TOKEN_STORAGE_KEY);
}

export function saveUserTokens(accessToken: string, refreshToken: string): void {
  window.localStorage.setItem(USER_ACCESS_TOKEN_STORAGE_KEY, accessToken);
  window.localStorage.setItem(USER_REFRESH_TOKEN_STORAGE_KEY, refreshToken);
}

export function clearUserTokens(): void {
  window.localStorage.removeItem(USER_ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(USER_REFRESH_TOKEN_STORAGE_KEY);
}

