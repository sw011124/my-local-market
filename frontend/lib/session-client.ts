"use client";

import { getCart } from "@/lib/market-api";

const SESSION_STORAGE_KEY = "MARKET_SESSION_KEY";

export async function ensureMarketSessionKey(): Promise<string> {
  const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (stored && stored.trim()) {
    return stored;
  }

  const cart = await getCart();
  window.localStorage.setItem(SESSION_STORAGE_KEY, cart.session_key);
  return cart.session_key;
}

export function readMarketSessionKey(): string | null {
  return window.localStorage.getItem(SESSION_STORAGE_KEY);
}

export function saveMarketSessionKey(sessionKey: string): void {
  window.localStorage.setItem(SESSION_STORAGE_KEY, sessionKey);
}
