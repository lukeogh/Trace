from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

import models
import schemas
from database import get_db
from audit import log_audit

router = APIRouter(tags=["threads"])


@router.get("/threads/all", response_model=list[schemas.AllThreadSummary])
def list_all_threads(db: Session = Depends(get_db)):
    rows = (
        db.query(models.Thread, models.Area.name)
        .join(models.Area, models.Thread.area_id == models.Area.id)
        .order_by(models.Thread.updated_at.desc())
        .all()
    )
    return [
        schemas.AllThreadSummary(
            id=t.id,
            area_id=t.area_id,
            area_name=area_name,
            title=t.title,
            status=t.status,
            updated_at=t.updated_at,
        )
        for t, area_name in rows
    ]


def _linked_ref(db: Session, link: models.ThreadLink, other_thread_id: int):
    row = (
        db.query(models.Thread, models.Area.name)
        .join(models.Area, models.Thread.area_id == models.Area.id)
        .filter(models.Thread.id == other_thread_id)
        .first()
    )
    if not row:
        return None
    other, area_name = row
    return schemas.LinkedThreadRef(
        link_id=link.id,
        thread_id=other.id,
        thread_title=other.title,
        thread_status=other.status,
        area_id=other.area_id,
        area_name=area_name,
        kind=link.kind,
    )


@router.get("/threads/{thread_id}", response_model=schemas.ThreadDetail)
def get_thread(thread_id: int, db: Session = Depends(get_db)):
    thread = db.query(models.Thread).filter(models.Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    outgoing = db.query(models.ThreadLink).filter(models.ThreadLink.from_thread_id == thread_id).all()
    incoming = db.query(models.ThreadLink).filter(models.ThreadLink.to_thread_id == thread_id).all()

    out_refs = [r for r in (_linked_ref(db, l, l.to_thread_id) for l in outgoing) if r is not None]
    in_refs  = [r for r in (_linked_ref(db, l, l.from_thread_id) for l in incoming) if r is not None]

    return schemas.ThreadDetail(
        id=thread.id,
        area_id=thread.area_id,
        title=thread.title,
        status=thread.status,
        description=thread.description or "",
        created_at=thread.created_at,
        updated_at=thread.updated_at,
        # Only top-level entries — subtasks (parent_id set) are nested under
        # their parent todo's `subtasks` field, so excluding them here keeps
        # them from rendering twice in the timeline.
        entries=[
            schemas.EntryOut.model_validate(e)
            for e in thread.entries
            if e.parent_id is None
        ],
        attachments=[schemas.AttachmentOut.model_validate(a) for a in thread.attachments],
        outgoing_links=out_refs,
        incoming_links=in_refs,
    )


@router.post("/threads/{thread_id}/links", response_model=schemas.LinkedThreadRef, status_code=201)
def add_thread_link(thread_id: int, payload: schemas.ThreadLinkCreate, db: Session = Depends(get_db)):
    if payload.to_thread_id == thread_id:
        raise HTTPException(status_code=422, detail="Cannot link a thread to itself")

    valid_kinds = {"blocks", "relates_to"}
    if payload.kind not in valid_kinds:
        raise HTTPException(status_code=422, detail=f"kind must be one of {valid_kinds}")

    from_thread = db.query(models.Thread).filter(models.Thread.id == thread_id).first()
    to_thread = db.query(models.Thread).filter(models.Thread.id == payload.to_thread_id).first()
    if not from_thread or not to_thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    existing = (
        db.query(models.ThreadLink)
        .filter(
            models.ThreadLink.from_thread_id == thread_id,
            models.ThreadLink.to_thread_id == payload.to_thread_id,
            models.ThreadLink.kind == payload.kind,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Link already exists")

    link = models.ThreadLink(
        from_thread_id=thread_id,
        to_thread_id=payload.to_thread_id,
        kind=payload.kind,
    )
    db.add(link)
    db.commit()
    db.refresh(link)

    log_audit(
        db, entity_type="thread_link", entity_id=link.id,
        area_id=from_thread.area_id, thread_id=thread_id,
        action="created", field=payload.kind, new_value=to_thread.title,
    )
    db.commit()

    return _linked_ref(db, link, link.to_thread_id)


@router.delete("/links/{link_id}", status_code=204)
def delete_thread_link(link_id: int, db: Session = Depends(get_db)):
    link = db.query(models.ThreadLink).filter(models.ThreadLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    from_thread = db.query(models.Thread).filter(models.Thread.id == link.from_thread_id).first()
    to_thread = db.query(models.Thread).filter(models.Thread.id == link.to_thread_id).first()

    if from_thread:
        log_audit(
            db, entity_type="thread_link", entity_id=link.id,
            area_id=from_thread.area_id, thread_id=link.from_thread_id,
            action="deleted", field=link.kind,
            old_value=to_thread.title if to_thread else None,
        )

    db.delete(link)
    db.commit()


@router.put("/threads/{thread_id}", response_model=schemas.ThreadDetail)
def update_thread(
    thread_id: int, payload: schemas.ThreadUpdate, db: Session = Depends(get_db)
):
    thread = db.query(models.Thread).filter(models.Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    if payload.title is not None and payload.title != thread.title:
        log_audit(db, entity_type='thread', entity_id=thread.id, area_id=thread.area_id,
                  thread_id=thread.id, action='updated', field='title', old_value=thread.title, new_value=payload.title)
        thread.title = payload.title
    elif payload.title is not None:
        thread.title = payload.title

    if payload.description is not None and payload.description != thread.description:
        log_audit(db, entity_type='thread', entity_id=thread.id, area_id=thread.area_id,
                  thread_id=thread.id, action='updated', field='description', old_value=thread.description or '', new_value=payload.description)
        thread.description = payload.description
    elif payload.description is not None:
        thread.description = payload.description

    if payload.status is not None:
        valid = {"open", "in-progress", "resolved", "parked", "blocked"}
        if payload.status not in valid:
            raise HTTPException(status_code=422, detail=f"status must be one of {valid}")
        if payload.status != thread.status:
            log_audit(db, entity_type='thread', entity_id=thread.id, area_id=thread.area_id,
                      thread_id=thread.id, action='updated', field='status', old_value=thread.status, new_value=payload.status)
            db.add(models.ActivityEvent(event_type="status_changed", thread_id=thread.id, detail=f"→ {payload.status}"))
        thread.status = payload.status

    thread.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(thread)
    return thread


@router.get("/threads/{thread_id}/audit", response_model=list[schemas.AuditLogEntry])
def get_thread_audit(thread_id: int, db: Session = Depends(get_db)):
    thread = db.query(models.Thread).filter(models.Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    return (
        db.query(models.AuditLog)
        .filter(models.AuditLog.thread_id == thread_id)
        .order_by(models.AuditLog.occurred_at.desc())
        .all()
    )


@router.delete("/threads/{thread_id}", status_code=204)
def delete_thread(thread_id: int, db: Session = Depends(get_db)):
    thread = db.query(models.Thread).filter(models.Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    db.delete(thread)
    db.commit()
