"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { API_BASE_URL } from "@/lib/api";
import { getCurrentUserMeta, hasAuthSession, mustCompleteAccountVerification, setAuthSession } from "@/lib/auth";

function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const typed = payload as Record<string, unknown>;
  if (typeof typed.detail === "string" && typed.detail.trim()) {
    return typed.detail;
  }

  for (const value of Object.values(typed)) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
    if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
      return value[0];
    }
  }

  return fallback;
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const registered = new URLSearchParams(window.location.search).get("registered");
    if (registered === "1") {
      setInfo("Registration submitted. Wait for admin approval before login.");
    }
  }, []);

  useEffect(() => {
    if (hasAuthSession()) {
      const currentUserMeta = getCurrentUserMeta();
      if (currentUserMeta?.mustChangePassword) {
        router.replace("/change-password?required=1");
        return;
      }
      if (mustCompleteAccountVerification()) {
        router.replace("/verify-account");
        return;
      }
      router.replace("/dashboard");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!username.trim() || !password) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as unknown;
        throw new Error(getApiErrorMessage(payload, "Invalid credentials"));
      }

      const data = (await response.json()) as {
        access: string;
        refresh: string;
        is_admin?: boolean;
        username?: string;
        must_change_password?: boolean;
        email_verified?: boolean;
        phone_verified?: boolean;
        phone_verification_configured?: boolean;
        verification_required?: boolean;
        verification_notice_enabled?: boolean;
        phone_number?: string;
      };
      setAuthSession(
        data.access,
        {
          username: data.username ?? username.trim(),
          isAdmin: Boolean(data.is_admin),
          mustChangePassword: Boolean(data.must_change_password),
          emailVerified: Boolean(data.email_verified),
          phoneVerified: Boolean(data.phone_verified),
          phoneVerificationConfigured: Boolean(data.phone_verification_configured),
          verificationRequired: Boolean(data.verification_required),
          verificationNoticeEnabled: Boolean(data.verification_notice_enabled ?? true),
          phoneNumber: data.phone_number ?? "",
        },
        data.refresh,
      );

      const next = new URLSearchParams(window.location.search).get("next");
      if (!data.is_admin && data.must_change_password) {
        router.replace("/change-password?required=1");
        return;
      }

      if (
        !data.is_admin &&
        data.verification_required &&
        (!data.email_verified || (data.phone_verification_configured && !data.phone_verified))
      ) {
        router.replace("/verify-account");
        return;
      }

      router.replace(data.is_admin ? "/admin-panel" : next || "/dashboard");
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "Login failed. Check username and password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="ll-page flex items-center justify-center px-4">
      <section className="ll-panel w-full max-w-md p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.25em] ll-muted">Liquid Life</p>
        <h1 className="mt-2 text-3xl font-semibold ll-title">Login</h1>

        {error && (
          <p className="mt-4 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}
        {info && !error && (
          <p className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {info}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium ll-title">Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              type="text"
              required
              className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
              placeholder="your username"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium ll-title">Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#4f3f85] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>

        <GoogleSignInButton
          onError={(message) => setError(message)}
          onSuccess={({
            isAdmin,
            mustChangePassword,
            emailVerified,
            phoneVerified,
            phoneVerificationConfigured,
            verificationRequired,
          }) => {
            if (isAdmin) {
              router.replace("/admin-panel");
              return;
            }
            if (mustChangePassword) {
              router.replace("/change-password?required=1");
              return;
            }
            if (verificationRequired && (!emailVerified || (phoneVerificationConfigured && !phoneVerified))) {
              router.replace("/verify-account");
              return;
            }
            router.replace("/dashboard");
          }}
        />

        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm ll-muted">
          <p>
            No account?{" "}
            <Link href="/register" className="font-semibold text-[#3e3170] hover:underline">
              Register
            </Link>
          </p>
          <p>
            <Link href="/forgot-password" className="font-semibold text-[#3e3170] hover:underline">
              Forgot password?
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
