"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import { authFetch, updateCurrentUserMeta } from "@/lib/auth";
import { useRequireAuth } from "@/hooks/useRequireAuth";

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

export default function ChangePasswordPage() {
  const router = useRouter();
  const { isChecking, isAuthenticated } = useRequireAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isRequired, setIsRequired] = useState(false);

  useEffect(() => {
    setIsRequired(new URLSearchParams(window.location.search).get("required") === "1");
  }, []);

  useEffect(() => {
    if (!info) {
      return;
    }

    const timer = window.setTimeout(() => {
      router.replace("/dashboard");
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [info, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentPassword || !password || !confirmPassword) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setInfo(null);

      const response = await authFetch(`${API_BASE_URL}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          password,
          confirm_password: confirmPassword,
        }),
      });

      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, "Failed to change password."));
      }

      updateCurrentUserMeta({ mustChangePassword: false });
      setInfo("Password changed successfully. Redirecting...");
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "Failed to change password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isChecking || !isAuthenticated) {
    return (
      <main className="ll-page flex items-center justify-center">
        <p className="ll-muted">Checking access...</p>
      </main>
    );
  }

  return (
    <main className="ll-page flex items-center justify-center px-4">
      <section className="ll-panel w-full max-w-md p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.25em] ll-muted">Liquid Life</p>
        <h1 className="mt-2 text-3xl font-semibold ll-title">Change Password</h1>
        <p className="mt-2 text-sm ll-muted">
          {isRequired
            ? "Your account requires a password update before you continue."
            : "Update your password to keep your account secure."}
        </p>

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
            <span className="text-sm font-medium ll-title">Current Password</span>
            <input
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              type="password"
              required
              className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
              placeholder="Enter your current password"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium ll-title">New Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
              placeholder="Minimum 8 characters"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium ll-title">Confirm New Password</span>
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              required
              className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
              placeholder="Repeat the new password"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#4f3f85] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Updating..." : "Change Password"}
          </button>
        </form>

        {!isRequired && (
          <p className="mt-5 text-sm ll-muted">
            Back to{" "}
            <Link href="/dashboard" className="font-semibold text-[#3e3170] hover:underline">
              Dashboard
            </Link>
          </p>
        )}
      </section>
    </main>
  );
}
