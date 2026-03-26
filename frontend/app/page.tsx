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

const PROJECT_OWNER = process.env.NEXT_PUBLIC_SITE_OWNER?.trim() || "Rasik N";
const GITHUB_USERNAME = process.env.NEXT_PUBLIC_GITHUB_USERNAME?.trim() || "Angel16989";
const LIQUIDLIFE_APP_URL = process.env.NEXT_PUBLIC_LIQUIDLIFE_APP_URL?.trim() || "https://liquidlife.rasikn.com";

async function getGitHubProjects(): Promise<GitHubRepo[]> {
  try {
    const response = await fetch(
      `https://api.github.com/users/${encodeURIComponent(GITHUB_USERNAME)}/repos?sort=updated&per_page=12`,
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
      .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at))
      .slice(0, 6);
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

  return (
    <main className="ll-page px-4 py-8 sm:px-6">
      <div className="ll-container space-y-6">
        <header className="ll-panel overflow-hidden p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] ll-muted">Welcome To My Projects</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight ll-title sm:text-5xl">
                {PROJECT_OWNER}
                {" "}
                builds live products, ships code fast, and keeps everything wired back to GitHub.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 ll-muted">
                This page auto-imports my latest public GitHub work. You can jump into the live Liquid Life app,
                inspect source code, or open any project directly from here.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href={LIQUIDLIFE_APP_URL}
                className="ll-pill-btn flex items-center justify-center px-4 py-3 text-sm font-semibold"
                target="_blank"
                rel="noreferrer"
              >
                Open Live Run
              </a>
              <a
                href={githubProfileUrl}
                className="ll-pill-btn flex items-center justify-center px-4 py-3 text-sm font-semibold"
                target="_blank"
                rel="noreferrer"
              >
                View GitHub
              </a>
              <Link href="/login" className="ll-pill-btn flex items-center justify-center px-4 py-3 text-sm font-semibold">
                Liquid Life Login
              </Link>
              <a
                href="https://github.com/new/import"
                className="ll-pill-btn flex items-center justify-center px-4 py-3 text-sm font-semibold"
                target="_blank"
                rel="noreferrer"
              >
                Import On GitHub
              </a>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="ll-panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] ll-muted">Featured Project</p>
                <h2 className="mt-2 text-3xl font-semibold ll-title">Liquid Life</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 ll-muted">
                  Full-stack life management platform with documents, procurement AI, admin approvals, auth flows,
                  and live deployment on the tower server.
                </p>
              </div>
              <div className="rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#3d5fa8]">
                Live Product
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                "Next.js 16 frontend",
                "Django REST + PostgreSQL backend",
                "Cloudflare Tunnel deployment",
              ].map((item) => (
                <div key={item} className="ll-panel-soft px-4 py-4 text-sm font-medium ll-title">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={LIQUIDLIFE_APP_URL}
                className="ll-pill-btn px-4 py-2 text-sm font-semibold"
                target="_blank"
                rel="noreferrer"
              >
                Live Subdomain
              </a>
              <Link href="/dashboard" className="ll-pill-btn px-4 py-2 text-sm font-semibold">
                Dashboard
              </Link>
              <a
                href={`${githubProfileUrl}/LIQUIDLIFE`}
                className="ll-pill-btn px-4 py-2 text-sm font-semibold"
                target="_blank"
                rel="noreferrer"
              >
                Source Code
              </a>
            </div>
          </article>

          <aside className="ll-panel p-6">
            <p className="text-xs uppercase tracking-[0.24em] ll-muted">Deployment Note</p>
            <h2 className="mt-2 text-2xl font-semibold ll-title">Subdomain-ready</h2>
            <p className="mt-3 text-sm leading-7 ll-muted">
              Root domain now acts as the project hub. The live app is ready to sit on
              {" "}
              <span className="font-semibold text-[#31476d]">liquidlife.rasikn.com</span>
              {" "}
              once that Cloudflare hostname route is added.
            </p>

            <div className="mt-5 space-y-3 text-sm ll-muted">
              <div className="ll-panel-soft px-4 py-4">
                <p className="font-semibold ll-title">GitHub import</p>
                <p className="mt-1">Projects below are pulled from public GitHub repositories automatically.</p>
              </div>
              <div className="ll-panel-soft px-4 py-4">
                <p className="font-semibold ll-title">Live app URL</p>
                <p className="mt-1 break-all text-[#31476d]">{LIQUIDLIFE_APP_URL}</p>
              </div>
              <div className="ll-panel-soft px-4 py-4">
                <p className="font-semibold ll-title">GitHub account</p>
                <p className="mt-1 break-all text-[#31476d]">{githubProfileUrl}</p>
              </div>
            </div>
          </aside>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] ll-muted">Imported From GitHub</p>
              <h2 className="mt-2 text-3xl font-semibold ll-title">Latest public projects</h2>
            </div>
            <a
              href={githubProfileUrl + "?tab=repositories"}
              className="ll-pill-btn px-4 py-2 text-sm font-semibold"
              target="_blank"
              rel="noreferrer"
            >
              See all repositories
            </a>
          </div>

          {projects.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
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

                  <p className="mt-4 min-h-20 text-sm leading-7 ll-muted">
                    {project.description || "Imported directly from GitHub. Open the repository to inspect the latest source."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {project.language && (
                      <span className="rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs font-semibold text-[#31476d]">
                        {project.language}
                      </span>
                    )}
                    {(project.topics || []).slice(0, 2).map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-semibold text-[#5f6677]"
                      >
                        {topic}
                      </span>
                    ))}
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
                    <a
                      href={project.homepage || project.html_url}
                      className="ll-pill-btn px-3 py-2 text-sm font-semibold"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Live / Import
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="ll-panel p-6">
              <p className="text-sm leading-7 ll-muted">
                GitHub import is enabled, but no public repositories were returned right now. The hub is still ready,
                and the GitHub profile link above remains valid.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
