function getRequiredPublicEnv(name: "NEXT_PUBLIC_API_URL") {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.replace(/\/+$/, "");
}

export const API_BASE_URL = getRequiredPublicEnv("NEXT_PUBLIC_API_URL");
