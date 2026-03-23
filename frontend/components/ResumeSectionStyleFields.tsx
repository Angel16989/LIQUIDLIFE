"use client";

import {
  RESUME_EDUCATION_STYLE_OPTIONS,
  RESUME_EXPERIENCE_STYLE_OPTIONS,
  RESUME_PROJECTS_STYLE_OPTIONS,
  RESUME_SKILLS_STYLE_OPTIONS,
  RESUME_SUMMARY_STYLE_OPTIONS,
  type ResumeSectionTemplateConfig,
} from "@/lib/documentTemplates";

type ResumeSectionStyleFieldsProps = {
  value: ResumeSectionTemplateConfig;
  onChange: (nextValue: ResumeSectionTemplateConfig) => void;
  containerClassName?: string;
  labelClassName?: string;
  selectClassName?: string;
  hintClassName?: string;
};

export default function ResumeSectionStyleFields({
  value,
  onChange,
  containerClassName = "grid gap-4 md:grid-cols-2 xl:grid-cols-5",
  labelClassName = "space-y-2",
  selectClassName = "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2",
  hintClassName = "text-xs text-zinc-500",
}: ResumeSectionStyleFieldsProps) {
  return (
    <div className={containerClassName}>
      <label className={labelClassName}>
        <span className="text-sm font-medium">Summary Layout</span>
        <select
          value={value.summaryStyle}
          onChange={(event) => onChange({ ...value, summaryStyle: event.target.value as ResumeSectionTemplateConfig["summaryStyle"] })}
          className={selectClassName}
        >
          {RESUME_SUMMARY_STYLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className={hintClassName}>
          {RESUME_SUMMARY_STYLE_OPTIONS.find((option) => option.value === value.summaryStyle)?.description}
        </p>
      </label>

      <label className={labelClassName}>
        <span className="text-sm font-medium">Experience Layout</span>
        <select
          value={value.experienceStyle}
          onChange={(event) => onChange({ ...value, experienceStyle: event.target.value as ResumeSectionTemplateConfig["experienceStyle"] })}
          className={selectClassName}
        >
          {RESUME_EXPERIENCE_STYLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className={hintClassName}>
          {RESUME_EXPERIENCE_STYLE_OPTIONS.find((option) => option.value === value.experienceStyle)?.description}
        </p>
      </label>

      <label className={labelClassName}>
        <span className="text-sm font-medium">Skills Layout</span>
        <select
          value={value.skillsStyle}
          onChange={(event) => onChange({ ...value, skillsStyle: event.target.value as ResumeSectionTemplateConfig["skillsStyle"] })}
          className={selectClassName}
        >
          {RESUME_SKILLS_STYLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className={hintClassName}>
          {RESUME_SKILLS_STYLE_OPTIONS.find((option) => option.value === value.skillsStyle)?.description}
        </p>
      </label>

      <label className={labelClassName}>
        <span className="text-sm font-medium">Projects Layout</span>
        <select
          value={value.projectsStyle}
          onChange={(event) => onChange({ ...value, projectsStyle: event.target.value as ResumeSectionTemplateConfig["projectsStyle"] })}
          className={selectClassName}
        >
          {RESUME_PROJECTS_STYLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className={hintClassName}>
          {RESUME_PROJECTS_STYLE_OPTIONS.find((option) => option.value === value.projectsStyle)?.description}
        </p>
      </label>

      <label className={labelClassName}>
        <span className="text-sm font-medium">Education Layout</span>
        <select
          value={value.educationStyle}
          onChange={(event) => onChange({ ...value, educationStyle: event.target.value as ResumeSectionTemplateConfig["educationStyle"] })}
          className={selectClassName}
        >
          {RESUME_EDUCATION_STYLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className={hintClassName}>
          {RESUME_EDUCATION_STYLE_OPTIONS.find((option) => option.value === value.educationStyle)?.description}
        </p>
      </label>
    </div>
  );
}
