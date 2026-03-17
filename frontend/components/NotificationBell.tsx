"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import type { NotificationSeverity } from "@/lib/notifications";

function getSeverityClasses(severity: NotificationSeverity): string {
  if (severity === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300";
  }

  if (severity === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300";
  }

  return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300";
}

function ToggleRow({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-1 inline-flex h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-[#4f3f85]" : "bg-zinc-300 dark:bg-zinc-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

export default function NotificationBell() {
  const {
    browserPermission,
    isMuted,
    isOpen,
    isRefreshing,
    notifications,
    preferences,
    refreshNotifications,
    setBrowserNotificationsEnabled,
    setIsOpen,
    setNotificationsEnabled,
  } = useTaskNotifications();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelStyle, setPanelStyle] = useState({
    left: 16,
    top: 72,
    width: 384,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const updatePosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      if (!triggerRect) {
        return;
      }

      const nextWidth = Math.min(window.innerWidth - 32, 384);
      const nextLeft = Math.min(
        window.innerWidth - nextWidth - 16,
        Math.max(16, triggerRect.right - nextWidth),
      );
      const nextTop = Math.max(16, triggerRect.bottom + 12);

      setPanelStyle({
        left: nextLeft,
        top: nextTop,
        width: nextWidth,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, setIsOpen]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/75 text-[#3d316b] transition hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100"
        aria-label="Open notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a3 3 0 0 0 6 0" />
          {isMuted ? <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l16 16" /> : null}
        </svg>

        {!isMuted && notifications.length > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {notifications.length}
          </span>
        ) : null}
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              style={panelStyle}
              className="fixed z-[140] max-h-[75vh] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
            >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notifications</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Main task reminders across Career, Gym, Learning, and Documents.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshNotifications()}
              className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <ToggleRow
              checked={preferences.enabled}
              label="In-app reminders"
              description="Show task reminders in the dashboard bell and panel."
              onChange={setNotificationsEnabled}
            />

            <ToggleRow
              checked={preferences.browserEnabled}
              label="Browser popups"
              description="Send browser notifications while the app is open."
              onChange={(checked) => {
                void setBrowserNotificationsEnabled(checked);
              }}
            />

            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Browser permission:{" "}
              <span className="font-semibold capitalize text-zinc-700 dark:text-zinc-200">{browserPermission}</span>
            </p>
          </div>

          <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            {!preferences.enabled ? (
              <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300">
                Notifications are muted. Turn reminders back on when you want task prompts again.
              </p>
            ) : notifications.length === 0 ? (
              <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300">
                No active reminders right now.
              </p>
            ) : (
              <div className="space-y-3">
                {notifications.map((item) => (
                  <article key={item.id} className={`rounded-xl border px-3 py-3 ${getSeverityClasses(item.severity)}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 opacity-90">{item.description}</p>
                      </div>
                      <span className="rounded-full border border-current/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]">
                        {item.module}
                      </span>
                    </div>
                    <Link href={item.href} onClick={() => setIsOpen(false)} className="mt-3 inline-flex text-xs font-semibold underline underline-offset-4">
                      Open task
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
