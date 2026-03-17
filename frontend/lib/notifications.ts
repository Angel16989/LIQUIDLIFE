"use client";

import { API_BASE_URL } from "@/lib/api";

type JobStatus = "Applied" | "Interview" | "Offer" | "Rejected";

type ApiJob = {
  id: number;
  company: string;
  role: string;
  status: JobStatus;
  application_date: string;
};

type ApiDocument = {
  id: number;
  title: string;
  doc_type: "general" | "resume" | "cover_letter";
};

type AdminEngagementResponse = {
  engagement?: {
    pending_authorization_requests?: number;
  };
};

type StudyEntry = {
  id: number;
  title: string;
  createdAt: string;
};

type WorkoutSet = {
  id: string;
};

type CustomExercise = {
  id: string;
  sets: WorkoutSet[];
};

type CustomWorkoutDay = {
  id: string;
  exercises: CustomExercise[];
};

export type NotificationSeverity = "info" | "warning" | "success";
export type NotificationModule = "jobs" | "documents" | "gym" | "learning" | "admin";

export type TaskNotification = {
  id: string;
  module: NotificationModule;
  severity: NotificationSeverity;
  title: string;
  description: string;
  href: string;
};

export type NotificationPreferences = {
  enabled: boolean;
  browserEnabled: boolean;
};

export const NOTIFICATIONS_REFRESH_EVENT = "liquid-life-notifications-refresh";

const STUDY_STORAGE_KEY = "liquid-life-study-entries";
const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  browserEnabled: false,
};

function readJsonFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getAgeInDays(value: string): number | null {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return null;
  }

  const diff = Date.now() - timestamp;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getGymStorageKey(username: string): string {
  return `liquid-life-gym-workouts-${username.trim().toLowerCase() || "member"}`;
}

function getPreferencesStorageKey(username: string): string {
  return `liquid-life-notification-preferences-${username.trim().toLowerCase() || "member"}`;
}

function getDeliveredStorageKey(username: string): string {
  return `liquid-life-delivered-notifications-${username.trim().toLowerCase() || "member"}`;
}

function compareNotifications(a: TaskNotification, b: TaskNotification): number {
  const severityRank: Record<NotificationSeverity, number> = {
    warning: 0,
    info: 1,
    success: 2,
  };

  return severityRank[a.severity] - severityRank[b.severity];
}

export function getStoredNotificationPreferences(username: string): NotificationPreferences {
  const stored = readJsonFromStorage<Partial<NotificationPreferences>>(getPreferencesStorageKey(username), {});
  return {
    enabled: stored.enabled ?? DEFAULT_PREFERENCES.enabled,
    browserEnabled: stored.browserEnabled ?? DEFAULT_PREFERENCES.browserEnabled,
  };
}

export function saveStoredNotificationPreferences(username: string, preferences: NotificationPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getPreferencesStorageKey(username), JSON.stringify(preferences));
}

export function getDeliveredNotificationIds(username: string): string[] {
  const stored = readJsonFromStorage<string[]>(getDeliveredStorageKey(username), []);
  return Array.isArray(stored) ? stored : [];
}

export function saveDeliveredNotificationIds(username: string, ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  const unique = Array.from(new Set(ids)).slice(-50);
  window.localStorage.setItem(getDeliveredStorageKey(username), JSON.stringify(unique));
}

export function requestNotificationsRefresh() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT));
}

export function subscribeToNotificationRefresh(onRefresh: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);

  return () => {
    window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);
  };
}

export async function collectTaskNotifications({
  username,
  token,
  isAdmin,
}: {
  username: string;
  token: string | null;
  isAdmin: boolean;
}): Promise<TaskNotification[]> {
  const notifications: TaskNotification[] = [];
  const normalizedUsername = username.trim() || "member";

  const jobsPromise = token
    ? fetch(`${API_BASE_URL}/jobs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      })
    : null;

  const documentsPromise = token
    ? fetch(`${API_BASE_URL}/documents`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      })
    : null;

  const adminPromise =
    token && isAdmin
      ? fetch(`${API_BASE_URL}/auth/admin/engagement`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        })
      : null;

  const [jobsResult, documentsResult, adminResult] = await Promise.allSettled([
    jobsPromise,
    documentsPromise,
    adminPromise,
  ]);

  if (jobsResult.status === "fulfilled" && jobsResult.value?.ok) {
    const jobs = ((await jobsResult.value.json()) as ApiJob[]) ?? [];

    if (jobs.length === 0) {
      notifications.push({
        id: "jobs-empty",
        module: "jobs",
        severity: "warning",
        title: "Track your first job application",
        description: "Add at least one role to keep your career pipeline active.",
        href: "/jobs",
      });
    }

    const followUpCount = jobs.filter((job) => job.status === "Applied" && (getAgeInDays(job.application_date) ?? 0) >= 7).length;
    if (followUpCount > 0) {
      notifications.push({
        id: `jobs-follow-up-${followUpCount}`,
        module: "jobs",
        severity: "warning",
        title: `${followUpCount} application${followUpCount === 1 ? "" : "s"} need follow-up`,
        description: "These roles have been sitting in Applied for at least a week.",
        href: "/jobs",
      });
    }

    const interviewCount = jobs.filter((job) => job.status === "Interview").length;
    if (interviewCount > 0) {
      notifications.push({
        id: `jobs-interview-${interviewCount}`,
        module: "jobs",
        severity: "info",
        title: `${interviewCount} interview${interviewCount === 1 ? "" : "s"} in progress`,
        description: "Keep notes, prep material, and next actions current.",
        href: "/jobs",
      });
    }

    const offerCount = jobs.filter((job) => job.status === "Offer").length;
    if (offerCount > 0) {
      notifications.push({
        id: `jobs-offer-${offerCount}`,
        module: "jobs",
        severity: "success",
        title: `${offerCount} offer${offerCount === 1 ? "" : "s"} ready to review`,
        description: "Compare compensation, timing, and final decision details.",
        href: "/jobs",
      });
    }
  }

  if (documentsResult.status === "fulfilled" && documentsResult.value?.ok) {
    const documents = ((await documentsResult.value.json()) as ApiDocument[]) ?? [];
    const resumeCount = documents.filter((item) => item.doc_type === "resume").length;
    const coverLetterCount = documents.filter((item) => item.doc_type === "cover_letter").length;

    if (resumeCount === 0) {
      notifications.push({
        id: "documents-missing-resume",
        module: "documents",
        severity: "warning",
        title: "Add a resume",
        description: "Upload or create a resume so jobs can reference the right version.",
        href: "/documents",
      });
    }

    if (coverLetterCount === 0) {
      notifications.push({
        id: "documents-missing-cover-letter",
        module: "documents",
        severity: "info",
        title: "Add a cover letter",
        description: "Create a reusable cover letter template for applications that need one.",
        href: "/documents",
      });
    }
  }

  const studyEntries = readJsonFromStorage<StudyEntry[]>(STUDY_STORAGE_KEY, []);
  if (studyEntries.length === 0) {
    notifications.push({
      id: "learning-empty",
      module: "learning",
      severity: "info",
      title: "Write your first study entry",
      description: "Capture what you are learning so the journal starts building history.",
      href: "/learning",
    });
  } else {
    const latestEntry = [...studyEntries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
    const daysSinceStudy = latestEntry ? getAgeInDays(latestEntry.createdAt) : null;

    if (daysSinceStudy !== null && daysSinceStudy >= 3) {
      notifications.push({
        id: `learning-stale-${daysSinceStudy}`,
        module: "learning",
        severity: "warning",
        title: "Learning journal needs an update",
        description: `Your last study entry was ${daysSinceStudy} day${daysSinceStudy === 1 ? "" : "s"} ago.`,
        href: "/learning",
      });
    }
  }

  if (!isAdmin) {
    const workouts = readJsonFromStorage<CustomWorkoutDay[]>(getGymStorageKey(normalizedUsername), []);
    const totalSets = workouts.reduce(
      (sum, day) => sum + day.exercises.reduce((exerciseSum, exercise) => exerciseSum + exercise.sets.length, 0),
      0,
    );

    if (workouts.length === 0) {
      notifications.push({
        id: "gym-empty",
        module: "gym",
        severity: "info",
        title: "Build your first workout day",
        description: "Set up a training split so your gym plan is ready when you need it.",
        href: "/gym",
      });
    } else if (totalSets === 0) {
      notifications.push({
        id: "gym-no-sets",
        module: "gym",
        severity: "info",
        title: "Log your first set",
        description: "Your workout structure exists, but no set data has been tracked yet.",
        href: "/gym",
      });
    }
  }

  if (adminResult.status === "fulfilled" && adminResult.value?.ok) {
    const adminPayload = ((await adminResult.value.json()) as AdminEngagementResponse) ?? {};
    const pendingCount = adminPayload.engagement?.pending_authorization_requests ?? 0;

    if (pendingCount > 0) {
      notifications.push({
        id: `admin-pending-${pendingCount}`,
        module: "admin",
        severity: "warning",
        title: `${pendingCount} account request${pendingCount === 1 ? "" : "s"} waiting`,
        description: "Review and approve or reject pending registrations from the admin panel.",
        href: "/admin-panel",
      });
    }
  }

  return notifications.sort(compareNotifications);
}
