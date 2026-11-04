/*
 * Public site texts from GET api/site-content/{page}. Keys on the "about" page map to brand.{key}; other pages use the full data-i18n path
 * as the Key column. Applies after i18n init; API failures leave locales/az.js fallbacks untouched.
 */
(function () {
    function i18nKeyFor(page, key) {
        return page === "about" ? "brand." + key : key;
    }

    function setText(el, text) {
        var tag = (el.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea") {
            return;
        }
        if (!el.children.length || tag === "option") {
            el.textContent = text;
            return;
        }
        for (var i = 0; i < el.childNodes.length; i++) {
            var node = el.childNodes[i];
            if (node.nodeType === 3 && node.textContent.trim()) {
                var value = node.textContent;
                node.textContent = (value.match(/^\s*/) || [""])[0] + text + (value.match(/\s*$/) || [""])[0];
                return;
            }
        }
        if (["button", "label", "a", "span", "p", "h1", "h2", "h3", "h4", "li", "summary"].indexOf(tag) !== -1) {
            el.textContent = text;
        } else {
            el.setAttribute("aria-label", text);
        }
    }

    function applyOverlay(texts) {
        document.querySelectorAll("[data-i18n]").forEach(function (el) {
            var key = el.getAttribute("data-i18n");
            if (Object.prototype.hasOwnProperty.call(texts, key)) {
                setText(el, texts[key]);
            }
        });
        document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
            var key = el.getAttribute("data-i18n-placeholder");
            if (Object.prototype.hasOwnProperty.call(texts, key)) {
                el.setAttribute("placeholder", texts[key]);
            }
        });
        document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
            var key = el.getAttribute("data-i18n-aria");
            if (Object.prototype.hasOwnProperty.call(texts, key)) {
                el.setAttribute("aria-label", texts[key]);
            }
        });
    }

    function whenPageReady(fn) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", fn);
        } else {
            fn();
        }
    }

    function loadPages(pages) {
        if (!window.AEROVA_API || !Array.isArray(pages) || !pages.length) {
            return;
        }

        var requests = pages.map(function (page) {
            return window.AEROVA_API.get("api/site-content/" + page, { skipAuth: true }).then(function (items) {
                return { page: page, items: Array.isArray(items) ? items : [] };
            }).catch(function () {
                return { page: page, items: [] };
            });
        });

        Promise.all(requests).then(function (results) {
            var texts = {};
            results.forEach(function (result) {
                result.items.forEach(function (item) {
                    if (item.key && item.textAz) {
                        texts[i18nKeyFor(result.page, item.key)] = item.textAz;
                    }
                });
            });
            if (!Object.keys(texts).length) {
                return;
            }
            whenPageReady(function () {
                applyOverlay(texts);
            });
        });
    }

    window.AEROVA_loadCmsPages = loadPages;

    var auto = window.AEROVA_CMS_PAGES;
    if (auto) {
        loadPages(auto);
    }
})();
