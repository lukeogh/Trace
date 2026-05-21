from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


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


class EntryUpdate(BaseModel):
    content: str


class EntryOut(BaseModel):
    id: int
    thread_id: int
    content: str
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

    model_config = {"from_attributes": True}


# ── Areas ─────────────────────────────────────────────────────────────────────

class AreaUpdate(BaseModel):
    status: Optional[str] = None
    summary: Optional[str] = None


class AreaSummary(BaseModel):
    """Area card data for the dashboard."""
    id: int
    name: str
    slug: str
    status: str
    summary: str
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
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
