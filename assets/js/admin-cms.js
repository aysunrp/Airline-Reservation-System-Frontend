/*
 * Admin panel sections for the content that is shown as lists on the public pages:
 *   - home cards ("why" and "premium", the premium ones with an uploaded image): api/admin/home-cards;
 *   - support questions: api/admin/faq;
 *   - site settings (hero button link, social links, contact details): api/admin/site-content?page=site.
 * The navigation buttons, panels and dialogs are added here, so admin.html and admin.js only load this file.
 * Needs api-config.js and api-client.js.
 */
(function () {
    "use strict";

    var api = window.AEROVA_API;
    var nav = document.getElementById("admin-nav");
    if (!api || !nav) return;

    var PAGE_SIZE = 8;
    var ICONS = { "": "Yoxdur", booking: "Bilet", seat: "Oturacaq", trips: "Səfərlər", status: "Status", premium: "Premium", support: "Dəstək" };
    var SECTIONS = { why: "Niyə AEROVA", premium: "Premium təcrübə" };
    var SITE_FIELDS = [
        { key: "hero.ctaUrl", label: "Ana səhifə düyməsinin linki", hint: "məs. booking.html" },
        { key: "social.facebook", label: "Facebook linki", hint: "https://..." },
        { key: "social.instagram", label: "Instagram linki", hint: "https://..." },
        { key: "social.x", label: "X linki", hint: "https://..." },
        { key: "social.youtube", label: "YouTube linki", hint: "https://..." },
        { key: "social.linkedin", label: "LinkedIn linki", hint: "https://..." },
        { key: "contact.email", label: "Əlaqə e-poçtu", hint: "info@aerova.az" },
        { key: "contact.phone", label: "Əlaqə telefonu", hint: "+994 ..." },
        { key: "contact.address", label: "Ünvan", hint: "" }
    ];
    var MAX_IMAGE = 5 * 1024 * 1024;
    var IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

    function esc(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function notify(message, isError) {
        if (window.AEROVA_ADMIN && window.AEROVA_ADMIN.notify) window.AEROVA_ADMIN.notify(message, !!isError);
        else window.alert(message);
    }

    function fail(error) { notify((error && (error.userMessage || error.message)) || "Xəta baş verdi.", true); }

    function token() {
        try { return localStorage.getItem("aerovaAccessToken") || sessionStorage.getItem("aerovaAccessToken") || ""; } catch (e) { return ""; }
    }

    function imageSrc(path) {
        var text = String(path || "");
        if (!text) return "";
        if (/^https?:\/\//i.test(text) || text.indexOf("assets/") === 0) return text;
        return api.url("/media/" + text.replace(/^\/+/, ""));
    }

    /* ---------- styles ---------- */
    var style = document.createElement("style");
    style.textContent =
        ".cms-thumb{width:56px;height:40px;object-fit:cover;border-radius:6px;background:rgba(127,127,127,.15)}" +
        ".cms-badge{display:inline-block;padding:.15rem .55rem;border-radius:999px;font-size:.75rem;background:rgba(127,127,127,.18)}" +
        ".cms-badge--on{background:rgba(40,160,90,.2);color:#1f7a45}.cms-badge--off{background:rgba(200,70,70,.18);color:#b03a3a}" +
        ".cms-pager{display:flex;gap:.5rem;align-items:center;justify-content:flex-end;padding:.75rem 0}" +
        ".cms-empty{padding:2rem;text-align:center;opacity:.7}" +
        ".cms-row-actions{display:flex;gap:.4rem;flex-wrap:wrap}" +
        ".cms-form{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}.cms-form .admin-field--full{grid-column:1/-1}" +
        ".cms-error{color:#b03a3a;font-size:.8rem;min-height:1em}" +
        ".cms-switch{display:flex;align-items:center;gap:.5rem}.cms-preview{max-width:100%;max-height:160px;border-radius:8px;margin-top:.4rem}" +
        ".cms-site-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}" +
        "@media(max-width:700px){.cms-form,.cms-site-grid{grid-template-columns:1fr}}";
    document.head.appendChild(style);

    /* ---------- nav + panels ---------- */
    var DEFS = [
        { id: "cms-home-cards", label: "Ana səhifə kartları", title: "Ana səhifə kartları", sub: "Niyə AEROVA və Premium təcrübə kartları" },
        { id: "cms-faq", label: "Tez-tez verilən suallar", title: "Tez-tez verilən suallar", sub: "Dəstək səhifəsindəki suallar" },
        { id: "cms-site", label: "Sayt ayarları", title: "Sayt ayarları", sub: "Düymə linki, sosial şəbəkələr və əlaqə məlumatları" }
    ];
    var firstPanel = document.querySelector("[data-section-panel]");
    var panelParent = firstPanel ? firstPanel.parentNode : null;
    if (!panelParent) return;

    var navAnchor = null;
    DEFS.forEach(function (def) {
        var button = document.createElement("button");
        button.className = "admin-nav-link";
        button.type = "button";
        button.setAttribute("data-cms-nav", def.id);
        button.textContent = def.label;
        if (!navAnchor) navAnchor = nav.querySelector('[data-section="sight-media"]');
        if (navAnchor && navAnchor.parentNode) navAnchor.parentNode.insertBefore(button, navAnchor.nextSibling);
        else nav.appendChild(button);
        navAnchor = button;

        var panel = document.createElement("section");
        panel.className = "admin-section";
        panel.id = "section-" + def.id;
        panel.setAttribute("data-section-panel", def.id);
        panel.hidden = true;
        panelParent.appendChild(panel);
    });

    function showCms(id) {
        var def = DEFS.filter(function (d) { return d.id === id; })[0];
        document.querySelectorAll("[data-section-panel]").forEach(function (panel) {
            var active = panel.getAttribute("data-section-panel") === id;
            panel.hidden = !active;
            panel.classList.toggle("is-active", active);
        });
        document.querySelectorAll("#admin-nav .admin-nav-link").forEach(function (link) {
            link.classList.toggle("is-active", link.getAttribute("data-cms-nav") === id);
        });
        var title = document.getElementById("admin-page-title");
        var sub = document.getElementById("admin-page-subtitle");
        if (title) { title.removeAttribute("data-i18n"); title.textContent = def.title; }
        if (sub) { sub.removeAttribute("data-i18n"); sub.textContent = def.sub; }
        if (id === "cms-home-cards") cards.load();
        if (id === "cms-faq") faq.load();
        if (id === "cms-site") site.load();
    }

    nav.addEventListener("click", function (event) {
        var button = event.target.closest("[data-cms-nav]");
        if (button) { showCms(button.getAttribute("data-cms-nav")); return; }
        if (event.target.closest("[data-section]")) {
            document.querySelectorAll("[data-cms-nav]").forEach(function (b) { b.classList.remove("is-active"); });
            DEFS.forEach(function (def) { var p = document.getElementById("section-" + def.id); if (p) p.hidden = true; });
        }
    }, true);

    /* ---------- dialogs ---------- */
    var modal = document.createElement("div");
    modal.className = "admin-modal";
    modal.id = "cms-modal";
    modal.hidden = true;
    modal.innerHTML = '<div class="admin-modal-backdrop" data-cms-close></div>' +
        '<div class="admin-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="cms-modal-title">' +
        '<div class="admin-modal-head"><h2 class="admin-modal-title" id="cms-modal-title"></h2>' +
        '<button class="admin-modal-close" type="button" data-cms-close aria-label="Bağla">&times;</button></div>' +
        '<form id="cms-form" novalidate></form></div>';
    document.body.appendChild(modal);

    var confirmBox = document.createElement("div");
    confirmBox.className = "admin-modal";
    confirmBox.hidden = true;
    confirmBox.innerHTML = '<div class="admin-modal-backdrop" data-cms-confirm-no></div>' +
        '<div class="admin-modal-dialog admin-modal-dialog--confirm" role="alertdialog" aria-modal="true">' +
        '<h2 class="admin-modal-title">Silinsin?</h2><p class="admin-confirm-text" data-cms-confirm-text></p>' +
        '<div class="admin-modal-actions"><button class="admin-btn admin-btn--secondary" type="button" data-cms-confirm-no>Ləğv et</button>' +
        '<button class="admin-btn admin-btn--primary" type="button" data-cms-confirm-yes>Sil</button></div></div>';
    document.body.appendChild(confirmBox);

    var form = modal.querySelector("#cms-form");
    var onConfirm = null;

    function openModal(title, html) {
        modal.querySelector("#cms-modal-title").textContent = title;
        form.innerHTML = html;
        modal.hidden = false;
        var first = form.querySelector("input:not([type=hidden]),textarea,select");
        if (first) first.focus();
    }
    function closeModal() { modal.hidden = true; form.innerHTML = ""; form.onsubmit = null; }
    modal.addEventListener("click", function (event) { if (event.target.closest("[data-cms-close]")) closeModal(); });

    function ask(text, action) {
        confirmBox.querySelector("[data-cms-confirm-text]").textContent = text;
        onConfirm = action;
        confirmBox.hidden = false;
    }
    confirmBox.addEventListener("click", function (event) {
        if (event.target.closest("[data-cms-confirm-no]")) { confirmBox.hidden = true; onConfirm = null; return; }
        if (event.target.closest("[data-cms-confirm-yes]")) {
            var action = onConfirm;
            confirmBox.hidden = true;
            onConfirm = null;
            if (action) action();
        }
    });
    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        if (!confirmBox.hidden) { confirmBox.hidden = true; onConfirm = null; }
        else if (!modal.hidden) closeModal();
    });

    function field(name, label, value, opts) {
        opts = opts || {};
        var common = ' name="' + name + '" id="cms-f-' + name + '"' + (opts.max ? ' maxlength="' + opts.max + '"' : "");
        var control = opts.area
            ? "<textarea" + common + ' rows="4">' + esc(value) + "</textarea>"
            : '<input type="text"' + common + ' value="' + esc(value) + '"' + (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : "") + ">";
        return '<div class="admin-field' + (opts.full ? " admin-field--full" : "") + '"><label for="cms-f-' + name + '">' + label + "</label>" + control +
            '<div class="cms-error" data-error-for="' + name + '"></div></div>';
    }

    function showErrors(error) {
        form.querySelectorAll("[data-error-for]").forEach(function (el) { el.textContent = ""; });
        var errors = error && error.errors;
        var shown = false;
        if (errors && typeof errors === "object") {
            Object.keys(errors).forEach(function (key) {
                var name = key.charAt(0).toLowerCase() + key.slice(1);
                var el = form.querySelector('[data-error-for="' + name + '"]');
                var messages = [].concat(errors[key]).join(" ");
                if (el) { el.textContent = messages; shown = true; }
            });
        }
        if (!shown) fail(error);
    }

    function pagerHtml(page, pages) {
        if (pages <= 1) return "";
        return '<div class="cms-pager"><button class="admin-btn admin-btn--ghost" type="button" data-page="' + (page - 1) + '"' + (page <= 1 ? " disabled" : "") + '>Əvvəlki</button>' +
            "<span>" + page + " / " + pages + '</span><button class="admin-btn admin-btn--ghost" type="button" data-page="' + (page + 1) + '"' + (page >= pages ? " disabled" : "") + ">Növbəti</button></div>";
    }

    function badge(active) {
        return '<span class="cms-badge ' + (active ? "cms-badge--on" : "cms-badge--off") + '">' + (active ? "Aktiv" : "Passiv") + "</span>";
    }

    /* ---------- home cards ---------- */
    /* The managers can be mounted into any host element (a section of a Website management page); fixedSection fixes the card section. */
    function createCards(panel, fixedSection) {
        var state = { items: [], page: 1, section: fixedSection || "", search: "", loading: false };
        panel.innerHTML = '<div class="admin-panel admin-panel--cream"><div class="admin-toolbar">' +
            (fixedSection ? "" : '<select class="admin-select" data-f="section" aria-label="Bölmə"><option value="">Bütün bölmələr</option><option value="why">Niyə AEROVA</option><option value="premium">Premium təcrübə</option></select>') +
            '<input class="admin-search" data-f="search" type="search" placeholder="Başlıq üzrə axtarış">' +
            '<button class="admin-btn admin-btn--primary" type="button" data-add>Kart əlavə et</button></div>' +
            '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Şəkil</th><th>Bölmə</th><th>Başlıq</th><th>Sıra</th><th>Status</th><th>Əməliyyatlar</th></tr></thead>' +
            '<tbody data-body></tbody></table></div><div data-pager></div></div>';
        var body = panel.querySelector("[data-body]");
        var pager = panel.querySelector("[data-pager]");

        function filtered() {
            var q = state.search.trim().toLowerCase();
            return state.items.filter(function (c) {
                return (!state.section || c.section === state.section) && (!q || (c.title + " " + c.description).toLowerCase().indexOf(q) >= 0);
            });
        }

        function render() {
            if (state.loading) { body.innerHTML = '<tr><td colspan="6" class="cms-empty">Yüklənir...</td></tr>'; pager.innerHTML = ""; return; }
            var list = filtered();
            var pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
            if (state.page > pages) state.page = pages;
            var slice = list.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
            body.innerHTML = slice.length ? slice.map(function (c) {
                var src = imageSrc(c.imagePath);
                return "<tr><td>" + (src ? '<img class="cms-thumb" src="' + esc(src) + '" alt="">' : "—") + "</td><td>" + esc(SECTIONS[c.section] || c.section) + "</td><td>" + esc(c.title) +
                    "</td><td>" + c.sortOrder + "</td><td>" + badge(c.isActive) + '</td><td><div class="cms-row-actions">' +
                    '<button class="admin-btn admin-btn--secondary" type="button" data-edit="' + c.id + '">Redaktə</button>' +
                    '<button class="admin-btn admin-btn--ghost" type="button" data-del="' + c.id + '">Sil</button></div></td></tr>';
            }).join("") : '<tr><td colspan="6" class="cms-empty">Kart tapılmadı.</td></tr>';
            pager.innerHTML = pagerHtml(state.page, pages);
        }

        function load() {
            state.loading = true; render();
            api.get("api/admin/home-cards", { fresh: true }).then(function (items) {
                state.items = items || [];
            }).catch(fail).then(function () { state.loading = false; render(); });
        }

        function openForm(card) {
            var c = card || { section: state.section || "why", title: "", description: "", label: "", linkText: "", linkUrl: "", iconKey: "", imageAlt: "", isActive: true, sortOrder: "" };
            var iconOptions = Object.keys(ICONS).map(function (k) { return '<option value="' + k + '"' + (c.iconKey === k || (!c.iconKey && !k) ? " selected" : "") + ">" + ICONS[k] + "</option>"; }).join("");
            var sectionOptions = Object.keys(SECTIONS).map(function (k) { return '<option value="' + k + '"' + (c.section === k ? " selected" : "") + ">" + SECTIONS[k] + "</option>"; }).join("");
            var html = '<div class="cms-form">' +
                (fixedSection ? "" : '<div class="admin-field"><label for="cms-f-section">Bölmə</label><select name="section" id="cms-f-section">' + sectionOptions + "</select></div>") +
                '<div class="admin-field"><label for="cms-f-iconKey">İkon</label><select name="iconKey" id="cms-f-iconKey">' + iconOptions + "</select></div>" +
                field("title", "Başlıq", c.title, { max: 200, full: true }) +
                field("description", "Təsvir", c.description, { area: true, max: 1000, full: true }) +
                field("label", "Etiket", c.label || "", { max: 100 }) +
                field("linkText", "Link mətni", c.linkText || "", { max: 100 }) +
                field("linkUrl", "Link ünvanı", c.linkUrl || "", { max: 500, placeholder: "booking.html və ya https://...", full: true }) +
                field("imageAlt", "Şəklin alternativ mətni", c.imageAlt || "", { max: 200, full: true }) +
                field("sortOrder", "Sıra nömrəsi", c.sortOrder === "" ? "" : c.sortOrder, { max: 4 }) +
                '<div class="admin-field cms-switch"><input type="checkbox" name="isActive" id="cms-f-isActive"' + (c.isActive ? " checked" : "") + '><label for="cms-f-isActive">Saytda göstərilsin</label></div>' +
                '<div class="admin-field admin-field--full"><label for="cms-f-file">Şəkil (JPG, PNG, WEBP, ən çox 5 MB)</label>' +
                '<input type="file" id="cms-f-file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp">' +
                '<div class="cms-error" data-error-for="file"></div>' +
                '<img class="cms-preview" data-preview alt="" ' + (c.imagePath ? 'src="' + esc(imageSrc(c.imagePath)) + '"' : "hidden") + ">" +
                (c.imagePath ? '<div class="cms-switch"><input type="checkbox" id="cms-f-removeImage"><label for="cms-f-removeImage">Mövcud şəkli sil</label></div>' : "") + "</div></div>" +
                '<div class="admin-modal-actions"><button class="admin-btn admin-btn--secondary" type="button" data-cms-close>Ləğv et</button>' +
                '<button class="admin-btn admin-btn--primary" type="submit">Yadda saxla</button></div>';
            openModal(card ? "Kartı redaktə et" : "Yeni kart", html);

            var fileInput = form.querySelector("#cms-f-file");
            var preview = form.querySelector("[data-preview]");
            fileInput.addEventListener("change", function () {
                var file = fileInput.files[0];
                var err = form.querySelector('[data-error-for="file"]');
                err.textContent = "";
                if (!file) return;
                if (IMAGE_TYPES.indexOf(file.type) < 0 || !/\.(jpe?g|png|webp)$/i.test(file.name)) { err.textContent = "Yalnız JPG, PNG və ya WEBP şəkli seçin."; fileInput.value = ""; return; }
                if (file.size > MAX_IMAGE) { err.textContent = "Şəkil 5 MB-dan böyük ola bilməz."; fileInput.value = ""; return; }
                preview.src = URL.createObjectURL(file);
                preview.hidden = false;
            });

            form.onsubmit = function (event) {
                event.preventDefault();
                var data = new FormData(form);
                var sortText = String(data.get("sortOrder") || "").trim();
                if (sortText && !/^\d+$/.test(sortText)) { showErrors({ errors: { sortOrder: ["Sıra nömrəsi rəqəm olmalıdır."] } }); return; }
                var payload = {
                    section: fixedSection || data.get("section"), title: data.get("title"), description: data.get("description"),
                    label: data.get("label") || null, linkText: data.get("linkText") || null, linkUrl: data.get("linkUrl") || null,
                    iconKey: data.get("iconKey") || null, imageAlt: data.get("imageAlt") || null,
                    sortOrder: sortText ? parseInt(sortText, 10) : null, isActive: !!form.querySelector("#cms-f-isActive").checked
                };
                var submit = form.querySelector('[type="submit"]');
                submit.disabled = true;
                var request = card ? api.put("api/admin/home-cards/" + card.id, payload) : api.post("api/admin/home-cards", payload);
                request.then(function (saved) {
                    var file = fileInput.files[0];
                    var remove = form.querySelector("#cms-f-removeImage");
                    if (file) return uploadImage(saved.id, file);
                    if (remove && remove.checked) return api.del("api/admin/home-cards/" + saved.id + "/image");
                }).then(function () {
                    closeModal();
                    notify(card ? "Kart yadda saxlanıldı." : "Kart əlavə edildi.", false);
                    load();
                }).catch(function (error) { submit.disabled = false; showErrors(error); });
            };
        }

        function uploadImage(id, file) {
            var data = new FormData();
            data.append("file", file);
            return fetch(api.url("api/admin/home-cards/" + id + "/image"), { method: "POST", headers: { Authorization: "Bearer " + token() }, body: data }).then(function (response) {
                if (response.ok) return response.json();
                return response.json().catch(function () { return {}; }).then(function (problem) {
                    var messages = problem && problem.errors ? Object.keys(problem.errors).map(function (k) { return [].concat(problem.errors[k]).join(" "); }).join(" ") : "";
                    throw { userMessage: messages || problem.detail || "Şəkil yüklənmədi." };
                });
            });
        }

        panel.addEventListener("click", function (event) {
            var t = event.target.closest("button");
            if (!t) return;
            if (t.hasAttribute("data-add")) openForm(null);
            else if (t.hasAttribute("data-edit")) {
                var id = Number(t.getAttribute("data-edit"));
                openForm(state.items.filter(function (c) { return c.id === id; })[0]);
            } else if (t.hasAttribute("data-del")) {
                var delId = Number(t.getAttribute("data-del"));
                var item = state.items.filter(function (c) { return c.id === delId; })[0];
                ask('"' + (item ? item.title : "") + '" kartı silinsin? Yüklənmiş şəkli də silinəcək, geri qaytarıla bilməz.', function () {
                    api.del("api/admin/home-cards/" + delId).then(function () { notify("Kart silindi.", false); load(); }).catch(fail);
                });
            } else if (t.hasAttribute("data-page")) { state.page = Number(t.getAttribute("data-page")); render(); }
        });
        panel.addEventListener("input", function (event) {
            var f = event.target.getAttribute("data-f");
            if (f) { state[f] = event.target.value; state.page = 1; render(); }
        });
        return { load: load };
    }

    var cards = createCards(document.getElementById("section-cms-home-cards"), "");

    /* ---------- FAQ ---------- */
    function createFaq(panel) {
        var state = { items: [], page: 1, search: "", loading: false };
        panel.innerHTML = '<div class="admin-panel admin-panel--cream"><div class="admin-toolbar">' +
            '<input class="admin-search" data-f="search" type="search" placeholder="Sual üzrə axtarış">' +
            '<button class="admin-btn admin-btn--primary" type="button" data-add>Sual əlavə et</button></div>' +
            '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Sıra</th><th>Sual</th><th>Status</th><th>Əməliyyatlar</th></tr></thead>' +
            '<tbody data-body></tbody></table></div><div data-pager></div></div>';
        var body = panel.querySelector("[data-body]");
        var pager = panel.querySelector("[data-pager]");

        function filtered() {
            var q = state.search.trim().toLowerCase();
            return state.items.filter(function (i) { return !q || (i.question + " " + i.answer).toLowerCase().indexOf(q) >= 0; });
        }

        function render() {
            if (state.loading) { body.innerHTML = '<tr><td colspan="4" class="cms-empty">Yüklənir...</td></tr>'; pager.innerHTML = ""; return; }
            var list = filtered();
            var pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
            if (state.page > pages) state.page = pages;
            var start = (state.page - 1) * PAGE_SIZE;
            body.innerHTML = list.length ? list.slice(start, start + PAGE_SIZE).map(function (i, n) {
                var index = start + n;
                return "<tr><td>" + i.sortOrder + "</td><td>" + esc(i.question) + "</td><td>" + badge(i.isActive) + '</td><td><div class="cms-row-actions">' +
                    '<button class="admin-btn admin-btn--ghost" type="button" data-move="up" data-id="' + i.id + '"' + (index === 0 ? " disabled" : "") + ' aria-label="Yuxarı">&uarr;</button>' +
                    '<button class="admin-btn admin-btn--ghost" type="button" data-move="down" data-id="' + i.id + '"' + (index === list.length - 1 ? " disabled" : "") + ' aria-label="Aşağı">&darr;</button>' +
                    '<button class="admin-btn admin-btn--secondary" type="button" data-edit="' + i.id + '">Redaktə</button>' +
                    '<button class="admin-btn admin-btn--ghost" type="button" data-del="' + i.id + '">Sil</button></div></td></tr>';
            }).join("") : '<tr><td colspan="4" class="cms-empty">Sual tapılmadı.</td></tr>';
            pager.innerHTML = pagerHtml(state.page, pages);
        }

        function load() {
            state.loading = true; render();
            api.get("api/admin/faq", { fresh: true }).then(function (items) { state.items = items || []; }).catch(fail).then(function () { state.loading = false; render(); });
        }

        function toPayload(i, sortOrder) { return { question: i.question, answer: i.answer, sortOrder: sortOrder, isActive: i.isActive }; }

        function move(id, direction) {
            var list = state.items;
            var index = list.findIndex(function (i) { return i.id === id; });
            var other = list[direction === "up" ? index - 1 : index + 1];
            var current = list[index];
            if (!current || !other) return;
            var a = current.sortOrder, b = other.sortOrder;
            if (a === b) b = direction === "up" ? a - 1 : a + 1;
            api.put("api/admin/faq/" + current.id, toPayload(current, b))
                .then(function () { return api.put("api/admin/faq/" + other.id, toPayload(other, a)); })
                .then(load).catch(fail);
        }

        function openForm(item) {
            var i = item || { question: "", answer: "", isActive: true, sortOrder: "" };
            openModal(item ? "Sualı redaktə et" : "Yeni sual",
                '<div class="cms-form">' + field("question", "Sual", i.question, { max: 300, full: true }) +
                field("answer", "Cavab", i.answer, { area: true, max: 3000, full: true }) +
                field("sortOrder", "Sıra nömrəsi", i.sortOrder === "" ? "" : i.sortOrder, { max: 4 }) +
                '<div class="admin-field cms-switch"><input type="checkbox" id="cms-f-isActive"' + (i.isActive ? " checked" : "") + '><label for="cms-f-isActive">Saytda göstərilsin</label></div></div>' +
                '<div class="admin-modal-actions"><button class="admin-btn admin-btn--secondary" type="button" data-cms-close>Ləğv et</button>' +
                '<button class="admin-btn admin-btn--primary" type="submit">Yadda saxla</button></div>');
            form.onsubmit = function (event) {
                event.preventDefault();
                var sortText = form.querySelector("#cms-f-sortOrder").value.trim();
                if (sortText && !/^\d+$/.test(sortText)) { showErrors({ errors: { sortOrder: ["Sıra nömrəsi rəqəm olmalıdır."] } }); return; }
                var payload = {
                    question: form.querySelector("#cms-f-question").value, answer: form.querySelector("#cms-f-answer").value,
                    sortOrder: sortText ? parseInt(sortText, 10) : null, isActive: form.querySelector("#cms-f-isActive").checked
                };
                var submit = form.querySelector('[type="submit"]');
                submit.disabled = true;
                (item ? api.put("api/admin/faq/" + item.id, payload) : api.post("api/admin/faq", payload)).then(function () {
                    closeModal(); notify(item ? "Sual yadda saxlanıldı." : "Sual əlavə edildi.", false); load();
                }).catch(function (error) { submit.disabled = false; showErrors(error); });
            };
        }

        panel.addEventListener("click", function (event) {
            var t = event.target.closest("button");
            if (!t) return;
            if (t.hasAttribute("data-add")) openForm(null);
            else if (t.hasAttribute("data-edit")) {
                var id = Number(t.getAttribute("data-edit"));
                openForm(state.items.filter(function (i) { return i.id === id; })[0]);
            } else if (t.hasAttribute("data-del")) {
                var delId = Number(t.getAttribute("data-del"));
                var item = state.items.filter(function (i) { return i.id === delId; })[0];
                ask('"' + (item ? item.question : "") + '" sualı silinsin? Bu geri qaytarıla bilməz.', function () {
                    api.del("api/admin/faq/" + delId).then(function () { notify("Sual silindi.", false); load(); }).catch(fail);
                });
            } else if (t.hasAttribute("data-move")) move(Number(t.getAttribute("data-id")), t.getAttribute("data-move"));
            else if (t.hasAttribute("data-page")) { state.page = Number(t.getAttribute("data-page")); render(); }
        });
        panel.addEventListener("input", function (event) {
            if (event.target.getAttribute("data-f") === "search") { state.search = event.target.value; state.page = 1; render(); }
        });
        return { load: load };
    }

    var faq = createFaq(document.getElementById("section-cms-faq"));

    /* ---------- site settings ---------- */
    var site = (function () {
        var panel = document.getElementById("section-cms-site");
        var rows = {};

        function render() {
            panel.innerHTML = '<div class="admin-panel admin-panel--cream"><form data-site-form novalidate><div class="cms-site-grid">' +
                SITE_FIELDS.map(function (f) {
                    return '<div class="admin-field"><label for="cms-s-' + f.key + '">' + f.label + '</label><input type="text" id="cms-s-' + f.key + '" data-key="' + f.key + '" maxlength="500" value="' +
                        esc(rows[f.key] ? rows[f.key].textAz : "") + '" placeholder="' + esc(f.hint) + '"><div class="cms-error" data-error-for="' + f.key + '"></div></div>';
                }).join("") + '</div><div class="admin-modal-actions"><button class="admin-btn admin-btn--primary" type="submit">Yadda saxla</button></div></form></div>';
        }

        function load() {
            panel.innerHTML = '<div class="admin-panel admin-panel--cream"><p class="cms-empty">Yüklənir...</p></div>';
            api.get("api/admin/site-content", { fresh: true, query: { page: "site" } }).then(function (items) {
                rows = {};
                (items || []).forEach(function (r) { rows[r.key] = r; });
            }).catch(fail).then(render);
        }

        function save(field, value) {
            var existing = rows[field.key];
            var text = value.trim();
            if (existing) {
                if (existing.textAz === text) return Promise.resolve();
                if (!text && existing.canDelete === false) return Promise.reject({ userMessage: "Bu sahə boş ola bilməz." });
                if (!text) return api.del("api/admin/site-content/" + existing.id);
                return api.put("api/admin/site-content/" + existing.id, { textAz: text });
            }
            if (!text) return Promise.resolve();
            return api.post("api/admin/site-content", { page: "site", key: field.key, textAz: text });
        }

        panel.addEventListener("submit", function (event) {
            event.preventDefault();
            var formEl = event.target;
            var submit = formEl.querySelector('[type="submit"]');
            submit.disabled = true;
            var chain = Promise.resolve();
            var failed = false;
            SITE_FIELDS.forEach(function (f) {
                var input = formEl.querySelector('[data-key="' + f.key + '"]');
                var error = formEl.querySelector('[data-error-for="' + f.key + '"]');
                error.textContent = "";
                chain = chain.then(function () { return save(f, input.value); }).catch(function (e) {
                    failed = true;
                    error.textContent = (e && (e.userMessage || e.message)) || "Xəta.";
                });
            });
            chain.then(function () {
                if (!failed) notify("Sayt ayarları yadda saxlanıldı.", false);
                else notify("Bəzi sahələr yadda saxlanılmadı.", true);
                return failed ? null : load();
            }).then(function () { submit.disabled = false; });
        });
        return { load: load };
    })();
    window.AEROVA_ADMIN_CMS = {
        mountCards: function (host, section) {
            var box = document.createElement("div");
            host.appendChild(box);
            var manager = createCards(box, section);
            manager.load();
            return manager;
        },
        mountFaq: function (host) {
            var box = document.createElement("div");
            host.appendChild(box);
            var manager = createFaq(box);
            manager.load();
            return manager;
        }
    };
})();
