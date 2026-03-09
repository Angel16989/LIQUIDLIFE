import { saveAs } from "file-saver";
import { Document, Packer, Paragraph } from "docx";
import { jsPDF } from "jspdf";
import { API_BASE_URL } from "@/lib/api";

export type DocumentType = "general" | "resume" | "cover_letter";

export type DocumentRecord = {
  id: number;
  title: string;
  docType: DocumentType;
  content: string;
  fileUrl: string | null;
  externalLink: string;
  createdAt: string;
  updatedAt: string;
};

type ApiDocument = {
  id: number;
  title: string;
  doc_type: DocumentType;
  content: string;
  file_url: string | null;
  external_link: string;
  created_at: string;
  updated_at: string;
};

export function mapApiDocument(item: ApiDocument): DocumentRecord {
  return {
    id: item.id,
    title: item.title,
    docType: item.doc_type,
    content: item.content || "",
    fileUrl: item.file_url || null,
    externalLink: item.external_link || "",
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export function stripHtml(html: string): string {
  if (!html) {
    return "";
  }

  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*\/p\s*>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export async function fetchDocuments(): Promise<DocumentRecord[]> {
  const response = await fetch(`${API_BASE_URL}/documents`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch documents");
  }

  const data = (await response.json()) as ApiDocument[];
  return data.map(mapApiDocument);
}

export async function fetchDocument(id: number): Promise<DocumentRecord> {
  const response = await fetch(`${API_BASE_URL}/documents/${id}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch document");
  }

  const data = (await response.json()) as ApiDocument;
  return mapApiDocument(data);
}

export async function downloadAsPdf(title: string, htmlContent: string) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const text = stripHtml(htmlContent) || "No content";
  const wrapped = pdf.splitTextToSize(text, 500);
  pdf.setFontSize(12);
  pdf.text(wrapped, 56, 72);
  pdf.save(`${title || "document"}.pdf`);
}

export async function downloadAsDocx(title: string, htmlContent: string) {
  const text = stripHtml(htmlContent) || "No content";
  const lines = text.split("\n").filter(Boolean);
  const paragraphs = lines.length > 0 ? lines.map((line) => new Paragraph(line)) : [new Paragraph("No content")];

  const doc = new Document({
    sections: [{ properties: {}, children: paragraphs }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${title || "document"}.docx`);
}
