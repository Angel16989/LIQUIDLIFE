import { API_BASE_URL } from "@/lib/api";
import { authFetch } from "@/lib/auth";
import type { ResumeSectionTemplateConfig } from "@/lib/documentTemplates";

export type ProcurementProfile = {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  portfolioUrl: string;
  linkedinUrl: string;
  summary: string;
  targetRoles: string;
  skills: string;
  achievements: string;
  experience: string;
  education: string;
  certifications: string;
  projects: string;
  strengths: string;
  preferences: string;
  additionalContext: string;
};

export type ProcurementStatus = {
  provider: string;
  model: string;
  ai_configured: boolean;
  local_profile_storage: boolean;
};

export type GeneratedDocumentPayload = {
  title: string;
  content: string;
  doc_type: "resume" | "cover_letter";
  template_name: "balanced" | "executive" | "minimal";
  template_config: ResumeSectionTemplateConfig | Record<string, never>;
  highlights?: string[];
  keywords_targeted?: string[];
};

export type GeneratedApplicationPairPayload = {
  resume: GeneratedDocumentPayload;
  cover_letter: GeneratedDocumentPayload;
};

export type AtsReviewPayload = {
  overall_score: number;
  keyword_score: number;
  section_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  detected_sections: string[];
  recommendations: string[];
  summary: string;
};

export const DEFAULT_PROCUREMENT_PROFILE: ProcurementProfile = {
  fullName: "",
  headline: "",
  email: "",
  phone: "",
  location: "",
  portfolioUrl: "",
  linkedinUrl: "",
  summary: "",
  targetRoles: "",
  skills: "",
  achievements: "",
  experience: "",
  education: "",
  certifications: "",
  projects: "",
  strengths: "",
  preferences: "",
  additionalContext: "",
};

type EncryptedProfileEnvelope = {
  version: 1;
  iv: string;
  data: string;
};

const PROCUREMENT_KEY_DB_NAME = "liquid-life-secure-store";
const PROCUREMENT_KEY_STORE_NAME = "procurement-keys";

export function getProcurementProfileStorageKey(username: string) {
  return `liquid-life-procurement-profile-${username.toLowerCase()}`;
}

function normalizeProfile(value: unknown): ProcurementProfile {
  if (!value || typeof value !== "object") {
    return DEFAULT_PROCUREMENT_PROFILE;
  }

  return {
    ...DEFAULT_PROCUREMENT_PROFILE,
    ...(value as Partial<ProcurementProfile>),
  };
}

function ensureSecureStorageSupport() {
  if (typeof window === "undefined" || !window.crypto?.subtle || !window.indexedDB) {
    throw new Error("Secure local profile storage is not available in this browser.");
  }
}

function openKeyDatabase(): Promise<IDBDatabase> {
  ensureSecureStorageSupport();

  return new Promise((resolve, reject) => {
    const openRequest = window.indexedDB.open(PROCUREMENT_KEY_DB_NAME, 1);

    openRequest.onupgradeneeded = () => {
      const db = openRequest.result;
      if (!db.objectStoreNames.contains(PROCUREMENT_KEY_STORE_NAME)) {
        db.createObjectStore(PROCUREMENT_KEY_STORE_NAME);
      }
    };
    openRequest.onsuccess = () => resolve(openRequest.result);
    openRequest.onerror = () => reject(openRequest.error ?? new Error("Failed to open secure storage."));
  });
}

function runKeyTransaction<T>(
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openKeyDatabase();
      const transaction = db.transaction(PROCUREMENT_KEY_STORE_NAME, mode);
      const store = transaction.objectStore(PROCUREMENT_KEY_STORE_NAME);
      handler(store, resolve, reject);
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => {
        db.close();
        reject(transaction.error ?? new Error("Secure storage transaction failed."));
      };
    } catch (error) {
      reject(error);
    }
  });
}

async function getStoredCryptoKey(username: string): Promise<CryptoKey | null> {
  return runKeyTransaction<CryptoKey | null>("readonly", (store, resolve, reject) => {
    const request = store.get(username);
    request.onsuccess = () => resolve((request.result as CryptoKey | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Failed to read secure profile key."));
  });
}

async function saveCryptoKey(username: string, key: CryptoKey): Promise<void> {
  return runKeyTransaction<void>("readwrite", (store, resolve, reject) => {
    const request = store.put(key, username);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to store secure profile key."));
  });
}

async function getOrCreateCryptoKey(username: string): Promise<CryptoKey> {
  const existing = await getStoredCryptoKey(username);
  if (existing) {
    return existing;
  }

  const created = await window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await saveCryptoKey(username, created);
  return created;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function decodeBase64(value: string): ArrayBuffer {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function isEncryptedEnvelope(value: unknown): value is EncryptedProfileEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    (value as EncryptedProfileEnvelope).version === 1 &&
    typeof (value as EncryptedProfileEnvelope).iv === "string" &&
    typeof (value as EncryptedProfileEnvelope).data === "string"
  );
}

async function encryptProfile(username: string, profile: ProcurementProfile): Promise<EncryptedProfileEnvelope> {
  const key = await getOrCreateCryptoKey(username);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(profile));
  const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  return {
    version: 1,
    iv: encodeBase64(iv),
    data: encodeBase64(new Uint8Array(encrypted)),
  };
}

async function decryptProfile(username: string, envelope: EncryptedProfileEnvelope): Promise<ProcurementProfile> {
  const key = await getOrCreateCryptoKey(username);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64(envelope.iv) },
    key,
    decodeBase64(envelope.data),
  );
  const parsed = JSON.parse(new TextDecoder().decode(decrypted)) as unknown;
  return normalizeProfile(parsed);
}

export async function loadStoredProcurementProfile(username: string): Promise<ProcurementProfile | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(getProcurementProfileStorageKey(username));
  if (!raw) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (isEncryptedEnvelope(parsed)) {
    return decryptProfile(username, parsed);
  }

  const migratedProfile = normalizeProfile(parsed);
  await saveStoredProcurementProfile(username, migratedProfile);
  return migratedProfile;
}

export async function saveStoredProcurementProfile(username: string, profile: ProcurementProfile): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const encrypted = await encryptProfile(username, profile);
  window.localStorage.setItem(getProcurementProfileStorageKey(username), JSON.stringify(encrypted));
}

async function fetchProcurement<T>(path: string, body?: Record<string, unknown>, method = "GET"): Promise<T> {
  const response = await authFetch(`${API_BASE_URL}/procurement/${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.detail || "Procurement request failed.");
  }

  return payload as T;
}

export async function fetchProcurementStatus() {
  return fetchProcurement<ProcurementStatus>("status");
}

export async function generateApplicationPair(body: Record<string, unknown>) {
  return fetchProcurement<GeneratedApplicationPairPayload>("generate-pair", body, "POST");
}

export async function generateCoverLetter(body: Record<string, unknown>) {
  return fetchProcurement<GeneratedDocumentPayload>("cover-letter", body, "POST");
}

export async function generateResume(body: Record<string, unknown>) {
  return fetchProcurement<GeneratedDocumentPayload>("resume", body, "POST");
}

export async function reviewResumeAts(body: Record<string, unknown>) {
  return fetchProcurement<AtsReviewPayload>("ats-review", body, "POST");
}

export async function saveGeneratedDocument(document: GeneratedDocumentPayload) {
  const response = await authFetch(`${API_BASE_URL}/documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: document.title,
      doc_type: document.doc_type,
      template_name: document.template_name,
      template_config: document.template_config,
      content: document.content,
      external_link: "",
    }),
  });

  const payload = (await response.json().catch(() => null)) as { id?: number; detail?: string } | null;
  if (!response.ok || typeof payload?.id !== "number") {
    throw new Error(payload?.detail || "Failed to save generated document.");
  }

  return payload.id;
}
