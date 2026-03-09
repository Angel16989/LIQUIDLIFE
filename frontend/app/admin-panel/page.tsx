"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { API_BASE_URL } from "@/lib/api";
import { clearAuthToken, getAuthToken } from "@/lib/auth";

type Engagement = {
  total_users: number;
  active_users: number;
  pending_authorization_requests: number;
  jobs_tracked: number;
  documents_uploaded: number;
};

type AuthorizationRequest = {
  id: number;
  username: string;
  status: "pending" | "approved" | "rejected";
  note: string;
  reviewed_by_username: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type AdminPanelPayload = {
  engagement: Engagement;
  authorization_requests: AuthorizationRequest[];
};

async function fetchAdminPanelData(token: string): Promise<AdminPanelPayload> {
  const response = await fetch(`${API_BASE_URL}/auth/admin/engagement`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    throw new Error("Unauthorized. Please login again.");
  }
  if (response.status === 403) {
    throw new Error("Admin access required.");
  }
  if (!response.ok) {
    throw new Error("Failed to load admin panel.");
  }

  return (await response.json()) as AdminPanelPayload;
}

export default function AdminPanelPage() {
  const { isChecking, isAuthenticated } = useRequireAuth();
  const [payload, setPayload] = useState<AdminPanelPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function loadData() {
    const token = getAuthToken();
    if (!token) {
      setError("Missing access token.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchAdminPanelData(token);
      setPayload(data);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : "Could not load admin data.");
      setPayload(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void loadData();
  }, [isAuthenticated]);

  async function handleDecision(requestId: number, decision: "approved" | "rejected") {
    const token = getAuthToken();
    if (!token) {
      setError("Missing access token.");
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/auth/authorization-requests/${requestId}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ decision }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(body?.detail || "Failed to update authorization request.");
      }

      await loadData();
    } catch (decisionError) {
      console.error(decisionError);
      setError(decisionError instanceof Error ? decisionError.message : "Could not update request.");
    }
  }

  const pendingRequests = useMemo(() => payload?.authorization_requests.filter((item) => item.status === "pending") ?? [], [payload]);

  if (isChecking || !isAuthenticated) {
    return (
      <main className="ll-page flex items-center justify-center">
        <p className="ll-muted">Checking access...</p>
      </main>
    );
  }

  return (
    <main className="ll-page px-4 py-8 sm:px-6">
      <div className="ll-container space-y-6">
        <header className="ll-panel flex flex-wrap items-center justify-between gap-3 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] ll-muted">Liquid Life</p>
            <h1 className="mt-2 text-3xl font-semibold ll-title">Admin Panel</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard" className="ll-pill-btn px-3 py-2 text-sm font-semibold">
              Dashboard
            </Link>
            <button
              type="button"
              onClick={() => {
                clearAuthToken();
                window.localStorage.removeItem("liquid-life-refresh-token");
                window.location.href = "/";
              }}
              className="ll-pill-btn px-3 py-2 text-sm font-semibold"
            >
              Logout
            </button>
          </div>
        </header>

        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <section className="grid gap-4 md:grid-cols-5">
          <article className="ll-panel p-4">
            <p className="text-xs uppercase tracking-[0.18em] ll-muted">Total Users</p>
            <p className="mt-2 text-2xl font-semibold ll-title">{payload?.engagement.total_users ?? "-"}</p>
          </article>
          <article className="ll-panel p-4">
            <p className="text-xs uppercase tracking-[0.18em] ll-muted">Active Users</p>
            <p className="mt-2 text-2xl font-semibold ll-title">{payload?.engagement.active_users ?? "-"}</p>
          </article>
          <article className="ll-panel p-4">
            <p className="text-xs uppercase tracking-[0.18em] ll-muted">Pending Auth</p>
            <p className="mt-2 text-2xl font-semibold ll-title">{payload?.engagement.pending_authorization_requests ?? "-"}</p>
          </article>
          <article className="ll-panel p-4">
            <p className="text-xs uppercase tracking-[0.18em] ll-muted">Jobs Tracked</p>
            <p className="mt-2 text-2xl font-semibold ll-title">{payload?.engagement.jobs_tracked ?? "-"}</p>
          </article>
          <article className="ll-panel p-4">
            <p className="text-xs uppercase tracking-[0.18em] ll-muted">Documents</p>
            <p className="mt-2 text-2xl font-semibold ll-title">{payload?.engagement.documents_uploaded ?? "-"}</p>
          </article>
        </section>

        <section className="ll-panel p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold ll-title">Account Authorization Requests</h2>
            <button
              type="button"
              onClick={() => void loadData()}
              className="ll-pill-btn px-3 py-2 text-sm font-semibold"
              disabled={isLoading}
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {pendingRequests.map((request) => (
              <article key={request.id} className="rounded-xl border border-white/50 bg-white/65 p-4">
                <p className="text-sm font-semibold ll-title">{request.username}</p>
                <p className="mt-1 text-xs ll-muted">Requested: {new Date(request.created_at).toLocaleString()}</p>
                {request.note && <p className="mt-2 text-sm ll-muted">{request.note}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDecision(request.id, "approved")}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDecision(request.id, "rejected")}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
            {!isLoading && pendingRequests.length === 0 && (
              <p className="text-sm ll-muted">No pending account authorization requests.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
