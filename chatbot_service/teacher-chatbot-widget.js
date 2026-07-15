/**
 * SpacECE Teacher Support Chat Widget
 *
 * A self-contained, dependency-free chat widget that can be embedded into
 * any web page.  It renders its own UI inside a container element and
 * communicates with the Teacher Support Chat endpoint.
 *
 * Usage (in any HTML page):
 *
 *   <div id="teacher-chat"></div>
 *   <script src="teacher-chatbot-widget.js"></script>
 *   <script>
 *     TeacherChatWidget.init({
 *       container: '#teacher-chat',
 *       apiUrl:    'http://localhost:8000/api/v1/teacher-support-chat',
 *       source:    'teacher-dashboard'   // optional — for logging only
 *     });
 *   </script>
 */

;(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  CSS — injected once into <head> on first init() call              */
  /* ------------------------------------------------------------------ */

  var CSS_INJECTED = false;

  var WIDGET_CSS = /* css */ '\
    /* ---------- floating toggle button ---------- */\
    .sce-chat-toggle {\
      position: fixed;\
      bottom: 28px;\
      right: 28px;\
      width: 60px;\
      height: 60px;\
      border-radius: 50%;\
      border: none;\
      background: linear-gradient(135deg, #f59e0b, #d97706);\
      color: #fff;\
      font-size: 28px;\
      cursor: pointer;\
      box-shadow: 0 6px 24px rgba(217,119,6,.45);\
      z-index: 10000;\
      display: flex;\
      align-items: center;\
      justify-content: center;\
      transition: transform .2s ease, box-shadow .2s ease;\
    }\
    .sce-chat-toggle:hover {\
      transform: scale(1.08);\
      box-shadow: 0 8px 28px rgba(217,119,6,.55);\
    }\
    .sce-chat-toggle svg {\
      width: 28px;\
      height: 28px;\
      fill: currentColor;\
    }\
    \
    /* ---------- chat window ---------- */\
    .sce-chat-window {\
      position: fixed;\
      bottom: 100px;\
      right: 28px;\
      width: 380px;\
      max-width: calc(100vw - 32px);\
      height: 520px;\
      max-height: calc(100vh - 130px);\
      border-radius: 16px;\
      background: #fff;\
      box-shadow: 0 12px 48px rgba(0,0,0,.18);\
      display: flex;\
      flex-direction: column;\
      overflow: hidden;\
      z-index: 10001;\
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;\
      transition: opacity .25s ease, transform .25s ease;\
    }\
    .sce-chat-window.sce-hidden {\
      opacity: 0;\
      transform: translateY(20px) scale(.96);\
      pointer-events: none;\
    }\
    \
    /* ---------- header ---------- */\
    .sce-chat-header {\
      padding: 16px 18px;\
      background: linear-gradient(135deg, #f59e0b, #d97706);\
      color: #fff;\
      font-size: 15px;\
      font-weight: 600;\
      display: flex;\
      align-items: center;\
      justify-content: space-between;\
      flex-shrink: 0;\
    }\
    .sce-chat-header-title {\
      display: flex;\
      align-items: center;\
      gap: 8px;\
    }\
    .sce-chat-header-title svg {\
      width: 20px;\
      height: 20px;\
      fill: currentColor;\
      flex-shrink: 0;\
    }\
    .sce-chat-close {\
      background: none;\
      border: none;\
      color: rgba(255,255,255,.85);\
      font-size: 22px;\
      cursor: pointer;\
      line-height: 1;\
      padding: 0 2px;\
      transition: color .15s;\
    }\
    .sce-chat-close:hover { color: #fff; }\
    \
    /* ---------- messages area ---------- */\
    .sce-chat-messages {\
      flex: 1;\
      overflow-y: auto;\
      padding: 16px;\
      display: flex;\
      flex-direction: column;\
      gap: 12px;\
      background: #f8f9fb;\
    }\
    .sce-chat-messages::-webkit-scrollbar { width: 5px; }\
    .sce-chat-messages::-webkit-scrollbar-thumb {\
      background: #c5c8d4;\
      border-radius: 4px;\
    }\
    \
    /* ---------- individual message bubbles ---------- */\
    .sce-msg {\
      max-width: 82%;\
      padding: 10px 14px;\
      border-radius: 14px;\
      font-size: 14px;\
      line-height: 1.5;\
      word-wrap: break-word;\
      white-space: pre-wrap;\
      animation: sce-fade-in .25s ease;\
    }\
    @keyframes sce-fade-in {\
      from { opacity: 0; transform: translateY(6px); }\
      to   { opacity: 1; transform: translateY(0); }\
    }\
    .sce-msg-user {\
      align-self: flex-end;\
      background: linear-gradient(135deg, #f59e0b, #d97706);\
      color: #fff;\
      border-bottom-right-radius: 4px;\
    }\
    .sce-msg-assistant {\
      align-self: flex-start;\
      background: #fff;\
      color: #1e1e2f;\
      border: 1px solid #e5e7f0;\
      border-bottom-left-radius: 4px;\
    }\
    \
    /* ---------- typing indicator ---------- */\
    .sce-typing {\
      align-self: flex-start;\
      display: flex;\
      gap: 5px;\
      padding: 12px 16px;\
      background: #fff;\
      border: 1px solid #e5e7f0;\
      border-radius: 14px;\
      border-bottom-left-radius: 4px;\
    }\
    .sce-typing-dot {\
      width: 8px;\
      height: 8px;\
      border-radius: 50%;\
      background: #a0a3b5;\
      animation: sce-bounce .6s infinite alternate;\
    }\
    .sce-typing-dot:nth-child(2) { animation-delay: .15s; }\
    .sce-typing-dot:nth-child(3) { animation-delay: .3s; }\
    @keyframes sce-bounce {\
      to { transform: translateY(-5px); opacity: .5; }\
    }\
    \
    /* ---------- error message ---------- */\
    .sce-msg-error {\
      align-self: center;\
      background: #fef2f2;\
      color: #b91c1c;\
      border: 1px solid #fecaca;\
      border-radius: 10px;\
      padding: 8px 14px;\
      font-size: 13px;\
      text-align: center;\
    }\
    \
    /* ---------- input area ---------- */\
    .sce-chat-input-area {\
      display: flex;\
      align-items: center;\
      gap: 8px;\
      padding: 12px 14px;\
      border-top: 1px solid #e8e9f0;\
      background: #fff;\
      flex-shrink: 0;\
    }\
    .sce-chat-input {\
      flex: 1;\
      border: 1px solid #d1d5e0;\
      border-radius: 10px;\
      padding: 10px 14px;\
      font-size: 14px;\
      font-family: inherit;\
      outline: none;\
      resize: none;\
      min-height: 20px;\
      max-height: 80px;\
      transition: border-color .15s;\
    }\
    .sce-chat-input:focus {\
      border-color: #f59e0b;\
      box-shadow: 0 0 0 3px rgba(245,158,11,.15);\
    }\
    .sce-chat-send {\
      width: 40px;\
      height: 40px;\
      border-radius: 10px;\
      border: none;\
      background: linear-gradient(135deg, #f59e0b, #d97706);\
      color: #fff;\
      cursor: pointer;\
      display: flex;\
      align-items: center;\
      justify-content: center;\
      flex-shrink: 0;\
      transition: opacity .15s;\
    }\
    .sce-chat-send:disabled {\
      opacity: .45;\
      cursor: not-allowed;\
    }\
    .sce-chat-send svg {\
      width: 18px;\
      height: 18px;\
      fill: currentColor;\
    }\
    \
    /* ---------- welcome message ---------- */\
    .sce-welcome {\
      text-align: center;\
      color: #6b7280;\
      font-size: 13px;\
      padding: 18px 10px 4px;\
      line-height: 1.5;\
    }\
    .sce-welcome strong {\
      display: block;\
      font-size: 15px;\
      color: #374151;\
      margin-bottom: 4px;\
    }\
  ';

  function injectCSS() {
    if (CSS_INJECTED) return;
    var style = document.createElement('style');
    style.textContent = WIDGET_CSS;
    document.head.appendChild(style);
    CSS_INJECTED = true;
  }


  /* ------------------------------------------------------------------ */
  /*  SVG icons                                                         */
  /* ------------------------------------------------------------------ */

  var ICON_CHAT = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
  var ICON_CLOSE = '×';
  var ICON_BOT  = '<svg viewBox="0 0 24 24"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 110 2h-1v1a3 3 0 01-3 3H6a3 3 0 01-3-3v-1H2a1 1 0 110-2h1a7 7 0 017-7h1V5.73A2 2 0 0112 2zM9.5 14a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm5 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/></svg>';


  /* ------------------------------------------------------------------ */
  /*  Widget class                                                      */
  /* ------------------------------------------------------------------ */

  /**
   * @param {Object} opts
   * @param {string} opts.container  CSS selector for the container element.
   * @param {string} opts.apiUrl     Full URL of the chat endpoint.
   * @param {string} [opts.source]   Portal identifier (for logging only).
   */
  function Widget(opts) {
    this.apiUrl  = opts.apiUrl;
    this.source  = opts.source || null;
    this.history = [];           // conversation turns sent to backend
    this.busy    = false;        // true while waiting for a reply
    this.open    = false;

    this._container = typeof opts.container === 'string'
      ? document.querySelector(opts.container)
      : opts.container;

    if (!this._container) {
      console.error('[TeacherChatWidget] Container not found:', opts.container);
      return;
    }

    this._build();
  }


  /* ---- DOM construction ---- */

  Widget.prototype._build = function () {
    // Toggle button
    this._toggle = _el('button', 'sce-chat-toggle');
    this._toggle.innerHTML = ICON_CHAT;
    this._toggle.title = 'Open chat';
    this._toggle.addEventListener('click', this._onToggle.bind(this));

    // Chat window
    this._window = _el('div', 'sce-chat-window sce-hidden');

    // Header
    var header = _el('div', 'sce-chat-header');
    var titleWrap = _el('div', 'sce-chat-header-title');
    titleWrap.innerHTML = ICON_BOT + ' <span>Teacher Support</span>';
    var closeBtn = _el('button', 'sce-chat-close');
    closeBtn.innerHTML = ICON_CLOSE;
    closeBtn.title = 'Close chat';
    closeBtn.addEventListener('click', this._onToggle.bind(this));
    header.appendChild(titleWrap);
    header.appendChild(closeBtn);

    // Messages area
    this._messages = _el('div', 'sce-chat-messages');

    // Welcome message
    var welcome = _el('div', 'sce-welcome');
    welcome.innerHTML =
      '<strong>Hi there! 👋</strong>' +
      'I can help with questions about attendance rules, certificates, and course deadlines.';
    this._messages.appendChild(welcome);

    // Input area
    var inputArea = _el('div', 'sce-chat-input-area');
    this._input = document.createElement('textarea');
    this._input.className = 'sce-chat-input';
    this._input.placeholder = 'Ask a question…';
    this._input.rows = 1;
    this._input.addEventListener('keydown', this._onKeyDown.bind(this));
    this._input.addEventListener('input', this._autoResize.bind(this));

    this._sendBtn = _el('button', 'sce-chat-send');
    this._sendBtn.innerHTML = ICON_SEND;
    this._sendBtn.title = 'Send';
    this._sendBtn.addEventListener('click', this._onSend.bind(this));

    inputArea.appendChild(this._input);
    inputArea.appendChild(this._sendBtn);

    // Assemble
    this._window.appendChild(header);
    this._window.appendChild(this._messages);
    this._window.appendChild(inputArea);

    this._container.appendChild(this._toggle);
    this._container.appendChild(this._window);
  };


  /* ---- Event handlers ---- */

  Widget.prototype._onToggle = function () {
    this.open = !this.open;
    if (this.open) {
      this._window.classList.remove('sce-hidden');
      this._toggle.innerHTML = ICON_CLOSE;
      this._toggle.style.fontSize = '26px';
      setTimeout(function () { this._input.focus(); }.bind(this), 100);
    } else {
      this._window.classList.add('sce-hidden');
      this._toggle.innerHTML = ICON_CHAT;
      this._toggle.style.fontSize = '28px';
    }
  };

  Widget.prototype._onKeyDown = function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this._onSend();
    }
  };

  Widget.prototype._autoResize = function () {
    this._input.style.height = 'auto';
    this._input.style.height = Math.min(this._input.scrollHeight, 80) + 'px';
  };

  Widget.prototype._onSend = function () {
    var text = this._input.value.trim();
    if (!text || this.busy) return;

    this._input.value = '';
    this._input.style.height = 'auto';
    this._appendBubble(text, 'user');

    this.history.push({ role: 'user', content: text });
    this._fetchReply(text);
  };


  /* ---- Rendering helpers ---- */

  Widget.prototype._appendBubble = function (text, role) {
    var bubble = _el('div', 'sce-msg sce-msg-' + role);
    bubble.textContent = text;
    this._messages.appendChild(bubble);
    this._scrollToBottom();
    return bubble;
  };

  Widget.prototype._showTyping = function () {
    var el = _el('div', 'sce-typing');
    el.innerHTML =
      '<span class="sce-typing-dot"></span>' +
      '<span class="sce-typing-dot"></span>' +
      '<span class="sce-typing-dot"></span>';
    el.id = 'sce-typing-indicator';
    this._messages.appendChild(el);
    this._scrollToBottom();
  };

  Widget.prototype._hideTyping = function () {
    var el = document.getElementById('sce-typing-indicator');
    if (el) el.remove();
  };

  Widget.prototype._showError = function (msg) {
    var el = _el('div', 'sce-msg-error');
    el.textContent = msg;
    this._messages.appendChild(el);
    this._scrollToBottom();
  };

  Widget.prototype._scrollToBottom = function () {
    var m = this._messages;
    setTimeout(function () { m.scrollTop = m.scrollHeight; }, 30);
  };


  /* ---- API call ---- */

  Widget.prototype._fetchReply = function (message) {
    this.busy = true;
    this._sendBtn.disabled = true;
    this._showTyping();

    var body = { message: message };
    if (this.history.length > 1) {
      // Send all turns except the latest user message (already in `message`).
      body.history = this.history.slice(0, -1);
    }
    if (this.source) {
      body.source = this.source;
    }

    var self = this;

    fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (err) {
            throw new Error(err.detail || 'Server error (' + res.status + ')');
          });
        }
        return res.json();
      })
      .then(function (data) {
        self._hideTyping();
        self._appendBubble(data.reply, 'assistant');
        self.history.push({ role: 'assistant', content: data.reply });
      })
      .catch(function (err) {
        self._hideTyping();
        self._showError('Something went wrong: ' + err.message);
        // Remove the unanswered user turn so history stays consistent.
        self.history.pop();
      })
      .finally(function () {
        self.busy = false;
        self._sendBtn.disabled = false;
      });
  };


  /* ---- Utility ---- */

  function _el(tag, className) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    return el;
  }


  /* ------------------------------------------------------------------ */
  /*  Public API                                                        */
  /* ------------------------------------------------------------------ */

  global.TeacherChatWidget = {
    /**
     * Initialise a chat widget instance.
     *
     * @param {Object} opts
     * @param {string} opts.container  CSS selector or DOM element.
     * @param {string} opts.apiUrl     Teacher-support-chat endpoint URL.
     * @param {string} [opts.source]   Portal name (for server-side logging).
     * @returns {Widget}
     */
    init: function (opts) {
      if (!opts || !opts.container || !opts.apiUrl) {
        console.error(
          '[TeacherChatWidget] init() requires { container, apiUrl }.'
        );
        return null;
      }
      injectCSS();
      return new Widget(opts);
    },
  };

})(window);
