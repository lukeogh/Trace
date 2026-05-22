from sqlalchemy.orm import Session
import models


def log_audit(
    db: Session,
    entity_type: str,
    entity_id: int,
    area_id: int,
    action: str,
    thread_id: int = None,
    field: str = None,
    old_value: str = None,
    new_value: str = None,
):
    try:
        record = models.AuditLog(
            entity_type=entity_type,
            entity_id=entity_id,
            area_id=area_id,
            thread_id=thread_id,
            action=action,
            field=field,
            old_value=old_value,
            new_value=new_value,
        )
        db.add(record)
        db.commit()
    except Exception:
        # Roll back so a failed audit write doesn't poison the caller's
        # transaction (was causing PendingRollbackError downstream).
        try:
            db.rollback()
        except Exception:
            pass
