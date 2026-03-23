"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getAuthToken,
  getCurrentUserMeta,
  hasAuthSession,
  hasRefreshToken,
  mustCompleteAccountVerification,
  mustChangePasswordOnNextLogin,
  refreshAccessToken,
  subscribeToAuthTokenChanges,
} from "@/lib/auth";

export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const syncFromStorage = () => {
      if (!isMounted) {
        return;
      }

      setIsAuthenticated(hasAuthSession());
    };

    const checkAuth = async () => {
      if (getAuthToken()) {
        if (isMounted) {
          setIsAuthenticated(true);
          setIsChecking(false);
        }
        return;
      }

      if (hasRefreshToken()) {
        const refreshed = await refreshAccessToken();
        if (isMounted) {
          setIsAuthenticated(Boolean(refreshed));
          setIsChecking(false);
        }
        return;
      }

      if (isMounted) {
        setIsAuthenticated(false);
        setIsChecking(false);
      }
    };

    const unsubscribe = subscribeToAuthTokenChanges(syncFromStorage);
    void checkAuth();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isChecking && !isAuthenticated) {
      const nextPath = pathname || "/dashboard";
      const query = new URLSearchParams({ next: nextPath }).toString();
      router.replace(`/login?${query}`);
    }
  }, [isAuthenticated, isChecking, pathname, router]);

  useEffect(() => {
    if (isChecking || !isAuthenticated) {
      return;
    }

    const userMeta = getCurrentUserMeta();
    if (!userMeta || userMeta.isAdmin || !mustChangePasswordOnNextLogin()) {
      return;
    }

    if (pathname !== "/change-password") {
      router.replace("/change-password?required=1");
    }
  }, [isAuthenticated, isChecking, pathname, router]);

  useEffect(() => {
    if (isChecking || !isAuthenticated) {
      return;
    }

    const userMeta = getCurrentUserMeta();
    if (!userMeta || userMeta.isAdmin || !mustCompleteAccountVerification()) {
      return;
    }

    if (pathname !== "/verify-account" && pathname !== "/change-password") {
      router.replace("/verify-account");
    }
  }, [isAuthenticated, isChecking, pathname, router]);

  return { isChecking, isAuthenticated };
}
