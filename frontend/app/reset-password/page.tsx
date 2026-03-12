"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

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

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [humanCheck, setHumanCheck] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const nextToken = new URLSearchParams(window.location.search).get("token");
    setToken(nextToken ?? "");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !password || !confirmPassword) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setInfo(null);

      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          confirm_password: confirmPassword,
          human_check: humanCheck,
        }),
      });

      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, "Failed to reset password."));
      }

      setInfo("Password updated. You can log in now.");
      setPassword("");
      setConfirmPassword("");
      setHumanCheck(false);
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "Failed to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="ll-page flex items-center justify-center px-4">
      <section className="ll-panel w-full max-w-md p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.25em] ll-muted">Liquid Life</p>
        <h1 className="mt-2 text-3xl font-semibold ll-title">Reset Password</h1>
        <p className="mt-2 text-sm ll-muted">Use the emailed link, confirm you are human, then set a new password.</p>

        {error && (
          <p className="mt-4 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}
        {info && !error && (
          <p className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {info}
          </p>
        )}

        {!token && <p className="mt-4 text-sm ll-muted">Missing reset token. Use the link from your email.</p>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium ll-title">New Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
              placeholder="minimum 8 characters"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium ll-title">Confirm Password</span>
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              required
              className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
              placeholder="repeat password"
            />
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-white/60 bg-white/90 px-3 py-3 text-sm ll-title">
            <input
              checked={humanCheck}
              onChange={(event) => setHumanCheck(event.target.checked)}
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-300 text-[#4f3f85]"
            />
            <span>I am not a robot</span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting || !token}
            className="w-full rounded-xl bg-[#4f3f85] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Updating..." : "Reset Password"}
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
