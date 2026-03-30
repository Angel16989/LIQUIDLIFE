"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import VerificationComingSoonNotice from "@/components/VerificationComingSoonNotice";

type DashboardLayoutProps = {
  title: string;
  children: React.ReactNode;
};

export default function DashboardLayout({ title, children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="liquid-template-shell min-h-screen text-zinc-900">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="relative md:pl-80">
        <TopNavbar title={title} onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="mx-auto max-w-[90rem] p-4 sm:p-6 lg:p-8">
          <div className="liquid-template-main p-4 sm:p-6 lg:p-8">
            <div className="space-y-6">
              <VerificationComingSoonNotice />
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
