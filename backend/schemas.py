from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date


# ── Attachments ──────────────────────────────────────────────────────────────

class AttachmentOut(BaseModel):
    id: int
    thread_id: int
    type: str
    name: str
    stored_name: Optional[str] = None
    original_name: Optional[str] = None
    url: Optional[str] = None
    size: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class LinkCreate(BaseModel):
    name: str
    url: str


# ── Entries ───────────────────────────────────────────────────────────────────

class EntryCreate(BaseModel):
    content: str
    type: str = 'entry'  # entry | todo | decision | meeting
    due_date: Optional[date] = None
    meeting_at: Optional[datetime] = None


class EntryUpdate(BaseModel):
    content: Optional[str] = None
    type: Optional[str] = None
    completed: Optional[bool] = None
    due_date: Optional[date] = None
    meeting_at: Optional[datetime] = None


class EntryOut(BaseModel):
    id: int
    thread_id: int
    content: str
    type: str
    completed: bool
    completed_at: Optional[datetime] = None
    due_date: Optional[date] = None
    meeting_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Threads ───────────────────────────────────────────────────────────────────

class ThreadCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    status: Optional[str] = "open"


class ThreadUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None


class ThreadSummary(BaseModel):
    """Lightweight thread representation used in area views."""
    id: int
    area_id: int
    title: str
    status: str
    description: str
    created_at: datetime
    updated_at: datetime
    entry_count: int
    attachment_count: int

    model_config = {"from_attributes": True}


class LinkedThreadRef(BaseModel):
    link_id: int
    thread_id: int
    thread_title: str
    thread_status: str
    area_id: int
    area_name: str
    kind: str  # blocks | relates_to


class ThreadLinkCreate(BaseModel):
    to_thread_id: int
    kind: str  # blocks | relates_to


class ThreadDetail(BaseModel):
    """Full thread with all entries and attachments."""
    id: int
    area_id: int
    title: str
    status: str
    description: str
    created_at: datetime
    updated_at: datetime
    entries: List[EntryOut] = []
    attachments: List[AttachmentOut] = []
    outgoing_links: List[LinkedThreadRef] = []
    incoming_links: List[LinkedThreadRef] = []

    model_config = {"from_attributes": True}


# ── Areas ─────────────────────────────────────────────────────────────────────

class AreaCreate(BaseModel):
    name: str
    summary: Optional[str] = ""
    icon: Optional[str] = None


class AreaUpdate(BaseModel):
    status: Optional[str] = None
    summary: Optional[str] = None
    icon: Optional[str] = None


class SummarySuggestion(BaseModel):
    summary: str


class AreaSummary(BaseModel):
    """Area card data for the dashboard."""
    id: int
    name: str
    slug: str
    status: str
    summary: str
    icon: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    thread_count: int
    open_thread_count: int

    model_config = {"from_attributes": True}


class AreaDetail(BaseModel):
    """Area detail without threads (threads fetched separately)."""
    id: int
    name: str
    slug: str
    status: str
    summary: str
    icon: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Activity ──────────────────────────────────────────────────────────────────

class ActivityItem(BaseModel):
    event_type: str
    thread_id: int
    thread_title: str
    thread_status: str
    detail: Optional[str] = None
    occurred_at: datetime
    area_id: int
    area_name: str
    area_status: str

    model_config = {"from_attributes": True}


class AuditLogEntry(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    action: str
    field: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    occurred_at: datetime

    model_config = {"from_attributes": True}


class AuditLogWithContext(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    action: str
    field: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    occurred_at: datetime
    thread_id: Optional[int] = None
    thread_title: Optional[str] = None
    area_id: int
    area_name: str

    model_config = {"from_attributes": True}


class AllThreadSummary(BaseModel):
    id: int
    area_id: int
    area_name: str
    title: str
    status: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class UpcomingTodo(BaseModel):
    id: int
    thread_id: int
    thread_title: str
    area_id: int
    area_name: str
    content: str
    due_date: Optional[date] = None

    model_config = {"from_attributes": True}


# ── Generate / Process ────────────────────────────────────────────────────────

class ProcessRequest(BaseModel):
    area_name: str
    input_text: str
    # eml | ics | pdf | text — when supplied, the prompt is biased for that
    # source (e.g. ics → produce a meeting item first).
    source_kind: Optional[str] = None


class ProcessedItem(BaseModel):
    type: str
    content: str
    rationale: str
    suggested_thread: str
    due_date: Optional[str] = None
    meeting_at: Optional[str] = None


class ProcessResponse(BaseModel):
    items: List[ProcessedItem]


class RefineRequest(BaseModel):
    item: dict
    rejection_reason: str
    area_name: str


class RefineResponse(BaseModel):
    item: dict


# ── Roundup ───────────────────────────────────────────────────────────────────

class AreaRoundupData(BaseModel):
    area_id: int
    area_name: str
    area_status: str
    active_thread_count: int
    todos_created: int
    todos_completed: int
    decisions: List[str]
    recent_events: List[str]
    has_activity: bool


class StaleArea(BaseModel):
    id: int
    name: str
    status: str
    days_inactive: int


class RoundupData(BaseModel):
    generated_at: str
    period_days: int
    areas: List[AreaRoundupData]
    stale_areas: List[StaleArea] = []


class RoundupRequest(BaseModel):
    areas: List[dict]
    period_days: int
    generated_at: str


class RoundupResponse(BaseModel):
    text: str
