"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DashboardCards, { type DashboardCard } from "@/components/DashboardCards";
import DashboardLayout from "@/components/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { API_BASE_URL } from "@/lib/api";
import { authFetch, logoutCurrentSession } from "@/lib/auth";

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

  const overviewCards: DashboardCard[] = [
    {
      label: "Active Modules",
      value: String(visibleLinks.length),
      delta: isAdmin ? "Admin controls included in this workspace" : "Core tools ready for daily use",
    },
    {
      label: "Document Flow",
      value: isAdmin ? "Resumes + letters" : "AI-tailored builder",
      delta: "Draft, edit, preview, and export from the same system",
    },
    {
      label: "Focus Areas",
      value: "Career + Growth",
      delta: "Jobs, learning, and consistency stay under one roof",
    },
    {
      label: "Session Role",
      value: isAdmin ? "Administrator" : "Member",
      delta: "Secure sign-in, notifications, and approval-aware access",
    },
  ];

  return (
    <DashboardLayout title="Dashboard">
      <section className="ll-panel p-6 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] ll-muted">Command Center</p>
            <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight ll-title sm:text-4xl">
              Build momentum across jobs, documents, and the systems that support your work.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 ll-muted">
              Liquid Life is set up as a controlled workspace rather than a loose collection of tools. Career ops,
              resume building, approvals, learning, and consistency modules stay connected, but the interface remains
              calm and easy to scan.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={isAdmin ? "/admin-panel" : "/jobs"} className="ll-button-primary">
                Open {isAdmin ? "Admin Panel" : "Jobs Workspace"}
              </Link>
              <Link href={isAdmin ? "/documents" : "/procurement"} className="ll-button-secondary">
                Open {isAdmin ? "Documents" : "Procurement"}
              </Link>
              <button
                type="button"
                onClick={() => {
                  void logoutCurrentSession().finally(() => {
                    window.location.href = "/";
                  });
                }}
                className="ll-button-secondary"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <article className="ll-panel-soft p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] ll-muted">Workspace Shape</p>
              <h2 className="mt-2 text-xl font-semibold ll-title">Everything is routed around action, not clutter.</h2>
              <p className="mt-3 text-sm leading-7 ll-muted">
                The navigation now separates workspace, career builder, and momentum modules so the system reads faster.
              </p>
            </article>
            <article className="ll-panel-soft p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] ll-muted">Live Flow</p>
              <h2 className="mt-2 text-xl font-semibold ll-title">Resume building, documents, and job tracking connect cleanly.</h2>
              <p className="mt-3 text-sm leading-7 ll-muted">
                You can move from procurement into documents, then link those outputs straight into applications.
              </p>
            </article>
          </div>
        </div>
      </section>

      <DashboardCards cards={overviewCards} />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] ll-muted">Quick Modules</p>
            <h2 className="mt-2 text-2xl font-semibold ll-title">Open the part of the system you need next.</h2>
          </div>
          <div className="ll-soft-chip hidden sm:inline-flex">Light workspace active</div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {visibleLinks.map((item) => (
            <article key={item.title} className="ll-panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] ll-muted">Module</p>
              <h3 className="mt-3 text-2xl font-semibold ll-title">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 ll-muted">{item.description}</p>
              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#58708d]">Open now</span>
                <Link href={item.href} className="ll-button-primary">
                  Launch
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </DashboardLayout>
  );
}
