import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

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

const PROJECT_OWNER = process.env.NEXT_PUBLIC_SITE_OWNER?.trim() || "Rasik Tiwari";
const GITHUB_USERNAME = process.env.NEXT_PUBLIC_GITHUB_USERNAME?.trim() || "Angel16989";
const LIQUIDLIFE_APP_URL = process.env.NEXT_PUBLIC_LIQUIDLIFE_APP_URL?.trim() || "https://liquidlife.rasikn.com";
const PORTFOLIO_URL = process.env.NEXT_PUBLIC_PORTFOLIO_URL?.trim() || "https://rasiktiwari.com.au";

function buildGeneralSummary(repo: GitHubRepo) {
  if (repo.description?.trim()) {
    return repo.description.trim();
  }

  const lower = repo.name.toLowerCase();

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
  const featuredProjects = projects.slice(0, 3);

  return (
    <main className="ll-page px-4 py-8 sm:px-6">
      <div className="ll-container space-y-6">
        <header className="ll-panel overflow-hidden p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] ll-muted">Welcome To My Projects</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight ll-title sm:text-5xl">
                {PROJECT_OWNER}
                {" "}
                ships public projects across web, systems, automation, and product builds.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 ll-muted">
                This site pulls directly from my public GitHub account, turns those repositories into a project index,
                and links out to the live work that is already running. If you want the resume-first view, use my
                portfolio site. If you want the actual project list, this is the domain for it.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href={githubProfileUrl}
                className="ll-pill-btn flex items-center justify-center px-4 py-3 text-sm font-semibold"
                target="_blank"
                rel="noreferrer"
              >
                View GitHub
              </a>
              <a
                href={PORTFOLIO_URL}
                className="ll-pill-btn flex items-center justify-center px-4 py-3 text-sm font-semibold"
                target="_blank"
                rel="noreferrer"
              >
                View Portfolio
              </a>
              <a
                href={LIQUIDLIFE_APP_URL}
                className="ll-pill-btn flex items-center justify-center px-4 py-3 text-sm font-semibold"
                target="_blank"
                rel="noreferrer"
              >
                Liquid Life Live Run
              </a>
              <a
                href="https://github.com/new/import"
                className="ll-pill-btn flex items-center justify-center px-4 py-3 text-sm font-semibold"
                target="_blank"
                rel="noreferrer"
              >
                Import From GitHub
              </a>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="ll-panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] ll-muted">Live Destinations</p>
                <h2 className="mt-2 text-3xl font-semibold ll-title">Projects with real links</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 ll-muted">
                  Live run links stay selective. Right now that means the Liquid Life app and the personal portfolio
                  website, instead of pretending every repository already has a deployed environment.
                </p>
              </div>
              <div className="rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#3d5fa8]">
                GitHub-synced
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="ll-panel-soft px-5 py-5">
                <p className="text-xs uppercase tracking-[0.22em] ll-muted">Portfolio</p>
                <h3 className="mt-2 text-2xl font-semibold ll-title">rasiktiwari.com.au</h3>
                <p className="mt-3 text-sm leading-7 ll-muted">
                  Resume-first portfolio website focused on presentation, personal profile, and professional story.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <a
                    href={PORTFOLIO_URL}
                    className="ll-pill-btn px-3 py-2 text-sm font-semibold"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Live Run
                  </a>
                  <a
                    href={`${githubProfileUrl}/Personal_website_vibecode`}
                    className="ll-pill-btn px-3 py-2 text-sm font-semibold"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Repo
                  </a>
                </div>
              </div>

              <div className="ll-panel-soft px-5 py-5">
                <p className="text-xs uppercase tracking-[0.22em] ll-muted">Product</p>
                <h3 className="mt-2 text-2xl font-semibold ll-title">Liquid Life</h3>
                <p className="mt-3 text-sm leading-7 ll-muted">
                  Full-stack application covering jobs, documents, procurement AI, auth, approvals, and deployment.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <a
                    href={LIQUIDLIFE_APP_URL}
                    className="ll-pill-btn px-3 py-2 text-sm font-semibold"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Live Run
                  </a>
                  <a
                    href={`${githubProfileUrl}/LIQUIDLIFE`}
                    className="ll-pill-btn px-3 py-2 text-sm font-semibold"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Repo
                  </a>
                </div>
              </div>
            </div>
          </article>

          <aside className="ll-panel p-6">
            <p className="text-xs uppercase tracking-[0.24em] ll-muted">How This Page Works</p>
            <h2 className="mt-2 text-2xl font-semibold ll-title">Direct GitHub import</h2>
            <div className="mt-4 space-y-3 text-sm ll-muted">
              <div className="ll-panel-soft px-4 py-4">
                <p className="font-semibold ll-title">Source</p>
                <p className="mt-1">This page calls the public GitHub API for {GITHUB_USERNAME} and rebuilds the list from live repository data.</p>
              </div>
              <div className="ll-panel-soft px-4 py-4">
                <p className="font-semibold ll-title">Project explanations</p>
                <p className="mt-1">
                  Each repository shows either the GitHub description or a general summary generated from the repo name,
                  language, and category.
                </p>
              </div>
              <div className="ll-panel-soft px-4 py-4">
                <p className="font-semibold ll-title">Main portfolio</p>
                <p className="mt-1 break-all text-[#31476d]">{PORTFOLIO_URL}</p>
              </div>
              <div className="ll-panel-soft px-4 py-4">
                <p className="font-semibold ll-title">Live app subdomain</p>
                <p className="mt-1 break-all text-[#31476d]">{LIQUIDLIFE_APP_URL}</p>
              </div>
            </div>
          </aside>
        </section>

        {featuredProjects.length > 0 && (
          <section className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] ll-muted">Recently Updated</p>
              <h2 className="mt-2 text-3xl font-semibold ll-title">Fresh work from GitHub</h2>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {featuredProjects.map((project) => (
                <article key={project.id} className="ll-panel p-5">
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

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] ll-muted">Imported From GitHub</p>
              <h2 className="mt-2 text-3xl font-semibold ll-title">All public repositories</h2>
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
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => {
                const liveRunUrl = getLiveRunUrl(project);

                return (
                  <article key={project.id} className="ll-panel flex flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-2xl font-semibold ll-title">{project.name}</h3>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] ll-muted">
                          Updated {formatDate(project.updated_at)}
                        </p>
                      </div>
                      <div className="rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs font-semibold text-[#3d5fa8]">
                        ★ {project.stargazers_count}
                      </div>
                    </div>

                    <p className="mt-4 min-h-24 text-sm leading-7 ll-muted">{buildGeneralSummary(project)}</p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {project.language && (
                        <span className="rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs font-semibold text-[#31476d]">
                          {project.language}
                        </span>
                      )}
                      <span className="rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-semibold text-[#5f6677]">
                        Public Repo
                      </span>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2">
                      <a
                        href={project.html_url}
                        className="ll-pill-btn px-3 py-2 text-sm font-semibold"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open Repo
                      </a>
                      {liveRunUrl ? (
                        <a
                          href={liveRunUrl}
                          className="ll-pill-btn px-3 py-2 text-sm font-semibold"
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
            <div className="ll-panel p-6">
              <p className="text-sm leading-7 ll-muted">
                GitHub import is enabled, but no public repositories were returned right now. The GitHub profile link
                above is still valid.
              </p>
            </div>
          )}
        </section>

        <section className="ll-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] ll-muted">App Access</p>
              <h2 className="mt-2 text-2xl font-semibold ll-title">Liquid Life stays on its own subdomain</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 ll-muted">
                This root domain is now the projects website. The actual product experience belongs on the app
                subdomain so the portfolio and the software stay separate.
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
