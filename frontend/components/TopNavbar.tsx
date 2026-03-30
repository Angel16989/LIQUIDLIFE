import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";

type TopNavbarProps = {
  title: string;
  onMenuClick: () => void;
};

export default function TopNavbar({ title, onMenuClick }: TopNavbarProps) {
  return (
    <header className="sticky top-0 z-20 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-[4.35rem] max-w-[90rem] items-center justify-between rounded-[1.2rem] border border-white/50 bg-white/62 px-4 shadow-[0_18px_38px_rgba(76,82,114,0.12)] backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="rounded-xl border border-white/60 bg-white/80 p-2 text-[#2f4e87] shadow-sm md:hidden"
            aria-label="Open menu"
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#6e7692]">Liquid Life Workspace</p>
            <h2 className="text-xl font-semibold text-[#22324b]">{title}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="ll-soft-chip hidden sm:inline-flex">
            Synced now
          </span>
          <NotificationBell />
          <Link
            href="/dashboard"
            aria-label="Go to main dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#314f88] text-xs font-semibold text-white shadow-[0_14px_28px_rgba(49,79,136,0.24)] transition hover:brightness-110"
          >
            LL
          </Link>
        </div>
      </div>
    </header>
  );
}
