"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentUserMeta, subscribeToAuthTokenChanges } from "@/lib/auth";

const STORAGE_PREFIX = "liquid-life-verification-notice-dismissed";

function getDismissKey(username: string) {
  return `${STORAGE_PREFIX}:${username}`;
}

export default function VerificationComingSoonNotice() {
  const [userMeta, setUserMeta] = useState(() => getCurrentUserMeta());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const sync = () => {
      const currentUser = getCurrentUserMeta();
      setUserMeta(currentUser);
      if (!currentUser || currentUser.isAdmin || !currentUser.verificationNoticeEnabled || currentUser.verificationRequired) {
        setIsVisible(false);
        return;
      }

      const dismissed = window.localStorage.getItem(getDismissKey(currentUser.username));
      setIsVisible(dismissed !== "true");
    };

    sync();
    return subscribeToAuthTokenChanges(sync);
  }, []);

  if (!userMeta || userMeta.isAdmin || !userMeta.verificationNoticeEnabled || userMeta.verificationRequired || !isVisible) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/95 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Heads Up</p>
          <h2 className="text-xl font-semibold text-[#2c3656]">
            Gmail and SMS verification will be required soon
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-[#5f6677]">
            Update your profile now. A future release will require Gmail account verification and SMS verification
            before access to core features continues.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/verify-account"
            className="rounded-lg bg-[#4f3f85] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Update Profile
          </Link>
          <button
            type="button"
            onClick={() => {
              window.localStorage.setItem(getDismissKey(userMeta.username), "true");
              setIsVisible(false);
            }}
            className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
          >
            Dismiss
          </button>
        </div>
      </div>
    </section>
  );
}
