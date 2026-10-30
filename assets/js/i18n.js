/*
 * AEROVA speaks Azerbaijani only. window.AEROVA_LOCALES.az (locales/az.js) holds every interface text; t("section.key", vars) returns it
 * and the data-i18n* attributes of a page are filled from it once the page is ready.
 */
(function () {
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

  function t(key, vars) {
    var value = getByPath(window.AEROVA_LOCALES && window.AEROVA_LOCALES.az, key);
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
      } else if (!el.children.length || tag === "option") {
        el.textContent = translated;
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
        if (!replaced && ["button", "label", "a", "span", "p", "h1", "h2", "h3", "h4", "li", "th", "td", "dt", "dd"].indexOf(tag) !== -1) {
          el.textContent = translated;
        } else if (!replaced) {
          el.setAttribute("aria-label", translated);
        }
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
  }

  function init() {
    // Earlier versions stored the visitor's language choice; there is nothing to choose any more.
    try { localStorage.removeItem("language"); localStorage.removeItem("aerovaLanguage"); } catch (e) {}
    document.documentElement.lang = "az";
    applyTranslations(document);
  }

  window.AEROVA_I18N = {
    t: t,
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
