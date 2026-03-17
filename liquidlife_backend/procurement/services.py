from __future__ import annotations

import json
import re
from collections import Counter
from html import escape, unescape
from urllib import error, request

from django.conf import settings

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


def build_cover_letter_html(content: dict, profile: dict) -> str:
    opening = str(content.get("opening", "")).strip()
    body_paragraphs = normalize_list(content.get("body_paragraphs", []))
    closing = str(content.get("closing", "")).strip()
    key_matches = normalize_list(content.get("key_matches", []))

    blocks = []
    if opening:
        blocks.append(f"<p>{escape(opening)}</p>")
    blocks.append(_paragraphs_to_html(body_paragraphs))
    if key_matches:
        blocks.append("<h2>Why I Match</h2>")
        blocks.append(_bullets_to_html(key_matches))
    if closing:
        blocks.append(f"<p>{escape(closing)}</p>")
    if profile.get("full_name"):
        blocks.append(f"<p>{escape(profile['full_name'])}</p>")

    return "".join(part for part in blocks if part)


def build_resume_html(content: dict, profile: dict) -> str:
    summary = str(content.get("summary", "")).strip()
    experience_highlights = normalize_list(content.get("experience_highlights", []))
    project_highlights = normalize_list(content.get("project_highlights", []))
    skills = normalize_list(content.get("core_skills", []))
    education = normalize_list(content.get("education", []))
    certifications = normalize_list(content.get("certifications", []))
    keywords = normalize_list(content.get("keywords_targeted", []))

    sections: list[str] = []
    contact_line = " | ".join(escape(part) for part in _contact_line(profile))
    if contact_line:
        sections.append(f"<p><strong>{contact_line}</strong></p>")
    if summary:
        sections.append("<h2>Professional Summary</h2>")
        sections.append(f"<p>{escape(summary)}</p>")
    if skills:
        sections.append("<h2>Core Skills</h2>")
        sections.append(_bullets_to_html(skills))
    if experience_highlights:
        sections.append("<h2>Experience Highlights</h2>")
        sections.append(_bullets_to_html(experience_highlights))
    if project_highlights:
        sections.append("<h2>Projects</h2>")
        sections.append(_bullets_to_html(project_highlights))
    if education:
        sections.append("<h2>Education</h2>")
        sections.append(_bullets_to_html(education))
    if certifications:
        sections.append("<h2>Certifications</h2>")
        sections.append(_bullets_to_html(certifications))
    if keywords:
        sections.append("<h2>Target Keywords</h2>")
        sections.append(_bullets_to_html(keywords))
    return "".join(section for section in sections if section)


def generate_cover_letter(*, profile: dict, job_description: str, resume_text: str, tone: str, company_name: str) -> dict:
    normalized_profile = format_profile_for_prompt(profile)
    payload = {
        "job_description": job_description,
        "resume_context": resume_text,
        "tone": tone or "professional",
        "company_name": company_name,
        "candidate_profile": normalized_profile,
    }
    system_prompt = (
        "You write tailored, concise cover letters for job applications. "
        "Return valid JSON only with keys: title, opening, body_paragraphs, closing, key_matches. "
        "body_paragraphs and key_matches must be arrays of strings. "
        "Use the candidate profile and resume context when tailoring to the job description."
    )
    response = _call_openai_json(system_prompt, payload, temperature=0.55)
    title = str(response.get("title", "")).strip() or "AI Tailored Cover Letter"
    html_content = build_cover_letter_html(response, normalized_profile)
    return {
        "title": title,
        "content": html_content,
        "doc_type": "cover_letter",
        "template_name": "executive",
        "highlights": normalize_list(response.get("key_matches", [])),
    }


def generate_resume(*, profile: dict, job_description: str, resume_text: str, tone: str, target_role: str) -> dict:
    normalized_profile = format_profile_for_prompt(profile)
    payload = {
        "job_description": job_description,
        "resume_context": resume_text,
        "tone": tone or "professional",
        "target_role": target_role,
        "candidate_profile": normalized_profile,
    }
    system_prompt = (
        "You tailor resumes for ATS alignment and human readability. "
        "Return valid JSON only with keys: title, summary, core_skills, experience_highlights, "
        "project_highlights, education, certifications, keywords_targeted. "
        "The array fields must be arrays of strings. Keep claims grounded in the candidate profile and resume context."
    )
    response = _call_openai_json(system_prompt, payload, temperature=0.45)
    title = str(response.get("title", "")).strip() or f"AI Tailored Resume{f' - {target_role}' if target_role else ''}"
    html_content = build_resume_html(response, normalized_profile)
    return {
        "title": title,
        "content": html_content,
        "doc_type": "resume",
        "template_name": "balanced",
        "keywords_targeted": normalize_list(response.get("keywords_targeted", [])),
    }


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
