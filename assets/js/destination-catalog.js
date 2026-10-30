/*
 * The destination catalog (GET api/destinations) and the cards built from it. One catalog feeds Explore Destinations on the home page and
 * on the destinations page; names, descriptions and photographs all come from the backend record, nothing is listed here.
 * Needs api-client.js first.
 *
 *   <div data-destination-catalog data-limit="8"></div>      (no data-limit: every country)
 *
 * A card shows the country, its featured city (the first active one) and a short description in the page language, with an Explore button that
 * opens the search with that city as the destination. A destination whose airports have no active route says so: nothing is made up.
 */
(function () {
    "use strict";

    var api = window.AEROVA_API;
    var FALLBACK_IMAGE = "assets/images/airport-premium.jpg";
    var pending = null;

    function tr(key, fallback, vars) {
        if (typeof window.AEROVA_I18N === "object" && window.AEROVA_I18N && typeof window.AEROVA_I18N.t === "function") {
            var value = window.AEROVA_I18N.t(key, vars);
            if (value && value !== key) return value;
        }
        return String(fallback).replace(/\{(\w+)\}/g, function (_, name) { return vars && vars[name] != null ? String(vars[name]) : "{" + name + "}"; });
    }

    function language() {
        var active = window.AEROVA_I18N && typeof window.AEROVA_I18N.getLanguage === "function" ? window.AEROVA_I18N.getLanguage() : document.documentElement.lang;
        return active === "az" || active === "ru" ? active : "en";
    }

    /* The text of a record in the page language: name / nameAz / nameRu, description / descriptionAz / descriptionRu. */
    function localized(item, base) {
        var lang = language();
        var suffix = lang === "az" ? "Az" : lang === "ru" ? "Ru" : "";
        return item[base + suffix] || item[base] || "";
    }

    function escapeHtml(value) {
        return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    /* One request per page; a failed one is forgotten so the next call tries again. */
    function load() {
        if (!api || typeof api.get !== "function") {
            return Promise.reject(new Error("api-client.js must be loaded before destination-catalog.js."));
        }
        if (!pending) {
            pending = api.get("api/destinations").then(function (list) { return Array.isArray(list) ? list : []; });
            pending.catch(function () { pending = null; });
        }
        return pending;
    }

    function featuredCity(country) {
        return (country.cities || []).filter(function (city) { return city.isActive !== false; })[0] || null;
    }

    function hasFlights(city) {
        return (city.airports || []).some(function (airport) { return airport.hasRoutes; });
    }

    function imageBase(country) {
        return "assets/images/" + String(country.imageFile || "").replace(/\.jpg$/i, "");
    }

    function cardMarkup(country, city) {
        var base = imageBase(country);
        var cityName = localized(city, "name");
        var countryName = localized(country, "name");
        var alt = tr("destinations.photoAlt", "{city}, {country}", { city: cityName, country: countryName });
        var note = hasFlights(city) ? "" : '<p class="destination-note">' + escapeHtml(tr("destinations.noFlightsYet", "No scheduled flights yet")) + "</p>";

        return '<article class="destination-card" data-country="' + escapeHtml(country.code) + '"' + (hasFlights(city) ? "" : ' data-no-flights="true"') + ">" +
            '<img class="destination-image" src="' + escapeHtml(base) + '-sm.jpg" srcset="' + escapeHtml(base) + "-sm.jpg 800w, " + escapeHtml(base) +
            '.jpg 1600w" sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 25vw" width="800" height="533" loading="lazy" decoding="async" alt="' + escapeHtml(alt) + '">' +
            '<div class="destination-overlay" aria-hidden="true"></div>' +
            '<div class="destination-content">' +
            '<p class="destination-location">' + escapeHtml(countryName) + "</p>" +
            '<h3 class="destination-name">' + escapeHtml(cityName) + "</h3>" +
            '<p class="destination-description">' + escapeHtml(localized(country, "description")) + "</p>" + note +
            '<a class="destination-book" href="booking.html?to=' + encodeURIComponent(city.name) + '">' + escapeHtml(tr("destinations.explore", "Explore")) + "</a>" +
            "</div></article>";
    }

    /* A photograph that fails to load is replaced by a neutral one, so a card never shows a broken image. */
    function watchImages(container) {
        container.querySelectorAll(".destination-image").forEach(function (image) {
            image.addEventListener("error", function () {
                if (image.getAttribute("data-fallback")) return;
                image.setAttribute("data-fallback", "true");
                image.removeAttribute("srcset");
                image.src = FALLBACK_IMAGE;
            });
        });
    }

    function statusMarkup(text, withRetry) {
        return '<p class="destination-status" role="' + (withRetry ? "alert" : "status") + '">' + escapeHtml(text) + "</p>" +
            (withRetry ? '<button type="button" class="destination-retry">' + escapeHtml(tr("destinations.catalogRetry", "Try again")) + "</button>" : "");
    }

    function mount(container) {
        var limit = Number(container.getAttribute("data-limit")) || 0;
        var expanded = false;
        var grid = container.querySelector(".destination-grid");
        var toggle = container.querySelector(".destination-toggle");
        var countries = null;

        if (!grid) {
            container.innerHTML = '<div class="destination-grid" aria-live="polite"></div><div class="destination-more"></div>';
            grid = container.querySelector(".destination-grid");
        }
        var more = container.querySelector(".destination-more");

        function paint() {
            var cards = countries.map(function (country) { return { country: country, city: featuredCity(country) }; })
                .filter(function (entry) { return entry.city; });
            var shown = limit && !expanded ? cards.slice(0, limit) : cards;

            grid.innerHTML = shown.map(function (entry) { return cardMarkup(entry.country, entry.city); }).join("");
            watchImages(grid);

            if (limit && cards.length > limit) {
                more.innerHTML = '<button type="button" class="destination-toggle" aria-expanded="' + expanded + '">' +
                    escapeHtml(expanded ? tr("destinations.showFewerDestinations", "Show fewer")
                        : tr("destinations.showAllDestinations", "Show all {count} destinations", { count: cards.length })) + "</button>";
                toggle = more.querySelector(".destination-toggle");
                toggle.addEventListener("click", function () { expanded = !expanded; paint(); });
            } else {
                more.innerHTML = "";
            }
        }

        function start() {
            grid.innerHTML = statusMarkup(tr("destinations.loadingCatalog", "Loading destinations..."), false);
            more.innerHTML = "";
            load().then(function (list) {
                countries = list;
                paint();
            }, function () {
                grid.innerHTML = statusMarkup(tr("destinations.catalogError", "We could not load the destinations. Please try again."), true);
                var retry = grid.querySelector(".destination-retry");
                if (retry) retry.addEventListener("click", start);
            });
        }

        window.addEventListener("aerova:languagechange", function () { if (countries) paint(); });
        start();
    }

    function init() {
        document.querySelectorAll("[data-destination-catalog]").forEach(mount);
    }

    window.AEROVA_DESTINATIONS = { load: load, localized: localized };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
