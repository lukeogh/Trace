from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

import ingest as ingest_module

router = APIRouter(tags=["ingest"])

# 25 MB ceiling — generous for PDFs/emails, small enough to avoid runaway uploads.
MAX_UPLOAD_BYTES = 25 * 1024 * 1024


class ParsedFile(BaseModel):
    text: str
    kind: str         # eml | ics | pdf | text
    source_name: str
    bytes: int


@router.post("/ingest/parse", response_model=ParsedFile)
async def parse_upload(file: UploadFile = File(...)):
    content = await file.read()
    size = len(content)

    if size == 0:
        raise HTTPException(status_code=422, detail="Empty file")
    if size > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({size} bytes, max {MAX_UPLOAD_BYTES}).",
        )

    text, kind = ingest_module.parse_file(file.filename or "", content)

    if not text.strip():
        raise HTTPException(
            status_code=422,
            detail="Could not extract any text from this file.",
        )

    return ParsedFile(
        text=text,
        kind=kind,
        source_name=file.filename or "(unnamed)",
        bytes=size,
    )
