import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { AuthUser } from "../types/auth";

const ACCESS_TOKEN_KEY = "smart-water-access-token";
const AUTH_USER_KEY = "smart-water-auth-user";

function webStorage(): Storage {
  if (typeof window === "undefined") {
    throw new Error("Browser storage is unavailable.");
  }
  return window.sessionStorage;
}

export function storeAccessToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    webStorage().setItem(ACCESS_TOKEN_KEY, token);
    return Promise.resolve();
  }
  return SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export function readAccessToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return Promise.resolve(webStorage().getItem(ACCESS_TOKEN_KEY));
  }
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export function clearAccessToken(): Promise<void> {
  if (Platform.OS === "web") {
    webStorage().removeItem(ACCESS_TOKEN_KEY);
    return Promise.resolve();
  }
  return SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}

export async function storeAuthSession(
  token: string,
  user: AuthUser,
): Promise<void> {
  try {
    if (Platform.OS === "web") {
      webStorage().setItem(ACCESS_TOKEN_KEY, token);
      webStorage().setItem(AUTH_USER_KEY, JSON.stringify(user));
      return;
    }
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));
  } catch (error) {
    await clearAuthSession().catch(() => undefined);
    throw error;
  }
}

export async function readStoredUser(): Promise<AuthUser | null> {
  if (Platform.OS === "web") {
    const value = webStorage().getItem(AUTH_USER_KEY);
    if (!value) return null;
    try {
      return JSON.parse(value) as AuthUser;
    } catch {
      webStorage().removeItem(AUTH_USER_KEY);
      return null;
    }
  }
  const value = await SecureStore.getItemAsync(AUTH_USER_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as AuthUser;
  } catch {
    await SecureStore.deleteItemAsync(AUTH_USER_KEY);
    return null;
  }
}

export async function clearAuthSession(): Promise<void> {
  if (Platform.OS === "web") {
    webStorage().removeItem(ACCESS_TOKEN_KEY);
    webStorage().removeItem(AUTH_USER_KEY);
    return;
  }
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(AUTH_USER_KEY),
  ]);
}
