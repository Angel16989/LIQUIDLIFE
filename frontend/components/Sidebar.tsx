"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getCurrentUserMeta, subscribeToAuthTokenChanges } from "@/lib/auth";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

type NavItem = {
  name: string;
  href: string;
  badge?: string;
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(() => Boolean(getCurrentUserMeta()?.isAdmin));

  useEffect(
    () => subscribeToAuthTokenChanges(() => setIsAdmin(Boolean(getCurrentUserMeta()?.isAdmin))),
    [],
  );

  const navSections = useMemo<{ label: string; items: NavItem[] }[]>(
    () =>
      [
        {
          label: "Workspace",
          items: [
            { name: "Dashboard", href: "/dashboard" },
            { name: "Jobs", href: "/jobs" },
            { name: "Documents", href: "/documents" },
          ],
        },
        {
          label: "Career Builder",
          items: [
            ...(!isAdmin ? [{ name: "Procurement", href: "/procurement", badge: "AI" }] : []),
            { name: "Resume", href: "/resume" },
            { name: "Cover Letter", href: "/cover-letter" },
          ],
        },
        {
          label: "Momentum",
          items: [
            { name: "Gym", href: "/gym" },
            { name: "Learning", href: "/learning" },
          ],
        },
        ...(isAdmin
          ? [
              {
                label: "Admin",
                items: [{ name: "Admin Panel", href: "/admin-panel", badge: "Admin" }],
              },
            ]
          : []),
      ],
    [isAdmin],
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-[#130f26]/45 transition-opacity md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-80 border-r border-white/45 bg-white/74 p-4 shadow-xl backdrop-blur-xl transition-transform md:translate-x-0 md:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <Link href="/dashboard" onClick={onClose} className="mb-8 block rounded-2xl border border-white/45 bg-white/60 px-4 py-4 shadow-sm transition hover:bg-white/72">
            <p className="text-xs uppercase tracking-[0.22em] text-[#6a6782]">Liquid Life</p>
            <h1 className="mt-2 text-2xl font-semibold text-[#2b244d]">Workspace</h1>
            <p className="mt-2 text-sm leading-6 text-[#5f6677]">Career operations, document systems, learning, and personal momentum in one place.</p>
          </Link>

          <nav className="space-y-6">
            {navSections.map((section) => (
              <div key={section.label} className="space-y-2">
                <p className="px-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#7b7c8f]">
                  {section.label}
                </p>

                <div className="space-y-1">
                  {section.items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                          active
                            ? "bg-[#314f88] text-white shadow-[0_18px_34px_rgba(49,79,136,0.28)]"
                            : "text-[#4b4665] hover:bg-white/78 hover:text-[#2b244d]"
                        }`}
                      >
                        <span>{item.name}</span>
                        {item.badge ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] ${
                              active ? "bg-white/18 text-white" : "bg-[#eef3ff] text-[#4463a1]"
                            }`}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/55 bg-white/70 p-4 text-xs text-[#5d5a79] shadow-sm">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#6d7391]">Session</p>
            <p className="mt-2 text-sm leading-6 text-[#4f5673]">
              {isAdmin ? "Admin mode is active for approvals, passwords, and user oversight." : "Your workspace is ready for resumes, job tracking, and momentum systems."}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
