/*
 * AEROVA theme manager: "light" (the default) or "dark".
 * It runs in the <head>, so html[data-theme] is set before the first paint and the page never flashes the wrong theme. The choice is kept in
 * localStorage, shared by every page (and every open tab), and the sun / moon button is added to the header of every page from here.
 * The colours themselves live in assets/css/theme.css.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "aerovaTheme";
  var THEMES = { light: true, dark: true };
  var root = document.documentElement;

  function read() {
    try {
      var saved = window.localStorage.getItem(STORAGE_KEY);
      return THEMES[saved] ? saved : "light";
    } catch (error) {
      return "light";
    }
  }

  function write(theme) {
    try { window.localStorage.setItem(STORAGE_KEY, theme); } catch (error) { /* the choice just lasts for this page */ }
  }

  function current() {
    return THEMES[root.getAttribute("data-theme")] ? root.getAttribute("data-theme") : "light";
  }

  function text(key, fallback) {
    var value = typeof window.t === "function" ? window.t(key) : null;
    return value && value !== key ? value : fallback;
  }

  function paintButtons() {
    var theme = current();
    var label = theme === "dark" ? text("theme.toLight", "Açıq rejimə keç") : text("theme.toDark", "Tünd rejimə keç");
    document.querySelectorAll(".theme-toggle").forEach(function (button) {
      button.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#07111d" : "#f6f1e7");
  }

  function apply(theme, animate) {
    if (!THEMES[theme]) theme = "light";
    if (animate) {
      root.classList.add("theme-switching");
      window.setTimeout(function () { root.classList.remove("theme-switching"); }, 450);
    }
    root.setAttribute("data-theme", theme);
    paintButtons();
    try {
      window.dispatchEvent(new CustomEvent("aerova:themechange", { detail: { theme: theme } }));
    } catch (error) { /* older browsers */ }
  }

  function setTheme(theme) {
    write(theme);
    apply(theme, true);
  }

  function toggle() {
    setTheme(current() === "dark" ? "light" : "dark");
  }

  function buildButton() {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle";
    button.innerHTML =
      '<svg class="theme-toggle-icon theme-toggle-icon--sun" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>' +
      '<svg class="theme-toggle-icon theme-toggle-icon--moon" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">' +
      '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>' +
      '<span class="theme-toggle-thumb" aria-hidden="true"></span>';
    button.addEventListener("click", toggle);
    return button;
  }

  /* The header of every kind of page gets the button: the site header, the sign-in header and the admin top bar. */
  function inject() {
    if (document.querySelector(".theme-toggle")) return;

    var actions = document.querySelector(".header-actions");
    if (actions) {
      var before = actions.querySelector(".trips-link, .login-button, .menu-toggle");
      if (before) actions.insertBefore(buildButton(), before);
      else actions.appendChild(buildButton());
      return;
    }

    var authHeader = document.querySelector(".auth-header");
    if (authHeader) {
      var link = authHeader.querySelector(".auth-header-link");
      var wrap = document.createElement("div");
      wrap.className = "auth-header-tools";
      wrap.style.cssText = "display:flex;align-items:center;gap:0.75rem";
      authHeader.insertBefore(wrap, link || null);
      wrap.appendChild(buildButton());
      if (link) wrap.appendChild(link);
      return;
    }

    var topbar = document.querySelector(".admin-topbar");
    if (topbar) {
      var meta = topbar.querySelector(".admin-topbar-meta");
      var group = meta ? meta.parentNode : topbar;
      group.insertBefore(buildButton(), meta || null);
    }
  }

  // Before the first paint.
  root.setAttribute("data-theme", read());

  window.addEventListener("storage", function (event) {
    if (event.key === STORAGE_KEY) apply(read(), true);
  });

  function ready() {
    inject();
    paintButtons();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();

  window.AEROVA_THEME = { get: current, set: setTheme, toggle: toggle };
})();
