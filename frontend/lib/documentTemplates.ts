import type { DocumentType } from "@/lib/documents";

export type DocumentTemplateName = "balanced" | "executive" | "minimal";

export type DocumentTemplateDefinition = {
  name: DocumentTemplateName;
  label: string;
  description: string;
};

export type ResumeExperienceStyle = "cards" | "timeline" | "compact";
export type ResumeSkillsStyle = "chips" | "grid" | "list";
export type ResumeProjectsStyle = "tiles" | "highlights" | "list";
export type ResumeSummaryStyle = "spotlight" | "split" | "compact";
export type ResumeEducationStyle = "cards" | "timeline" | "list";

export type ResumeSectionTemplateConfig = {
  summaryStyle: ResumeSummaryStyle;
  experienceStyle: ResumeExperienceStyle;
  skillsStyle: ResumeSkillsStyle;
  projectsStyle: ResumeProjectsStyle;
  educationStyle: ResumeEducationStyle;
};

type ResumeSectionStyleOption<Value extends string> = {
  value: Value;
  label: string;
  description: string;
};

export const DEFAULT_DOCUMENT_TEMPLATE: DocumentTemplateName = "balanced";

const RESUME_SECTION_TEMPLATE_DEFAULTS: Record<DocumentTemplateName, ResumeSectionTemplateConfig> = {
  balanced: {
    summaryStyle: "spotlight",
    experienceStyle: "cards",
    skillsStyle: "chips",
    projectsStyle: "tiles",
    educationStyle: "cards",
  },
  executive: {
    summaryStyle: "split",
    experienceStyle: "timeline",
    skillsStyle: "list",
    projectsStyle: "highlights",
    educationStyle: "timeline",
  },
  minimal: {
    summaryStyle: "compact",
    experienceStyle: "compact",
    skillsStyle: "grid",
    projectsStyle: "list",
    educationStyle: "list",
  },
};

export const DOCUMENT_TEMPLATE_OPTIONS: DocumentTemplateDefinition[] = [
  {
    name: "balanced",
    label: "Balanced",
    description: "Feature-led one-column layout with bold section cards.",
  },
  {
    name: "executive",
    label: "Executive",
    description: "Structured two-column layout with a professional sidebar.",
  },
  {
    name: "minimal",
    label: "Minimal",
    description: "Compact modern layout with tighter hierarchy and signal chips.",
  },
];

export const RESUME_EXPERIENCE_STYLE_OPTIONS: Array<ResumeSectionStyleOption<ResumeExperienceStyle>> = [
  {
    value: "cards",
    label: "Cards",
    description: "Split roles into separate feature cards with stronger visual breaks.",
  },
  {
    value: "timeline",
    label: "Timeline",
    description: "Stack roles in a guided vertical sequence for stronger narrative flow.",
  },
  {
    value: "compact",
    label: "Compact",
    description: "Compress experience into tighter scan-first blocks.",
  },
];

export const RESUME_SUMMARY_STYLE_OPTIONS: Array<ResumeSectionStyleOption<ResumeSummaryStyle>> = [
  {
    value: "spotlight",
    label: "Spotlight",
    description: "Give the summary a stronger hero-card presence at the top.",
  },
  {
    value: "split",
    label: "Split",
    description: "Use a more editorial two-part summary block with stronger hierarchy.",
  },
  {
    value: "compact",
    label: "Compact",
    description: "Keep the summary short, tighter, and more scan-friendly.",
  },
];

export const RESUME_SKILLS_STYLE_OPTIONS: Array<ResumeSectionStyleOption<ResumeSkillsStyle>> = [
  {
    value: "chips",
    label: "Chips",
    description: "Short skill tokens for quicker ATS-style scanning.",
  },
  {
    value: "grid",
    label: "Grid",
    description: "Show skills as structured tiles with more visual weight.",
  },
  {
    value: "list",
    label: "List",
    description: "Keep skills in a clean traditional list for formal resumes.",
  },
];

export const RESUME_PROJECTS_STYLE_OPTIONS: Array<ResumeSectionStyleOption<ResumeProjectsStyle>> = [
  {
    value: "tiles",
    label: "Tiles",
    description: "Present each project as its own callout block.",
  },
  {
    value: "highlights",
    label: "Highlights",
    description: "Emphasize projects as quick proof points with numbered markers.",
  },
  {
    value: "list",
    label: "List",
    description: "Keep projects in a concise classic bullet list.",
  },
];

export const RESUME_EDUCATION_STYLE_OPTIONS: Array<ResumeSectionStyleOption<ResumeEducationStyle>> = [
  {
    value: "cards",
    label: "Cards",
    description: "Show education items as separate polished blocks.",
  },
  {
    value: "timeline",
    label: "Timeline",
    description: "Present education in a guided stacked sequence.",
  },
  {
    value: "list",
    label: "List",
    description: "Keep education concise and conventional.",
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

export function getDefaultResumeSectionTemplateConfig(templateName: DocumentTemplateName = DEFAULT_DOCUMENT_TEMPLATE): ResumeSectionTemplateConfig {
  return { ...RESUME_SECTION_TEMPLATE_DEFAULTS[templateName] };
}

export function normalizeDocumentTemplateConfig(
  value: unknown,
  templateName: DocumentTemplateName = DEFAULT_DOCUMENT_TEMPLATE,
): ResumeSectionTemplateConfig {
  const defaults = getDefaultResumeSectionTemplateConfig(templateName);
  if (!value || typeof value !== "object") {
    return defaults;
  }

  const config = value as Partial<ResumeSectionTemplateConfig>;
  const summaryStyle = config.summaryStyle;
  const experienceStyle = config.experienceStyle;
  const skillsStyle = config.skillsStyle;
  const projectsStyle = config.projectsStyle;
  const educationStyle = config.educationStyle;

  return {
    summaryStyle:
      summaryStyle === "spotlight" || summaryStyle === "split" || summaryStyle === "compact"
        ? summaryStyle
        : defaults.summaryStyle,
    experienceStyle:
      experienceStyle === "cards" || experienceStyle === "timeline" || experienceStyle === "compact"
        ? experienceStyle
        : defaults.experienceStyle,
    skillsStyle:
      skillsStyle === "chips" || skillsStyle === "grid" || skillsStyle === "list"
        ? skillsStyle
        : defaults.skillsStyle,
    projectsStyle:
      projectsStyle === "tiles" || projectsStyle === "highlights" || projectsStyle === "list"
        ? projectsStyle
        : defaults.projectsStyle,
    educationStyle:
      educationStyle === "cards" || educationStyle === "timeline" || educationStyle === "list"
        ? educationStyle
        : defaults.educationStyle,
  };
}

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

type ResumeSection = {
  heading: string;
  key: string;
  html: string;
};

function normalizeResumeSectionKey(value: string): string {
  const normalized = normalizeHeadingText(value);
  if (["summary", "profile", "professional summary"].includes(normalized)) {
    return "summary";
  }
  if (["experience", "work experience", "employment", "professional experience"].includes(normalized)) {
    return "experience";
  }
  if (["skills", "technical skills", "core skills"].includes(normalized)) {
    return "skills";
  }
  if (["projects", "selected projects"].includes(normalized)) {
    return "projects";
  }
  if (["education", "qualifications"].includes(normalized)) {
    return "education";
  }
  if (["certifications", "awards", "achievements"].includes(normalized)) {
    return normalized;
  }
  return normalized || "section";
}

function extractResumeSections(root: HTMLElement) {
  convertLooseParagraphsToStructuredHtml(root, "resume");
  const topParagraphs = Array.from(root.querySelectorAll(":scope > p")) as HTMLParagraphElement[];
  let identityHtml = "";
  let metaHtml = "";
  let leadHtml = "";

  if (topParagraphs[0]) {
    const looksLikeIdentity = /<strong>/i.test(topParagraphs[0].innerHTML);

    if (looksLikeIdentity) {
      identityHtml = `<p class="ll-resume-identity">${topParagraphs[0].innerHTML}</p>`;
      topParagraphs[0].remove();
    }
  }

  const refreshedTopParagraphs = Array.from(root.querySelectorAll(":scope > p")) as HTMLParagraphElement[];

  if (refreshedTopParagraphs[0]) {
    const lines = getParagraphLines(refreshedTopParagraphs[0]);
    const combined = lines.join(" • ");
    const looksLikeMeta =
      combined.includes("@") || /\d{3}/.test(combined) || /linkedin|portfolio|github|www\./i.test(combined);

    if (looksLikeMeta) {
      metaHtml = `<p class="ll-document-meta">${escapeHtml(combined)}</p>`;
      refreshedTopParagraphs[0].remove();
    }
  }

  const leadParagraphs = Array.from(root.querySelectorAll(":scope > p")) as HTMLParagraphElement[];
  if (leadParagraphs[0]) {
    const leadCandidate = leadParagraphs[0];
    const text = leadCandidate?.textContent?.trim() || "";
    if (text && text.length <= 280) {
      leadHtml = `<p class="ll-document-lead">${escapeHtml(text)}</p>`;
      leadCandidate?.remove();
    }
  }

  const sections: ResumeSection[] = [];
  let currentHeading = "";
  let currentKey = "";
  let currentNodes: string[] = [];

  const flushSection = () => {
    if (!currentHeading || currentNodes.length === 0) {
      currentNodes = [];
      return;
    }

    sections.push({
      heading: currentHeading,
      key: currentKey || normalizeResumeSectionKey(currentHeading),
      html: currentNodes.join(""),
    });
    currentNodes = [];
  };

  Array.from(root.childNodes).forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE && /^H2$/i.test((node as HTMLElement).tagName)) {
      flushSection();
      currentHeading = (node.textContent || "").trim();
      currentKey = normalizeResumeSectionKey(currentHeading);
      return;
    }

    if (currentHeading) {
      currentNodes.push(nodeToHtml(node));
    }
  });

  flushSection();

  return {
    identityHtml,
    metaHtml,
    leadHtml,
    sections,
  };
}

function extractListItemsFromHtml(html: string): string[] {
  if (typeof document === "undefined") {
    return [];
  }

  const container = document.createElement("div");
  container.innerHTML = html;
  return Array.from(container.querySelectorAll("li"))
    .map((item) => (item.textContent || "").trim())
    .filter(Boolean);
}

function extractTextBlocksFromHtml(html: string): string[] {
  if (typeof document === "undefined") {
    return [];
  }

  const container = document.createElement("div");
  container.innerHTML = html;
  const blocks = Array.from(container.querySelectorAll("p, li, h3"))
    .map((item) => (item.textContent || "").trim())
    .filter(Boolean);

  if (blocks.length > 0) {
    return blocks;
  }

  const fallback = (container.textContent || "").trim();
  return fallback ? [fallback] : [];
}

type ResumeExperienceEntry = {
  heading: string;
  duration: string;
  bullets: string[];
};

function createResumeExperienceEntry(): ResumeExperienceEntry {
  return {
    heading: "",
    duration: "",
    bullets: [],
  };
}

function hasResumeExperienceContent(entry: ResumeExperienceEntry): boolean {
  return Boolean(entry.heading || entry.duration || entry.bullets.length > 0);
}

function splitExperienceEntries(html: string): ResumeExperienceEntry[] {
  if (typeof document === "undefined") {
    return [];
  }

  const container = document.createElement("div");
  container.innerHTML = html;
  const entries: ResumeExperienceEntry[] = [];
  let current = createResumeExperienceEntry();
  let hasCurrentEntry = false;

  Array.from(container.children).forEach((child) => {
    const element = child as HTMLElement;
    const tag = element.tagName.toUpperCase();

    if (tag === "H3") {
      if (hasCurrentEntry && hasResumeExperienceContent(current)) {
        entries.push(current);
      }
      current = createResumeExperienceEntry();
      current.heading = (element.textContent || "").trim();
      hasCurrentEntry = true;
      return;
    }

    if (tag === "P" && !current.duration) {
      current.duration = (element.textContent || "").trim();
      hasCurrentEntry = true;
      return;
    }

    if (tag === "UL" || tag === "OL") {
      current.bullets.push(
        ...Array.from(element.querySelectorAll("li"))
          .map((item) => (item.textContent || "").trim())
          .filter(Boolean),
      );
      hasCurrentEntry = true;
      return;
    }

    const text = (element.textContent || "").trim();
    if (text) {
      current.bullets.push(text);
      hasCurrentEntry = true;
    }
  });

  if (hasCurrentEntry && hasResumeExperienceContent(current)) {
    entries.push(current);
  }

  return entries;
}

function renderChipList(items: string[], className = "ll-resume-chip"): string {
  if (items.length === 0) {
    return "";
  }

  return `<div class="ll-resume-chip-list">${items
    .map((item) => `<span class="${className}">${escapeHtml(item)}</span>`)
    .join("")}</div>`;
}

function renderResumeSectionCard(title: string, html: string): string {
  if (!html.trim()) {
    return "";
  }

  return `
    <section class="ll-resume-section-card">
      <h2 class="ll-resume-section-label">${escapeHtml(title)}</h2>
      <div class="ll-resume-section-copy">${html}</div>
    </section>
  `;
}

function renderSummarySection(summaryHtml: string, style: ResumeSummaryStyle, title = "Summary"): string {
  if (!summaryHtml.trim()) {
    return "";
  }

  if (style === "split") {
    return `
      <section class="ll-resume-summary-card ll-resume-summary-split">
        <div class="ll-resume-summary-heading">
          <h2 class="ll-resume-section-label">${escapeHtml(title)}</h2>
          <p class="ll-resume-summary-caption">Targeted positioning</p>
        </div>
        <div class="ll-resume-section-copy">${summaryHtml}</div>
      </section>
    `;
  }

  if (style === "compact") {
    return `
      <section class="ll-resume-summary-inline ll-resume-summary-compact">
        <h2 class="ll-resume-section-label">${escapeHtml(title)}</h2>
        <div class="ll-resume-section-copy">${summaryHtml}</div>
      </section>
    `;
  }

  return `
    <section class="ll-resume-summary-card ll-resume-summary-spotlight">
      <h2 class="ll-resume-section-label">${escapeHtml(title)}</h2>
      <div class="ll-resume-section-copy">${summaryHtml}</div>
    </section>
  `;
}

function renderSkillsSection(skills: string[], style: ResumeSkillsStyle, title = "Skills"): string {
  if (skills.length === 0) {
    return "";
  }

  if (style === "grid") {
    return `
      <section class="ll-resume-section-card ll-resume-skills-panel">
        <h2 class="ll-resume-section-label">${escapeHtml(title)}</h2>
        <div class="ll-resume-skills-grid">
          ${skills.map((item) => `<span class="ll-resume-skill-tile">${escapeHtml(item)}</span>`).join("")}
        </div>
      </section>
    `;
  }

  if (style === "list") {
    return `
      <section class="ll-resume-list-panel ll-resume-skills-list-panel">
        <h2 class="ll-resume-section-label">${escapeHtml(title)}</h2>
        <ul class="ll-resume-skills-list">
          ${skills.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </section>
    `;
  }

  return `
    <section class="ll-resume-band ll-resume-skills-band">
      <h2 class="ll-resume-section-label">${escapeHtml(title)}</h2>
      ${renderChipList(skills)}
    </section>
  `;
}

function renderProjectsSection(projectsHtml: string, style: ResumeProjectsStyle, title = "Projects"): string {
  if (!projectsHtml.trim()) {
    return "";
  }

  const items = extractListItemsFromHtml(projectsHtml);
  if (items.length === 0) {
    return renderResumeSectionCard(title, projectsHtml);
  }

  if (style === "tiles") {
    return `
      <section class="ll-resume-section-card ll-resume-projects-panel">
        <h2 class="ll-resume-section-label">${escapeHtml(title)}</h2>
        <div class="ll-resume-project-grid">
          ${items.map((item) => `<article class="ll-resume-project-tile">${escapeHtml(item)}</article>`).join("")}
        </div>
      </section>
    `;
  }

  if (style === "highlights") {
    return `
      <section class="ll-resume-section-card ll-resume-projects-panel">
        <h2 class="ll-resume-section-label">${escapeHtml(title)}</h2>
        <div class="ll-resume-project-highlights">
          ${items
            .map(
              (item, index) => `
                <article class="ll-resume-project-highlight">
                  <span class="ll-resume-project-badge">${index + 1}</span>
                  <p>${escapeHtml(item)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </section>
    `;
  }

  return `
    <section class="ll-resume-list-panel ll-resume-projects-panel">
      <h2 class="ll-resume-section-label">${escapeHtml(title)}</h2>
      <ul>
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderEducationSection(educationHtml: string, style: ResumeEducationStyle, title = "Education"): string {
  if (!educationHtml.trim()) {
    return "";
  }

  const items = extractTextBlocksFromHtml(educationHtml);
  if (items.length === 0) {
    return renderResumeSectionCard(title, educationHtml);
  }

  if (style === "cards") {
    return `
      <section class="ll-resume-section-card ll-resume-education-panel">
        <h2 class="ll-resume-section-label">${escapeHtml(title)}</h2>
        <div class="ll-resume-education-grid">
          ${items.map((item) => `<article class="ll-resume-education-card">${escapeHtml(item)}</article>`).join("")}
        </div>
      </section>
    `;
  }

  if (style === "timeline") {
    return `
      <section class="ll-resume-section-card ll-resume-education-panel">
        <h2 class="ll-resume-section-label">${escapeHtml(title)}</h2>
        <div class="ll-resume-education-timeline">
          ${items
            .map(
              (item) => `
                <article class="ll-resume-education-timeline-item">
                  <span class="ll-resume-education-dot"></span>
                  <p>${escapeHtml(item)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </section>
    `;
  }

  return `
    <section class="ll-resume-list-panel ll-resume-education-panel">
      <h2 class="ll-resume-section-label">${escapeHtml(title)}</h2>
      <ul>
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderExperienceSection(entries: ResumeExperienceEntry[], style: ResumeExperienceStyle, title = "Experience"): string {
  if (entries.length === 0) {
    return "";
  }

  if (style === "timeline") {
    return `
      <section class="ll-resume-experience-panel">
        <h2 class="ll-resume-section-label">${escapeHtml(title)}</h2>
        <div class="ll-resume-timeline">
          ${entries
            .map(
              (entry) => `
                <article class="ll-resume-timeline-item">
                  <div class="ll-resume-timeline-rail"></div>
                  <div class="ll-resume-timeline-card">
                    ${entry.heading ? `<h3>${escapeHtml(entry.heading)}</h3>` : ""}
                    ${entry.duration ? `<p class="ll-resume-duration">${escapeHtml(entry.duration)}</p>` : ""}
                    ${entry.bullets.length > 0 ? `<ul>${entry.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
                  </div>
                </article>
              `,
            )
            .join("")}
        </div>
      </section>
    `;
  }

  if (style === "compact") {
    return `
      <section class="ll-resume-list-panel ll-resume-experience-compact">
        <h2 class="ll-resume-section-label">${escapeHtml(title)}</h2>
        <div class="ll-resume-compact-stack">
          ${entries
            .map(
              (entry) => `
                <article class="ll-resume-minimal-entry">
                  ${entry.heading ? `<h3>${escapeHtml(entry.heading)}</h3>` : ""}
                  ${entry.duration ? `<p class="ll-resume-duration">${escapeHtml(entry.duration)}</p>` : ""}
                  ${entry.bullets.length > 0 ? `<ul>${entry.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
                </article>
              `,
            )
            .join("")}
        </div>
      </section>
    `;
  }

  return `
    <section class="ll-resume-experience-panel">
      <h2 class="ll-resume-section-label">${escapeHtml(title)}</h2>
      <div class="ll-resume-experience-grid">
        ${entries
          .map(
            (entry, index) => `
              <article class="ll-resume-experience-card">
                <span class="ll-resume-step">${index + 1}</span>
                ${entry.heading ? `<h3>${escapeHtml(entry.heading)}</h3>` : ""}
                ${entry.duration ? `<p class="ll-resume-duration">${escapeHtml(entry.duration)}</p>` : ""}
                ${entry.bullets.length > 0 ? `<ul>${entry.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function buildBalancedResumeLayout(
  data: ReturnType<typeof extractResumeSections>,
  templateConfig: ResumeSectionTemplateConfig,
): string {
  const sectionMap = new Map(data.sections.map((section) => [section.key, section]));
  const summarySection = sectionMap.get("summary");
  const skills = extractListItemsFromHtml(sectionMap.get("skills")?.html || "");
  const experienceEntries = splitExperienceEntries(sectionMap.get("experience")?.html || "");
  const projectsHtml = sectionMap.get("projects")?.html || "";
  const educationHtml = sectionMap.get("education")?.html || "";
  const extraSections = data.sections.filter((section) => !["summary", "skills", "experience", "projects", "education"].includes(section.key));

  return `
    <div class="ll-resume-layout ll-resume-layout-balanced">
      <div class="ll-resume-hero">
        ${data.identityHtml}
        ${data.metaHtml}
        ${summarySection ? renderSummarySection(summarySection.html, templateConfig.summaryStyle) : data.leadHtml}
      </div>

      ${renderSkillsSection(skills, templateConfig.skillsStyle, "Core Skills")}

      ${renderExperienceSection(experienceEntries, templateConfig.experienceStyle)}

      <div class="ll-resume-duo">
        ${renderProjectsSection(projectsHtml, templateConfig.projectsStyle)}
        ${renderEducationSection(educationHtml, templateConfig.educationStyle)}
      </div>

      ${extraSections.map((section) => renderResumeSectionCard(section.heading, section.html)).join("")}
    </div>
  `;
}

function buildExecutiveResumeLayout(
  data: ReturnType<typeof extractResumeSections>,
  templateConfig: ResumeSectionTemplateConfig,
): string {
  const sectionMap = new Map(data.sections.map((section) => [section.key, section]));
  const skills = extractListItemsFromHtml(sectionMap.get("skills")?.html || "");
  const educationHtml = sectionMap.get("education")?.html || "";
  const projectsHtml = sectionMap.get("projects")?.html || "";
  const summaryHtml = sectionMap.get("summary")?.html || data.leadHtml;
  const experienceEntries = splitExperienceEntries(sectionMap.get("experience")?.html || "");
  const extraSections = data.sections.filter((section) => !["summary", "skills", "experience", "projects", "education"].includes(section.key));

  return `
    <div class="ll-resume-layout ll-resume-layout-executive">
      <aside class="ll-resume-sidebar">
        ${data.identityHtml}
        ${data.metaHtml}
        ${renderSkillsSection(skills, templateConfig.skillsStyle, "Skills")}
        ${renderEducationSection(educationHtml, templateConfig.educationStyle)}
        ${renderProjectsSection(projectsHtml, templateConfig.projectsStyle)}
      </aside>

      <div class="ll-resume-main">
        ${renderSummarySection(summaryHtml, templateConfig.summaryStyle)}
        ${renderExperienceSection(experienceEntries, templateConfig.experienceStyle)}
        ${extraSections.map((section) => renderResumeSectionCard(section.heading, section.html)).join("")}
      </div>
    </div>
  `;
}

function buildMinimalResumeLayout(
  data: ReturnType<typeof extractResumeSections>,
  templateConfig: ResumeSectionTemplateConfig,
): string {
  const sectionMap = new Map(data.sections.map((section) => [section.key, section]));
  const skills = extractListItemsFromHtml(sectionMap.get("skills")?.html || "");
  const experienceEntries = splitExperienceEntries(sectionMap.get("experience")?.html || "");
  const projectsHtml = sectionMap.get("projects")?.html || "";
  const summaryHtml = sectionMap.get("summary")?.html || data.leadHtml;
  const extraSections = data.sections.filter((section) => !["summary", "skills", "experience", "projects", "education"].includes(section.key));

  return `
    <div class="ll-resume-layout ll-resume-layout-minimal">
      <div class="ll-resume-strip">
        <div class="ll-resume-strip-copy">
          ${data.identityHtml}
          ${data.metaHtml}
        </div>
        ${templateConfig.skillsStyle === "chips"
          ? renderChipList(skills, "ll-resume-chip ll-resume-chip-minimal")
          : renderSkillsSection(skills, templateConfig.skillsStyle)}
      </div>

      ${renderSummarySection(summaryHtml, templateConfig.summaryStyle)}

      <div class="ll-resume-minimal-grid">
        ${renderExperienceSection(experienceEntries, templateConfig.experienceStyle)}

        <div class="ll-resume-rail-panels">
          ${renderProjectsSection(projectsHtml, templateConfig.projectsStyle)}
          ${renderEducationSection(sectionMap.get("education")?.html || "", templateConfig.educationStyle)}
          ${extraSections.map((section) => renderResumeSectionCard(section.heading, section.html)).join("")}
        </div>
      </div>
    </div>
  `;
}

function buildResumePreviewHtmlForTemplate(
  root: HTMLElement,
  templateName: DocumentTemplateName,
  templateConfig: ResumeSectionTemplateConfig,
): string {
  const parsed = extractResumeSections(root);

  if (templateName === "executive") {
    return buildExecutiveResumeLayout(parsed, templateConfig);
  }

  if (templateName === "minimal") {
    return buildMinimalResumeLayout(parsed, templateConfig);
  }

  return buildBalancedResumeLayout(parsed, templateConfig);
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

export function renderDocumentBodyPreviewHtml(
  docType: DocumentType,
  htmlContent: string,
  title = "",
  templateName: DocumentTemplateName = DEFAULT_DOCUMENT_TEMPLATE,
  templateConfig: ResumeSectionTemplateConfig = getDefaultResumeSectionTemplateConfig(templateName),
): string {
  const normalized = smartFormatDocumentContent(docType, htmlContent, title);
  if (typeof document === "undefined") {
    return normalized;
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<body>${normalized}</body>`, "text/html");
  const body = parsed.body;

  if (docType === "resume") {
    return buildResumePreviewHtmlForTemplate(
      body,
      templateName,
      normalizeDocumentTemplateConfig(templateConfig, templateName),
    );
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
  templateConfig,
  title,
}: {
  content: string;
  docType: DocumentType;
  templateName: DocumentTemplateName;
  templateConfig?: ResumeSectionTemplateConfig;
  title: string;
}) {
  const bodyHtml = renderDocumentBodyPreviewHtml(
    docType,
    content,
    title,
    templateName,
    normalizeDocumentTemplateConfig(templateConfig, templateName),
  );
  const safeTitle = escapeHtml(title.trim() || getDocumentTypeLabel(docType));
  const safeKicker = escapeHtml(getDocumentTypeLabel(docType));

  return `
    <div class="ll-document-sheet ll-document-${docType} ll-document-template-${templateName}">
      <header class="ll-document-header">
        <p class="ll-document-kicker">${safeKicker}</p>
        <h1 class="ll-document-title">${safeTitle}</h1>
      </header>
      <div class="ll-document-body">${bodyHtml}</div>
    </div>
  `;
}
