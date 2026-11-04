/**
 * City sight image overrides (api/admin/sight-media).
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

    function escapeHtml(text) {
        return String(text == null ? "" : text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function token() {
        try { return localStorage.getItem("aerovaAccessToken") || sessionStorage.getItem("aerovaAccessToken") || ""; } catch (e) { return ""; }
    }

    function notify(message, isError) {
        if (window.AEROVA_ADMIN && window.AEROVA_ADMIN.notify) window.AEROVA_ADMIN.notify(message, isError);
        else window.alert(message);
    }

    function fillForm(key) {
        var parts = String(key || "").split(".");
        if (parts.length !== 2) return;
        var slugEl = document.getElementById("sight-media-slug");
        var indexEl = document.getElementById("sight-media-index");
        if (slugEl) slugEl.value = parts[0];
        if (indexEl) indexEl.value = parts[1];
    }

    function deleteOverride(key) {
        fillForm(key);
        var parts = String(key).split(".");
        var query = "?citySlug=" + encodeURIComponent(parts[0]) + "&sightIndex=" + encodeURIComponent(parts[1]);
        if (!window.confirm(tr("api.admin.confirmDelete", "{name} silinsin? Bu geri qaytarıla bilməz.", { name: key }))) return;
        api.request("DELETE", "api/admin/sight-media" + query).then(function () {
            notify(tr("api.admin.sightMediaRemoved", "Sight override silindi."), false);
            load();
        }).catch(function (error) {
            notify(error.userMessage || error.message, true);
        });
    }

    function render(rows) {
        var body = document.getElementById("sight-media-body");
        if (!body) return;
        body.innerHTML = rows.length ? rows.map(function (row) {
            var url = api.url("/media/" + String(row.textAz || "").replace(/^\/+/, ""));
            return "<tr><td><code>" + escapeHtml(row.key) + "</code></td><td><code>" + escapeHtml(row.textAz) + "</code></td>" +
                '<td><img class="admin-media-thumb" src="' + escapeHtml(url) + '" alt=""></td>' +
                '<td><div class="admin-actions">' +
                '<button class="admin-btn admin-btn--ghost" type="button" data-sight-use="' + escapeHtml(row.key) + '">' + escapeHtml(tr("api.admin.useInForm", "Forma köçür")) + "</button>" +
                '<button class="admin-btn admin-btn--danger" type="button" data-sight-delete="' + escapeHtml(row.key) + '">' + escapeHtml(tr("admin.delete", "Sil")) + "</button>" +
                "</div></td></tr>";
        }).join("") : '<tr><td colspan="4">' + tr("api.admin.sightMediaEmpty", "Hələ yüklənmiş sight şəkli yoxdur.") + "</td></tr>";
    }

    function load() {
        return api.get("api/admin/sight-media").then(function (rows) {
            render(rows || []);
        }).catch(function (error) {
            notify(error.userMessage || tr("api.admin.loadFailed", "Yükləmə alınmadı."), true);
        });
    }

    function upload() {
        var slug = document.getElementById("sight-media-slug").value.trim();
        var index = Number(document.getElementById("sight-media-index").value || 0);
        var fileInput = document.getElementById("sight-media-file");
        var file = fileInput.files && fileInput.files[0];
        if (!file) {
            notify(tr("api.admin.pickFile", "Fayl seçin."), true);
            return;
        }
        var form = new FormData();
        form.append("file", file);
        var query = "?citySlug=" + encodeURIComponent(slug) + "&sightIndex=" + encodeURIComponent(index);
        fetch(api.url("api/admin/sight-media/upload" + query), {
            method: "POST",
            headers: token() ? { Authorization: "Bearer " + token() } : {},
            body: form
        }).then(function (response) {
            return response.json().then(function (payload) {
                if (!response.ok) throw new Error(payload.title || tr("api.admin.uploadFailed", "Yükləmə alınmadı."));
                fileInput.value = "";
                notify(tr("api.admin.sightMediaUploaded", "Sight şəkli yükləndi."), false);
                return load();
            });
        }).catch(function (error) {
            notify(error.message, true);
        });
    }

    function remove() {
        var slug = document.getElementById("sight-media-slug").value.trim();
        var index = Number(document.getElementById("sight-media-index").value || 0);
        deleteOverride(slug + "." + index);
    }

    function bind() {
        var uploadBtn = document.getElementById("sight-media-upload-btn");
        var deleteBtn = document.getElementById("sight-media-delete-btn");
        var body = document.getElementById("sight-media-body");
        if (uploadBtn) uploadBtn.addEventListener("click", upload);
        if (deleteBtn) deleteBtn.addEventListener("click", remove);
        if (body) {
            body.addEventListener("click", function (event) {
                var useKey = event.target.getAttribute("data-sight-use");
                var deleteKey = event.target.getAttribute("data-sight-delete");
                if (useKey) fillForm(useKey);
                if (deleteKey) deleteOverride(deleteKey);
            });
        }
    }

    window.AEROVA_ADMIN_SIGHT_MEDIA = { load: load };

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
    else bind();
})();
