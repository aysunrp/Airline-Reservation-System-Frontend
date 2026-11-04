/*
 * Applies admin-uploaded sight photographs (GET api/site-content/sight-media) over window.AEROVA_CITY_SIGHTS.
 * Keys are citySlug.sightIndex; values are relative paths under Media/sights.
 */
(function () {
    if (!window.AEROVA_API) return;

    function applyOverrides(items) {
        if (!window.AEROVA_CITY_SIGHTS || !Array.isArray(items) || !items.length) return;
        items.forEach(function (item) {
            if (!item.key || !item.textAz) return;
            var parts = String(item.key).split(".");
            if (parts.length !== 2) return;
            var slug = parts[0];
            var index = Number(parts[1]);
            if (!window.AEROVA_CITY_SIGHTS[slug] || !window.AEROVA_CITY_SIGHTS[slug][index]) return;
            var url = window.AEROVA_DESTINATIONS && window.AEROVA_DESTINATIONS.mediaPublicUrl
                ? window.AEROVA_DESTINATIONS.mediaPublicUrl(item.textAz)
                : window.AEROVA_API.url("/media/" + String(item.textAz).replace(/^\/+/, ""));
            if (url) window.AEROVA_CITY_SIGHTS[slug][index].image = url;
        });
    }

    function load() {
        return window.AEROVA_API.get("api/site-content/sight-media", { skipAuth: true }).then(function (items) {
            applyOverrides(items);
            document.dispatchEvent(new CustomEvent("aerova:sight-media-ready"));
            return items;
        });
    }

    window.AEROVA_SIGHT_MEDIA = { load: load };

    load().catch(function () { /* static sight images stay */ });
})();
