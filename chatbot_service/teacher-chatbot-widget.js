/**
 * TeacherChatWidget — Embeddable, no-build-step, vanilla JS chat widget.
 *
 * Usage:
 *   <div id="teacher-chat"></div>
 *   <script src="http://localhost:8001/static/teacher-chatbot-widget.js"></script>
 *   <script>
 *     TeacherChatWidget.init({
 *       container: '#teacher-chat',
 *       apiUrl:    'http://localhost:8001/api/v1/teacher-support-chat',
 *       source:    'teacher-dashboard'
 *     });
 *   </script>
 */
(function () {
  "use strict";

  // ── CSS ──────────────────────────────────────────────────────
  const WIDGET_CSS = `
    .tcw-toggle {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      border: none;
      color: white;
      font-size: 26px;
      cursor: pointer;
      box-shadow: 0 4px 18px rgba(217,119,6,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .tcw-toggle:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 24px rgba(217,119,6,0.55);
    }

    .tcw-window {
      position: fixed;
      bottom: 92px;
      right: 24px;
      width: 360px;
      height: 480px;
      background: rgba(255,255,255,0.97);
      backdrop-filter: blur(14px);
      border: 1px solid #fbbf24;
      border-radius: 20px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.14);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 10000;
      animation: tcw-slideUp 0.3s ease;
      font-family: 'Segoe UI', 'Inter', -apple-system, sans-serif;
    }
    .tcw-window.tcw-open {
      display: flex;
    }

    @keyframes tcw-slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .tcw-header {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      padding: 16px 20px;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    .tcw-header-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .tcw-header-icon { font-size: 24px; }
    .tcw-header-title {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: -0.2px;
    }
    .tcw-header-sub {
      font-size: 10px;
      opacity: 0.85;
      font-weight: 700;
    }
    .tcw-close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }

    .tcw-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #fafbfc;
    }

    .tcw-msg {
      display: flex;
      max-width: 85%;
    }
    .tcw-msg-user {
      align-self: flex-end;
    }
    .tcw-msg-bot {
      align-self: flex-start;
    }
    .tcw-bubble {
      padding: 10px 14px;
      font-size: 12.5px;
      font-weight: 600;
      line-height: 1.5;
      word-wrap: break-word;
      white-space: pre-wrap;
    }
    .tcw-bubble-user {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      border-radius: 16px 16px 0 16px;
      box-shadow: 0 2px 8px rgba(217,119,6,0.2);
    }
    .tcw-bubble-bot {
      background: white;
      color: #1c1917;
      border-radius: 16px 16px 16px 0;
      border: 1px solid #f1f5f9;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03);
    }

    .tcw-typing {
      display: flex;
      gap: 4px;
      align-items: center;
      padding: 12px 18px;
      background: white;
      border-radius: 16px 16px 16px 0;
      border: 1px solid #f1f5f9;
      align-self: flex-start;
    }
    .tcw-dot {
      width: 6px;
      height: 6px;
      background: #d97706;
      border-radius: 50%;
      animation: tcw-bounce 1.4s infinite ease-in-out both;
    }
    .tcw-dot:nth-child(2) { animation-delay: 0.2s; }
    .tcw-dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes tcw-bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    .tcw-input-area {
      padding: 12px;
      background: white;
      border-top: 1px solid #f1f5f9;
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
    .tcw-input {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 600;
      outline: none;
      font-family: inherit;
      transition: border-color 0.2s;
    }
    .tcw-input:focus {
      border-color: #f59e0b;
    }
    .tcw-send-btn {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      border: none;
      color: white;
      border-radius: 10px;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 16px;
      box-shadow: 0 2px 6px rgba(217,119,6,0.3);
      transition: transform 0.15s;
      flex-shrink: 0;
    }
    .tcw-send-btn:hover {
      transform: scale(1.05);
    }
  `;

  // ── Widget ───────────────────────────────────────────────────
  function TeacherChatWidgetClass() {
    this._ready = false;
    this._apiUrl = "";
    this._source = "";
    this._history = [];
    this._open = false;
    this._els = {};
  }

  TeacherChatWidgetClass.prototype.init = function (opts) {
    if (this._ready) return;
    opts = opts || {};

    this._apiUrl = opts.apiUrl || "http://localhost:8001/api/v1/teacher-support-chat";
    this._source = opts.source || "unknown";

    // Inject CSS
    var style = document.createElement("style");
    style.textContent = WIDGET_CSS;
    document.head.appendChild(style);

    // Find container (or use body)
    var container = opts.container
      ? document.querySelector(opts.container)
      : document.body;
    if (!container) container = document.body;

    // Toggle button
    var toggle = document.createElement("button");
    toggle.className = "tcw-toggle";
    toggle.setAttribute("aria-label", "Open chat");
    toggle.textContent = "💬";
    container.appendChild(toggle);
    this._els.toggle = toggle;

    // Chat window
    var win = document.createElement("div");
    win.className = "tcw-window";
    win.innerHTML =
      '<div class="tcw-header">' +
        '<div class="tcw-header-info">' +
          '<span class="tcw-header-icon">🤖</span>' +
          "<div>" +
            '<div class="tcw-header-title">SpacECE Assistant</div>' +
            '<div class="tcw-header-sub">Online · Portal Helper</div>' +
          "</div>" +
        "</div>" +
        '<button class="tcw-close-btn" aria-label="Close chat">✕</button>' +
      "</div>" +
      '<div class="tcw-messages"></div>' +
      '<div class="tcw-input-area">' +
        '<input class="tcw-input" type="text" placeholder="Ask about attendance, courses..." />' +
        '<button class="tcw-send-btn" aria-label="Send">➔</button>' +
      "</div>";
    container.appendChild(win);
    this._els.win = win;

    this._els.messages = win.querySelector(".tcw-messages");
    this._els.input = win.querySelector(".tcw-input");
    this._els.sendBtn = win.querySelector(".tcw-send-btn");
    this._els.closeBtn = win.querySelector(".tcw-close-btn");

    // Events
    var self = this;
    toggle.addEventListener("click", function () {
      self._toggleOpen();
    });
    this._els.closeBtn.addEventListener("click", function () {
      self._toggleOpen(false);
    });
    this._els.sendBtn.addEventListener("click", function () {
      self._send();
    });
    this._els.input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") self._send();
    });

    // Add greeting
    this._addMessage(
      "bot",
      "Hello! 👋 I'm your SpacECE AI Assistant. How can I help you today with attendance, courses, lesson plans, or anything else?"
    );

    this._ready = true;
  };

  TeacherChatWidgetClass.prototype._toggleOpen = function (forceState) {
    this._open = typeof forceState === "boolean" ? forceState : !this._open;
    if (this._open) {
      this._els.win.classList.add("tcw-open");
      this._els.input.focus();
    } else {
      this._els.win.classList.remove("tcw-open");
    }
  };

  TeacherChatWidgetClass.prototype._addMessage = function (role, text) {
    var wrap = document.createElement("div");
    wrap.className = "tcw-msg " + (role === "user" ? "tcw-msg-user" : "tcw-msg-bot");
    var bubble = document.createElement("div");
    bubble.className =
      "tcw-bubble " + (role === "user" ? "tcw-bubble-user" : "tcw-bubble-bot");
    bubble.textContent = text;
    wrap.appendChild(bubble);
    this._els.messages.appendChild(wrap);
    this._els.messages.scrollTop = this._els.messages.scrollHeight;
  };

  TeacherChatWidgetClass.prototype._showTyping = function () {
    var el = document.createElement("div");
    el.className = "tcw-typing";
    el.id = "tcw-typing-indicator";
    el.innerHTML =
      '<span class="tcw-dot"></span>' +
      '<span class="tcw-dot"></span>' +
      '<span class="tcw-dot"></span>';
    this._els.messages.appendChild(el);
    this._els.messages.scrollTop = this._els.messages.scrollHeight;
  };

  TeacherChatWidgetClass.prototype._hideTyping = function () {
    var el = document.getElementById("tcw-typing-indicator");
    if (el) el.remove();
  };

  TeacherChatWidgetClass.prototype._send = function () {
    var text = (this._els.input.value || "").trim();
    if (!text) return;

    this._addMessage("user", text);
    this._els.input.value = "";

    // Add to history
    this._history.push({ role: "user", content: text });

    this._showTyping();
    var self = this;

    fetch(this._apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history: self._history.slice(-10), // last 10 messages for context
        source: self._source,
      }),
    })
      .then(function (resp) {
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        return resp.json();
      })
      .then(function (data) {
        self._hideTyping();
        var reply = (data && data.reply) || "Sorry, I could not get a response.";
        self._addMessage("bot", reply);
        self._history.push({ role: "assistant", content: reply });
      })
      .catch(function (err) {
        self._hideTyping();
        console.error("[TeacherChatWidget] Error:", err);
        self._addMessage(
          "bot",
          "I'm having trouble connecting. Please try again in a moment."
        );
      });
  };

  // ── Export ────────────────────────────────────────────────────
  window.TeacherChatWidget = new TeacherChatWidgetClass();
})();
