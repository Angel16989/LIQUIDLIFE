"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import NotificationBell from "@/components/NotificationBell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { API_BASE_URL } from "@/lib/api";
import { authFetch, logoutCurrentSession } from "@/lib/auth";
import { requestNotificationsRefresh } from "@/lib/notifications";

type Engagement = {
  total_users: number;
  active_users: number;
  pending_authorization_requests: number;
  jobs_tracked: number;
  documents_uploaded: number;
};

type AuthorizationRequest = {
  id: number;
  user_id: number;
  username: string;
  status: "pending" | "approved" | "rejected";
  note: string;
  reviewed_by_username: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type UserAccount = {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
  last_login: string | null;
  authorization_status: "pending" | "approved" | "rejected" | "inactive" | "admin";
  authorization_request_id: number | null;
  must_change_password: boolean;
};

type AdminPanelPayload = {
  engagement: Engagement;
  authorization_requests: AuthorizationRequest[];
  users: UserAccount[];
};

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

async function fetchAdminPanelData(): Promise<AdminPanelPayload> {
  const response = await authFetch(`${API_BASE_URL}/auth/admin/engagement`);

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

function getStatusClasses(status: UserAccount["authorization_status"] | AuthorizationRequest["status"]) {
  const styles: Record<string, string> = {
    pending: "border-amber-300 bg-amber-50 text-amber-700",
    approved: "border-emerald-300 bg-emerald-50 text-emerald-700",
    rejected: "border-rose-300 bg-rose-50 text-rose-700",
    inactive: "border-zinc-300 bg-zinc-100 text-zinc-700",
    admin: "border-sky-300 bg-sky-50 text-sky-700",
  };

  return styles[status] ?? styles.inactive;
}

export default function AdminPanelPage() {
  const router = useRouter();
  const { isChecking, isAuthenticated } = useRequireAuth();
  const [payload, setPayload] = useState<AdminPanelPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeMutationKey, setActiveMutationKey] = useState<string | null>(null);
  const [passwordInputs, setPasswordInputs] = useState<Record<number, string>>({});
  const [passwordChangeRequired, setPasswordChangeRequired] = useState<Record<number, boolean>>({});
  const [generatedPasswords, setGeneratedPasswords] = useState<Record<number, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createUserForm, setCreateUserForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const loadData = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setIsLoading(true);
        }
        setError(null);
        const data = await fetchAdminPanelData();
        setPayload(data);
        requestNotificationsRefresh();
      } catch (loadError) {
        console.error(loadError);
        const nextError = loadError instanceof Error ? loadError.message : "Could not load admin data.";
        setError(nextError);
        setPayload(null);
        if (nextError === "Admin access required.") {
          router.replace("/dashboard");
        }
      } finally {
        if (showLoader) {
          setIsLoading(false);
        }
      }
    },
    [router],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void loadData(true);
    const intervalId = window.setInterval(() => {
      void loadData(false);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [isAuthenticated, loadData]);

  async function handleDecision(requestId: number, decision: "approved" | "rejected") {
    try {
      setError(null);
      setSuccessMessage(null);
      setActiveMutationKey(`${decision}-${requestId}`);
      const response = await authFetch(`${API_BASE_URL}/auth/authorization-requests/${requestId}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as unknown;
        throw new Error(getApiErrorMessage(body, "Failed to update authorization request."));
      }

      await loadData(false);
      requestNotificationsRefresh();
    } catch (decisionError) {
      console.error(decisionError);
      setError(decisionError instanceof Error ? decisionError.message : "Could not update request.");
    } finally {
      setActiveMutationKey(null);
    }
  }

  async function handleDeleteUser(userId: number, username: string) {
    const shouldDelete = window.confirm(`Delete user '${username}'?`);
    if (!shouldDelete) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setActiveMutationKey(`delete-${userId}`);
      const response = await authFetch(`${API_BASE_URL}/auth/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as unknown;
        throw new Error(getApiErrorMessage(body, "Failed to delete user."));
      }

      await loadData(false);
      requestNotificationsRefresh();
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete user.");
    } finally {
      setActiveMutationKey(null);
    }
  }

  async function handleSetPassword(userId: number, generatePassword: boolean) {
    const manualPassword = passwordInputs[userId] ?? "";
    const requirePasswordChange = passwordChangeRequired[userId] ?? true;
    if (!generatePassword && !manualPassword.trim()) {
      setError("Enter a password before saving.");
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setActiveMutationKey(`password-${userId}-${generatePassword ? "auto" : "manual"}`);
      const response = await authFetch(`${API_BASE_URL}/auth/users/${userId}/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: manualPassword,
          generate_password: generatePassword,
          require_password_change: requirePasswordChange,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { detail?: string; generated_password?: string; must_change_password?: boolean }
        | null;
      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, "Failed to update password."));
      }

      setPasswordInputs((current) => ({ ...current, [userId]: "" }));
      setGeneratedPasswords((current) =>
        payload?.generated_password ? { ...current, [userId]: payload.generated_password } : current,
      );
      await loadData(false);
      setSuccessMessage(
        generatePassword
          ? requirePasswordChange
            ? "Temporary password generated. User must change it on next login."
            : "Temporary password generated."
          : requirePasswordChange
            ? "Password updated. User must change it on next login."
            : "Password updated successfully.",
      );
    } catch (passwordError) {
      console.error(passwordError);
      setError(passwordError instanceof Error ? passwordError.message : "Could not update password.");
    } finally {
      setActiveMutationKey(null);
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const username = createUserForm.username.trim();
    const email = createUserForm.email.trim().toLowerCase();
    const password = createUserForm.password;

    if (!username || !email || !password) {
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setSuccessMessage(null);
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setActiveMutationKey("create-user");
      const response = await authFetch(`${API_BASE_URL}/auth/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          password,
        }),
      });

      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, "Failed to create user."));
      }

      setCreateUserForm({
        username: "",
        email: "",
        password: "",
      });
      setSuccessMessage("User created and added to pending approval.");
      await loadData(false);
      requestNotificationsRefresh();
    } catch (createError) {
      console.error(createError);
      setError(createError instanceof Error ? createError.message : "Could not create user.");
      setSuccessMessage(null);
    } finally {
      setActiveMutationKey(null);
    }
  }

  const pendingRequests = useMemo(
    () => payload?.authorization_requests.filter((item) => item.status === "pending") ?? [],
    [payload],
  );
  const userAccounts = useMemo(() => payload?.users ?? [], [payload]);

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
            <h1 className="mt-2 text-3xl font-semibold ll-title">Admin Dashboard</h1>
            <p className="mt-2 text-sm ll-muted">Live account review, approvals, and user control.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <NotificationBell />
            <Link href="/dashboard" className="ll-pill-btn px-3 py-2 text-sm font-semibold">
              Dashboard
            </Link>
            <button
              type="button"
              onClick={() => {
                void logoutCurrentSession().finally(() => {
                  window.location.href = "/";
                });
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
        {successMessage && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {successMessage}
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold ll-title">Create User</h2>
              <p className="mt-1 text-sm ll-muted">Manually add an account. It will stay pending until you approve it.</p>
            </div>
          </div>

          <form onSubmit={handleCreateUser} className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-medium ll-title">Username</span>
              <input
                value={createUserForm.username}
                onChange={(event) =>
                  setCreateUserForm((current) => ({ ...current, username: event.target.value }))
                }
                type="text"
                required
                className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                placeholder="new member username"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium ll-title">Email</span>
              <input
                value={createUserForm.email}
                onChange={(event) =>
                  setCreateUserForm((current) => ({ ...current, email: event.target.value }))
                }
                type="email"
                required
                className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                placeholder="member@example.com"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium ll-title">Password</span>
              <input
                value={createUserForm.password}
                onChange={(event) =>
                  setCreateUserForm((current) => ({ ...current, password: event.target.value }))
                }
                type="password"
                minLength={8}
                required
                className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                placeholder="minimum 8 characters"
              />
            </label>

            <button
              type="submit"
              disabled={activeMutationKey === "create-user"}
              className="rounded-xl bg-[#4f3f85] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60 md:col-span-3 md:w-fit"
            >
              {activeMutationKey === "create-user" ? "Creating user..." : "Create Pending User"}
            </button>
          </form>
        </section>

        <section className="ll-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold ll-title">Registration Requests</h2>
              <p className="mt-1 text-sm ll-muted">Auto-refreshes every 5 seconds.</p>
            </div>
            <button
              type="button"
              onClick={() => void loadData(true)}
              className="ll-pill-btn px-3 py-2 text-sm font-semibold"
              disabled={isLoading}
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {pendingRequests.map((request) => (
              <article key={request.id} className="rounded-xl border border-white/50 bg-white/65 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold ll-title">{request.username}</p>
                    <p className="mt-1 text-xs ll-muted">Requested: {new Date(request.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${getStatusClasses(request.status)}`}>
                    {request.status}
                  </span>
                </div>

                {request.note && <p className="mt-3 text-sm ll-muted">{request.note}</p>}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDecision(request.id, "approved")}
                    disabled={activeMutationKey === `approved-${request.id}` || activeMutationKey === `rejected-${request.id}`}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDecision(request.id, "rejected")}
                    disabled={activeMutationKey === `approved-${request.id}` || activeMutationKey === `rejected-${request.id}`}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
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

        <section className="ll-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold ll-title">User Accounts</h2>
              <p className="mt-1 text-sm ll-muted">Delete normal users directly from here.</p>
            </div>
            <p className="text-sm ll-muted">{userAccounts.length} accounts</p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {userAccounts.map((user) => (
              <article key={user.id} className="rounded-xl border border-white/50 bg-white/65 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold ll-title">{user.username}</p>
                    <p className="mt-1 text-xs ll-muted">Joined: {new Date(user.date_joined).toLocaleString()}</p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${getStatusClasses(user.authorization_status)}`}
                  >
                    {user.authorization_status}
                  </span>
                </div>

                <p className="mt-3 text-xs ll-muted">
                  Last login: {user.last_login ? new Date(user.last_login).toLocaleString() : "Never"}
                </p>
                <p className="mt-1 text-xs ll-muted">Email: {user.email || "No email"}</p>
                <p className="mt-1 text-xs ll-muted">Access: {user.is_active ? "enabled" : "blocked"}</p>
                <p className="mt-1 text-xs ll-muted">
                  Next login password change: {user.must_change_password ? "required" : "not required"}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {user.authorization_status === "pending" && user.authorization_request_id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleDecision(user.authorization_request_id as number, "approved")}
                        disabled={
                          activeMutationKey === `approved-${user.authorization_request_id}` ||
                          activeMutationKey === `rejected-${user.authorization_request_id}`
                        }
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDecision(user.authorization_request_id as number, "rejected")}
                        disabled={
                          activeMutationKey === `approved-${user.authorization_request_id}` ||
                          activeMutationKey === `rejected-${user.authorization_request_id}`
                        }
                        className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </>
                  ) : null}

                  {user.is_staff ? (
                    <span className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
                      Protected admin
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleDeleteUser(user.id, user.username)}
                      disabled={activeMutationKey === `delete-${user.id}`}
                      className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                    >
                      {activeMutationKey === `delete-${user.id}` ? "Deleting..." : "Delete user"}
                    </button>
                  )}
                </div>

                {!user.is_staff && (
                  <div className="mt-4 space-y-2 rounded-xl border border-white/50 bg-white/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] ll-muted">Password Tools</p>
                    <input
                      value={passwordInputs[user.id] ?? ""}
                      onChange={(event) =>
                        setPasswordInputs((current) => ({ ...current, [user.id]: event.target.value }))
                      }
                      type="password"
                      placeholder="Set a manual password"
                      className="w-full rounded-lg border border-white/60 bg-white/95 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                    />
                    <label className="flex items-center gap-2 rounded-lg border border-white/60 bg-white/95 px-3 py-2 text-xs ll-title">
                      <input
                        checked={passwordChangeRequired[user.id] ?? true}
                        onChange={(event) =>
                          setPasswordChangeRequired((current) => ({
                            ...current,
                            [user.id]: event.target.checked,
                          }))
                        }
                        type="checkbox"
                        className="h-4 w-4 rounded border-zinc-300 text-[#4f3f85]"
                      />
                      <span>Force password change on next login</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSetPassword(user.id, false)}
                        disabled={activeMutationKey === `password-${user.id}-manual`}
                        className="rounded-lg bg-[#4f3f85] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                      >
                        Save Password
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSetPassword(user.id, true)}
                        disabled={activeMutationKey === `password-${user.id}-auto`}
                        className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 disabled:opacity-60"
                      >
                        Generate Temp Password
                      </button>
                    </div>
                    {generatedPasswords[user.id] && (
                      <p className="text-xs ll-muted">
                        Temporary password:{" "}
                        <span className="font-semibold text-[#2b244d]">{generatedPasswords[user.id]}</span>
                      </p>
                    )}
                  </div>
                )}
              </article>
            ))}

            {userAccounts.length === 0 && <p className="text-sm ll-muted">No user accounts found.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
