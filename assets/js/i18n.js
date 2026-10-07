(function () {
  var STORAGE_KEY = "language";
  var LEGACY_KEY = "aerovaLanguage";
  var SUPPORTED = { en: true, az: true, ru: true };
  var ORDER = ["en", "az", "ru"];

  function getDict(lang) {
    var all = window.AEROVA_LOCALES || {};
    return all[lang] || all.en || {};
  }

  function getByPath(obj, path) {
    if (!obj || !path) return undefined;
    var parts = String(path).split(".");
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null || typeof cur !== "object") return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function interpolate(str, vars) {
    if (!vars) return String(str);
    return String(str).replace(/\{(\w+)\}/g, function (_, key) {
      return vars[key] != null ? String(vars[key]) : "{" + key + "}";
    });
  }

  function normalizeLang(lang) {
    lang = String(lang || "").toLowerCase();
    return SUPPORTED[lang] ? lang : "en";
  }

  function readStoredLanguage() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved == null || saved === "") {
        var legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          saved = legacy;
          try { localStorage.setItem(STORAGE_KEY, normalizeLang(legacy)); } catch (e1) {}
        } else {
          return "en";
        }
      }
      return normalizeLang(saved);
    } catch (e) {
      return "en";
    }
  }

  function writeStoredLanguage(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      localStorage.setItem(LEGACY_KEY, lang);
    } catch (e) {}
  }

  var currentLang = readStoredLanguage();

  function t(key, vars) {
    var value = getByPath(getDict(currentLang), key);
    if (value == null) value = getByPath(getDict("en"), key);
    if (value == null) return key;
    return interpolate(value, vars);
  }

  function applyToElement(el) {
    if (!el || el.nodeType !== 1) return;
    var key = el.getAttribute("data-i18n");
    if (key) {
      var translated = t(key);
      var tag = (el.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") {
        /* textContent not used; placeholders/values handled below */
      } else if (!el.children.length || tag === "option" || tag === "button" || tag === "label" || tag === "a" || tag === "span" || tag === "p" || tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4" || tag === "li" || tag === "th" || tag === "td" || tag === "dt" || tag === "dd") {
        if (!el.children.length || tag === "option") {
          el.textContent = translated;
        } else {
          var replacedSimple = false;
          for (var s = 0; s < el.childNodes.length; s++) {
            if (el.childNodes[s].nodeType === 3 && el.childNodes[s].textContent.trim()) {
              el.childNodes[s].textContent = (el.childNodes[s].textContent.match(/^\s*/) || [""])[0] + translated + (el.childNodes[s].textContent.match(/\s*$/) || [""])[0];
              replacedSimple = true;
              break;
            }
          }
          if (!replacedSimple) el.textContent = translated;
        }
      } else {
        var replaced = false;
        for (var i = 0; i < el.childNodes.length; i++) {
          var node = el.childNodes[i];
          if (node.nodeType === 3 && node.textContent.trim()) {
            node.textContent = (node.textContent.match(/^\s*/) || [""])[0] + translated + (node.textContent.match(/\s*$/) || [""])[0];
            replaced = true;
            break;
          }
        }
        if (!replaced) el.setAttribute("aria-label", translated);
      }
    }
    var htmlKey = el.getAttribute("data-i18n-html");
    if (htmlKey) el.innerHTML = t(htmlKey);
    var ph = el.getAttribute("data-i18n-placeholder");
    if (ph) el.setAttribute("placeholder", t(ph));
    var aria = el.getAttribute("data-i18n-aria");
    if (aria) el.setAttribute("aria-label", t(aria));
    var title = el.getAttribute("data-i18n-title");
    if (title) el.setAttribute("title", t(title));
    var valueKey = el.getAttribute("data-i18n-value");
    if (valueKey) el.value = t(valueKey);
  }

  function applyTranslations(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var nodes = scope.querySelectorAll("[data-i18n],[data-i18n-html],[data-i18n-placeholder],[data-i18n-aria],[data-i18n-title],[data-i18n-value]");
    for (var i = 0; i < nodes.length; i++) applyToElement(nodes[i]);
    document.querySelectorAll("[data-lang-switcher] .lang-switcher-btn").forEach(function (btn) {
      var active = btn.getAttribute("data-lang") === currentLang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    document.querySelectorAll("[data-lang-switcher]").forEach(function (g) {
      g.setAttribute("aria-label", t("common.language"));
    });
  }

  function buildSwitcher() {
    var wrap = document.createElement("div");
    wrap.className = "lang-switcher";
    wrap.setAttribute("data-lang-switcher", "");
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", t("common.language"));
    ORDER.forEach(function (code, index) {
      if (index > 0) {
        var divider = document.createElement("span");
        divider.className = "lang-switcher-divider";
        divider.setAttribute("aria-hidden", "true");
        wrap.appendChild(divider);
      }
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lang-switcher-btn" + (code === currentLang ? " is-active" : "");
      btn.setAttribute("data-lang", code);
      btn.setAttribute("aria-pressed", code === currentLang ? "true" : "false");
      btn.textContent = code.toUpperCase();
      btn.addEventListener("click", function () { setLanguage(code); });
      wrap.appendChild(btn);
    });
    return wrap;
  }

  function injectSwitcher() {
    var existing = document.querySelector("[data-lang-switcher]");
    if (existing) {
      // rebuild to ensure EN|AZ|RU order and active state
      var parent = existing.parentNode;
      if (parent) {
        var next = buildSwitcher();
        parent.replaceChild(next, existing);
      }
      return;
    }
    var headerActions = document.querySelector(".header-actions");
    if (headerActions) {
      var switcher = buildSwitcher();
      var insertBefore = headerActions.querySelector(".trips-link, .search-button, .login-button, .menu-toggle");
      if (insertBefore) headerActions.insertBefore(switcher, insertBefore);
      else headerActions.appendChild(switcher);
      return;
    }
    var authHeader = document.querySelector(".auth-header");
    if (authHeader) {
      var authLink = authHeader.querySelector(".auth-header-link");
      var sw = buildSwitcher();
      if (authLink) authHeader.insertBefore(sw, authLink);
      else authHeader.appendChild(sw);
      return;
    }
    var adminTopbar = document.querySelector(".admin-topbar");
    if (adminTopbar) {
      var meta = adminTopbar.querySelector(".admin-topbar-meta");
      var sw2 = buildSwitcher();
      if (meta && meta.parentNode) {
        var wrap = meta.parentNode.querySelector(".admin-topbar-meta-wrap");
        if (!wrap) {
          wrap = document.createElement("div");
          wrap.className = "admin-topbar-meta-wrap";
          meta.parentNode.insertBefore(wrap, meta);
          wrap.appendChild(meta);
        }
        wrap.insertBefore(sw2, wrap.firstChild);
      } else adminTopbar.appendChild(sw2);
    }
  }

  function setLanguage(lang) {
    currentLang = normalizeLang(lang);
    writeStoredLanguage(currentLang);
    document.documentElement.lang = currentLang === "az" ? "az" : currentLang;
    injectSwitcher();
    applyTranslations(document);
    try {
      window.dispatchEvent(new CustomEvent("aerova:languagechange", { detail: { language: currentLang } }));
    } catch (e) {}
  }

  function getLanguage() { return currentLang; }

  function init() {
    if (!SUPPORTED[currentLang]) currentLang = "en";
    document.documentElement.lang = currentLang === "az" ? "az" : currentLang;
    injectSwitcher();
    applyTranslations(document);
  }

  window.AEROVA_I18N = {
    t: t,
    getLanguage: getLanguage,
    setLanguage: setLanguage,
    applyTranslations: applyTranslations,
    init: init
  };
  window.t = t;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
