"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!username.trim() || !password) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as unknown;
        throw new Error(getApiErrorMessage(payload, "Failed to register"));
      }

      router.replace("/login?registered=1");
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="ll-page flex items-center justify-center px-4">
      <section className="ll-panel w-full max-w-md p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.25em] ll-muted">Liquid Life</p>
        <h1 className="mt-2 text-3xl font-semibold ll-title">Register</h1>

        {error && (
          <p className="mt-4 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
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
              placeholder="choose username"
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
              placeholder="minimum 8 characters"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#4f3f85] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="mt-5 text-sm ll-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#3e3170] hover:underline">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}
