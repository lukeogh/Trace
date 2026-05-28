from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean, Date
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from database import Base


class Area(Base):
    __tablename__ = "areas"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    # stable | active | review | blocked
    status = Column(String(50), default="stable", nullable=False)
    summary = Column(Text, default="")
    # lucide-react icon name (e.g. "Code", "Database"). null = no icon set.
    icon = Column(String(64), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    threads = relationship(
        "Thread", back_populates="area", cascade="all, delete-orphan"
    )


class Thread(Base):
    __tablename__ = "threads"

    id = Column(Integer, primary_key=True, index=True)
    area_id = Column(Integer, ForeignKey("areas.id"), nullable=False)
    title = Column(String(200), nullable=False)
    # open | in-progress | resolved | parked
    status = Column(String(50), default="open", nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    area = relationship("Area", back_populates="threads")
    entries = relationship(
        "Entry",
        back_populates="thread",
        cascade="all, delete-orphan",
        order_by="Entry.created_at",
    )
    attachments = relationship(
        "Attachment",
        back_populates="thread",
        cascade="all, delete-orphan",
        order_by="Attachment.created_at",
    )


class Entry(Base):
    __tablename__ = "entries"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("threads.id"), nullable=False)
    content = Column(Text, nullable=False)
    # entry | todo | decision | meeting
    type = Column(String(20), default="entry", nullable=False)
    completed = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    due_date = Column(Date, nullable=True)
    # Scheduled time for meeting-type entries (null for other types)
    meeting_at = Column(DateTime, nullable=True)
    # Free-form notes — used mostly on investigative todos to capture
    # findings while the task is still open. Nullable across all types.
    notes = Column(Text, nullable=True)

    # ── Task decomposition (subtasks) ─────────────────────────────────────────
    # Subtasks are Entry rows of type 'todo' that point at a parent todo via
    # parent_id. Top-level entries have parent_id = NULL.
    parent_id = Column(Integer, ForeignKey("entries.id", ondelete="CASCADE"), nullable=True)
    # AI-suggested time estimate for a subtask, in minutes.
    time_estimate_minutes = Column(Integer, nullable=True)
    # Display ordering among siblings under the same parent.
    subtask_order = Column(Integer, nullable=True)
    # True once the user has dismissed the breakdown drawer for this todo —
    # enables the "Break this down" later affordance without re-triggering.
    decomp_dismissed = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    thread = relationship("Thread", back_populates="entries")
    # Self-referential: a todo's subtasks. Deleting a parent cascades to its
    # children. remote_side ties the backref 'parent' to this row's id.
    subtasks = relationship(
        "Entry",
        backref=backref("parent", remote_side="Entry.id"),
        foreign_keys="Entry.parent_id",
        order_by="Entry.subtask_order",
        cascade="all, delete-orphan",
        single_parent=True,
    )


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("threads.id"), nullable=False)
    # file | link
    type = Column(String(10), nullable=False)
    name = Column(String(255), nullable=False)
    # stored filename on disk (files only)
    stored_name = Column(String(500))
    # original filename (files only)
    original_name = Column(String(255))
    # url (links only)
    url = Column(String(1000))
    # bytes (files only)
    size = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())

    thread = relationship("Thread", back_populates="attachments")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=False)
    area_id = Column(Integer, ForeignKey("areas.id", ondelete="CASCADE"), nullable=True)
    thread_id = Column(Integer, ForeignKey("threads.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(50), nullable=False)
    field = Column(String(100), nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    occurred_at = Column(DateTime, server_default=func.now())


class ThreadLink(Base):
    __tablename__ = "thread_links"

    id = Column(Integer, primary_key=True, index=True)
    from_thread_id = Column(Integer, ForeignKey("threads.id", ondelete="CASCADE"), nullable=False, index=True)
    to_thread_id = Column(Integer, ForeignKey("threads.id", ondelete="CASCADE"), nullable=False, index=True)
    # blocks | relates_to
    kind = Column(String(30), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class ActivityEvent(Base):
    __tablename__ = "activity_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(50), nullable=False)
    thread_id = Column(Integer, ForeignKey("threads.id", ondelete="CASCADE"), nullable=False)
    detail = Column(String(200), nullable=True)
    occurred_at = Column(DateTime, server_default=func.now())

    thread = relationship("Thread")


class AppSettings(Base):
    """
    Generic key-value store for application-wide settings.

    Currently holds the AI provider configuration under key "ai_config".
    Adding new settings = pick a key, JSON-encode the payload.

    Why a single key-value table rather than columns: most settings are
    one-off + structured-but-small. Migrations stay free. New setting =
    new key, no schema changes.
    """
    __tablename__ = "app_settings"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
