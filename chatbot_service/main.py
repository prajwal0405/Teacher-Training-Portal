"""
Teacher Support Chatbot Service
--------------------------------
A standalone, reusable AI service for the Teacher Dashboard. It is NOT part
of the Dashboard's codebase - it's a small independent API that any SpacECE
site can call over HTTP.

Reuse pattern:
    Any site  --POST-->  /api/v1/teacher-support-chat  --returns-->  {"reply": "..."}

This stands on its own as a complete, reusable service for this task. It's
built with a small, self-contained pattern (one service, one endpoint, one
scoped system prompt) that also happens to be a reasonable shape for a
future shared AI service layer, if that separate proposal is ever approved -
but this chatbot doesn't depend on that proposal existing.

Run locally:
    uvicorn main:app --reload --port 8000
"""

import os
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from openai import OpenAI


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

GROQ_API_KEY: str = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL: str = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"

# Maximum tokens the model may generate per reply.
MAX_TOKENS: int = int(os.environ.get("CHATBOT_MAX_TOKENS", "1024"))


# ---------------------------------------------------------------------------
# System prompt — the ONLY place policy knowledge lives
#
# ⚠️  PLACEHOLDER TEXT — replace with verified SpacECE policy before going
#     live.  Keep the "refuse-and-redirect" instruction intact when you do.
# ---------------------------------------------------------------------------

TEACHER_SUPPORT_SYSTEM_PROMPT: str = """
You are a helpful assistant on SpacECE India Foundation's Teacher Dashboard.
Your job is to answer general policy questions that teachers commonly ask.

## What you know (general policy — not teacher-specific)

1. **Attendance rules**
   - Teachers must maintain a minimum of 75 % attendance across all
     enrolled courses to remain in good standing.
   - Attendance is recorded per session. If a teacher falls below 75 %
     mid-course, they receive an automated reminder.
   - Requests for attendance corrections must be raised through the
     teacher's assigned coordinator within 7 working days of the session.

2. **Certificate turnaround**
   - After a teacher completes all course requirements (including any
     final assessment), the certificate is generated within 3–5 working
     days.
   - Certificates are available for download in the "My Certificates"
     section of the dashboard once ready.
   - If a certificate has not appeared after 5 working days, the teacher
     should contact their coordinator.

3. **Course deadlines**
   - Each course has a published start and end date visible on the
     "My Courses" page.
   - All assignments and assessments must be submitted before the
     course end date.  Late submissions are not accepted unless the
     coordinator grants an extension.
   - Upcoming deadlines are surfaced in the dashboard's notification
     area.

## How you must behave

- **Stay in scope.** Only answer questions that fall within the three
  policy areas above, or closely related procedural questions (e.g. "where
  do I find X on the dashboard?").
- **Never fabricate personal data.** You do NOT have access to any
  individual teacher's records — no attendance percentage, no certificate
  status, no enrolment list.  When a teacher asks about *their own*
  data (e.g. "is my certificate ready?", "what is my attendance?"),
  you must:
    1. State the relevant general rule (e.g. "certificates are usually
       ready within 3–5 working days after course completion").
    2. Tell them exactly where to check on the dashboard (e.g. the
       "My Certificates" section).
    3. Suggest contacting their coordinator if the dashboard does not
       have the answer.
    4. **Never** invent, assume, or guess a personal status.
- **Be concise.** Teachers are busy — keep replies short and direct.
- **Politely decline out-of-scope questions.** If a question is
  unrelated to SpacECE's Teacher Dashboard policies, say so and
  suggest the teacher contact support.
""".strip()


# ---------------------------------------------------------------------------
# Pydantic models — the HTTP contract
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    """A single turn in the conversation history."""
    role: str = Field(
        ...,
        description="Either 'user' or 'assistant'.",
        pattern="^(user|assistant)$",
    )
    content: str


class ChatRequest(BaseModel):
    """
    Incoming request body for the teacher-support-chat endpoint.

    - message:  the teacher's latest question (required).
    - history:  prior turns, so the model has conversational context.
                The frontend holds this in memory and sends it each time.
    - source:   which portal is calling (for logging only — does NOT
                change behavior).
    """
    message: str = Field(..., min_length=1, max_length=4000)
    history: Optional[list[ChatMessage]] = None
    source: Optional[str] = Field(
        default=None,
        description="Calling portal identifier, used for logging only.",
    )


class ChatResponse(BaseModel):
    """Response body returned to the caller."""
    reply: str


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Teacher Support Chatbot Service",
    description="Standalone AI chatbot service for SpacECE India Foundation's Teacher Dashboard.",
    version="0.1.0",
)

# -- CORS --------------------------------------------------------------------
# Allow any origin for now so portals on different subdomains can call in.
# TODO: Lock allowed_origins to known SpacECE domains before production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -- Static files (serve the widget JS + example HTML) -----------------------
# This lets the example page load the widget directly from the service during
# local development.  In production the widget JS would likely be hosted on a
# CDN or copied into each portal's static assets.
_HERE = os.path.dirname(os.path.abspath(__file__))
app.mount("/static", StaticFiles(directory=_HERE), name="static")


# -- Health check -------------------------------------------------------------

@app.get("/api/v1/health")
async def health_check():
    """
    Lightweight liveness probe.  Returns 200 if the process is up.
    Does NOT verify the Groq API key — that would add latency and
    could mask transient upstream issues.
    """
    return {"status": "ok", "module": "teacher-support-chat"}


# -- Teacher Support Chat endpoint -------------------------------------------

# TODO: Add authentication middleware here once the shared layer's auth
#       strategy is finalized.
# TODO: Add rate-limiting (per-source or per-IP) once centralized rate-
#       limiting is in place.

@app.post("/api/v1/teacher-support-chat", response_model=ChatResponse)
async def teacher_support_chat(request: ChatRequest):
    """
    Accepts a teacher's question (plus optional conversation history)
    and returns a policy-grounded reply from Groq (Llama).

    This endpoint is stateless — all conversational context must be
    supplied by the caller via the `history` field.
    """
    messages = _build_messages(request)
    reply_text = _call_groq(messages)
    return ChatResponse(reply=reply_text)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _build_messages(request: ChatRequest) -> list[dict]:
    """
    Assemble the messages list for the Groq Chat Completions API.

    Prepends the system prompt, then the conversation history (if any),
    then the latest user message.
    """
    messages: list[dict] = [
        {"role": "system", "content": TEACHER_SUPPORT_SYSTEM_PROMPT},
    ]
    if request.history:
        for turn in request.history:
            messages.append({"role": turn.role, "content": turn.content})
    messages.append({"role": "user", "content": request.message})
    return messages


def _call_groq(messages: list[dict]) -> str:
    """
    Send messages to the Groq Chat Completions API and return the
    assistant's text.

    Uses the OpenAI SDK pointed at Groq's base URL, since Groq exposes
    an OpenAI-compatible endpoint.

    Raises an HTTPException-friendly error if the API key is missing or
    the upstream call fails.
    """
    if not GROQ_API_KEY:
        # Fail loudly during development so misconfiguration is obvious.
        from fastapi import HTTPException
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is not set. See README for setup instructions.",
        )

    client = OpenAI(api_key=GROQ_API_KEY, base_url=GROQ_BASE_URL)
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        max_tokens=MAX_TOKENS,
        messages=messages,
    )
    return response.choices[0].message.content
