"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/api";
import { downloadAsDocx, downloadAsPdf, fetchDocument, type DocumentRecord, type DocumentType } from "@/lib/documents";

type SaveFormState = {
  title: string;
  docType: DocumentType;
  externalLink: string;
  file: File | null;
};

function normalizeId(value: string | string[] | undefined): number | null {
  if (!value) {
    return null;
  }

  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
}

export default function DocumentEditorPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const documentId = normalizeId(params.id);

  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [form, setForm] = useState<SaveFormState>({
    title: "",
    docType: "general",
    externalLink: "",
    file: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState("");

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    immediatelyRender: false,
  });

  useEffect(() => {
    const currentDocumentId = documentId;
    if (!currentDocumentId) {
      setError("Invalid document id.");
      return;
    }
    const safeDocumentId = currentDocumentId;

    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        const loaded = await fetchDocument(safeDocumentId);
        setDocument(loaded);
        setForm({
          title: loaded.title,
          docType: loaded.docType,
          externalLink: loaded.externalLink,
          file: null,
        });
        editor?.commands.setContent(loaded.content || "");
        setEditorContent(loaded.content || "");
      } catch (loadError) {
        console.error(loadError);
        setError("Could not load document.");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [documentId, editor]);

  const saveDocument = useCallback(async (showError = true) => {
    if (!documentId || !editor || !document) {
      return;
    }

    try {
      setIsSaving(true);
      const payload = new FormData();
      payload.append("title", form.title.trim());
      payload.append("doc_type", form.docType);
      payload.append("external_link", form.externalLink.trim());
      payload.append("content", editorContent);

      if (form.file) {
        payload.append("file", form.file);
      }

      const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
        method: "PUT",
        body: payload,
      });

      if (!response.ok) {
        throw new Error("Failed to save document");
      }

      const refreshed = await fetchDocument(documentId);
      setDocument(refreshed);
      setForm((current) => ({ ...current, file: null }));
      setLastSavedAt(new Date().toLocaleTimeString());
      setError(null);
    } catch (saveError) {
      console.error(saveError);
      if (showError) {
        setError("Could not save document.");
      }
    } finally {
      setIsSaving(false);
    }
  }, [documentId, editor, document, form.title, form.docType, form.externalLink, form.file, editorContent]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const onUpdate = () => setEditorContent(editor.getHTML());
    editor.on("update", onUpdate);
    onUpdate();

    return () => {
      editor.off("update", onUpdate);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || !document || mode === "view") {
      return;
    }

    const timer = window.setTimeout(() => {
      void saveDocument(false);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [editorContent, mode, documentId, editor, document, saveDocument]);

  const viewerUrl = useMemo(() => {
    if (!document) {
      return null;
    }

    if (document.externalLink) {
      return document.externalLink;
    }

    return document.fileUrl;
  }, [document]);

  return (
    <DashboardLayout title="Document Editor">
      <div className="space-y-6">
        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </p>
        )}

        {isLoading || !document || !editor ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading document...</p>
        ) : (
          <>
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Title</span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Type</span>
                  <select
                    value={form.docType}
                    onChange={(event) => setForm((prev) => ({ ...prev, docType: event.target.value as DocumentType }))}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <option value="general">General</option>
                    <option value="resume">Resume</option>
                    <option value="cover_letter">Cover Letter</option>
                  </select>
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">External Link</span>
                  <input
                    type="url"
                    value={form.externalLink}
                    onChange={(event) => setForm((prev) => ({ ...prev, externalLink: event.target.value }))}
                    placeholder="https://docs.google.com/..."
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Replace File (PDF, DOCX, TXT)</span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, file: event.target.files && event.target.files[0] ? event.target.files[0] : null }))
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-xs file:font-medium dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:file:bg-zinc-800"
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void editor.chain().focus().toggleBold().run()}
                  className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                >
                  Bold
                </button>
                <button
                  type="button"
                  onClick={() => void editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                >
                  H2
                </button>
                <button
                  type="button"
                  onClick={() => void editor.chain().focus().toggleBulletList().run()}
                  className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                >
                  Bullet List
                </button>
                <button
                  type="button"
                  onClick={() => void editor.chain().focus().toggleOrderedList().run()}
                  className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                >
                  Ordered List
                </button>
              </div>

              <div className="mt-4 min-h-56 rounded-xl border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                <EditorContent editor={editor} />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void saveDocument(true)}
                  disabled={isSaving}
                  className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>

                <button
                  type="button"
                  onClick={() => void downloadAsPdf(form.title || document.title, editorContent)}
                  className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  Download PDF
                </button>

                <button
                  type="button"
                  onClick={() => void downloadAsDocx(form.title || document.title, editorContent)}
                  className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  Download DOCX
                </button>

                {lastSavedAt && <span className="text-xs text-zinc-500 dark:text-zinc-400">Last saved {lastSavedAt}</span>}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Viewer</h3>
              <div className="mt-4">
                {viewerUrl ? (
                  <iframe
                    title="Document Viewer"
                    src={viewerUrl}
                    className="h-[460px] w-full rounded-xl border border-zinc-200 dark:border-zinc-700"
                  />
                ) : (
                  <article className="prose max-w-none rounded-xl border border-zinc-200 p-4 dark:prose-invert dark:border-zinc-700">
                    <div dangerouslySetInnerHTML={{ __html: editorContent || "<p>No content yet.</p>" }} />
                  </article>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
