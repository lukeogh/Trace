from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone

import models
import schemas
from database import get_db

router = APIRouter(tags=["areas"])


def _area_summary(area: models.Area, db: Session) -> schemas.AreaSummary:
    """Build an AreaSummary including computed thread counts."""
    thread_count = (
        db.query(func.count(models.Thread.id))
        .filter(models.Thread.area_id == area.id)
        .scalar()
    )
    open_count = (
        db.query(func.count(models.Thread.id))
        .filter(
            models.Thread.area_id == area.id,
            models.Thread.status.in_(["open", "in-progress"]),
        )
        .scalar()
    )
    return schemas.AreaSummary(
        id=area.id,
        name=area.name,
        slug=area.slug,
        status=area.status,
        summary=area.summary or "",
        created_at=area.created_at,
        updated_at=area.updated_at,
        thread_count=thread_count,
        open_thread_count=open_count,
    )


@router.get("/areas", response_model=list[schemas.AreaSummary])
def list_areas(db: Session = Depends(get_db)):
    areas = db.query(models.Area).order_by(models.Area.id).all()
    return [_area_summary(a, db) for a in areas]


@router.get("/areas/{area_id}", response_model=schemas.AreaDetail)
def get_area(area_id: int, db: Session = Depends(get_db)):
    area = db.query(models.Area).filter(models.Area.id == area_id).first()
    if not area:
        raise HTTPException(status_code=404, detail="Area not found")
    return area


@router.put("/areas/{area_id}", response_model=schemas.AreaDetail)
def update_area(area_id: int, payload: schemas.AreaUpdate, db: Session = Depends(get_db)):
    area = db.query(models.Area).filter(models.Area.id == area_id).first()
    if not area:
        raise HTTPException(status_code=404, detail="Area not found")

    if payload.status is not None:
        valid = {"stable", "active", "review", "blocked"}
        if payload.status not in valid:
            raise HTTPException(status_code=422, detail=f"status must be one of {valid}")
        area.status = payload.status

    if payload.summary is not None:
        area.summary = payload.summary

    area.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(area)
    return area


@router.get("/areas/{area_id}/threads", response_model=list[schemas.ThreadSummary])
def list_area_threads(area_id: int, db: Session = Depends(get_db)):
    area = db.query(models.Area).filter(models.Area.id == area_id).first()
    if not area:
        raise HTTPException(status_code=404, detail="Area not found")

    threads = (
        db.query(models.Thread)
        .filter(models.Thread.area_id == area_id)
        .order_by(models.Thread.updated_at.desc())
        .all()
    )

    result = []
    for t in threads:
        entry_count = (
            db.query(func.count(models.Entry.id))
            .filter(models.Entry.thread_id == t.id)
            .scalar()
        )
        attachment_count = (
            db.query(func.count(models.Attachment.id))
            .filter(models.Attachment.thread_id == t.id)
            .scalar()
        )
        result.append(
            schemas.ThreadSummary(
                id=t.id,
                area_id=t.area_id,
                title=t.title,
                status=t.status,
                description=t.description or "",
                created_at=t.created_at,
                updated_at=t.updated_at,
                entry_count=entry_count,
                attachment_count=attachment_count,
            )
        )
    return result


@router.post("/areas/{area_id}/threads", response_model=schemas.ThreadSummary, status_code=201)
def create_thread(area_id: int, payload: schemas.ThreadCreate, db: Session = Depends(get_db)):
    area = db.query(models.Area).filter(models.Area.id == area_id).first()
    if not area:
        raise HTTPException(status_code=404, detail="Area not found")

    valid = {"open", "in-progress", "resolved", "parked"}
    if payload.status not in valid:
        raise HTTPException(status_code=422, detail=f"status must be one of {valid}")

    thread = models.Thread(
        area_id=area_id,
        title=payload.title,
        description=payload.description or "",
        status=payload.status or "open",
    )
    db.add(thread)

    # Bump area updated_at so dashboard reflects new activity
    area.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(thread)

    return schemas.ThreadSummary(
        id=thread.id,
        area_id=thread.area_id,
        title=thread.title,
        status=thread.status,
        description=thread.description or "",
        created_at=thread.created_at,
        updated_at=thread.updated_at,
        entry_count=0,
        attachment_count=0,
    )
