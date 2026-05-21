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


@router.post("/generate/process", response_model=schemas.ProcessResponse)
def generate_process(payload: schemas.ProcessRequest):
    client = get_anthropic_client()

    system = """You extract structured work items from unstructured text for a software department management tool.
Respond with a JSON array only. No preamble, no explanation, no markdown code fences.
Each item must have exactly these fields:
  type:             "todo" | "entry" | "decision"
  content:          string (clear and actionable)
  rationale:        string (one sentence explaining why you extracted this)
  suggested_thread: string (a short thread title this item belongs in)
  due_date:         string | null (ISO date YYYY-MM-DD if applicable, else null)
Maximum 8 items. Prioritise actionable items over contextual ones."""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=system,
        messages=[{
            "role": "user",
            "content": f"Area: {payload.area_name}\n\nText to process:\n{payload.input_text}",
        }],
    )

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

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=500,
        system=system,
        messages=[{
            "role": "user",
            "content": f"Original item: {json.dumps(payload.item)}\nRejection reason: {payload.rejection_reason}\nArea: {payload.area_name}",
        }],
    )

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

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2500,
        messages=[{"role": "user", "content": prompt}],
    )
    return schemas.RoundupResponse(text=message.content[0].text)
