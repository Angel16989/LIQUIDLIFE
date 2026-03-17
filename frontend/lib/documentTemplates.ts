import type { DocumentType } from "@/lib/documents";

export type DocumentTemplateName = "balanced" | "executive" | "minimal";

export type DocumentTemplateDefinition = {
  name: DocumentTemplateName;
  label: string;
  description: string;
};

export const DEFAULT_DOCUMENT_TEMPLATE: DocumentTemplateName = "balanced";

export const DOCUMENT_TEMPLATE_OPTIONS: DocumentTemplateDefinition[] = [
  {
    name: "balanced",
    label: "Balanced",
    description: "Professional spacing with a clean accent header.",
  },
  {
    name: "executive",
    label: "Executive",
    description: "More formal and centered for polished career documents.",
  },
  {
    name: "minimal",
    label: "Minimal",
    description: "Compact layout with lighter chrome and narrow reading width.",
  },
];

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  general: "General Document",
  resume: "Resume",
  cover_letter: "Cover Letter",
};

const RESUME_SECTION_HEADINGS = new Set([
  "summary",
  "profile",
  "experience",
  "work experience",
  "employment",
  "projects",
  "skills",
  "technical skills",
  "education",
  "certifications",
  "awards",
  "achievements",
  "leadership",
  "volunteering",
]);

const GENERAL_SECTION_HEADINGS = new Set([
  "overview",
  "summary",
  "background",
  "details",
  "key points",
  "notes",
  "next steps",
  "action items",
  "outcome",
  "results",
]);

const COVER_LETTER_SECTION_HEADINGS = new Set([
  "why i am a fit",
  "why me",
  "alignment",
  "experience",
  "impact",
  "closing",
]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeHeadingText(value: string): string {
  return value.replace(/[:\s]+$/g, "").trim().toLowerCase();
}

function getHeadingSet(docType: DocumentType): Set<string> {
  if (docType === "resume") {
    return RESUME_SECTION_HEADINGS;
  }
  if (docType === "cover_letter") {
    return COVER_LETTER_SECTION_HEADINGS;
  }
  return GENERAL_SECTION_HEADINGS;
}

function isLikelySectionHeading(text: string, docType: DocumentType): boolean {
  const normalized = normalizeHeadingText(text);
  if (!normalized) {
    return false;
  }

  if (getHeadingSet(docType).has(normalized)) {
    return true;
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  const raw = text.trim();
  return words.length <= 4 && raw.length <= 36 && raw === raw.toUpperCase();
}

function getParagraphLines(element: HTMLParagraphElement): string[] {
  return (element.innerHTML || "")
    .split(/<br\s*\/?>/i)
    .map((line) => line.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim())
    .filter(Boolean);
}

function formatBulletLine(line: string): { ordered: boolean; value: string } | null {
  const unorderedMatch = line.match(/^[-*•]\s+(.*)$/);
  if (unorderedMatch) {
    return { ordered: false, value: unorderedMatch[1].trim() };
  }

  const orderedMatch = line.match(/^\d+[\.\)]\s+(.*)$/);
  if (orderedMatch) {
    return { ordered: true, value: orderedMatch[1].trim() };
  }

  return null;
}

function convertLooseParagraphsToStructuredHtml(root: HTMLElement, docType: DocumentType) {
  const paragraphs = Array.from(root.querySelectorAll(":scope > p")) as HTMLParagraphElement[];

  paragraphs.forEach((paragraph) => {
    const lines = getParagraphLines(paragraph);
    const text = paragraph.textContent?.trim() || "";

    if (lines.length > 0 && lines.every((line) => formatBulletLine(line))) {
      const first = formatBulletLine(lines[0]);
      const list = document.createElement(first?.ordered ? "ol" : "ul");
      lines.forEach((line) => {
        const parsed = formatBulletLine(line);
        if (!parsed) {
          return;
        }
        const item = document.createElement("li");
        item.textContent = parsed.value;
        list.appendChild(item);
      });
      paragraph.replaceWith(list);
      return;
    }

    if (isLikelySectionHeading(text, docType)) {
      const heading = document.createElement("h2");
      heading.textContent = text.replace(/:\s*$/, "");
      paragraph.replaceWith(heading);
    }
  });
}

function wrapSections(root: HTMLElement): string {
  const nodes = Array.from(root.childNodes);
  let currentHeading = "";
  let currentNodes: string[] = [];
  const sections: string[] = [];
  const introNodes: string[] = [];

  const flushSection = () => {
    if (!currentHeading && currentNodes.length === 0) {
      return;
    }

    if (!currentHeading) {
      introNodes.push(...currentNodes);
    } else {
      sections.push(
        `<section class="ll-smart-section">
          <h2 class="ll-smart-section-title">${escapeHtml(currentHeading)}</h2>
          <div class="ll-smart-section-content">${currentNodes.join("")}</div>
        </section>`,
      );
    }

    currentNodes = [];
  };

  nodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE && /^H[1-3]$/.test((node as HTMLElement).tagName)) {
      flushSection();
      currentHeading = (node.textContent || "").trim();
      return;
    }

    currentNodes.push(nodeToHtml(node));
  });

  flushSection();

  return `<div class="ll-smart-document-flow">${introNodes.join("")}${sections.join("")}</div>`;
}

function nodeToHtml(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHtml(node.textContent || "");
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    return (node as HTMLElement).outerHTML;
  }

  return "";
}

function buildResumePreviewHtml(root: HTMLElement): string {
  convertLooseParagraphsToStructuredHtml(root, "resume");
  const topParagraphs = Array.from(root.querySelectorAll(":scope > p")) as HTMLParagraphElement[];
  let metaHtml = "";
  let leadHtml = "";

  if (topParagraphs[0]) {
    const lines = getParagraphLines(topParagraphs[0]);
    const combined = lines.join(" • ");
    const looksLikeMeta =
      combined.includes("@") || /\d{3}/.test(combined) || /linkedin|portfolio|github|www\./i.test(combined);

    if (looksLikeMeta) {
      metaHtml = `<p class="ll-document-meta">${escapeHtml(combined)}</p>`;
      topParagraphs[0].remove();
    }
  }

  if (topParagraphs[1] || topParagraphs[0]) {
    const leadCandidate = topParagraphs[1] ?? topParagraphs[0];
    const text = leadCandidate?.textContent?.trim() || "";
    if (text && text.length <= 280) {
      leadHtml = `<p class="ll-document-lead">${escapeHtml(text)}</p>`;
      leadCandidate?.remove();
    }
  }

  return `${metaHtml}${leadHtml}${wrapSections(root)}`;
}

function buildCoverLetterPreviewHtml(root: HTMLElement): string {
  convertLooseParagraphsToStructuredHtml(root, "cover_letter");
  const nodes = Array.from(root.childNodes);
  let salutation = "";
  let closing = "";
  const bodyNodes: string[] = [];

  nodes.forEach((node, index) => {
    const text = node.textContent?.trim() || "";

    if (!salutation && index === 0 && text && /^dear\b/i.test(text)) {
      salutation = `<p class="ll-letter-salutation">${escapeHtml(text)}</p>`;
      return;
    }

    if (text && /(sincerely|regards|best regards|thank you)/i.test(text) && index >= nodes.length - 2) {
      closing = `<div class="ll-letter-closing">${nodeToHtml(node)}</div>`;
      return;
    }

    bodyNodes.push(nodeToHtml(node));
  });

  const bodyRoot = document.createElement("div");
  bodyRoot.innerHTML = bodyNodes.join("");
  return `${salutation}<div class="ll-letter-body">${wrapSections(bodyRoot)}</div>${closing}`;
}

function buildGeneralPreviewHtml(root: HTMLElement): string {
  convertLooseParagraphsToStructuredHtml(root, "general");
  const firstParagraph = root.querySelector(":scope > p");
  let leadHtml = "";
  if (firstParagraph) {
    const text = firstParagraph.textContent?.trim() || "";
    if (text && text.length <= 220) {
      leadHtml = `<p class="ll-document-lead">${escapeHtml(text)}</p>`;
      firstParagraph.remove();
    }
  }

  return `${leadHtml}${wrapSections(root)}`;
}

export function getDocumentTemplateLabel(templateName: DocumentTemplateName): string {
  return DOCUMENT_TEMPLATE_OPTIONS.find((item) => item.name === templateName)?.label ?? "Balanced";
}

export function getDocumentTypeLabel(docType: DocumentType): string {
  return DOC_TYPE_LABELS[docType];
}

export function normalizeDocumentTemplateName(value: string | null | undefined): DocumentTemplateName {
  if (value === "executive" || value === "minimal" || value === "balanced") {
    return value;
  }

  return DEFAULT_DOCUMENT_TEMPLATE;
}

export function normalizeDocumentContentInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed;
  }

  return trimmed
    .split(/\n{2,}/)
    .map((block) => {
      const html = block
        .split("\n")
        .map((line) => escapeHtml(line.trim()))
        .filter(Boolean)
        .join("<br />");
      return html ? `<p>${html}</p>` : "";
    })
    .filter(Boolean)
    .join("");
}

export function smartFormatDocumentContent(docType: DocumentType, value: string, title = ""): string {
  const normalized = normalizeDocumentContentInput(value) || getStarterDocumentContent(docType, title);
  if (typeof document === "undefined") {
    return normalized;
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<body>${normalized}</body>`, "text/html");
  const body = parsed.body;

  convertLooseParagraphsToStructuredHtml(body, docType);

  if (!body.querySelector("h2, h3") && docType === "resume") {
    const paragraphs = Array.from(body.querySelectorAll(":scope > p"));
    if (paragraphs.length >= 3) {
      const summaryHeading = document.createElement("h2");
      summaryHeading.textContent = "Summary";
      paragraphs[1].before(summaryHeading);
    }
  }

  return body.innerHTML;
}

export function getStarterDocumentContent(docType: DocumentType, title = ""): string {
  const safeTitle = escapeHtml(title.trim() || "Your Name");

  if (docType === "resume") {
    return `
      <h2>${safeTitle}</h2>
      <p>Professional title, city, email, phone, portfolio.</p>
      <h2>Summary</h2>
      <p>Write a short summary focused on your strongest results and target role.</p>
      <h2>Experience</h2>
      <ul>
        <li>Role - Company - describe measurable impact.</li>
        <li>Role - Company - highlight ownership, delivery, and outcomes.</li>
      </ul>
      <h2>Skills</h2>
      <ul>
        <li>Languages / frameworks / tools</li>
        <li>Systems / platforms / certifications</li>
      </ul>
      <h2>Education</h2>
      <p>Institution, qualification, and relevant achievements.</p>
    `;
  }

  if (docType === "cover_letter") {
    return `
      <p>Dear Hiring Manager,</p>
      <p>I am writing to apply for this role because my background aligns strongly with the work your team is doing.</p>
      <h2>Why I Am a Fit</h2>
      <ul>
        <li>Highlight one result that proves capability.</li>
        <li>Highlight one skill or domain match.</li>
        <li>Highlight one reason you are interested in the company.</li>
      </ul>
      <p>I would welcome the opportunity to discuss how I can contribute.</p>
      <p>Sincerely,<br />${safeTitle}</p>
    `;
  }

  return `
    <h2>Overview</h2>
    <p>Start with the main purpose of this document and the outcome you want from it.</p>
    <h2>Key Points</h2>
    <ul>
      <li>First important point</li>
      <li>Second important point</li>
      <li>Third important point</li>
    </ul>
    <h2>Next Steps</h2>
    <p>Summarize what should happen next or what the reader should do.</p>
  `;
}

export function ensureDocumentBodyContent(docType: DocumentType, htmlContent: string, title = ""): string {
  return smartFormatDocumentContent(docType, htmlContent, title);
}

export function renderDocumentBodyPreviewHtml(docType: DocumentType, htmlContent: string, title = ""): string {
  const normalized = smartFormatDocumentContent(docType, htmlContent, title);
  if (typeof document === "undefined") {
    return normalized;
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<body>${normalized}</body>`, "text/html");
  const body = parsed.body;

  if (docType === "resume") {
    return buildResumePreviewHtml(body);
  }

  if (docType === "cover_letter") {
    return buildCoverLetterPreviewHtml(body);
  }

  return buildGeneralPreviewHtml(body);
}

export function renderDocumentTemplateHtml({
  content,
  docType,
  templateName,
  title,
}: {
  content: string;
  docType: DocumentType;
  templateName: DocumentTemplateName;
  title: string;
}) {
  const bodyHtml = renderDocumentBodyPreviewHtml(docType, content, title);
  const safeTitle = escapeHtml(title.trim() || getDocumentTypeLabel(docType));
  const safeKicker = escapeHtml(getDocumentTypeLabel(docType));

  return `
    <div class="ll-document-sheet ll-document-template-${templateName}">
      <header class="ll-document-header">
        <p class="ll-document-kicker">${safeKicker}</p>
        <h1 class="ll-document-title">${safeTitle}</h1>
      </header>
      <div class="ll-document-body">${bodyHtml}</div>
    </div>
  `;
}
