"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

type ResumeItem = {
  id: number;
  title: string;
  notes: string;
  resumeUrl: string;
};

const STORAGE_KEY = "liquid-life-resumes";

const initialResumes: ResumeItem[] = [
  {
    id: 1,
    title: "Frontend Resume",
    notes: "Tailored for product engineering roles.",
    resumeUrl: "https://drive.google.com",
  },
];

function parseSavedResumes(value: string | null): ResumeItem[] | null {
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return null;
    }

    const normalized: ResumeItem[] = [];

    for (const resume of parsed) {
      if (typeof resume !== "object" || resume === null) {
        continue;
      }

      if (!("id" in resume) || typeof resume.id !== "number") {
        continue;
      }

      if (!("title" in resume) || typeof resume.title !== "string") {
        continue;
      }

      if (!("notes" in resume) || typeof resume.notes !== "string") {
        continue;
      }

      if (!("resumeUrl" in resume) || typeof resume.resumeUrl !== "string") {
        continue;
      }

      normalized.push({
        id: resume.id,
        title: resume.title,
        notes: resume.notes,
        resumeUrl: resume.resumeUrl,
      });
    }

    return normalized;
  } catch {
    return null;
  }
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export default function ResumePage() {
  const [resumes, setResumes] = useState<ResumeItem[]>(initialResumes);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");

  useEffect(() => {
    const saved = parseSavedResumes(window.localStorage.getItem(STORAGE_KEY));
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResumes(saved);
    }
    setHasLoadedFromStorage(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedFromStorage) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes));
  }, [resumes, hasLoadedFromStorage]);

  function handleAddResume(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextResume: ResumeItem = {
      id: Date.now(),
      title: title.trim(),
      notes: notes.trim(),
      resumeUrl: normalizeUrl(resumeUrl),
    };

    if (!nextResume.title || !nextResume.resumeUrl) {
      return;
    }

    setResumes((current) => [nextResume, ...current]);
    setTitle("");
    setNotes("");
    setResumeUrl("");
  }

  function handleDeleteResume(id: number) {
    const shouldDelete = window.confirm("Delete this resume?");

    if (!shouldDelete) {
      return;
    }

    setResumes((current) => current.filter((resume) => resume.id !== id));
  }

  return (
    <DashboardLayout title="Resume">
      <div className="space-y-6">
        <section className="ll-panel flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] ll-muted">AI Tailoring</p>
            <h2 className="mt-2 text-xl font-semibold ll-title">Need a job-specific resume?</h2>
            <p className="mt-2 text-sm ll-muted">
              Open Procurement to store your profile locally, paste a job description, and generate a tailored resume.
            </p>
          </div>
          <Link
            href="/procurement"
            className="rounded-lg bg-[#4f3f85] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Open Procurement
          </Link>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Add Resume</h3>
          <form onSubmit={handleAddResume} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Resume Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                type="text"
                placeholder="Backend Engineer Resume"
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Resume URL</span>
              <input
                value={resumeUrl}
                onChange={(event) => setResumeUrl(event.target.value)}
                type="text"
                placeholder="https://drive.google.com/..."
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                required
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Notes</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Who this version is tailored for..."
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 md:col-span-2 md:w-fit dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Save Resume
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Saved Resumes</h3>

          <div className="mt-4 space-y-3">
            {resumes.map((resume) => (
              <article
                key={resume.id}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/60"
              >
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{resume.title}</p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{resume.notes || "No notes"}</p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <a
                    href={resume.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Open Resume
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDeleteResume(resume.id)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}

            {resumes.length === 0 && (
              <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                No resumes saved yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
