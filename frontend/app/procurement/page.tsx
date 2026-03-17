"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { fetchDocuments, type DocumentRecord } from "@/lib/documents";
import { getCurrentUserMeta, subscribeToAuthTokenChanges } from "@/lib/auth";
import {
  DEFAULT_PROCUREMENT_PROFILE,
  fetchProcurementStatus,
  generateCoverLetter,
  generateResume,
  loadStoredProcurementProfile,
  reviewResumeAts,
  saveGeneratedDocument,
  saveStoredProcurementProfile,
  type AtsReviewPayload,
  type GeneratedDocumentPayload,
  type ProcurementProfile,
  type ProcurementStatus,
} from "@/lib/procurement";

type ToneOption = "professional" | "warm" | "direct";

const toneOptions: ToneOption[] = ["professional", "warm", "direct"];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-medium ll-title">{children}</span>;
}

function ProfileInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type="text"
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/55 bg-white/92 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
      />
    </label>
  );
}

function ProfileTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <label className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/55 bg-white/92 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
      />
    </label>
  );
}

function GeneratedPreview({
  label,
  result,
  onSave,
  saveLabel,
  isSaving,
}: {
  label: string;
  result: GeneratedDocumentPayload | null;
  onSave: () => Promise<void>;
  saveLabel: string;
  isSaving: boolean;
}) {
  if (!result) {
    return (
      <article className="ll-panel-soft p-5">
        <p className="text-sm font-semibold ll-title">{label}</p>
        <p className="mt-3 text-sm ll-muted">No generated draft yet.</p>
      </article>
    );
  }

  return (
    <article className="ll-panel-soft p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold ll-title">{label}</p>
          <h3 className="mt-2 text-xl font-semibold ll-title">{result.title}</h3>
        </div>
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={isSaving}
          className="rounded-lg bg-[#4f3f85] px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? "Saving..." : saveLabel}
        </button>
      </div>

      <div
        className="prose prose-sm mt-4 max-w-none rounded-xl border border-white/45 bg-white/90 p-4 text-[#23324a]"
        dangerouslySetInnerHTML={{ __html: result.content }}
      />

      {result.highlights && result.highlights.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] ll-muted">Key Matches</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {result.highlights.map((item) => (
              <span key={item} className="rounded-full border border-white/55 bg-white/95 px-3 py-1 text-xs ll-title">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.keywords_targeted && result.keywords_targeted.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] ll-muted">Target Keywords</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {result.keywords_targeted.map((item) => (
              <span key={item} className="rounded-full border border-white/55 bg-white/95 px-3 py-1 text-xs ll-title">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

export default function ProcurementPage() {
  const router = useRouter();
  const { isChecking, isAuthenticated } = useRequireAuth();
  const [userMeta, setUserMeta] = useState(() => getCurrentUserMeta());
  const [profile, setProfile] = useState<ProcurementProfile>(DEFAULT_PROCUREMENT_PROFILE);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [status, setStatus] = useState<ProcurementStatus | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [companyName, setCompanyName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [tone, setTone] = useState<ToneOption>("professional");
  const [jobDescription, setJobDescription] = useState("");
  const [coverLetterResult, setCoverLetterResult] = useState<GeneratedDocumentPayload | null>(null);
  const [resumeResult, setResumeResult] = useState<GeneratedDocumentPayload | null>(null);
  const [atsResult, setAtsResult] = useState<AtsReviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [isGeneratingResume, setIsGeneratingResume] = useState(false);
  const [isRunningAts, setIsRunningAts] = useState(false);
  const [isSavingCoverLetter, setIsSavingCoverLetter] = useState(false);
  const [isSavingResume, setIsSavingResume] = useState(false);
  const [hasLoadedLocalProfile, setHasLoadedLocalProfile] = useState(false);

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
          setError("Could not decrypt the saved Procurement profile. Starting with a blank profile.");
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
          setError("Could not save the encrypted Procurement profile in this browser.");
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
        setError(loadError instanceof Error ? loadError.message : "Could not load Procurement.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadPageData();
  }, [isAuthenticated]);

  const resumeDocuments = useMemo(
    () => documents.filter((document) => document.docType === "resume"),
    [documents],
  );

  const procurementUnlocked = Boolean(isAuthenticated && userMeta && !userMeta.isAdmin);

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
      tone,
    };
  }

  async function handleGenerateCoverLetter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!jobDescription.trim()) {
      setError("Add the job description first.");
      return;
    }

    try {
      setIsGeneratingCoverLetter(true);
      setError(null);
      setSuccess(null);
      const payload = await generateCoverLetter(buildGenerationPayload());
      setCoverLetterResult(payload);
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "Failed to generate cover letter.");
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  }

  async function handleGenerateResume() {
    if (!jobDescription.trim()) {
      setError("Add the job description first.");
      return;
    }

    try {
      setIsGeneratingResume(true);
      setError(null);
      setSuccess(null);
      const payload = await generateResume(buildGenerationPayload());
      setResumeResult(payload);
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "Failed to generate resume.");
    } finally {
      setIsGeneratingResume(false);
    }
  }

  async function handleRunAts() {
    if (!jobDescription.trim()) {
      setError("Add the job description first.");
      return;
    }
    if (!selectedResumeId && !(resumeResult?.content || "").trim()) {
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
        resume_content: selectedResumeId ? "" : resumeResult?.content || "",
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
      setError(saveError instanceof Error ? saveError.message : "Failed to save generated document.");
    } finally {
      setSaving(false);
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
        <section className="ll-panel p-6">
          <p className="text-xs uppercase tracking-[0.22em] ll-muted">Procurement</p>
          <h1 className="mt-2 text-3xl font-semibold ll-title">This workspace is for approved member accounts.</h1>
          <p className="mt-3 text-sm ll-muted">
            Admin accounts manage approvals from the admin dashboard. Approved users unlock Procurement automatically on their next sign-in.
          </p>
          <Link href="/admin-panel" className="mt-5 inline-flex rounded-lg bg-[#4f3f85] px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110">
            Go to Admin Panel
          </Link>
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Procurement">
      <div className="space-y-6">
        <header className="ll-panel flex flex-wrap items-start justify-between gap-4 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] ll-muted">Procurement</p>
            <h1 className="mt-2 text-3xl font-semibold ll-title">Personal knowledge, AI tailoring, and ATS review</h1>
            <p className="mt-3 max-w-3xl text-sm ll-muted">
              Your profile stays on this device under your account in browser storage. When you generate a document, only the profile,
              job description, and selected resume context are sent to the backend AI endpoint.
            </p>
          </div>

          <div className="rounded-2xl border border-white/55 bg-white/90 px-4 py-3 text-sm ll-title">
            <p>Profile owner: <strong>{userMeta?.username}</strong></p>
            <p className="mt-1 ll-muted">
              AI: {status?.ai_configured ? `${status.provider} / ${status.model}` : "Not configured yet"}
            </p>
          </div>
        </header>

        {error && <p className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {success && !error && <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>}

        {status && !status.ai_configured && !isLoading && (
          <section className="ll-panel p-5">
            <p className="text-sm font-semibold ll-title">OpenAI is not configured yet.</p>
            <p className="mt-2 text-sm ll-muted">
              ATS review still works. For AI cover-letter and resume generation, add `OPENAI_API_KEY` to the Django backend environment.
            </p>
          </section>
        )}

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="ll-panel p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] ll-muted">Local Profile</p>
                <h2 className="mt-2 text-2xl font-semibold ll-title">Tell Liquid Life about you</h2>
              </div>
              <span className="rounded-full border border-white/55 bg-white/95 px-3 py-1 text-xs ll-title">Saved automatically</span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <ProfileInput label="Full Name" value={profile.fullName} onChange={(value) => updateProfile("fullName", value)} placeholder="Jane Doe" />
              <ProfileInput label="Headline" value={profile.headline} onChange={(value) => updateProfile("headline", value)} placeholder="Backend Engineer | API + Data Platforms" />
              <ProfileInput label="Email" value={profile.email} onChange={(value) => updateProfile("email", value)} placeholder="jane@example.com" />
              <ProfileInput label="Phone" value={profile.phone} onChange={(value) => updateProfile("phone", value)} placeholder="+61 ..." />
              <ProfileInput label="Location" value={profile.location} onChange={(value) => updateProfile("location", value)} placeholder="Sydney, NSW" />
              <ProfileInput label="Portfolio URL" value={profile.portfolioUrl} onChange={(value) => updateProfile("portfolioUrl", value)} placeholder="https://portfolio.example.com" />
              <ProfileInput label="LinkedIn URL" value={profile.linkedinUrl} onChange={(value) => updateProfile("linkedinUrl", value)} placeholder="https://linkedin.com/in/..." />
              <ProfileTextarea label="Professional Summary" value={profile.summary} onChange={(value) => updateProfile("summary", value)} placeholder="What should the AI know about your background and strengths?" rows={5} />
              <ProfileTextarea label="Target Roles" value={profile.targetRoles} onChange={(value) => updateProfile("targetRoles", value)} placeholder="Senior Backend Engineer, Platform Engineer" rows={4} />
              <ProfileTextarea label="Skills" value={profile.skills} onChange={(value) => updateProfile("skills", value)} placeholder="Python, Django, PostgreSQL, AWS, React" rows={4} />
              <ProfileTextarea label="Achievements" value={profile.achievements} onChange={(value) => updateProfile("achievements", value)} placeholder="One bullet per line with measurable wins" rows={5} />
              <ProfileTextarea label="Experience Notes" value={profile.experience} onChange={(value) => updateProfile("experience", value)} placeholder="Key responsibilities and impact by role" rows={6} />
              <ProfileTextarea label="Education" value={profile.education} onChange={(value) => updateProfile("education", value)} placeholder="Degrees, certificates, bootcamps" rows={4} />
              <ProfileTextarea label="Certifications" value={profile.certifications} onChange={(value) => updateProfile("certifications", value)} placeholder="AWS CCP, Azure Fundamentals" rows={4} />
              <ProfileTextarea label="Projects" value={profile.projects} onChange={(value) => updateProfile("projects", value)} placeholder="Relevant projects or case studies" rows={5} />
              <ProfileTextarea label="Strengths" value={profile.strengths} onChange={(value) => updateProfile("strengths", value)} placeholder="Leadership, stakeholder communication, system design" rows={4} />
              <ProfileTextarea label="Preferences" value={profile.preferences} onChange={(value) => updateProfile("preferences", value)} placeholder="Preferred tone, work style, industries" rows={4} />
              <div className="md:col-span-2">
                <ProfileTextarea
                  label="Additional Context"
                  value={profile.additionalContext}
                  onChange={(value) => updateProfile("additionalContext", value)}
                  placeholder="Anything else the AI should consider for tailored documents"
                  rows={5}
                />
              </div>
            </div>
          </article>

          <article className="ll-panel p-6">
            <p className="text-xs uppercase tracking-[0.18em] ll-muted">Document Targeting</p>
            <h2 className="mt-2 text-2xl font-semibold ll-title">Paste the job description and pick a resume</h2>

            <form onSubmit={handleGenerateCoverLetter} className="mt-5 space-y-4">
              <label className="space-y-2">
                <FieldLabel>Base Resume</FieldLabel>
                <select
                  value={selectedResumeId}
                  onChange={(event) => setSelectedResumeId(event.target.value)}
                  className="w-full rounded-xl border border-white/55 bg-white/92 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                >
                  <option value="">Use profile only</option>
                  {resumeDocuments.map((document) => (
                    <option key={document.id} value={String(document.id)}>
                      {document.title}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <ProfileInput label="Company Name" value={companyName} onChange={setCompanyName} placeholder="OpenAI" />
                <ProfileInput label="Target Role" value={targetRole} onChange={setTargetRole} placeholder="Backend Engineer" />
              </div>

              <label className="space-y-2">
                <FieldLabel>Tone</FieldLabel>
                <select
                  value={tone}
                  onChange={(event) => setTone(event.target.value as ToneOption)}
                  className="w-full rounded-xl border border-white/55 bg-white/92 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                >
                  {toneOptions.map((option) => (
                    <option key={option} value={option}>
                      {option[0].toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <FieldLabel>Job Description</FieldLabel>
                <textarea
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  rows={14}
                  placeholder="Paste the full role description here."
                  className="w-full rounded-xl border border-white/55 bg-white/92 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isGeneratingCoverLetter || !status?.ai_configured}
                  className="rounded-lg bg-[#4f3f85] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGeneratingCoverLetter ? "Generating cover letter..." : "Generate Cover Letter"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleGenerateResume()}
                  disabled={isGeneratingResume || !status?.ai_configured}
                  className="rounded-lg border border-white/55 bg-white/95 px-4 py-2 text-sm font-semibold ll-title transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGeneratingResume ? "Generating resume..." : "Generate Resume"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleRunAts()}
                  disabled={isRunningAts}
                  className="rounded-lg border border-white/55 bg-white/95 px-4 py-2 text-sm font-semibold ll-title transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRunningAts ? "Running ATS review..." : "Run ATS Review"}
                </button>
              </div>
            </form>

            <div className="mt-5 rounded-2xl border border-dashed border-white/60 bg-white/72 p-4 text-sm ll-muted">
              <p>Resume source count: {resumeDocuments.length}</p>
              <p className="mt-1">Saved outputs go straight into the shared Documents module so you can edit them live afterward.</p>
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <GeneratedPreview
            label="AI Cover Letter"
            result={coverLetterResult}
            onSave={() => handleSaveGenerated(coverLetterResult as GeneratedDocumentPayload, "cover_letter")}
            saveLabel="Save to Documents"
            isSaving={isSavingCoverLetter}
          />

          <GeneratedPreview
            label="AI Resume"
            result={resumeResult}
            onSave={() => handleSaveGenerated(resumeResult as GeneratedDocumentPayload, "resume")}
            saveLabel="Save to Documents"
            isSaving={isSavingResume}
          />
        </section>

        <section className="ll-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] ll-muted">ATS Review</p>
              <h2 className="mt-2 text-2xl font-semibold ll-title">Resume match score</h2>
            </div>
            {atsResult && (
              <div className="rounded-full border border-white/55 bg-white/95 px-4 py-2 text-sm font-semibold ll-title">
                Score: {atsResult.overall_score}/100
              </div>
            )}
          </div>

          {!atsResult ? (
            <p className="mt-4 text-sm ll-muted">Run ATS review after selecting or generating a resume.</p>
          ) : (
            <div className="mt-5 grid gap-5 lg:grid-cols-[0.45fr_0.55fr]">
              <div className="space-y-4">
                <article className="ll-panel-soft p-4">
                  <p className="text-xs uppercase tracking-[0.16em] ll-muted">Keyword Match</p>
                  <p className="mt-2 text-3xl font-semibold ll-title">{atsResult.keyword_score}%</p>
                </article>
                <article className="ll-panel-soft p-4">
                  <p className="text-xs uppercase tracking-[0.16em] ll-muted">Section Coverage</p>
                  <p className="mt-2 text-3xl font-semibold ll-title">{atsResult.section_score}%</p>
                </article>
                <article className="ll-panel-soft p-4">
                  <p className="text-sm ll-muted">{atsResult.summary}</p>
                </article>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <article className="ll-panel-soft p-4">
                  <p className="text-xs uppercase tracking-[0.16em] ll-muted">Matched Keywords</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {atsResult.matched_keywords.length === 0 ? (
                      <p className="text-sm ll-muted">No strong matches detected yet.</p>
                    ) : (
                      atsResult.matched_keywords.map((item) => (
                        <span key={item} className="rounded-full border border-white/55 bg-white/95 px-3 py-1 text-xs ll-title">
                          {item}
                        </span>
                      ))
                    )}
                  </div>
                </article>

                <article className="ll-panel-soft p-4">
                  <p className="text-xs uppercase tracking-[0.16em] ll-muted">Missing Keywords</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {atsResult.missing_keywords.length === 0 ? (
                      <p className="text-sm ll-muted">No obvious keyword gaps detected.</p>
                    ) : (
                      atsResult.missing_keywords.map((item) => (
                        <span key={item} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-700">
                          {item}
                        </span>
                      ))
                    )}
                  </div>
                </article>

                <article className="ll-panel-soft p-4 md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.16em] ll-muted">Recommendations</p>
                  <ul className="mt-3 space-y-2 text-sm ll-title">
                    {atsResult.recommendations.map((item) => (
                      <li key={item} className="rounded-lg border border-white/45 bg-white/80 px-3 py-2">
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
