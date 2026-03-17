"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";
import DashboardLayout from "@/components/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { API_BASE_URL } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import {
  DEFAULT_DOCUMENT_TEMPLATE,
  DOCUMENT_TEMPLATE_OPTIONS,
  getStarterDocumentContent,
  smartFormatDocumentContent,
  type DocumentTemplateName,
} from "@/lib/documentTemplates";
import {
  type ApiDocument,
  downloadUploadedDocumentFile,
  downloadAsDocx,
  downloadAsPdf,
  fetchDocument,
  fetchDocumentFileBlob,
  fetchDocumentFileText,
  getFormattedDocumentHtml,
  getDocumentFileKind,
  getEmbeddableExternalLink,
  mapApiDocument,
  type DocumentRecord,
  type DocumentType,
} from "@/lib/documents";
import { requestNotificationsRefresh } from "@/lib/notifications";

type SaveFormState = {
  title: string;
  docType: DocumentType;
  templateName: DocumentTemplateName;
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
  const { isChecking, isAuthenticated } = useRequireAuth();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const isViewMode = mode === "view";
  const documentId = normalizeId(params.id);

  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [form, setForm] = useState<SaveFormState>({
    title: "",
    docType: "general",
    templateName: DEFAULT_DOCUMENT_TEMPLATE,
    externalLink: "",
    file: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerPdfUrl, setViewerPdfUrl] = useState<string | null>(null);
  const [viewerText, setViewerText] = useState<string | null>(null);
  const docxContainerRef = useRef<HTMLDivElement | null>(null);
  const lastSavedSnapshotRef = useRef("");
  const currentFileUrl = document?.fileUrl ?? null;
  const currentExternalLink = document?.externalLink ?? "";

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

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
        const shouldSeedStarter = !loaded.content && !loaded.fileUrl && !loaded.externalLink;
        const initialContent = shouldSeedStarter ? getStarterDocumentContent(loaded.docType, loaded.title) : loaded.content || "";
        setDocument(loaded);
        setForm({
          title: loaded.title,
          docType: loaded.docType,
          templateName: loaded.templateName,
          externalLink: loaded.externalLink,
          file: null,
        });
        editor?.commands.setContent(initialContent);
        setEditorContent(initialContent);
        lastSavedSnapshotRef.current = JSON.stringify({
          title: loaded.title,
          docType: loaded.docType,
          templateName: loaded.templateName,
          externalLink: loaded.externalLink,
          content: initialContent,
          fileName: "",
        });
      } catch (loadError) {
        console.error(loadError);
        setError("Could not load document.");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [documentId, editor, isAuthenticated]);

  const saveDocument = useCallback(async (showError = true) => {
    if (!documentId || !editor || !document) {
      return;
    }

    const snapshot = JSON.stringify({
      title: form.title.trim(),
      docType: form.docType,
      templateName: form.templateName,
      externalLink: form.externalLink.trim(),
      content: editorContent,
      fileName: form.file?.name ?? "",
    });

    if (!form.file && snapshot === lastSavedSnapshotRef.current) {
      return;
    }

    try {
      setIsSaving(true);
      const payload = new FormData();
      payload.append("title", form.title.trim());
      payload.append("doc_type", form.docType);
      payload.append("template_name", form.templateName);
      payload.append("external_link", form.externalLink.trim());
      payload.append("content", editorContent);

      if (form.file) {
        payload.append("file", form.file);
      }

      const token = getAuthToken();
      if (!token) {
        throw new Error("Login required.");
      }

      const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: payload,
      });

      if (!response.ok) {
        throw new Error("Failed to save document");
      }

      const saved = mapApiDocument((await response.json()) as ApiDocument);
      const shouldSyncEditorFromUpload = Boolean(form.file) && saved.content.trim().length > 0 && saved.content !== editorContent;
      const nextEditorContent = shouldSyncEditorFromUpload ? saved.content : editorContent;

      if (shouldSyncEditorFromUpload) {
        editor.commands.setContent(saved.content);
        setEditorContent(saved.content);
      }

      setDocument(saved);
      setForm({
        title: saved.title,
        docType: saved.docType,
        templateName: saved.templateName,
        externalLink: saved.externalLink,
        file: null,
      });
      setLastSavedAt(new Date(saved.updatedAt).toLocaleTimeString());
      lastSavedSnapshotRef.current = JSON.stringify({
        title: saved.title,
        docType: saved.docType,
        templateName: saved.templateName,
        externalLink: saved.externalLink,
        content: nextEditorContent,
        fileName: "",
      });
      setError(null);
      requestNotificationsRefresh();
    } catch (saveError) {
      console.error(saveError);
      if (showError) {
        setError("Could not save document.");
      }
    } finally {
      setIsSaving(false);
    }
  }, [documentId, editor, document, form.title, form.docType, form.templateName, form.externalLink, form.file, editorContent]);

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
    if (!editor || !document) {
      return;
    }

    const timer = window.setTimeout(() => {
      void saveDocument(false);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [editorContent, form.title, form.docType, form.templateName, form.externalLink, form.file, documentId, editor, document, saveDocument]);

  const shouldUseLiveContentPreview = editorContent.trim().length > 0 || (!currentFileUrl && !currentExternalLink);
  const formattedPreviewHtml = getFormattedDocumentHtml({
    title: form.title || document?.title || "Document",
    docType: form.docType,
    templateName: form.templateName,
    htmlContent: editorContent,
  });

  useEffect(() => {
    if (!documentId) {
      return;
    }

    if (shouldUseLiveContentPreview) {
      setViewerError(null);
      setViewerPdfUrl(null);
      setViewerText(null);
      if (docxContainerRef.current) {
        docxContainerRef.current.innerHTML = "";
      }
      return;
    }

    setViewerError(null);
    setViewerText(null);
    if (docxContainerRef.current) {
      docxContainerRef.current.innerHTML = "";
    }

    let objectUrl: string | null = null;

    async function loadViewer() {
      if (currentExternalLink) {
        setViewerPdfUrl(null);
        return;
      }

      if (!currentFileUrl) {
        setViewerPdfUrl(null);
        return;
      }

      const fileKind = getDocumentFileKind(currentFileUrl);
      try {
        if (fileKind === "pdf") {
          const fileBlob = await fetchDocumentFileBlob(currentFileUrl);
          objectUrl = URL.createObjectURL(fileBlob);
          setViewerPdfUrl(objectUrl);
          return;
        }

        if (fileKind === "txt") {
          const text = await fetchDocumentFileText(currentFileUrl);
          setViewerText(text);
          setViewerPdfUrl(null);
          return;
        }

        if (fileKind === "docx") {
          const fileBlob = await fetchDocumentFileBlob(currentFileUrl);
          setViewerPdfUrl(null);
          if (docxContainerRef.current) {
            await renderAsync(fileBlob, docxContainerRef.current);
          }
          return;
        }

        setViewerPdfUrl(null);
      } catch (loadError) {
        console.error(loadError);
        setViewerError("Preview is unavailable for this document.");
      }
    }

    void loadViewer();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [currentExternalLink, currentFileUrl, shouldUseLiveContentPreview, documentId]);

  return (
    isChecking || !isAuthenticated ? (
      <main className="ll-page flex items-center justify-center">
        <p className="ll-muted">Checking access...</p>
      </main>
    ) : (
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
            <div className={`grid gap-6 ${isViewMode ? "xl:grid-cols-[0.95fr_1.05fr]" : ""}`}>
              <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Editor</h3>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      Changes update the preview instantly and autosave in the background.
                    </p>
                  </div>
                  {isViewMode && (
                    <Link
                      href={`/documents/${document.id}`}
                      className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    >
                      Standard layout
                    </Link>
                  )}
                </div>

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

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Template</span>
                    <select
                      value={form.templateName}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, templateName: event.target.value as DocumentTemplateName }))
                      }
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      {DOCUMENT_TEMPLATE_OPTIONS.map((template) => (
                        <option key={template.name} value={template.name}>
                          {template.label}
                        </option>
                      ))}
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
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Uploaded files are imported into the editor on save so you can keep editing them here.
                    </p>
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
                  <button
                    type="button"
                    onClick={() => {
                      const smartContent = smartFormatDocumentContent(form.docType, editorContent, form.title || document.title);
                      editor.commands.setContent(smartContent);
                      setEditorContent(smartContent);
                    }}
                    className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                  >
                    Smart Format
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const starterContent = getStarterDocumentContent(form.docType, form.title || document.title);
                      editor.commands.setContent(starterContent);
                      setEditorContent(starterContent);
                    }}
                    className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                  >
                    Apply starter layout
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
                    onClick={() =>
                      void downloadAsPdf({
                        title: form.title || document.title,
                        docType: form.docType,
                        templateName: form.templateName,
                        htmlContent: editorContent,
                      })
                    }
                    className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    Download PDF
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void downloadAsDocx({
                        title: form.title || document.title,
                        docType: form.docType,
                        templateName: form.templateName,
                        htmlContent: editorContent,
                      })
                    }
                    className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    Download DOCX
                  </button>

                  <Link
                    href={`/documents/${document.id}?mode=view`}
                    className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    Open Viewer
                  </Link>

                  {lastSavedAt && <span className="text-xs text-zinc-500 dark:text-zinc-400">Last saved {lastSavedAt}</span>}
                </div>
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Live Preview</h3>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      This panel updates while you type. Template styling here is the same layout used for PDF and DOCX exports.
                    </p>
                  </div>
                  {!isViewMode && (
                    <Link
                      href={`/documents/${document.id}?mode=view`}
                      className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    >
                      Focus preview
                    </Link>
                  )}
                </div>
                <div className="mt-4">
                  {shouldUseLiveContentPreview ? (
                    <article className="ll-document-preview-shell overflow-x-auto rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                      <div dangerouslySetInnerHTML={{ __html: formattedPreviewHtml }} />
                    </article>
                  ) : document.externalLink ? (
                    <div className="space-y-3">
                      <iframe
                        title="Document Viewer"
                        src={getEmbeddableExternalLink(document.externalLink)}
                        className="h-[560px] w-full rounded-xl border border-zinc-200 dark:border-zinc-700"
                      />
                      <a
                        href={document.externalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                      >
                        Open original link
                      </a>
                    </div>
                  ) : viewerPdfUrl ? (
                    <iframe
                      title="Document Viewer"
                      src={viewerPdfUrl}
                      className="h-[560px] w-full rounded-xl border border-zinc-200 dark:border-zinc-700"
                    />
                  ) : viewerText ? (
                    <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-200">
                      {viewerText}
                    </pre>
                  ) : document.fileUrl && getDocumentFileKind(document.fileUrl) === "docx" ? (
                    <div className="space-y-3">
                      <div
                        ref={docxContainerRef}
                        className="min-h-[560px] overflow-auto rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <button
                        type="button"
                        onClick={() => void downloadUploadedDocumentFile(document)}
                        className="inline-flex rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                      >
                        Download original DOCX
                      </button>
                    </div>
                  ) : viewerError ? (
                    <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      {viewerError}
                    </p>
                  ) : (
                    <article className="ll-document-preview-shell overflow-x-auto rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                      <div dangerouslySetInnerHTML={{ __html: formattedPreviewHtml }} />
                    </article>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
    )
  );
}
