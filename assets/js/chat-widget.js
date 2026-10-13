/* AEROVA AI travel assistant widget. Talks to POST {AEROVA_API.baseUrl}/api/chat. */
(function () {
  "use strict";

  var HISTORY_KEY = "aerovaChatHistory";
  var OPEN_KEY = "aerovaChatOpen";
  var MAX_MESSAGES = 20;
  var MAX_MESSAGE_LENGTH = 2000;
  var MAX_TOTAL_LENGTH = 12000;
  var MAX_STORED = 40;

  var state = { sending: false, history: [], els: {} };

  function tr(key, fallback) {
    var value = typeof window.t === "function" ? window.t("chat." + key) : null;
    return value && value !== "chat." + key ? value : fallback;
  }

  function language() {
    var lang = window.AEROVA_I18N && typeof window.AEROVA_I18N.getLanguage === "function"
      ? window.AEROVA_I18N.getLanguage() : "en";
    return ["en", "az", "ru"].indexOf(lang) === -1 ? "en" : lang;
  }

  function loadHistory() {
    try {
      var parsed = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (m) {
        return m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim();
      }).slice(-MAX_STORED);
    } catch (e) {
      return [];
    }
  }

  function saveHistory() {
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(state.history.slice(-MAX_STORED)));
    } catch (e) {}
  }

  function payloadMessages() {
    var messages = state.history.slice(-MAX_MESSAGES).map(function (m) {
      return { role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) };
    });
    var total = messages.reduce(function (sum, m) { return sum + m.content.length; }, 0);
    while (messages.length > 1 && total > MAX_TOTAL_LENGTH) {
      total -= messages.shift().content.length;
    }
    return messages;
  }

  function el(tag, className, attrs) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    Object.keys(attrs || {}).forEach(function (name) { node.setAttribute(name, attrs[name]); });
    return node;
  }

  var ICON_CHAT = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 8.5h8M8 11.5h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  var ICON_CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12l15-7-5.5 15-2.5-6.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';

  function build() {
    var root = el("div", "aerova-chat", { id: "aerova-chat" });

    var launcher = el("button", "aerova-chat__launcher", {
      type: "button", id: "aerova-chat-launcher", "aria-controls": "aerova-chat-panel", "aria-expanded": "false"
    });
    launcher.innerHTML = ICON_CHAT + '<span class="aerova-chat__launcher-label"></span>';

    var panel = el("section", "aerova-chat__panel", {
      id: "aerova-chat-panel", role: "dialog", "aria-modal": "false", "aria-labelledby": "aerova-chat-title"
    });
    panel.hidden = true;

    var header = el("header", "aerova-chat__header");
    var heading = el("div", "aerova-chat__heading");
    var eyebrow = el("p", "aerova-chat__eyebrow");
    var title = el("h2", "aerova-chat__title", { id: "aerova-chat-title" });
    var subtitle = el("p", "aerova-chat__subtitle");
    heading.appendChild(eyebrow);
    heading.appendChild(title);
    heading.appendChild(subtitle);
    var actions = el("div", "aerova-chat__actions");
    var clear = el("button", "aerova-chat__clear", { type: "button", id: "aerova-chat-clear" });
    var close = el("button", "aerova-chat__close", { type: "button", id: "aerova-chat-close" });
    close.innerHTML = ICON_CLOSE;
    actions.appendChild(clear);
    actions.appendChild(close);
    header.appendChild(heading);
    header.appendChild(actions);

    var log = el("ol", "aerova-chat__log", { id: "aerova-chat-log", "aria-live": "polite", "aria-relevant": "additions" });

    var status = el("p", "aerova-chat__error", { id: "aerova-chat-error", role: "alert" });
    status.hidden = true;

    var form = el("form", "aerova-chat__form", { id: "aerova-chat-form", novalidate: "" });
    var label = el("label", "aerova-chat__sr", { for: "aerova-chat-input" });
    var input = el("textarea", "aerova-chat__input", {
      id: "aerova-chat-input", rows: "1", maxlength: String(MAX_MESSAGE_LENGTH), autocomplete: "off"
    });
    var send = el("button", "aerova-chat__send", { type: "submit", id: "aerova-chat-send" });
    send.innerHTML = ICON_SEND + '<span class="aerova-chat__send-label"></span>';
    form.appendChild(label);
    form.appendChild(input);
    form.appendChild(send);

    var disclaimer = el("p", "aerova-chat__disclaimer");

    panel.appendChild(header);
    panel.appendChild(log);
    panel.appendChild(status);
    panel.appendChild(form);
    panel.appendChild(disclaimer);

    root.appendChild(panel);
    root.appendChild(launcher);
    document.body.appendChild(root);

    state.els = {
      root: root, launcher: launcher, panel: panel, eyebrow: eyebrow, title: title, subtitle: subtitle,
      clear: clear, close: close, log: log, status: status, form: form, label: label,
      input: input, send: send, disclaimer: disclaimer
    };
  }

  function applyText() {
    var e = state.els;
    e.launcher.querySelector(".aerova-chat__launcher-label").textContent = tr("launcher", "Ask AEROVA");
    e.launcher.setAttribute("aria-label", tr("open", "Open travel assistant"));
    e.eyebrow.textContent = tr("eyebrow", "AEROVA Concierge");
    e.title.textContent = tr("title", "Travel assistant");
    e.subtitle.textContent = tr("subtitle", "AI answers to your travel questions");
    e.clear.textContent = tr("clear", "Clear");
    e.clear.setAttribute("aria-label", tr("clearLabel", "Clear conversation"));
    e.close.setAttribute("aria-label", tr("close", "Close travel assistant"));
    e.label.textContent = tr("inputLabel", "Your message");
    e.input.setAttribute("placeholder", tr("placeholder", "Ask about baggage, destinations, check-in..."));
    e.send.querySelector(".aerova-chat__send-label").textContent = tr("send", "Send");
    e.send.setAttribute("aria-label", tr("send", "Send"));
    e.disclaimer.textContent = tr("disclaimer", "AI can make mistakes. It cannot book, change or cancel trips or verify documents.");
    e.log.setAttribute("aria-label", tr("logLabel", "Conversation"));
    renderLog();
  }

  function messageItem(role, text, extraClass) {
    var item = el("li", "aerova-chat__message aerova-chat__message--" + role + (extraClass ? " " + extraClass : ""));
    var who = el("span", "aerova-chat__sr");
    who.textContent = role === "user" ? tr("you", "You") : tr("assistantName", "AEROVA assistant");
    var bubble = el("p", "aerova-chat__bubble");
    bubble.textContent = text;
    item.appendChild(who);
    item.appendChild(bubble);
    return item;
  }

  function renderLog() {
    var log = state.els.log;
    log.innerHTML = "";
    log.appendChild(messageItem("assistant", tr("welcome", "Hello! I am the AEROVA travel assistant. How can I help with your trip today?"), "aerova-chat__message--welcome"));
    state.history.forEach(function (m) { log.appendChild(messageItem(m.role, m.content)); });
    if (state.sending) log.appendChild(typingItem());
    scrollToBottom();
  }

  function typingItem() {
    var item = el("li", "aerova-chat__message aerova-chat__message--assistant aerova-chat__typing", { id: "aerova-chat-typing" });
    var label = el("span", "aerova-chat__sr");
    label.textContent = tr("typing", "Assistant is typing...");
    var dots = el("p", "aerova-chat__bubble aerova-chat__dots", { "aria-hidden": "true" });
    dots.innerHTML = "<span></span><span></span><span></span>";
    item.appendChild(label);
    item.appendChild(dots);
    return item;
  }

  function scrollToBottom() {
    var log = state.els.log;
    log.scrollTop = log.scrollHeight;
  }

  function setError(message) {
    var status = state.els.status;
    status.textContent = message || "";
    status.hidden = !message;
  }

  function setSending(sending) {
    state.sending = sending;
    var e = state.els;
    e.send.disabled = sending;
    e.root.classList.toggle("is-sending", sending);
    e.panel.setAttribute("aria-busy", sending ? "true" : "false");
    var typing = document.getElementById("aerova-chat-typing");
    if (sending && !typing) {
      e.log.appendChild(typingItem());
      scrollToBottom();
    } else if (!sending && typing) {
      typing.remove();
    }
  }

  function autosize() {
    var input = state.els.input;
    var max = parseFloat(getComputedStyle(input).maxHeight) || 120;
    input.style.height = "auto";
    var needed = input.scrollHeight;
    input.style.height = Math.min(needed, max) + "px";
    /* Show a scrollbar only once the text no longer fits at max-height. */
    input.classList.toggle("is-scrollable", needed > max + 1);
  }

  function errorMessage(status, body) {
    if (status === 503) return tr("errors.notConfigured", "The assistant is not available right now. Please try again later.");
    if (status === 429) return tr("errors.rateLimited", "You are sending messages too quickly. Please wait a minute and try again.");
    if (status === 400) return tr("errors.invalid", "That message could not be sent. Please shorten it and try again.");
    if (status === 504) return tr("errors.timeout", "The assistant took too long to answer. Please try again.");
    if (status === 0) return tr("errors.network", "Cannot reach the assistant. Check your connection or try again later.");
    return tr("errors.generic", "Something went wrong. Please try again.");
  }

  function sendMessage(text) {
    if (state.sending) return;
    var content = String(text || "").trim();
    if (!content) {
      setError(tr("errors.empty", "Please type a message."));
      state.els.input.focus();
      return;
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      setError(tr("errors.tooLong", "Your message is too long."));
      return;
    }

    setError("");
    state.history.push({ role: "user", content: content });
    saveHistory();
    state.els.log.appendChild(messageItem("user", content));
    state.els.input.value = "";
    autosize();
    setSending(true);

    var api = window.AEROVA_API || { baseUrl: "http://localhost:5080", chatPath: "/api/chat", timeoutMs: 45000 };
    var url = String(api.baseUrl).replace(/\/+$/, "") + api.chatPath;
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, api.timeoutMs || 45000) : null;

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: language(), messages: payloadMessages() }),
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      return response.json().catch(function () { return null; }).then(function (body) {
        return { status: response.status, ok: response.ok, body: body };
      });
    }, function (err) {
      return { status: err && err.name === "AbortError" ? 504 : 0, ok: false, body: null };
    }).then(function (result) {
      if (timer) clearTimeout(timer);
      var reply = result.ok && result.body && typeof result.body.reply === "string" ? result.body.reply.trim() : "";
      if (reply) {
        state.history.push({ role: "assistant", content: reply });
        saveHistory();
        setSending(false);
        state.els.log.appendChild(messageItem("assistant", reply));
        scrollToBottom();
      } else {
        /* Roll back the unanswered message so it can be retried without duplicates. */
        state.history.pop();
        saveHistory();
        setSending(false);
        renderLog();
        state.els.input.value = content;
        autosize();
        setError(errorMessage(result.ok ? -1 : result.status, result.body));
      }
      state.els.input.focus();
    });
  }

  function setOpen(open, focus) {
    var e = state.els;
    e.panel.hidden = !open;
    e.root.classList.toggle("is-open", open);
    e.launcher.setAttribute("aria-expanded", open ? "true" : "false");
    try { sessionStorage.setItem(OPEN_KEY, open ? "1" : "0"); } catch (err) {}
    if (open) {
      scrollToBottom();
      if (focus !== false) e.input.focus();
    } else if (focus !== false) {
      e.launcher.focus();
    }
  }

  function bind() {
    var e = state.els;
    e.launcher.addEventListener("click", function () { setOpen(e.panel.hidden); });
    e.close.addEventListener("click", function () { setOpen(false); });
    e.clear.addEventListener("click", function () {
      if (state.sending) return;
      state.history = [];
      saveHistory();
      setError("");
      renderLog();
      e.input.focus();
    });
    e.form.addEventListener("submit", function (event) {
      event.preventDefault();
      sendMessage(e.input.value);
    });
    e.input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
        event.preventDefault();
        sendMessage(e.input.value);
      }
    });
    e.input.addEventListener("input", function () {
      autosize();
      if (!e.status.hidden) setError("");
    });
    e.panel.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    });
    window.addEventListener("aerova:languagechange", applyText);
  }

  function init() {
    if (document.getElementById("aerova-chat")) return;
    state.history = loadHistory();
    build();
    applyText();
    bind();
    var wasOpen = false;
    try { wasOpen = sessionStorage.getItem(OPEN_KEY) === "1"; } catch (err) {}
    if (wasOpen) setOpen(true, false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
