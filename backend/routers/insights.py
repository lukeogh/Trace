"""
Insights - read-only aggregates for the Insights page.

A single GET /api/insights returns everything the page needs in one round-trip:
  - most active / quietest area over a lookback window ("momentum")
  - the next upcoming meeting + a short list of recent calendar entries

Design notes
------------
Everything is computed live from existing tables (areas, threads, entries).
No new storage, no schema migration. The page is a pure pull surface.

"Activity" for momentum = entries created within the lookback window, attributed
to an area via its threads. We rank on entry_count, tie-breaking on the most
recent activity timestamp.

The quietest card is intentionally suppressed when there are fewer than
MIN_AREAS_FOR_RANKING areas - with two or three plates a "least active" callout
is noise, not insight. The frontend also guards on area_count, but enforcing it
here keeps the contract honest for any future consumer.

This module is the natural home for future integration insights (assigned Jira
issues, PR review requests, unread priority mail). Add sibling helpers + fields
on InsightsOut rather than reshaping the existing ones.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

import models
import schemas
from database import get_db

router = APIRouter(tags=["insights"])

# Below this many areas, the "quietest area" ranking is suppressed - it only
# becomes useful once you're juggling several plates.
MIN_AREAS_FOR_RANKING = 4


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _days_since(when: datetime | None, now: datetime) -> int | None:
    if when is None:
        return None
    # Stored timestamps are naive UTC (server_default=func.now()); compare on
    # naive UTC to avoid tz-aware/naive subtraction errors.
    ref = now.replace(tzinfo=None)
    delta = ref - when
    return max(0, delta.days)


def _momentum(db: Session, lookback_days: int):
    """Return (most_active, quietest) MomentumArea or (None, None).

    most_active: highest entry_count in the window (tie → most recent activity).
    quietest:    lowest entry_count (tie → longest since last activity), only
                 returned when there are enough areas to rank.
    """
    now = _utcnow()
    window_start = now.replace(tzinfo=None) - timedelta(days=lookback_days)

    areas = db.query(models.Area).all()
    if not areas:
        return None, None, 0

    # entry_count per area within the window, via thread join.
    counts = dict(
        db.query(models.Area.id, func.count(models.Entry.id))
        .select_from(models.Area)
        .outerjoin(models.Thread, models.Thread.area_id == models.Area.id)
        .outerjoin(
            models.Entry,
            (models.Entry.thread_id == models.Thread.id)
            & (models.Entry.created_at >= window_start),
        )
        .group_by(models.Area.id)
        .all()
    )

    # last activity per area = max(entry.created_at) across its threads, all-time.
    last_rows = (
        db.query(models.Area.id, func.max(models.Entry.created_at))
        .select_from(models.Area)
        .outerjoin(models.Thread, models.Thread.area_id == models.Area.id)
        .outerjoin(models.Entry, models.Entry.thread_id == models.Thread.id)
        .group_by(models.Area.id)
        .all()
    )
    last_activity = {aid: ts for aid, ts in last_rows}

    def to_schema(area: models.Area) -> schemas.MomentumArea:
        ts = last_activity.get(area.id)
        return schemas.MomentumArea(
            area_id=area.id,
            area_name=area.name,
            icon=area.icon,
            status=area.status,
            entry_count=int(counts.get(area.id, 0) or 0),
            last_activity_at=ts,
            days_since_activity=_days_since(ts, now),
        )

    enriched = [to_schema(a) for a in areas]

    # Most active: max count, tie-break on most recent activity.
    most_active = max(
        enriched,
        key=lambda m: (
            m.entry_count,
            m.last_activity_at or datetime.min,
        ),
    )

    quietest = None
    if len(enriched) >= MIN_AREAS_FOR_RANKING:
        # Lowest count, tie-break on longest-stale (oldest last_activity first).
        quietest = min(
            enriched,
            key=lambda m: (
                m.entry_count,
                m.last_activity_at or datetime.min,
            ),
        )
        # If most_active and quietest resolve to the same area (can happen with
        # all-zero counts), drop quietest - there's no contrast to show.
        if quietest.area_id == most_active.area_id:
            quietest = None

    return most_active, quietest, len(enriched)


def _calendar(db: Session):
    """Return (next_meeting, recent_meetings).

    next_meeting:    earliest meeting with meeting_at in the future.
    recent_meetings: up to 5 meetings nearest to now (just-past + upcoming),
                     ordered chronologically, for the "latest calendar entries"
                     list.
    """
    now_naive = _utcnow().replace(tzinfo=None)

    def to_schema(entry, thread, area) -> schemas.CalendarEntryOut:
        return schemas.CalendarEntryOut(
            id=entry.id,
            thread_id=thread.id,
            thread_title=thread.title,
            area_id=area.id,
            area_name=area.name,
            content=entry.content,
            meeting_at=entry.meeting_at,
        )

    base = (
        db.query(models.Entry, models.Thread, models.Area)
        .join(models.Thread, models.Entry.thread_id == models.Thread.id)
        .join(models.Area, models.Thread.area_id == models.Area.id)
        .filter(
            models.Entry.type == "meeting",
            models.Entry.meeting_at.isnot(None),
        )
    )

    next_row = (
        base.filter(models.Entry.meeting_at >= now_naive)
        .order_by(models.Entry.meeting_at.asc())
        .first()
    )
    next_meeting = to_schema(*next_row) if next_row else None

    # Recent list: the 5 meetings closest to now in either direction, then
    # sorted chronologically for display.
    recent_rows = (
        base.order_by(
            func.abs(
                func.julianday(models.Entry.meeting_at) - func.julianday(now_naive)
            ).asc()
        )
        .limit(5)
        .all()
    )
    recent = sorted(
        (to_schema(*r) for r in recent_rows),
        key=lambda c: c.meeting_at,
    )

    return next_meeting, recent


@router.get("/insights", response_model=schemas.InsightsOut)
def get_insights(
    lookback_days: int = Query(default=7, ge=1, le=90),
    db: Session = Depends(get_db),
):
    most_active, quietest, area_count = _momentum(db, lookback_days)
    next_meeting, recent_meetings = _calendar(db)
    return schemas.InsightsOut(
        most_active=most_active,
        quietest=quietest,
        next_meeting=next_meeting,
        recent_meetings=recent_meetings,
        area_count=area_count,
        lookback_days=lookback_days,
    )
