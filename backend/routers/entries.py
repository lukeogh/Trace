from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

import models
import schemas
from database import get_db

router = APIRouter(tags=["entries"])


@router.post("/threads/{thread_id}/entries", response_model=schemas.EntryOut, status_code=201)
def create_entry(
    thread_id: int, payload: schemas.EntryCreate, db: Session = Depends(get_db)
):
    thread = db.query(models.Thread).filter(models.Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    entry = models.Entry(thread_id=thread_id, content=payload.content)
    db.add(entry)

    # Bump thread and area updated_at so activity bubbles up
    thread.updated_at = datetime.now(timezone.utc)
    area = db.query(models.Area).filter(models.Area.id == thread.area_id).first()
    if area:
        area.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(entry)
    return entry


@router.put("/entries/{entry_id}", response_model=schemas.EntryOut)
def update_entry(
    entry_id: int, payload: schemas.EntryUpdate, db: Session = Depends(get_db)
):
    entry = db.query(models.Entry).filter(models.Entry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    entry.content = payload.content
    entry.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/entries/{entry_id}", status_code=204)
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(models.Entry).filter(models.Entry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
