"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import styles from "./procurement.module.css";
import { fetchDocuments, getFormattedDocumentHtml, type DocumentRecord } from "@/lib/documents";
import { getCurrentUserMeta, subscribeToAuthTokenChanges } from "@/lib/auth";
import {
  getDefaultResumeSectionTemplateConfig,
  type DocumentTemplateName,
  type ResumeSectionTemplateConfig,
} from "@/lib/documentTemplates";
import {
  DEFAULT_PROCUREMENT_PROFILE,
  fetchProcurementStatus,
  generateApplicationPair,
  loadStoredProcurementProfile,
  parseResumeToProfile,
  reviewResumeAts,
  saveGeneratedDocument,
  saveStoredProcurementProfile,
  type AtsReviewPayload,
  type GeneratedApplicationPairPayload,
  type GeneratedDocumentPayload,
  type ProcurementProfile,
  type ProcurementStatus,
} from "@/lib/procurement";

type ResumeStylePresetId =
  | "modern-tech"
  | "corporate-clean"
  | "startup-style"
  | "minimal-ats"
  | "creative-professional"
  | "classic-executive";

type ResumeStylePreset = {
  id: ResumeStylePresetId;
  label: string;
  description: string;
  templateName: DocumentTemplateName;
  templateConfig: ResumeSectionTemplateConfig;
  previewClassName: keyof typeof styles;
};

const resumeStylePresets: ResumeStylePreset[] = [
  {
    id: "modern-tech",
    label: "Modern Tech Resume",
    description: "Bold top summary, feature-card experience, crisp skill tokens, and product-focused highlights.",
    templateName: "balanced",
    templateConfig: {
      summaryStyle: "spotlight",
      experienceStyle: "cards",
      skillsStyle: "chips",
      projectsStyle: "tiles",
      educationStyle: "cards",
    },
    previewClassName: "styleModernTech",
  },
  {
    id: "corporate-clean",
    label: "Corporate Clean",
    description: "Structured and polished with stronger hierarchy for enterprise and operations-facing roles.",
    templateName: "executive",
    templateConfig: {
      summaryStyle: "split",
      experienceStyle: "timeline",
      skillsStyle: "list",
      projectsStyle: "list",
      educationStyle: "list",
    },
    previewClassName: "styleCorporateClean",
  },
  {
    id: "startup-style",
    label: "Startup Style",
    description: "Faster scan pattern with bold proof points and more visual energy for product-heavy teams.",
    templateName: "balanced",
    templateConfig: {
      summaryStyle: "split",
      experienceStyle: "cards",
      skillsStyle: "grid",
      projectsStyle: "highlights",
      educationStyle: "cards",
    },
    previewClassName: "styleStartupStyle",
  },
  {
    id: "minimal-ats",
    label: "Minimal ATS",
    description: "Tighter layout built to stay plain, direct, and easy for recruiters and ATS systems to scan.",
    templateName: "minimal",
    templateConfig: {
      summaryStyle: "compact",
      experienceStyle: "compact",
      skillsStyle: "chips",
      projectsStyle: "list",
      educationStyle: "list",
    },
    previewClassName: "styleMinimalAts",
  },
  {
    id: "creative-professional",
    label: "Creative Professional",
    description: "Clean but more expressive layout for creative, digital, marketing, and design-adjacent work.",
    templateName: "balanced",
    templateConfig: {
      summaryStyle: "spotlight",
      experienceStyle: "cards",
      skillsStyle: "grid",
      projectsStyle: "tiles",
      educationStyle: "cards",
    },
    previewClassName: "styleCreativeProfessional",
  },
  {
    id: "classic-executive",
    label: "Classic Executive",
    description: "More traditional executive framing with strong structure, restrained styling, and senior tone.",
    templateName: "executive",
    templateConfig: {
      summaryStyle: "split",
      experienceStyle: "timeline",
      skillsStyle: "list",
      projectsStyle: "highlights",
      educationStyle: "timeline",
    },
    previewClassName: "styleClassicExecutive",
  },
];

const JAMES_BOND_SAMPLE_RESUME = `
<h2>Professional Summary</h2>
<p>Security-cleared intelligence and operations specialist with 10+ years delivering high-risk international missions. Strong background in threat assessment, stakeholder coordination, and mission-critical incident response.</p>
<h2>Core Skills</h2>
<ul>
  <li>Risk Assessment &amp; Threat Intelligence</li>
  <li>Cross-Functional Stakeholder Management</li>
  <li>Secure Communications &amp; Incident Response</li>
  <li>Operational Planning &amp; Crisis Leadership</li>
  <li>Investigation, Surveillance, and Field Execution</li>
</ul>
<h2>Professional Experience</h2>
<h3>Senior Field Operations Officer | MI6</h3>
<p><em>2018 - Present</em></p>
<ul>
  <li>Led 14 multi-country operations, reducing mission exposure risk by 38% through stronger pre-operation threat modelling.</li>
  <li>Coordinated intelligence handoffs across six agencies, improving response time during active incidents by 27%.</li>
  <li>Built a structured post-mission review framework that raised repeat mission success rates from 82% to 93%.</li>
</ul>
<h3>Intelligence Officer | Royal Navy Liaison Unit</h3>
<p><em>2013 - 2018</em></p>
<ul>
  <li>Managed secure intelligence briefings for senior command teams across maritime operations in EMEA regions.</li>
  <li>Analyzed surveillance inputs and flagged 90+ high-priority anomalies, preventing escalation in multiple active zones.</li>
  <li>Implemented a new information validation checklist that reduced false-positive intelligence alerts by 31%.</li>
</ul>
<h2>Projects</h2>
<ul>
  <li>Operation Nightfall: Designed mission-control escalation protocol used across three allied teams during coordinated interventions.</li>
  <li>Secure Transit Initiative: Rebuilt executive movement planning process to improve route confidence and reduce exposure windows.</li>
  <li>Signal Integrity Program: Standardized secure comms fallback workflow for remote field units during system disruption events.</li>
</ul>
<h2>Education</h2>
<ul>
  <li>MSc Security and Strategic Studies - King&apos;s College London</li>
  <li>BSc International Relations - University of Edinburgh</li>
  <li>Certified Intelligence Analyst (Level 3)</li>
</ul>
`;

function getStylePreviewHtml(preset: ResumeStylePreset) {
  return getFormattedDocumentHtml({
    title: "James Bond - Security Operations Resume",
    docType: "resume",
    templateName: preset.templateName,
    templateConfig: preset.templateConfig,
    htmlContent: JAMES_BOND_SAMPLE_RESUME,
  });
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className={`${styles.fieldLabel} text-sm font-medium ll-title`}>{children}</span>;
}

function FormCard({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className={styles.formCard}>
      <div className={styles.formCardHeader}>
        <FieldLabel>{label}</FieldLabel>
        {hint ? <p className="text-xs ll-muted">{hint}</p> : null}
      </div>
      {children}
    </label>
  );
}

function ProfileInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  hint?: string;
}) {
  return (
    <FormCard label={label} hint={hint}>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type="text"
        placeholder={placeholder}
        className={`${styles.inputSurface} w-full px-3 py-3 text-sm ll-title outline-none transition focus:ring-2`}
      />
    </FormCard>
  );
}

function ProfileTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
  hint?: string;
}) {
  return (
    <FormCard label={label} hint={hint}>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={`${styles.inputSurface} w-full px-3 py-3 text-sm ll-title outline-none transition focus:ring-2`}
      />
    </FormCard>
  );
}

function GeneratedPreview({
  label,
  result,
  renderedHtml,
  onSave,
  saveLabel,
  isSaving,
  helper,
}: {
  label: string;
  result: GeneratedDocumentPayload | null;
  renderedHtml: string;
  onSave: () => Promise<void>;
  saveLabel: string;
  isSaving: boolean;
  helper: string;
}) {
  if (!result) {
    return (
      <article className={`${styles.previewCard} ll-panel p-5`}>
        <div className={styles.previewHeader}>
          <div>
            <p className="text-sm font-semibold ll-title">{label}</p>
            <p className="mt-1 text-sm ll-muted">{helper}</p>
          </div>
        </div>
        <div className={styles.previewEmpty}>
          <p className="text-sm ll-muted">Generate a draft to see the preview here.</p>
        </div>
      </article>
    );
  }

  return (
    <article className={`${styles.previewCard} ll-panel p-5`}>
      <div className={styles.previewHeader}>
        <div>
          <p className="text-sm font-semibold ll-title">{label}</p>
          <h3 className="mt-2 text-xl font-semibold ll-title">{result.title}</h3>
          <p className="mt-2 text-sm ll-muted">{helper}</p>
        </div>
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={isSaving}
          className={`${styles.primaryButton} px-3 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70`}
        >
          {isSaving ? "Saving..." : saveLabel}
        </button>
      </div>

      <div
        className={`${styles.previewBody} mt-4 p-4 text-[#23324a]`}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />

      {result.keywords_targeted && result.keywords_targeted.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] ll-muted">Target keywords</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {result.keywords_targeted.map((item) => (
              <span key={item} className={`${styles.signalPill} rounded-full px-3 py-1 text-xs ll-title`}>
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function ResumeStyleCard({
  preset,
  isActive,
  onSelect,
  previewHtml,
}: {
  preset: ResumeStylePreset;
  isActive: boolean;
  onSelect: () => void;
  previewHtml: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`${styles.styleCard} ${styles[preset.previewClassName]} ${isActive ? styles.styleCardActive : ""}`}
    >
      <div className={styles.stylePreviewCanvas}>
        <div className={styles.stylePreviewTag}>James Bond Demo</div>
        <div className={styles.stylePreviewViewport}>
          <div className={styles.stylePreviewScale} dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      </div>
      <div className={styles.styleCardCopy}>
        <div className={styles.styleCardTopRow}>
          <span className={styles.styleCardLabel}>{preset.label}</span>
          {isActive ? <span className={styles.styleBadge}>Selected</span> : null}
        </div>
        <p className="text-sm ll-muted">{preset.description}</p>
      </div>
    </button>
  );
}

function ResumeIntakeModal({
  isVisible,
  onUpload,
  onBuildFromScratch,
  onNeedsImprovement,
  isParsing,
}: {
  isVisible: boolean;
  onUpload: () => void;
  onBuildFromScratch: () => void;
  onNeedsImprovement: () => void;
  isParsing: boolean;
}) {
  if (!isVisible || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className={styles.modalScrim}>
      <div className={styles.modalCard}>
        <p className={styles.modalEyebrow}>Quick start</p>
        <h2 className="mt-2 text-3xl font-semibold ll-title">Do you already have a resume?</h2>
        <p className="mt-3 text-sm leading-7 ll-muted">
          Uploading one lets Liquid Life extract the key details, auto-fill the form, and save you the manual typing.
        </p>
        <div className={styles.modalOptions}>
          <button
            type="button"
            onClick={onUpload}
            disabled={isParsing}
            className={`${styles.primaryButton} px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70`}
          >
            {isParsing ? "Parsing resume..." : "Upload Resume"}
          </button>
          <button type="button" onClick={onBuildFromScratch} className={`${styles.secondaryButton} px-4 py-3 text-sm font-semibold ll-title transition`}>
            Build From Scratch
          </button>
          <button type="button" onClick={onNeedsImprovement} className={`${styles.secondaryButton} px-4 py-3 text-sm font-semibold ll-title transition`}>
            I Have One But It&apos;s Not Good
          </button>
        </div>
        <p className="mt-4 text-xs ll-muted">Supported formats: PDF, DOCX, TXT.</p>
      </div>
    </div>,
    document.body,
  );
}

function mergeProfiles(current: ProcurementProfile, incoming: ProcurementProfile): ProcurementProfile {
  const next = { ...current };
  (Object.keys(current) as Array<keyof ProcurementProfile>).forEach((key) => {
    const value = incoming[key];
    if (typeof value === "string" && value.trim()) {
      next[key] = value;
    }
  });
  return next;
}

export default function ProcurementPage() {
  const router = useRouter();
  const { isChecking, isAuthenticated } = useRequireAuth();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [userMeta, setUserMeta] = useState(() => getCurrentUserMeta());
  const [profile, setProfile] = useState<ProcurementProfile>(DEFAULT_PROCUREMENT_PROFILE);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [status, setStatus] = useState<ProcurementStatus | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [selectedStyleId, setSelectedStyleId] = useState<ResumeStylePresetId>("modern-tech");
  const [jobDescription, setJobDescription] = useState("");
  const [coverLetterResult, setCoverLetterResult] = useState<GeneratedDocumentPayload | null>(null);
  const [resumeResult, setResumeResult] = useState<GeneratedDocumentPayload | null>(null);
  const [atsResult, setAtsResult] = useState<AtsReviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingDocuments, setIsGeneratingDocuments] = useState(false);
  const [isRunningAts, setIsRunningAts] = useState(false);
  const [isSavingCoverLetter, setIsSavingCoverLetter] = useState(false);
  const [isSavingResume, setIsSavingResume] = useState(false);
  const [hasLoadedLocalProfile, setHasLoadedLocalProfile] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [isParsingResume, setIsParsingResume] = useState(false);

  const selectedStyle = useMemo(
    () => resumeStylePresets.find((preset) => preset.id === selectedStyleId) ?? resumeStylePresets[0],
    [selectedStyleId],
  );
  const stylePreviewMap = useMemo<Record<ResumeStylePresetId, string>>(() => {
    const entries = resumeStylePresets.map((preset) => [preset.id, getStylePreviewHtml(preset)] as const);
    return Object.fromEntries(entries) as Record<ResumeStylePresetId, string>;
  }, []);

  useEffect(() => subscribeToAuthTokenChanges(() => setUserMeta(getCurrentUserMeta())), []);

  useEffect(() => {
    if (!userMeta?.username) {
      return;
    }

    const username = userMeta.username;
    setHasLoadedLocalProfile(false);
    let isActive = true;

    async function loadProfile() {
      try {
        const saved = await loadStoredProcurementProfile(username);
        if (!isActive) {
          return;
        }
        setProfile(saved ?? DEFAULT_PROCUREMENT_PROFILE);
      } catch (loadError) {
        console.error(loadError);
        if (isActive) {
          setProfile(DEFAULT_PROCUREMENT_PROFILE);
          setError("Could not decrypt the saved profile. Starting with a blank profile.");
        }
      } finally {
        if (isActive) {
          setHasLoadedLocalProfile(true);
        }
      }
    }

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, [userMeta?.username]);

  useEffect(() => {
    if (!hasLoadedLocalProfile || !userMeta?.username) {
      return;
    }

    const username = userMeta.username;
    let isActive = true;

    async function persistProfile() {
      try {
        await saveStoredProcurementProfile(username, profile);
      } catch (saveError) {
        console.error(saveError);
        if (isActive) {
          setError("Could not save the encrypted profile in this browser.");
        }
      }
    }

    void persistProfile();

    return () => {
      isActive = false;
    };
  }, [hasLoadedLocalProfile, profile, userMeta?.username]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    async function loadPageData() {
      try {
        setIsLoading(true);
        const [loadedDocuments, loadedStatus] = await Promise.all([fetchDocuments(), fetchProcurementStatus()]);
        setDocuments(loadedDocuments);
        setStatus(loadedStatus);
      } catch (loadError) {
        console.error(loadError);
        setError(loadError instanceof Error ? loadError.message : "Could not load the resume builder.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadPageData();
  }, [isAuthenticated]);

  const procurementUnlocked = Boolean(isAuthenticated && userMeta && !userMeta.isAdmin);

  useEffect(() => {
    if (!procurementUnlocked) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowResumePrompt(true);
    }, 850);

    return () => window.clearTimeout(timer);
  }, [procurementUnlocked]);

  useEffect(() => {
    if (!showResumePrompt) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showResumePrompt]);

  const resumeDocuments = useMemo(
    () => documents.filter((document) => document.docType === "resume"),
    [documents],
  );

  const styledResumePayload = useMemo(() => {
    if (!resumeResult) {
      return null;
    }

    return {
      ...resumeResult,
      template_name: selectedStyle.templateName,
      template_config: selectedStyle.templateConfig,
    } as GeneratedDocumentPayload;
  }, [resumeResult, selectedStyle]);

  const renderedCoverLetterHtml = useMemo(() => {
    if (!coverLetterResult) {
      return "";
    }

    return getFormattedDocumentHtml({
      title: coverLetterResult.title,
      docType: coverLetterResult.doc_type,
      templateName: coverLetterResult.template_name,
      templateConfig: getDefaultResumeSectionTemplateConfig(coverLetterResult.template_name),
      htmlContent: coverLetterResult.content,
    });
  }, [coverLetterResult]);

  const renderedResumeHtml = useMemo(() => {
    if (!styledResumePayload) {
      return "";
    }

    return getFormattedDocumentHtml({
      title: styledResumePayload.title,
      docType: styledResumePayload.doc_type,
      templateName: styledResumePayload.template_name,
      templateConfig: styledResumePayload.template_config as ResumeSectionTemplateConfig,
      htmlContent: styledResumePayload.content,
    });
  }, [styledResumePayload]);

  function updateProfile<K extends keyof ProcurementProfile>(key: K, value: ProcurementProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function buildGenerationPayload() {
    return {
      profile,
      job_description: jobDescription,
      resume_document_id: selectedResumeId ? Number(selectedResumeId) : null,
      company_name: companyName,
      target_role: targetRole,
      tone: "professional",
      template_name: selectedStyle.templateName,
      template_config: selectedStyle.templateConfig,
    };
  }

  async function handleGenerateApplicationPair(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!jobDescription.trim()) {
      setError("Add the job description first.");
      return;
    }

    try {
      setIsGeneratingDocuments(true);
      setError(null);
      setSuccess(null);
      const payload: GeneratedApplicationPairPayload = await generateApplicationPair(buildGenerationPayload());
      setCoverLetterResult(payload.cover_letter);
      setResumeResult(payload.resume);
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "Failed to generate the application documents.");
    } finally {
      setIsGeneratingDocuments(false);
    }
  }

  async function handleRunAts() {
    if (!jobDescription.trim()) {
      setError("Add the job description first.");
      return;
    }
    if (!selectedResumeId && !(styledResumePayload?.content || "").trim()) {
      setError("Choose a resume or generate one first.");
      return;
    }

    try {
      setIsRunningAts(true);
      setError(null);
      setSuccess(null);
      const payload = await reviewResumeAts({
        job_description: jobDescription,
        resume_document_id: selectedResumeId ? Number(selectedResumeId) : null,
        resume_content: selectedResumeId ? "" : styledResumePayload?.content || "",
      });
      setAtsResult(payload);
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "Failed to run ATS review.");
    } finally {
      setIsRunningAts(false);
    }
  }

  async function handleSaveGenerated(result: GeneratedDocumentPayload, docKind: "cover_letter" | "resume") {
    const setSaving = docKind === "cover_letter" ? setIsSavingCoverLetter : setIsSavingResume;

    try {
      setSaving(true);
      setError(null);
      const documentId = await saveGeneratedDocument(result);
      setSuccess(`${docKind === "cover_letter" ? "Cover letter" : "Resume"} saved to Documents.`);
      router.push(`/documents/${documentId}`);
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : "Failed to save the generated document.");
    } finally {
      setSaving(false);
    }
  }

  async function handleResumeUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsParsingResume(true);
      setError(null);
      const payload = await parseResumeToProfile(file);
      setProfile((current) => mergeProfiles(current, payload.profile));
      setSuccess("Resume uploaded. The form has been auto-filled and is ready for review.");
      setShowResumePrompt(false);
    } catch (uploadError) {
      console.error(uploadError);
      setError(uploadError instanceof Error ? uploadError.message : "Could not parse the uploaded resume.");
    } finally {
      setIsParsingResume(false);
      event.target.value = "";
    }
  }

  if (isChecking || !isAuthenticated) {
    return (
      <main className="ll-page flex items-center justify-center">
        <p className="ll-muted">Checking access...</p>
      </main>
    );
  }

  if (!procurementUnlocked) {
    return (
      <DashboardLayout title="Procurement">
        <section className={`${styles.lockedCard} ll-panel p-6`}>
          <p className="text-xs uppercase tracking-[0.22em] ll-muted">Procurement</p>
          <h1 className="mt-2 text-3xl font-semibold ll-title">This workspace is for approved member accounts.</h1>
          <p className="mt-3 text-sm ll-muted">
            Admin accounts manage approvals from the admin dashboard. Approved users unlock Procurement automatically on their next sign-in.
          </p>
          <Link href="/admin-panel" className={`${styles.primaryButton} mt-5 inline-flex px-3 py-2 text-sm font-semibold text-white transition`}>
            Go to Admin Panel
          </Link>
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Procurement">
      <div className={styles.stage}>
        <input
          ref={uploadInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={handleResumeUpload}
        />

        <ResumeIntakeModal
          isVisible={showResumePrompt}
          onUpload={() => uploadInputRef.current?.click()}
          onBuildFromScratch={() => {
            setShowResumePrompt(false);
            setSuccess("Starting from scratch. Add the core details and build from there.");
          }}
          onNeedsImprovement={() => {
            setShowResumePrompt(false);
            setSuccess("No problem. Use the clean form, style presets, and ATS review to improve it.");
          }}
          isParsing={isParsingResume}
        />

        <section className={styles.welcomeHero}>
          <div className={styles.heroOrbOne} aria-hidden="true" />
          <div className={styles.heroOrbTwo} aria-hidden="true" />
          <div className={styles.heroGlass}>
            <p className={styles.heroEyebrow}>Welcome to Liquid Life</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight ll-title sm:text-5xl">
              Build a polished resume in a guided, faster flow.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 ll-muted sm:text-base">
              Start with your existing resume or fill the form from scratch. The builder focuses on quick edits, cleaner structure,
              better style switching, and a stronger final export.
            </p>
            <div className={styles.heroSignals}>
              <span className={styles.heroSignal}>Smart autofill</span>
              <span className={styles.heroSignal}>Clean editing</span>
              <span className={styles.heroSignal}>Multiple resume styles</span>
            </div>
          </div>
        </section>

        <section className={styles.noticeRack}>
          <article className={styles.noticeCard}>
            <p className={styles.noticeEyebrow}>Important</p>
            <h2 className="mt-2 text-lg font-semibold ll-title">Always review before exporting</h2>
            <p className="mt-2 text-sm ll-muted">
              Generated content still needs human review. Check wording, dates, metrics, and claims before sending it anywhere.
            </p>
          </article>
          <article className={styles.noticeCard}>
            <p className={styles.noticeEyebrow}>Input quality</p>
            <h2 className="mt-2 text-lg font-semibold ll-title">Better detail produces better resumes</h2>
            <p className="mt-2 text-sm ll-muted">
              Add reliable information, measurable achievements, and strong project detail so the final resume has better material to work with.
            </p>
          </article>
        </section>

        {error && <p className={`${styles.alertError} px-4 py-3 text-sm text-rose-700`}>{error}</p>}
        {success && !error && <p className={`${styles.alertSuccess} px-4 py-3 text-sm text-emerald-700`}>{success}</p>}

        {status && !status.ai_configured && !isLoading && (
          <section className={`${styles.noticeStrip} ll-panel p-4`}>
            <p className="text-sm ll-title">Automated document generation is temporarily unavailable.</p>
            <p className="mt-1 text-sm ll-muted">
              You can still upload a resume, complete the profile, switch resume styles, and run ATS review.
            </p>
          </section>
        )}

        <section className={styles.workspaceGrid}>
          <article className={`${styles.formPanel} ll-panel p-6`}>
            <div className={styles.panelHeader}>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] ll-muted">Profile Builder</p>
                <h2 className="mt-2 text-2xl font-semibold ll-title">Simple resume data capture</h2>
                <p className="mt-2 text-sm ll-muted">
                  Keep the inputs clean and factual. You can upload a resume anytime to auto-fill these fields and then edit them manually.
                </p>
              </div>
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className={`${styles.secondaryButton} px-4 py-2 text-sm font-semibold ll-title transition`}
              >
                Upload Resume to Autofill
              </button>
            </div>

            <div className={styles.formGrid}>
              <ProfileInput label="Full Name" value={profile.fullName} onChange={(value) => updateProfile("fullName", value)} placeholder="Jane Doe" />
              <ProfileInput label="Headline" value={profile.headline} onChange={(value) => updateProfile("headline", value)} placeholder="Platform Engineer | Cloud, APIs, Automation" />
              <ProfileInput label="Email" value={profile.email} onChange={(value) => updateProfile("email", value)} placeholder="jane@example.com" />
              <ProfileInput label="Phone" value={profile.phone} onChange={(value) => updateProfile("phone", value)} placeholder="+61 ..." />
              <ProfileInput label="Location" value={profile.location} onChange={(value) => updateProfile("location", value)} placeholder="Sydney, NSW" />
              <ProfileInput label="Portfolio" value={profile.portfolioUrl} onChange={(value) => updateProfile("portfolioUrl", value)} placeholder="https://portfolio.example.com" />
              <ProfileInput label="LinkedIn" value={profile.linkedinUrl} onChange={(value) => updateProfile("linkedinUrl", value)} placeholder="https://linkedin.com/in/..." />
              <div className={styles.formSpanTwo}>
                <ProfileTextarea
                  label="Professional Summary"
                  value={profile.summary}
                  onChange={(value) => updateProfile("summary", value)}
                  placeholder="Summarize your professional background, domain strengths, and the kind of value you create."
                  rows={5}
                />
              </div>
              <ProfileTextarea label="Target Roles" value={profile.targetRoles} onChange={(value) => updateProfile("targetRoles", value)} placeholder={"Senior Backend Engineer\nPlatform Engineer"} rows={4} />
              <ProfileTextarea label="Skills" value={profile.skills} onChange={(value) => updateProfile("skills", value)} placeholder={"Python\nDjango\nPostgreSQL\nAzure"} rows={4} />
              <ProfileTextarea label="Achievements" value={profile.achievements} onChange={(value) => updateProfile("achievements", value)} placeholder="Improved deployment speed by 40%..." rows={5} />
              <ProfileTextarea label="Experience" value={profile.experience} onChange={(value) => updateProfile("experience", value)} placeholder="Role, company, scope, impact, measurable results..." rows={7} />
              <ProfileTextarea label="Education" value={profile.education} onChange={(value) => updateProfile("education", value)} placeholder="Degree, institution, year..." rows={5} />
              <ProfileTextarea label="Certifications" value={profile.certifications} onChange={(value) => updateProfile("certifications", value)} placeholder={"AZ-900\nAWS CCP"} rows={4} />
              <ProfileTextarea label="Projects" value={profile.projects} onChange={(value) => updateProfile("projects", value)} placeholder="Project name, stack, impact, proof points..." rows={6} />
              <ProfileTextarea label="Preferences" value={profile.preferences} onChange={(value) => updateProfile("preferences", value)} placeholder="Preferred industries, tone, remote/on-site preferences..." rows={4} />
              <div className={styles.formSpanTwo}>
                <ProfileTextarea
                  label="Additional Context"
                  value={profile.additionalContext}
                  onChange={(value) => updateProfile("additionalContext", value)}
                  placeholder="Anything else that should shape the resume or cover letter."
                  rows={5}
                />
              </div>
            </div>
          </article>

          <aside className={styles.sideColumn}>
            <form onSubmit={handleGenerateApplicationPair} className={`${styles.sidePanel} ll-panel p-6`}>
              <div className={styles.panelHeader}>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] ll-muted">Job Targeting</p>
                  <h2 className="mt-2 text-2xl font-semibold ll-title">Point the resume at the job</h2>
                </div>
                <span className={`${styles.signalPill} rounded-full px-3 py-1 text-xs ll-title`}>Saved automatically</span>
              </div>

              <div className="mt-5 space-y-4">
                <FormCard label="Use an existing saved resume" hint="Optional extra context from the Documents module.">
                  <select
                    value={selectedResumeId}
                    onChange={(event) => setSelectedResumeId(event.target.value)}
                    className={`${styles.inputSurface} w-full px-3 py-3 text-sm ll-title outline-none transition focus:ring-2`}
                  >
                    <option value="">Use profile only</option>
                    {resumeDocuments.map((document) => (
                      <option key={document.id} value={String(document.id)}>
                        {document.title}
                      </option>
                    ))}
                  </select>
                </FormCard>

                <div className={styles.sideInputGrid}>
                  <ProfileInput label="Company" value={companyName} onChange={setCompanyName} placeholder="OpenAI" />
                  <ProfileInput label="Target Role" value={targetRole} onChange={setTargetRole} placeholder="Backend Engineer" />
                </div>

                <ProfileTextarea
                  label="Job Description"
                  value={jobDescription}
                  onChange={setJobDescription}
                  placeholder="Paste the full job description here. Keep it plain and complete."
                  rows={13}
                  hint="Plain text only. The cleaner the description, the better the targeting."
                />

                <div className={styles.actionRow}>
                  <button
                    type="submit"
                    disabled={isGeneratingDocuments || !status?.ai_configured}
                    className={`${styles.primaryButton} px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {isGeneratingDocuments ? "Generating documents..." : "Generate Resume + Cover Letter"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRunAts()}
                    disabled={isRunningAts}
                    className={`${styles.secondaryButton} px-4 py-3 text-sm font-semibold ll-title transition disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {isRunningAts ? "Running ATS review..." : "Run ATS Review"}
                  </button>
                </div>
              </div>
            </form>

            <section className={`${styles.sidePanel} ll-panel p-6`}>
              <div className={styles.panelHeader}>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] ll-muted">Resume Styles</p>
                  <h2 className="mt-2 text-2xl font-semibold ll-title">Switch styles instantly</h2>
                </div>
              </div>
              <p className="mt-3 text-sm ll-muted">
                Choose the visual direction before generation or switch styles afterward to preview the same content in a cleaner layout.
              </p>

              <div className={styles.styleGrid}>
                {resumeStylePresets.map((preset) => (
                  <ResumeStyleCard
                    key={preset.id}
                    preset={preset}
                    isActive={selectedStyle.id === preset.id}
                    onSelect={() => setSelectedStyleId(preset.id)}
                    previewHtml={stylePreviewMap[preset.id]}
                  />
                ))}
              </div>
            </section>
          </aside>
        </section>

        <section className={styles.previewGrid}>
          <GeneratedPreview
            label="Cover Letter Draft"
            result={coverLetterResult}
            renderedHtml={renderedCoverLetterHtml}
            onSave={() => handleSaveGenerated(coverLetterResult as GeneratedDocumentPayload, "cover_letter")}
            saveLabel="Save to Documents"
            isSaving={isSavingCoverLetter}
            helper="Professional text blocks only. Keep the structure direct and easy to review."
          />

          <GeneratedPreview
            label="Resume Preview"
            result={styledResumePayload}
            renderedHtml={renderedResumeHtml}
            onSave={() => handleSaveGenerated(styledResumePayload as GeneratedDocumentPayload, "resume")}
            saveLabel="Save to Documents"
            isSaving={isSavingResume}
            helper={`${selectedStyle.label} is applied to the live preview and will be used when you save this resume.`}
          />
        </section>

        <section className={`${styles.atsPanel} ll-panel p-6`}>
          <div className={styles.panelHeader}>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] ll-muted">ATS Review</p>
              <h2 className="mt-2 text-2xl font-semibold ll-title">Match score and gaps</h2>
            </div>
            {atsResult ? (
              <div className={`${styles.signalPill} rounded-full px-4 py-2 text-sm font-semibold ll-title`}>
                Score: {atsResult.overall_score}/100
              </div>
            ) : null}
          </div>

          {!atsResult ? (
            <p className="mt-4 text-sm ll-muted">Run ATS review after choosing or generating a resume.</p>
          ) : (
            <div className={styles.atsGrid}>
              <div className={styles.atsStats}>
                <article className={`${styles.metricCard} ll-panel-soft p-4`}>
                  <p className="text-xs uppercase tracking-[0.16em] ll-muted">Keyword Match</p>
                  <p className="mt-2 text-3xl font-semibold ll-title">{atsResult.keyword_score}%</p>
                </article>
                <article className={`${styles.metricCard} ll-panel-soft p-4`}>
                  <p className="text-xs uppercase tracking-[0.16em] ll-muted">Section Coverage</p>
                  <p className="mt-2 text-3xl font-semibold ll-title">{atsResult.section_score}%</p>
                </article>
                <article className={`${styles.metricCard} ll-panel-soft p-4`}>
                  <p className="text-sm ll-muted">{atsResult.summary}</p>
                </article>
              </div>

              <div className={styles.atsDetails}>
                <article className={`${styles.metricCard} ll-panel-soft p-4`}>
                  <p className="text-xs uppercase tracking-[0.16em] ll-muted">Matched Keywords</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {atsResult.matched_keywords.length === 0 ? (
                      <p className="text-sm ll-muted">No strong matches detected yet.</p>
                    ) : (
                      atsResult.matched_keywords.map((item) => (
                        <span key={item} className={`${styles.signalPill} rounded-full px-3 py-1 text-xs ll-title`}>
                          {item}
                        </span>
                      ))
                    )}
                  </div>
                </article>

                <article className={`${styles.metricCard} ll-panel-soft p-4`}>
                  <p className="text-xs uppercase tracking-[0.16em] ll-muted">Missing Keywords</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {atsResult.missing_keywords.length === 0 ? (
                      <p className="text-sm ll-muted">No obvious keyword gaps detected.</p>
                    ) : (
                      atsResult.missing_keywords.map((item) => (
                        <span key={item} className={`${styles.dangerPill} rounded-full px-3 py-1 text-xs text-rose-700`}>
                          {item}
                        </span>
                      ))
                    )}
                  </div>
                </article>

                <article className={`${styles.metricCard} ll-panel-soft p-4`}>
                  <p className="text-xs uppercase tracking-[0.16em] ll-muted">Recommendations</p>
                  <ul className="mt-3 space-y-2 text-sm ll-title">
                    {atsResult.recommendations.map((item) => (
                      <li key={item} className={`${styles.recommendationCard} px-3 py-2`}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              </div>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
