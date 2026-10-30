/*
 * The destination catalog (GET api/destinations) and everything built from it: the destination cards (one component) of the home page and the
 * destinations page, the filters, and the helpers of the city page. Names, descriptions, photographs and ids all come from the backend record
 * (Country -> City -> Airport); nothing is listed here. Needs api-client.js first.
 *
 *   <div data-destination-catalog data-limit="8"></div>     one card per country (its first city), 8 first with a "show all" button
 *   <div data-destination-catalog data-group></div>         every city, grouped by country (the destinations page)
 *   <div data-destination-catalog data-group data-filters></div>   the same with a search box and availability filters
 *
 * A card shows the city's own photograph, the country, the city, a short description and an Explore button that opens the city's page
 * (destination-details.html?city=<city id>): information first, booking only from there. The home base (city.isHub, Baku) is a place to
 * fly from, so it has no card. A city whose airports have no active route says so and cannot be booked.
 */
(function () {
    "use strict";

    var api = window.AEROVA_API;
    var FALLBACK_IMAGE = "assets/images/airport-premium.jpg";
    var pending = null;
    var hub = null;

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

    function rememberHub(countries) {
        hub = null;
        countries.forEach(function (country) {
            (country.cities || []).forEach(function (city) {
                if (city.isHub && city.isActive !== false && !hub && city.airports && city.airports[0]) {
                    hub = { city: city, airport: city.airports[0] };
                }
            });
        });
    }

    /* One request per page; a failed one is forgotten so the next call tries again. */
    function load() {
        if (!api || typeof api.get !== "function") {
            return Promise.reject(new Error("api-client.js must be loaded before destination-catalog.js."));
        }
        if (!pending) {
            pending = api.get("api/destinations").then(function (list) {
                var countries = Array.isArray(list) ? list : [];
                rememberHub(countries);
                return countries;
            });
            pending.catch(function () { pending = null; });
        }
        return pending;
    }

    /* One city's page by its database id: the city and its airports, its country and the other cities of that country. Rejects with an ApiError (404: home base, switched off, unknown). */
    function loadCity(id) {
        return api.get("api/destinations/cities/" + encodeURIComponent(id));
    }

    /* The real upcoming flights from the home base to the city's airports (an empty list: none is scheduled). */
    function loadCityFlights(id) {
        return api.get("api/destinations/cities/" + encodeURIComponent(id) + "/flights");
    }

    /* The home base (Baku) and its airport (GYD), from the catalog. */
    function hubInfo() {
        return load().then(function () { return hub; }, function () { return null; });
    }

    function hubCityName() {
        return hubInfo().then(function (info) { return info ? info.city.name : null; });
    }

    function featuredCity(country) {
        return (country.cities || []).filter(function (city) { return city.isActive !== false && !city.isHub; })[0] || null;
    }

    function hasFlights(city) {
        return (city.airports || []).some(function (airport) { return airport.hasRoutes; });
    }

    /* The airport to book: the one with a route first (a city may have several). */
    function bookableAirport(city) {
        var airports = city.airports || [];
        return airports.filter(function (airport) { return airport.hasRoutes; })[0] || airports[0] || null;
    }

    /* A city's own photograph; the country's one only when the city has none. */
    function imageBase(city, country) {
        var file = (city && city.imageFile) || (country && country.imageFile) || "";
        return "assets/images/" + String(file).replace(/\.jpg$/i, "");
    }

    function isoDay(date) {
        return date.toISOString().slice(0, 10);
    }

    /*
     * The flight results from the home base to an airport of the city: every real flight of the next 61 days (the search allows at most 62), nothing else. The airports are
     * named by their IATA codes, so a city with several airports shows the one that was chosen.
     */
    function resultsUrl(city, airport, country) {
        var target = airport || bookableAirport(city);
        var from = new Date();
        var to = new Date(from.getTime() + 60 * 24 * 3600 * 1000);
        var here = new URLSearchParams(window.location.search);
        var params = new URLSearchParams({
            tripType: "oneway", passengers: "1", adults: "1", children: "0", infants: "0",
            from: hub ? hub.city.name : "Baku", to: city.name,
            fromCode: hub ? hub.airport.code : "GYD", toCode: target ? target.code : "",
            dateFrom: isoDay(from), dateTo: isoDay(to), defaultPeriod: "1"
        });
        // The airports are named by id as well as by code, like the search form does; the city and country are kept for the way back.
        if (hub && hub.airport.id) params.set("fromAirportId", String(hub.airport.id));
        if (target && target.id) params.set("toAirportId", String(target.id));
        if (city.id) params.set("cityId", String(city.id));
        if (country && country.code) params.set("countryCode", country.code);
        // A search that was already made keeps its travellers and cabin; nothing is invented when there was none.
        ["passengers", "adults", "children", "infants", "cabinClass"].forEach(function (key) {
            if (here.get(key)) params.set(key, here.get(key));
        });
        return "flight-results.html?" + params.toString();
    }

    /* The city's own page. */
    function detailsUrl(city) {
        return "destination-details.html?city=" + encodeURIComponent(city.id);
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

    function photoAlt(city, country) {
        return tr("destinations.photoAlt", "{city}, {country}", { city: localized(city, "name"), country: localized(country, "name") });
    }

    /* The card, the one component of every gallery. options.booking adds a Book Ticket action; a city without flights opens the results with their empty state. */
    function cardMarkup(country, city, options) {
        options = options || {};
        var base = imageBase(city, country);
        var cityName = localized(city, "name");
        var flights = hasFlights(city);
        var description = localized(city, "description") || localized(country, "description");
        var note = flights ? "" : '<p class="destination-note">' + escapeHtml(tr("destinations.noFlightsYet", "No scheduled flights yet")) + "</p>";
        var explore = escapeHtml(tr("destinations.explore", "Explore"));
        var book = "";

        if (options.booking) {
            book = '<a class="destination-book destination-book--ghost" href="' + escapeHtml(resultsUrl(city, null, country)) + '">' + escapeHtml(tr("destinations.bookTicket", "Book Ticket")) + "</a>";
        }

        return '<article class="destination-card" data-city="' + escapeHtml(city.id) + '" data-country="' + escapeHtml(country.code) + '"' + (flights ? "" : ' data-no-flights="true"') + ">" +
            '<img class="destination-image" data-photo src="' + escapeHtml(base) + '-sm.jpg" srcset="' + escapeHtml(base) + "-sm.jpg 800w, " + escapeHtml(base) +
            '.jpg 1600w" sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 25vw" width="800" height="533" loading="lazy" decoding="async" alt="' + escapeHtml(photoAlt(city, country)) + '">' +
            '<div class="destination-overlay" aria-hidden="true"></div>' +
            '<div class="destination-content">' +
            '<p class="destination-location">' + escapeHtml(localized(country, "name")) + "</p>" +
            '<h3 class="destination-name">' + escapeHtml(cityName) + "</h3>" +
            '<p class="destination-description">' + escapeHtml(description) + "</p>" + note +
            '<div class="destination-actions"><a class="destination-book" href="' + escapeHtml(detailsUrl(city)) + '" aria-label="' + explore + ": " + escapeHtml(cityName) + '">' + explore + "</a>" + book + "</div>" +
            "</div></article>";
    }

    function statusMarkup(text, withRetry) {
        return '<p class="destination-status" role="' + (withRetry ? "alert" : "status") + '">' + escapeHtml(text) + "</p>" +
            (withRetry ? '<button type="button" class="destination-retry">' + escapeHtml(tr("destinations.catalogRetry", "Try again")) + "</button>" : "");
    }

    /* Everything a visitor may type to find a destination: names in the three languages, the extra spellings, the country and the airport codes. */
    function searchText(country, city) {
        var parts = [country.name, country.nameAz, country.nameRu, city.name, city.nameAz, city.nameRu].concat(city.aliases || []);
        (city.airports || []).forEach(function (airport) { parts.push(airport.code, airport.name); });
        return parts.join(" ").toLowerCase();
    }

    function mount(container) {
        var limit = Number(container.getAttribute("data-limit")) || 0;
        var withFilters = container.hasAttribute("data-filters");
        var grouped = container.hasAttribute("data-group");
        var expanded = false;
        var countries = null;
        var availability = "all";
        var query = "";

        container.innerHTML = (withFilters ? '<div class="destination-filters" role="search"></div>' : "") +
            '<div class="destination-grid" aria-live="polite"></div><div class="destination-more"></div>';
        var filters = container.querySelector(".destination-filters");
        var grid = container.querySelector(".destination-grid");
        var more = container.querySelector(".destination-more");

        // The whole card opens the city's page, like its Explore button (the button stays the keyboard and screen reader control).
        container.addEventListener("click", function (event) {
            var card = event.target.closest(".destination-card");
            var link = card ? card.querySelector(".destination-book") : null;
            if (link && !event.target.closest("a, [aria-disabled]")) window.location.href = link.getAttribute("href");
        });

        /* Cards as { country, city }: every city (grouped) or the first city of every country. */
        function entries() {
            var all = [];
            countries.forEach(function (country) {
                var cities = (country.cities || []).filter(function (city) { return city.isActive !== false && !city.isHub; });
                (grouped ? cities : cities.slice(0, 1)).forEach(function (city) { all.push({ country: country, city: city }); });
            });
            return all;
        }

        function matches(entry) {
            var flights = hasFlights(entry.city);
            if (availability === "flights" && !flights) return false;
            if (availability === "soon" && flights) return false;
            return !query || searchText(entry.country, entry.city).indexOf(query) !== -1;
        }

        function paintFilters(all) {
            var withRoutes = all.filter(function (entry) { return hasFlights(entry.city); }).length;
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

        function groupMarkup(shown) {
            var order = [];
            var byCountry = {};
            shown.forEach(function (entry) {
                if (!byCountry[entry.country.code]) { byCountry[entry.country.code] = { country: entry.country, cities: [] }; order.push(entry.country.code); }
                byCountry[entry.country.code].cities.push(entry.city);
            });
            return order.map(function (code) {
                var group = byCountry[code];
                return '<section class="destination-group" aria-labelledby="group-' + escapeHtml(code) + '">' +
                    '<h3 class="destination-group-title" id="group-' + escapeHtml(code) + '">' + escapeHtml(localized(group.country, "name")) +
                    ' <span class="destination-group-count">' + group.cities.length + "</span></h3>" +
                    '<div class="destination-grid destination-grid--group">' +
                    group.cities.map(function (city) { return cardMarkup(group.country, city); }).join("") + "</div></section>";
            }).join("");
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
            if (grouped) {
                grid.className = "destination-groups";
                grid.innerHTML = groupMarkup(shown);
            } else {
                grid.className = "destination-grid";
                grid.innerHTML = shown.map(function (entry) { return cardMarkup(entry.country, entry.city); }).join("");
            }
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
        load: load, loadCity: loadCity, loadCityFlights: loadCityFlights, hubInfo: hubInfo, hubCityName: hubCityName,
        localized: localized, hasFlights: hasFlights, bookableAirport: bookableAirport, imageBase: imageBase,
        resultsUrl: resultsUrl, detailsUrl: detailsUrl, photoAlt: photoAlt, watchImages: watchImages, cardMarkup: cardMarkup,
        featuredCity: featuredCity, tr: tr, escapeHtml: escapeHtml, language: language
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
