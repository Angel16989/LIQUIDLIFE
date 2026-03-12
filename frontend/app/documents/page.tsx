"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/api";
import { type DocumentRecord, type DocumentType, downloadAsPdf, fetchDocuments } from "@/lib/documents";

type CreateFormState = {
  title: string;
  docType: DocumentType;
  content: string;
  externalLink: string;
  file: File | null;
};

const initialFormState: CreateFormState = {
  title: "",
  docType: "general",
  content: "",
  externalLink: "",
  file: null,
};

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function buildFormData(form: CreateFormState): FormData {
  const data = new FormData();
  data.append("title", form.title.trim());
  data.append("doc_type", form.docType);
  data.append("content", form.content);
  data.append("external_link", form.externalLink.trim());

  if (form.file) {
    data.append("file", form.file);
  }

  return data;
}

function getDocTypeLabel(docType: DocumentType): string {
  if (docType === "resume") {
    return "Resume";
  }

  if (docType === "cover_letter") {
    return "Cover Letter";
  }

  return "General";
}

function DocumentCard({
  document,
  onDelete,
  onDownload,
}: {
  document: DocumentRecord;
  onDelete: (id: number) => Promise<void>;
  onDownload: (document: DocumentRecord) => Promise<void>;
}) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{document.title}</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {getDocTypeLabel(document.docType)} • Updated {formatTimestamp(document.updatedAt)}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/documents/${document.id}`}
          className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Edit
        </Link>

        <Link
          href={`/documents/${document.id}?mode=view`}
          className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          View
        </Link>

        <button
          type="button"
          onClick={() => void onDownload(document)}
          className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Download
        </button>

        <button
          type="button"
          onClick={() => void onDelete(document.id)}
          className="px-2.5 py-1 text-xs font-medium text-red-600 hover:underline"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateFormState>(initialFormState);

  async function loadDocuments() {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchDocuments();
      setDocuments(data);
    } catch (loadError) {
      console.error(loadError);
      setError("Could not load documents.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

  const sortedDocuments = useMemo(
    () => [...documents].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [documents],
  );

  async function handleCreateDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/documents`, {
        method: "POST",
        body: buildFormData(form),
      });

      if (!response.ok) {
        throw new Error("Failed to create document");
      }

      setForm(initialFormState);
      await loadDocuments();
    } catch (createError) {
      console.error(createError);
      setError("Could not create document.");
    }
  }

  async function handleDeleteDocument(id: number) {
    const shouldDelete = window.confirm("Delete this document?");
    if (!shouldDelete) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 204) {
        throw new Error("Failed to delete document");
      }

      setDocuments((current) => current.filter((item) => item.id !== id));
    } catch (deleteError) {
      console.error(deleteError);
      setError("Could not delete document.");
    }
  }

  async function handleDownloadDocument(document: DocumentRecord) {
    if (document.fileUrl) {
      window.open(document.fileUrl, "_blank", "noopener,noreferrer");
      return;
    }

    await downloadAsPdf(document.title, document.content);
  }

  return (
    <DashboardLayout title="Documents">
      <div className="space-y-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Create or Upload Document</h3>
          {error && (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </p>
          )}

          <form onSubmit={handleCreateDocument} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Title</span>
              <input
                type="text"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Frontend Resume v3"
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Type</span>
              <select
                value={form.docType}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, docType: event.target.value as DocumentType }))
                }
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="general">General</option>
                <option value="resume">Resume</option>
                <option value="cover_letter">Cover Letter</option>
              </select>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">External Link (Optional)</span>
              <input
                type="url"
                value={form.externalLink}
                onChange={(event) => setForm((prev) => ({ ...prev, externalLink: event.target.value }))}
                placeholder="https://docs.google.com/..."
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Upload File (PDF, DOCX, TXT)</span>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, file: event.target.files && event.target.files[0] ? event.target.files[0] : null }))
                }
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-xs file:font-medium dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:file:bg-zinc-800"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Initial Content</span>
              <textarea
                value={form.content}
                onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                rows={6}
                placeholder="Write document content now, or open the editor after creating..."
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 md:col-span-2 md:w-fit dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Save Document
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">All Documents</h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Universal document center for general docs, resumes, and cover letters.
          </p>
          <div className="mt-4 space-y-3">
            {sortedDocuments.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onDelete={handleDeleteDocument}
                onDownload={handleDownloadDocument}
              />
            ))}
            {!isLoading && sortedDocuments.length === 0 && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No documents yet.</p>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
