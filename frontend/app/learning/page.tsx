"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

type LearningEntry = {
  id: number;
  title: string;
  content: string;
  tags: string;
  createdAt: string;
};

const STORAGE_KEY = "liquid-life-learning-entries";

const dailyTechBrief = [
  "TypeScript 5.x improvements are increasing type-checking performance in larger codebases.",
  "The React ecosystem is leaning more into server components and streaming-first data flows.",
  "AI-assisted developer tooling is improving test generation and code review speed.",
];

const initialEntries: LearningEntry[] = [
  {
    id: 1,
    title: "Async UI Patterns",
    content: "Learned how optimistic updates can keep interfaces responsive while background requests complete.",
    tags: "react, ux",
    createdAt: new Date("2026-03-07T09:00:00.000Z").toISOString(),
  },
];

export default function LearningPage() {
  const [entries, setEntries] = useState<LearningEntry[]>(initialEntries);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    const savedValue = window.localStorage.getItem(STORAGE_KEY);

    if (savedValue) {
      try {
        const parsed: unknown = JSON.parse(savedValue);

        if (Array.isArray(parsed)) {
          const normalized: LearningEntry[] = [];

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
            if (!("content" in item) || typeof item.content !== "string") {
              continue;
            }
            if (!("tags" in item) || typeof item.tags !== "string") {
              continue;
            }
            if (!("createdAt" in item) || typeof item.createdAt !== "string") {
              continue;
            }

            normalized.push({
              id: item.id,
              title: item.title,
              content: item.content,
              tags: item.tags,
              createdAt: item.createdAt,
            });
          }

          // eslint-disable-next-line react-hooks/set-state-in-effect
          setEntries(normalized);
        }
      } catch {
        // Keep defaults if parsing fails.
      }
    }

    setHasLoadedFromStorage(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedFromStorage) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, hasLoadedFromStorage]);

  const orderedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [entries],
  );

  function resetForm() {
    setTitle("");
    setContent("");
    setTags("");
    setEditingId(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextTitle = title.trim();
    const nextContent = content.trim();
    const nextTags = tags.trim();

    if (!nextTitle || !nextContent) {
      return;
    }

    if (editingId === null) {
      const newEntry: LearningEntry = {
        id: Date.now(),
        title: nextTitle,
        content: nextContent,
        tags: nextTags,
        createdAt: new Date().toISOString(),
      };

      setEntries((current) => [newEntry, ...current]);
      resetForm();
      return;
    }

    setEntries((current) =>
      current.map((entry) =>
        entry.id === editingId
          ? {
              ...entry,
              title: nextTitle,
              content: nextContent,
              tags: nextTags,
            }
          : entry,
      ),
    );
    resetForm();
  }

  function handleEdit(entry: LearningEntry) {
    setEditingId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setTags(entry.tags);
  }

  function handleDelete(id: number) {
    const shouldDelete = window.confirm("Delete this learning entry?");

    if (!shouldDelete) {
      return;
    }

    setEntries((current) => current.filter((entry) => entry.id !== id));

    if (editingId === id) {
      resetForm();
    }
  }

  return (
    <DashboardLayout title="Learning">
      <div className="space-y-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Daily Tech Brief</h3>
          <ul className="mt-4 space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
            {dailyTechBrief.map((item) => (
              <li
                key={item}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 leading-6 dark:border-zinc-800 dark:bg-zinc-900/70"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {editingId === null ? "Add Learning Entry" : "Edit Learning Entry"}
          </h3>

          <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                type="text"
                placeholder="What did I explore today?"
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Content</span>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={6}
                placeholder="What I learned today..."
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tags (Optional)</span>
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                type="text"
                placeholder="react, system-design, debugging"
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                {editingId === null ? "Save Entry" : "Update Entry"}
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
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Learning Journal</h3>
          <div className="mt-4 space-y-3">
            {orderedEntries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/60"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{entry.title}</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleEdit(entry)}
                      className="text-xs font-medium text-zinc-700 hover:underline dark:text-zinc-200"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">{entry.content}</p>
                {entry.tags && (
                  <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Tags: {entry.tags}</p>
                )}
              </article>
            ))}

            {orderedEntries.length === 0 && (
              <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                No learning entries yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
