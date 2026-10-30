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
            return tr("destinations.detailsNotFound", "This destination is not available.");
        }
        return tr("destinations.detailsError", "We could not load this destination. Please try again.");
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

    function bookButton(city, airport, className) {
        return airport.hasRoutes
            ? '<a class="' + className + '" href="' + esc(catalog.resultsUrl(city, airport)) + '">' + esc(tr("destinations.bookTicket", "Book Ticket")) + "</a>"
            : '<span class="' + className + ' is-disabled" aria-disabled="true" title="' + esc(tr("destinations.bookDisabled", "No flights to book yet")) + '">' +
              esc(tr("destinations.bookTicket", "Book Ticket")) + "</span>";
    }

    function renderAirports(hubName) {
        var city = state.page.city;
        byId("destination-airports").innerHTML = city.airports.map(function (airport) {
            return '<li class="dd-airport-card"><div class="dd-airport-head"><span class="dd-airport-code">' + esc(airport.code) + "</span>" +
                '<span class="dd-airport-name">' + esc(airport.name) + "</span></div>" +
                '<p class="dd-airport-zone">' + esc(tr("destinations.timeZoneLabel", "Time zone")) + ": " + esc(airport.timeZoneId) + "</p>" +
                '<p class="dd-city-flights">' + esc(airport.hasRoutes
                    ? tr("destinations.flightsAvailable", "Scheduled flights available")
                    : tr("destinations.noFlightsYet", "No scheduled flights yet")) + "</p>" +
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
            list.innerHTML = '<li class="dd-flights-empty" role="alert">' + esc(tr("destinations.flightsError", "We could not load the flights. Please try again.")) + "</li>";
            return;
        }
        if (!flights.length) {
            list.innerHTML = '<li class="dd-flights-empty" role="status">' + esc(tr("destinations.noFlightsYet", "No scheduled flights yet")) + "</li>";
            return;
        }

        list.innerHTML = flights.map(function (flight) {
            var link = "flight-details.html?flightId=" + encodeURIComponent(flight.id) + "&passengers=1&adults=1&children=0&infants=0";
            return '<li class="dd-flight"><div class="dd-flight-main"><span class="dd-flight-number">' + esc(flight.flightNumber) + "</span>" +
                '<span class="dd-flight-route">' + esc(flight.originCode) + " → " + esc(flight.destinationCode) + "</span></div>" +
                '<div class="dd-flight-times"><span>' + esc(localTime(flight.departureAt, hubZone)) + "</span>" +
                "<span>" + esc(localTime(flight.arrivalAt, zones[flight.destinationCode])) + "</span></div>" +
                (flight.lowestFare != null ? '<span class="dd-flight-price">' + esc(tr("destinations.fromPrice", "From {price}", { price: "$" + Number(flight.lowestFare).toLocaleString("en-US") })) + "</span>" : "") +
                '<a class="dd-flight-link" href="' + esc(link) + '">' + esc(tr("destinations.flightDetails", "Details")) + "</a></li>";
        }).join("");
    }

    function renderOthers() {
        var section = byId("destination-others");
        var page = state.page;
        var others = page.otherCities || [];
        section.hidden = !others.length;
        if (!others.length) return;

        var country = page.country;
        setText("destination-others-title", tr("destinations.otherCities", "Explore other cities in {country}", { country: catalog.localized(country, "name") }));
        byId("destination-others-grid").innerHTML = others.map(function (city) {
            return catalog.cardMarkup(country, city, { booking: true });
        }).join("");
        catalog.watchImages(byId("destination-others-grid"));
    }

    function render() {
        var page = state.page;
        var city = page.city;
        var country = page.country;
        var cityName = catalog.localized(city, "name");
        var countryName = catalog.localized(country, "name");
        var base = catalog.imageBase(city, country);
        var hubName = state.hub ? catalog.localized(state.hub.city, "name") : "";
        var airport = catalog.bookableAirport(city);

        document.title = "AEROVA | " + cityName + ", " + countryName;
        setText("destination-country", countryName);
        setText("destination-name", cityName);
        setText("destination-tagline", catalog.localized(city, "description"));
        setText("destination-description", catalog.localized(city, "description"));
        setText("destination-airports-title", tr("destinations.airportsIn", "Airports in {city}", { city: cityName }));
        setText("destination-flights-title", tr("destinations.flightsFrom", "Flights from {origin}", { origin: hubName || "Baku" }));
        byId("destination-hero-media").setAttribute("aria-label", catalog.photoAlt(city, country));
        byId("destination-hero-media").style.backgroundImage = "url('" + base + ".jpg'), url('assets/images/airport-premium.jpg')";
        setText("destination-aside-route", hubName ? tr("destinations.routeTitle", "{from} → {to}", { from: hubName, to: cityName }) : cityName);
        setText("destination-back-country", tr("destinations.backToDestinations", "Back to Destinations"));

        var cta = byId("destination-book-aside");
        if (airport && airport.hasRoutes) {
            cta.setAttribute("href", catalog.resultsUrl(city, airport));
            cta.classList.remove("is-disabled");
            cta.removeAttribute("aria-disabled");
            cta.removeAttribute("tabindex");
            setText("destination-aside-text", tr("destinationDetails.chooseDateText", "Choose your travel date and find available flights."));
        } else {
            cta.setAttribute("href", "#");
            cta.classList.add("is-disabled");
            cta.setAttribute("aria-disabled", "true");
            cta.setAttribute("tabindex", "-1");
            setText("destination-aside-text", tr("destinations.noFlightsDetail", "No scheduled flights yet. Booking opens when a flight is scheduled."));
        }

        renderAirports(hubName);
        renderFlights();
        renderOthers();

        byId("destination-status").hidden = true;
        byId("destination-content").hidden = false;
    }

    function start() {
        var id = new URLSearchParams(window.location.search).get("city");
        if (!id || !/^\d+$/.test(id)) {
            showStatus(tr("destinations.detailsNotFound", "This destination is not available."));
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

    window.addEventListener("aerova:languagechange", function () { if (state) render(); });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
