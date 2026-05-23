import os
import sys
import argparse

# ── CLI args + path resolution (must run before importing database) ──────────
# database.py reads DB_PATH at module-load time and uses it to construct the
# SQLAlchemy engine, so any env-var override needs to be in place BEFORE we
# `from database import …`. Docker continues to work because docker-compose
# already sets DB_PATH explicitly; the Tauri sidecar passes --data-dir.
parser = argparse.ArgumentParser(description="Trace. backend")
parser.add_argument("--port", type=int, default=None, help="Port to listen on")
parser.add_argument("--data-dir", type=str, default=None, help="Data directory path")
_args, _unknown = parser.parse_known_args()

# Path resolution — onedir-frozen vs. interpreter / Docker run
if getattr(sys, "frozen", False):
    # PyInstaller onedir: sys.executable is the launcher, _MEIPASS is _internal/
    _BUNDLE_DIR = os.path.dirname(sys.executable)
    _INTERNAL_DIR = sys._MEIPASS  # type: ignore[attr-defined]
    _DEFAULT_FRONTEND = os.path.join(_INTERNAL_DIR, "frontend", "dist")
else:
    _BUNDLE_DIR = os.path.dirname(os.path.abspath(__file__))
    _DEFAULT_FRONTEND = os.path.join(_BUNDLE_DIR, "..", "frontend", "dist")

if _args.data_dir:
    _DATA_DIR = _args.data_dir
else:
    _DATA_DIR = os.environ.get("DATA_DIR", os.path.join(_BUNDLE_DIR, "data"))

os.makedirs(_DATA_DIR, exist_ok=True)

# Propagate DB_PATH BEFORE the database module is imported.
_db_path = os.environ.get("DB_PATH", os.path.join(_DATA_DIR, "trace.db"))
os.environ["DB_PATH"] = _db_path

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", os.path.join(_DATA_DIR, "uploads"))
FRONTEND_DIST = os.environ.get("FRONTEND_DIST", _DEFAULT_FRONTEND)

# ── Now safe to import everything that depends on the env ───────────────────
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

import models
from database import engine, SessionLocal
from routers import areas, threads, entries, attachments, generate, ingest

# Trace. launches with no seeded areas — the user creates their own from the
# sidebar's "+ Add your first area" prompt. The previous seven-area software
# seed was removed when the product was broadened away from a single-team
# deployment; existing installations are unaffected because the seed only
# ever ran when the areas table was empty.
INITIAL_AREAS = []


def _init_db():
    """Create all tables and seed initial areas if the database is empty."""
    from sqlalchemy import text
    models.Base.metadata.create_all(bind=engine)
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Safe migration: add new columns to existing databases
    with engine.connect() as conn:
        for sql in [
            "ALTER TABLE entries ADD COLUMN type VARCHAR(20) DEFAULT 'entry'",
            "ALTER TABLE entries ADD COLUMN completed BOOLEAN DEFAULT 0",
            "ALTER TABLE entries ADD COLUMN completed_at DATETIME",
            "ALTER TABLE entries ADD COLUMN due_date DATE",
            "ALTER TABLE activity_events ADD COLUMN detail VARCHAR(200)",
            "CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY, entity_type VARCHAR(50), entity_id INTEGER, area_id INTEGER REFERENCES areas(id) ON DELETE CASCADE, thread_id INTEGER REFERENCES threads(id) ON DELETE SET NULL, action VARCHAR(50), field VARCHAR(100), old_value TEXT, new_value TEXT, occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "ALTER TABLE audit_logs ADD COLUMN area_id INTEGER REFERENCES areas(id) ON DELETE CASCADE",
            "ALTER TABLE areas ADD COLUMN icon VARCHAR(64)",
            "ALTER TABLE entries ADD COLUMN meeting_at DATETIME",
            "ALTER TABLE entries ADD COLUMN notes TEXT",
            # AI engine config + future generic app settings
            "CREATE TABLE IF NOT EXISTS app_settings (key VARCHAR(100) PRIMARY KEY, value TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
        ]:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass

    # Backfill area_id for any existing audit_log rows that pre-date the column
    try:
        from sqlalchemy import text as _text
        with engine.connect() as conn:
            conn.execute(_text(
                "UPDATE audit_logs SET area_id = "
                "(SELECT area_id FROM threads WHERE threads.id = audit_logs.thread_id) "
                "WHERE area_id IS NULL AND thread_id IS NOT NULL"
            ))
            conn.commit()
    except Exception:
        pass

    # Rebuild audit_logs if thread_id was created with NOT NULL (older schemas).
    # Area-only audits (status/summary change) pass thread_id=None and would
    # otherwise raise IntegrityError, poisoning the surrounding transaction.
    try:
        from sqlalchemy import text as _text
        with engine.connect() as conn:
            info = conn.execute(_text("PRAGMA table_info(audit_logs)")).fetchall()
            thread_col = next((c for c in info if c[1] == "thread_id"), None)
            # PRAGMA table_info columns: (cid, name, type, notnull, dflt_value, pk)
            if thread_col is not None and thread_col[3] == 1:
                conn.execute(_text("PRAGMA foreign_keys=OFF"))
                conn.execute(_text(
                    "CREATE TABLE audit_logs_new ("
                    "id INTEGER PRIMARY KEY, "
                    "entity_type VARCHAR(50) NOT NULL, "
                    "entity_id INTEGER NOT NULL, "
                    "area_id INTEGER REFERENCES areas(id) ON DELETE CASCADE, "
                    "thread_id INTEGER REFERENCES threads(id) ON DELETE SET NULL, "
                    "action VARCHAR(50) NOT NULL, "
                    "field VARCHAR(100), "
                    "old_value TEXT, "
                    "new_value TEXT, "
                    "occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP"
                    ")"
                ))
                conn.execute(_text(
                    "INSERT INTO audit_logs_new "
                    "(id, entity_type, entity_id, area_id, thread_id, action, field, old_value, new_value, occurred_at) "
                    "SELECT id, entity_type, entity_id, area_id, thread_id, action, field, old_value, new_value, occurred_at "
                    "FROM audit_logs"
                ))
                conn.execute(_text("DROP TABLE audit_logs"))
                conn.execute(_text("ALTER TABLE audit_logs_new RENAME TO audit_logs"))
                conn.execute(_text("PRAGMA foreign_keys=ON"))
                conn.commit()
    except Exception:
        pass

    db = SessionLocal()
    try:
        if db.query(models.Area).count() == 0:
            for data in INITIAL_AREAS:
                db.add(models.Area(**data))
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _init_db()
    try:
        import scheduler
        scheduler.start()
    except Exception as e:
        # Don't let a scheduler bug take the whole API down
        import logging
        logging.getLogger("trace").warning("Scheduler failed to start: %s", e)
    yield
    try:
        import scheduler
        scheduler.shutdown()
    except Exception:
        pass


app = FastAPI(title="Trace.", version="1.0.0", lifespan=lifespan)


@app.get("/api/health")
async def health():
    """Liveness probe used by the Tauri shell to know when to show the window."""
    return JSONResponse({"status": "ok"})


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers
app.include_router(areas.router, prefix="/api")
app.include_router(threads.router, prefix="/api")
app.include_router(entries.router, prefix="/api")
app.include_router(attachments.router, prefix="/api")
app.include_router(generate.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")

# Serve uploaded files at /uploads/<stored_name>
if os.path.exists(UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Serve the compiled React app (production only)
# In development, Vite dev server handles this with a proxy to /api
if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
