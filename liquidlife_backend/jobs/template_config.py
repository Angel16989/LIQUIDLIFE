import json


DEFAULT_RESUME_SECTION_CONFIGS = {
    "balanced": {
        "summaryStyle": "spotlight",
        "experienceStyle": "cards",
        "skillsStyle": "chips",
        "projectsStyle": "tiles",
        "educationStyle": "cards",
    },
    "executive": {
        "summaryStyle": "split",
        "experienceStyle": "timeline",
        "skillsStyle": "list",
        "projectsStyle": "highlights",
        "educationStyle": "timeline",
    },
    "minimal": {
        "summaryStyle": "compact",
        "experienceStyle": "compact",
        "skillsStyle": "grid",
        "projectsStyle": "list",
        "educationStyle": "list",
    },
}

ALLOWED_SUMMARY_STYLES = {"spotlight", "split", "compact"}
ALLOWED_EXPERIENCE_STYLES = {"cards", "timeline", "compact"}
ALLOWED_SKILLS_STYLES = {"chips", "grid", "list"}
ALLOWED_PROJECTS_STYLES = {"tiles", "highlights", "list"}
ALLOWED_EDUCATION_STYLES = {"cards", "timeline", "list"}


def normalize_document_template_config(value, template_name: str = "balanced") -> dict:
    defaults = DEFAULT_RESUME_SECTION_CONFIGS.get(template_name, DEFAULT_RESUME_SECTION_CONFIGS["balanced"]).copy()
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return defaults
    if not isinstance(value, dict):
        return defaults

    summary_style = value.get("summaryStyle")
    if summary_style in ALLOWED_SUMMARY_STYLES:
        defaults["summaryStyle"] = summary_style

    experience_style = value.get("experienceStyle")
    if experience_style in ALLOWED_EXPERIENCE_STYLES:
        defaults["experienceStyle"] = experience_style

    skills_style = value.get("skillsStyle")
    if skills_style in ALLOWED_SKILLS_STYLES:
        defaults["skillsStyle"] = skills_style

    projects_style = value.get("projectsStyle")
    if projects_style in ALLOWED_PROJECTS_STYLES:
        defaults["projectsStyle"] = projects_style

    education_style = value.get("educationStyle")
    if education_style in ALLOWED_EDUCATION_STYLES:
        defaults["educationStyle"] = education_style

    return defaults
