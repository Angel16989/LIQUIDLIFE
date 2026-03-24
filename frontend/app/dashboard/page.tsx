"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { API_BASE_URL } from "@/lib/api";
import { authFetch, clearAuthToken } from "@/lib/auth";
import VerificationComingSoonNotice from "@/components/VerificationComingSoonNotice";

type DashboardLink = {
  title: string;
  description: string;
  href: "/jobs" | "/gym" | "/learning" | "/admin-panel" | "/procurement";
};

const links: DashboardLink[] = [
  {
    title: "Jobs",
    description: "Track opportunities, applications, and interview pipeline.",
    href: "/jobs",
  },
  {
    title: "Gym",
    description: "Follow your workout structure and stay consistent.",
    href: "/gym",
  },
  {
    title: "Learning",
    description: "Keep your study notes and learning momentum daily.",
    href: "/learning",
  },
  {
    title: "Procurement",
    description: "Store your career profile locally and generate tailored resumes and cover letters.",
    href: "/procurement",
  },
];

export default function DashboardPage() {
  const { isChecking, isAuthenticated } = useRequireAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdminStatus() {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/admin/engagement`);
        setIsAdmin(response.ok);
      } catch {
        setIsAdmin(false);
      }
    }

    if (isAuthenticated) {
      void checkAdminStatus();
    }
  }, [isAuthenticated]);

  if (isChecking || !isAuthenticated) {
    return <main className="ll-page flex items-center justify-center"><p className="ll-muted">Checking access...</p></main>;
  }

  const visibleLinks = isAdmin
    ? [
        ...links.filter((item) => item.href !== "/procurement"),
        {
          title: "Admin Panel",
          description: "Review engagement and account authorization requests.",
          href: "/admin-panel" as const,
        },
      ]
    : links;

  return (
    <main className="ll-page px-4 py-8 sm:px-6">
      <div className="ll-container space-y-6">
        <header className="ll-panel flex flex-wrap items-center justify-between gap-3 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] ll-muted">Liquid Life</p>
            <h1 className="mt-2 text-3xl font-semibold ll-title">Dashboard</h1>
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

        <VerificationComingSoonNotice />

        <section className="grid gap-5 md:grid-cols-3">
          {visibleLinks.map((item) => (
            <article key={item.title} className="ll-panel p-5">
              <h2 className="text-xl font-semibold ll-title">{item.title}</h2>
              <p className="mt-2 text-sm ll-muted">{item.description}</p>
              <Link
                href={item.href}
                className="mt-4 inline-flex rounded-lg bg-[#4f3f85] px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Open {item.title}
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
