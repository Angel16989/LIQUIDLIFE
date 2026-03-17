"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAuthToken, getCurrentUserMeta, getCurrentUsername, subscribeToAuthTokenChanges } from "@/lib/auth";
import {
  collectTaskNotifications,
  getDeliveredNotificationIds,
  getStoredNotificationPreferences,
  requestNotificationsRefresh,
  saveDeliveredNotificationIds,
  saveStoredNotificationPreferences,
  subscribeToNotificationRefresh,
  type NotificationPreferences,
  type TaskNotification,
} from "@/lib/notifications";

type BrowserPermissionState = NotificationPermission | "unsupported";

function getBrowserPermission(): BrowserPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

export function useTaskNotifications() {
  const [username, setUsername] = useState(() => getCurrentUsername() ?? "member");
  const [isAdmin, setIsAdmin] = useState(() => Boolean(getCurrentUserMeta()?.isAdmin));
  const [preferences, setPreferences] = useState<NotificationPreferences>(() =>
    getStoredNotificationPreferences(getCurrentUsername() ?? "member"),
  );
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<BrowserPermissionState>(() => getBrowserPermission());
  const normalizedUsername = useMemo(() => username.trim() || "member", [username]);
  const isMountedRef = useRef(true);

  const refreshNotifications = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const nextNotifications = await collectTaskNotifications({
        username: normalizedUsername,
        token: getAuthToken(),
        isAdmin,
      });

      if (isMountedRef.current) {
        setNotifications(nextNotifications);
      }
    } catch (error) {
      console.error(error);
      if (isMountedRef.current) {
        setNotifications([]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [isAdmin, normalizedUsername]);

  const persistPreferences = useCallback(
    (nextPreferences: NotificationPreferences) => {
      setPreferences(nextPreferences);
      saveStoredNotificationPreferences(normalizedUsername, nextPreferences);
      requestNotificationsRefresh();
    },
    [normalizedUsername],
  );

  const setNotificationsEnabled = useCallback(
    (enabled: boolean) => {
      persistPreferences({
        ...preferences,
        enabled,
      });
    },
    [persistPreferences, preferences],
  );

  const setBrowserNotificationsEnabled = useCallback(
    async (enabled: boolean) => {
      if (!enabled) {
        persistPreferences({
          ...preferences,
          browserEnabled: false,
        });
        return;
      }

      if (typeof window === "undefined" || !("Notification" in window)) {
        setBrowserPermission("unsupported");
        return;
      }

      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }

      setBrowserPermission(permission);
      persistPreferences({
        ...preferences,
        browserEnabled: permission === "granted",
      });
    },
    [persistPreferences, preferences],
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setPreferences(getStoredNotificationPreferences(normalizedUsername));
    void refreshNotifications();
  }, [normalizedUsername, refreshNotifications]);

  useEffect(() => {
    const syncAuthState = () => {
      setUsername(getCurrentUsername() ?? "member");
      setIsAdmin(Boolean(getCurrentUserMeta()?.isAdmin));
      setBrowserPermission(getBrowserPermission());
    };

    const handleRefresh = () => {
      void refreshNotifications();
    };

    const handleFocus = () => {
      void refreshNotifications();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshNotifications();
      }
    };

    const unsubscribeAuth = subscribeToAuthTokenChanges(syncAuthState);
    const unsubscribeNotifications = subscribeToNotificationRefresh(handleRefresh);
    const intervalId = window.setInterval(() => {
      void refreshNotifications();
    }, 60000);

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      unsubscribeAuth();
      unsubscribeNotifications();
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshNotifications]);

  useEffect(() => {
    if (!preferences.enabled || !preferences.browserEnabled) {
      return;
    }

    if (browserPermission !== "granted" || typeof window === "undefined") {
      return;
    }

    const deliveredIds = new Set(getDeliveredNotificationIds(normalizedUsername));
    const unseenNotifications = notifications.filter((item) => !deliveredIds.has(item.id));

    if (unseenNotifications.length === 0) {
      return;
    }

    unseenNotifications.slice(0, 3).forEach((item) => {
      const browserNotification = new Notification(item.title, {
        body: item.description,
        tag: item.id,
      });

      browserNotification.onclick = () => {
        window.focus();
        window.location.href = item.href;
        browserNotification.close();
      };
    });

    saveDeliveredNotificationIds(normalizedUsername, [
      ...deliveredIds,
      ...unseenNotifications.map((item) => item.id),
    ]);
  }, [browserPermission, normalizedUsername, notifications, preferences.browserEnabled, preferences.enabled]);

  const activeNotifications = preferences.enabled ? notifications : [];

  return {
    browserPermission,
    isMuted: !preferences.enabled,
    isOpen,
    isRefreshing,
    notifications: activeNotifications,
    preferences,
    refreshNotifications,
    setBrowserNotificationsEnabled,
    setIsOpen,
    setNotificationsEnabled,
  };
}
