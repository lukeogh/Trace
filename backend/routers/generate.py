import json
import os
from fastapi import APIRouter, HTTPException

import schemas

router = APIRouter(tags=["generate"])


def get_anthropic_client():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY not configured — add it to your .env file and rebuild.",
        )
    from anthropic import Anthropic
    return Anthropic(api_key=api_key)


def _translate_anthropic_error(exc: Exception) -> HTTPException:
    """
    Convert an Anthropic SDK exception into a clear HTTPException the UI can show.
    Falls through to a generic 502 for anything we don't recognise.
    """
    try:
        from anthropic import (
            APIStatusError, RateLimitError, APIConnectionError,
            APITimeoutError, AuthenticationError, BadRequestError,
        )
    except Exception:
        # If the SDK can't be imported here, just return a generic 502
        return HTTPException(status_code=502, detail=f"AI request failed: {exc}")

    status = getattr(exc, "status_code", None)

    if isinstance(exc, APITimeoutError):
        return HTTPException(
            status_code=504,
            detail="Claude took too long to respond. Try again.",
        )
    if isinstance(exc, APIConnectionError):
        return HTTPException(
            status_code=502,
            detail="Couldn't reach Claude. Check your network and try again.",
        )
    if isinstance(exc, AuthenticationError):
        return HTTPException(
            status_code=502,
            detail="Anthropic API key is invalid or expired. Update ANTHROPIC_API_KEY and rebuild.",
        )
    if isinstance(exc, RateLimitError) or status == 429:
        return HTTPException(
            status_code=503,
            detail="Rate-limited by Claude. Wait a few seconds and retry.",
        )
    # 529 — Anthropic's "service overloaded" — comes through as APIStatusError
    if status == 529:
        return HTTPException(
            status_code=503,
            detail="Claude is overloaded right now. Wait a few seconds and retry.",
        )
    if isinstance(exc, BadRequestError):
        return HTTPException(
            status_code=400,
            detail=f"Claude rejected the request: {exc}",
        )
    if isinstance(exc, APIStatusError):
        return HTTPException(
            status_code=502,
            detail=f"Claude API error ({status}): {exc}",
        )
    return HTTPException(status_code=502, detail=f"AI request failed: {exc}")


@router.post("/generate/process", response_model=schemas.ProcessResponse)
def generate_process(payload: schemas.ProcessRequest):
    client = get_anthropic_client()

    base_system = """You extract structured work items from unstructured text for a software department management tool.
Respond with a JSON array only. No preamble, no explanation, no markdown code fences.
Each item must have exactly these fields:
  type:             "todo" | "entry" | "decision" | "meeting"
  content:          string (clear and actionable; for meetings, the meeting subject/title)
  rationale:        string (one sentence explaining why you extracted this)
  suggested_thread: string (a short thread title this item belongs in)
  due_date:         string | null (ISO date YYYY-MM-DD if applicable, else null)
  meeting_at:       string | null (ISO datetime YYYY-MM-DDTHH:MM if known, meetings only, else null)
Maximum 8 items. Prioritise actionable items over contextual ones."""

    ics_addendum = """

This input is a parsed calendar invite (.ics). The FIRST item you return MUST be of type "meeting":
  - content: the meeting subject
  - meeting_at: the ISO start datetime (YYYY-MM-DDTHH:MM) parsed from the invite
  - suggested_thread: a sensible thread name for this meeting topic
  - rationale: brief note that this came from a calendar invite

Then continue extracting any other actionable items (todos / decisions / context entries) from the agenda or description as normal."""

    system = base_system + (ics_addendum if (payload.source_kind == "ics") else "")

    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            system=system,
            messages=[{
                "role": "user",
                "content": f"Area: {payload.area_name}\n\nText to process:\n{payload.input_text}",
            }],
        )
    except HTTPException:
        raise
    except Exception as e:
        raise _translate_anthropic_error(e)

    try:
        items = json.loads(message.content[0].text)
        return schemas.ProcessResponse(items=[schemas.ProcessedItem(**item) for item in items])
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse AI response: {str(e)}")


@router.post("/generate/refine", response_model=schemas.RefineResponse)
def generate_refine(payload: schemas.RefineRequest):
    client = get_anthropic_client()

    system = """You refine a single work item based on rejection feedback.
Return a JSON object only with fields: type, content, rationale, suggested_thread, due_date.
No preamble, no markdown."""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=500,
            system=system,
            messages=[{
                "role": "user",
                "content": f"Original item: {json.dumps(payload.item)}\nRejection reason: {payload.rejection_reason}\nArea: {payload.area_name}",
            }],
        )
    except HTTPException:
        raise
    except Exception as e:
        raise _translate_anthropic_error(e)

    try:
        refined = json.loads(message.content[0].text)
        return schemas.RefineResponse(item=refined)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse AI response: {str(e)}")


@router.post("/generate/roundup", response_model=schemas.RoundupResponse)
def generate_roundup(payload: schemas.RoundupRequest):
    client = get_anthropic_client()

    prompt = f"""You are writing a weekly department status update for the Head of Software at Axithra, a Belgian medtech company.
The update covers seven software discipline areas. Write in a professional, direct tone suitable for sharing with a manager.
Be concise. Use plain prose with no markdown formatting. Use dashes for list items if needed.

Structure:
1. One short executive paragraph (3-4 sentences) summarising the week across the whole department.
2. One line per area. Format: "Area Name - [summary]".
   Non-movers: "Area Name - No activity this week."
   Active areas: include status, tasks opened vs completed, any decisions made, key activity.

Data for the 7 days ending {payload.generated_at}:
{json.dumps(payload.areas, indent=2)}"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2500,
            messages=[{"role": "user", "content": prompt}],
        )
    except HTTPException:
        raise
    except Exception as e:
        raise _translate_anthropic_error(e)

    return schemas.RoundupResponse(text=message.content[0].text)
