"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasAuthToken, subscribeToAuthTokenChanges } from "@/lib/auth";

export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useSyncExternalStore(
    subscribeToAuthTokenChanges,
    hasAuthToken,
    () => false,
  );

  useEffect(() => {
    if (!isAuthenticated) {
      const nextPath = pathname || "/dashboard";
      const query = new URLSearchParams({ next: nextPath }).toString();
      router.replace(`/login?${query}`);
    }
  }, [isAuthenticated, pathname, router]);

  return { isChecking: false, isAuthenticated };
}
