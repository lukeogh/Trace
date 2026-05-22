"""
Lunchtime Overview refresher.

Runs daily at 12:00 Europe/Brussels. For every area that's NOT 'stable',
calls the same LLM summary logic as the Suggest button, then writes the
result directly to area.summary (audit-logged as a system update).

Skips areas marked 'stable' to avoid wasting tokens on quiet domains.
Skips silently if ANTHROPIC_API_KEY is missing or the call fails.
"""

from __future__ import annotations
import os
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

import models
from database import SessionLocal
from audit import log_audit

log = logging.getLogger("trace.scheduler")

_scheduler: BackgroundScheduler | None = None


def _gather_area_context(db, area: models.Area) -> str:
    """Mirror the context build in routers/areas.py's suggest endpoint."""
    threads = (
        db.query(models.Thread)
        .filter(models.Thread.area_id == area.id)
        .order_by(models.Thread.updated_at.desc())
        .limit(10)
        .all()
    )
    blocks = []
    for t in threads:
        recent_entries = (
            db.query(models.Entry)
            .filter(models.Entry.thread_id == t.id)
            .order_by(models.Entry.created_at.desc())
            .limit(3)
            .all()
        )
        entry_lines = "\n".join(
            f"  - [{e.type}] {e.content[:180]}" for e in recent_entries
        ) or "  (no entries)"
        blocks.append(f"Thread: {t.title} [{t.status}]\n{entry_lines}")
    return "\n\n".join(blocks) if blocks else "(no threads yet)"


def _refresh_area(db, area: models.Area, client) -> bool:
    """Regenerate area.summary via the LLM. Returns True on success."""
    context = _gather_area_context(db, area)

    system = (
        "You write concise status summaries for an area of someone's work.\n"
        "Output exactly 2 sentences. No preamble, no formatting, no bullet points.\n"
        "Sentence 1: the current state — what's happening right now, what's in motion.\n"
        "Sentence 2: what's next or blocking — risks, pending decisions, what to watch.\n"
        "Tone: direct, factual, suitable for a status board. Avoid filler like 'currently' or 'we are'."
    )
    user_msg = (
        f"Area: {area.name}\n"
        f"Current status: {area.status}\n"
        f"Existing summary: {area.summary or '(none)'}\n\n"
        f"Recent activity:\n{context}"
    )

    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=300,
            system=system,
            messages=[{"role": "user", "content": user_msg}],
        )
        text = message.content[0].text.strip()
    except Exception as e:
        log.warning("Failed to refresh area %s: %s", area.name, e)
        return False

    if not text or text == (area.summary or ""):
        return False

    prev = area.summary or ""
    area.summary = text
    area.updated_at = datetime.now(timezone.utc)
    log_audit(
        db, entity_type="area", entity_id=area.id, area_id=area.id,
        action="updated", field="summary",
        old_value=prev[:200], new_value=text[:200],
    )
    db.commit()
    log.info("Refreshed Overview for area %s", area.name)
    return True


def refresh_all_overviews():
    """Cron entry point — iterate non-stable areas and refresh."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        log.info("Skipping Overview refresh: ANTHROPIC_API_KEY not set.")
        return
    try:
        from anthropic import Anthropic
        client = Anthropic(api_key=api_key)
    except Exception as e:
        log.warning("Anthropic SDK unavailable: %s", e)
        return

    db = SessionLocal()
    refreshed = 0
    try:
        areas = (
            db.query(models.Area)
            .filter(models.Area.status != "stable")
            .order_by(models.Area.id)
            .all()
        )
        log.info("Lunchtime refresh: %d non-stable areas to consider", len(areas))
        for area in areas:
            if _refresh_area(db, area, client):
                refreshed += 1
    finally:
        db.close()
    log.info("Lunchtime refresh complete: %d areas updated", refreshed)


def start():
    """Start the lunchtime cron in the background. Idempotent."""
    global _scheduler
    if _scheduler is not None:
        return
    _scheduler = BackgroundScheduler(timezone="Europe/Brussels")
    _scheduler.add_job(
        refresh_all_overviews,
        CronTrigger(hour=12, minute=0, timezone="Europe/Brussels"),
        id="lunchtime-overview-refresh",
        replace_existing=True,
        misfire_grace_time=3600,  # 1 hour late is still OK
    )
    _scheduler.start()
    log.info("Lunchtime scheduler started: 12:00 Europe/Brussels daily.")


def shutdown():
    global _scheduler
    if _scheduler is None:
        return
    _scheduler.shutdown(wait=False)
    _scheduler = None
