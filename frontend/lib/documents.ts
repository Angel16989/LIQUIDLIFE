import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  type ParagraphChild,
  TextRun,
  UnderlineType,
} from "docx";
import { jsPDF } from "jspdf";
import { API_BASE_URL } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import {
  DEFAULT_DOCUMENT_TEMPLATE,
  ensureDocumentBodyContent,
  getDocumentTypeLabel,
  normalizeDocumentContentInput,
  normalizeDocumentTemplateName,
  renderDocumentTemplateHtml,
  type DocumentTemplateName,
} from "@/lib/documentTemplates";

export type DocumentType = "general" | "resume" | "cover_letter";

export type DocumentRecord = {
  id: number;
  title: string;
  docType: DocumentType;
  templateName: DocumentTemplateName;
  content: string;
  fileUrl: string | null;
  externalLink: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentFileKind = "pdf" | "docx" | "txt" | "unknown" | null;

export type ApiDocument = {
  id: number;
  title: string;
  doc_type: DocumentType;
  template_name?: string | null;
  content: string;
  file_url: string | null;
  external_link: string;
  created_at: string;
  updated_at: string;
};

type ExportDocumentOptions = {
  title: string;
  docType: DocumentType;
  templateName: DocumentTemplateName;
  htmlContent: string;
};

type InlineFormatting = {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
};

type DocxTemplateConfig = {
  accentColor: string;
  kickerAlignment: (typeof AlignmentType)[keyof typeof AlignmentType];
  titleAlignment: (typeof AlignmentType)[keyof typeof AlignmentType];
  titleSize: number;
};

const DOCX_TEMPLATE_CONFIGS: Record<DocumentTemplateName, DocxTemplateConfig> = {
  balanced: {
    accentColor: "3D5FA8",
    kickerAlignment: AlignmentType.LEFT,
    titleAlignment: AlignmentType.LEFT,
    titleSize: 34,
  },
  executive: {
    accentColor: "2F4C7C",
    kickerAlignment: AlignmentType.CENTER,
    titleAlignment: AlignmentType.CENTER,
    titleSize: 38,
  },
  minimal: {
    accentColor: "3B556B",
    kickerAlignment: AlignmentType.LEFT,
    titleAlignment: AlignmentType.LEFT,
    titleSize: 30,
  },
};

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  const normalized: Record<string, string> = {};
  if (!headers) {
    return normalized;
  }

  new Headers(headers).forEach((value, key) => {
    normalized[key] = value;
  });
  return normalized;
}

function getDocumentAuthHeaders(headers?: HeadersInit): HeadersInit {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Login required. Please login again.");
  }

  return {
    ...normalizeHeaders(headers),
    Authorization: `Bearer ${token}`,
  };
}

async function fetchProtectedDocumentResource(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, {
    ...init,
    headers: getDocumentAuthHeaders(init?.headers),
    cache: init?.cache ?? "no-store",
  });
}

export function mapApiDocument(item: ApiDocument): DocumentRecord {
  return {
    id: item.id,
    title: item.title,
    docType: item.doc_type,
    templateName: normalizeDocumentTemplateName(item.template_name),
    content: item.content || "",
    fileUrl: item.file_url || null,
    externalLink: item.external_link || "",
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export function getDocumentFileKind(fileUrl: string | null): DocumentFileKind {
  if (!fileUrl) {
    return null;
  }

  try {
    const pathname = new URL(fileUrl).pathname.toLowerCase();
    if (pathname.endsWith(".pdf")) {
      return "pdf";
    }
    if (pathname.endsWith(".docx")) {
      return "docx";
    }
    if (pathname.endsWith(".txt")) {
      return "txt";
    }
  } catch {
    return "unknown";
  }

  return "unknown";
}

export function getEmbeddableExternalLink(url: string): string {
  if (!url) {
    return "";
  }

  if (url.includes("docs.google.com")) {
    return url.replace("/edit", "/preview");
  }

  return url;
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
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export async function fetchDocuments(): Promise<DocumentRecord[]> {
  const response = await fetchProtectedDocumentResource(`${API_BASE_URL}/documents`);
  if (!response.ok) {
    throw new Error("Failed to fetch documents");
  }

  const data = (await response.json()) as ApiDocument[];
  return data.map(mapApiDocument);
}

export async function fetchDocument(id: number): Promise<DocumentRecord> {
  const response = await fetchProtectedDocumentResource(`${API_BASE_URL}/documents/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch document");
  }

  const data = (await response.json()) as ApiDocument;
  return mapApiDocument(data);
}

export async function fetchDocumentFileBlob(fileUrl: string): Promise<Blob> {
  const response = await fetchProtectedDocumentResource(fileUrl);
  if (!response.ok) {
    throw new Error("Failed to fetch document file");
  }

  return response.blob();
}

export async function fetchDocumentFileText(fileUrl: string): Promise<string> {
  const response = await fetchProtectedDocumentResource(fileUrl);
  if (!response.ok) {
    throw new Error("Failed to fetch document file");
  }

  return response.text();
}

export async function downloadUploadedDocumentFile(document: DocumentRecord): Promise<void> {
  if (!document.fileUrl) {
    throw new Error("No uploaded file is attached to this document.");
  }

  const blob = await fetchDocumentFileBlob(document.fileUrl);
  const fileKind = getDocumentFileKind(document.fileUrl);
  const extension = fileKind && fileKind !== "unknown" ? fileKind : "bin";
  saveAs(blob, `${document.title || "document"}.${extension}`);
}

export function getFormattedDocumentHtml({
  title,
  docType,
  templateName,
  htmlContent,
}: ExportDocumentOptions) {
  return renderDocumentTemplateHtml({
    title,
    docType,
    templateName,
    content: ensureDocumentBodyContent(docType, htmlContent, title),
  });
}

async function mountExportNode(options: ExportDocumentOptions) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "794px";
  container.style.padding = "24px";
  container.style.background = "#f4efe8";
  container.style.pointerEvents = "none";
  container.style.opacity = "0";
  container.innerHTML = getFormattedDocumentHtml(options);
  document.body.appendChild(container);

  if ("fonts" in document) {
    await document.fonts.ready;
  }

  await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)));
  return {
    container,
    sheet: container.firstElementChild as HTMLElement,
  };
}

export async function downloadAsPdf(options: ExportDocumentOptions) {
  const normalizedOptions = {
    ...options,
    templateName: options.templateName || DEFAULT_DOCUMENT_TEMPLATE,
    htmlContent: ensureDocumentBodyContent(options.docType, options.htmlContent, options.title),
  };

  const { container, sheet } = await mountExportNode(normalizedOptions);

  try {
    const canvas = await html2canvas(sheet, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      windowWidth: sheet.scrollWidth,
      windowHeight: sheet.scrollHeight,
    });

    const pdf = new jsPDF({
      unit: "pt",
      format: "a4",
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 28;
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;
    const imageWidth = availableWidth;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;
    const imageData = canvas.toDataURL("image/png");

    let renderedHeight = imageHeight;
    let positionY = margin;
    pdf.addImage(imageData, "PNG", margin, positionY, imageWidth, imageHeight, undefined, "FAST");
    renderedHeight -= availableHeight;

    while (renderedHeight > 0) {
      pdf.addPage();
      positionY = margin - (imageHeight - renderedHeight);
      pdf.addImage(imageData, "PNG", margin, positionY, imageWidth, imageHeight, undefined, "FAST");
      renderedHeight -= availableHeight;
    }

    pdf.save(`${options.title || "document"}.pdf`);
  } finally {
    container.remove();
  }
}

function buildTextRun(text: string, formatting: InlineFormatting = {}, breakBefore = false): TextRun {
  return new TextRun({
    text,
    break: breakBefore ? 1 : undefined,
    bold: formatting.bold,
    italics: formatting.italics,
    underline: formatting.underline ? { type: UnderlineType.SINGLE } : undefined,
    size: 22,
    color: "24324A",
  });
}

function parseTextNode(text: string, formatting: InlineFormatting = {}): ParagraphChild[] {
  const segments = text.replace(/\r/g, "").split("\n");
  const runs: ParagraphChild[] = [];

  segments.forEach((segment, index) => {
    if (!segment && index === 0) {
      return;
    }

    if (!segment && index > 0) {
      runs.push(buildTextRun("", formatting, true));
      return;
    }

    runs.push(buildTextRun(segment, formatting, index > 0));
  });

  return runs;
}

function parseInlineNodes(nodes: ChildNode[], formatting: InlineFormatting = {}): ParagraphChild[] {
  const children: ParagraphChild[] = [];

  nodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text) {
        children.push(...parseTextNode(text, formatting));
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();

    if (tag === "br") {
      children.push(buildTextRun("", formatting, true));
      return;
    }

    if (tag === "strong" || tag === "b") {
      children.push(...parseInlineNodes(Array.from(element.childNodes), { ...formatting, bold: true }));
      return;
    }

    if (tag === "em" || tag === "i") {
      children.push(...parseInlineNodes(Array.from(element.childNodes), { ...formatting, italics: true }));
      return;
    }

    if (tag === "u") {
      children.push(...parseInlineNodes(Array.from(element.childNodes), { ...formatting, underline: true }));
      return;
    }

    if (tag === "a") {
      const link = element.getAttribute("href") || "";
      const text = element.textContent?.trim() || link;
      if (text) {
        children.push(
          new ExternalHyperlink({
            link,
            children: [
              new TextRun({
                text,
                bold: formatting.bold,
                italics: formatting.italics,
                underline: { type: UnderlineType.SINGLE },
                color: "2F5DA8",
                size: 22,
              }),
            ],
          }),
        );
      }
      return;
    }

    children.push(...parseInlineNodes(Array.from(element.childNodes), formatting));
  });

  return children;
}

function createParagraphFromElement(element: HTMLElement, tag: string): Paragraph {
  const children = parseInlineNodes(Array.from(element.childNodes));
  const hasChildren = children.length > 0;

  if (tag === "h1") {
    return new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 220, after: 140 },
      children: hasChildren ? children : [buildTextRun(element.textContent?.trim() || "", { bold: true })],
    });
  }

  if (tag === "h2") {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 120 },
      children: hasChildren ? children : [buildTextRun(element.textContent?.trim() || "", { bold: true })],
    });
  }

  if (tag === "h3") {
    return new Paragraph({
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 160, after: 100 },
      children: hasChildren ? children : [buildTextRun(element.textContent?.trim() || "", { bold: true })],
    });
  }

  if (tag === "blockquote") {
    return new Paragraph({
      children: hasChildren ? children : [buildTextRun(element.textContent?.trim() || "")],
      spacing: { after: 160 },
      indent: { left: 360 },
      border: {
        left: {
          color: "C6D5EB",
          style: BorderStyle.SINGLE,
          size: 18,
        },
      },
    });
  }

  return new Paragraph({
    children: hasChildren ? children : [buildTextRun(element.textContent?.trim() || "")],
    spacing: { after: 160 },
  });
}

function listItemToParagraphs(item: HTMLElement, ordered: boolean, depth: number): Paragraph[] {
  const inlineNodes: ChildNode[] = [];
  const nestedLists: HTMLElement[] = [];

  Array.from(item.childNodes).forEach((child) => {
    if (
      child.nodeType === Node.ELEMENT_NODE &&
      ["ul", "ol"].includes((child as HTMLElement).tagName.toLowerCase())
    ) {
      nestedLists.push(child as HTMLElement);
      return;
    }

    inlineNodes.push(child);
  });

  const paragraphChildren = parseInlineNodes(inlineNodes);
  const paragraph = new Paragraph({
    children: paragraphChildren.length > 0 ? paragraphChildren : [buildTextRun(item.textContent?.trim() || "")],
    spacing: { after: 120 },
    bullet: ordered ? undefined : { level: Math.min(depth, 4) },
    numbering: ordered
      ? {
          reference: "liquid-life-numbering",
          level: Math.min(depth, 4),
        }
      : undefined,
  });

  return [
    paragraph,
    ...nestedLists.flatMap((list) => listToParagraphs(list, list.tagName.toLowerCase() === "ol", depth + 1)),
  ];
}

function listToParagraphs(list: HTMLElement, ordered: boolean, depth = 0): Paragraph[] {
  return Array.from(list.children)
    .filter((child) => child.tagName.toLowerCase() === "li")
    .flatMap((child) => listItemToParagraphs(child as HTMLElement, ordered, depth));
}

function htmlToDocxParagraphs(html: string): Paragraph[] {
  const normalizedHtml = normalizeDocumentContentInput(html);
  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<body>${normalizedHtml}</body>`, "text/html");
  const paragraphs: Paragraph[] = [];

  Array.from(parsed.body.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        paragraphs.push(
          new Paragraph({
            children: [buildTextRun(text)],
            spacing: { after: 160 },
          }),
        );
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();

    if (tag === "ul" || tag === "ol") {
      paragraphs.push(...listToParagraphs(element, tag === "ol"));
      return;
    }

    if (["div", "section", "article"].includes(tag)) {
      paragraphs.push(...htmlToDocxParagraphs(element.innerHTML));
      return;
    }

    paragraphs.push(createParagraphFromElement(element, tag));
  });

  return paragraphs.length > 0
    ? paragraphs
    : [
        new Paragraph({
          children: [buildTextRun("No content")],
        }),
      ];
}

function createDocxHeaderParagraphs(options: ExportDocumentOptions): Paragraph[] {
  const config = DOCX_TEMPLATE_CONFIGS[options.templateName] ?? DOCX_TEMPLATE_CONFIGS.balanced;
  const label = getDocumentTypeLabel(options.docType).toUpperCase();
  const title = options.title.trim() || getDocumentTypeLabel(options.docType);

  return [
    new Paragraph({
      alignment: config.kickerAlignment,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: label,
          color: config.accentColor,
          bold: true,
          allCaps: true,
          size: 18,
        }),
      ],
    }),
    new Paragraph({
      alignment: config.titleAlignment,
      spacing: { after: 220 },
      border: {
        bottom: {
          color: config.accentColor,
          style: BorderStyle.SINGLE,
          size: 14,
          space: 1,
        },
      },
      children: [
        new TextRun({
          text: title,
          bold: true,
          color: "22324A",
          size: config.titleSize,
        }),
      ],
    }),
  ];
}

export async function downloadAsDocx(options: ExportDocumentOptions) {
  const normalizedHtml = ensureDocumentBodyContent(options.docType, options.htmlContent, options.title);
  const paragraphs = [
    ...createDocxHeaderParagraphs(options),
    ...htmlToDocxParagraphs(normalizedHtml),
  ];

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "liquid-life-numbering",
          levels: Array.from({ length: 5 }, (_, level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.START,
            style: {
              paragraph: {
                indent: {
                  left: 720 + level * 360,
                  hanging: 260,
                },
              },
            },
          })),
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 900,
              right: 900,
              bottom: 900,
              left: 900,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${options.title || "document"}.docx`);
}

export {
  DEFAULT_DOCUMENT_TEMPLATE,
  ensureDocumentBodyContent,
  normalizeDocumentContentInput,
  normalizeDocumentTemplateName,
};
