import { apiRequest } from "../api/client";
import type { AuthCredentials, FarmerRegistration } from "../types/auth";
import type { AuthUser } from "../types/auth";

export interface AuthResponse {
  access_token: string;
  token_type: "Bearer";
  user: AuthUser;
}

export async function register(details: FarmerRegistration): Promise<AuthUser> {
  const result = await apiRequest<{ user: AuthUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(details),
  });
  return result.user;
}

export async function login(
  credentials: AuthCredentials,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function getCurrentUser(): Promise<AuthUser> {
  const result = await apiRequest<{ user: AuthUser }>("/auth/me");
  return result.user;
}
