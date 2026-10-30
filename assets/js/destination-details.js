/*
 * The destination details page: one destination of the backend catalog (GET api/destinations/{id}), opened with Explore from the destination
 * cards as destination-details.html?id=<country id>. It informs; it does not book. Only the Book Ticket buttons open the flight search
 * (booking.html?to=<city>), where the departure starts as the home base (Baku) and the traveller still chooses dates and passengers.
 * A city without an active route shows that no flights are scheduled and its Book Ticket button is switched off.
 * Needs api-client.js and destination-catalog.js first.
 */
(function () {
    "use strict";

    var catalog = window.AEROVA_DESTINATIONS;
    var api = window.AEROVA_API;
    var current = null;

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

    function bookButton(city, className) {
        var flights = catalog.hasFlights(city);
        return flights
            ? '<a class="' + className + '" href="' + esc(catalog.bookingUrl(city)) + '">' + esc(tr("destinations.bookTicket", "Book Ticket")) + "</a>"
            : '<a class="' + className + '" href="#" aria-disabled="true" tabindex="-1" title="' + esc(tr("destinations.bookDisabled", "No flights to book yet")) + '">' +
              esc(tr("destinations.bookTicket", "Book Ticket")) + "</a>";
    }

    function render(hubName) {
        var country = current;
        var city = catalog.featuredCity(country);
        if (!city) {
            showStatus(tr("destinations.detailsNotFound", "This destination is not available."));
            return;
        }

        var cityName = catalog.localized(city, "name");
        var countryName = catalog.localized(country, "name");
        var hero = byId("destination-hero-media");
        var base = catalog.imageBase(country);

        document.title = "AEROVA | " + cityName + ", " + countryName;
        setText("destination-country", countryName);
        setText("destination-name", cityName);
        setText("destination-tagline", catalog.localized(country, "description"));
        setText("destination-description", catalog.localized(country, "description"));
        hero.setAttribute("aria-label", catalog.photoAlt(country, city));
        hero.style.backgroundImage = "url('" + base + ".jpg'), url('assets/images/airport-premium.jpg')";

        byId("destination-cities").innerHTML = country.cities.filter(function (item) { return item.isActive !== false; }).map(function (item) {
            var flights = catalog.hasFlights(item);
            return '<li class="dd-city"><div class="dd-city-head"><h3 class="dd-city-name">' + esc(catalog.localized(item, "name")) + "</h3>" +
                bookButton(item, "dd-city-book") + "</div>" +
                '<ul class="dd-airports">' + (item.airports || []).map(function (airport) {
                    return '<li><span class="dd-airport-code">' + esc(airport.code) + "</span>" + esc(airport.name) + " · " + esc(airport.timeZoneId) + "</li>";
                }).join("") + "</ul>" +
                '<p class="dd-city-flights">' + esc(flights ? tr("destinations.flightsAvailable", "Scheduled flights available")
                    : tr("destinations.noFlightsDetail", "No scheduled flights yet. Booking opens when a flight is scheduled.")) + "</p></li>";
        }).join("");

        var from = hubName ? catalog.localized({ name: hubName }, "name") : "";
        setText("destination-aside-route", from ? tr("destinations.routeTitle", "{from} → {to}", { from: from, to: cityName }) : cityName);

        var cta = byId("destination-book-aside");
        if (catalog.hasFlights(city)) {
            cta.setAttribute("href", catalog.bookingUrl(city));
            cta.removeAttribute("aria-disabled");
            cta.removeAttribute("tabindex");
        } else {
            cta.setAttribute("href", "#");
            cta.setAttribute("aria-disabled", "true");
            cta.setAttribute("tabindex", "-1");
            setText("destination-aside-text", tr("destinations.noFlightsDetail", "No scheduled flights yet. Booking opens when a flight is scheduled."));
        }

        byId("destination-status").hidden = true;
        byId("destination-content").hidden = false;
    }

    function start() {
        var id = new URLSearchParams(window.location.search).get("id");
        if (!id || !/^\d+$/.test(id)) {
            showStatus(tr("destinations.detailsNotFound", "This destination is not available."));
            return;
        }

        Promise.all([catalog.loadOne(id), catalog.hubCityName()]).then(function (results) {
            current = results[0];
            render(results[1]);
        }, function (error) {
            showStatus(messageFor(error));
        });
    }

    window.addEventListener("aerova:languagechange", function () {
        if (current) {
            catalog.hubCityName().then(render);
        }
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
