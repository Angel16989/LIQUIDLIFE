import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import styles from "./projects-hub.module.css";
import {
  GITHUB_USERNAME,
  LINKEDIN_URL,
  LIQUIDLIFE_APP_URL,
  buildGeneralSummary,
  formatDate,
  getFeaturedProjects,
  getGitHubProjects,
  getLiveRunUrl,
  getPortfolioCounts,
  matchesKeywords,
  toProjectSlug,
} from "@/lib/githubPortfolio";

const journeyMilestones = [
  {
    eyebrow: "Early Spark",
    title: "Inspired at home, then pulled deeper by curiosity.",
    description:
      "My interest in technology started early, and my dad was a big part of that. That first spark turned into a habit of opening things up, asking how they work, and learning by trying instead of waiting for perfect confidence.",
  },
  {
    eyebrow: "International Journey",
    title: "Building a life and career in Australia without a straight-line path.",
    description:
      "My journey as an international student and professional in Australia has been shaped by persistence, adjustment, and real effort. It has not been a perfect path, but it has made me more grounded, adaptable, and deliberate about where I want to go next.",
  },
  {
    eyebrow: "Hands-On Growth",
    title: "Learning through support work, systems, and experimentation.",
    description:
      "A lot of my growth has come from doing: supporting users, troubleshooting issues, working through live environments, and experimenting with tools, servers, and cloud setups outside formal work.",
  },
  {
    eyebrow: "Current Direction",
    title: "Moving toward data-focused roles without losing the practical edge.",
    description:
      "What I want next is work that combines analysis, problem solving, operational visibility, and real human usefulness. Data is the direction, but grounded systems thinking is still part of how I work.",
  },
];

const communityInvolvement = [
  {
    name: "GDG Brisbane",
    label: "Community and events",
    description:
      "A space where I stay connected to technology beyond work, meet people who are building and learning, and stay involved in the wider Brisbane tech community in a way that feels active rather than passive.",
  },
  {
    name: "TechWalking",
    label: "Connection and conversation",
    description:
      "I value communities that make tech feel more human. TechWalking reflects that side of me: learning through conversation, movement, and shared curiosity instead of only screens and job titles.",
  },
  {
    name: "Changcuti / cat rescue volunteering",
    label: "Giving back",
    description:
      "Volunteering matters to me because it keeps perspective. I want my time in Australia and in tech to include contribution, care, and real community involvement beyond career growth or titles.",
  },
];

const labExperiments = [
  {
    title: "Cloud VMs and servers",
    description:
      "I enjoy spinning up environments, testing ideas in the cloud, and learning what breaks, what scales, and what is actually practical.",
  },
  {
    title: "Modern and vintage devices",
    description:
      "I like the contrast between newer systems and older hardware. Exploring both helps me understand technology as something layered, not disposable.",
  },
  {
    title: "Home-lab style curiosity",
    description:
      "A lot of my learning comes from trying things before I feel fully ready. That discomfort is often where the most useful growth happens.",
  },
];

const beyondTech = [
  {
    title: "Running",
    description: "I like doing things that keep me moving, reset my head, and build consistency outside screens.",
  },
  {
    title: "Podcasts and news",
    description: "I enjoy learning from different voices, staying aware of what is happening, and connecting tech to the broader world.",
  },
  {
    title: "Communities and future ideas",
    description: "Joining groups, supporting events, and even the idea of starting a podcast one day all come from the same place: curiosity and wanting to contribute.",
  },
];

const photoMoments = [
  {
    title: "GDG Brisbane",
    eyebrow: "Community",
    description: "Showing up for local developer spaces, conversations, and community momentum.",
    image: "/portfolio/moments/gdg-brisbane.jpeg",
    size: "feature",
  },
  {
    title: "TechWalking",
    eyebrow: "Connection",
    description: "The kind of tech community that feels more human and less transactional.",
    image: "/portfolio/moments/techwalking.jpeg",
    size: "tall",
  },
  {
    title: "Helping events happen",
    eyebrow: "Volunteering",
    description: "I like contributing to community spaces, not only attending them.",
    image: "/portfolio/moments/gdg-host.jpeg",
    size: "standard",
  },
  {
    title: "GDG Sydney",
    eyebrow: "Exploration",
    description: "Stepping outside one bubble and learning from broader communities.",
    image: "/portfolio/moments/gdg-sydney.jpeg",
    size: "wide",
  },
  {
    title: "Amazon User Groups",
    eyebrow: "Builders",
    description: "Staying close to people who actually ship, test, and share what they learn.",
    image: "/portfolio/moments/amazon-user-groups.jpeg",
    size: "standard",
  },
  {
    title: "Security talks",
    eyebrow: "Learning",
    description: "Useful growth often starts by listening to practitioners talk through real problems.",
    image: "/portfolio/moments/sec-talks.jpeg",
    size: "standard",
  },
  {
    title: "AI & Society",
    eyebrow: "Perspective",
    description: "Technology gets more interesting when it is connected back to people and impact.",
    image: "/portfolio/moments/ai-society.jpeg",
    size: "wide",
  },
  {
    title: "Bitcoin developer meetings",
    eyebrow: "Curiosity",
    description: "I like exploring systems that push me to think differently, even outside my core lane.",
    image: "/portfolio/moments/bitcoin-developer-meetings.jpeg",
    size: "standard",
  },
  {
    title: "Support operations",
    eyebrow: "Grounded work",
    description: "A lot of my thinking still comes from practical support environments and real user problems.",
    image: "/portfolio/moments/greenlight-msp.jpeg",
    size: "standard",
  },
  {
    title: "Capstone",
    eyebrow: "Build and explain",
    description: "Projects become more valuable when you can communicate what they solve and why they matter.",
    image: "/portfolio/moments/capstone.jpeg",
    size: "tall",
  },
  {
    title: "Study outside the room",
    eyebrow: "Reset",
    description: "Some of the best reflection happens away from the desk, not only at the desk.",
    image: "/portfolio/moments/kiama-beachstudy.jpeg",
    size: "standard",
  },
  {
    title: "Podcasts and future ideas",
    eyebrow: "Beyond work",
    description: "I like conversations, ideas, and the possibility of starting my own podcast one day.",
    image: "/portfolio/moments/podcasting-love.jpeg",
    size: "standard",
  },
  {
    title: "Showing up well",
    eyebrow: "Professional presence",
    description: "Growth also means being present, prepared, and involved when opportunities come up.",
    image: "/portfolio/moments/teqsa-represent.jpeg",
    size: "wide",
  },
] as const;

export default async function HomePage() {
  const headerStore = await headers();
  const host = (headerStore.get("x-forwarded-host") || headerStore.get("host") || "").toLowerCase();

  if (host.startsWith("liquidlife.")) {
    redirect("/login");
  }

  const projects = await getGitHubProjects();
  const githubProfileUrl = `https://github.com/${GITHUB_USERNAME}`;
  const { dataProjectsCount, supportProjectsCount, liveProjectsCount } = getPortfolioCounts(projects);
  const featuredProjects = getFeaturedProjects(projects);
  const latestProject = projects[0];
  const photoSpanClassMap = {
    feature: styles.momentFeature,
    wide: styles.momentWide,
    tall: styles.momentTall,
    standard: "",
  } as const;

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
            <span className={styles.brandTitle}>Tech, Data & Community Portfolio</span>
          </Link>

          <nav className={styles.topNav}>
            <a href="#about" className={styles.topNavLink}>About</a>
            <a href="#journey" className={styles.topNavLink}>Journey</a>
            <a href="#community" className={styles.topNavLink}>Community</a>
            <a href="#moments" className={styles.topNavLink}>Moments</a>
            <a href="#labs" className={styles.topNavLink}>Labs</a>
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
              href={LINKEDIN_URL}
              className="ll-pill-btn px-4 py-2 text-sm font-semibold"
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn
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
                <span className={styles.kickerChip}>Human, curious, hands-on</span>
              </div>
              <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight ll-title sm:text-5xl">
                I am a tech professional who enjoys solving problems, experimenting with systems, helping people, and giving back to the community.
              </h1>
              <p className={`mt-4 max-w-3xl text-base leading-7 ll-muted ${styles.heroLead}`}>
                Brisbane-based and shaped by an international journey, I am moving toward more data-focused work while
                staying grounded in IT support, systems thinking, and hands-on experimentation. I want this site to
                show not just what I can build, but what I care about: people, learning, contribution, and real-world
                problem solving.
              </p>

              <div className={styles.heroDescriptorGrid}>
                <div className={styles.heroDescriptorCard}>
                  <span className={styles.heroDescriptorLabel}>Curiosity</span>
                  <p className={styles.heroDescriptorText}>I learn by trying things, breaking them, and understanding how they fit together.</p>
                </div>
                <div className={styles.heroDescriptorCard}>
                  <span className={styles.heroDescriptorLabel}>Helping mindset</span>
                  <p className={styles.heroDescriptorText}>Support work, volunteering, and community involvement all come from the same instinct.</p>
                </div>
                <div className={styles.heroDescriptorCard}>
                  <span className={styles.heroDescriptorLabel}>Operational clarity</span>
                  <p className={styles.heroDescriptorText}>I like turning messy environments into clearer systems, workflows, and decisions people can use.</p>
                </div>
              </div>

              <div className={styles.heroActionRow}>
                <a href="#about" className="ll-button-primary">Read My Story</a>
                <a href="#projects" className="ll-button-secondary">Explore Projects</a>
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
                <p className={styles.railEyebrow}>What Drives Me</p>
                <h2 className="mt-2 text-3xl font-semibold ll-title">Technology feels most meaningful to me when it helps people and connects communities.</h2>
                <p className="mt-3 text-sm leading-7 ll-muted">
                  I do care about systems, reporting, and technical depth, but I do not want my career to feel
                  isolated from people. The best version of this journey includes support, contribution, curiosity,
                  and growth beyond a job title.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className={styles.tag}>Community</span>
                  <span className={styles.tag}>Learning</span>
                  <span className={styles.tag}>Support</span>
                  <span className={styles.tag}>Experimentation</span>
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
                  <p className={styles.signalValue}>Data-focused, support-grounded, community-minded</p>
                </div>
                <div className={styles.signalCard}>
                  <span className={styles.signalLabel}>Community signals</span>
                  <p className={styles.signalValue}>GDG Brisbane, TechWalking, and volunteering matter to me</p>
                </div>
                <div className={styles.signalCard}>
                  <span className={styles.signalLabel}>Latest update</span>
                  <p className={styles.signalValue}>{latestProject ? formatDate(latestProject.updated_at) : "Live"}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <article className={`ll-panel p-6 ${styles.sectionPanel}`}>
            <p className={`text-xs uppercase tracking-[0.24em] ll-muted ${styles.sectionEyebrow}`}>About Me</p>
            <h2 className="mt-2 text-3xl font-semibold ll-title">I enjoy technology most when it is practical, human, and worth sharing.</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 ll-muted">
              <p>
                I am a Brisbane-based tech professional with a hands-on background in IT support, troubleshooting,
                systems work, and real-world problem solving. My interest in tech started early, with a lot of that
                spark coming from my dad, and it grew into a habit of learning by opening things up and figuring them
                out.
              </p>
              <p>
                I am moving further toward data-focused work because I like turning messy environments into something
                clearer: trends, reports, patterns, and decisions that people can actually use. But I do not want to
                lose the hands-on side of my background. I still like systems, infrastructure, troubleshooting, and
                experimenting with tools until I understand them properly.
              </p>
              <p>
                My journey in Australia as an international student and professional has made me value persistence,
                curiosity, and community a lot more deeply. Just as important, I want this site to show that I care
                about more than work. I like helping people, contributing to communities, staying active, and making
                time for learning outside formal roles.
              </p>
            </div>
          </article>

          <aside className={`ll-panel p-6 ${styles.sectionPanel}`}>
            <p className="text-xs uppercase tracking-[0.24em] ll-muted">Snapshot</p>
            <h2 className="mt-2 text-2xl font-semibold ll-title">What I want this portfolio to communicate.</h2>
            <div className={`mt-4 space-y-3 text-sm ll-muted ${styles.infoStack}`}>
              <div className={`ll-panel-soft px-4 py-4 ${styles.infoCard}`}>
                <p className="font-semibold ll-title">Curious by default</p>
                <p className="mt-1">Cloud labs, servers, devices, and learning by opening systems up and trying things.</p>
              </div>
              <div className={`ll-panel-soft px-4 py-4 ${styles.infoCard}`}>
                <p className="font-semibold ll-title">Helping mindset</p>
                <p className="mt-1">Support users, contribute to communities, volunteer where I can, and share what I learn.</p>
              </div>
              <div className={`ll-panel-soft px-4 py-4 ${styles.infoCard}`}>
                <p className="font-semibold ll-title">Growing in public</p>
                <p className="mt-1">My journey has not been perfect or straight, but it has been real, persistent, and deliberate.</p>
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

        <section id="journey" className="space-y-4">
          <div className={styles.sectionHeader}>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] ll-muted">My Journey</p>
              <h2 className="mt-2 text-3xl font-semibold ll-title">Persistence, curiosity, and real effort shaped the path.</h2>
            </div>
            <p className={styles.sectionHeaderText}>
              I do not come from a perfect straight-line story. That matters, because it explains why experimentation, growth, and effort are such a big part of how I work.
            </p>
          </div>

          <div className={styles.timeline}>
            {journeyMilestones.map((step) => (
              <article key={step.title} className={`ll-panel p-5 ${styles.timelineCard}`}>
                <p className={styles.timelineEyebrow}>{step.eyebrow}</p>
                <h3 className="mt-2 text-2xl font-semibold ll-title">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 ll-muted">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="community" className="space-y-4">
          <div className={styles.sectionHeader}>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] ll-muted">Community / Volunteering</p>
              <h2 className="mt-2 text-3xl font-semibold ll-title">Work matters, but community matters too.</h2>
            </div>
            <p className={styles.sectionHeaderText}>
              I want the site to show that giving back is not an afterthought. Community, volunteering, and showing up for people are part of how I want to build my life in tech.
            </p>
          </div>

          <div className={styles.storyGrid}>
            {communityInvolvement.map((item) => (
              <article key={item.name} className={`ll-panel p-5 ${styles.storyCard}`}>
                <p className={styles.storyEyebrow}>{item.label}</p>
                <h3 className="mt-2 text-2xl font-semibold ll-title">{item.name}</h3>
                <p className="mt-3 text-sm leading-7 ll-muted">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="moments" className="space-y-4">
          <div className={styles.sectionHeader}>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] ll-muted">Moments / Field Notes</p>
              <h2 className="mt-2 text-3xl font-semibold ll-title">The portfolio should show what I am around, not only what I say.</h2>
            </div>
            <p className={styles.sectionHeaderText}>
              These moments matter because they show the real texture of the journey: communities, events, learning
              environments, support work, experimentation, and the parts of life around the work itself.
            </p>
          </div>

          <div className={styles.momentsGrid}>
            {photoMoments.map((moment) => (
              <article
                key={moment.title}
                className={`${styles.momentCard} ${photoSpanClassMap[moment.size]}`}
              >
                <div className={styles.momentMedia}>
                  <Image
                    src={moment.image}
                    alt={moment.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className={styles.momentImage}
                  />
                </div>
                <div className={styles.momentContent}>
                  <p className={styles.momentEyebrow}>{moment.eyebrow}</p>
                  <h3 className={styles.momentTitle}>{moment.title}</h3>
                  <p className={styles.momentDescription}>{moment.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="labs" className="space-y-4">
          <div className={styles.sectionHeader}>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] ll-muted">Labs / Experiments / Curiosity</p>
              <h2 className="mt-2 text-3xl font-semibold ll-title">A lot of my learning comes from real experimentation.</h2>
            </div>
            <p className={styles.sectionHeaderText}>
              One of my strongest traits is that I will try things even when I do not feel 100% ready yet. That is where a lot of the useful learning has happened.
            </p>
          </div>

          <div className={styles.storyGrid}>
            {labExperiments.map((item) => (
              <article key={item.title} className={`ll-panel p-5 ${styles.storyCard}`}>
                <p className={styles.storyEyebrow}>Hands-on exploration</p>
                <h3 className="mt-2 text-2xl font-semibold ll-title">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 ll-muted">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="beyond-tech" className="space-y-4">
          <div className={styles.sectionHeader}>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] ll-muted">Beyond Tech</p>
              <h2 className="mt-2 text-3xl font-semibold ll-title">I do not want the site to feel one-dimensional.</h2>
            </div>
            <p className={styles.sectionHeaderText}>
              The things I do outside work still say something about how I think: stay curious, stay active, keep learning, and make time for people and ideas.
            </p>
          </div>

          <div className={styles.storyGrid}>
            {beyondTech.map((item) => (
              <article key={item.title} className={`ll-panel p-5 ${styles.storyCard}`}>
                <p className={styles.storyEyebrow}>Outside work</p>
                <h3 className="mt-2 text-2xl font-semibold ll-title">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 ll-muted">{item.description}</p>
              </article>
            ))}
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
                  <div className={`mt-5 flex flex-wrap gap-2 ${styles.repoActions}`}>
                    <Link href={`/projects/${toProjectSlug(project.name)}`} className={`ll-pill-btn px-3 py-2 text-sm font-semibold ${styles.repoAction}`}>
                      Project Page
                    </Link>
                    {getLiveRunUrl(project) ? (
                      <a
                        href={getLiveRunUrl(project)}
                        className={`ll-pill-btn px-3 py-2 text-sm font-semibold ${styles.repoActionPrimary}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Live Run
                      </a>
                    ) : null}
                  </div>
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
                      <Link href={`/projects/${toProjectSlug(project.name)}`} className={`ll-pill-btn px-3 py-2 text-sm font-semibold ${styles.repoAction}`}>
                        Project Page
                      </Link>
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
                This portfolio is meant to show the whole picture: technical work, curiosity, community involvement,
                and the way I want to keep growing in Australia through both technology and contribution.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={LINKEDIN_URL}
                className="ll-pill-btn px-4 py-2 text-sm font-semibold"
                target="_blank"
                rel="noreferrer"
              >
                Connect on LinkedIn
              </a>
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
