"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [debugResetUrl, setDebugResetUrl] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setInfo(null);
      setDebugResetUrl(null);

      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const payload = (await response.json().catch(() => null)) as { detail?: string; debug_reset_url?: string } | null;
      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, "Failed to send reset email."));
      }

      setInfo(payload?.detail ?? "If an account exists for that email, a reset link has been sent.");
      if (payload?.debug_reset_url) {
        setDebugResetUrl(payload.debug_reset_url);
      }
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "Failed to send reset email.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="ll-page flex items-center justify-center px-4">
      <section className="ll-panel w-full max-w-md p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.25em] ll-muted">Liquid Life</p>
        <h1 className="mt-2 text-3xl font-semibold ll-title">Forgot Password</h1>
        <p className="mt-2 text-sm ll-muted">Enter your email and we will send a reset link.</p>

        {error && (
          <p className="mt-4 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}
        {info && !error && (
          <p className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {info}
          </p>
        )}
        {debugResetUrl && (
          <p className="mt-3 text-sm ll-muted">
            Dev reset link:{" "}
            <a href={debugResetUrl} className="font-semibold text-[#3e3170] hover:underline">
              Open reset page
            </a>
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium ll-title">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
              placeholder="you@example.com"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#4f3f85] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="mt-5 text-sm ll-muted">
          Back to{" "}
          <Link href="/login" className="font-semibold text-[#3e3170] hover:underline">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}
