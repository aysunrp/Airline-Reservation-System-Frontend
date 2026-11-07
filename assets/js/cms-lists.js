/*
 * What the admin panel manages as lists and links, shown on the public pages:
 *   - the home page cards ("why" and "premium") from GET api/home-cards;
 *   - the support page questions from GET api/faq;
 *   - the hero button link and the social links of the footer, and the contact details, from GET api/site-content/site.
 * Each list replaces the markup that is written in the page only after the API has answered; if the API cannot be reached the markup of the
 * page stays as it is. A card or question that is switched off in the admin panel is not returned, so it is not drawn.
 * Needs api-config.js and api-client.js.
 */
(function () {
    "use strict";

    var api = window.AEROVA_API;
    if (!api || typeof api.get !== "function") {
        return;
    }

    var ICONS = {
        booking: '<path d="M4 8.5h16v8H4z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 8.5v8M9.5 12.5h5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
        seat: '<path d="M8 4.5h5.2A2.3 2.3 0 0 1 15.5 6.8V12H8V4.5z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 12h11v2.8a2.2 2.2 0 0 1-2.2 2.2H8.7a2.2 2.2 0 0 1-2.2-2.2V12zM9 19.5h6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
        trips: '<rect x="4" y="7" width="16" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9 7V5.5h6V7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
        status: '<circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 8.2V12l2.8 1.8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
        premium: '<path d="M12 3.5 18.5 10 12 20.5 5.5 10 12 3.5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
        support: '<path d="M5.5 13a6.5 6.5 0 0 1 13 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M5.5 13.2v3.3A1.8 1.8 0 0 0 7.3 18.3H8.5v-5.1H7.3a1.8 1.8 0 0 0-1.8 1.8zM18.5 13.2v3.3a1.8 1.8 0 0 1-1.8 1.8H15.5v-5.1h1.2a1.8 1.8 0 0 1 1.8 1.8z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'
    };

    function esc(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    /* A page of this site or an https address; anything else (a script, another scheme) is never put in a link. */
    function safeLink(url) {
        var text = String(url || "").trim();
        if (/^[a-z0-9-]+\.html(#[A-Za-z0-9_-]+)?(\?[\w=&%.-]*)?$/.test(text) || (/^https:\/\//i.test(text) && !/\s/.test(text))) {
            return text;
        }
        return "";
    }

    /* A path of the site (assets/...) is used as it is; an uploaded file (/media/...) is loaded from the API. */
    function imageSrc(url) {
        var text = String(url || "").trim();
        if (!text) return "";
        if (/^https?:\/\//i.test(text) || text.indexOf("assets/") === 0) return text;
        return text.charAt(0) === "/" && typeof api.url === "function" ? api.url(text) : text;
    }

    function whyCard(card) {
        var href = safeLink(card.linkUrl);
        var tag = href ? "a" : "article";
        var icon = ICONS[card.iconKey] || ICONS.premium;
        return "<" + tag + ' class="why-aerova-card"' + (href ? ' href="' + esc(href) + '"' : "") + ">" +
            '<span class="why-aerova-icon" aria-hidden="true"><svg viewBox="0 0 24 24">' + icon + "</svg></span>" +
            '<h3 class="why-aerova-card-title">' + esc(card.title) + "</h3>" +
            '<p class="why-aerova-card-description">' + esc(card.description) + "</p>" +
            (card.linkText ? '<span class="why-aerova-card-link"><span>' + esc(card.linkText) + '</span> <span class="why-aerova-card-arrow" aria-hidden="true">&rarr;</span></span>' : "") +
            "</" + tag + ">";
    }

    function premiumCard(card) {
        var href = safeLink(card.linkUrl);
        var tag = href ? "a" : "article";
        var src = imageSrc(card.imageUrl);
        return "<" + tag + ' class="premium-experience-card"' + (href ? ' href="' + esc(href) + '"' : "") + ">" +
            (src ? '<img class="premium-experience-image" src="' + esc(src) + '" alt="' + esc(card.imageAlt || card.title) + '" loading="lazy" decoding="async">' : "") +
            '<div class="premium-experience-content">' +
            (card.label ? '<p class="premium-experience-label" aria-hidden="true">' + esc(card.label) + "</p>" : "") +
            '<h3 class="premium-experience-card-title">' + esc(card.title) + "</h3>" +
            '<p class="premium-experience-card-description">' + esc(card.description) + "</p>" +
            (card.linkText ? '<span class="premium-experience-link"><span>' + esc(card.linkText) + '</span> <span class="premium-experience-link-arrow" aria-hidden="true">&rarr;</span></span>' : "") +
            "</div></" + tag + ">";
    }

    function renderCards(selector, section, build) {
        var grid = document.querySelector(selector);
        if (!grid) return;
        api.get("api/home-cards", { skipAuth: true, query: { section: section } }).then(function (cards) {
            if (!Array.isArray(cards)) return;
            grid.innerHTML = cards.map(build).join("");
        }, function () { /* the cards written in the page stay */ });
    }

    function renderFaq() {
        var section = document.getElementById("faq");
        if (!section) return;
        api.get("api/faq", { skipAuth: true }).then(function (items) {
            if (!Array.isArray(items)) return;
            section.querySelectorAll("details.sp-faq-item").forEach(function (node) { node.parentNode.removeChild(node); });
            section.insertAdjacentHTML("beforeend", items.map(function (item) {
                return '<details class="sp-faq-item"><summary>' + esc(item.question) + "</summary><p>" + esc(item.answer) + "</p></details>";
            }).join(""));
        }, function () { /* the questions written in the page stay */ });
    }

    var SOCIAL = { facebook: "Facebook", instagram: "Instagram", x: "X", youtube: "YouTube", linkedin: "LinkedIn" };

    /* Header and footer links: label, address, visibility and order from the admin panel (keys link.{data-i18n key}.label|url|visible|order). */
    function applyLinkSettings(settings) {
        var lists = {};
        document.querySelectorAll("#primary-navigation a[data-i18n], .footer-links a[data-i18n], .footer-legal a[data-i18n]").forEach(function (link) {
            var id = link.getAttribute("data-i18n");
            var prefix = "link." + id + ".";
            var label = settings[prefix + "label"];
            var url = safeLink(settings[prefix + "url"]);
            var item = link.closest("li") || link;
            if (label) {
                link.removeAttribute("data-i18n");
                link.textContent = label;
            }
            if (url) link.setAttribute("href", url);
            if (settings[prefix + "visible"] === "0") item.style.display = "none";
            var list = item.parentNode;
            if (list && settings[prefix + "order"] != null && /^-?\d+$/.test(settings[prefix + "order"])) {
                (lists[list.id || list.className] = lists[list.id || list.className] || { list: list, items: [] }).items.push({ node: item, order: parseInt(settings[prefix + "order"], 10), index: lists[list.id || list.className] ? lists[list.id || list.className].items.length : 0 });
            }
        });
        Object.keys(lists).forEach(function (name) {
            var group = lists[name];
            var all = Array.prototype.slice.call(group.list.children);
            var ordered = all.map(function (node, index) {
                var found = group.items.filter(function (it) { return it.node === node; })[0];
                return { node: node, key: found ? found.order : index, index: index };
            }).sort(function (x, y) { return x.key - y.key || x.index - y.index; });
            ordered.forEach(function (entry) { group.list.appendChild(entry.node); });
        });
    }

    /* The logo and the pictures with a fixed place on a page (image.{slot} rows of the site page, uploaded in the admin media library). */
    var SLOT_TARGETS = {
        "about.hero": 'img[src*="hero-aircraft"]',
        "about.economy": '.brand-class__media img[src*="economy-class"]',
        "about.comfort": '.brand-class__media img[src*="comfort"]',
        "about.business": '.brand-class__media img[src*="exp-business"]'
    };

    /* Pictures that are the background of a section: the selector of the section and the layer put over the picture (if the design has one). */
    var SLOT_BACKGROUNDS = {
        "about.banner": { selector: ".brand-hero__media", overlay: "" },
        "about.journey": { selector: ".brand-journey", overlay: "linear-gradient(180deg, rgba(7, 13, 23, 0.86) 0%, rgba(7, 13, 23, 0.92) 100%), " },
        "about.final": { selector: ".brand-final__media", overlay: "" }
    };

    function applyImageSlots(settings) {
        var logo = imageSrc(settings["image.logo"] ? "/media/" + String(settings["image.logo"]).replace(/^\/+/, "") : "");
        if (logo) {
            document.querySelectorAll(".site-header .logo, .footer-brand .logo").forEach(function (box) {
                var text = box.querySelector(".logo-text");
                if (!text || box.querySelector(".logo-image")) return;
                var image = document.createElement("img");
                image.className = "logo-image";
                image.src = logo;
                image.alt = text.getAttribute("aria-label") || text.textContent || "AEROVA";
                image.style.maxHeight = "2.4rem";
                image.style.width = "auto";
                text.style.display = "none";
                box.insertBefore(image, text);
            });
        }
        Object.keys(SLOT_BACKGROUNDS).forEach(function (slot) {
            var path = settings["image." + slot];
            var target = document.querySelector(SLOT_BACKGROUNDS[slot].selector);
            var url = path ? imageSrc("/media/" + String(path).replace(/^\/+/, "")) : "";
            if (url && target && /^[\w:\/.%\-]+$/.test(url)) {
                target.style.background = SLOT_BACKGROUNDS[slot].overlay + 'url("' + url + '") center / cover no-repeat';
            }
        });
        Object.keys(SLOT_TARGETS).forEach(function (slot) {
            var path = settings["image." + slot];
            var target = document.querySelector(SLOT_TARGETS[slot]);
            if (path && target) target.setAttribute("src", imageSrc("/media/" + String(path).replace(/^\/+/, "")));
        });
    }

    function applySiteSettings() {
        api.get("api/site-content/site", { skipAuth: true }).then(function (rows) {
            var settings = {};
            (rows || []).forEach(function (row) { settings[row.key] = row.textAz; });

            var cta = safeLink(settings["hero.ctaUrl"]);
            var heroButton = document.querySelector(".hero-cta");
            if (heroButton && cta) heroButton.setAttribute("href", cta);

            Object.keys(SOCIAL).forEach(function (name) {
                var url = safeLink(settings["social." + name]);
                var link = document.querySelector('.social-link[aria-label="' + SOCIAL[name] + '"]');
                if (link && url) link.setAttribute("href", url);
            });

            applyLinkSettings(settings);
            applyImageSlots(settings);

            var contact = [settings["contact.email"], settings["contact.phone"], settings["contact.address"]].filter(Boolean);
            var brand = document.querySelector(".footer-brand");
            if (brand && contact.length && !brand.querySelector(".footer-contact")) {
                brand.insertAdjacentHTML("beforeend", '<p class="footer-contact footer-description">' + contact.map(esc).join("<br>") + "</p>");
            }
        }, function () { /* the links written in the page stay */ });
    }

    function start() {
        renderCards(".why-aerova-grid", "why", whyCard);
        renderCards(".premium-experience-grid", "premium", premiumCard);
        renderFaq();
        applySiteSettings();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
