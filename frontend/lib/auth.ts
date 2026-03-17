export const AUTH_TOKEN_STORAGE_KEY = "liquid-life-access-token";
export const AUTH_USER_STORAGE_KEY = "liquid-life-user-meta";
const AUTH_TOKEN_CHANGED_EVENT = "liquid-life-auth-token-changed";

export type AuthUserMeta = {
  username: string;
  isAdmin?: boolean;
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

export function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  emitAuthTokenChanged();
}

export function setAuthSession(token: string, userMeta: AuthUserMeta) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(userMeta));
  emitAuthTokenChanged();
}

export function clearAuthToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  emitAuthTokenChanged();
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

export function subscribeToAuthTokenChanges(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === AUTH_TOKEN_STORAGE_KEY) {
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
