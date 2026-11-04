/**
 * Hero Video Management (api/admin/hero-videos). Loaded on admin.html; hooks into AEROVA admin section loaders.
 */
(function () {
    "use strict";

    var api = window.AEROVA_API;

    function tr(key, fallback) {
        if (typeof window.t === "function") {
            var value = window.t(key);
            if (value && value !== key) return value;
        }
        return fallback;
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function escapeHtml(text) {
        return String(text == null ? "" : text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function readSessionToken() {
        try {
            return sessionStorage.getItem("aerovaAccessToken") || "";
        } catch (error) {
            return "";
        }
    }

    function resolveMediaUrl(path) {
        if (!path) return "";
        if (/^https?:\/\//i.test(path)) return path;
        return api.url(String(path).replace(/^\/+/, ""));
    }

    function toast(message, isError) {
        if (window.AEROVA_ADMIN && typeof window.AEROVA_ADMIN.notify === "function") {
            window.AEROVA_ADMIN.notify(message, isError);
            return;
        }
        window.alert(message);
    }

    var state = {
        rows: [],
        editing: null
    };

    function activeRow() {
        return state.rows.filter(function (row) { return row.isActive; })[0] || null;
    }

    function syncPreview(row) {
        var frame = byId("hero-video-preview");
        var video = byId("hero-video-preview-video");
        if (!frame || !video) return;

        var target = row || activeRow();
        if (!target || !target.videoUrl) {
            frame.classList.remove("is-live");
            video.removeAttribute("src");
            video.load();
            return;
        }

        frame.classList.add("is-live");
        video.poster = resolveMediaUrl(target.posterUrl) || "assets/images/hero-jet-dusk-hd.webp";
        video.src = resolveMediaUrl(target.videoUrl);
        video.muted = true;
        video.playsInline = true;
        video.loop = true;
        video.play().catch(function () { /* preview may block until user gesture */ });
    }

    function renderTable() {
        var body = byId("hero-video-body");
        if (!body) return;

        if (!state.rows.length) {
            body.innerHTML = '<tr><td colspan="5" class="admin-empty">' + escapeHtml(tr("api.admin.noHeroVideos", "Hero video tapılmadı.")) + "</td></tr>";
            syncPreview(null);
            return;
        }

        body.innerHTML = state.rows.map(function (row) {
            var status = row.isActive
                ? '<span class="admin-badge admin-badge--ok">' + escapeHtml(tr("api.admin.heroPublished", "Yayında")) + "</span>"
                : '<span class="admin-badge">' + escapeHtml(tr("api.admin.heroDraft", "Qaralama")) + "</span>";
            return "<tr>" +
                "<td>" + escapeHtml(row.title) + "</td>" +
                "<td>" + status + "</td>" +
                "<td><code>" + escapeHtml(row.videoUrl) + "</code></td>" +
                "<td>" + escapeHtml(row.sourceName || "—") + "</td>" +
                '<td><div class="admin-actions">' +
                '<button class="admin-btn admin-btn--ghost" type="button" data-hero-preview="' + row.id + '">' + escapeHtml(tr("api.admin.heroPreview", "Önizlə")) + "</button>" +
                '<button class="admin-btn admin-btn--ghost" type="button" data-hero-edit="' + row.id + '">' + escapeHtml(tr("admin.edit", "Redaktə")) + "</button>" +
                (row.isActive ? "" : '<button class="admin-btn admin-btn--primary" type="button" data-hero-activate="' + row.id + '">' + escapeHtml(tr("api.admin.heroPublish", "Yayımla")) + "</button>") +
                (row.isActive ? "" : '<button class="admin-btn admin-btn--danger" type="button" data-hero-delete="' + row.id + '">' + escapeHtml(tr("admin.delete", "Sil")) + "</button>") +
                "</div></td></tr>";
        }).join("");

        syncPreview(activeRow());
    }

    function loadHeroVideos() {
        var body = byId("hero-video-body");
        if (!body) return Promise.resolve();
        body.innerHTML = '<tr><td colspan="5" class="admin-empty">' + escapeHtml(tr("api.admin.loading", "Yüklənir...")) + "</td></tr>";

        return api.get("api/admin/hero-videos").then(function (rows) {
            state.rows = rows || [];
            renderTable();
        }).catch(function (error) {
            body.innerHTML = '<tr><td colspan="5" class="admin-empty">' + escapeHtml(error.userMessage || tr("api.admin.loadFailed", "Yükləmə alınmadı.")) + "</td></tr>";
        });
    }

    function openForm(row) {
        state.editing = row || null;
        byId("hero-video-form-title").textContent = row
            ? tr("api.admin.heroEdit", "Hero videonu redaktə et")
            : tr("api.admin.heroAdd", "Yeni hero video");
        byId("hero-field-title").value = row ? row.title : "";
        byId("hero-field-notes").value = row ? (row.internalNotes || "") : "";
        byId("hero-field-videoUrl").value = row ? row.videoUrl : "";
        byId("hero-field-posterUrl").value = row ? (row.posterUrl || "") : "";
        byId("hero-field-mobileVideoUrl").value = row ? (row.mobileVideoUrl || "") : "";
        byId("hero-field-sourceName").value = row ? (row.sourceName || "") : "";
        byId("hero-field-sourceUrl").value = row ? (row.sourceUrl || "") : "";
        byId("hero-field-licenseInfo").value = row ? (row.licenseInfo || "") : "";
        byId("hero-field-isActive").checked = row ? !!row.isActive : false;
        byId("hero-field-sortOrder").value = row ? String(row.sortOrder) : "0";
        byId("hero-video-form-panel").hidden = false;
        syncPreview(row);
    }

    function closeForm() {
        byId("hero-video-form-panel").hidden = true;
        state.editing = null;
        syncPreview(activeRow());
    }

    function readFormBody() {
        return {
            title: byId("hero-field-title").value.trim(),
            internalNotes: byId("hero-field-notes").value.trim(),
            videoUrl: byId("hero-field-videoUrl").value.trim(),
            posterUrl: byId("hero-field-posterUrl").value.trim(),
            mobileVideoUrl: byId("hero-field-mobileVideoUrl").value.trim(),
            sourceName: byId("hero-field-sourceName").value.trim(),
            sourceUrl: byId("hero-field-sourceUrl").value.trim(),
            licenseInfo: byId("hero-field-licenseInfo").value.trim(),
            isActive: byId("hero-field-isActive").checked,
            sortOrder: Number(byId("hero-field-sortOrder").value || 0)
        };
    }

    function saveForm() {
        var body = readFormBody();
        var request = state.editing
            ? api.request("PUT", "api/admin/hero-videos/" + state.editing.id, { body: body })
            : api.request("POST", "api/admin/hero-videos", { body: body });

        request.then(function () {
            toast(tr("api.admin.saved", "Yadda saxlanıldı."), false);
            closeForm();
            return loadHeroVideos();
        }).catch(function (error) {
            toast(error.userMessage || tr("api.admin.saveFailed", "Yadda saxlama alınmadı."), true);
        });
    }

    function upload(kind, file) {
        var token = readSessionToken();
        var form = new FormData();
        form.append("file", file);
        return fetch(api.url("api/admin/hero-videos/upload/" + kind), {
            method: "POST",
            headers: token ? { Authorization: "Bearer " + token } : {},
            body: form
        }).then(function (response) {
            return response.text().then(function (text) {
                var payload = null;
                if (text) {
                    try { payload = JSON.parse(text); } catch (error) { payload = null; }
                }
                if (!response.ok) {
                    throw new Error((payload && payload.title) || tr("api.admin.uploadFailed", "Yükləmə alınmadı."));
                }
                return payload;
            });
        });
    }

    function bind() {
        if (!byId("section-hero-video")) return;

        byId("hero-video-add-btn").addEventListener("click", function () { openForm(null); });
        byId("hero-video-form-cancel").addEventListener("click", closeForm);
        byId("hero-video-form-save").addEventListener("click", saveForm);

        byId("hero-video-upload-video").addEventListener("change", function (event) {
            var file = event.target.files && event.target.files[0];
            if (!file) return;
            upload("video", file).then(function (result) {
                byId("hero-field-videoUrl").value = result.url;
                toast(tr("api.admin.videoUploaded", "Video yükləndi."), false);
            }).catch(function (error) {
                toast(error.message, true);
            });
            event.target.value = "";
        });

        byId("hero-video-upload-poster").addEventListener("change", function (event) {
            var file = event.target.files && event.target.files[0];
            if (!file) return;
            upload("poster", file).then(function (result) {
                byId("hero-field-posterUrl").value = result.url;
                toast(tr("api.admin.posterUploaded", "Poster yükləndi."), false);
            }).catch(function (error) {
                toast(error.message, true);
            });
            event.target.value = "";
        });

        byId("hero-video-body").addEventListener("click", function (event) {
            var previewId = event.target.getAttribute("data-hero-preview");
            var editId = event.target.getAttribute("data-hero-edit");
            var activateId = event.target.getAttribute("data-hero-activate");
            var deleteId = event.target.getAttribute("data-hero-delete");
            var row = null;

            state.rows.forEach(function (item) {
                if (String(item.id) === String(previewId || editId || activateId || deleteId)) row = item;
            });

            if (previewId && row) syncPreview(row);
            if (editId && row) openForm(row);
            if (deleteId && row && window.confirm(tr("api.admin.confirmDelete", "{name} silinsin? Bu geri qaytarıla bilməz.", { name: row.title }))) {
                api.request("DELETE", "api/admin/hero-videos/" + deleteId).then(function () {
                    toast(tr("api.admin.heroDeleted", "Hero video silindi."), false);
                    loadHeroVideos();
                }).catch(function (error) {
                    toast(error.userMessage || error.message, true);
                });
            }
            if (activateId) {
                api.request("POST", "api/admin/hero-videos/" + activateId + "/activate").then(function () {
                    toast(tr("api.admin.heroPublishedToast", "Hero video yayımlandı."), false);
                    loadHeroVideos();
                }).catch(function (error) {
                    toast(error.userMessage || tr("api.admin.saveFailed", "Yadda saxlama alınmadı."), true);
                });
            }
        });
    }

    window.AEROVA_ADMIN_HERO_VIDEO = {
        load: loadHeroVideos,
        render: renderTable
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bind);
    } else {
        bind();
    }
})();
