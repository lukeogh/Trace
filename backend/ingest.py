"""
File ingest helpers — parse dropped files into plain text suitable for
Auto Generate's LLM pipeline. Each parser is best-effort: malformed input
falls back to a best-attempt decode rather than raising.
"""

from __future__ import annotations
import io
import re
from email import policy
from email.parser import BytesParser
from datetime import datetime


# ─── Format detection ─────────────────────────────────────────────────────────

EML_EXTENSIONS = (".eml",)
ICS_EXTENSIONS = (".ics", ".ical")
PDF_EXTENSIONS = (".pdf",)
TEXT_EXTENSIONS = (".txt", ".md", ".markdown", ".log", ".csv")


def detect_kind(filename: str, content: bytes) -> str:
    """Return one of: 'eml', 'ics', 'pdf', 'text'. Falls back to 'text'."""
    name = (filename or "").lower()

    if name.endswith(PDF_EXTENSIONS) or content[:4] == b"%PDF":
        return "pdf"
    if name.endswith(ICS_EXTENSIONS) or content[:15].lstrip().startswith(b"BEGIN:VCALENDAR"):
        return "ics"
    if name.endswith(EML_EXTENSIONS):
        return "eml"
    # Heuristic: looks like an email header block at the top
    head = content[:500].decode("utf-8", errors="ignore")
    if re.search(r"^(From|To|Subject|Date):\s", head, re.MULTILINE):
        return "eml"
    return "text"


# ─── Parsers ──────────────────────────────────────────────────────────────────

def _parse_text(content: bytes) -> str:
    # Try UTF-8 then fall back to latin-1 (always succeeds)
    for enc in ("utf-8", "utf-16", "latin-1"):
        try:
            return content.decode(enc).strip()
        except UnicodeDecodeError:
            continue
    return content.decode("latin-1", errors="ignore").strip()


def _parse_eml(content: bytes) -> str:
    msg = BytesParser(policy=policy.default).parsebytes(content)

    headers = []
    for key in ("From", "To", "Cc", "Subject", "Date"):
        val = msg.get(key)
        if val:
            headers.append(f"{key}: {val}")

    body_parts = []
    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            disposition = str(part.get("Content-Disposition") or "")
            if "attachment" in disposition.lower():
                continue
            if ctype == "text/plain":
                try:
                    body_parts.append(part.get_content().strip())
                except Exception:
                    pass
        if not body_parts:
            # No plaintext part — strip tags from the first html part as a fallback
            for part in msg.walk():
                if part.get_content_type() == "text/html":
                    try:
                        html = part.get_content()
                        body_parts.append(_strip_html(html))
                        break
                    except Exception:
                        pass
    else:
        try:
            body_parts.append(msg.get_content().strip())
        except Exception:
            body_parts.append(_parse_text(content))

    return "\n".join(headers) + "\n\n" + "\n\n".join(body_parts).strip()


def _strip_html(html: str) -> str:
    # Lightweight: drop tags + collapse whitespace. Not bulletproof but
    # the LLM tolerates noise well enough.
    text = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</p>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _parse_ics(content: bytes) -> str:
    try:
        from icalendar import Calendar
        cal = Calendar.from_ical(content)
    except Exception:
        # If icalendar can't parse it, fall back to raw text
        return _parse_text(content)

    blocks = []
    for component in cal.walk():
        if component.name != "VEVENT":
            continue
        summary  = str(component.get("summary") or "Untitled meeting")
        dtstart  = component.get("dtstart")
        dtend    = component.get("dtend")
        location = component.get("location")
        organizer = component.get("organizer")
        attendees = component.get("attendee", [])
        if not isinstance(attendees, list):
            attendees = [attendees]
        description = component.get("description")

        lines = [f"Meeting: {summary}"]
        if dtstart:
            lines.append(f"Start: {_fmt_dt(dtstart.dt)}")
        if dtend:
            lines.append(f"End: {_fmt_dt(dtend.dt)}")
        if location:
            lines.append(f"Location: {location}")
        if organizer:
            lines.append(f"Organizer: {_clean_mailto(str(organizer))}")
        if attendees:
            cleaned = [_clean_mailto(str(a)) for a in attendees]
            lines.append("Attendees: " + ", ".join(cleaned))
        if description:
            lines.append("")
            lines.append("Agenda / Description:")
            lines.append(str(description).strip())

        blocks.append("\n".join(lines))

    if not blocks:
        return _parse_text(content)
    return "\n\n---\n\n".join(blocks)


def _fmt_dt(dt) -> str:
    if isinstance(dt, datetime):
        return dt.strftime("%Y-%m-%d %H:%M %Z").strip()
    return str(dt)


def _clean_mailto(value: str) -> str:
    if value.lower().startswith("mailto:"):
        return value[7:]
    return value


def _parse_pdf(content: bytes) -> str:
    try:
        from pypdf import PdfReader
    except Exception:
        return _parse_text(content)

    try:
        reader = PdfReader(io.BytesIO(content))
        pages = []
        for i, page in enumerate(reader.pages):
            try:
                text = page.extract_text() or ""
            except Exception:
                text = ""
            if text.strip():
                pages.append(f"[Page {i+1}]\n{text.strip()}")
        if not pages:
            return ""
        return "\n\n".join(pages)
    except Exception:
        return ""


# ─── Public entry point ───────────────────────────────────────────────────────

def parse_file(filename: str, content: bytes) -> tuple[str, str]:
    """Return (extracted_text, kind). Kind is one of: eml | ics | pdf | text."""
    kind = detect_kind(filename, content)
    if kind == "eml":
        text = _parse_eml(content)
    elif kind == "ics":
        text = _parse_ics(content)
    elif kind == "pdf":
        text = _parse_pdf(content)
    else:
        text = _parse_text(content)

    # Guardrail: clamp to a reasonable size before handing to the LLM.
    MAX_CHARS = 60_000
    if len(text) > MAX_CHARS:
        text = text[:MAX_CHARS] + "\n\n[…truncated]"

    return text, kind
