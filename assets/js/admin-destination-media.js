/**
 * Destination country/city image upload (api/admin/destinations/.../image).
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

    function token() {
        try { return localStorage.getItem("aerovaAccessToken") || sessionStorage.getItem("aerovaAccessToken") || ""; } catch (e) { return ""; }
    }

    function notify(message, isError) {
        if (window.AEROVA_ADMIN && window.AEROVA_ADMIN.notify) window.AEROVA_ADMIN.notify(message, isError);
        else window.alert(message);
    }

    function resolvePreviewUrl(imageFile) {
        if (!imageFile) return "";
        if (window.AEROVA_DESTINATIONS && window.AEROVA_DESTINATIONS.mediaPublicUrl) {
            return window.AEROVA_DESTINATIONS.mediaPublicUrl(imageFile) || "";
        }
        if (String(imageFile).indexOf("destinations/") === 0) {
            return api.url("/media/" + imageFile);
        }
        return "";
    }

    function upload(kind, id, file) {
        var segment = kind === "country" ? "countries" : "cities";
        var form = new FormData();
        form.append("file", file);
        return fetch(api.url("api/admin/destinations/" + segment + "/" + id + "/image"), {
            method: "POST",
            headers: token() ? { Authorization: "Bearer " + token() } : {},
            body: form
        }).then(function (response) {
            return response.json().then(function (payload) {
                if (!response.ok) throw new Error(payload.title || tr("api.admin.uploadFailed", "Yükləmə alınmadı."));
                return payload;
            });
        });
    }

    function removeImage(kind, id) {
        var segment = kind === "country" ? "countries" : "cities";
        return api.request("DELETE", "api/admin/destinations/" + segment + "/" + id + "/image");
    }

    function openDialog(kind, item) {
        var name = item.nameAz || item.name || ("#" + item.id);
        var previewUrl = resolvePreviewUrl(item.imageFile);
        if (previewUrl && window.confirm(name + "\n" + tr("api.admin.destImageCurrent", "Cari: ") + item.imageFile + "\n\n" + tr("api.admin.destImageDelete", "Media silinsin? (slug fallback qalır)"))) {
            removeImage(kind, item.id).then(function () {
                notify(tr("api.admin.destImageRemoved", "Şəkil silindi."), false);
                if (window.AEROVA_ADMIN && window.AEROVA_ADMIN.loadDestinations) window.AEROVA_ADMIN.loadDestinations();
            }).catch(function (error) {
                notify(error.userMessage || error.message, true);
            });
            return;
        }

        var input = document.createElement("input");
        input.type = "file";
        input.accept = "image/jpeg,image/png,image/webp";
        input.addEventListener("change", function () {
            var file = input.files && input.files[0];
            if (!file) return;
            upload(kind, item.id, file).then(function () {
                notify(tr("api.admin.destImageUploaded", "Şəkil yükləndi."), false);
                if (window.AEROVA_ADMIN && window.AEROVA_ADMIN.loadDestinations) window.AEROVA_ADMIN.loadDestinations();
            }).catch(function (error) {
                notify(error.message, true);
            });
        });
        input.click();
    }

    function bind() {
        var body = document.getElementById("destinations-body");
        if (!body) return;
        body.addEventListener("click", function (event) {
            var button = event.target.closest("[data-dest-media]");
            if (!button) return;
            var kind = button.getAttribute("data-dest-media");
            var id = button.getAttribute("data-dest-media-id");
            var item = null;
            (window.AEROVA_ADMIN && window.AEROVA_ADMIN.state && window.AEROVA_ADMIN.state.destinations || []).forEach(function (country) {
                if (kind === "country" && String(country.id) === String(id)) item = country;
                country.cities.forEach(function (city) {
                    if (kind === "city" && String(city.id) === String(id)) item = city;
                });
            });
            if (item) openDialog(kind, item);
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
    else bind();
})();
