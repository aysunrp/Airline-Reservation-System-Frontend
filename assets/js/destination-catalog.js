/*
 * The destination catalog (GET api/destinations) and everything built from it: the destination cards of the home page and the destinations
 * page (one card component), the filters of the destinations page and the helpers of the destination details page.
 * Names, descriptions, photographs and ids all come from the backend record; nothing is listed here. Needs api-client.js first.
 *
 *   <div data-destination-catalog data-limit="8"></div>        a gallery of 8 cards with a "show all" button (no data-limit: every card)
 *   <div data-destination-catalog data-filters></div>          the same gallery with a search box and availability filters
 *
 * A card shows the country, its featured city (the first active one), a short description in the page language and an Explore button. Explore
 * opens the destination's details page (destination-details.html?id=<country id>): it is information, never booking. The home base of
 * the airline (city.isHub, Baku) is a place to fly from, so it has no card. A destination whose airports have no active route says so.
 */
(function () {
    "use strict";

    var api = window.AEROVA_API;
    var FALLBACK_IMAGE = "assets/images/airport-premium.jpg";
    var pending = null;

    function tr(key, fallback, vars) {
        if (window.AEROVA_I18N && typeof window.AEROVA_I18N.t === "function") {
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

    /* One destination by its database id (the details page); rejects with an ApiError (404 for the home base, a switched-off or unknown id). */
    function loadOne(id) {
        return api.get("api/destinations/" + encodeURIComponent(id));
    }

    function featuredCity(country) {
        return (country.cities || []).filter(function (city) { return city.isActive !== false; })[0] || null;
    }

    /* AEROVA's home base (Baku): a place to fly from, so it is not offered as a destination card. The catalog marks it (city.isHub). */
    function isHubCountry(country) {
        return (country.cities || []).some(function (city) { return city.isHub; });
    }

    /* The hub city's English name (the search form's default departure), or null when the catalog has none. */
    function hubCityName() {
        return load().then(function (countries) {
            for (var i = 0; i < countries.length; i += 1) {
                var hub = (countries[i].cities || []).filter(function (city) { return city.isHub && city.isActive !== false; })[0];
                if (hub) return hub.name;
            }
            return null;
        }, function () { return null; });
    }

    function hasFlights(city) {
        return (city.airports || []).some(function (airport) { return airport.hasRoutes; });
    }

    function imageBase(country) {
        return "assets/images/" + String(country.imageFile || "").replace(/\.jpg$/i, "");
    }

    /* The search form with the destination chosen. It is only a prefill: the traveller still picks dates and passengers and presses search. */
    function bookingUrl(city) {
        // The airport with a route first (a city may have several): the search form selects exactly that airport.
        var airports = city.airports || [];
        var airport = airports.filter(function (item) { return item.hasRoutes; })[0] || airports[0];
        return "booking.html?to=" + encodeURIComponent(city.name) + (airport ? "&toCode=" + encodeURIComponent(airport.code) : "");
    }

    function detailsUrl(country) {
        return "destination-details.html?id=" + encodeURIComponent(country.id);
    }

    /* A photograph that fails to load is replaced by a neutral one, so a picture never shows broken. */
    function watchImages(container) {
        container.querySelectorAll("img[data-photo]").forEach(function (image) {
            image.addEventListener("error", function () {
                if (image.getAttribute("data-fallback")) return;
                image.setAttribute("data-fallback", "true");
                image.removeAttribute("srcset");
                image.src = FALLBACK_IMAGE;
            });
        });
    }

    function photoAlt(country, city) {
        return tr("destinations.photoAlt", "{city}, {country}", { city: localized(city, "name"), country: localized(country, "name") });
    }

    /* The card, the one component of every gallery. */
    function cardMarkup(country, city) {
        var base = imageBase(country);
        var cityName = localized(city, "name");
        var flights = hasFlights(city);
        var note = flights ? "" : '<p class="destination-note">' + escapeHtml(tr("destinations.noFlightsYet", "No scheduled flights yet")) + "</p>";

        return '<article class="destination-card" data-country="' + escapeHtml(country.code) + '"' + (flights ? "" : ' data-no-flights="true"') + ">" +
            '<img class="destination-image" data-photo src="' + escapeHtml(base) + '-sm.jpg" srcset="' + escapeHtml(base) + "-sm.jpg 800w, " + escapeHtml(base) +
            '.jpg 1600w" sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 25vw" width="800" height="533" loading="lazy" decoding="async" alt="' + escapeHtml(photoAlt(country, city)) + '">' +
            '<div class="destination-overlay" aria-hidden="true"></div>' +
            '<div class="destination-content">' +
            '<p class="destination-location">' + escapeHtml(localized(country, "name")) + "</p>" +
            '<h3 class="destination-name">' + escapeHtml(cityName) + "</h3>" +
            '<p class="destination-description">' + escapeHtml(localized(country, "description")) + "</p>" + note +
            '<a class="destination-book" href="' + escapeHtml(detailsUrl(country)) + '" aria-label="' + escapeHtml(tr("destinations.explore", "Explore") + ": " + cityName) + '">' +
            escapeHtml(tr("destinations.explore", "Explore")) + "</a>" +
            "</div></article>";
    }

    function statusMarkup(text, withRetry) {
        return '<p class="destination-status" role="' + (withRetry ? "alert" : "status") + '">' + escapeHtml(text) + "</p>" +
            (withRetry ? '<button type="button" class="destination-retry">' + escapeHtml(tr("destinations.catalogRetry", "Try again")) + "</button>" : "");
    }

    /* Everything a visitor may type to find a destination: names in the three languages, the extra spellings and the airport codes. */
    function searchText(country, city) {
        var parts = [country.name, country.nameAz, country.nameRu, city.name, city.nameAz, city.nameRu].concat(city.aliases || []);
        (country.cities || []).forEach(function (other) {
            parts.push(other.name, other.nameAz, other.nameRu);
            (other.airports || []).forEach(function (airport) { parts.push(airport.code, airport.name); });
        });
        return parts.join(" ").toLowerCase();
    }

    function mount(container) {
        var limit = Number(container.getAttribute("data-limit")) || 0;
        var withFilters = container.hasAttribute("data-filters");
        var expanded = false;
        var countries = null;
        var availability = "all";
        var query = "";

        container.innerHTML = (withFilters ? '<div class="destination-filters" role="search"></div>' : "") +
            '<div class="destination-grid" aria-live="polite"></div><div class="destination-more"></div>';
        var filters = container.querySelector(".destination-filters");
        var grid = container.querySelector(".destination-grid");
        var more = container.querySelector(".destination-more");

        // The whole card opens the details page, like its Explore button (the button stays the keyboard and screen reader control).
        grid.addEventListener("click", function (event) {
            var card = event.target.closest(".destination-card");
            var link = card ? card.querySelector(".destination-book") : null;
            if (link && !event.target.closest("a")) window.location.href = link.getAttribute("href");
        });

        function entries() {
            return countries.filter(function (country) { return !isHubCountry(country); })
                .map(function (country) { return { country: country, city: featuredCity(country) }; })
                .filter(function (entry) { return entry.city; });
        }

        function paintFilters(all) {
            var withRoutes = all.filter(function (entry) { return (entry.country.cities || []).some(hasFlights); }).length;
            var chips = [
                { id: "all", label: tr("destinations.filterAll", "All"), count: all.length },
                { id: "flights", label: tr("destinations.filterFlights", "Flights available"), count: withRoutes },
                { id: "soon", label: tr("destinations.filterSoon", "Coming soon"), count: all.length - withRoutes }
            ];
            filters.innerHTML = '<label class="destination-search"><span class="visually-hidden">' + escapeHtml(tr("destinations.searchLabel", "Search destinations")) + "</span>" +
                '<input type="search" value="' + escapeHtml(query) + '" placeholder="' + escapeHtml(tr("destinations.searchPlaceholder", "Search country, city or airport")) + '" autocomplete="off"></label>' +
                '<div class="destination-chips" role="group" aria-label="' + escapeHtml(tr("destinations.filterLabel", "Explore")) + '">' +
                chips.map(function (chip) {
                    return '<button type="button" class="destination-chip' + (chip.id === availability ? " is-active" : "") + '" data-chip="' + chip.id +
                        '" aria-pressed="' + (chip.id === availability) + '">' + escapeHtml(chip.label) + ' <span class="destination-chip-count">' + chip.count + "</span></button>";
                }).join("") + "</div>";

            filters.querySelector("input").addEventListener("input", function (event) {
                query = event.target.value.trim().toLowerCase();
                paintGrid(entries());
            });
            filters.querySelectorAll(".destination-chip").forEach(function (chip) {
                chip.addEventListener("click", function () {
                    availability = chip.getAttribute("data-chip");
                    paint();
                });
            });
        }

        function matches(entry) {
            var flights = (entry.country.cities || []).some(hasFlights);
            if (availability === "flights" && !flights) return false;
            if (availability === "soon" && flights) return false;
            return !query || searchText(entry.country, entry.city).indexOf(query) !== -1;
        }

        function paintGrid(all) {
            var cards = withFilters ? all.filter(matches) : all;

            if (!all.length) {
                // The catalog answered but holds nothing to show: say so instead of leaving an empty area.
                grid.innerHTML = statusMarkup(tr("destinations.emptyCatalog", "No destinations are available yet. Please check back soon."), false);
                more.innerHTML = "";
                return;
            }
            if (!cards.length) {
                grid.innerHTML = statusMarkup(tr("destinations.noMatches", "No destinations match your search."), false);
                more.innerHTML = "";
                return;
            }

            var shown = limit && !expanded ? cards.slice(0, limit) : cards;
            grid.innerHTML = shown.map(function (entry) { return cardMarkup(entry.country, entry.city); }).join("");
            watchImages(grid);

            if (limit && cards.length > limit) {
                more.innerHTML = '<button type="button" class="destination-toggle" aria-expanded="' + expanded + '">' +
                    escapeHtml(expanded ? tr("destinations.showFewerDestinations", "Show fewer")
                        : tr("destinations.showAllDestinations", "Show all {count} destinations", { count: cards.length })) + "</button>";
                more.querySelector(".destination-toggle").addEventListener("click", function () { expanded = !expanded; paintGrid(all); });
            } else {
                more.innerHTML = "";
            }
        }

        function paint() {
            var all = entries();
            if (withFilters) paintFilters(all);
            paintGrid(all);
        }

        function start() {
            grid.innerHTML = statusMarkup(tr("destinations.loadingCatalog", "Loading destinations..."), false);
            more.innerHTML = "";
            if (filters) filters.innerHTML = "";
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

    window.AEROVA_DESTINATIONS = {
        load: load, loadOne: loadOne, localized: localized, hubCityName: hubCityName, hasFlights: hasFlights, imageBase: imageBase,
        bookingUrl: bookingUrl, detailsUrl: detailsUrl, photoAlt: photoAlt, watchImages: watchImages, featuredCity: featuredCity, tr: tr, escapeHtml: escapeHtml
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
