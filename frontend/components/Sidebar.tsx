"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getCurrentUserMeta, subscribeToAuthTokenChanges } from "@/lib/auth";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const baseNavItems = [
  { name: "Jobs", href: "/jobs" },
  { name: "Documents", href: "/documents" },
  { name: "Resume", href: "/resume" },
  { name: "Cover Letter", href: "/cover-letter" },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(() => Boolean(getCurrentUserMeta()?.isAdmin));

  useEffect(
    () => subscribeToAuthTokenChanges(() => setIsAdmin(Boolean(getCurrentUserMeta()?.isAdmin))),
    [],
  );

  const navItems = useMemo(
    () => (isAdmin ? baseNavItems : [...baseNavItems, { name: "Procurement", href: "/procurement" }]),
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
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-white/45 bg-white/82 p-4 shadow-xl backdrop-blur transition-transform md:translate-x-0 md:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <Link href="/" onClick={onClose} className="mb-8 block rounded-xl px-2 py-1 transition hover:bg-white/70">
            <p className="text-xs uppercase tracking-[0.2em] text-[#6a6782]">Liquid Life</p>
            <h1 className="mt-2 text-2xl font-semibold text-[#2b244d]">Career Center</h1>
          </Link>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`block rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[#4f3f85] text-white"
                      : "text-[#4b4665] hover:bg-white/75 hover:text-[#2b244d]"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-xl border border-white/55 bg-white/70 p-4 text-xs text-[#5d5a79]">
            Career tools in one place.
          </div>
        </div>
      </aside>
    </>
  );
}
