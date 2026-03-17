import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";

type TopNavbarProps = {
  title: string;
  onMenuClick: () => void;
};

export default function TopNavbar({ title, onMenuClick }: TopNavbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/45 bg-white/70 backdrop-blur">
      <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="rounded-lg border border-white/60 bg-white/70 p-2 text-[#3d316b] md:hidden"
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
          <h2 className="text-lg font-semibold text-[#2b244d]">{title}</h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs text-[#5d5a79] sm:inline-flex">
            Synced now
          </span>
          <NotificationBell />
          <Link
            href="/"
            aria-label="Go to main dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4f3f85] text-xs font-semibold text-white transition hover:brightness-110"
          >
            LL
          </Link>
        </div>
      </div>
    </header>
  );
}
