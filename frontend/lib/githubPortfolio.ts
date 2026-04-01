export type GitHubRepo = {
  id: number;
  name: string;
  html_url: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  fork: boolean;
  updated_at: string;
  topics?: string[];
};

export type PortfolioProjectProfile = {
  slug: string;
  category: string;
  label: string;
  summary: string;
  positioning: string;
  whyItMatters: string;
  highlights: string[];
  stack: string[];
  liveRunUrl: string;
};

export const GITHUB_USERNAME = process.env.NEXT_PUBLIC_GITHUB_USERNAME?.trim() || "Angel16989";
export const LIQUIDLIFE_APP_URL = process.env.NEXT_PUBLIC_LIQUIDLIFE_APP_URL?.trim() || "https://liquidlife.rasikn.com";
export const LINKEDIN_URL = process.env.NEXT_PUBLIC_LINKEDIN_URL?.trim() || "https://www.linkedin.com/in/rasik-tiwari";

const DATA_KEYWORDS = ["data", "analytics", "dashboard", "report", "sql", "python", "excel", "powerbi"];
const SUPPORT_KEYWORDS = ["helpdesk", "support", "admin", "endpoint", "m365", "incident", "cloud", "system"];
const AUTOMATION_KEYWORDS = ["automation", "tool", "workflow", "ops", "script", "bot"];
const SECURITY_KEYWORDS = ["security", "cyber", "incident", "soc", "siem", "auth"];

const PROFILE_OVERRIDES: Record<string, Partial<PortfolioProjectProfile>> = {
  liquidlife: {
    category: "Product Platform",
    label: "Flagship App",
    summary: "Full-stack productivity platform with documents, approvals, procurement, and workflow tooling.",
    positioning: "Shows end-to-end product thinking across frontend UX, backend APIs, auth, admin flow, and deployment.",
    whyItMatters: "This is the clearest example of combining operational structure, product delivery, and real implementation across the stack.",
    highlights: [
      "Built a full Next.js + Django + PostgreSQL platform instead of a single-feature demo.",
      "Added approval workflows, per-user document ownership, and AI-assisted resume tooling.",
      "Deployed publicly with Docker, Cloudflare Tunnel, and domain routing.",
    ],
    stack: ["Next.js", "TypeScript", "Django REST", "PostgreSQL", "Docker", "Cloudflare"],
    liveRunUrl: LIQUIDLIFE_APP_URL,
  },
};

export function toProjectSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function repoSearchText(repo: GitHubRepo) {
  return [repo.name, repo.description || "", repo.language || "", (repo.topics || []).join(" ")]
    .join(" ")
    .toLowerCase();
}

export function matchesKeywords(repo: GitHubRepo, keywords: string[]) {
  const haystack = repoSearchText(repo);
  return keywords.some((keyword) => haystack.includes(keyword));
}

export function buildGeneralSummary(repo: GitHubRepo) {
  if (repo.description?.trim()) {
    return repo.description.trim();
  }

  const lower = repo.name.toLowerCase();

  if (lower.includes("data") || lower.includes("analytics") || lower.includes("dashboard") || lower.includes("report")) {
    return "Data-focused project centered on reporting, operational visibility, and clearer decision support.";
  }
  if (lower.includes("liquidlife")) {
    return "Full-stack life management product covering job tracking, documents, approvals, and end-to-end workflow automation.";
  }
  if (lower.includes("helpdesk") || lower.includes("support")) {
    return "IT support project centered on ticket flow, troubleshooting process, and day-to-day service operations.";
  }
  if (lower.includes("admin") || lower.includes("endpoint") || lower.includes("m365")) {
    return "Systems administration project built around device management, process control, and operational tooling.";
  }
  if (lower.includes("cloud")) {
    return "Cloud-focused build covering deployment flow, service design, and infrastructure thinking.";
  }
  if (lower.includes("incident") || lower.includes("cyber")) {
    return "Security-oriented project exploring response workflow, visibility, and operational resilience.";
  }

  if (repo.language) {
    return `${repo.language}-based public project surfaced here as part of the broader portfolio.`;
  }

  return "Public GitHub project presented here as part of a portfolio focused on data, systems, and operational problem solving.";
}

export function getLiveRunUrl(repo: GitHubRepo) {
  const lower = repo.name.toLowerCase();
  if (repo.homepage?.trim()) {
    return repo.homepage.trim();
  }
  if (lower === "liquidlife") {
    return LIQUIDLIFE_APP_URL;
  }
  return PROFILE_OVERRIDES[toProjectSlug(repo.name)]?.liveRunUrl || "";
}

export async function getGitHubProjects(): Promise<GitHubRepo[]> {
  try {
    const response = await fetch(
      `https://api.github.com/users/${encodeURIComponent(GITHUB_USERNAME)}/repos?sort=updated&per_page=100`,
      {
        headers: {
          Accept: "application/vnd.github+json",
        },
        next: { revalidate: 3600 },
      },
    );

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as GitHubRepo[];
    return payload
      .filter((repo) => !repo.fork)
      .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at));
  } catch {
    return [];
  }
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function getFeaturedProjects(projects: GitHubRepo[]) {
  return [...projects]
    .sort((left, right) => {
      const leftScore =
        (matchesKeywords(left, DATA_KEYWORDS) ? 4 : 0) +
        (matchesKeywords(left, SUPPORT_KEYWORDS) ? 3 : 0) +
        (matchesKeywords(left, AUTOMATION_KEYWORDS) ? 2 : 0) +
        (getLiveRunUrl(left) ? 1 : 0);
      const rightScore =
        (matchesKeywords(right, DATA_KEYWORDS) ? 4 : 0) +
        (matchesKeywords(right, SUPPORT_KEYWORDS) ? 3 : 0) +
        (matchesKeywords(right, AUTOMATION_KEYWORDS) ? 2 : 0) +
        (getLiveRunUrl(right) ? 1 : 0);
      return rightScore - leftScore || Date.parse(right.updated_at) - Date.parse(left.updated_at);
    })
    .slice(0, 3);
}

export function getRepoBySlug(projects: GitHubRepo[], slug: string) {
  return projects.find((project) => toProjectSlug(project.name) === slug) || null;
}

export function deriveProjectCategory(repo: GitHubRepo) {
  if (matchesKeywords(repo, DATA_KEYWORDS)) {
    return "Data & Reporting";
  }
  if (matchesKeywords(repo, SUPPORT_KEYWORDS)) {
    return "IT Support & Systems";
  }
  if (matchesKeywords(repo, AUTOMATION_KEYWORDS)) {
    return "Automation & Tooling";
  }
  if (matchesKeywords(repo, SECURITY_KEYWORDS)) {
    return "Security & Response";
  }
  if (getLiveRunUrl(repo)) {
    return "Live Product";
  }
  return "Technical Build";
}

export function deriveProjectLabel(repo: GitHubRepo) {
  if (getLiveRunUrl(repo)) {
    return "Runnable Project";
  }
  if (matchesKeywords(repo, DATA_KEYWORDS)) {
    return "Data-facing Work";
  }
  if (matchesKeywords(repo, SUPPORT_KEYWORDS)) {
    return "Support-facing Work";
  }
  if (matchesKeywords(repo, AUTOMATION_KEYWORDS)) {
    return "Workflow Tooling";
  }
  return "Portfolio Project";
}

export function deriveHighlights(repo: GitHubRepo) {
  const highlights = [
    `Updated ${formatDate(repo.updated_at)}, which keeps this project current within the portfolio.`,
    repo.language ? `Primary language signal: ${repo.language}.` : "Language is mixed or not explicitly surfaced by GitHub.",
  ];

  if (matchesKeywords(repo, DATA_KEYWORDS)) {
    highlights.push("Relevant to data-focused roles because it signals reporting, analytics, or structured information flow.");
  }
  if (matchesKeywords(repo, SUPPORT_KEYWORDS)) {
    highlights.push("Relevant to IT support and operations because it connects to admin work, service flow, or systems handling.");
  }
  if (matchesKeywords(repo, AUTOMATION_KEYWORDS)) {
    highlights.push("Signals automation thinking and workflow reduction rather than just static implementation.");
  }
  if (getLiveRunUrl(repo)) {
    highlights.push("Has a live destination, so this project can be explored beyond the repository itself.");
  }

  return highlights.slice(0, 4);
}

export function deriveStack(repo: GitHubRepo) {
  const stack = new Set<string>();

  if (repo.language) {
    stack.add(repo.language);
  }

  const text = repoSearchText(repo);
  if (text.includes("next")) stack.add("Next.js");
  if (text.includes("react")) stack.add("React");
  if (text.includes("django")) stack.add("Django");
  if (text.includes("docker")) stack.add("Docker");
  if (text.includes("postgres")) stack.add("PostgreSQL");
  if (text.includes("sql")) stack.add("SQL");
  if (text.includes("powerbi")) stack.add("Power BI");
  if (text.includes("excel")) stack.add("Excel");
  if (text.includes("python")) stack.add("Python");
  if (text.includes("cloud")) stack.add("Cloud");

  return Array.from(stack).slice(0, 6);
}

export function buildProjectProfile(repo: GitHubRepo): PortfolioProjectProfile {
  const slug = toProjectSlug(repo.name);
  const override = PROFILE_OVERRIDES[slug];
  const category = override?.category || deriveProjectCategory(repo);
  const label = override?.label || deriveProjectLabel(repo);
  const summary = override?.summary || buildGeneralSummary(repo);
  const positioning =
    override?.positioning ||
    (category === "Data & Reporting"
      ? "Useful as a data-analyst portfolio signal because it points toward reporting, metrics, or operational visibility."
      : category === "IT Support & Systems"
        ? "Useful as a support portfolio signal because it reflects systems handling, admin work, or operational structure."
        : category === "Automation & Tooling"
          ? "Useful as an operations signal because it reduces friction and turns process into repeatable tooling."
          : "Useful as a technical portfolio signal that supports the broader analyst-plus-operator narrative.");
  const whyItMatters =
    override?.whyItMatters ||
    "This project contributes to the portfolio by showing practical execution, not just interest. It helps connect analysis, systems thinking, and real implementation.";
  const highlights = override?.highlights || deriveHighlights(repo);
  const stack = override?.stack || deriveStack(repo);
  const liveRunUrl = override?.liveRunUrl || getLiveRunUrl(repo);

  return {
    slug,
    category,
    label,
    summary,
    positioning,
    whyItMatters,
    highlights,
    stack,
    liveRunUrl,
  };
}

export function getPortfolioCounts(projects: GitHubRepo[]) {
  return {
    dataProjectsCount: projects.filter((project) => matchesKeywords(project, DATA_KEYWORDS)).length,
    supportProjectsCount: projects.filter((project) => matchesKeywords(project, SUPPORT_KEYWORDS)).length,
    liveProjectsCount: projects.filter((project) => Boolean(getLiveRunUrl(project))).length,
  };
}
