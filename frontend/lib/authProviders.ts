export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export function isGoogleLoginEnabled() {
  return Boolean(GOOGLE_CLIENT_ID);
}
