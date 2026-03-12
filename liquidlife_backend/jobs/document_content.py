from __future__ import annotations

from html import escape
from pathlib import Path

import mammoth
from django.db.models import Model
from pypdf import PdfReader


def plain_text_to_html(text: str) -> str:
    normalized = (text or "").replace("\r\n", "\n").replace("\r", "\n").strip()
    if not normalized:
        return ""

    paragraphs = []
    for block in normalized.split("\n\n"):
        lines = [escape(line.strip()) for line in block.split("\n") if line.strip()]
        if not lines:
            continue
        paragraphs.append(f"<p>{'<br>'.join(lines)}</p>")

    return "".join(paragraphs)


def extract_document_content(file_obj) -> str:
    if not file_obj or not getattr(file_obj, "name", ""):
        return ""

    extension = Path(file_obj.name).suffix.lower()
    if hasattr(file_obj, "open"):
        file_obj.open("rb")
    file_obj.seek(0)

    try:
        if extension == ".txt":
            raw = file_obj.read()
            if isinstance(raw, bytes):
                text = raw.decode("utf-8", errors="replace")
            else:
                text = str(raw)
            return plain_text_to_html(text)

        if extension == ".docx":
            result = mammoth.convert_to_html(file_obj)
            return result.value.strip()

        if extension == ".pdf":
            reader = PdfReader(file_obj)
            page_text = []
            for page in reader.pages:
                extracted = (page.extract_text() or "").strip()
                if extracted:
                    page_text.append(extracted)
            return plain_text_to_html("\n\n".join(page_text))

        return ""
    finally:
        file_obj.seek(0)


def ensure_document_content(document: Model) -> None:
    if getattr(document, "content", "").strip() or not getattr(document, "file", None):
        return

    extracted = extract_document_content(document.file)
    if not extracted:
        return

    document.content = extracted
    document.save(update_fields=["content", "updated_at"])
