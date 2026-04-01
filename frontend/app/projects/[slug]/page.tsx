import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./project-detail.module.css";
import {
  GITHUB_USERNAME,
  buildProjectProfile,
  formatDate,
  getFeaturedProjects,
  getGitHubProjects,
  getRepoBySlug,
  toProjectSlug,
} from "@/lib/githubPortfolio";

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const projects = await getGitHubProjects();
  return projects.slice(0, 30).map((project) => ({ slug: toProjectSlug(project.name) }));
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const projects = await getGitHubProjects();
  const project = getRepoBySlug(projects, slug);

  if (!project) {
    notFound();
  }

  const profile = buildProjectProfile(project);
  const githubProfileUrl = `https://github.com/${GITHUB_USERNAME}`;
  const relatedProjects = getFeaturedProjects(projects).filter((item) => item.id !== project.id).slice(0, 3);

  return (
    <main className={`ll-page px-4 py-8 sm:px-6 ${styles.page}`}>
      <div className={styles.backdrop} aria-hidden="true">
        <span className={styles.glowOne} />
        <span className={styles.glowTwo} />
      </div>

      <div className={`ll-container space-y-6 ${styles.stack}`}>
        <Link href="/" className={styles.backLink}>
          <span aria-hidden="true">←</span>
          Back to portfolio
        </Link>

        <section className={`ll-panel p-6 sm:p-8 ${styles.hero}`}>
          <div className={styles.heroGrid}>
            <div className="space-y-6">
              <div className={styles.heroLabelRow}>
                <span className={styles.kicker}>{profile.category}</span>
                <span className={styles.badge}>{profile.label}</span>
              </div>

              <div className="space-y-4">
                <h1 className={styles.heroTitle}>{project.name}</h1>
                <p className={styles.heroSummary}>{profile.summary}</p>
              </div>

              <div className={styles.heroButtonRow}>
                <a href={project.html_url} className="ll-button-primary" target="_blank" rel="noreferrer">
                  Open GitHub Repo
                </a>
                {profile.liveRunUrl ? (
                  <a
                    href={profile.liveRunUrl}
                    className={`ll-pill-btn px-4 py-3 text-sm font-semibold ${styles.heroSecondaryButton}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Live Run
                  </a>
                ) : null}
                <a
                  href={`${githubProfileUrl}?tab=repositories`}
                  className={`ll-pill-btn px-4 py-3 text-sm font-semibold ${styles.heroSecondaryButton}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  More Repositories
                </a>
              </div>

              <div className={styles.metaGrid}>
                <div className={styles.metaCard}>
                  <span className={styles.metaLabel}>Updated</span>
                  <p className={styles.metaValue}>{formatDate(project.updated_at)}</p>
                </div>
                <div className={styles.metaCard}>
                  <span className={styles.metaLabel}>Language</span>
                  <p className={styles.metaValue}>{project.language || "Mixed / Unspecified"}</p>
                </div>
                <div className={styles.metaCard}>
                  <span className={styles.metaLabel}>Stars</span>
                  <p className={styles.metaValue}>{project.stargazers_count}</p>
                </div>
                <div className={styles.metaCard}>
                  <span className={styles.metaLabel}>Live</span>
                  <p className={styles.metaValue}>{profile.liveRunUrl ? "Available" : "Repo Only"}</p>
                </div>
              </div>
            </div>

            <aside className={styles.heroVisual} aria-hidden="true">
              <span className={`${styles.heroVisualChip} ${styles.heroVisualChipPrimary}`}>{profile.category}</span>
              <span className={`${styles.heroVisualChip} ${styles.heroVisualChipSecondary}`}>{profile.label}</span>
              <div className={styles.heroVisualCard}>
                <span className={styles.heroVisualEyebrow}>Portfolio Signal</span>
                <p className={styles.heroVisualText}>{profile.positioning}</p>
              </div>
            </aside>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <article className={`ll-panel p-6 ${styles.sectionPanel}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>What This Project Shows</p>
                <h2 className="mt-2 text-3xl font-semibold ll-title">Why it belongs in the portfolio.</h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-8 ll-muted">{profile.whyItMatters}</p>
            <p className="mt-4 text-sm leading-8 ll-muted">{profile.positioning}</p>
          </article>

          <aside className={`ll-panel p-6 ${styles.sectionPanel}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Stack</p>
                <h2 className="mt-2 text-2xl font-semibold ll-title">Technologies and signals.</h2>
              </div>
            </div>
            <div className={`mt-5 ${styles.stackRow}`}>
              {profile.stack.length > 0 ? profile.stack.map((entry) => <span key={entry} className={styles.tag}>{entry}</span>) : <span className={styles.tagMuted}>General technical work</span>}
            </div>
          </aside>
        </section>

        <section className={`ll-panel p-6 ${styles.sectionPanel}`}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Highlights</p>
              <h2 className="mt-2 text-3xl font-semibold ll-title">Key signals from this repo.</h2>
            </div>
            <p className={styles.sectionText}>This section exists to make even non-web repositories easier to understand at a glance.</p>
          </div>

          <div className={`mt-6 ${styles.highlightGrid}`}>
            {profile.highlights.map((highlight) => (
              <article key={highlight} className={`ll-panel-soft p-5 ${styles.highlightCard}`}>
                <p className={styles.highlightLabel}>Portfolio highlight</p>
                <p className="mt-3 text-sm leading-8 ll-muted">{highlight}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`ll-panel p-6 ${styles.sectionPanel}`}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Context</p>
              <h2 className="mt-2 text-3xl font-semibold ll-title">How to read this project.</h2>
            </div>
            <p className={styles.sectionText}>Some repos are apps, some are tools, some are experiments. This page gives each one enough framing to make sense.</p>
          </div>

          <div className={`mt-6 ${styles.infoGrid}`}>
            <article className={`ll-panel-soft p-5 ${styles.infoBlock}`}>
              <p className={styles.highlightLabel}>Repository link</p>
              <p className="mt-3 text-sm leading-8 ll-muted">
                The source of truth remains GitHub. This page exists to make the project legible as portfolio work before somebody leaves the site.
              </p>
            </article>
            <article className={`ll-panel-soft p-5 ${styles.infoBlock}`}>
              <p className={styles.highlightLabel}>Live run policy</p>
              <p className="mt-3 text-sm leading-8 ll-muted">
                Only genuine web apps get live demo links. Scripts, libraries, and utilities stay repo-first but still get proper explanation here.
              </p>
            </article>
          </div>
        </section>

        {relatedProjects.length > 0 ? (
          <section className={`ll-panel p-6 ${styles.sectionPanel}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Related Projects</p>
                <h2 className="mt-2 text-3xl font-semibold ll-title">More portfolio work to explore.</h2>
              </div>
            </div>

            <div className={`mt-6 ${styles.relatedGrid}`}>
              {relatedProjects.map((related) => {
                const relatedProfile = buildProjectProfile(related);
                return (
                  <article key={related.id} className={`ll-panel-soft p-5 ${styles.relatedCard}`}>
                    <p className={styles.highlightLabel}>{relatedProfile.category}</p>
                    <Link href={`/projects/${toProjectSlug(related.name)}`} className={`mt-3 ${styles.relatedCardTitle}`}>
                      {related.name}
                    </Link>
                    <p className="mt-3 text-sm leading-7 ll-muted">{relatedProfile.summary}</p>
                    <div className={`mt-4 ${styles.tagRow}`}>
                      {related.language ? <span className={styles.tag}>{related.language}</span> : null}
                      <span className={styles.tagMuted}>{relatedProfile.label}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
