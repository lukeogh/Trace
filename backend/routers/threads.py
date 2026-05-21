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


@router.get("/threads/{thread_id}", response_model=schemas.ThreadDetail)
def get_thread(thread_id: int, db: Session = Depends(get_db)):
    thread = db.query(models.Thread).filter(models.Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    return thread


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
        valid = {"open", "in-progress", "resolved", "parked"}
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
