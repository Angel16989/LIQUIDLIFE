"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import { authFetch, clearAuthToken, updateCurrentUserMeta } from "@/lib/auth";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type VerificationStatus = {
  email: string;
  email_verified: boolean;
  phone_number: string;
  phone_verified: boolean;
  phone_verification_configured: boolean;
};

export default function VerifyAccountPage() {
  const router = useRouter();
  const { isChecking, isAuthenticated } = useRequireAuth();
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [emailAddress, setEmailAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);

  const syncStatus = useCallback((nextStatus: VerificationStatus) => {
    setStatus(nextStatus);
    setEmailAddress(nextStatus.email || "");
    setPhoneNumber(nextStatus.phone_number || "");
    updateCurrentUserMeta({
      emailVerified: nextStatus.email_verified,
      phoneVerified: nextStatus.phone_verified,
      phoneVerificationConfigured: nextStatus.phone_verification_configured,
      phoneNumber: nextStatus.phone_number || "",
    });
    const isFullyVerified =
      nextStatus.email_verified &&
      (!nextStatus.phone_verification_configured || nextStatus.phone_verified);
    if (isFullyVerified) {
      router.replace("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    async function loadStatus() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await authFetch(`${API_BASE_URL}/auth/verification-status`);
        const payload = (await response.json()) as VerificationStatus | { detail?: string };
        if (!response.ok) {
          throw new Error("detail" in payload && payload.detail ? payload.detail : "Could not load verification status.");
        }
        syncStatus(payload as VerificationStatus);
      } catch (loadError) {
        console.error(loadError);
        setError(loadError instanceof Error ? loadError.message : "Could not load verification status.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadStatus();
  }, [isAuthenticated, syncStatus]);

  async function handleSendEmailVerification() {
    try {
      setIsSendingEmail(true);
      setError(null);
      setInfo(null);
      const normalizedEmail = emailAddress.trim().toLowerCase();
      const response = await authFetch(`${API_BASE_URL}/auth/send-email-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { detail?: string; email?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.detail || "Could not send verification email.");
      }
      if (payload?.email) {
        setEmailAddress(payload.email);
        setStatus((current) => (current ? { ...current, email: payload.email || current.email } : current));
      }
      setInfo(payload?.detail || "Verification email sent.");
    } catch (sendError) {
      console.error(sendError);
      setError(sendError instanceof Error ? sendError.message : "Could not send verification email.");
    } finally {
      setIsSendingEmail(false);
    }
  }

  async function handleSendPhoneCode() {
    try {
      setIsSendingCode(true);
      setError(null);
      setInfo(null);
      const response = await authFetch(`${API_BASE_URL}/auth/phone/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneNumber.trim() }),
      });
      const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.detail || "Could not send verification code.");
      }
      setInfo(payload?.detail || "Verification code sent.");
    } catch (sendError) {
      console.error(sendError);
      setError(sendError instanceof Error ? sendError.message : "Could not send verification code.");
    } finally {
      setIsSendingCode(false);
    }
  }

  async function handleCheckPhoneCode() {
    try {
      setIsCheckingCode(true);
      setError(null);
      setInfo(null);
      const response = await authFetch(`${API_BASE_URL}/auth/phone/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: phoneNumber.trim(),
          code: verificationCode.trim(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { detail?: string; verification?: VerificationStatus } | null;
      if (!response.ok || !payload?.verification) {
        throw new Error(payload?.detail || "Could not verify phone number.");
      }
      setInfo(payload.detail || "Phone number verified.");
      syncStatus(payload.verification);
      setVerificationCode("");
    } catch (checkError) {
      console.error(checkError);
      setError(checkError instanceof Error ? checkError.message : "Could not verify phone number.");
    } finally {
      setIsCheckingCode(false);
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
    <main className="ll-page px-4 py-8 sm:px-6">
      <div className="ll-container max-w-3xl space-y-6">
        <header className="ll-panel flex flex-wrap items-center justify-between gap-3 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] ll-muted">Account Verification</p>
            <h1 className="mt-2 text-3xl font-semibold ll-title">Finish account verification</h1>
            <p className="mt-3 text-sm ll-muted">
              You can sign in, but core app features stay locked until the required checks are complete.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              clearAuthToken();
              window.location.href = "/";
            }}
            className="rounded-lg border border-white/55 bg-white/85 px-3 py-2 text-sm font-medium text-[#3b3168] transition hover:bg-white"
          >
            Logout
          </button>
        </header>

        {error && (
          <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}
        {info && !error && (
          <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{info}</p>
        )}

        {isLoading || !status ? (
          <section className="ll-panel p-6">
            <p className="ll-muted">Loading verification status...</p>
          </section>
        ) : (
          <>
            <section className="grid gap-5 md:grid-cols-2">
              <article className="ll-panel p-6">
                <p className="text-xs uppercase tracking-[0.2em] ll-muted">Email</p>
                <h2 className="mt-2 text-xl font-semibold ll-title">
                  {status.email_verified ? "Email verified" : "Email verification required"}
                </h2>
                <p className="mt-3 text-sm ll-muted">
                  Address: <span className="font-semibold text-[#2f3555]">{status.email || "No email on account"}</span>
                </p>
                <p className="mt-3 text-sm ll-muted">
                  Google sign-in can satisfy this automatically when Google is authoritative for the email account.
                </p>
                {!status.email_verified && (
                  <div className="mt-4 space-y-3">
                    <label className="block space-y-2">
                      <span className="text-sm font-medium ll-title">Email address</span>
                      <input
                        value={emailAddress}
                        onChange={(event) => setEmailAddress(event.target.value)}
                        type="email"
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => void handleSendEmailVerification()}
                      disabled={isSendingEmail}
                      className="rounded-xl bg-[#4f3f85] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSendingEmail ? "Sending..." : status.email ? "Resend verification email" : "Add email and verify"}
                    </button>
                  </div>
                )}
              </article>

              <article className="ll-panel p-6">
                <p className="text-xs uppercase tracking-[0.2em] ll-muted">Phone</p>
                <h2 className="mt-2 text-xl font-semibold ll-title">
                  {status.phone_verified
                    ? "Phone verified"
                    : status.phone_verification_configured
                      ? "Phone verification required"
                      : "Phone verification unavailable"}
                </h2>

                {!status.phone_verification_configured ? (
                  <div className="mt-3 space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <p className="font-semibold">SMS servers are out right now.</p>
                    <p>
                      Phone verification is temporarily unavailable on this deployment. Email verification is enough for
                      access until SMS comes back online.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <label className="block space-y-2">
                      <span className="text-sm font-medium ll-title">Phone number</span>
                      <input
                        value={phoneNumber}
                        onChange={(event) => setPhoneNumber(event.target.value)}
                        type="tel"
                        placeholder="+61400111222"
                        className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => void handleSendPhoneCode()}
                      disabled={isSendingCode}
                      className="rounded-xl bg-[#4f3f85] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSendingCode ? "Sending code..." : "Send SMS code"}
                    </button>

                    <label className="block space-y-2">
                      <span className="text-sm font-medium ll-title">Verification code</span>
                      <input
                        value={verificationCode}
                        onChange={(event) => setVerificationCode(event.target.value)}
                        type="text"
                        placeholder="123456"
                        className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => void handleCheckPhoneCode()}
                      disabled={isCheckingCode}
                      className="rounded-xl border border-[#4f3f85]/25 bg-white px-4 py-2 text-sm font-semibold text-[#3d3270] transition hover:bg-[#f4f0ff] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isCheckingCode ? "Checking..." : "Verify phone"}
                    </button>
                  </div>
                )}
              </article>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
