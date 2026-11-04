/*
 * Website Management: one area of the admin panel, apart from the airline operations, for everything the public pages show.
 * It adds a "Website idarəsi" group to the sidebar with a page for the overview, the home page, About, destinations, support, the header
 * (logo and menu), the footer and the media library, and gathers the content sections that already existed (hero video, sight pictures,
 * home cards, questions, site settings, every page text) into the same group.
 *
 * Every field works against the API: texts are rows of api/admin/site-content, pictures are uploaded through api/admin/media, and the
 * menu and footer links are stored as link.{id}.label|url|visible|order rows of the "site" page (applied by cms-lists.js on the pages).
 * Needs api-config.js, api-client.js, admin.js and admin-cms.js.
 */
(function () {
    "use strict";

    var api = window.AEROVA_API;
    var nav = document.getElementById("admin-nav");
    if (!api || !nav) return;

    var firstPanel = document.querySelector("[data-section-panel]");
    var panelParent = firstPanel ? firstPanel.parentNode : null;
    if (!panelParent) return;

    /* ---------- helpers ---------- */
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

    function safeLink(url) {
        var text = String(url || "").trim();
        return /^[a-z0-9-]+\.html(#[A-Za-z0-9_-]+)?(\?[\w=&%.-]*)?$/.test(text) || (/^https:\/\//i.test(text) && !/\s/.test(text));
    }

    function mediaUrl(path) { return api.url("/media/" + String(path || "").replace(/^\/+/, "")); }

    function formatSize(bytes) {
        if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
        return Math.max(1, Math.round(bytes / 1024)) + " KB";
    }

    function sendFile(method, path, file) {
        var data = new FormData();
        data.append("file", file);
        return fetch(api.url(path), { method: method, headers: { Authorization: "Bearer " + token() }, body: data }).then(function (response) {
            if (response.ok) return response.status === 204 ? null : response.json();
            return response.json().catch(function () { return {}; }).then(function (problem) {
                var messages = problem && problem.errors ? Object.keys(problem.errors).map(function (k) { return [].concat(problem.errors[k]).join(" "); }).join(" ") : "";
                throw { userMessage: messages || problem.detail || problem.title || "Fayl yüklənmədi." };
            });
        });
    }

    function checkImage(file) {
        if (!file) return "";
        if (["image/jpeg", "image/png", "image/webp"].indexOf(file.type) < 0 || !/\.(jpe?g|png|webp)$/i.test(file.name)) return "Yalnız JPG, PNG və ya WEBP şəkli seçin.";
        if (file.size > 10 * 1024 * 1024) return "Şəkil 10 MB-dan böyük ola bilməz.";
        return "";
    }

    var tokens = {
        eyebrow: "üst başlıq", title: "başlıq", text: "mətn", desc: "təsvir", description: "təsvir", sub: "alt başlıq", link: "keçid", cta: "düymə",
        button: "düymə", btn: "düymə", lead: "giriş", book: "bron düyməsi", label: "etiket", placeholder: "yazı nümunəsi", name: "ad", step: "addım",
        hero: "əsas ekran", story: "hekayə", mission: "missiya", vision: "vizyon", philosophy: "fəlsəfə", classes: "salonlar", journey: "səyahət",
        services: "xidmətlər", values: "dəyərlər", final: "yekun", cabin: "salon", detail: "təfərrüat", newsletter: "newsletter", search: "axtarış",
        voice: "səsli axtarış", quick: "sürətli", links: "keçidlər", follow: "izləyin", copyright: "müəllif hüququ", privacy: "məxfilik", terms: "şərtlər",
        contact: "əlaqə", none: "boş vəziyyət", form: "forma", faq: "suallar", support: "dəstək", explore: "kəşf et", aria: "ekran oxuyucu mətni",
        start: "başlat", flights: "uçuşlar", destination: "istiqamət", destinations: "istiqamətlər", about: "haqqımızda", back: "geri", all: "bütün",
        next: "növbəti", guide: "bələdçi"
    };

    function humanize(key) {
        var last = String(key).split(".").pop();
        var words = last.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/\s+/).map(function (w) { return tokens[w.toLowerCase()] || w.toLowerCase(); });
        var text = words.join(" ");
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    /* ---------- styles ---------- */
    var style = document.createElement("style");
    style.textContent =
        ".wm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem}" +
        ".wm-card{border:1px solid rgba(200,169,110,.28);border-radius:14px;padding:1.1rem 1.2rem;background:rgba(255,255,255,.03)}" +
        ".wm-card h3{margin:0 0 .3rem;font-size:1.05rem}.wm-card p{margin:.2rem 0;opacity:.75;font-size:.88rem}" +
        ".wm-card .wm-actions{margin-top:.8rem;display:flex;gap:.5rem;flex-wrap:wrap}" +
        ".wm-stat{font-size:1.7rem;font-family:inherit}" +
        ".wm-where{font-size:.8rem;opacity:.7;margin:.1rem 0 .9rem}.wm-where a{color:inherit;text-decoration:underline}" +
        ".wm-fields{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}.wm-fields .admin-field--full{grid-column:1/-1}" +
        ".wm-fields textarea{min-height:5.5rem;resize:vertical}.wm-fields input,.wm-fields textarea{width:100%}" +
        ".wm-key{font-size:.72rem;opacity:.55;margin-left:.4rem}.wm-err{color:#d46a6a;font-size:.8rem;min-height:1em}" +
        ".wm-bar{display:flex;gap:.6rem;justify-content:flex-end;margin-top:1rem;align-items:center}.wm-dirty{font-size:.8rem;opacity:.7;margin-right:auto}" +
        ".wm-stack{display:flex;flex-direction:column;gap:1.2rem}.wm-note{padding:.7rem .9rem;border-radius:10px;background:rgba(200,169,110,.1);font-size:.85rem}" +
        ".wm-slot{display:grid;grid-template-columns:140px 1fr;gap:1rem;align-items:start}.wm-slot img,.wm-slot .wm-ph{width:140px;height:90px;object-fit:cover;border-radius:10px;background:rgba(127,127,127,.18)}" +
        ".wm-slot .wm-ph{display:flex;align-items:center;justify-content:center;font-size:.75rem;opacity:.6;text-align:center;padding:.3rem}" +
        ".wm-links{width:100%;border-collapse:collapse}.wm-links th,.wm-links td{padding:.45rem .4rem;text-align:left;vertical-align:top;font-size:.88rem}.wm-links input[type=text]{width:100%}.wm-links input[type=number]{width:4.2rem}" +
        ".wm-media{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:1rem}" +
        ".wm-file{border:1px solid rgba(200,169,110,.25);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}" +
        ".wm-file img,.wm-file .wm-ph{width:100%;height:130px;object-fit:cover;background:rgba(127,127,127,.18);display:flex;align-items:center;justify-content:center}" +
        ".wm-file .wm-body{padding:.6rem .7rem;font-size:.8rem;display:flex;flex-direction:column;gap:.3rem;flex:1}.wm-file .wm-name{word-break:break-all;opacity:.85}" +
        ".wm-chip{display:inline-block;padding:.1rem .5rem;border-radius:999px;font-size:.72rem;background:rgba(40,160,90,.2);color:#2f9b60;margin:.1rem .2rem .1rem 0}" +
        ".wm-chip--free{background:rgba(212,170,80,.2);color:#b78a2c}.wm-file .wm-actions{display:flex;gap:.4rem;flex-wrap:wrap;margin-top:auto}" +
        ".wm-filters{display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:1rem;align-items:center}" +
        ".wm-slot-inline{padding:.9rem 0;border-top:1px solid rgba(200,169,110,.22);margin-top:.6rem}" +
        ".wm-card-extra{margin-top:.4rem}.wm-card-extra:not(:empty){margin-top:1rem;padding-top:1rem;border-top:1px solid rgba(200,169,110,.22)}" +
        ".wm-card-extra .admin-panel{box-shadow:none;border:0;padding:0;background:transparent;margin:0 0 1rem}" +
        ".wm-card-extra h4{margin:1rem 0 .4rem}.wm-adopted .admin-section-title{display:none}" +
        ".wm-nav-sub{padding-left:1.6rem!important;font-size:.9em}.wm-empty{padding:2rem;text-align:center;opacity:.7}" +
        "@media(max-width:760px){.wm-fields,.wm-slot{grid-template-columns:1fr}}";
    document.head.appendChild(style);

    /* ---------- site-content rows ---------- */
    function loadRows(page) {
        return api.get("api/admin/site-content", { fresh: true, query: { page: page } }).then(function (items) {
            var map = {};
            (items || []).forEach(function (row) { map[row.key] = row; });
            return map;
        });
    }

    /* Saves one value: changes the row, adds it when it is new, or removes it when it is emptied and may be removed. */
    function saveValue(page, key, value, rows) {
        var text = String(value).trim();
        var row = rows[key];
        if (row) {
            if (row.textAz === text) return Promise.resolve();
            if (!text) {
                if (row.canDelete === false) return Promise.reject({ userMessage: "Bu sahə boş ola bilməz." });
                return api.del("api/admin/site-content/" + row.id);
            }
            return api.put("api/admin/site-content/" + row.id, { textAz: text });
        }
        if (!text) return Promise.resolve();
        return api.post("api/admin/site-content", { page: page, key: key, textAz: text });
    }

    /* ---------- sidebar group and panels ---------- */
    var PAGES = [
        { id: "wm-overview", label: "Ümumi baxış", title: "Website idarəsi", sub: "Saytın səhifələri və ortaq hissələri bir yerdə" },
        { id: "wm-home", label: "Ana səhifə", title: "Ana səhifə", sub: "Əsas ekran, axtarış, istiqamətlər, kartlar və newsletter" },
        { id: "wm-about", label: "AEROVA haqqında", title: "AEROVA haqqında səhifəsi", sub: "Hekayə, salonlar, xidmətlər və şəkillər" },
        { id: "wm-destinations", label: "İstiqamətlər", title: "İstiqamətlər", sub: "Səhifə başlıqları, ölkə və şəhər şəkilləri, görməli yerlər" },
        { id: "wm-support", label: "Dəstək və FAQ", title: "Dəstək və FAQ", sub: "Dəstək səhifəsinin mətnləri, suallar və əlaqə məlumatları" },
        { id: "wm-header", label: "Başlıq və menyu", title: "Başlıq və menyu", sub: "Loqo, menyu mətnləri, linkləri, sırası və görünməsi" },
        { id: "wm-footer", label: "Footer", title: "Footer", sub: "Footer mətnləri, keçidlər, sosial şəbəkələr və müəllif hüququ" },
        { id: "wm-media", label: "Media kitabxanası", title: "Media kitabxanası", sub: "Yüklənmiş bütün şəkillər, haradan istifadə olunduğu və təhlükəsiz silmə" }
    ];
    var LEGACY = [];

    var heading = document.createElement("p");
    heading.className = "admin-nav-group";
    heading.textContent = "Website idarəsi";
    var group = document.createElement("div");
    group.setAttribute("data-wm-group", "");
    group.appendChild(heading);

    PAGES.forEach(function (page) {
        var button = document.createElement("button");
        button.className = "admin-nav-link";
        button.type = "button";
        button.setAttribute("data-wm-nav", page.id);
        button.textContent = page.label;
        group.appendChild(button);

        var panel = document.createElement("section");
        panel.className = "admin-section";
        panel.id = "section-" + page.id;
        panel.setAttribute("data-section-panel", page.id);
        panel.hidden = true;
        panelParent.appendChild(panel);
    });

    LEGACY.forEach(function (item) {
        var button = document.createElement("button");
        button.className = "admin-nav-link wm-nav-sub";
        button.type = "button";
        button.setAttribute("data-wm-go", item.go);
        button.textContent = item.label;
        group.appendChild(button);
    });

    var superGroup = nav.querySelector("[data-super-only]");
    var operationsEnd = superGroup || nav.querySelector(".admin-nav-footer");
    if (superGroup) superGroup.parentNode.insertBefore(group, superGroup);
    else nav.appendChild(group);

    /* The content buttons that existed before now live in the Website idarəsi group. */
    function hideLegacyButtons() {
        nav.querySelectorAll('[data-section="content"], [data-section="hero-video"], [data-section="sight-media"], [data-cms-nav]').forEach(function (button) {
            button.hidden = true;
            button.style.display = "none";
        });
    }
    hideLegacyButtons();
    new MutationObserver(hideLegacyButtons).observe(nav, { childList: true });

    var current = null;

    function setActive(buttonAttr, value) {
        group.querySelectorAll(".admin-nav-link").forEach(function (b) { b.classList.remove("is-active"); });
        nav.querySelectorAll("[data-section].is-active").forEach(function (b) { if (buttonAttr) b.classList.remove("is-active"); });
        if (buttonAttr) {
            var target = group.querySelector("[" + buttonAttr + '="' + value + '"]');
            if (target) target.classList.add("is-active");
        }
    }

    function showWm(id) {
        var page = PAGES.filter(function (p) { return p.id === id; })[0];
        document.querySelectorAll("[data-section-panel]").forEach(function (panel) {
            var active = panel.getAttribute("data-section-panel") === id;
            panel.hidden = !active;
            panel.classList.toggle("is-active", active);
        });
        nav.querySelectorAll(".admin-nav-link.is-active").forEach(function (b) { b.classList.remove("is-active"); });
        setActive("data-wm-nav", id);
        var title = document.getElementById("admin-page-title");
        var sub = document.getElementById("admin-page-subtitle");
        if (title) { title.removeAttribute("data-i18n"); title.textContent = page.title; }
        if (sub) { sub.removeAttribute("data-i18n"); sub.textContent = page.sub; }
        current = id;
        builders[id](document.getElementById("section-" + id));
        var sidebar = document.querySelector(".admin-sidebar");
        if (sidebar && sidebar.classList.contains("is-open")) sidebar.classList.remove("is-open");
    }

    function goLegacy(target) {
        if (document.querySelector('[data-cms-nav="' + target + '"]')) {
            document.querySelector('[data-cms-nav="' + target + '"]').click();
        } else {
            var button = nav.querySelector('[data-section="' + target + '"]');
            if (button) button.click();
        }
        nav.querySelectorAll(".admin-nav-link.is-active").forEach(function (b) { if (b.parentNode !== group) b.classList.remove("is-active"); });
        setActive("data-wm-go", target);
        current = target;
    }

    nav.addEventListener("click", function (event) {
        var wm = event.target.closest("[data-wm-nav]");
        if (wm) { showWm(wm.getAttribute("data-wm-nav")); return; }
        var go = event.target.closest("[data-wm-go]");
        if (go) { goLegacy(go.getAttribute("data-wm-go")); return; }
        if (event.target.closest("[data-section]") && !event.target.closest("[data-wm-group]")) {
            group.querySelectorAll(".admin-nav-link").forEach(function (b) { b.classList.remove("is-active"); });
            PAGES.forEach(function (p) { var panel = document.getElementById("section-" + p.id); if (panel) panel.hidden = true; });
        }
    }, true);

    /* Buttons inside the panels that open another part of the admin panel. */
    panelParent.addEventListener("click", function (event) {
        var open = event.target.closest("[data-wm-open]");
        if (!open) return;
        var target = open.getAttribute("data-wm-open");
        if (target.indexOf("wm-") === 0) showWm(target);
        else goLegacy(target);
    });

    /* ---------- confirm dialog ---------- */
    var confirmBox = document.createElement("div");
    confirmBox.className = "admin-modal";
    confirmBox.hidden = true;
    confirmBox.innerHTML = '<div class="admin-modal-backdrop" data-no></div><div class="admin-modal-dialog admin-modal-dialog--confirm" role="alertdialog" aria-modal="true">' +
        '<h2 class="admin-modal-title" data-title>Silinsin?</h2><p class="admin-confirm-text" data-text></p><div class="admin-modal-actions">' +
        '<button class="admin-btn admin-btn--secondary" type="button" data-no>Ləğv et</button><button class="admin-btn admin-btn--primary" type="button" data-yes>Sil</button></div></div>';
    document.body.appendChild(confirmBox);
    var onYes = null;
    function ask(text, action, title, yesLabel) {
        confirmBox.querySelector("[data-title]").textContent = title || "Silinsin?";
        confirmBox.querySelector("[data-yes]").textContent = yesLabel || "Sil";
        confirmBox.querySelector("[data-text]").textContent = text;
        onYes = action;
        confirmBox.hidden = false;
    }
    confirmBox.addEventListener("click", function (event) {
        if (event.target.closest("[data-no]")) { confirmBox.hidden = true; onYes = null; }
        else if (event.target.closest("[data-yes]")) { var action = onYes; confirmBox.hidden = true; onYes = null; if (action) action(); }
    });

    /* ---------- text sections ---------- */
    /* A card per section of a page: its fields come from the stored texts, Save writes only the changed ones, Cancel brings the saved values back. */
    function renderTextSections(host, page, rows, sections) {
        var html = sections.map(function (section, index) {
            var keys = section.keys.filter(function (key) { return rows[key]; });
            if (!keys.length && !section.mount) return "";
            return '<div class="admin-panel admin-panel--cream" data-sec="' + index + '"><h3>' + esc(section.title) + '</h3>' +
                '<p class="wm-where">' + esc(section.where) + (section.url ? ' · <a href="' + esc(section.url) + '" target="_blank" rel="noopener">Saytda bax</a>' : "") + "</p>" +
                (keys.length ? '<div class="wm-fields">' : "") + keys.map(function (key) {
                    var value = rows[key].textAz;
                    var long = value.length > 70 || /desc|text|lead|detail|sub/i.test(key);
                    var id = "wm-t-" + page + "-" + key.replace(/[^\w-]/g, "_");
                    return '<div class="admin-field' + (long ? " admin-field--full" : "") + '"><label for="' + id + '">' + esc(section.labels && section.labels[key] ? section.labels[key] : humanize(key)) +
                        '<span class="wm-key">' + esc(key) + "</span></label>" +
                        (long ? '<textarea id="' + id + '" data-tkey="' + esc(key) + '" rows="3">' : '<input type="text" id="' + id + '" data-tkey="' + esc(key) + '" value="' + esc(value) + '">') +
                        (long ? esc(value) + "</textarea>" : "") + '<div class="wm-err" data-terr="' + esc(key) + '"></div></div>';
                }).join("") + (keys.length ? "</div>" : "") +
                (keys.length ? '<div class="wm-bar"><span class="wm-dirty" data-tdirty></span><button class="admin-btn admin-btn--secondary" type="button" data-tcancel>Ləğv et</button>' +
                '<button class="admin-btn admin-btn--primary" type="button" data-tsave disabled>Yadda saxla</button></div>' : "") +
                '<div class="wm-card-extra" data-extra></div></div>';
        }).join("");
        var container = document.createElement("div");
        container.className = "wm-stack";
        container.innerHTML = html || '<div class="wm-empty">Bu səhifənin mətnləri hələ bazada yoxdur. API-ni yenidən başladın.</div>';
        host.appendChild(container);

        container.querySelectorAll("[data-sec]").forEach(function (card) {
            var section = sections[Number(card.getAttribute("data-sec"))];
            if (section.mount) section.mount(card.querySelector("[data-extra]"));
            var saveButton = card.querySelector("[data-tsave]");
            if (!saveButton) return;
            var dirty = card.querySelector("[data-tdirty]");
            function changed() {
                return Array.prototype.filter.call(card.querySelectorAll("[data-tkey]"), function (input) { return input.value.trim() !== rows[input.getAttribute("data-tkey")].textAz; });
            }
            card.addEventListener("input", function () {
                var n = changed().length;
                saveButton.disabled = n === 0;
                dirty.textContent = n ? n + " dəyişiklik yadda saxlanmayıb" : "";
            });
            card.querySelector("[data-tcancel]").addEventListener("click", function () {
                card.querySelectorAll("[data-tkey]").forEach(function (input) { input.value = rows[input.getAttribute("data-tkey")].textAz; });
                saveButton.disabled = true;
                dirty.textContent = "";
                card.querySelectorAll("[data-terr]").forEach(function (e) { e.textContent = ""; });
            });
            saveButton.addEventListener("click", function () {
                var inputs = changed();
                saveButton.disabled = true;
                var chain = Promise.resolve();
                var failed = 0;
                inputs.forEach(function (input) {
                    var key = input.getAttribute("data-tkey");
                    var err = card.querySelector('[data-terr="' + key + '"]');
                    err.textContent = "";
                    if (!input.value.trim()) { err.textContent = "Mətn boş ola bilməz."; failed++; return; }
                    chain = chain.then(function () { return saveValue(page, key, input.value, rows); }).then(function () {
                        rows[key].textAz = input.value.trim();
                    }).catch(function (error) { failed++; err.textContent = (error && (error.userMessage || error.message)) || "Xəta."; });
                });
                chain.then(function () {
                    notify(failed ? "Bəzi sahələr yadda saxlanılmadı." : "Dəyişikliklər yadda saxlanıldı. Sayt səhifəni yenilədikdə görünəcək.", !!failed);
                    var n = changed().length;
                    saveButton.disabled = n === 0;
                    dirty.textContent = n ? n + " dəyişiklik yadda saxlanmayıb" : "";
                });
            });
        });
    }

    function loadingHtml() { return '<div class="wm-empty">Yüklənir...</div>'; }

    /* ---------- picture slot (logo and About page photos) ---------- */
    function slotCards(host, wanted) {
        var box = document.createElement("div");
        box.className = "wm-stack";
        host.appendChild(box);
        function render() {
            api.get("api/admin/media/slots", { fresh: true }).then(function (slots) {
                box.innerHTML = slots.filter(function (s) { return wanted.indexOf(s.slot) >= 0; }).map(function (s) {
                    return '<div class="wm-slot wm-slot-inline" data-slot="' + esc(s.slot) + '">' +
                        (s.url ? '<img data-preview src="' + esc(api.url(s.url)) + '" alt="">' : '<div class="wm-ph" data-preview-ph>Hazırda səhifənin öz şəkli göstərilir</div>') +
                        '<div><h3>' + esc(s.label) + '</h3><p class="wm-where">' + (s.path ? "Yüklənmiş şəkil: " + esc(s.path) : "Standart şəkil istifadə olunur. Yeni şəkil yükləsəniz onu əvəz edəcək.") + "</p>" +
                        '<input type="file" data-file accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"><div class="wm-err" data-err></div>' +
                        '<div class="wm-bar" style="justify-content:flex-start"><button class="admin-btn admin-btn--primary" type="button" data-upload disabled>Yüklə</button>' +
                        '<button class="admin-btn admin-btn--ghost" type="button" data-remove' + (s.path ? "" : " disabled") + ">Standarta qaytar</button></div></div></div>";
                }).join("");
            }).catch(fail);
        }
        box.addEventListener("change", function (event) {
            var input = event.target.closest("[data-file]");
            if (!input) return;
            var card = input.closest("[data-slot]");
            var err = card.querySelector("[data-err]");
            var file = input.files[0];
            err.textContent = checkImage(file);
            card.querySelector("[data-upload]").disabled = !file || !!err.textContent;
            if (file && !err.textContent) {
                var holder = card.querySelector("[data-preview],[data-preview-ph]");
                var img = document.createElement("img");
                img.setAttribute("data-preview", "");
                img.src = URL.createObjectURL(file);
                img.alt = "";
                holder.parentNode.replaceChild(img, holder);
            }
        });
        box.addEventListener("click", function (event) {
            var card = event.target.closest("[data-slot]");
            if (!card) return;
            var slot = card.getAttribute("data-slot");
            if (event.target.closest("[data-upload]")) {
                var file = card.querySelector("[data-file]").files[0];
                if (!file) return;
                event.target.closest("[data-upload]").disabled = true;
                sendFile("POST", "api/admin/media/slots/" + encodeURIComponent(slot), file).then(function () {
                    notify("Şəkil yükləndi.", false);
                    render();
                }).catch(function (error) { fail(error); render(); });
            } else if (event.target.closest("[data-remove]")) {
                ask("Yüklənmiş şəkil silinsin və səhifə standart şəklə qayıtsın?", function () {
                    api.del("api/admin/media/slots/" + encodeURIComponent(slot)).then(function () { notify("Standart şəkil bərpa olundu.", false); render(); }).catch(fail);
                });
            }
        });
        render();
    }

    /* ---------- link table (menu and footer links) ---------- */
    var HEADER_LINKS = [
        { id: "nav.home", label: "Ana səhifə", url: "index.html" },
        { id: "nav.booking", label: "Bron", url: "booking.html" },
        { id: "nav.destinations", label: "İstiqamətlər", url: "destinations.html" },
        { id: "nav.brandStory", label: "AEROVA haqqında", url: "about-aerova.html" }
    ];
    var FOOTER_LINKS = [
        { id: "footer.home", label: "Ana səhifə", url: "index.html" },
        { id: "footer.flights", label: "Uçuşlar", url: "booking.html" },
        { id: "footer.destinations", label: "İstiqamətlər", url: "destinations.html" },
        { id: "nav.experience", label: "Təcrübə", url: "about-aerova.html" },
        { id: "footer.about", label: "Haqqımızda", url: "about-aerova.html" },
        { id: "footer.manageBooking", label: "Bronu idarə et", url: "manage-booking.html" },
        { id: "footer.myTrips", label: "Səyahətlərim", url: "my-trips.html" },
        { id: "nav.notifications", label: "Bildirişlər", url: "notifications.html" },
        { id: "footer.faqs", label: "Suallar", url: "support.html#faq" },
        { id: "footer.privacy", label: "Məxfilik siyasəti", url: "index.html#privacy" },
        { id: "footer.terms", label: "Şərtlər və qaydalar", url: "index.html#terms" }
    ];

    function linkTable(host, links, title, where) {
        var panel = document.createElement("div");
        panel.className = "admin-panel admin-panel--cream";
        panel.innerHTML = "<h3>" + esc(title) + '</h3><p class="wm-where">' + esc(where) + "</p>" + loadingHtml();
        host.appendChild(panel);

        loadRows("site").then(function (rows) {
            function val(id, part, fallback) { var row = rows["link." + id + "." + part]; return row ? row.textAz : fallback; }
            panel.innerHTML = "<h3>" + esc(title) + '</h3><p class="wm-where">' + esc(where) + '</p><div class="admin-table-wrap"><table class="wm-links"><thead><tr><th>Mətn</th><th>Link</th><th>Göstər</th><th>Sıra</th><th></th></tr></thead><tbody>' +
                links.map(function (link, index) {
                    return '<tr data-link="' + esc(link.id) + '"><td><input type="text" data-part="label" maxlength="100" value="' + esc(val(link.id, "label", link.label)) + '"></td>' +
                        '<td><input type="text" data-part="url" maxlength="300" value="' + esc(val(link.id, "url", link.url)) + '"><div class="wm-err" data-err></div></td>' +
                        '<td><input type="checkbox" data-part="visible" aria-label="Göstər"' + (val(link.id, "visible", "1") === "0" ? "" : " checked") + "></td>" +
                        '<td><input type="number" data-part="order" min="0" max="999" value="' + esc(val(link.id, "order", String((index + 1) * 10))) + '"></td>' +
                        '<td><button class="admin-btn admin-btn--ghost" type="button" data-reset>Standart</button></td></tr>';
                }).join("") + '</tbody></table></div><div class="wm-bar"><span class="wm-dirty" data-dirty></span><button class="admin-btn admin-btn--secondary" type="button" data-cancel>Ləğv et</button>' +
                '<button class="admin-btn admin-btn--primary" type="button" data-save>Yadda saxla</button></div>';

            panel.querySelector("[data-cancel]").addEventListener("click", function () { panel.remove(); linkTable(host, links, title, where); });

            panel.querySelector("[data-save]").addEventListener("click", function () {
                var chain = Promise.resolve();
                var failed = 0;
                var pending = [];
                panel.querySelectorAll("tr[data-link]").forEach(function (tr) {
                    var link = links.filter(function (l) { return l.id === tr.getAttribute("data-link"); })[0];
                    var err = tr.querySelector("[data-err]");
                    err.textContent = "";
                    var label = tr.querySelector('[data-part="label"]').value.trim();
                    var url = tr.querySelector('[data-part="url"]').value.trim();
                    var visible = tr.querySelector('[data-part="visible"]').checked ? "1" : "0";
                    var order = tr.querySelector('[data-part="order"]').value.trim();
                    if (!label) { err.textContent = "Mətn boş ola bilməz."; failed++; return; }
                    if (!safeLink(url)) { err.textContent = "Link səhifə adı (məs. about-aerova.html) və ya https:// ilə başlamalıdır."; failed++; return; }
                    if (!/^\d{1,3}$/.test(order)) { err.textContent = "Sıra 0-999 arası rəqəm olmalıdır."; failed++; return; }
                    pending.push({ link: link, err: err, values: { label: label, url: url, visible: visible, order: order } });
                });
                if (failed) { notify("Səhvləri düzəldin, heç nə yadda saxlanılmadı.", true); return; }
                pending.forEach(function (item) {
                    Object.keys(item.values).forEach(function (part) {
                        chain = chain.then(function () { return saveValue("site", "link." + item.link.id + "." + part, item.values[part], rows); });
                    });
                    chain = chain.catch(function (error) { failed++; item.err.textContent = (error && (error.userMessage || error.message)) || "Xəta."; });
                });
                chain.then(function () {
                    notify(failed ? "Bəzi keçidlər yadda saxlanılmadı." : "Keçidlər yadda saxlanıldı. Sayt səhifəni yenilədikdə görünəcək.", !!failed);
                    if (!failed) { panel.remove(); linkTable(host, links, title, where); }
                });
            });

            panel.addEventListener("click", function (event) {
                var reset = event.target.closest("[data-reset]");
                if (!reset) return;
                var id = reset.closest("tr").getAttribute("data-link");
                var existing = ["label", "url", "visible", "order"].map(function (p) { return rows["link." + id + "." + p]; }).filter(Boolean);
                if (!existing.length) { notify("Bu keçid artıq standartdır.", false); return; }
                ask("Bu keçid standart mətn, link və sıraya qaytarılsın?", function () {
                    Promise.all(existing.map(function (row) { return api.del("api/admin/site-content/" + row.id); })).then(function () {
                        notify("Keçid standarta qaytarıldı.", false);
                        panel.remove();
                        linkTable(host, links, title, where);
                    }).catch(fail);
                });
            });
        }).catch(function (error) { panel.innerHTML = '<div class="wm-empty">Yüklənmədi.</div>'; fail(error); });
    }

    /* ---------- single-value settings (links and contact details) ---------- */
    function settingsCard(host, title, where, fields) {
        var panel = document.createElement("div");
        panel.className = "admin-panel admin-panel--cream";
        host.appendChild(panel);
        loadRows("site").then(function (rows) {
            panel.innerHTML = "<h3>" + esc(title) + '</h3><p class="wm-where">' + esc(where) + '</p><div class="wm-fields">' + fields.map(function (f) {
                return '<div class="admin-field"><label for="wm-s-' + esc(f.key) + '">' + esc(f.label) + '</label><input type="text" id="wm-s-' + esc(f.key) + '" data-key="' + esc(f.key) + '" maxlength="500" placeholder="' + esc(f.hint || "") +
                    '" value="' + esc(rows[f.key] ? rows[f.key].textAz : "") + '"><div class="wm-err" data-err="' + esc(f.key) + '"></div></div>';
            }).join("") + '</div><div class="wm-bar"><button class="admin-btn admin-btn--secondary" type="button" data-cancel>Ləğv et</button><button class="admin-btn admin-btn--primary" type="button" data-save>Yadda saxla</button></div>';
            panel.querySelector("[data-cancel]").addEventListener("click", function () { panel.remove(); settingsCard(host, title, where, fields); });
            panel.querySelector("[data-save]").addEventListener("click", function () {
                var chain = Promise.resolve();
                var failed = 0;
                fields.forEach(function (f) {
                    var input = panel.querySelector('[data-key="' + f.key + '"]');
                    var err = panel.querySelector('[data-err="' + f.key + '"]');
                    err.textContent = "";
                    if (input.value.trim() && f.link && !safeLink(input.value.trim())) { err.textContent = "Link səhifə adı və ya https:// ilə başlamalıdır."; failed++; }
                });
                if (failed) { notify("Səhvləri düzəldin, heç nə yadda saxlanılmadı.", true); return; }
                fields.forEach(function (f) {
                    var input = panel.querySelector('[data-key="' + f.key + '"]');
                    var err = panel.querySelector('[data-err="' + f.key + '"]');
                    var value = input.value.trim();
                    chain = chain.then(function () { return saveValue("site", f.key, value, rows); }).catch(function (error) { failed++; err.textContent = (error && (error.userMessage || error.message)) || "Xəta."; });
                });
                chain.then(function () {
                    notify(failed ? "Bəzi sahələr yadda saxlanılmadı." : "Yadda saxlanıldı.", !!failed);
                    if (!failed) { panel.remove(); settingsCard(host, title, where, fields); }
                });
            });
        }).catch(fail);
    }

    var SOCIAL_FIELDS = [
        { key: "social.facebook", label: "Facebook", hint: "https://...", link: true },
        { key: "social.instagram", label: "Instagram", hint: "https://...", link: true },
        { key: "social.x", label: "X", hint: "https://...", link: true },
        { key: "social.youtube", label: "YouTube", hint: "https://...", link: true },
        { key: "social.linkedin", label: "LinkedIn", hint: "https://...", link: true }
    ];
    var CONTACT_FIELDS = [
        { key: "contact.email", label: "E-poçt", hint: "info@aerova.az" },
        { key: "contact.phone", label: "Telefon", hint: "+994 ..." },
        { key: "contact.address", label: "Ünvan", hint: "" }
    ];

    /*
     * The hero video, the destination catalog and the sight pictures already have working management blocks. Instead of a second copy, the block
     * is moved into the section of the page that owns it (the scripts keep working because the elements stay the same) and its own loader runs.
     */
    var adopted = {};
    function adopt(box, name, title, load) {
        var node = adopted[name];
        if (!node) {
            node = document.createElement("div");
            node.className = "wm-adopted";
            var source = name === "destinations" ? document.getElementById("destinations-panel") : document.getElementById("section-" + name);
            if (!source) return;
            if (name === "destinations") {
                node.appendChild(source);
            } else {
                Array.prototype.slice.call(source.children).forEach(function (child) { node.appendChild(child); });
            }
            adopted[name] = node;
        }
        if (title) {
            var heading = document.createElement("h4");
            heading.textContent = title;
            box.appendChild(heading);
        }
        box.appendChild(node);
        if (load) load();
    }

    /* ---------- page builders ---------- */
    function pageShell(panel, intro) {
        panel.innerHTML = '<div class="wm-stack">' + (intro ? '<div class="wm-note">' + intro + "</div>" : "") + "<div data-body>" + loadingHtml() + "</div></div>";
        var body = panel.querySelector("[data-body]");
        body.innerHTML = "";
        body.className = "wm-stack";
        return body;
    }

    function openRow(items) {
        return '<div class="wm-actions">' + items.map(function (i) { return '<button class="admin-btn admin-btn--secondary" type="button" data-wm-open="' + i[0] + '">' + esc(i[1]) + "</button>"; }).join("") + "</div>";
    }

    function textPage(panel, intro, page, sections, extra) {
        var body = pageShell(panel, intro);
        if (extra) extra(body);
        var holder = document.createElement("div");
        holder.innerHTML = loadingHtml();
        body.appendChild(holder);
        loadRows(page).then(function (rows) {
            holder.innerHTML = "";
            var defs = typeof sections === "function" ? sections(rows) : sections;
            renderTextSections(holder, page, rows, defs);
        }).catch(function (error) { holder.innerHTML = '<div class="wm-empty">Mətnlər yüklənmədi.</div>'; fail(error); });
    }

    function pick(rows, test) { return Object.keys(rows).filter(test); }

    /* ---------- the pictures of the site (built-in files and uploaded ones) ---------- */
    /*
     * The built-in pictures are files of the website itself, which the API cannot overwrite. "Dəyiş" uploads a new picture and makes the
     * city, country, card or page show it instead; "Standarta qaytar" removes the upload and the built-in picture is shown again.
     */
    function siteImages(host) {
        host.innerHTML = loadingHtml();
        var imageUrl = function (path) {
            var text = String(path || "");
            if (!text) return "";
            if (/^https?:\/\//i.test(text) || text.indexOf("assets/") === 0) return text;
            return mediaUrl(text);
        };
        var destinations = window.AEROVA_DESTINATIONS;

        Promise.all([
            api.get("api/admin/destinations", { fresh: true }),
            api.get("api/admin/home-cards", { fresh: true }),
            api.get("api/admin/media/slots", { fresh: true })
        ]).then(function (results) {
            var countries = results[0] || [];
            var items = [];
            countries.forEach(function (country) {
                (country.cities || []).forEach(function (city) {
                    var shown = destinations && destinations.cityPhotoUrls ? destinations.cityPhotoUrls(city).sm : "";
                    items.push({ group: "Şəhərlər", name: (city.nameAz || city.name) + " · " + (country.nameAz || country.name), shown: shown, uploaded: String(city.imageFile || "").indexOf("destinations/") === 0, upload: "api/admin/destinations/cities/" + city.id + "/image", revert: true });
                });
            });
            (results[1] || []).forEach(function (card) {
                var uploaded = !!card.imagePath && card.imagePath.indexOf("assets/") !== 0;
                items.push({ group: "Ana səhifə kartları", name: (card.section === "premium" ? "Premium: " : "Niyə AEROVA: ") + card.title, shown: imageUrl(card.imagePath), uploaded: uploaded, upload: "api/admin/home-cards/" + card.id + "/image", revert: uploaded, removeLabel: "Şəkli sil" });
            });
            (results[2] || []).forEach(function (slot) {
                items.push({ group: "Loqo və Haqqında", name: slot.label, shown: slot.url ? api.url(slot.url) : "", uploaded: !!slot.path, upload: "api/admin/media/slots/" + encodeURIComponent(slot.slot), revert: true, builtIn: true });
            });

            var groups = {};
            items.forEach(function (item, index) { item.index = index; (groups[item.group] = groups[item.group] || []).push(item); });
            host.innerHTML = '<div class="wm-stack"><div class="wm-note">Saytda göstərilən bütün şəkillər. Standart şəkil saytın öz faylıdır (ölkə şəkilləri saytda göstərilmədiyi üçün burada yoxdur); "Dəyiş" yeni şəkil yükləyir və o göstərilir, "Standarta qaytar" yüklənəni silib standartı geri qaytarır.</div>' +
                '<div class="wm-filters"><input class="admin-search" type="search" data-q placeholder="Ad üzrə axtarış"></div>' +
                Object.keys(groups).map(function (name) {
                    return '<div class="admin-panel admin-panel--cream"><h3>' + esc(name) + " (" + groups[name].length + ')</h3><div class="wm-media">' + groups[name].map(function (item) {
                        var holder = item.shown ? '<img loading="lazy" src="' + esc(item.shown) + '" alt="" data-img>' : '<div class="wm-ph">' + (item.builtIn ? "Səhifənin öz şəkli" : "Şəkil yoxdur") + "</div>";
                        return '<div class="wm-file" data-i="' + item.index + '" data-name="' + esc(item.name.toLowerCase()) + '">' + holder +
                            '<div class="wm-body"><div class="wm-name">' + esc(item.name) + '</div><div><span class="wm-chip' + (item.uploaded ? "" : " wm-chip--free") + '">' + (item.uploaded ? "Yüklənmiş" : "Standart (sayt faylı)") + "</span></div>" +
                            '<div class="wm-actions"><label class="admin-btn admin-btn--secondary" style="cursor:pointer">Dəyiş<input type="file" data-change hidden accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"></label>' +
                            (item.uploaded && item.revert ? '<button class="admin-btn admin-btn--ghost" type="button" data-revert>' + (item.removeLabel || "Standarta qaytar") + "</button>" : "") +
                            '</div><div class="wm-err" data-err></div></div></div>';
                    }).join("") + "</div></div>";
                }).join("") + "</div>";

            /* A built-in picture that does not exist as a file shows a plain placeholder instead of a broken image. */
            host.querySelectorAll("[data-img]").forEach(function (img) {
                img.addEventListener("error", function () {
                    var placeholder = document.createElement("div");
                    placeholder.className = "wm-ph";
                    placeholder.textContent = "Şəkil yoxdur";
                    img.replaceWith(placeholder);
                });
            });
            host.querySelector("[data-q]").addEventListener("input", function (event) {
                var q = event.target.value.trim().toLowerCase();
                host.querySelectorAll(".wm-file").forEach(function (card) { card.hidden = !!q && card.getAttribute("data-name").indexOf(q) < 0; });
            });
            host.addEventListener("change", function (event) {
                var input = event.target.closest("[data-change]");
                if (!input) return;
                var card = input.closest("[data-i]");
                var item = items[Number(card.getAttribute("data-i"))];
                var file = input.files[0];
                var err = card.querySelector("[data-err]");
                err.textContent = checkImage(file);
                if (!file || err.textContent) return;
                sendFile("POST", item.upload, file).then(function () { notify("Şəkil dəyişdirildi.", false); siteImages(host); }).catch(function (error) { err.textContent = error.userMessage || "Xəta."; });
            });
            host.addEventListener("click", function (event) {
                var revert = event.target.closest("[data-revert]");
                if (!revert) return;
                var card = revert.closest("[data-i]");
                var item = items[Number(card.getAttribute("data-i"))];
                ask('"' + item.name + '" üçün yüklənmiş şəkil silinsin?', function () {
                    api.del(item.upload).then(function () { notify("Şəkil silindi.", false); siteImages(host); }).catch(fail);
                }, "Şəkil silinsin?", "Sil");
            });
        }).catch(function (error) { host.innerHTML = '<div class="wm-empty">Yüklənmədi.</div>'; fail(error); });
    }

    var builders = {
        "wm-overview": function (panel) {
            panel.innerHTML = '<div class="wm-stack"><div class="wm-note">Burada saytın görünən hissələri idarə olunur. Uçuş, bron, ödəniş və digər əməliyyat bölmələri yuxarıdakı menyuda ayrıca qalır.</div><div class="wm-grid" data-grid></div></div>';
            var grid = panel.querySelector("[data-grid]");
            var cards = [
                ["wm-home", "Ana səhifə", "Əsas ekran, axtarış, kartlar, newsletter", "home"],
                ["wm-about", "AEROVA haqqında", "Hekayə, salonlar, xidmətlər, şəkillər", "about"],
                ["wm-destinations", "İstiqamətlər", "Başlıqlar, ölkə/şəhər şəkilləri, görməli yerlər", "destinations"],
                ["wm-support", "Dəstək və FAQ", "Dəstək mətnləri, suallar, əlaqə", "support"],
                ["wm-header", "Başlıq və menyu", "Loqo və menyu keçidləri", "header"],
                ["wm-footer", "Footer", "Mətnlər, keçidlər, sosial şəbəkələr", "footer"],
                ["wm-media", "Media kitabxanası", "Bütün şəkillər və istifadə yerləri", "media"]
            ];
            grid.innerHTML = cards.map(function (c) {
                return '<div class="wm-card"><h3>' + esc(c[1]) + "</h3><p>" + esc(c[2]) + '</p><p class="wm-stat" data-stat="' + c[3] + '">&nbsp;</p><div class="wm-actions"><button class="admin-btn admin-btn--primary" type="button" data-wm-open="' + c[0] + '">Aç</button></div></div>';
            }).join("");
            function stat(name, text) { var el = grid.querySelector('[data-stat="' + name + '"]'); if (el) el.textContent = text; }
            ["home", "about", "support", "destinations", "footer"].forEach(function (page) {
                api.get("api/admin/site-content", { fresh: true, query: { page: page } }).then(function (rows) { stat(page, (rows || []).length + " mətn"); }).catch(function () { stat(page, "—"); });
            });
            api.get("api/admin/faq", { fresh: true }).then(function (items) { var el = grid.querySelector('[data-stat="support"]'); if (el) el.textContent += " · " + (items || []).length + " sual"; }).catch(function () {});
            api.get("api/admin/home-cards", { fresh: true }).then(function (items) { var el = grid.querySelector('[data-stat="home"]'); if (el) el.textContent += " · " + (items || []).length + " kart"; }).catch(function () {});
            api.get("api/admin/media", { fresh: true }).then(function (files) {
                var unused = (files || []).filter(function (f) { return !f.usedBy.length; }).length;
                stat("media", (files || []).length + " fayl · " + unused + " istifadəsiz");
            }).catch(function () { stat("media", "—"); });
        },

        "wm-home": function (panel) {
            var cms = window.AEROVA_ADMIN_CMS;
            textPage(panel, "Bu səhifə <strong>index.html</strong>-də göstərilir. Hər bölmənin içində həmin bölmənin mətnləri, şəkilləri, videosu və kartları birlikdə idarə olunur.", "home", function () {
                return [
                    {
                        title: "Əsas ekran", where: "Ən yuxarıdakı böyük başlıq, düymə və arxa fon videosu", url: "index.html#hero",
                        keys: ["home.heroEyebrow", "home.heroTitle1", "home.heroTitle2", "home.heroDescription", "home.bookNow", "home.heroAria"],
                        mount: function (box) {
                            settingsCard(box, "Düymənin linki", "\"İndi bron et\" düyməsi hara aparır.", [{ key: "hero.ctaUrl", label: "Düymə linki", hint: "booking.html", link: true }]);
                            adopt(box, "hero-video", "Hero video və poster", function () { if (window.AEROVA_ADMIN_HERO_VIDEO) window.AEROVA_ADMIN_HERO_VIDEO.load(); });
                        }
                    },
                    { title: "Uçuş axtarışı", where: "Əsas ekranın altındakı axtarış qutusu", url: "index.html#flight-search", keys: ["home.searchTitle", "home.searchPlaceholder", "home.searchFlights", "home.voiceStart"] },
                    { title: "İstiqamətlər bölməsi", where: "Şəhər kartlarının başlığı (şəhərlər və şəkilləri İstiqamətlər səhifəsindən idarə olunur)", url: "index.html#destinations", keys: ["ui.exploreTheWorld", "ui.discoverYourNextDestination", "home.destinationsDesc"] },
                    {
                        title: "Niyə AEROVA", where: "Üstünlük kartları: başlıq, təsvir, ikon, link, sıra və aktiv/passiv", url: "index.html#why-aerova",
                        keys: ["home.premiumEyebrow", "ui.travelBetterWithAerova", "ui.aerovaCombinesEffortlessBookingFlexibleTravel"],
                        mount: function (box) { if (cms) cms.mountCards(box, "why"); }
                    },
                    {
                        title: "Premium təcrübə (salon sinifləri)", where: "Şəkilli kartlar: başlıq, təsvir, şəkil, link, sıra və aktiv/passiv", url: "index.html#premium-experience",
                        keys: ["home.premiumTitle", "home.premiumDesc"],
                        mount: function (box) { if (cms) cms.mountCards(box, "premium"); }
                    },
                    { title: "Newsletter", where: "Səhifənin aşağısındakı abunə bölməsi", url: "index.html#newsletter", keys: ["home.newsletterEyebrow", "home.newsletterTitle", "home.newsletterDesc", "home.newsletterLabel", "home.newsletterPlaceholder", "home.newsletterButton"] }
                ];
            });
        },

        "wm-about": function (panel) {
            textPage(panel, "Bu səhifə <strong>about-aerova.html</strong>-də göstərilir. Hər bölmənin mətni və şəkli bir yerdə düzəldilir.", "about", function (rows) {
                var used = {};
                function group(title, where, test, slots) {
                    var keys = pick(rows, function (k) { return !used[k] && test(k); });
                    keys.forEach(function (k) { used[k] = true; });
                    var def = { title: title, where: where, url: "about-aerova.html", keys: keys };
                    if (slots) def.mount = function (box) { slotCards(box, slots); };
                    return def;
                }
                return [
                    group("Əsas ekran", "Səhifənin yuxarısı və əsas şəkil", function (k) { return /^hero/.test(k); }, ["about.hero"]),
                    group("Hekayə, missiya, vizyon", "Brend hekayəsi bölməsi", function (k) { return /^(story|mission|vision|philosophy)/.test(k); }),
                    group("Salonlar", "Economy, Comfort və Business kartları və şəkilləri", function (k) { return /^(classes|(economy|comfort|business)(Name|Text|Link))/.test(k); }, ["about.economy", "about.comfort", "about.business"]),
                    group("Salon təfərrüatları", "Hər salonun siyahısı və bron düyməsi", function (k) { return /^cabinEyebrow|Detail|Book$/.test(k); }),
                    group("Səyahət addımları", "Addım-addım bölmə", function (k) { return /^(journey|step)/.test(k); }),
                    group("Xidmətlər və dəyərlər", "Xidmət və dəyər kartları", function (k) { return /^(services|svc|values|val)/.test(k); }),
                    group("Yekun çağırış", "Səhifənin sonundakı çağırış", function (k) { return /^final/.test(k); }),
                    group("Digər mətnlər", "Başqa sahələr", function () { return true; })
                ];
            });
        },

        "wm-destinations": function (panel) {
            textPage(panel, "Ölkələr, şəhərlər, təsvirlər, şəkillər və görməli yerlər bu səhifədə birlikdə idarə olunur.", "destinations", function (rows) {
                return [
                    {
                        title: "Ölkə və şəhər kataloqu", where: "Adlar, təsvirlər, aktiv/passiv, şəhər şəkilləri (yüklə, önizlə, dəyiş, sil)", url: "destinations.html", keys: [],
                        mount: function (box) { adopt(box, "destinations", null, function () { if (window.AEROVA_ADMIN && window.AEROVA_ADMIN.loadDestinations) window.AEROVA_ADMIN.loadDestinations(); }); }
                    },
                    {
                        title: "Görməli yerlər (qalereya)", where: "Şəhər səhifələrindəki görməli yer şəkilləri", url: "destinations.html", keys: [],
                        mount: function (box) { adopt(box, "sight-media", null, function () { if (window.AEROVA_ADMIN_SIGHT_MEDIA) window.AEROVA_ADMIN_SIGHT_MEDIA.load(); }); }
                    },
                    { title: "Səhifə başlıqları", where: "destinations.html və destination-details.html", url: "destinations.html", keys: Object.keys(rows) }
                ];
            });
        },

        "wm-support": function (panel) {
            var cms = window.AEROVA_ADMIN_CMS;
            textPage(panel, "Bu səhifə <strong>support.html</strong>-də göstərilir. Mətnlər, suallar və əlaqə məlumatları burada birlikdədir.", "support", function (rows) {
                return [
                    { title: "Səhifə mətnləri", where: "support.html başlıqları və boş vəziyyət mətni", url: "support.html", keys: pick(rows, function (k) { return !/^support\.faq\./.test(k); }) },
                    {
                        title: "Tez-tez verilən suallar", where: "Sual, cavab, sıra və aktiv/passiv", url: "support.html#faq", keys: [],
                        mount: function (box) { if (cms) cms.mountFaq(box); }
                    },
                    {
                        title: "Əlaqə məlumatları", where: "Footer-də göstərilir. Boş buraxılan sahə göstərilmir.", url: "index.html", keys: [],
                        mount: function (box) { settingsCard(box, "E-poçt, telefon, ünvan", "", CONTACT_FIELDS); }
                    }
                ];
            });
        },

        "wm-header": function (panel) {
            var body = pageShell(panel, "Başlıq bütün səhifələrdə göstərilir. Loqo yüklənməyibsə, standart AEROVA yazısı qalır.");
            var logo = document.createElement("div");
            logo.className = "admin-panel admin-panel--cream";
            logo.innerHTML = "<h3>Loqo</h3><p class=\"wm-where\">Başlıqda və footer-də göstərilir. Şəffaf PNG və ya WEBP tövsiyə olunur.</p>";
            body.appendChild(logo);
            slotCards(logo, ["logo"]);
            linkTable(body, HEADER_LINKS, "Menyu keçidləri", "Hər səhifənin yuxarısındakı əsas menyu. Sıra kiçik rəqəmdən böyüyə doğrudur; \"Göstər\" söndürülsə keçid gizlənir.");
        },

        "wm-footer": function (panel) {
            textPage(panel, "Footer bütün ictimai səhifələrdə göstərilir.", "footer", function (rows) {
                var linked = {};
                FOOTER_LINKS.forEach(function (l) { linked[l.id] = true; });
                return [{ title: "Footer mətnləri", where: "Footer-in təsviri, sütun başlıqları və müəllif hüququ", url: "index.html", keys: pick(rows, function (k) { return !linked[k]; }) }];
            }, function (body) {
                var logoBox = document.createElement("div");
                logoBox.className = "admin-panel admin-panel--cream";
                logoBox.innerHTML = "<h3>Loqo</h3><p class=\"wm-where\">Footer-də göstərilir (başlıqdakı loqo ilə eynidir).</p>";
                body.appendChild(logoBox);
                slotCards(logoBox, ["logo"]);
                linkTable(body, FOOTER_LINKS, "Footer keçidləri", "Mətn, link, görünmə və sıra. Boş qalan sahə standart dəyəri saxlayır.");
                settingsCard(body, "Sosial şəbəkələr", "Footer-dəki sosial ikonların linkləri (yalnız https://).", SOCIAL_FIELDS);
                settingsCard(body, "Əlaqə məlumatları", "Footer-də göstərilir. Boş buraxılan sahə göstərilmir.", CONTACT_FIELDS);
            });
        },

        "wm-media": function (panel) {
            panel.innerHTML = '<div class="wm-stack"><div class="wm-filters"><button class="admin-btn admin-btn--primary" type="button" data-tab="files">Yüklənmiş fayllar</button><button class="admin-btn admin-btn--secondary" type="button" data-tab="site">Saytın şəkilləri</button></div>' +
                '<div data-site-images hidden></div><div class="wm-stack" data-files-tab><div class="wm-note">Burada yüklənmiş bütün şəkillər görünür. Şəkil başqa yerdə istifadə olunursa silinə bilməz; dəyişdirmə fayl adını saxlayır, buna görə şəkil istifadə olunan hər yerdə yenilənir.</div>' +
                '<div class="wm-filters"><select class="admin-select" data-category aria-label="Kateqoriya"><option value="">Bütün kateqoriyalar</option><option value="site">Sayt (loqo, haqqında)</option><option value="home">Ana səhifə</option><option value="destinations">İstiqamətlər</option><option value="sights">Görməli yerlər</option><option value="hero">Hero video</option></select>' +
                '<label class="wm-switch"><input type="checkbox" data-unused> Yalnız istifadə olunmayanlar</label><input class="admin-search" type="search" data-search placeholder="Fayl adı üzrə axtarış"><button class="admin-btn admin-btn--secondary" type="button" data-refresh>Yenilə</button></div>' +
                '<div data-list>' + loadingHtml() + '</div></div></div>';
            var list = panel.querySelector("[data-list]");
            var siteHost = panel.querySelector("[data-site-images]");
            var filesTab = panel.querySelector("[data-files-tab]");
            panel.querySelectorAll("[data-tab]").forEach(function (tab) {
                tab.addEventListener("click", function () {
                    var showSite = tab.getAttribute("data-tab") === "site";
                    siteHost.hidden = !showSite;
                    filesTab.hidden = showSite;
                    panel.querySelectorAll("[data-tab]").forEach(function (t) {
                        t.className = "admin-btn " + (t === tab ? "admin-btn--primary" : "admin-btn--secondary");
                    });
                    if (showSite) siteImages(siteHost); else load();
                });
            });
            var state = { files: [] };

            function render() {
                var query = panel.querySelector("[data-search]").value.trim().toLowerCase();
                var files = state.files.filter(function (f) { return !query || f.fileName.toLowerCase().indexOf(query) >= 0 || f.usedBy.join(" ").toLowerCase().indexOf(query) >= 0; });
                if (!files.length) { list.innerHTML = '<div class="wm-empty">Fayl tapılmadı.</div>'; return; }
                list.innerHTML = '<div class="wm-media">' + files.map(function (f) {
                    return '<div class="wm-file" data-path="' + esc(f.path) + '">' + (f.isImage ? '<img loading="lazy" src="' + esc(api.url(f.url)) + '" alt="">' : '<div class="wm-ph">Video</div>') +
                        '<div class="wm-body"><div class="wm-name">' + esc(f.path) + "</div><div>" + formatSize(f.sizeBytes) + " · " + esc(new Date(f.modifiedUtc).toLocaleDateString("az-AZ")) + "</div>" +
                        "<div>" + (f.usedBy.length ? f.usedBy.map(function (u) { return '<span class="wm-chip">' + esc(u) + "</span>"; }).join("") : '<span class="wm-chip wm-chip--free">İstifadə olunmur</span>') + "</div>" +
                        '<div class="wm-actions">' + (f.isImage ? '<label class="admin-btn admin-btn--secondary" style="cursor:pointer">Dəyiş<input type="file" data-replace hidden accept="' + esc(f.path.replace(/^.*(\.[a-z]+)$/i, "$1")) + '"></label>' : "") +
                        '<button class="admin-btn admin-btn--ghost" type="button" data-delete>Sil</button></div><div class="wm-err" data-err></div></div></div>';
                }).join("") + "</div>";
            }

            function load() {
                list.innerHTML = loadingHtml();
                var query = {};
                if (panel.querySelector("[data-category]").value) query.category = panel.querySelector("[data-category]").value;
                if (panel.querySelector("[data-unused]").checked) query.unusedOnly = "true";
                api.get("api/admin/media", { fresh: true, query: query })
                    .then(function (files) { state.files = files || []; render(); })
                    .catch(function (error) { list.innerHTML = '<div class="wm-empty">Yüklənmədi.</div>'; fail(error); });
            }

            panel.querySelector("[data-category]").addEventListener("change", load);
            panel.querySelector("[data-unused]").addEventListener("change", load);
            panel.querySelector("[data-refresh]").addEventListener("click", load);
            panel.querySelector("[data-search]").addEventListener("input", render);

            list.addEventListener("change", function (event) {
                var input = event.target.closest("[data-replace]");
                if (!input) return;
                var card = input.closest("[data-path]");
                var file = input.files[0];
                var err = card.querySelector("[data-err]");
                err.textContent = checkImage(file);
                if (!file || err.textContent) return;
                var path = card.getAttribute("data-path");
                ask('"' + path + '" faylının şəkli yenisi ilə əvəz olunsun? Bu şəkil istifadə olunan hər yerdə dəyişəcək.', function () {
                    sendFile("PUT", "api/admin/media/file?path=" + encodeURIComponent(path), file).then(function () { notify("Şəkil dəyişdirildi.", false); load(); }).catch(function (error) { err.textContent = error.userMessage || "Xəta."; });
                }, "Şəkil dəyişdirilsin?", "Dəyiş");
                input.value = "";
            });

            list.addEventListener("click", function (event) {
                var del = event.target.closest("[data-delete]");
                if (!del) return;
                var card = del.closest("[data-path]");
                var path = card.getAttribute("data-path");
                ask('"' + path + '" faylı həmişəlik silinsin? Fayl istifadə olunursa silinməyəcək.', function () {
                    api.del("api/admin/media/file", { query: { path: path } }).then(function () { notify("Fayl silindi.", false); load(); })
                        .catch(function (error) { var err = card.querySelector("[data-err]"); if (err) err.textContent = error.userMessage || error.message || "Silinmədi."; fail(error); });
                }, "Fayl silinsin?", "Sil");
            });

            load();
        }
    };

    /* The first time the admin panel is opened the overview is not forced: the operational dashboard stays the landing page. */
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !confirmBox.hidden) { confirmBox.hidden = true; onYes = null; }
    });
})();
