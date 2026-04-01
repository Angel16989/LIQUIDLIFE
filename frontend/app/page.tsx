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

function getLiveRunUrl(repo: GitHubRepo) {
  const lower = repo.name.toLowerCase();
  if (repo.homepage?.trim()) {
    return repo.homepage.trim();
  }
  if (lower === "liquidlife") {
    return LIQUIDLIFE_APP_URL;
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
    matchesKeywords(project, ["data", "analytics", "dashboard", "report", "sql", "python", "excel"]),
  ).length;
  const supportProjectsCount = projects.filter((project) =>
    matchesKeywords(project, ["helpdesk", "support", "admin", "endpoint", "m365", "incident", "cloud"]),
  ).length;
  const featuredProjects = [...projects]
    .sort((left, right) => {
      const leftScore =
        (matchesKeywords(left, ["data", "analytics", "dashboard", "report", "sql", "python"]) ? 4 : 0) +
        (matchesKeywords(left, ["helpdesk", "support", "admin", "endpoint", "m365", "incident", "cloud"]) ? 3 : 0) +
        (matchesKeywords(left, ["automation", "tool", "workflow", "ops"]) ? 2 : 0) +
        (getLiveRunUrl(left) ? 1 : 0);
      const rightScore =
        (matchesKeywords(right, ["data", "analytics", "dashboard", "report", "sql", "python"]) ? 4 : 0) +
        (matchesKeywords(right, ["helpdesk", "support", "admin", "endpoint", "m365", "incident", "cloud"]) ? 3 : 0) +
        (matchesKeywords(right, ["automation", "tool", "workflow", "ops"]) ? 2 : 0) +
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
        <header className={`ll-panel px-5 py-4 sm:px-6 ${styles.topBar}`}>
          <Link href="/" className={styles.brandBlock}>
            <span className={styles.brandKicker}>Rasik Tiwari</span>
            <span className={styles.brandTitle}>Data + IT Portfolio</span>
          </Link>

          <nav className={styles.topNav}>
            <a href="#about" className={styles.topNavLink}>About</a>
            <a href="#capabilities" className={styles.topNavLink}>Capabilities</a>
            <a href="#projects" className={styles.topNavLink}>Projects</a>
            <a href="#contact" className={styles.topNavLink}>Contact</a>
          </nav>

          <div className={styles.topActions}>
            <a
              href={githubProfileUrl}
              className="ll-pill-btn px-4 py-2 text-sm font-semibold"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a
              href={LIQUIDLIFE_APP_URL}
              className={`ll-pill-btn px-4 py-2 text-sm font-semibold ${styles.heroActionPrimary}`}
              target="_blank"
              rel="noreferrer"
            >
              Liquid Life
            </a>
          </div>
        </header>

        <section className={`ll-panel overflow-hidden p-6 sm:p-8 ${styles.hero}`}>
          <div className={styles.heroMesh} aria-hidden="true" />
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <div className={styles.kickerRow}>
                <p className="text-xs uppercase tracking-[0.28em] ll-muted">Portfolio</p>
                <span className={styles.kickerChip}>Data Analyst Direction</span>
              </div>
              <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight ll-title sm:text-5xl">
                I build reporting, support, and operational systems that help teams work with more clarity.
              </h1>
              <p className={`mt-4 max-w-3xl text-base leading-7 ll-muted ${styles.heroLead}`}>
                This is now my main portfolio site. The focus is shifting toward data analysis, business reporting,
                support operations, and workflow improvement, while still showing the technical systems and full-stack
                builds behind that work.
              </p>

              <div className={styles.heroDescriptorGrid}>
                <div className={styles.heroDescriptorCard}>
                  <span className={styles.heroDescriptorLabel}>Reporting Lens</span>
                  <p className={styles.heroDescriptorText}>Metrics, dashboards, operational trends, and clearer decisions.</p>
                </div>
                <div className={styles.heroDescriptorCard}>
                  <span className={styles.heroDescriptorLabel}>Support Grounding</span>
                  <p className={styles.heroDescriptorText}>Real workflow, real users, and systems that need to hold up.</p>
                </div>
                <div className={styles.heroDescriptorCard}>
                  <span className={styles.heroDescriptorLabel}>Build Capacity</span>
                  <p className={styles.heroDescriptorText}>I can analyse the work and still build the tooling behind it.</p>
                </div>
              </div>

              <div className={styles.heroActionRow}>
                <a href="#projects" className="ll-button-primary">Explore Projects</a>
                <a href="#about" className="ll-button-secondary">About My Work</a>
              </div>

              <div className={styles.metricGrid}>
                <div className={styles.metricCard}>
                  <span className={styles.metricValue}>{projects.length || "0"}</span>
                  <span className={styles.metricLabel}>Public repositories</span>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricValue}>{dataProjectsCount || "0"}</span>
                  <span className={styles.metricLabel}>Data / reporting signals</span>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricValue}>{supportProjectsCount || "0"}</span>
                  <span className={styles.metricLabel}>Support / systems builds</span>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricValue}>{liveProjectsCount}</span>
                  <span className={styles.metricLabel}>Live destinations</span>
                </div>
              </div>
            </div>

            <div className={styles.heroRail}>
              <div className={styles.heroRailCard}>
                <p className={styles.railEyebrow}>Currently Focused On</p>
                <h2 className="mt-2 text-3xl font-semibold ll-title">Turning messy operational work into visible, useful information.</h2>
                <p className="mt-3 text-sm leading-7 ll-muted">
                  The goal is not only building software. It is using data, process, and systems thinking to improve
                  support delivery, reporting quality, and day-to-day execution.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className={styles.tag}>Reporting</span>
                  <span className={styles.tag}>Operations</span>
                  <span className={styles.tag}>IT Support</span>
                  <span className={styles.tag}>Automation</span>
                </div>
              </div>

              <div className={styles.heroVisualCard} aria-hidden="true">
                <span className={styles.heroVisualBadge}>Data</span>
                <span className={`${styles.heroVisualBadge} ${styles.heroVisualBadgeAlt}`}>IT Ops</span>
                <div className={styles.heroVisualImage} />
              </div>

              <div className={styles.signalStack}>
                <div className={styles.signalCard}>
                  <span className={styles.signalLabel}>Positioning</span>
                  <p className={styles.signalValue}>Data analysis with strong IT support and systems grounding</p>
                </div>
                <div className={styles.signalCard}>
                  <span className={styles.signalLabel}>Latest update</span>
                  <p className={styles.signalValue}>{latestProject ? formatDate(latestProject.updated_at) : "Live"}</p>
                </div>
                <div className={styles.signalCard}>
                  <span className={styles.signalLabel}>Primary product</span>
                  <p className={styles.signalValue}>Liquid Life on its own app subdomain</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <article className={`ll-panel p-6 ${styles.sectionPanel}`}>
            <p className={`text-xs uppercase tracking-[0.24em] ll-muted ${styles.sectionEyebrow}`}>About</p>
            <h2 className="mt-2 text-3xl font-semibold ll-title">A portfolio built around insight, support, and execution.</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 ll-muted">
              <p>
                I am repositioning my work toward data-oriented roles without dropping the practical side of my
                background. That means the portfolio now emphasises reporting, operational visibility, service process,
                and systems that make teams easier to run.
              </p>
              <p>
                My strongest overlap is where analysis meets reality: support environments, workflow bottlenecks,
                internal tools, and live products that need both structure and technical delivery.
              </p>
            </div>
          </article>

          <aside className={`ll-panel p-6 ${styles.sectionPanel}`}>
            <p className="text-xs uppercase tracking-[0.24em] ll-muted">Snapshot</p>
            <h2 className="mt-2 text-2xl font-semibold ll-title">What I want this portfolio to communicate.</h2>
            <div className={`mt-4 space-y-3 text-sm ll-muted ${styles.infoStack}`}>
              <div className={`ll-panel-soft px-4 py-4 ${styles.infoCard}`}>
                <p className="font-semibold ll-title">Data-first lens</p>
                <p className="mt-1">Dashboards, reporting, trend visibility, and clearer decision support.</p>
              </div>
              <div className={`ll-panel-soft px-4 py-4 ${styles.infoCard}`}>
                <p className="font-semibold ll-title">Support grounding</p>
                <p className="mt-1">Troubleshooting, service workflow, admin tasks, and operational discipline.</p>
              </div>
              <div className={`ll-panel-soft px-4 py-4 ${styles.infoCard}`}>
                <p className="font-semibold ll-title">Execution</p>
                <p className="mt-1">I can still build the systems, not just talk about them.</p>
              </div>
            </div>
          </aside>
        </section>

        <section id="capabilities" className="space-y-4">
          <div className={styles.sectionHeader}>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] ll-muted">Capabilities</p>
              <h2 className="mt-2 text-3xl font-semibold ll-title">The mix I want to be known for.</h2>
            </div>
            <p className={styles.sectionHeaderText}>
              A portfolio that sits between analysis, support operations, and practical implementation.
            </p>
          </div>

          <div className={`grid gap-4 md:grid-cols-3 ${styles.capabilityGrid}`}>
            <article className={`ll-panel-soft p-5 ${styles.capabilityCard}`}>
              <p className={styles.capabilityEyebrow}>Data Analysis</p>
              <h3 className="mt-2 text-2xl font-semibold ll-title">Operational reporting</h3>
              <p className="mt-3 text-sm leading-7 ll-muted">
                Turning activity into useful reporting, trend tracking, and information that supports decisions.
              </p>
            </article>

            <article className={`ll-panel-soft p-5 ${styles.capabilityCard}`}>
              <p className={styles.capabilityEyebrow}>IT Support</p>
              <h3 className="mt-2 text-2xl font-semibold ll-title">Service workflow</h3>
              <p className="mt-3 text-sm leading-7 ll-muted">
                Support process, user issues, admin tasks, and systems that keep operational work dependable.
              </p>
            </article>

            <article className={`ll-panel-soft p-5 ${styles.capabilityCard}`}>
              <p className={styles.capabilityEyebrow}>Automation</p>
              <h3 className="mt-2 text-2xl font-semibold ll-title">Practical tooling</h3>
              <p className="mt-3 text-sm leading-7 ll-muted">
                Internal tools and product builds that reduce manual effort and make workflows easier to manage.
              </p>
            </article>
          </div>
        </section>

        {featuredProjects.length > 0 && (
          <section className="space-y-4">
            <div className={styles.sectionHeader}>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] ll-muted">Featured Work</p>
                <h2 className="mt-2 text-3xl font-semibold ll-title">Projects that best reflect the direction.</h2>
              </div>
              <p className={styles.sectionHeaderText}>
                These are the builds that best show the analyst-plus-operator direction of the portfolio.
              </p>
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
            <div className={styles.sectionHeaderCompact}>
              <p className="text-xs uppercase tracking-[0.24em] ll-muted">GitHub Projects</p>
              <h2 className="mt-2 text-3xl font-semibold ll-title">Live GitHub-backed project index.</h2>
              <p className={styles.sectionHeaderText}>
                Pulled from GitHub, filtered through the story this portfolio is trying to tell.
              </p>
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
                      <div className={styles.starBadge}>★ {project.stargazers_count}</div>
                    </div>

                    <p className={`mt-4 min-h-24 text-sm leading-7 ll-muted ${styles.repoSummary}`}>{buildGeneralSummary(project)}</p>

                    <div className={`mt-4 flex flex-wrap gap-2 ${styles.tagRow}`}>
                      {project.language ? <span className={styles.tag}>{project.language}</span> : null}
                      {matchesKeywords(project, ["data", "analytics", "dashboard", "report", "sql", "python"]) ? (
                        <span className={styles.tag}>Data</span>
                      ) : null}
                      {matchesKeywords(project, ["helpdesk", "support", "admin", "endpoint", "m365", "incident", "cloud"]) ? (
                        <span className={styles.tag}>Support / Ops</span>
                      ) : null}
                      <span className={styles.tagMuted}>Public Repo</span>
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

        <section id="contact" className={`ll-panel p-6 ${styles.contactPanel}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] ll-muted">Contact / Next Step</p>
              <h2 className="mt-2 text-2xl font-semibold ll-title">This root domain is now the main portfolio home.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 ll-muted">
                The older portfolio can be retired over time. This site is now the main public layer, while Liquid
                Life remains on its own subdomain as a live product example.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={githubProfileUrl}
                className="ll-pill-btn px-4 py-2 text-sm font-semibold"
                target="_blank"
                rel="noreferrer"
              >
                GitHub Profile
              </a>
              <a
                href={LIQUIDLIFE_APP_URL}
                className="ll-pill-btn px-4 py-2 text-sm font-semibold"
                target="_blank"
                rel="noreferrer"
              >
                Open Liquid Life
              </a>
              <Link href="/login" className="ll-pill-btn px-4 py-2 text-sm font-semibold">
                App Login
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
