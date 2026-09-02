import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OrbitCanvas, TerrainCanvas } from "./PortfolioEffects";
import { caseStudies } from "@/content/caseStudies";
import styles from "./portfolio-redesign.module.css";
import {
  GITHUB_USERNAME,
  LINKEDIN_URL,
  LIQUIDLIFE_APP_URL,
} from "@/lib/githubPortfolio";

const marqueeItems = [
  "Snowflake SQL",
  "Tableau",
  "Matillion ETL",
  "Data validation",
  "Forecasting support",
  "Power BI",
  "Excel analysis",
  "Root cause analysis",
  "Requirements clarification",
  "Microsoft 365 / Azure AD",
  "Python",
  "Git / GitHub",
];

const toolkit = [
  {
    tag: "Layer 01",
    title: "Business Intelligence",
    items: ["SQL / Snowflake", "Tableau dashboards", "Matillion ETL support", "Excel analysis", "Power BI basics"],
  },
  {
    tag: "Layer 02",
    title: "Analysis & delivery",
    items: ["Forecasting support", "Data validation", "Processing-rule checks", "Requirements clarification", "Root cause analysis"],
  },
  {
    tag: "Layer 03",
    title: "Technical foundation",
    items: ["Microsoft 365 / Azure AD", "Python basics", "Git / GitHub", "API / JSON awareness", "Ticketing & documentation"],
  },
];

const journey = [
  {
    year: "2023-25",
    phase: "Foundation",
    title: "Bachelor of IT at Kent Institute",
    body: "Studied data analytics, cloud, networking, cybersecurity and secure software, then shipped a full-stack capstone with auth, payments and an AI chatbot.",
  },
  {
    year: "2024-26",
    phase: "Grounding",
    title: "IT Support Engineer at FLS",
    body: "Frontline support across Windows, Microsoft 365, accounts and devices in an SLA-driven environment - the operational discipline that now underpins my data work.",
  },
  {
    year: "2026",
    phase: "The pivot",
    title: "Into Business Intelligence",
    body: "Moved into a data role at Lime Intelligence, applying that grounding to Snowflake, Tableau and Matillion across aviation and commercial reporting.",
  },
  {
    year: "Now",
    phase: "Direction",
    title: "Owning data quality",
    body: "Focused on data integrity, forecasting inputs and production reporting - tracing every number back to its source and making it explainable.",
  },
];

const experience = [
  {
    role: "Data Technician - BI & Analytics",
    company: "Lime Intelligence",
    location: "Australia",
    period: "May 2026 - Present",
    points: [
      "Support aviation and commercial reporting across airport clients by validating source files, business rules and dashboard outputs.",
      "Use Snowflake SQL to investigate data anomalies, duplicates, missing values and source-to-reporting mismatches.",
      "Assist forecasting workstreams by researching alternative data sources and preparing input datasets for long-term market and passenger forecasts.",
      "Validate processing rules and integrity checks across pipelines so transformation logic aligns with operator files and expected outputs.",
      "Support Matillion-based budget and forecast processing with load checks, rule validation and post-processing reconciliation.",
      "Partner with Customer Success, Product, Data and Frontend Engineering to diagnose issues, test fixes and improve automation.",
      "Translate technical findings for non-technical stakeholders: what changed, why it happened, and what action is required.",
      "Maintain documentation and repeatable processes for data loading, dashboard checks and recurring client data issues.",
    ],
  },
  {
    role: "IT Support Engineer",
    company: "FLS",
    location: "Australia",
    period: "Jan 2024 - May 2026",
    points: [
      "Provided frontline support across Windows, Microsoft 365, accounts, devices and business apps in an SLA-driven environment.",
      "Troubleshot access, hardware, software, network and user issues while documenting fixes and reducing repeat incidents.",
      "Managed user provisioning, MFA support and Active Directory / Microsoft 365 administration with clear stakeholder communication.",
      "Built the operational foundation that now supports business analysis, BI platform support and production issue investigation.",
    ],
  },
];

const selectedProjects = [
  {
    stack: "Research / Forecasting",
    context: "Lime",
    name: "Forecasting data-source research & analysis",
    desc: "Researching and comparing external data sources to support long-term passenger and market forecasting assumptions - structured source notes, quality observations and forecast-input summaries for review.",
  },
  {
    stack: "Snowflake / Rules",
    context: "Lime",
    name: "Data integrity & processing-rule validation",
    desc: "Validating business and processing rules across ingestion and transformation so outputs match expected logic - checking source files, reference data and final dashboard values before gaps reach clients.",
  },
  {
    stack: "Matillion / Snowflake",
    context: "ETL",
    name: "Budget data processing & ETL support",
    desc: "Supported budget loading and processing with validation before publication - working monthly and financial-year datasets at the correct reporting granularity with consistent downstream outputs.",
  },
  {
    stack: "Snowflake / Tableau",
    context: "Production",
    name: "Reporting discrepancy investigations",
    desc: "Traced dashboard discrepancies from raw data through processing layers to final Tableau outputs; documented root causes and practical fixes for duplicates, mismatched totals and source handling.",
  },
  {
    stack: "Collaboration",
    context: "Product / Eng",
    name: "Reporting automation & engineering collaboration",
    desc: "Worked with frontend and engineering teams on reporting-platform improvements, access workflows and automation testing - verifying user-facing behaviour and outputs from a data-quality lens.",
  },
];

const repos = [
  {
    name: "liquid-life",
    desc: "Live product - habit and wellbeing web app",
    href: LIQUIDLIFE_APP_URL,
  },
  {
    name: "l9-fitness",
    desc: "Capstone - secure full-stack platform with AI chatbot",
    href: `https://github.com/${GITHUB_USERNAME}`,
  },
  {
    name: "data-experiments",
    desc: "SQL, Python and Tableau learning builds",
    href: `https://github.com/${GITHUB_USERNAME}?tab=repositories`,
  },
];

const communityMoments = [
  {
    title: "GDG Brisbane",
    label: "Community",
    image: "/gdg2.jpeg",
    className: styles.momentFeature,
  },
  {
    title: "TechWalking",
    label: "Connection",
    image: "/techwalking.jpeg",
    className: "",
  },
  {
    title: "GDG Sydney",
    label: "Exploration",
    image: "/gdg%20sydney.jpeg",
    className: "",
  },
  {
    title: "Meetups & talks",
    label: "Learning in public",
    image: "/AI%26Society.jpeg",
    className: styles.momentWide,
  },
];

export default async function HomePage() {
  const headerStore = await headers();
  const host = (headerStore.get("x-forwarded-host") || headerStore.get("host") || "").toLowerCase();

  if (host.startsWith("liquidlife.")) {
    redirect("/login");
  }

  const year = new Date().getFullYear();

  const stats = [
    { value: "BI", label: "Snowflake · Tableau · Matillion" },
    { value: "Data", label: "Aviation & commercial reporting" },
    { value: "Trust", label: "Validation, reconciliation & root-cause analysis" },
  ];

  return (
    <main id="top" className={styles.page}>
      <header className={styles.navWrap}>
        <nav className={styles.nav} aria-label="Primary navigation">
          <a href="#top" className={styles.brand}>
            <span className={styles.brandName}>Rasik Tiwari</span>
            <span className={styles.brandRole}>/ BI - Data</span>
          </a>

          <div className={styles.navLinks}>
            <a href="#about">About</a>
            <a href="#toolkit">Toolkit</a>
            <a href="#work">Work</a>
            <a href="#writing">Writing</a>
            <a href="/resume">Resume</a>
          </div>

          <a href="#contact" className={styles.navCta}>
            Get in touch
          </a>
        </nav>
      </header>

      <section className={styles.hero} data-screen-label="Hero">
        <TerrainCanvas className={styles.terrainCanvas} />
        <div className={styles.heroScrim} />
        <div className={styles.heroGlow} />

        <div className={styles.heroInner}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.kicker}>
                <span className={styles.pulseDot} />
                Brisbane, Australia · Business Intelligence · Data
              </p>
              <h1 className={styles.heroTitle}>
                I trace data from raw source to the number a business can <em>trust</em>.
              </h1>
              <p className={styles.heroLead}>
                Business Intelligence and Data Analyst working across aviation and commercial reporting - Snowflake SQL,
                Tableau and Matillion - validating datasets, investigating discrepancies, and turning technical findings
                into decisions non-technical teams can act on.
              </p>
              <div className={styles.heroActions}>
                <a href="#work" className={styles.primaryButton}>
                  View My Work
                </a>
                <a href="#about" className={styles.secondaryButton}>
                  Download Résumé
                </a>
              </div>
            </div>

            <aside className={styles.queryPanel} aria-label="Data integrity summary">
              <div className={styles.queryTop}>
                <span>rasik@lime ~ integrity.sql</span>
                <span className={styles.available}>open to roles</span>
              </div>
              <div className={styles.queryCode} aria-label="SQL reconciliation query">
                <p>
                  <span>SELECT</span> source, reporting, diff
                </p>
                <p>
                  <span>FROM</span> pipeline_reconciliation
                </p>
                <p>
                  <span>WHERE</span> diff <span>&lt;&gt;</span> 0;
                </p>
              </div>
              <div className={styles.queryRows}>
                <p>
                  <span>rows flagged</span>
                  <strong>0 unresolved</strong>
                </p>
                <p>
                  <span>stack</span>
                  <strong>Snowflake - Tableau</strong>
                </p>
                <p>
                  <span>now</span>
                  <strong>Lime Intelligence</strong>
                </p>
              </div>
              <div className={styles.queryLinks}>
                <a href={`https://github.com/${GITHUB_USERNAME}`} target="_blank" rel="noreferrer">
                  GitHub
                </a>
                <a href={LINKEDIN_URL} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
                <a href={LIQUIDLIFE_APP_URL} target="_blank" rel="noreferrer">
                  Liquid Life
                </a>
              </div>
            </aside>
          </div>
        </div>

        <div className={styles.scrollCue} aria-hidden="true">
          <span>scroll</span>
          <i />
        </div>
      </section>

      <div className={styles.marquee} aria-hidden="true">
        <div className={styles.marqueeTrack}>
          {[...marqueeItems, ...marqueeItems].map((item, index) => (
            <span key={`${item}-${index}`}>{item}</span>
          ))}
        </div>
      </div>

      <section className={styles.stats} aria-label="Portfolio summary">
        <div className={styles.statsGrid}>
          {stats.map((stat) => (
            <article key={stat.label} className={styles.statCard}>
              <strong className="">{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section id="about" className={styles.section}>
        <div className={styles.aboutGrid}>
          <div>
            <p className={styles.sectionEyebrow}>01 - About me</p>
            <h2 className={styles.sectionTitle}>I sit between the data, the engineers, and the people who need answers.</h2>
          </div>
          <div className={styles.bodyCopy}>
            <p>
              I am a Business Intelligence and data professional based in Australia, working across aviation and commercial
              reporting. Day to day I validate source files, business rules and dashboard outputs - and chase down the
              reason a number does not match before it ever reaches a client.
            </p>
            <p>
              My path here ran through hands-on IT support, and that grounding still shows: I am comfortable in messy
              environments, I document everything, and I can talk to Customer Success, Product and Engineering in the
              language each of them needs.
            </p>
            <p>
              What I care about is trust in the numbers - tracing a value from raw source through every processing layer
              to the final Tableau view, and explaining what changed, why, and what to do about it.
            </p>
          </div>
        </div>
      </section>

      <section id="toolkit" className={`${styles.section} ${styles.darkSection}`}>
        <div className={styles.sectionNarrow}>
          <p className={styles.darkEyebrow}>02 - Core BI / BA toolkit</p>
          <h2 className={styles.darkTitle}>
            Three layers: intelligence, analysis and delivery, and the technical foundation under it.
          </h2>
        </div>
        <div className={styles.toolkitGrid}>
          {toolkit.map((column) => (
            <article key={column.title} className={styles.toolkitCard}>
              <p>{column.tag}</p>
              <h3>{column.title}</h3>
              <ul>
                {column.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section id="journey" className={styles.section}>
        <div className={styles.sectionNarrow}>
          <p className={styles.sectionEyebrow}>03 - My journey</p>
          <h2 className={styles.sectionTitle}>From fixing systems to trusting the numbers they produce.</h2>
          <p className={styles.sectionIntro}>
            A deliberate move from frontline IT support into BI and data - carrying the operational discipline forward,
            not leaving it behind.
          </p>
        </div>
        <div className={styles.timeline}>
          {journey.map((item) => (
            <article key={item.title} className={styles.timelineItem}>
              <div>
                <strong>{item.year}</strong>
                <span>{item.phase}</span>
              </div>
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="experience" className={`${styles.section} ${styles.experienceSection}`}>
        <div className={styles.sectionNarrow}>
          <p className={styles.sectionEyebrow}>04 - Experience</p>
          <h2 className={styles.sectionTitle}>Where the work actually happens.</h2>
        </div>
        <div className={styles.experienceStack}>
          {experience.map((role) => (
            <article key={role.role} className={styles.experienceCard}>
              <div className={styles.experienceHeader}>
                <h3>{role.role}</h3>
                <span>{role.period}</span>
              </div>
              <p className={styles.companyLine}>
                {role.company} - {role.location}
              </p>
              <ul>
                {role.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div className={styles.credentialGrid}>
          <article>
            <p>Education</p>
            <h3>Bachelor of Information Technology</h3>
            <span>Kent Institute Australia - 2023 to 2025</span>
            <small>
              Data analytics, cloud systems, networking, cybersecurity, secure software and AI. Capstone: full-stack
              platform with authentication, payment workflow and an AI chatbot.
            </small>
          </article>
          <article>
            <p>Certifications and development</p>
            <ul>
              <li>CompTIA Security+ - in progress</li>
              <li>Ongoing self-learning: SQL, Tableau, Snowflake, Matillion and BI reporting</li>
            </ul>
          </article>
        </div>
      </section>

      <section id="work" className={styles.section}>
        <div className={styles.sectionNarrow}>
          <p className={styles.sectionEyebrow}>05 - Selected BI / data work</p>
          <h2 className={styles.sectionTitle}>Workstreams where I owned the data-quality outcome.</h2>
        </div>
        <div className={styles.projectGrid}>
          {selectedProjects.map((project) => (
            <article key={project.name} className={styles.projectCard}>
              <div>
                <span>{project.stack}</span>
                <small>{project.context}</small>
              </div>
              <h3>{project.name}</h3>
              <p>{project.desc}</p>
            </article>
          ))}
        </div>
        <div className={styles.projectGrid}>
          {caseStudies.map((study) => (
            <article key={study.slug} className={styles.projectCard}>
              <div><span>Case study</span><small>Anonymised</small></div>
              <h3><a href={"/work/" + study.slug}>{study.title}</a></h3>
              <p>{study.summary}</p>
            </article>
          ))}
        </div>

        <aside className={styles.githubStrip}>
          <div>
            <p>Also on GitHub - @{GITHUB_USERNAME}</p>
            <h3>Full-stack and data experiments, in the open.</h3>
            <span>
              Liquid Life, the L9 Fitness capstone, and a running index of SQL, Python and web builds - where I learn
              tools by shipping with them.
            </span>
          </div>
          <div className={styles.repoLinks}>
            {repos.map((repo) => (
              <a key={repo.name} href={repo.href} target="_blank" rel="noreferrer">
                <span>
                  <strong>{repo.name}</strong>
                  <small>{repo.desc}</small>
                </span>
                <b aria-hidden="true">-&gt;</b>
              </a>
            ))}
            <a href={`https://github.com/${GITHUB_USERNAME}?tab=repositories`} target="_blank" rel="noreferrer" className={styles.allReposLink}>
              Browse all repositories
            </a>
          </div>
        </aside>
      </section>

      <section id="writing" className={styles.section}>
        <div className={styles.sectionNarrow}><p className={styles.sectionEyebrow}>06 - Writing</p><h2 className={styles.sectionTitle}>Notes from the workbench.</h2><p className={styles.sectionIntro}>Practical notes on BI, data quality, troubleshooting and learning through doing. <Link href="/writing">Read all writing →</Link></p></div>
      </section>

      <section id="community" className={`${styles.section} ${styles.darkSection}`}>
        <div className={styles.communityHeader}>
          <div>
            <p className={styles.darkEyebrow}>07 - Community and moments</p>
            <h2 className={styles.darkTitle}>Work matters, but community matters too.</h2>
            <p>
              GDG meetups, TechWalking, and showing up for other people finding their feet in tech. Giving back is part
              of how I want to build my life here - not an afterthought.
            </p>
          </div>
          <span>Real moments from the communities and rooms that shaped the work.</span>
        </div>
        <div className={styles.momentGrid}>
          {communityMoments.map((moment) => (
            <article key={moment.title} className={`${styles.momentCard} ${moment.className}`}>
              <Image src={moment.image} alt={moment.title} fill sizes="(max-width: 768px) 100vw, 33vw" />
              <div>
                <span>{moment.label}</span>
                <h3>{moment.title}</h3>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="contact" className={styles.contactSection}>
        <OrbitCanvas className={styles.orbitCanvas} />
        <div className={styles.contactInner}>
          <p className={styles.sectionEyebrow}>08 - Let&apos;s talk</p>
          <h2>Have data that is not telling a straight story?</h2>
          <p>
            I am open to BI, business analysis and data roles - and always happy to talk shop about reporting, data
            quality and forecasting.
          </p>
          <div className={styles.contactActions}>
            <a href="mailto:rasiktiwari80@gmail.com" className={styles.primaryButton}>
              rasiktiwari80@gmail.com
            </a>
            <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" className={styles.lightButton}>LinkedIn</a>
            <a href={"https://github.com/" + GITHUB_USERNAME} target="_blank" rel="noreferrer" className={styles.lightButton}>GitHub</a>
          </div>

        </div>
      </section>

      <footer className={styles.footer}>
        <strong>Rasik Tiwari</strong>
        <nav aria-label="Footer links">
          <a href={`https://github.com/${GITHUB_USERNAME}`} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href={LINKEDIN_URL} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <a href={LIQUIDLIFE_APP_URL} target="_blank" rel="noreferrer">
            Liquid Life
          </a>
          <a href="mailto:rasiktiwari80@gmail.com">Email</a>
        </nav>
        <span>&copy; {year} - Built with care</span>
      </footer>
    </main>
  );
}
