import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import styles from "./projects-hub.module.css";

type GitHubRepo = {
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

const GITHUB_USERNAME = process.env.NEXT_PUBLIC_GITHUB_USERNAME?.trim() || "Angel16989";
const LIQUIDLIFE_APP_URL = process.env.NEXT_PUBLIC_LIQUIDLIFE_APP_URL?.trim() || "https://liquidlife.rasikn.com";
const PORTFOLIO_URL = process.env.NEXT_PUBLIC_PORTFOLIO_URL?.trim() || "https://rasiktiwari.com.au";

function repoSearchText(repo: GitHubRepo) {
  return [repo.name, repo.description || "", repo.language || "", (repo.topics || []).join(" ")]
    .join(" ")
    .toLowerCase();
}

function matchesKeywords(repo: GitHubRepo, keywords: string[]) {
  const haystack = repoSearchText(repo);
  return keywords.some((keyword) => haystack.includes(keyword));
}

function buildGeneralSummary(repo: GitHubRepo) {
  if (repo.description?.trim()) {
    return repo.description.trim();
  }

  const lower = repo.name.toLowerCase();

  if (lower.includes("data") || lower.includes("analytics") || lower.includes("dashboard") || lower.includes("report")) {
    return "Data-focused project centered on reporting, operational visibility, and clearer decision support.";
  }
  if (lower.includes("liquidlife")) {
    return "Full-stack life management product covering job tracking, documents, admin workflows, and deployment automation.";
  }
  if (lower.includes("website") || lower.includes("portfolio")) {
    return "Personal web presence project focused on presentation, interaction quality, and a cleaner public-facing portfolio experience.";
  }
  if (lower.includes("helpdesk") || lower.includes("support")) {
    return "IT operations project centered on ticket flow, support processes, and day-to-day service management.";
  }
  if (lower.includes("incident") || lower.includes("cyber")) {
    return "Security-focused build exploring incident response, threat handling, and operational resilience.";
  }
  if (lower.includes("admin") || lower.includes("endpoint") || lower.includes("m365")) {
    return "Systems administration project built around automation, device management, and operational tooling.";
  }
  if (lower.includes("cloud")) {
    return "Cloud-focused build covering infrastructure thinking, deployment flow, and service design.";
  }
  if (lower.includes("capstone")) {
    return "Capstone delivery project bringing coursework and implementation together in a deployable end result.";
  }
  if (lower.includes("school")) {
    return "Business website project aimed at a real-world client use case and cleaner service presentation.";
  }

  if (repo.language) {
    return `${repo.language}-based project imported from GitHub and surfaced here as part of the public project portfolio.`;
  }

  return "Public project imported from GitHub and summarised here as part of the broader engineering portfolio.";
}

function getLiveRunUrl(repo: GitHubRepo) {
  const lower = repo.name.toLowerCase();
  if (repo.homepage?.trim()) {
    return repo.homepage.trim();
  }
  if (lower === "liquidlife") {
    return LIQUIDLIFE_APP_URL;
  }
  if (lower.includes("personal_website_vibecode") || lower.includes("portfolio")) {
    return PORTFOLIO_URL;
  }
  return "";
}

async function getGitHubProjects(): Promise<GitHubRepo[]> {
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function HomePage() {
  const headerStore = await headers();
  const host = (headerStore.get("x-forwarded-host") || headerStore.get("host") || "").toLowerCase();

  if (host.startsWith("liquidlife.")) {
    redirect("/login");
  }

  const projects = await getGitHubProjects();
  const githubProfileUrl = `https://github.com/${GITHUB_USERNAME}`;
  const dataProjectsCount = projects.filter((project) =>
    matchesKeywords(project, ["data", "analytics", "dashboard", "report", "sql", "python"]),
  ).length;
  const supportProjectsCount = projects.filter((project) =>
    matchesKeywords(project, ["helpdesk", "support", "admin", "endpoint", "m365", "incident", "cloud"]),
  ).length;
  const featuredProjects = [...projects]
    .sort((left, right) => {
      const leftScore =
        (matchesKeywords(left, ["liquidlife", "data", "analytics", "dashboard", "report", "sql", "python"]) ? 3 : 0) +
        (matchesKeywords(left, ["helpdesk", "support", "admin", "endpoint", "m365", "incident", "cloud"]) ? 2 : 0) +
        (getLiveRunUrl(left) ? 1 : 0);
      const rightScore =
        (matchesKeywords(right, ["liquidlife", "data", "analytics", "dashboard", "report", "sql", "python"]) ? 3 : 0) +
        (matchesKeywords(right, ["helpdesk", "support", "admin", "endpoint", "m365", "incident", "cloud"]) ? 2 : 0) +
        (getLiveRunUrl(right) ? 1 : 0);

      return rightScore - leftScore || Date.parse(right.updated_at) - Date.parse(left.updated_at);
    })
    .slice(0, 3);
  const liveProjectsCount = projects.filter((project) => Boolean(getLiveRunUrl(project))).length;
  const latestProject = projects[0];

  return (
    <main className={`ll-page px-4 py-8 sm:px-6 ${styles.shell}`}>
      <div className={styles.backdrop} aria-hidden="true">
        <span className={styles.glowOne} />
        <span className={styles.glowTwo} />
        <span className={styles.gridHalo} />
      </div>

      <div className={`ll-container space-y-6 ${styles.stack}`}>
        <header className={`ll-panel overflow-hidden p-6 sm:p-8 ${styles.hero}`}>
          <div className={styles.heroMesh} aria-hidden="true" />
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <div className={styles.kickerRow}>
                <p className="text-xs uppercase tracking-[0.28em] ll-muted">Rasik Tiwari</p>
                <span className={styles.kickerChip}>Data + IT Support</span>
              </div>
              <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight ll-title sm:text-5xl">
                Building dependable reporting, support, and operational systems across data, automation, and web.
              </h1>
              <p className={`mt-4 max-w-3xl text-base leading-7 ll-muted ${styles.heroLead}`}>
                I am moving deeper into data-focused work while keeping a strong IT support and systems operations
                foundation. This landing page is the public portfolio layer for that mix: live GitHub work, operational
                tooling, support-oriented builds, and product systems like Liquid Life.
              </p>

              <div className={styles.heroFocusGrid}>
                <div className={styles.heroFocusCard}>
                  <span className={styles.heroFocusLabel}>Data Analysis</span>
                  <p className={styles.heroFocusText}>Reporting, operational visibility, and cleaner decision support.</p>
                </div>
                <div className={styles.heroFocusCard}>
                  <span className={styles.heroFocusLabel}>IT Support</span>
                  <p className={styles.heroFocusText}>Practical systems thinking, troubleshooting, and service workflow discipline.</p>
                </div>
                <div className={styles.heroFocusCard}>
                  <span className={styles.heroFocusLabel}>Automation</span>
                  <p className={styles.heroFocusText}>Internal tools and repeatable processes that reduce manual overhead.</p>
                </div>
              </div>

              <div className={styles.metricGrid}>
                <div className={styles.metricCard}>
                  <span className={styles.metricValue}>{dataProjectsCount || "0"}</span>
                  <span className={styles.metricLabel}>Data / reporting projects</span>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricValue}>{supportProjectsCount || "0"}</span>
                  <span className={styles.metricLabel}>Support / systems builds</span>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricValue}>{liveProjectsCount}</span>
                  <span className={styles.metricLabel}>Live project destinations</span>
                </div>
              </div>
            </div>

            <div className={styles.heroRail}>
              <div className={styles.heroRailCard}>
                <p className={styles.railEyebrow}>Current Direction</p>
                <h2 className="mt-2 text-3xl font-semibold ll-title">Data analyst mindset, support engineer discipline.</h2>
                <p className="mt-3 text-sm leading-7 ll-muted">
                  The strongest thread through my work is turning noisy operational work into clearer systems. That can
                  mean reporting, support tooling, workflow automation, or full-stack products that make everyday work
                  easier to run.
                </p>
              </div>

              <div className={styles.heroActions}>
                <a
                  href="#projects"
                  className={`ll-pill-btn flex items-center justify-center px-4 py-3 text-sm font-semibold ${styles.heroActionPrimary}`}
                >
                  Browse Projects
                </a>
                <a
                  href={githubProfileUrl}
                  className={`ll-pill-btn flex items-center justify-center px-4 py-3 text-sm font-semibold ${styles.heroAction}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View GitHub
                </a>
                <a
                  href={PORTFOLIO_URL}
                  className={`ll-pill-btn flex items-center justify-center px-4 py-3 text-sm font-semibold ${styles.heroAction}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Resume Site
                </a>
                <a
                  href={LIQUIDLIFE_APP_URL}
                  className={`ll-pill-btn flex items-center justify-center px-4 py-3 text-sm font-semibold ${styles.heroActionPrimary}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Liquid Life Live Run
                </a>
                <a
                  href="https://github.com/new/import"
                  className={`ll-pill-btn flex items-center justify-center px-4 py-3 text-sm font-semibold ${styles.heroAction}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Import Repo
                </a>
              </div>

              <div className={styles.signalStack}>
                <div className={styles.signalCard}>
                  <span className={styles.signalLabel}>Positioning</span>
                  <p className={styles.signalValue}>Data analysis + IT support + systems operations</p>
                </div>
                <div className={styles.signalCard}>
                  <span className={styles.signalLabel}>Latest GitHub update</span>
                  <p className={styles.signalValue}>{latestProject ? formatDate(latestProject.updated_at) : "Live"}</p>
                </div>
                <div className={styles.signalCard}>
                  <span className={styles.signalLabel}>Live app route</span>
                  <p className={styles.signalValue}>liquidlife.rasikn.com</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className={`ll-panel p-6 ${styles.sectionPanel}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className={`text-xs uppercase tracking-[0.24em] ll-muted ${styles.sectionEyebrow}`}>What I Bring</p>
                <h2 className="mt-2 text-3xl font-semibold ll-title">A blend of analysis, support, and implementation.</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 ll-muted">
                  The portfolio direction is shifting away from generic “builder” language and toward the kind of work I
                  want to be known for: using data and systems thinking to improve support operations and day-to-day execution.
                </p>
              </div>
              <div className="rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#3d5fa8]">
                Career narrative
              </div>
            </div>

            <div className={`mt-6 grid gap-4 md:grid-cols-2 ${styles.featureGrid}`}>
              <div className={`ll-panel-soft px-5 py-5 ${styles.featureCard}`}>
                <p className="text-xs uppercase tracking-[0.22em] ll-muted">Analysis</p>
                <h3 className="mt-2 text-2xl font-semibold ll-title">Operational reporting</h3>
                <p className="mt-3 text-sm leading-7 ll-muted">
                  I want the portfolio to show stronger evidence of reporting, trend visibility, and structured thinking around operational data.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className={styles.tag}>Dashboards</span>
                  <span className={styles.tag}>Reporting</span>
                  <span className={styles.tag}>Trends</span>
                </div>
              </div>

              <div className={`ll-panel-soft px-5 py-5 ${styles.featureCard}`}>
                <p className="text-xs uppercase tracking-[0.22em] ll-muted">Support</p>
                <h3 className="mt-2 text-2xl font-semibold ll-title">IT support systems</h3>
                <p className="mt-3 text-sm leading-7 ll-muted">
                  The other side of the story is support discipline: process clarity, troubleshooting, service workflows, and internal tools that reduce friction.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className={styles.tag}>Troubleshooting</span>
                  <span className={styles.tag}>Ops</span>
                  <span className={styles.tag}>Workflow</span>
                </div>
              </div>
            </div>
          </article>

          <aside className={`ll-panel p-6 ${styles.sectionPanel}`}>
            <p className="text-xs uppercase tracking-[0.24em] ll-muted">Live Structure</p>
            <h2 className="mt-2 text-2xl font-semibold ll-title">Public portfolio on the root, product on the subdomain.</h2>
            <div className={`mt-4 space-y-3 text-sm ll-muted ${styles.infoStack}`}>
              <div className={`ll-panel-soft px-4 py-4 ${styles.infoCard}`}>
                <p className="font-semibold ll-title">GitHub synced portfolio</p>
                <p className="mt-1">This landing page pulls directly from the public GitHub API for {GITHUB_USERNAME} and keeps the project list current.</p>
              </div>
              <div className={`ll-panel-soft px-4 py-4 ${styles.infoCard}`}>
                <p className="font-semibold ll-title">Current resume site</p>
                <p className="mt-1">
                  The older portfolio still exists as a resume-first view while this root domain grows into the fuller public portfolio.
                </p>
              </div>
              <div className={`ll-panel-soft px-4 py-4 ${styles.infoCard}`}>
                <p className="font-semibold ll-title">Current focus statement</p>
                <p className="mt-1">Data analysis, support workflow improvement, and operational tools that solve practical business problems.</p>
              </div>
              <div className={`ll-panel-soft px-4 py-4 ${styles.infoCard}`}>
                <p className="font-semibold ll-title">Live app subdomain</p>
                <p className="mt-1 break-all text-[#31476d]">{LIQUIDLIFE_APP_URL}</p>
              </div>
            </div>
          </aside>
        </section>

        {featuredProjects.length > 0 && (
          <section className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] ll-muted">Direction Signals</p>
              <h2 className="mt-2 text-3xl font-semibold ll-title">Projects that best reflect the shift.</h2>
            </div>
            <div className={`grid gap-5 lg:grid-cols-3 ${styles.highlightGrid}`}>
              {featuredProjects.map((project) => (
                <article key={project.id} className={`ll-panel p-5 ${styles.highlightCard}`}>
                  <p className={styles.highlightEyebrow}>Featured signal</p>
                  <h3 className="text-2xl font-semibold ll-title">{project.name}</h3>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] ll-muted">
                    Updated {formatDate(project.updated_at)}
                  </p>
                  <p className="mt-4 text-sm leading-7 ll-muted">{buildGeneralSummary(project)}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section id="projects" className="space-y-4">
          <div className={`flex flex-wrap items-end justify-between gap-3 ${styles.repoSectionHeader}`}>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] ll-muted">Imported From GitHub</p>
              <h2 className="mt-2 text-3xl font-semibold ll-title">Public GitHub work</h2>
            </div>
            <a
              href={githubProfileUrl + "?tab=repositories"}
              className="ll-pill-btn px-4 py-2 text-sm font-semibold"
              target="_blank"
              rel="noreferrer"
            >
              Open GitHub Repositories
            </a>
          </div>

          {projects.length > 0 ? (
            <div className={`grid gap-5 md:grid-cols-2 xl:grid-cols-3 ${styles.repoGrid}`}>
              {projects.map((project) => {
                const liveRunUrl = getLiveRunUrl(project);

                return (
                  <article key={project.id} className={`ll-panel flex flex-col p-5 ${styles.repoCard}`}>
                    <div className={`flex items-start justify-between gap-3 ${styles.repoTopRow}`}>
                      <div>
                        <h3 className="text-2xl font-semibold ll-title">{project.name}</h3>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] ll-muted">
                          Updated {formatDate(project.updated_at)}
                        </p>
                      </div>
                      <div className={styles.starBadge}>
                        ★ {project.stargazers_count}
                      </div>
                    </div>

                    <p className={`mt-4 min-h-24 text-sm leading-7 ll-muted ${styles.repoSummary}`}>{buildGeneralSummary(project)}</p>

                    <div className={`mt-4 flex flex-wrap gap-2 ${styles.tagRow}`}>
                      {project.language && (
                        <span className={styles.tag}>
                          {project.language}
                        </span>
                      )}
                      <span className={styles.tagMuted}>
                        Public Repo
                      </span>
                    </div>

                    <div className={`mt-6 flex flex-wrap gap-2 ${styles.repoActions}`}>
                      <a
                        href={project.html_url}
                        className={`ll-pill-btn px-3 py-2 text-sm font-semibold ${styles.repoAction}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open Repo
                      </a>
                      {liveRunUrl ? (
                        <a
                          href={liveRunUrl}
                          className={`ll-pill-btn px-3 py-2 text-sm font-semibold ${styles.repoActionPrimary}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Live Run
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={`ll-panel p-6 ${styles.emptyState}`}>
              <p className="text-sm leading-7 ll-muted">
                GitHub import is enabled, but no public repositories were returned right now. The GitHub profile link
                above is still valid.
              </p>
            </div>
          )}
        </section>

        <section className={`ll-panel p-6 ${styles.appPanel}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] ll-muted">Live Product Layer</p>
              <h2 className="mt-2 text-2xl font-semibold ll-title">Liquid Life stays separate from the public portfolio.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 ll-muted">
                The root domain is now positioning and portfolio. The actual product stays on its own subdomain so the
                public story and the software platform do not compete with each other.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={LIQUIDLIFE_APP_URL}
                className="ll-pill-btn px-4 py-2 text-sm font-semibold"
                target="_blank"
                rel="noreferrer"
              >
                Open Liquid Life
              </a>
              <Link href="/login" className="ll-pill-btn px-4 py-2 text-sm font-semibold">
                Local Login Route
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
