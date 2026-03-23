"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { clearAuthToken, hasAuthToken, subscribeToAuthTokenChanges } from "@/lib/auth";

type FeatureCard = {
  title: string;
  description: string;
  href: "/jobs" | "/gym" | "/learning";
};

const features: FeatureCard[] = [
  {
    title: "Jobs Tracker",
    description: "Track applications, statuses, and next actions in one focused board.",
    href: "/jobs",
  },
  {
    title: "Gym Planner",
    description: "Stay consistent with a clean workout structure and weekly routine view.",
    href: "/gym",
  },
  {
    title: "Learning Journal",
    description: "Capture study notes and build momentum with daily learning entries.",
    href: "/learning",
  },
];

export default function Home() {
  const isAuthed = useSyncExternalStore(subscribeToAuthTokenChanges, hasAuthToken, () => false);

  return (
    <main className="ll-page px-4 py-8 sm:px-6">
      <div className="ll-container space-y-6">
        <header className="ll-panel flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] ll-muted">Liquid Life</p>
            <h1 className="mt-2 text-3xl font-semibold ll-title">Build Momentum Daily</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            {isAuthed ? (
              <>
                <Link href="/dashboard" className="ll-pill-btn px-3 py-2 text-sm font-semibold">
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    clearAuthToken();
                  }}
                  className="ll-pill-btn px-3 py-2 text-sm font-semibold"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="ll-pill-btn px-3 py-2 text-sm font-semibold">
                  Login
                </Link>
                <Link href="/register" className="ll-pill-btn px-3 py-2 text-sm font-semibold">
                  Register
                </Link>
              </>
            )}
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="ll-panel flex flex-col p-6">
              <h2 className="text-2xl font-semibold ll-title">{feature.title}</h2>
              <p className="mt-3 text-sm leading-6 ll-muted">{feature.description}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/login" className="ll-pill-btn px-3 py-2 text-sm font-semibold">
                  Login
                </Link>
                <Link href="/register" className="ll-pill-btn px-3 py-2 text-sm font-semibold">
                  Register
                </Link>
                <Link href={feature.href} className="ll-pill-btn px-3 py-2 text-sm font-semibold">
                  Learn More
                </Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
