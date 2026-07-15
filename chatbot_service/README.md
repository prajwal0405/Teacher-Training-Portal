# Teacher Support Chatbot Service

A standalone, reusable AI chatbot that answers teacher-facing policy
questions (attendance rules, certificate turnaround, course deadlines)
over a single HTTP endpoint, backed by Google Gemini.

---

## Quick start

### 1. Install dependencies

```bash
cd chatbot_service
pip install fastapi uvicorn google-genai pydantic
```

### 2. Set your API key

```bash
export GEMINI_API_KEY="AIza..."
```

Optional overrides:

| Variable              | Default            | Notes                       |
|-----------------------|--------------------|-----------------------------|
| `GEMINI_MODEL`        | `gemini-2.0-flash` | Any Gemini model ID         |
| `CHATBOT_MAX_TOKENS`  | `1024`             | Max tokens per reply        |

### 3. Run the service

```bash
uvicorn main:app --reload --port 8000
```

### 4. Open the example page

Open `example-teacher-dashboard-embed.html` in your browser (or serve
it via the built-in static mount at
`http://localhost:8000/static/example-teacher-dashboard-embed.html`).

---

## API contract

### `POST /api/v1/teacher-support-chat`

**Request body**

```json
{
  "message": "When will my certificate be ready?",
  "history": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello! How can I help?" }
  ],
  "source": "teacher-dashboard"
}
```

| Field     | Type             | Required | Notes                                  |
|-----------|------------------|----------|----------------------------------------|
| `message` | string           | yes      | The teacher's latest question          |
| `history` | array of turns   | no       | Prior conversation turns for context   |
| `source`  | string           | no       | Calling portal name — logging only     |

Each turn in `history` has `{ "role": "user"|"assistant", "content": string }`.

**Response body**

```json
{
  "reply": "Certificates are typically ready within 3–5 working days..."
}
```

### `GET /api/v1/health`

Returns `{ "status": "ok", "module": "teacher-support-chat" }`.

---

## Embedding the widget in another portal

```html
<!-- 1. Container -->
<div id="teacher-chat"></div>

<!-- 2. Widget script (host it wherever makes sense) -->
<script src="teacher-chatbot-widget.js"></script>

<!-- 3. Init -->
<script>
  TeacherChatWidget.init({
    container: '#teacher-chat',
    apiUrl:    'https://ai.spacece.in/api/v1/teacher-support-chat',
    source:    'your-portal-name'
  });
</script>
```

No build step, no framework dependency.  The widget injects its own CSS
and renders a floating chat toggle + window.

---

## ⚠️ Policy text is a placeholder

The system prompt in `main.py` (`TEACHER_SUPPORT_SYSTEM_PROMPT`) contains
**draft policy text**.  Before going live:

1. Replace it with verified, coordinator-approved SpacECE policy.
2. Keep the "refuse-and-redirect" instruction block intact — it prevents
   the model from fabricating individual teacher data.

---

## Project structure

```
chatbot_service/
├── main.py                              # FastAPI app + system prompt
├── teacher-chatbot-widget.js            # Embeddable frontend widget
├── example-teacher-dashboard-embed.html # Demo page showing integration
└── README.md                            # This file
```

## A note on scope

This chatbot is a complete, standalone deliverable for this task and doesn't
depend on anything else being approved. Separately, I've also proposed a
broader Shared AI-Services Layer for the org (consolidating scattered AI
calls like the FLN translation call and Teacher Training assessment scoring
into one internal service). That proposal is still pending approval, so I've
kept this build independent of it — though the small-service, one-endpoint,
one-scoped-prompt pattern used here would happen to fit that direction if it
is approved later.
