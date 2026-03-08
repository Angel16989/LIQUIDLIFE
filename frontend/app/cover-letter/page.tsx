"use client";

import { FormEvent, useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

type CoverLetterItem = {
  id: number;
  title: string;
  company: string;
  content: string;
};

const STORAGE_KEY = "liquid-life-cover-letters";

const initialCoverLetters: CoverLetterItem[] = [
  {
    id: 1,
    title: "General Product Engineer",
    company: "",
    content:
      "I am excited to apply for the Product Engineer role. I enjoy building user-focused features and collaborating across product, design, and engineering.",
  },
];

function parseSavedCoverLetters(value: string | null): CoverLetterItem[] | null {
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return null;
    }

    const normalized: CoverLetterItem[] = [];

    for (const item of parsed) {
      if (typeof item !== "object" || item === null) {
        continue;
      }

      if (!("id" in item) || typeof item.id !== "number") {
        continue;
      }

      if (!("title" in item) || typeof item.title !== "string") {
        continue;
      }

      if (!("company" in item) || typeof item.company !== "string") {
        continue;
      }

      if (!("content" in item) || typeof item.content !== "string") {
        continue;
      }

      normalized.push({
        id: item.id,
        title: item.title,
        company: item.company,
        content: item.content,
      });
    }

    return normalized;
  } catch {
    return null;
  }
}

export default function CoverLetterPage() {
  const [coverLetters, setCoverLetters] = useState<CoverLetterItem[]>(initialCoverLetters);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    const saved = parseSavedCoverLetters(window.localStorage.getItem(STORAGE_KEY));

    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCoverLetters(saved);
    }

    setHasLoadedFromStorage(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedFromStorage) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(coverLetters));
  }, [coverLetters, hasLoadedFromStorage]);

  function resetForm() {
    setTitle("");
    setCompany("");
    setContent("");
    setEditingId(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextTitle = title.trim();
    const nextCompany = company.trim();
    const nextContent = content.trim();

    if (!nextTitle || !nextContent) {
      return;
    }

    if (editingId === null) {
      const newCoverLetter: CoverLetterItem = {
        id: Date.now(),
        title: nextTitle,
        company: nextCompany,
        content: nextContent,
      };

      setCoverLetters((current) => [newCoverLetter, ...current]);
      resetForm();
      return;
    }

    setCoverLetters((current) =>
      current.map((item) =>
        item.id === editingId
          ? {
              ...item,
              title: nextTitle,
              company: nextCompany,
              content: nextContent,
            }
          : item,
      ),
    );
    resetForm();
  }

  function handleEdit(item: CoverLetterItem) {
    setEditingId(item.id);
    setTitle(item.title);
    setCompany(item.company);
    setContent(item.content);
  }

  function handleDelete(id: number) {
    const shouldDelete = window.confirm("Delete this cover letter template?");

    if (!shouldDelete) {
      return;
    }

    setCoverLetters((current) => current.filter((item) => item.id !== id));

    if (editingId === id) {
      resetForm();
    }
  }

  async function handleCopy(item: CoverLetterItem) {
    const copyText = `${item.title}${item.company ? `\n${item.company}` : ""}\n\n${item.content}`;

    try {
      await navigator.clipboard.writeText(copyText);
    } catch {
      window.alert("Copy failed. Please copy manually.");
    }
  }

  return (
    <DashboardLayout title="Cover Letter">
      <div className="space-y-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {editingId === null ? "Create Cover Letter Template" : "Edit Cover Letter Template"}
          </h3>

          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                type="text"
                placeholder="Backend Engineer Application"
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Company (Optional)</span>
              <input
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                type="text"
                placeholder="Figma"
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Cover Letter Content</span>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={8}
                placeholder="Write your cover letter template here..."
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                required
              />
            </label>

            <div className="flex flex-wrap items-center gap-3 md:col-span-2">
              <button
                type="submit"
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                {editingId === null ? "Save Template" : "Update Template"}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-sm font-medium text-zinc-600 hover:underline dark:text-zinc-300"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Saved Cover Letters</h3>

          <div className="mt-4 space-y-3">
            {coverLetters.map((item) => (
              <article key={item.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{item.company || "No company"}</p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    className="text-xs font-medium text-zinc-700 hover:underline dark:text-zinc-200"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(item)}
                    className="inline-flex rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Copy
                  </button>
                </div>
              </article>
            ))}

            {coverLetters.length === 0 && (
              <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                No cover letter templates saved yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
