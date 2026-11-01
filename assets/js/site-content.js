/*
 * The texts of the "AEROVA haqqında" page come from the database (GET api/site-content/about) so an admin can edit them.
 * The page ships with the Azerbaijani texts of locales/az.js already in place; this script only replaces an element's text when the API
 * has that key, so a slow or unreachable API leaves the page exactly as it was.
 */
(function () {
    var PAGE = "about";
    var PREFIX = "brand.";

    function setText(el, text) {
        if (!el.children.length) {
            el.textContent = text;
            return;
        }
        // An element that also holds markup (an icon, an arrow): replace its first text, as the i18n applier does.
        for (var i = 0; i < el.childNodes.length; i++) {
            var node = el.childNodes[i];
            if (node.nodeType === 3 && node.textContent.trim()) {
                var value = node.textContent;
                node.textContent = (value.match(/^\s*/) || [""])[0] + text + (value.match(/\s*$/) || [""])[0];
                return;
            }
        }
    }

    function apply(items) {
        var texts = {};
        items.forEach(function (item) {
            if (item.key && item.textAz) texts[PREFIX + item.key] = item.textAz;
        });

        document.querySelectorAll("[data-i18n]").forEach(function (el) {
            var key = el.getAttribute("data-i18n");
            if (Object.prototype.hasOwnProperty.call(texts, key)) setText(el, texts[key]);
        });
    }

    function load() {
        if (!window.AEROVA_API) return;
        window.AEROVA_API.get("api/site-content/" + PAGE, { skipAuth: true }).then(function (items) {
            if (!Array.isArray(items) || !items.length) return;
            // The i18n applier fills the page once it is ready; apply the database texts after it.
            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", function () { apply(items); });
            } else {
                apply(items);
            }
        }).catch(function () { /* the static texts stay */ });
    }

    load();
})();
