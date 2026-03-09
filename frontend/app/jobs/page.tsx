"use client";

import { DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import DashboardCards, { type DashboardCard } from "@/components/DashboardCards";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/api";

type JobStatus = "Applied" | "Interview" | "Offer" | "Rejected";
type JobFilter = "All" | JobStatus;
type JobSort = "Newest" | "Company A-Z" | "Status";
type JobsViewMode = "Table" | "Kanban";

type JobApplication = {
  id: number;
  company: string;
  role: string;
  status: JobStatus;
  notes: string;
  applicationDate: string;
  resumeId: number | null;
  coverLetterId: number | null;
};

type ResumeItem = {
  id: number;
  title: string;
};

type CoverLetterItem = {
  id: number;
  title: string;
  company: string;
};

type ApiJob = {
  id: number;
  company: string;
  role: string;
  status: JobStatus;
  notes: string;
  application_date: string;
  resume: number | null;
  cover_letter: number | null;
};

type ApiDocument = {
  id: number;
  title: string;
  doc_type: "general" | "resume" | "cover_letter";
};

const JOBS_API_URL = `${API_BASE_URL}/jobs`;
const DOCUMENTS_API_URL = `${API_BASE_URL}/documents`;
const statusOptions: JobStatus[] = ["Applied", "Interview", "Offer", "Rejected"];
const filterOptions: JobFilter[] = ["All", ...statusOptions];
const sortOptions: JobSort[] = ["Newest", "Company A-Z", "Status"];

const statusBadgeClasses: Record<JobStatus, string> = {
  Applied: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
  Interview: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  Offer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
};

const statusQuickButtonClasses: Record<JobStatus, string> = {
  Applied: "border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-900 dark:bg-sky-900/50 dark:text-sky-300",
  Interview:
    "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900 dark:bg-amber-900/50 dark:text-amber-300",
  Offer:
    "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-300",
  Rejected: "border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-900 dark:bg-rose-900/50 dark:text-rose-300",
};

function mapApiJob(job: ApiJob): JobApplication {
  return {
    id: job.id,
    company: job.company,
    role: job.role,
    status: job.status,
    notes: job.notes ?? "",
    applicationDate: job.application_date,
    resumeId: typeof job.resume === "number" ? job.resume : null,
    coverLetterId: typeof job.cover_letter === "number" ? job.cover_letter : null,
  };
}

function toApiPayload(job: Omit<JobApplication, "id">) {
  return {
    company: job.company,
    role: job.role,
    status: job.status,
    notes: job.notes,
    application_date: job.applicationDate || new Date().toISOString().slice(0, 10),
    resume: job.resumeId,
    cover_letter: job.coverLetterId,
  };
}

function getJobTimestamp(job: JobApplication): number {
  if (!job.applicationDate) {
    return job.id;
  }

  const value = new Date(job.applicationDate).getTime();
  return Number.isNaN(value) ? job.id : value;
}

function mapApiDocuments(items: ApiDocument[]) {
  const resumes: ResumeItem[] = [];
  const coverLetters: CoverLetterItem[] = [];

  for (const item of items) {
    if (item.doc_type === "resume") {
      resumes.push({ id: item.id, title: item.title });
      continue;
    }

    if (item.doc_type === "general") {
      continue;
    }

    coverLetters.push({ id: item.id, title: item.title, company: "" });
  }

  return { resumes, coverLetters };
}

function toSelectionValue(value: number | null): number | "" {
  return typeof value === "number" ? value : "";
}

function parseSelectionValue(value: string): number | "" {
  if (!value) {
    return "";
  }

  const numeric = Number(value);
  return Number.isNaN(numeric) ? "" : numeric;
}

export default function JobsPage() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetterItem[]>([]);

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<JobStatus>("Applied");
  const [notes, setNotes] = useState("");
  const [selectedResumeId, setSelectedResumeId] = useState<number | "">("");
  const [selectedCoverLetterId, setSelectedCoverLetterId] = useState<number | "">("");

  const [statusFilter, setStatusFilter] = useState<JobFilter>("All");
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState<JobSort>("Newest");
  const [viewMode, setViewMode] = useState<JobsViewMode>("Table");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCompany, setEditCompany] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState<JobStatus>("Applied");
  const [editNotes, setEditNotes] = useState("");
  const [editResumeId, setEditResumeId] = useState<number | "">("");
  const [editCoverLetterId, setEditCoverLetterId] = useState<number | "">("");

  const [draggedJobId, setDraggedJobId] = useState<number | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<JobStatus | null>(null);

  async function loadJobs() {
    try {
      setApiError(null);
      setIsLoading(true);
      const response = await fetch(JOBS_API_URL);
      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }

      const data = (await response.json()) as ApiJob[];
      setApplications(data.map(mapApiJob));
    } catch (error) {
      setApiError("Could not load jobs. Check Django server/CORS and refresh.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    async function loadPageData() {
      await loadJobs();
      try {
        const documentsResponse = await fetch(DOCUMENTS_API_URL);
        if (!documentsResponse.ok) {
          throw new Error("Failed to fetch documents");
        }

        const documents = (await documentsResponse.json()) as ApiDocument[];
        const mapped = mapApiDocuments(documents);
        setResumes(mapped.resumes);
        setCoverLetters(mapped.coverLetters);
      } catch (error) {
        console.error(error);
      }
    }

    void loadPageData();
  }, []);

  const resumeTitleById = useMemo(() => new Map(resumes.map((item) => [item.id, item.title])), [resumes]);
  const coverLetterTitleById = useMemo(
    () => new Map(coverLetters.map((item) => [item.id, item.title])),
    [coverLetters],
  );

  const jobsCards: DashboardCard[] = useMemo(
    () => [
      { label: "Total Applications", value: String(applications.length), delta: "Tracked roles" },
      {
        label: "Applied",
        value: String(applications.filter((job) => job.status === "Applied").length),
        delta: "Awaiting response",
      },
      {
        label: "Interviews",
        value: String(applications.filter((job) => job.status === "Interview").length),
        delta: "Active process",
      },
      {
        label: "Offers",
        value: String(applications.filter((job) => job.status === "Offer").length),
        delta: "Ready to evaluate",
      },
    ],
    [applications],
  );

  const filteredApplications = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    const filtered = applications.filter((application) => {
      const matchesStatus = statusFilter === "All" || application.status === statusFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        application.company.toLowerCase().includes(normalizedSearch) ||
        application.role.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "Company A-Z") {
        return a.company.localeCompare(b.company);
      }

      if (sortBy === "Status") {
        const rank: Record<JobStatus, number> = {
          Applied: 0,
          Interview: 1,
          Offer: 2,
          Rejected: 3,
        };
        return rank[a.status] - rank[b.status];
      }

      return getJobTimestamp(b) - getJobTimestamp(a);
    });
  }, [applications, statusFilter, searchText, sortBy]);

  const kanbanColumns = useMemo(
    () =>
      statusOptions.map((columnStatus) => ({
        status: columnStatus,
        jobs: filteredApplications.filter((application) => application.status === columnStatus),
      })),
    [filteredApplications],
  );

  async function handleAddJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextCompany = company.trim();
    const nextRole = role.trim();

    if (!nextCompany || !nextRole) {
      return;
    }

    const payload = toApiPayload({
      company: nextCompany,
      role: nextRole,
      status,
      notes: notes.trim(),
      applicationDate: new Date().toISOString().slice(0, 10),
      resumeId: selectedResumeId === "" ? null : selectedResumeId,
      coverLetterId: selectedCoverLetterId === "" ? null : selectedCoverLetterId,
    });

    try {
      setApiError(null);
      const response = await fetch(JOBS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to create job");
      }

      const created = (await response.json()) as ApiJob;
      setApplications((current) => [mapApiJob(created), ...current]);
      setCompany("");
      setRole("");
      setStatus("Applied");
      setNotes("");
      setSelectedResumeId("");
      setSelectedCoverLetterId("");
    } catch (error) {
      setApiError("Could not create job. Check backend connection.");
      console.error(error);
    }
  }

  function handleStartEdit(application: JobApplication) {
    setEditingId(application.id);
    setEditCompany(application.company);
    setEditRole(application.role);
    setEditStatus(application.status);
    setEditNotes(application.notes);
    setEditResumeId(toSelectionValue(application.resumeId));
    setEditCoverLetterId(toSelectionValue(application.coverLetterId));
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditCompany("");
    setEditRole("");
    setEditStatus("Applied");
    setEditNotes("");
    setEditResumeId("");
    setEditCoverLetterId("");
  }

  async function handleSaveEdit(id: number) {
    const nextCompany = editCompany.trim();
    const nextRole = editRole.trim();

    if (!nextCompany || !nextRole) {
      return;
    }

    const currentJob = applications.find((job) => job.id === id);
    if (!currentJob) {
      return;
    }

    const updatedJob: JobApplication = {
      ...currentJob,
      company: nextCompany,
      role: nextRole,
      status: editStatus,
      notes: editNotes.trim(),
      resumeId: editResumeId === "" ? null : editResumeId,
      coverLetterId: editCoverLetterId === "" ? null : editCoverLetterId,
    };

    try {
      setApiError(null);
      const response = await fetch(`${JOBS_API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toApiPayload(updatedJob)),
      });

      if (!response.ok) {
        throw new Error("Failed to update job");
      }

      const saved = (await response.json()) as ApiJob;
      setApplications((current) => current.map((job) => (job.id === id ? mapApiJob(saved) : job)));
      handleCancelEdit();
    } catch (error) {
      setApiError("Could not update job.");
      console.error(error);
    }
  }

  async function handleDeleteJob(id: number) {
    const shouldDelete = window.confirm("Are you sure you want to delete this application?");
    if (!shouldDelete) {
      return;
    }

    try {
      setApiError(null);
      const response = await fetch(`${JOBS_API_URL}/${id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        throw new Error("Failed to delete job");
      }

      setApplications((current) => current.filter((job) => job.id !== id));
    } catch (error) {
      setApiError("Could not delete job.");
      console.error(error);
    }
  }

  async function handleQuickStatusUpdate(id: number, nextStatus: JobStatus) {
    const currentJob = applications.find((job) => job.id === id);
    if (!currentJob || currentJob.status === nextStatus) {
      return;
    }

    const updatedJob: JobApplication = { ...currentJob, status: nextStatus };

    try {
      setApiError(null);
      const response = await fetch(`${JOBS_API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toApiPayload(updatedJob)),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      const saved = (await response.json()) as ApiJob;
      setApplications((current) => current.map((job) => (job.id === id ? mapApiJob(saved) : job)));
    } catch (error) {
      setApiError("Could not update status.");
      console.error(error);
    }
  }

  function handleKanbanDragStart(event: DragEvent<HTMLElement>, jobId: number) {
    setDraggedJobId(jobId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(jobId));
  }

  function handleKanbanDragOver(event: DragEvent<HTMLElement>, columnStatus: JobStatus) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverStatus(columnStatus);
  }

  function handleKanbanDrop(event: DragEvent<HTMLElement>, columnStatus: JobStatus) {
    event.preventDefault();
    const droppedId = Number(event.dataTransfer.getData("text/plain") || draggedJobId);

    if (!Number.isNaN(droppedId)) {
      void handleQuickStatusUpdate(droppedId, columnStatus);
    }

    setDraggedJobId(null);
    setDragOverStatus(null);
  }

  function handleKanbanDragEnd() {
    setDraggedJobId(null);
    setDragOverStatus(null);
  }

  return (
    <DashboardLayout title="Jobs">
      <div className="space-y-6">
        <DashboardCards cards={jobsCards} />

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Add Job Application</h3>
          {apiError && (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
              {apiError}
            </p>
          )}
          <form onSubmit={handleAddJob} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Company Name</span>
              <input
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                type="text"
                placeholder="Acme Inc."
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Role Title</span>
              <input
                value={role}
                onChange={(event) => setRole(event.target.value)}
                type="text"
                placeholder="Software Engineer"
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as JobStatus)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Resume</span>
              <select
                value={selectedResumeId}
                onChange={(event) => setSelectedResumeId(parseSelectionValue(event.target.value))}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="">No resume selected</option>
                {resumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Cover Letter</span>
              <select
                value={selectedCoverLetterId}
                onChange={(event) => setSelectedCoverLetterId(parseSelectionValue(event.target.value))}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="">No cover letter selected</option>
                {coverLetters.map((coverLetter) => (
                  <option key={coverLetter.id} value={coverLetter.id}>
                    {coverLetter.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Notes</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Add follow-up reminders or interview details..."
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 md:col-span-2 md:w-fit dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Add Application
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Application Tracker</h3>
            <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-900">
              {(["Table", "Kanban"] as JobsViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    viewMode === mode
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {mode} View
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px]">
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              type="text"
              placeholder="Search company or role..."
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as JobFilter)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {filterOptions.map((filterOption) => (
                <option key={filterOption} value={filterOption}>
                  {filterOption}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as JobSort)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {sortOptions.map((sortOption) => (
                <option key={sortOption} value={sortOption}>
                  Sort: {sortOption}
                </option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Loading jobs...</p>
          ) : viewMode === "Table" ? (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
                <thead>
                  <tr className="text-zinc-500 dark:text-zinc-400">
                    <th className="px-3 py-2 font-medium">Company</th>
                    <th className="px-3 py-2 font-medium">Role</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Notes</th>
                    <th className="px-3 py-2 font-medium">Resume</th>
                    <th className="px-3 py-2 font-medium">Cover Letter</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((application) => {
                    const isEditing = editingId === application.id;
                    const resumeTitle = application.resumeId
                      ? (resumeTitleById.get(application.resumeId) ?? "Missing resume")
                      : "Not selected";
                    const coverLetterTitle = application.coverLetterId
                      ? (coverLetterTitleById.get(application.coverLetterId) ?? "Missing cover letter")
                      : "Not selected";

                    return (
                      <tr key={application.id} className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60">
                        <td className="whitespace-nowrap px-3 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                          {isEditing ? (
                            <input
                              value={editCompany}
                              onChange={(event) => setEditCompany(event.target.value)}
                              type="text"
                              className="w-full min-w-40 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            />
                          ) : (
                            application.company
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-zinc-700 dark:text-zinc-300">
                          {isEditing ? (
                            <input
                              value={editRole}
                              onChange={(event) => setEditRole(event.target.value)}
                              type="text"
                              className="w-full min-w-40 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            />
                          ) : (
                            application.role
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          {isEditing ? (
                            <select
                              value={editStatus}
                              onChange={(event) => setEditStatus(event.target.value as JobStatus)}
                              className="w-full min-w-28 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            >
                              {statusOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {statusOptions.map((statusOption) => {
                                const isActiveStatus = application.status === statusOption;

                                return (
                                  <button
                                    key={statusOption}
                                    type="button"
                                    onClick={() => void handleQuickStatusUpdate(application.id, statusOption)}
                                    className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition ${
                                      isActiveStatus
                                        ? statusQuickButtonClasses[statusOption]
                                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                    }`}
                                  >
                                    {statusOption}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </td>
                        <td className="min-w-56 px-3 py-3 text-zinc-600 dark:text-zinc-300">
                          {isEditing ? (
                            <textarea
                              value={editNotes}
                              onChange={(event) => setEditNotes(event.target.value)}
                              rows={2}
                              className="w-full min-w-56 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            />
                          ) : (
                            application.notes || "No notes"
                          )}
                        </td>
                        <td className="min-w-52 px-3 py-3 text-zinc-600 dark:text-zinc-300">
                          {isEditing ? (
                            <select
                              value={editResumeId}
                              onChange={(event) => setEditResumeId(parseSelectionValue(event.target.value))}
                              className="w-full min-w-52 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            >
                              <option value="">No resume selected</option>
                              {resumes.map((resume) => (
                                <option key={resume.id} value={resume.id}>
                                  {resume.title}
                                </option>
                              ))}
                            </select>
                          ) : (
                            resumeTitle
                          )}
                        </td>
                        <td className="min-w-52 px-3 py-3 text-zinc-600 dark:text-zinc-300">
                          {isEditing ? (
                            <select
                              value={editCoverLetterId}
                              onChange={(event) => setEditCoverLetterId(parseSelectionValue(event.target.value))}
                              className="w-full min-w-52 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            >
                              <option value="">No cover letter selected</option>
                              {coverLetters.map((coverLetter) => (
                                <option key={coverLetter.id} value={coverLetter.id}>
                                  {coverLetter.title}
                                </option>
                              ))}
                            </select>
                          ) : (
                            coverLetterTitle
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => void handleSaveEdit(application.id)}
                                  className="text-xs font-medium text-emerald-600 hover:underline"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="text-xs font-medium text-zinc-500 hover:underline dark:text-zinc-300"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartEdit(application)}
                                  className="text-xs font-medium text-zinc-700 hover:underline dark:text-zinc-200"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => void handleDeleteJob(application.id)}
                                  className="text-xs font-medium text-red-600 hover:underline"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredApplications.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                        No applications match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto pb-1">
              <div className="grid min-w-[960px] gap-4 lg:grid-cols-4">
                {kanbanColumns.map((column) => (
                  <div
                    key={column.status}
                    onDragOver={(event) => handleKanbanDragOver(event, column.status)}
                    onDrop={(event) => handleKanbanDrop(event, column.status)}
                    onDragLeave={() => setDragOverStatus(null)}
                    className={`rounded-xl border bg-zinc-50 p-3 transition dark:bg-zinc-900/60 ${
                      dragOverStatus === column.status
                        ? "border-zinc-400 ring-2 ring-zinc-300 dark:border-zinc-500 dark:ring-zinc-700"
                        : "border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClasses[column.status]}`}>
                        {column.status}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{column.jobs.length}</span>
                    </div>

                    <div className="space-y-3">
                      {column.jobs.map((application) => {
                        const resumeTitle = application.resumeId
                          ? (resumeTitleById.get(application.resumeId) ?? "Missing resume")
                          : "Not selected";
                        const coverLetterTitle = application.coverLetterId
                          ? (coverLetterTitleById.get(application.coverLetterId) ?? "Missing cover letter")
                          : "Not selected";

                        return (
                          <article
                            key={application.id}
                            draggable
                            onDragStart={(event) => handleKanbanDragStart(event, application.id)}
                            onDragEnd={handleKanbanDragEnd}
                            className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950"
                          >
                            <div>
                              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{application.company}</p>
                              <p className="text-xs text-zinc-600 dark:text-zinc-300">{application.role}</p>
                            </div>

                            <div className="space-y-1">
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Resume: {resumeTitle}</p>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Cover Letter: {coverLetterTitle}</p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setViewMode("Table");
                                  handleStartEdit(application);
                                }}
                                className="text-xs font-medium text-zinc-700 hover:underline dark:text-zinc-200"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteJob(application.id)}
                                className="text-xs font-medium text-red-600 hover:underline"
                              >
                                Delete
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {statusOptions.map((statusOption) => {
                                const isActiveStatus = application.status === statusOption;

                                return (
                                  <button
                                    key={statusOption}
                                    type="button"
                                    onClick={() => void handleQuickStatusUpdate(application.id, statusOption)}
                                    className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition ${
                                      isActiveStatus
                                        ? statusQuickButtonClasses[statusOption]
                                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                    }`}
                                  >
                                    {statusOption}
                                  </button>
                                );
                              })}
                            </div>
                          </article>
                        );
                      })}
                      {column.jobs.length === 0 && (
                        <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                          No jobs
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
