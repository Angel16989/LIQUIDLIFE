"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type StudyEntry = {
  id: number;
  title: string;
  content: string;
  tags: string;
  createdAt: string;
};

const STORAGE_KEY = "liquid-life-study-entries";

const initialEntries: StudyEntry[] = [
  {
    id: 1,
    title: "Async UI Patterns",
    content: "Learned how optimistic updates can keep interfaces responsive while background requests complete.",
    tags: "react, ux",
    createdAt: new Date("2026-03-07T09:00:00.000Z").toISOString(),
  },
];

export default function LearningPage() {
  const [entries, setEntries] = useState<StudyEntry[]>(initialEntries);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    const savedValue = window.localStorage.getItem(STORAGE_KEY);

    if (savedValue) {
      try {
        const parsed = JSON.parse(savedValue) as StudyEntry[];
        if (Array.isArray(parsed)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setEntries(parsed);
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
    () => [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
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
      const newEntry: StudyEntry = {
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

  function handleEdit(entry: StudyEntry) {
    setEditingId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setTags(entry.tags);
  }

  function handleDelete(id: number) {
    const shouldDelete = window.confirm("Delete this study entry?");

    if (!shouldDelete) {
      return;
    }

    setEntries((current) => current.filter((entry) => entry.id !== id));

    if (editingId === id) {
      resetForm();
    }
  }

  return (
    <main className="ll-page px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 ll-panel p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] ll-muted">Study</p>
            <h1 className="mt-2 text-3xl font-semibold">Learning Journal</h1>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-white/55 px-3 py-2 text-sm text-[#2b244d] transition hover:bg-white/85"
          >
            Back to Hub
          </Link>
        </header>

        <section className="ll-panel p-5">
          <h2 className="text-lg font-semibold ll-title">{editingId === null ? "Add Study Entry" : "Edit Study Entry"}</h2>

          <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              type="text"
              placeholder="What did I study today?"
              className="w-full rounded-xl border border-white/55 bg-white/90 px-3 py-2 text-sm ll-title outline-none ring-zinc-500 transition focus:ring-2"
              required
            />
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={5}
              placeholder="Write your study notes..."
              className="w-full rounded-xl border border-white/55 bg-white/90 px-3 py-2 text-sm ll-title outline-none ring-zinc-500 transition focus:ring-2"
              required
            />
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              type="text"
              placeholder="tags: algorithms, react"
              className="w-full rounded-xl border border-white/55 bg-white/90 px-3 py-2 text-sm ll-title outline-none ring-zinc-500 transition focus:ring-2"
            />

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-300"
              >
                {editingId === null ? "Save Entry" : "Update Entry"}
              </button>
              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-sm font-medium ll-muted hover:underline"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="ll-panel p-5">
          <h2 className="text-lg font-semibold ll-title">Study Timeline</h2>
          <div className="mt-4 space-y-3">
            {orderedEntries.map((entry) => (
              <article key={entry.id} className="rounded-xl border border-white/50 bg-white/65 p-4">
                <p className="text-sm font-semibold ll-title">{entry.title}</p>
                <p className="mt-2 text-sm leading-6 ll-muted">{entry.content}</p>
                <p className="mt-2 text-xs ll-muted">
                  {new Date(entry.createdAt).toLocaleString()} {entry.tags ? `• ${entry.tags}` : ""}
                </p>

                <div className="mt-3 flex flex-wrap gap-3">
                  <button type="button" onClick={() => handleEdit(entry)} className="text-xs font-medium text-[#2b244d] hover:underline">
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(entry.id)} className="text-xs font-medium text-red-500 hover:underline">
                    Delete
                  </button>
                </div>
              </article>
            ))}
            {orderedEntries.length === 0 && <p className="text-sm ll-muted">No study entries yet.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
