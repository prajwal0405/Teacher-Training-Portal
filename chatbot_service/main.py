"""
Teacher Support Chatbot — Standalone FastAPI Microservice (Groq API)

Provides a conversational AI assistant for teacher-facing policy Q&A.
Uses Groq API (LLaMA / Mixtral models) for inference.

Quick start:
    pip install fastapi uvicorn groq pydantic
    export GROQ_API_KEY=your_key_here
    uvicorn main:app --reload --port 8000
"""

import os
import logging
from typing import List, Optional
from dotenv import load_dotenv

# Load env from backend directory
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ── Logging ──────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("teacher-support-chat")

# ── Environment ──────────────────────────────────────────────────
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
CHATBOT_MAX_TOKENS = int(os.environ.get("CHATBOT_MAX_TOKENS", "1024"))

# ── System Prompt ────────────────────────────────────────────────
TEACHER_SUPPORT_SYSTEM_PROMPT = """
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
"""

# ── Pydantic Models ──────────────────────────────────────────────

class ChatHistoryItem(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatHistoryItem]] = None
    source: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str


class HealthResponse(BaseModel):
    status: str
    module: str


# ── FastAPI App ──────────────────────────────────────────────────
app = FastAPI(
    title="Teacher Support Chatbot",
    version="1.0.0",
    description="Standalone chatbot micro-service for teacher portal support.",
)

# Permissive CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routes ───────────────────────────────────────────────────────

@app.get("/api/v1/health", response_model=HealthResponse)
async def health_check():
    return {"status": "ok", "module": "teacher-support-chat"}


@app.post("/api/v1/teacher-support-chat", response_model=ChatResponse)
async def teacher_support_chat(req: ChatRequest):
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # Build message history
    messages = [{"role": "system", "content": TEACHER_SUPPORT_SYSTEM_PROMPT}]

    if req.history:
        for item in req.history:
            messages.append({"role": item.role, "content": item.content})

    messages.append({"role": "user", "content": req.message.strip()})

    # Check API key
    if not GROQ_API_KEY or GROQ_API_KEY.startswith("YOUR_") or "placeholder" in GROQ_API_KEY.lower():
        logger.warning("GROQ_API_KEY is missing or placeholder — returning canned response.")
        return ChatResponse(
            reply=(
                "I'm sorry, the AI service is not fully configured yet. "
                "Please contact the SpacECE coordinator for assistance, "
                "or check the relevant section of the portal for your query."
            )
        )

    try:
        import httpx

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "max_tokens": CHATBOT_MAX_TOKENS,
                    "messages": messages,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            reply = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()

            if not reply:
                raise ValueError("Empty reply from Groq API")

            return ChatResponse(reply=reply)

    except Exception as exc:
        logger.error("Groq API error: %s", exc)
        return ChatResponse(
            reply=(
                "I'm having a little trouble connecting right now. "
                "Please try again in a moment, or contact the SpacECE "
                "coordinator for immediate help."
            )
        )


# ── Serve static files (widget JS, example HTML) ────────────────
# Mount AFTER routes so /api/... takes priority.
_this_dir = os.path.dirname(os.path.abspath(__file__))
app.mount("/static", StaticFiles(directory=_this_dir), name="static")
