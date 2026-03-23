function getApiBaseUrl() {
  const value = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!value) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_API_URL");
  }

  return value.replace(/\/+$/, "");
}

export const API_BASE_URL = getApiBaseUrl();
