import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import models
from database import engine, SessionLocal
from routers import areas, threads, entries, attachments

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "./data/uploads")
FRONTEND_DIST = os.environ.get(
    "FRONTEND_DIST",
    os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"),
)

# The seven software department areas, seeded on first run
INITIAL_AREAS = [
    {"name": "Documentation", "slug": "documentation"},
    {"name": "Firmware", "slug": "firmware"},
    {"name": "Software Test", "slug": "software-test"},
    {"name": "Software Development", "slug": "software-development"},
    {"name": "Algorithm", "slug": "algorithm"},
    {"name": "Design", "slug": "design"},
    {"name": "Security", "slug": "security"},
]


def _init_db():
    """Create all tables and seed the seven areas if the database is empty."""
    models.Base.metadata.create_all(bind=engine)
    os.makedirs(UPLOAD_DIR, exist_ok=True)

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
    yield


app = FastAPI(title="Department Log", version="1.0.0", lifespan=lifespan)

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

# Serve uploaded files at /uploads/<stored_name>
if os.path.exists(UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Serve the compiled React app (production only)
# In development, Vite dev server handles this with a proxy to /api
if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
