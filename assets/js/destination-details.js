/*
 * A city's destination page (destination-details.html?city=<city id>), read from the backend catalog:
 *   - the hero: the city's own photograph, its country, its name and description;
 *   - "Airports in <city>": only the airports of this city (an airport belongs to one city);
 *   - "Flights from Baku": the real upcoming flights from the home base to those airports, or "No scheduled flights yet";
 *   - "Explore other cities in <country>": the other cities of the same country as cards of their own, each opening its own page.
 * The page informs. Only the Book Ticket buttons go on to the flight results (Baku -> the airport), and they are switched off for an
 * airport without a route: a flight of another city is never offered instead. Needs api-client.js, airports.js and destination-catalog.js.
 */
(function () {
    "use strict";

    var catalog = window.AEROVA_DESTINATIONS;
    var api = window.AEROVA_API;
    var directory = window.AEROVA_AIRPORTS;
    var state = null;

    function byId(id) { return document.getElementById(id); }

    var tr = catalog.tr;
    var esc = catalog.escapeHtml;

    function setText(id, text) {
        var element = byId(id);
        if (element) element.textContent = text;
    }

    function showStatus(text) {
        byId("destination-content").hidden = true;
        byId("destination-status").hidden = false;
        setText("destination-status-text", text);
        setText("destination-tagline", text);
    }

    function messageFor(error) {
        if (api && error instanceof api.ApiError && error.status === 404) {
            return tr("destinations.detailsNotFound", "Bu təyinat mövcud deyil.");
        }
        return tr("destinations.detailsError", "Bu təyinatı yükləmək mümkün olmadı. Yenidən cəhd edin.");
    }

    /* A UTC time as date and time at the airport (its own time zone), or in UTC when the zone is not known. */
    function localTime(utcValue, zone) {
        try {
            if (directory && zone) {
                var local = directory.localTime(utcValue, zone);
                return local.date + " · " + local.time;
            }
        } catch (error) { /* fall through */ }
        var text = String(utcValue || "");
        return text.slice(0, 10) + " · " + text.slice(11, 16) + " UTC";
    }

    /* Every airport has its own working button: Baku to exactly this airport. Without a flight the results page says so. */
    function bookButton(city, airport, className) {
        return '<a class="' + className + '" data-airport="' + esc(airport.code) + '" href="' + esc(catalog.resultsUrl(city, airport, state.page.country)) + '">' +
            esc(tr("destinations.bookTicket", "Bilet bron et")) + " · " + esc(airport.code) + "</a>";
    }

    function renderAirports(hubName) {
        var city = state.page.city;
        byId("destination-airports").innerHTML = city.airports.map(function (airport) {
            return '<li class="dd-airport-card"><div class="dd-airport-head"><span class="dd-airport-code">' + esc(airport.code) + "</span>" +
                '<span class="dd-airport-name">' + esc(airport.name) + "</span></div>" +
                '<p class="dd-airport-zone">' + esc(tr("destinations.timeZoneLabel", "Saat qurşağı")) + ": " + esc(airport.timeZoneId) + "</p>" +
                '<p class="dd-city-flights">' + esc(airport.hasRoutes
                    ? tr("destinations.flightsAvailable", "Planlaşdırılmış reyslər var")
                    : tr("destinations.noFlightsYet", "Hələlik planlaşdırılmış reys yoxdur")) + "</p>" +
                bookButton(city, airport, "dd-city-book") + "</li>";
        }).join("");
    }

    function renderFlights() {
        var list = byId("destination-flights");
        var flights = state.flights;
        var hubZone = state.hub ? state.hub.airport.timeZoneId : null;
        var zones = {};
        state.page.city.airports.forEach(function (airport) { zones[airport.code] = airport.timeZoneId; });

        if (!flights) {
            list.innerHTML = '<li class="dd-flights-empty" role="alert">' + esc(tr("destinations.flightsError", "Reysləri yükləmək mümkün olmadı. Yenidən cəhd edin.")) + "</li>";
            return;
        }
        if (!flights.length) {
            // No direct flight from the home base: when the city can be reached with a transfer, say so instead of "no flights".
            var reachable = catalog.hasFlights(state.page.city);
            list.innerHTML = '<li class="dd-flights-empty" role="status">' + esc(reachable
                ? tr("destinations.connectionOnly", "Birbaşa reys yoxdur. Bu şəhərə aktarma ilə uçuş mümkündür: tarixi seçin və axtarışa baxın.")
                : tr("destinations.noFlightsYet", "Hələlik planlaşdırılmış reys yoxdur")) + "</li>";
            return;
        }

        list.innerHTML = flights.map(function (flight) {
            var link = "flight-details.html?flightId=" + encodeURIComponent(flight.id) + "&passengers=1&adults=1&children=0&infants=0";
            return '<li class="dd-flight"><div class="dd-flight-main"><span class="dd-flight-number">' + esc(flight.flightNumber) + "</span>" +
                '<span class="dd-flight-route">' + esc(flight.originCode) + " → " + esc(flight.destinationCode) + "</span></div>" +
                '<div class="dd-flight-times"><span>' + esc(localTime(flight.departureAt, hubZone)) + "</span>" +
                "<span>" + esc(localTime(flight.arrivalAt, zones[flight.destinationCode])) + "</span></div>" +
                (flight.lowestFare != null ? '<span class="dd-flight-price">' + esc(tr("destinations.fromPrice", "{price}-dan", { price: "$" + Number(flight.lowestFare).toLocaleString("en-US") })) + "</span>" : "") +
                '<a class="dd-flight-link" href="' + esc(link) + '">' + esc(tr("destinations.flightDetails", "Ətraflı")) + "</a></li>";
        }).join("");
    }

    function renderOthers() {
        var section = byId("destination-others");
        var page = state.page;
        var others = page.otherCities || [];
        section.hidden = !others.length;
        if (!others.length) return;

        var country = page.country;
        setText("destination-others-title", tr("destinations.otherCities", "{country} ölkəsinin digər şəhərlərini kəşf edin", { country: catalog.localized(country, "name") }));
        // Each city as a small tile: its own photograph and name; the tile opens that city's page.
        byId("destination-others-grid").innerHTML = others.map(function (city) {
            var name = catalog.localized(city, "name");
            return '<li><a class="dd-other-tile" href="' + esc(catalog.detailsUrl(city)) + '">' +
                '<img data-photo src="' + esc(catalog.imageBase(city)) + '-sm.webp" alt="' + esc(name) + '" loading="lazy" decoding="async">' +
                '<span>' + esc(name) + "</span></a></li>";
        }).join("");
        catalog.watchImages(byId("destination-others-grid"));
    }

    /* The main button books the airport chosen in the card: the one with flights first, and a city with several airports lets the customer pick. */
    function renderAsideBooking(city, preferred) {
        var cta = byId("destination-book-aside");
        var picker = byId("destination-airport-pick");
        var airports = city.airports || [];
        var chosen = state.chosen && airports.some(function (a) { return a.code === state.chosen; }) ? state.chosen : (preferred ? preferred.code : "");

        function apply(code) {
            var target = airports.filter(function (a) { return a.code === code; })[0] || preferred;
            state.chosen = target ? target.code : "";
            cta.setAttribute("href", target ? catalog.resultsUrl(city, target, state.page.country) : "#");
            setText("destination-aside-text", target && !target.hasRoutes
                ? tr("destinations.noFlightsDetail", "Hələlik planlaşdırılmış reys yoxdur. Nəticə səhifəsində mövcud olanlar göstərilir.")
                : tr("destinationDetails.chooseDateText", "Səyahət tarixinizi seçin və mövcud uçuşları tapın."));
        }

        picker.hidden = airports.length < 2;
        if (airports.length >= 2) {
            byId("destination-airport-select").innerHTML = airports.map(function (a) {
                return '<option value="' + esc(a.code) + '"' + (a.code === chosen ? " selected" : "") + ">" + esc(a.code + " · " + a.name) + "</option>";
            }).join("");
        }
        apply(chosen);
    }

    /* The country's own description ("Təyinat haqqında"), from the same catalog request the cards use. */
    function loadCountryDescription(country) {
        catalog.load().then(function (list) {
            var found = (list || []).filter(function (item) { return item.code === country.code; })[0];
            setText("destination-country-desc", found ? catalog.localized(found, "description") : "");
        }, function () {
            setText("destination-country-desc", "");
        });
    }

    function render() {
        var page = state.page;
        var city = page.city;
        var country = page.country;
        var cityName = catalog.localized(city, "name");
        var countryName = catalog.localized(country, "name");
        var base = catalog.imageBase(city);
        var hubName = state.hub ? catalog.localized(state.hub.city, "name") : "";
        var airport = catalog.bookableAirport(city);

        document.title = "AEROVA | " + cityName + ", " + countryName;
        setText("destination-country", countryName);
        setText("destination-name", cityName);
        setText("destination-description", catalog.localized(city, "description"));
        // The loading line in the intro is replaced by the city's own text; an empty status line is hidden by the stylesheet.
        setText("destination-tagline", "");
        loadCountryDescription(country);
        setText("destination-airports-title", tr("destinations.airportsIn", "{city} hava limanları", { city: cityName }));
        setText("destination-flights-title", tr("destinations.flightsFrom", "{origin} şəhərindən reyslər", { origin: hubName || "Baku" }));
        // The photograph is the city's own file (the same one its catalog card shows). Until it loads, or when it is missing, the neutral picture is shown,
        // never another city's photograph.
        var photo = byId("destination-photo");
        photo.alt = catalog.photoAlt(city, country);
        photo.onerror = function () { photo.onerror = null; photo.src = "assets/images/airport-premium.jpg"; };
        photo.src = base + ".webp";
        setText("destination-aside-route", hubName ? tr("destinations.routeTitle", "{from} → {to}", { from: hubName, to: cityName }) : cityName);
        setText("destination-back-country", tr("destinations.backToDestinations", "Təyinatlara qayıt"));

        // The travel card (booking summary and flights) is no longer on the page; its parts are drawn only when present.
        if (byId("destination-book-aside")) renderAsideBooking(city, airport);

        renderAirports(hubName);
        if (byId("destination-flights")) renderFlights();
        renderOthers();

        byId("destination-status").hidden = true;
        byId("destination-content").hidden = false;
    }

    function start() {
        var id = new URLSearchParams(window.location.search).get("city");
        if (!id || !/^\d+$/.test(id)) {
            showStatus(tr("destinations.detailsNotFound", "Bu təyinat mövcud deyil."));
            return;
        }

        var loadingFlights = catalog.loadCityFlights(id).then(function (flights) { return flights; }, function () { return null; });
        Promise.all([catalog.loadCity(id), catalog.hubInfo(), directory ? directory.load().catch(function () { return []; }) : []]).then(function (results) {
            state = { page: results[0], hub: results[1], flights: [] };
            return loadingFlights.then(function (flights) {
                state.flights = flights;
                render();
            });
        }, function (error) {
            showStatus(messageFor(error));
        });
    }

    document.addEventListener("change", function (event) {
        if (!state || !event.target || event.target.id !== "destination-airport-select") return;
        state.chosen = event.target.value;
        renderAsideBooking(state.page.city, catalog.bookableAirport(state.page.city));
    });


    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
