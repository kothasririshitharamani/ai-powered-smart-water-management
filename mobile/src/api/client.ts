import { translate } from "../i18n";
import { clearAuthSession, readAccessToken } from "../services/tokenStorage";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  if (!baseUrl) {
    throw new ApiError(translate("networkError"), 0);
  }

  const token = accessToken ?? (await readAccessToken());
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(translate("networkError"), 0);
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (
      (response.status === 401 || response.status === 403) &&
      path !== "/auth/login"
    ) {
      if (unauthorizedHandler) unauthorizedHandler();
      else await clearAuthSession().catch(() => undefined);
    }
    const isWaterEndpoint = path.startsWith("/water-");
    const messageKey =
      response.status === 400
        ? isWaterEndpoint
          ? "invalidWaterAmount"
          : "invalidRequest"
        : response.status === 401
          ? path === "/auth/login"
            ? "invalidCredentials"
            : "sessionExpired"
          : response.status === 403
            ? "sessionExpired"
            : response.status === 409
              ? path === "/water-usage"
                ? "waterOverspend"
                : path === "/water-budget"
                  ? "waterBudgetConflict"
                  : "duplicateAccount"
              : response.status >= 500
                ? "serverError"
                : "requestFailed";
    throw new ApiError(translate(messageKey), response.status);
  }

  return body as T;
}
