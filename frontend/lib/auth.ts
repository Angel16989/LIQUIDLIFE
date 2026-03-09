export const AUTH_TOKEN_STORAGE_KEY = "liquid-life-access-token";
const AUTH_TOKEN_CHANGED_EVENT = "liquid-life-auth-token-changed";

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

export function clearAuthToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  emitAuthTokenChanged();
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
