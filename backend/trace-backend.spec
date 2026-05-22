# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for the Trace. backend.
Run from the repo root:
    pyinstaller backend/trace-backend.spec
Output lands in dist/trace-backend/ (onedir mode — fast launch, no per-launch
temp extraction, no AV false-positives from --onefile bootloader behaviour).
"""

import os
from PyInstaller.utils.hooks import collect_data_files

block_cipher = None

# The built React app needs to be bundled inside the binary so the FastAPI
# StaticFiles mount can find it at FRONTEND_DIST.
frontend_dist = os.path.join('frontend', 'dist')
if not os.path.exists(frontend_dist):
    raise RuntimeError(
        "frontend/dist not found. Run `npm run build` in the frontend/ "
        "directory before invoking PyInstaller, or just run "
        "`python scripts/build-backend.py` which does both in order."
    )


a = Analysis(
    ['backend/run.py'],
    pathex=['backend'],
    binaries=[],
    datas=[
        # Bundle the built React app inside the binary
        (frontend_dist, 'frontend/dist'),
        # Bundle icalendar timezone data
        *collect_data_files('icalendar'),
    ],
    hiddenimports=[
        # SQLAlchemy dialects + internals — PyInstaller can't always see these
        'sqlalchemy.dialects.sqlite',
        'sqlalchemy.dialects.sqlite.pysqlite',
        'sqlalchemy.pool',
        'sqlalchemy.pool.impl',
        'sqlalchemy.sql.default_comparator',
        'sqlalchemy.ext.declarative',
        # APScheduler — discovered via string at runtime
        'apscheduler.schedulers.background',
        'apscheduler.triggers.cron',
        'apscheduler.triggers.interval',
        'apscheduler.triggers.date',
        'apscheduler.executors.pool',
        'apscheduler.jobstores.sqlalchemy',
        # Timezone data for APScheduler's Europe/Brussels cron
        'pytz',
        'tzdata',
        # Uvicorn internals
        'uvicorn.lifespan.on',
        'uvicorn.lifespan.off',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.loops.auto',
        'uvicorn.loops.asyncio',
        # Anthropic SDK + its transport stack
        'anthropic',
        'httpx',
        'httpcore',
        'anyio',
        'anyio._backends._asyncio',
        'anyio._backends._trio',
        # FastAPI / Starlette
        'starlette.routing',
        'starlette.staticfiles',
        'starlette.middleware.cors',
        'multipart',
        'multipart.multipart',
        'python_multipart',
        # PDF + ical ingest
        'pypdf',
        'icalendar',
        # aiofiles — used by static file serving
        'aiofiles',
        'aiofiles.os',
        'aiofiles.threadpool',
        # Trace's own backend modules (PyInstaller doesn't always discover them
        # when run.py imports them indirectly through `from main import app`)
        'main',
        'database',
        'models',
        'schemas',
        'audit',
        'ingest',
        'scheduler',
        'routers',
        'routers.areas',
        'routers.threads',
        'routers.entries',
        'routers.attachments',
        'routers.generate',
        'routers.ingest',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # We never ship these — keeps the bundle slim
        'matplotlib', 'numpy', 'pandas', 'PIL', 'tkinter',
        'PyQt5', 'wx', 'gi', 'gtk',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,   # onedir mode — keep deps separate
    name='trace-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    # NOTE: set console=True during initial packaging so tracebacks/print
    # output are visible. Flip to False once you've confirmed the bundle
    # boots cleanly under Tauri.
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='trace-backend',
)
