from __future__ import annotations

import json
import re
from collections import Counter
from html import escape, unescape
from urllib import error, request

from django.conf import settings

from jobs.document_content import extract_document_content
from jobs.template_config import normalize_document_template_config

OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
AI_PROVIDER = "openai"
DEFAULT_MODEL = "gpt-4o-mini"
ALLOWED_TEXT_KEYWORDS = {
    "ai",
    "ml",
    "ui",
    "ux",
    "qa",
    "go",
    "sql",
    "aws",
    "gcp",
    "api",
    "etl",
}
STOPWORDS = {
    "about",
    "after",
    "again",
    "also",
    "and",
    "any",
    "are",
    "because",
    "been",
    "before",
    "being",
    "between",
    "build",
    "building",
    "candidate",
    "company",
    "could",
    "create",
    "daily",
    "drive",
    "each",
    "from",
    "have",
    "into",
    "join",
    "looking",
    "more",
    "must",
    "need",
    "our",
    "role",
    "their",
    "them",
    "they",
    "this",
    "through",
    "using",
    "will",
    "with",
    "work",
    "your",
}
SECTION_PATTERNS = {
    "summary": r"summary|profile|professional summary",
    "experience": r"experience|employment|work history",
    "skills": r"skills|core skills|technical skills",
    "projects": r"projects|selected projects",
    "education": r"education|qualifications",
}
PROFILE_SECTION_ALIASES = {
    "summary": {"summary", "profile", "professional summary", "about"},
    "experience": {"experience", "work experience", "professional experience", "employment", "work history"},
    "skills": {"skills", "core skills", "technical skills", "technologies"},
    "education": {"education", "qualifications", "academic background"},
    "certifications": {"certifications", "licenses", "certificates"},
    "projects": {"projects", "selected projects"},
    "achievements": {"achievements", "highlights", "key achievements", "awards"},
}
EMAIL_PATTERN = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)
PHONE_PATTERN = re.compile(r"(?:(?:\+?\d[\s().-]*){8,15})")
URL_PATTERN = re.compile(r"(https?://[^\s]+|www\.[^\s]+)", re.IGNORECASE)
LINKEDIN_PATTERN = re.compile(r"(https?://[^\s]*linkedin\.com/[^\s]+|www\.[^\s]*linkedin\.com/[^\s]+)", re.IGNORECASE)


class ProcurementAIError(Exception):
    pass


class ProcurementAIConfigurationError(ProcurementAIError):
    pass


class ProcurementAIResponseError(ProcurementAIError):
    pass


def get_ai_status() -> dict:
    model = getattr(settings, "OPENAI_MODEL", DEFAULT_MODEL)
    api_key = getattr(settings, "OPENAI_API_KEY", "")
    return {
        "provider": AI_PROVIDER,
        "model": model,
        "ai_configured": bool(api_key),
        "local_profile_storage": True,
    }


def strip_html(value: str) -> str:
    if not value:
        return ""

    text = re.sub(r"<\s*br\s*/?>", "\n", value, flags=re.IGNORECASE)
    text = re.sub(r"</p\s*>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def normalize_list(value) -> list[str]:
    if isinstance(value, list):
        items = value
    else:
        text_value = str(value or "")
        items = re.split(r"\n|,|;", text_value)

    normalized: list[str] = []
    for item in items:
        cleaned = str(item).strip(" -\t\r")
        if cleaned:
            normalized.append(cleaned)
    return normalized


def format_profile_for_prompt(profile: dict) -> dict:
    return {
        "full_name": str(profile.get("fullName", "")).strip(),
        "headline": str(profile.get("headline", "")).strip(),
        "email": str(profile.get("email", "")).strip(),
        "phone": str(profile.get("phone", "")).strip(),
        "location": str(profile.get("location", "")).strip(),
        "portfolio_url": str(profile.get("portfolioUrl", "")).strip(),
        "linkedin_url": str(profile.get("linkedinUrl", "")).strip(),
        "summary": str(profile.get("summary", "")).strip(),
        "target_roles": normalize_list(profile.get("targetRoles", "")),
        "skills": normalize_list(profile.get("skills", "")),
        "achievements": normalize_list(profile.get("achievements", "")),
        "experience": normalize_list(profile.get("experience", "")),
        "education": normalize_list(profile.get("education", "")),
        "certifications": normalize_list(profile.get("certifications", "")),
        "projects": normalize_list(profile.get("projects", "")),
        "strengths": normalize_list(profile.get("strengths", "")),
        "preferences": normalize_list(profile.get("preferences", "")),
        "additional_context": str(profile.get("additionalContext", "")).strip(),
    }


def extract_resume_text(file_obj) -> str:
    return strip_html(extract_document_content(file_obj))


def _normalize_profile_text(value: object) -> str:
    if isinstance(value, list):
        return "\n".join(item for item in normalize_list(value) if item)
    return _clean_text(value)


def _looks_like_name(line: str) -> bool:
    if not line or any(token in line for token in ("@", "http", "www.")):
        return False
    if re.search(r"\d", line):
        return False
    words = [word for word in re.split(r"\s+", line.strip()) if word]
    if not 2 <= len(words) <= 4:
        return False
    return all(re.fullmatch(r"[A-Z][A-Za-z'`.-]+", word) for word in words)


def _normalize_resume_heading(line: str) -> str:
    normalized = re.sub(r"[:\s]+$", "", line.strip()).lower()
    normalized = re.sub(r"[^a-z\s]", "", normalized)
    return re.sub(r"\s+", " ", normalized).strip()


def _extract_resume_sections(text: str) -> dict[str, list[str]]:
    sections = {key: [] for key in PROFILE_SECTION_ALIASES}
    current_section: str | None = None

    for raw_line in (text or "").splitlines():
        line = raw_line.strip()
        if not line:
            continue

        normalized = _normalize_resume_heading(line)
        matched_section = next(
            (key for key, aliases in PROFILE_SECTION_ALIASES.items() if normalized in aliases),
            None,
        )
        if matched_section:
            current_section = matched_section
            continue

        if current_section:
            sections[current_section].append(line)

    return sections


def _guess_resume_contact(text: str) -> dict[str, str]:
    email = ""
    email_match = EMAIL_PATTERN.search(text or "")
    if email_match:
        email = email_match.group(0)

    phone = ""
    phone_match = PHONE_PATTERN.search(text or "")
    if phone_match:
        phone = re.sub(r"\s{2,}", " ", phone_match.group(0)).strip()

    linkedin = ""
    linkedin_match = LINKEDIN_PATTERN.search(text or "")
    if linkedin_match:
        linkedin = linkedin_match.group(0)

    portfolio = ""
    for match in URL_PATTERN.findall(text or ""):
        if "linkedin.com" in match.lower():
            continue
        portfolio = match
        break

    return {
        "email": email,
        "phone": phone,
        "linkedinUrl": linkedin,
        "portfolioUrl": portfolio,
    }


def _guess_identity(lines: list[str]) -> dict[str, str]:
    name = ""
    headline = ""
    location = ""

    for line in lines[:8]:
        if not name and _looks_like_name(line):
            name = line
            continue

        if not headline and len(line) <= 120 and "@" not in line and "http" not in line and not re.search(r"\d{5,}", line):
            headline = line
            continue

        if not location and "," in line and "@" not in line and "http" not in line:
            location = line

    return {
        "fullName": name,
        "headline": headline,
        "location": location,
    }


def _pick_achievement_lines(lines: list[str]) -> list[str]:
    scored = []
    for line in lines:
        score = 0
        if re.search(r"\d", line):
            score += 2
        if line.lstrip().startswith(("-", "•", "*")):
            score += 1
        if len(line.split()) >= 5:
            score += 1
        scored.append((score, line.strip("•*- ")))

    return [line for score, line in sorted(scored, key=lambda item: item[0], reverse=True) if line][:6]


def _build_resume_profile_fallback(resume_text: str) -> dict:
    lines = [line.strip() for line in resume_text.splitlines() if line.strip()]
    sections = _extract_resume_sections(resume_text)
    contact = _guess_resume_contact(resume_text)
    identity = _guess_identity(lines)
    summary = "\n".join(sections["summary"][:4])
    skills = "\n".join(normalize_list(sections["skills"])[:18])
    achievements = "\n".join(_pick_achievement_lines(sections["achievements"] or sections["experience"]))

    target_roles = identity["headline"]
    if not target_roles and sections["experience"]:
        target_roles = sections["experience"][0]

    return {
        "fullName": identity["fullName"],
        "headline": identity["headline"],
        "email": contact["email"],
        "phone": contact["phone"],
        "location": identity["location"],
        "portfolioUrl": contact["portfolioUrl"],
        "linkedinUrl": contact["linkedinUrl"],
        "summary": summary,
        "targetRoles": target_roles,
        "skills": skills,
        "achievements": achievements,
        "experience": "\n".join(sections["experience"][:18]),
        "education": "\n".join(sections["education"][:10]),
        "certifications": "\n".join(sections["certifications"][:10]),
        "projects": "\n".join(sections["projects"][:12]),
        "strengths": "",
        "preferences": "",
        "additionalContext": "",
    }


def _resume_extraction_prompt() -> str:
    return """
Extract a structured candidate profile from resume text.

Return strict JSON only with these keys:
{
  "fullName": "string",
  "headline": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "portfolioUrl": "string",
  "linkedinUrl": "string",
  "summary": "string",
  "targetRoles": ["string"],
  "skills": ["string"],
  "achievements": ["string"],
  "experience": ["string"],
  "education": ["string"],
  "certifications": ["string"],
  "projects": ["string"],
  "preferences": ["string"],
  "additionalContext": "string"
}

Rules:
- Do not invent facts.
- If a field is missing, return an empty string or empty array.
- Keep resume bullets short and clean.
- Use only information grounded in the resume text.
""".strip()


def _merge_profile_data(base: dict, candidate: dict) -> dict:
    merged = dict(base)
    for key, base_value in base.items():
        candidate_value = candidate.get(key)
        normalized_candidate = _normalize_profile_text(candidate_value)
        if normalized_candidate:
            merged[key] = normalized_candidate
        elif not merged.get(key):
            merged[key] = base_value
    return merged


def extract_resume_profile(resume_text: str) -> dict:
    fallback = _build_resume_profile_fallback(resume_text)
    api_key = getattr(settings, "OPENAI_API_KEY", "")
    if not api_key:
        return fallback

    try:
        extracted = _call_openai_json(
            _resume_extraction_prompt(),
            {
                "resume_text": resume_text,
                "fallback_profile": fallback,
            },
            temperature=0.1,
        )
    except ProcurementAIError:
        return fallback

    normalized = {
        "fullName": _normalize_profile_text(extracted.get("fullName")),
        "headline": _normalize_profile_text(extracted.get("headline")),
        "email": _normalize_profile_text(extracted.get("email")),
        "phone": _normalize_profile_text(extracted.get("phone")),
        "location": _normalize_profile_text(extracted.get("location")),
        "portfolioUrl": _normalize_profile_text(extracted.get("portfolioUrl")),
        "linkedinUrl": _normalize_profile_text(extracted.get("linkedinUrl")),
        "summary": _normalize_profile_text(extracted.get("summary")),
        "targetRoles": _normalize_profile_text(extracted.get("targetRoles")),
        "skills": _normalize_profile_text(extracted.get("skills")),
        "achievements": _normalize_profile_text(extracted.get("achievements")),
        "experience": _normalize_profile_text(extracted.get("experience")),
        "education": _normalize_profile_text(extracted.get("education")),
        "certifications": _normalize_profile_text(extracted.get("certifications")),
        "projects": _normalize_profile_text(extracted.get("projects")),
        "strengths": "",
        "preferences": _normalize_profile_text(extracted.get("preferences")),
        "additionalContext": _normalize_profile_text(extracted.get("additionalContext")),
    }
    return _merge_profile_data(fallback, normalized)


def _extract_json_object(content: str) -> dict:
    cleaned = str(content or "").strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()

    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
    if not match:
        raise ProcurementAIResponseError("AI response was not valid JSON.")

    try:
        parsed = json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        raise ProcurementAIResponseError("AI response JSON could not be parsed.") from exc

    if not isinstance(parsed, dict):
        raise ProcurementAIResponseError("AI response JSON must be an object.")
    return parsed


def _perform_chat_completion(payload: dict, api_key: str) -> dict:
    body = json.dumps(payload).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    req = request.Request(OPENAI_API_URL, data=body, headers=headers, method="POST")
    with request.urlopen(req, timeout=90) as response:
        return json.loads(response.read().decode("utf-8"))


def _chat_completion(messages: list[dict], temperature: float = 0.4) -> dict:
    api_key = getattr(settings, "OPENAI_API_KEY", "")
    model = getattr(settings, "OPENAI_MODEL", DEFAULT_MODEL)
    if not api_key:
        raise ProcurementAIConfigurationError("OPENAI_API_KEY is not configured.")

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "response_format": {"type": "json_object"},
    }
    try:
        return _perform_chat_completion(payload, api_key)
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        if exc.code == 400 and "response_format" in detail:
            try:
                fallback_payload = dict(payload)
                fallback_payload.pop("response_format", None)
                return _perform_chat_completion(fallback_payload, api_key)
            except error.HTTPError as fallback_exc:
                detail = fallback_exc.read().decode("utf-8", errors="ignore")
                raise ProcurementAIError(detail or f"OpenAI request failed with status {fallback_exc.code}.") from fallback_exc
        raise ProcurementAIError(detail or f"OpenAI request failed with status {exc.code}.") from exc
    except error.URLError as exc:
        raise ProcurementAIError("OpenAI request failed to connect.") from exc


def _call_openai_json(system_prompt: str, payload: dict, temperature: float = 0.4) -> dict:
    response = _chat_completion(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(payload, indent=2)},
        ],
        temperature=temperature,
    )
    try:
        content = response["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise ProcurementAIResponseError("OpenAI response was missing message content.") from exc

    if isinstance(content, list):
        content = "\n".join(
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in content
        )

    return _extract_json_object(str(content))


def _paragraphs_to_html(paragraphs: list[str]) -> str:
    safe_paragraphs = [f"<p>{escape(paragraph)}</p>" for paragraph in paragraphs if paragraph]
    return "".join(safe_paragraphs)


def _bullets_to_html(items: list[str]) -> str:
    if not items:
        return ""
    safe_items = "".join(f"<li>{escape(item)}</li>" for item in items if item)
    return f"<ul>{safe_items}</ul>" if safe_items else ""


def _contact_line(profile: dict) -> list[str]:
    contact_parts = [
        profile.get("full_name", ""),
        profile.get("headline", ""),
        profile.get("email", ""),
        profile.get("phone", ""),
        profile.get("location", ""),
    ]
    if profile.get("linkedin_url"):
        contact_parts.append(profile["linkedin_url"])
    if profile.get("portfolio_url"):
        contact_parts.append(profile["portfolio_url"])
    return [part for part in contact_parts if part]


def _clean_text(value: object) -> str:
    return str(value or "").strip()


def _first_non_empty(*values: object) -> str:
    for value in values:
        cleaned = _clean_text(value)
        if cleaned:
            return cleaned
    return ""


def _normalize_experience_items(value: object) -> list[dict]:
    if not isinstance(value, list):
        return []

    normalized: list[dict] = []
    for item in value[:6]:
        if isinstance(item, dict):
            normalized_item = {
                "role": _clean_text(item.get("role")),
                "company": _clean_text(item.get("company")),
                "duration": _clean_text(item.get("duration")),
                "bullets": normalize_list(item.get("bullets", []))[:5],
            }
        else:
            normalized_item = {
                "role": "",
                "company": "",
                "duration": "",
                "bullets": normalize_list(item)[:3],
            }

        if (
            normalized_item["role"]
            or normalized_item["company"]
            or normalized_item["duration"]
            or normalized_item["bullets"]
        ):
            normalized.append(normalized_item)

    return normalized


def _normalize_generation_pair(content: dict, profile: dict) -> dict:
    resume = content.get("resume", {}) if isinstance(content.get("resume"), dict) else {}
    cover_letter = (
        content.get("cover_letter", {}) if isinstance(content.get("cover_letter"), dict) else {}
    )

    summary = _clean_text(resume.get("summary"))
    if not summary:
        summary = _clean_text(profile.get("summary"))

    normalized_resume = {
        "summary": summary,
        "skills": normalize_list(resume.get("skills", []))[:12],
        "experience": _normalize_experience_items(resume.get("experience", [])),
        "projects": normalize_list(resume.get("projects", []))[:8],
        "education": normalize_list(resume.get("education", []))[:6],
    }
    normalized_cover_letter = {
        "opening": _clean_text(cover_letter.get("opening")),
        "body": normalize_list(cover_letter.get("body", []))[:4],
        "closing": _clean_text(cover_letter.get("closing")),
    }

    return {
        "resume": normalized_resume,
        "cover_letter": normalized_cover_letter,
    }


def _collect_target_keywords(job_description: str, content: dict) -> list[str]:
    job_keywords = extract_keywords(job_description, limit=18)
    combined_sections = [
        content["resume"].get("summary", ""),
        " ".join(content["resume"].get("skills", [])),
        " ".join(content["resume"].get("projects", [])),
        " ".join(content["resume"].get("education", [])),
        content["cover_letter"].get("opening", ""),
        " ".join(content["cover_letter"].get("body", [])),
        content["cover_letter"].get("closing", ""),
    ]
    for item in content["resume"].get("experience", []):
        combined_sections.extend(
            [
                item.get("role", ""),
                item.get("company", ""),
                item.get("duration", ""),
                " ".join(item.get("bullets", [])),
            ]
        )

    combined_text = " ".join(section for section in combined_sections if section).lower()
    targeted = [keyword for keyword in job_keywords if keyword.lower() in combined_text]
    return targeted[:12]


def build_cover_letter_html(content: dict, profile: dict) -> str:
    opening = _clean_text(content.get("opening"))
    body_paragraphs = normalize_list(content.get("body", []))
    closing = _clean_text(content.get("closing"))

    blocks = []
    if opening:
        blocks.append(f"<p>{escape(opening)}</p>")
    blocks.append(_paragraphs_to_html(body_paragraphs))
    if closing:
        blocks.append(f"<p>{escape(closing)}</p>")
    if profile.get("full_name"):
        blocks.append(f"<p>{escape(profile['full_name'])}</p>")

    return "".join(part for part in blocks if part)


def build_resume_html(content: dict, profile: dict) -> str:
    summary = _clean_text(content.get("summary"))
    skills = normalize_list(content.get("skills", []))
    experience = _normalize_experience_items(content.get("experience", []))
    projects = normalize_list(content.get("projects", []))
    education = normalize_list(content.get("education", []))

    sections: list[str] = []
    contact_line = " | ".join(escape(part) for part in _contact_line(profile))
    if profile.get("full_name"):
        sections.append(f"<p><strong>{escape(profile['full_name'])}</strong></p>")
    if contact_line:
        sections.append(f"<p>{contact_line}</p>")
    if summary:
        sections.append("<h2>Professional Summary</h2>")
        sections.append(f"<p>{escape(summary)}</p>")
    if skills:
        sections.append("<h2>Core Skills</h2>")
        sections.append(_bullets_to_html(skills))
    if experience:
        sections.append("<h2>Professional Experience</h2>")
        for item in experience:
            heading_bits = [bit for bit in [item.get("role"), item.get("company")] if bit]
            if heading_bits:
                sections.append(f"<h3>{escape(' | '.join(heading_bits))}</h3>")
            if item.get("duration"):
                sections.append(f"<p><em>{escape(item['duration'])}</em></p>")
            sections.append(_bullets_to_html(item.get("bullets", [])))
    if projects:
        sections.append("<h2>Projects</h2>")
        sections.append(_bullets_to_html(projects))
    if education:
        sections.append("<h2>Education</h2>")
        sections.append(_bullets_to_html(education))

    return "".join(section for section in sections if section)


def _build_generation_prompt() -> str:
    return """
You are an expert ATS resume and cover letter generator.

You MUST generate BOTH:
1. Resume
2. Cover Letter

The output must be CLEAN, STRUCTURED, CONSISTENT, and READY FOR TEMPLATE RENDERING.

========================
OUTPUT FORMAT (STRICT JSON ONLY)
========================

{
  "resume": {
    "summary": "string",
    "skills": ["string"],
    "experience": [
      {
        "role": "string",
        "company": "string",
        "duration": "string",
        "bullets": ["string"]
      }
    ],
    "projects": ["string"],
    "education": ["string"]
  },
  "cover_letter": {
    "opening": "string",
    "body": ["string"],
    "closing": "string"
  }
}

========================
STRICT RULES
========================

GENERAL:
- DO NOT output text outside JSON
- DO NOT include explanations
- DO NOT include markdown
- KEEP output clean and structured

RESUME RULES:
- Summary: 3-4 lines max
- Skills: relevant to job description only
- Experience bullets MUST follow ACTION + TASK + IMPACT
- Focus on IT support, Azure or cloud, Linux, networking, and troubleshooting when relevant to the profile and job
- Use numbers where possible, including realistic estimates when the profile implies them
- Do not use generic words such as hardworking, team player, or responsible for
- Each bullet must be strong, short, and impactful

COVER LETTER RULES:
- Opening must mention the role and company
- Body must explain fit using real skills from the profile and resume context
- Closing must be short and confident

CONSISTENCY RULES:
- Skills in resume MUST appear in cover letter when relevant
- Use the same professional tone across both documents
- No contradictions between resume and cover letter

ATS OPTIMIZATION:
- Extract keywords from the job description
- Naturally include those keywords in skills, experience bullets, and cover letter body

FORMAT QUALITY:
- No long paragraphs
- No repetition
- No unnecessary words
- Clean and professional tone

Only use facts grounded in the candidate profile and provided resume context.
""".strip()


def generate_application_documents(
    *,
    profile: dict,
    job_description: str,
    resume_text: str,
    company_name: str,
    target_role: str,
    template_name: str = "balanced",
    template_config: dict | None = None,
) -> dict:
    normalized_profile = format_profile_for_prompt(profile)
    normalized_template_config = normalize_document_template_config(template_config, template_name or "balanced")
    payload = {
        "PROFILE_JSON": {
            **normalized_profile,
            "resume_context": strip_html(resume_text),
            "company_name": company_name,
            "target_role": target_role,
        },
        "JOB_DESCRIPTION": job_description,
    }
    response = _call_openai_json(_build_generation_prompt(), payload, temperature=0.35)
    structured = _normalize_generation_pair(response, normalized_profile)
    keywords_targeted = _collect_target_keywords(job_description, structured)
    highlight_skills = structured["resume"].get("skills", [])[:6]

    role_label = _first_non_empty(target_role, "Resume")
    company_label = _first_non_empty(company_name, "Application")
    name_label = _first_non_empty(normalized_profile.get("full_name"), "Candidate")

    return {
        "resume": {
            "title": f"{name_label} Resume - {role_label}" if role_label else f"{name_label} Resume",
            "content": build_resume_html(structured["resume"], normalized_profile),
            "doc_type": "resume",
            "template_name": template_name or "balanced",
            "template_config": normalized_template_config,
            "keywords_targeted": keywords_targeted,
        },
        "cover_letter": {
            "title": f"{company_label} Cover Letter",
            "content": build_cover_letter_html(structured["cover_letter"], normalized_profile),
            "doc_type": "cover_letter",
            "template_name": "executive",
            "template_config": {},
            "highlights": highlight_skills,
            "keywords_targeted": keywords_targeted,
        },
        "structured": structured,
    }


def generate_cover_letter(*, profile: dict, job_description: str, resume_text: str, tone: str, company_name: str) -> dict:
    del tone
    return generate_application_documents(
        profile=profile,
        job_description=job_description,
        resume_text=resume_text,
        company_name=company_name,
        target_role="",
        template_name="balanced",
        template_config=None,
    )["cover_letter"]


def generate_resume(
    *,
    profile: dict,
    job_description: str,
    resume_text: str,
    tone: str,
    target_role: str,
    template_name: str = "balanced",
    template_config: dict | None = None,
) -> dict:
    del tone
    return generate_application_documents(
        profile=profile,
        job_description=job_description,
        resume_text=resume_text,
        company_name="",
        target_role=target_role,
        template_name=template_name,
        template_config=template_config,
    )["resume"]


def _normalize_keyword(token: str) -> str:
    return token.strip().lower()


def extract_keywords(text: str, limit: int = 18) -> list[str]:
    counts: Counter[str] = Counter()
    for raw in re.findall(r"[A-Za-z][A-Za-z0-9+#.-]{1,}", text or ""):
        token = _normalize_keyword(raw)
        if token in STOPWORDS:
            continue
        if len(token) < 4 and token not in ALLOWED_TEXT_KEYWORDS:
            continue
        counts[token] += 1
    return [keyword for keyword, _ in counts.most_common(limit)]


def ats_review(*, job_description: str, resume_content: str) -> dict:
    resume_text = strip_html(resume_content)
    job_keywords = extract_keywords(job_description, limit=20)
    resume_tokens = set(extract_keywords(resume_text, limit=120))
    matched_keywords = [keyword for keyword in job_keywords if keyword in resume_tokens]
    missing_keywords = [keyword for keyword in job_keywords if keyword not in resume_tokens][:8]

    keyword_score = round((len(matched_keywords) / max(len(job_keywords), 1)) * 100)

    resume_text_lower = resume_text.lower()
    present_sections = [name for name, pattern in SECTION_PATTERNS.items() if re.search(pattern, resume_text_lower)]
    section_score = round((len(present_sections) / len(SECTION_PATTERNS)) * 100)

    contact_score = 100 if re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", resume_text, re.IGNORECASE) else 40
    overall_score = round(keyword_score * 0.65 + section_score * 0.25 + contact_score * 0.10)

    recommendations: list[str] = []
    if missing_keywords:
        recommendations.append("Add stronger coverage for the missing job keywords in your summary or experience bullets.")
    if section_score < 100:
        missing_sections = [name.title() for name in SECTION_PATTERNS if name not in present_sections]
        recommendations.append(f"Add explicit section headings for: {', '.join(missing_sections)}.")
    if contact_score < 100:
        recommendations.append("Include a visible professional email address in the resume header.")
    if overall_score >= 85:
        recommendations.append("The resume is already in strong ATS shape. Focus next on phrasing and quantified impact.")

    return {
        "overall_score": overall_score,
        "keyword_score": keyword_score,
        "section_score": section_score,
        "matched_keywords": matched_keywords,
        "missing_keywords": missing_keywords,
        "detected_sections": present_sections,
        "recommendations": recommendations,
        "summary": (
            f"Matched {len(matched_keywords)} of the top {len(job_keywords)} job keywords and "
            f"detected {len(present_sections)} key resume sections."
        ),
    }
