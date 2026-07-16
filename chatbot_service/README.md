# Teacher Support Chatbot — Standalone Microservice

A standalone FastAPI-based AI chatbot service for the SpacECE Teacher Training
Portal. Uses the **Groq API** (LLaMA / Mixtral models) for fast inference.

> **Note:** This is a standalone deliverable, independent of the main Express
> backend. It runs as its own service on a separate port.

---

## Quick Start

```bash
# 1. Install dependencies
pip install fastapi uvicorn httpx pydantic

# 2. Set your Groq API key
export GROQ_API_KEY=your_groq_api_key_here

# 3. (Optional) Override model / max tokens
export GROQ_MODEL=llama-3.3-70b-versatile
export CHATBOT_MAX_TOKENS=1024

# 4. Run the service
uvicorn main:app --reload --port 8001
```

The service will be available at `http://localhost:8001`.

---

## API Contract

### `POST /api/v1/teacher-support-chat`

**Request body:**

```json
{
  "message": "How do I mark attendance?",
  "history": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi! How can I help?" }
  ],
  "source": "teacher-dashboard"
}
```

| Field     | Type                     | Required | Description                            |
| --------- | ------------------------ | -------- | -------------------------------------- |
| `message` | `string`                 | ✅       | The user's latest message              |
| `history` | `array` of `{role, content}` | ❌   | Previous conversation turns            |
| `source`  | `string`                 | ❌       | Where the chat was initiated from      |

**Response:**

```json
{
  "reply": "To mark attendance, go to Daily Attendance in the sidebar..."
}
```

### `GET /api/v1/health`

Returns `{ "status": "ok", "module": "teacher-support-chat" }`.

---

## Embedding in the Teacher Dashboard

Add this snippet to any HTML page:

```html
<div id="teacher-chat"></div>
<script src="http://localhost:8001/static/teacher-chatbot-widget.js"></script>
<script>
  TeacherChatWidget.init({
    container: '#teacher-chat',
    apiUrl:    'http://localhost:8001/api/v1/teacher-support-chat',
    source:    'teacher-dashboard'
  });
</script>
```

The widget injects its own CSS and renders a floating chat bubble in the
bottom-right corner. No build step or framework required.

See `example-teacher-dashboard-embed.html` for a working demo.

---

## File Structure

```
chatbot_service/
├── main.py                              # FastAPI application
├── teacher-chatbot-widget.js            # Embeddable vanilla-JS widget
├── example-teacher-dashboard-embed.html # Demo page
└── README.md                            # This file
```

---

## System Prompt

The chatbot uses a system prompt (`TEACHER_SUPPORT_SYSTEM_PROMPT` in `main.py`)
that covers:

- Attendance rules (geo-tagged, daily before 9:30 AM)
- Certificate turnaround (7 working days)
- Course deadlines and extension requests
- Assignment review process
- An explicit "refuse and redirect" instruction to prevent fabricating
  individual teacher data

> ⚠️ **DRAFT** — The system prompt is a placeholder that needs coordinator
> approval before going live.
