"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";

type DashboardLayoutProps = {
  title: string;
  children: React.ReactNode;
};

export default function DashboardLayout({ title, children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="liquid-template-shell min-h-screen text-zinc-900">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="md:pl-72">
        <TopNavbar title={title} onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="mx-auto max-w-7xl p-4 sm:p-6">
          <div className="liquid-template-main border border-white/40 bg-white/75 p-4 shadow-2xl backdrop-blur-sm sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
