import { API_BASE_URL } from "@/lib/api";

export const AUTH_TOKEN_STORAGE_KEY = "liquid-life-access-token";
export const REFRESH_TOKEN_STORAGE_KEY = "liquid-life-refresh-token";
export const AUTH_USER_STORAGE_KEY = "liquid-life-user-meta";
const AUTH_TOKEN_CHANGED_EVENT = "liquid-life-auth-token-changed";
let refreshRequest: Promise<string | null> | null = null;

export type AuthUserMeta = {
  username: string;
  isAdmin?: boolean;
  mustChangePassword?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  phoneVerificationConfigured?: boolean;
  phoneNumber?: string;
};

function emitAuthTokenChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
}

export function hasAuthToken(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  return Boolean(token);
}

export function hasRefreshToken(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY));
}

export function hasAuthSession(): boolean {
  return hasAuthToken() || hasRefreshToken();
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  emitAuthTokenChanged();
}

export function setRefreshToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
  emitAuthTokenChanged();
}

export function setAuthSession(token: string, userMeta: AuthUserMeta, refreshToken?: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  if (refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  }
  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(userMeta));
  emitAuthTokenChanged();
}

export function updateCurrentUserMeta(nextValues: Partial<AuthUserMeta>) {
  if (typeof window === "undefined") {
    return;
  }

  const current = getCurrentUserMeta();
  if (!current) {
    return;
  }

  window.localStorage.setItem(
    AUTH_USER_STORAGE_KEY,
    JSON.stringify({
      ...current,
      ...nextValues,
    }),
  );
  emitAuthTokenChanged();
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  emitAuthTokenChanged();
}

export function clearAuthToken() {
  clearAuthSession();
}

export function getCurrentUsername(): string | null {
  const userMeta = getCurrentUserMeta();
  return userMeta?.username ?? null;
}

export function getCurrentUserMeta(): AuthUserMeta | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthUserMeta;
    return typeof parsed.username === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function isCurrentUserAdmin(): boolean {
  const userMeta = getCurrentUserMeta();
  return Boolean(userMeta?.isAdmin);
}

export function mustChangePasswordOnNextLogin(): boolean {
  const userMeta = getCurrentUserMeta();
  return Boolean(userMeta?.mustChangePassword);
}

export function isEmailVerifiedForCurrentUser(): boolean {
  const userMeta = getCurrentUserMeta();
  return Boolean(userMeta?.emailVerified);
}

export function isPhoneVerifiedForCurrentUser(): boolean {
  const userMeta = getCurrentUserMeta();
  return Boolean(userMeta?.phoneVerified);
}

export function mustCompleteAccountVerification(): boolean {
  const userMeta = getCurrentUserMeta();
  if (!userMeta || userMeta.isAdmin) {
    return false;
  }

  if (!userMeta.emailVerified) {
    return true;
  }

  if (userMeta.phoneVerificationConfigured) {
    return !userMeta.phoneVerified;
  }

  return false;
}

export function subscribeToAuthTokenChanges(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (
      event.key === AUTH_TOKEN_STORAGE_KEY ||
      event.key === REFRESH_TOKEN_STORAGE_KEY ||
      event.key === AUTH_USER_STORAGE_KEY
    ) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onStoreChange);
  };
}

async function requestAccessTokenRefresh(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) {
    clearAuthSession();
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh }),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | { access?: string; refresh?: string }
      | null;

    if (!response.ok || !payload?.access) {
      clearAuthSession();
      return null;
    }

    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, payload.access);
    if (typeof payload.refresh === "string" && payload.refresh.trim()) {
      window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, payload.refresh);
    }
    emitAuthTokenChanged();
    return payload.access;
  } catch {
    clearAuthSession();
    return null;
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshRequest) {
    return refreshRequest;
  }

  refreshRequest = requestAccessTokenRefresh().finally(() => {
    refreshRequest = null;
  });

  return refreshRequest;
}

function withAuthorization(headers: HeadersInit | undefined, token: string): Headers {
  const nextHeaders = new Headers(headers);
  nextHeaders.set("Authorization", `Bearer ${token}`);
  return nextHeaders;
}

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const makeRequest = async (token: string | null) =>
    fetch(input, {
      ...init,
      headers: token ? withAuthorization(init?.headers, token) : init?.headers,
      cache: init?.cache ?? "no-store",
    });

  let token = getAuthToken();
  if (!token && hasRefreshToken()) {
    token = await refreshAccessToken();
  }

  const response = await makeRequest(token);
  if (response.status !== 401) {
    return response;
  }

  const refreshedToken = await refreshAccessToken();
  if (!refreshedToken) {
    return response;
  }

  return makeRequest(refreshedToken);
}
