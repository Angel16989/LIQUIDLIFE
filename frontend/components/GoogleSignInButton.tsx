"use client";

import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { setAuthSession } from "@/lib/auth";
import { GOOGLE_CLIENT_ID, isGoogleLoginEnabled } from "@/lib/authProviders";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: Record<string, string | number | boolean>,
          ) => void;
        };
      };
    };
  }
}

function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const typed = payload as Record<string, unknown>;
  if (typeof typed.detail === "string" && typed.detail.trim()) {
    return typed.detail;
  }

  return fallback;
}

type GoogleSignInButtonProps = {
  onError: (message: string) => void;
  onInfo?: (message: string) => void;
  onSuccess: (session: {
    isAdmin: boolean;
    mustChangePassword: boolean;
    emailVerified: boolean;
    phoneVerified: boolean;
    phoneVerificationConfigured: boolean;
    verificationRequired: boolean;
  }) => void;
  mode?: "login" | "register";
};

export default function GoogleSignInButton({
  onError,
  onInfo,
  onSuccess,
  mode = "login",
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!isGoogleLoginEnabled()) {
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>("script[data-google-login='true']");
    if (existingScript) {
      setHasLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleLogin = "true";
    script.onload = () => setHasLoaded(true);
    script.onerror = () => onError("Failed to load Google Sign-In.");
    document.head.appendChild(script);
  }, [onError]);

  useEffect(() => {
    if (!hasLoaded || !buttonRef.current || !window.google || !GOOGLE_CLIENT_ID) {
      return;
    }

    buttonRef.current.innerHTML = "";
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async ({ credential }) => {
        if (!credential) {
          onError("Google sign-in did not return a credential.");
          return;
        }

        try {
          const response = await fetch(`${API_BASE_URL}/auth/google-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential }),
          });

          const payload = (await response.json().catch(() => null)) as
            | {
                access?: string;
                refresh?: string;
                is_admin?: boolean;
                username?: string;
                must_change_password?: boolean;
                email_verified?: boolean;
                phone_verified?: boolean;
                phone_verification_configured?: boolean;
                verification_required?: boolean;
                verification_notice_enabled?: boolean;
                phone_number?: string;
                detail?: string;
              }
            | null;

          if (response.status === 403 && payload?.detail && mode === "register") {
            onInfo?.(payload.detail);
            return;
          }

          if (!response.ok || !payload?.access || !payload.refresh) {
            throw new Error(getApiErrorMessage(payload, "Google sign-in failed."));
          }

          setAuthSession(
            payload.access,
            {
              username: payload.username ?? "member",
              isAdmin: Boolean(payload.is_admin),
              mustChangePassword: Boolean(payload.must_change_password),
              emailVerified: Boolean(payload.email_verified),
              phoneVerified: Boolean(payload.phone_verified),
              phoneVerificationConfigured: Boolean(payload.phone_verification_configured),
              verificationRequired: Boolean(payload.verification_required),
              verificationNoticeEnabled: Boolean(payload.verification_notice_enabled ?? true),
              phoneNumber: payload.phone_number ?? "",
            },
            payload.refresh,
          );
          onSuccess({
            isAdmin: Boolean(payload.is_admin),
            mustChangePassword: Boolean(payload.must_change_password),
            emailVerified: Boolean(payload.email_verified),
            phoneVerified: Boolean(payload.phone_verified),
            phoneVerificationConfigured: Boolean(payload.phone_verification_configured),
            verificationRequired: Boolean(payload.verification_required),
          });
        } catch (error) {
          console.error(error);
          onError(error instanceof Error ? error.message : "Google sign-in failed.");
        }
      },
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: 320,
      text: "signin_with",
      shape: "pill",
    });
  }, [hasLoaded, mode, onError, onInfo, onSuccess]);

  if (!isGoogleLoginEnabled()) {
    return null;
  }

  return <div ref={buttonRef} className="mt-4 flex justify-center" />;
}
