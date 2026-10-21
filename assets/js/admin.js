/*
 * AEROVA admin. Everything on this page comes from and goes to the backend (api/admin/*), which only answers to the Admin role.
 * The role is checked here too, but only so a customer sees a clear message instead of failing requests; the server decides.
 * Needs api-client.js, airports.js and auth.js.
 */
(function () {
    "use strict";

    var api = window.AEROVA_API;
    var directory = window.AEROVA_AIRPORTS;
    var PAGE_SIZE = 50;

    function tr(key, fallback, vars) {
        if (typeof window.t === "function") {
            var value = window.t(key, vars);
            if (value && value !== key) return value;
        }
        return typeof vars === "object" && vars
            ? String(fallback).replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? String(vars[k]) : "{" + k + "}"; })
            : fallback;
    }

    function translateStatus(status) {
        var map = {
            "On Time": "common.statusOnTime",
            "Delayed": "common.statusDelayed",
            "Scheduled": "common.statusScheduled",
            "Cancelled": "common.statusCancelled",
            "Confirmed": "common.statusConfirmed",
            "Pending": "common.statusPending",
            "Active": "common.statusActive",
            "Inactive": "common.statusInactive",
            "Completed": "common.statusCompleted",
            "Available": "common.available",
            "Occupied": "common.occupied",
            "Reserved": "common.reserved",
            "Blocked": "common.blocked"
        };
        var key = map[status];
        return key ? tr(key, status) : status;
    }

    /* "OnTime" -> "On Time", so the enum names the API uses read like the labels the page always had. */
    function statusText(status) {
        return translateStatus(String(status || "").replace(/([a-z])([A-Z])/g, "$1 $2"));
    }

    function getSectionMeta() {
        return {
            dashboard: { title: tr("admin.dashboard", "Dashboard"), subtitle: tr("admin.dashboardSub", "Airline operations overview") },
            flights: { title: tr("admin.flights", "Flights"), subtitle: tr("admin.flightsSub", "Manage flight operations and status") },
            routes: { title: tr("admin.routes", "Routes"), subtitle: tr("admin.routesSub", "Network route management") },
            schedules: { title: tr("admin.schedules", "Schedules"), subtitle: tr("admin.schedulesSub", "Departure planning and timetable control") },
            aircraft: { title: tr("admin.aircraft", "Aircraft"), subtitle: tr("admin.aircraftSub", "Fleet configuration and seat capacity") },
            seats: { title: tr("admin.seats", "Seat Inventory"), subtitle: tr("admin.seatsSub", "Cabin availability by flight") },
            bookings: { title: tr("admin.bookings", "Bookings"), subtitle: tr("admin.bookingsSub", "Reservation management and cancellations") },
            passengers: { title: tr("admin.passengers", "Passengers"), subtitle: tr("admin.passengersSub", "Traveler records and contact details") },
            airports: { title: tr("api.admin.airports", "Airports"), subtitle: tr("api.admin.airportsSub", "Where AEROVA flies and the time zone of each airport") },
            promos: { title: tr("api.admin.promos", "Promo Codes"), subtitle: tr("api.admin.promosSub", "Discount codes for the payment page") },
            options: { title: tr("api.admin.options", "Baggage & Meals"), subtitle: tr("api.admin.optionsSub", "Extras travellers can add to a booking") },
            rules: { title: tr("api.admin.rules", "Cancellation Rules"), subtitle: tr("api.admin.rulesSub", "Fees by cabin and days before departure") }
        };
    }

    /* Where the aisles are, per cabin. The seats themselves (rows, letters, state) come from the API. */
    var CABIN_GROUPS = {
        Business: [["A", "B"], ["C", "D"]],
        Comfort: [["A", "B"], ["C"], ["D", "E"]],
        Economy: [["A", "B", "C"], ["D", "E", "F"]]
    };

    var CABINS = ["Economy", "Comfort", "Business"];
    var FLIGHT_STATUSES = ["Scheduled", "OnTime", "Delayed", "Cancelled", "Completed"];
    var DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    var state = {
        airports: [],
        aircraft: [],
        routes: [],
        schedules: [],
        flights: [],
        flightPage: 0,
        bookings: [],
        passengers: [],
        dashboard: null,
        adminAirports: [],
        promos: [],
        baggage: [],
        meals: [],
        rules: [],
        seatFlights: [],
        seatInventory: null,
        formContext: null,
        section: "dashboard"
    };

    /* ------------------------------------------------------------------ basics */

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function showMessage(text, isError) {
        var message = byId("admin-message");
        if (!message) return;
        message.textContent = text || "";
        message.hidden = !text;
        message.classList.toggle("is-error", !!isError);
        window.clearTimeout(showMessage._timer);
        if (text) {
            showMessage._timer = window.setTimeout(function () {
                message.hidden = true;
            }, isError ? 7000 : 3200);
        }
    }

    function apiMessage(error) {
        var isApiError = api && error instanceof api.ApiError;
        if (!isApiError && window.console) window.console.error(error);
        return isApiError ? error.userMessage : tr("api.errors.generic", "Something went wrong. Please try again.");
    }

    function statusBadge(status) {
        var value = String(status || "Unknown");
        var lower = value.toLowerCase().replace(/\s+/g, "");
        var tone = "neutral";
        if (["active", "scheduled", "confirmed", "available", "ontime", "completed"].indexOf(lower) !== -1) tone = "success";
        else if (["delayed", "pending", "reserved", "held", "maintenance"].indexOf(lower) !== -1) tone = "warning";
        else if (["cancelled", "canceled", "blocked", "inactive", "occupied", "booked", "expired"].indexOf(lower) !== -1) tone = "danger";
        return '<span class="admin-badge admin-badge--' + tone + '">' + escapeHtml(statusText(value)) + "</span>";
    }

    function formatMoney(amount) {
        var value = Number(amount);
        return "$" + (isFinite(value) ? value : 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

    function formatDuration(minutes) {
        return Math.floor(minutes / 60) + "h " + (minutes % 60 < 10 ? "0" : "") + (minutes % 60) + "m";
    }

    /* A UTC time from the API as date and time at the given airport (or in UTC when the airport is unknown). */
    function atAirport(utcValue, code) {
        var airport = directory.find(state.airports, code);
        if (airport) {
            return directory.localTime(utcValue, airport.timeZoneId);
        }
        var text = String(utcValue || "");
        return { date: text.slice(0, 10), time: text.slice(11, 16) };
    }

    function utcDay(utcValue) {
        return String(utcValue || "").slice(0, 10);
    }

    /* ------------------------------------------------------------------ access */

    function showAccessPanel(title, text, actions) {
        var shell = byId("admin-shell");
        if (shell) shell.hidden = true;

        var panel = byId("admin-access");
        if (!panel) {
            panel = document.createElement("main");
            panel.id = "admin-access";
            panel.className = "admin-access";
            document.body.appendChild(panel);
        }

        panel.setAttribute("role", "alert");
        panel.innerHTML = '<h1 class="admin-access-title">' + escapeHtml(title) + "</h1>" +
            '<p class="admin-access-text">' + escapeHtml(text) + "</p>" +
            '<div class="admin-access-actions">' + actions.map(function (action) {
                return '<a class="admin-btn admin-btn--primary" href="' + escapeHtml(action.href) + '">' + escapeHtml(action.label) + "</a>";
            }).join("") + "</div>";
    }

    function denyAccess() {
        showAccessPanel(
            tr("api.admin.deniedTitle", "Administrators only"),
            tr("api.admin.deniedText", "This area is for AEROVA administrators. Sign in with an administrator account to continue."),
            [{ label: tr("api.admin.signIn", "Sign in"), href: "login.html?next=admin.html" }, { label: tr("auth.backHome", "Back to Home"), href: "index.html" }]
        );
    }

    function currentRole() {
        var user = window.AerovaAuth && window.AerovaAuth.getCurrentUser();
        return user ? user.role : null;
    }

    /* ------------------------------------------------------------------ loading helpers */

    function setTableStatus(bodyId, columns, kind, text, retry) {
        var body = byId(bodyId);
        if (!body) return;

        var content = '<td colspan="' + columns + '" class="admin-empty" role="' + (kind === "error" ? "alert" : "status") + '">' + escapeHtml(text);
        if (retry) {
            content += ' <button class="admin-btn admin-btn--ghost" type="button" data-retry="1">' + escapeHtml(tr("api.options.retry", "Try again")) + "</button>";
        }
        body.innerHTML = "<tr>" + content + "</td></tr>";

        var button = body.querySelector("[data-retry]");
        if (button && retry) {
            button.addEventListener("click", retry);
        }
    }

    function loading(bodyId, columns) {
        setTableStatus(bodyId, columns, "loading", tr("api.admin.loading", "Loading..."));
    }

    function failed(error, bodyId, columns, retry) {
        if (api && error instanceof api.ApiError && error.status === 403) {
            denyAccess();
            return;
        }
        setTableStatus(bodyId, columns, "error", apiMessage(error), retry);
    }

    function referenceData() {
        return Promise.all([directory.load(), api.get("api/admin/aircraft"), api.get("api/admin/routes")]).then(function (results) {
            state.airports = results[0];
            state.aircraft = results[1];
            state.routes = results[2];
        });
    }

    function debounce(fn, wait) {
        var timer = null;
        return function () {
            window.clearTimeout(timer);
            timer = window.setTimeout(fn, wait);
        };
    }

    /* ------------------------------------------------------------------ dashboard */

    function renderDashboard() {
        var data = state.dashboard;
        if (!data) return;

        var stats = data.stats;
        var values = document.querySelectorAll(".admin-stat-value");
        [stats.totalFlights, stats.activeRoutes, stats.aircraft, stats.totalBookings, stats.availableSeats, stats.passengers].forEach(function (value, index) {
            if (values[index]) values[index].textContent = Number(value).toLocaleString("en-US");
        });

        var bookings = data.recentBookings;
        byId("dashboard-bookings-body").innerHTML = bookings.length
            ? bookings.map(function (item) {
                return "<tr><td>" + escapeHtml(item.pnr) + "</td><td>" + escapeHtml(item.leadPassenger) +
                    "</td><td>" + escapeHtml(item.flightNumber) + "</td><td>" + escapeHtml(formatMoney(item.totalAmount)) +
                    "</td><td>" + statusBadge(item.status) + "</td></tr>";
            }).join("")
            : '<tr><td colspan="5" class="admin-empty">' + escapeHtml(tr("admin.noBookings", "No bookings found.")) + "</td></tr>";

        byId("dashboard-flights-body").innerHTML = data.upcomingFlights.length
            ? data.upcomingFlights.map(function (item) {
                var departure = atAirport(item.departureAt, item.originCode);
                return "<tr><td>" + escapeHtml(item.flightNumber) + "</td><td>" +
                    escapeHtml(item.originCity + " → " + item.destinationCity) + "</td><td>" +
                    escapeHtml(departure.date + " · " + departure.time) + "</td><td>" +
                    escapeHtml(item.aircraftModel) + "</td><td>" + statusBadge(item.status) + "</td></tr>";
            }).join("")
            : '<tr><td colspan="5" class="admin-empty">' + escapeHtml(tr("admin.noFlights", "No flights found.")) + "</td></tr>";
    }

    function loadDashboard() {
        loading("dashboard-bookings-body", 5);
        loading("dashboard-flights-body", 5);

        Promise.all([directory.load(), api.get("api/admin/dashboard")]).then(function (results) {
            state.airports = results[0];
            state.dashboard = results[1];
            renderDashboard();
        }).catch(function (error) {
            failed(error, "dashboard-bookings-body", 5, loadDashboard);
            setTableStatus("dashboard-flights-body", 5, "error", apiMessage(error), loadDashboard);
        });
    }

    /* ------------------------------------------------------------------ flights */

    function flightQuery() {
        var params = [];
        var search = byId("flight-search").value.trim();
        var status = byId("flight-status-filter").value;
        var date = byId("flight-date-filter") ? byId("flight-date-filter").value : "";

        if (search) params.push("search=" + encodeURIComponent(search));
        if (status) params.push("status=" + encodeURIComponent(status));
        if (date) params.push("date=" + encodeURIComponent(date));
        params.push("take=" + PAGE_SIZE, "skip=" + (state.flightPage * PAGE_SIZE));
        return "api/admin/flights?" + params.join("&");
    }

    function renderFlights() {
        var body = byId("flights-body");
        if (!state.flights.length) {
            body.innerHTML = '<tr><td colspan="9" class="admin-empty">' + escapeHtml(tr("admin.noFlights", "No flights found.")) + "</td></tr>";
        } else {
            body.innerHTML = state.flights.map(function (item) {
                var departure = atAirport(item.departureAt, item.originCode);
                var arrival = atAirport(item.arrivalAt, item.destinationCode);
                return "<tr>" +
                    "<td>" + escapeHtml(item.flightNumber) + "</td>" +
                    "<td>" + escapeHtml(item.originCity) + "</td>" +
                    "<td>" + escapeHtml(item.destinationCity) + "</td>" +
                    "<td>" + escapeHtml(departure.date) + "</td>" +
                    "<td>" + escapeHtml(departure.time) + "</td>" +
                    "<td>" + escapeHtml(arrival.time) + "</td>" +
                    "<td>" + escapeHtml(item.aircraftModel) + "</td>" +
                    "<td>" + statusBadge(item.status) + "</td>" +
                    '<td><div class="admin-actions">' +
                    '<button class="admin-btn admin-btn--ghost" type="button" data-edit-flight="' + item.id + '">' + escapeHtml(tr("admin.edit", "Edit")) + "</button>" +
                    '<button class="admin-btn admin-btn--ghost" type="button" data-delete-flight="' + item.id + '">' + escapeHtml(tr("admin.delete", "Delete")) + "</button>" +
                    "</div></td></tr>";
            }).join("");
        }

        var pager = byId("flights-pager");
        if (pager) {
            byId("flights-pager-info").textContent = tr("api.admin.page", "Page {n}", { n: state.flightPage + 1 });
            byId("flights-prev").disabled = state.flightPage === 0;
            byId("flights-next").disabled = state.flights.length < PAGE_SIZE;
        }
    }

    function loadFlights() {
        loading("flights-body", 9);
        Promise.all([directory.load(), api.get(flightQuery())]).then(function (results) {
            state.airports = results[0];
            state.flights = results[1];
            renderFlights();
        }).catch(function (error) {
            failed(error, "flights-body", 9, loadFlights);
        });
    }

    function resetFlightsAndLoad() {
        state.flightPage = 0;
        loadFlights();
    }

    /* ------------------------------------------------------------------ routes */

    function renderRoutes() {
        var query = byId("route-search").value.toLowerCase();
        var rows = state.routes.filter(function (item) {
            return !query || [item.code, item.originCity, item.destinationCity].join(" ").toLowerCase().indexOf(query) !== -1;
        });
        var body = byId("routes-body");

        if (!rows.length) {
            body.innerHTML = '<tr><td colspan="7" class="admin-empty">' + escapeHtml(tr("admin.noRoutes", "No routes found.")) + "</td></tr>";
            return;
        }

        body.innerHTML = rows.map(function (item) {
            return "<tr>" +
                "<td>" + escapeHtml(item.code) + "</td>" +
                "<td>" + escapeHtml(item.originCity) + "</td>" +
                "<td>" + escapeHtml(item.destinationCity) + "</td>" +
                "<td>" + escapeHtml(item.distanceKm.toLocaleString("en-US") + " km") + "</td>" +
                "<td>" + escapeHtml(formatDuration(item.durationMinutes)) + "</td>" +
                "<td>" + statusBadge(item.isActive ? "Active" : "Inactive") + "</td>" +
                '<td><div class="admin-actions">' +
                '<button class="admin-btn admin-btn--ghost" type="button" data-edit-route="' + item.id + '">' + escapeHtml(tr("admin.edit", "Edit")) + "</button>" +
                '<button class="admin-btn admin-btn--ghost" type="button" data-delete-route="' + item.id + '">' + escapeHtml(tr("admin.delete", "Delete")) + "</button>" +
                "</div></td></tr>";
        }).join("");
    }

    function loadRoutes() {
        loading("routes-body", 7);
        referenceData().then(renderRoutes).catch(function (error) {
            failed(error, "routes-body", 7, loadRoutes);
        });
    }

    /* ------------------------------------------------------------------ schedules */

    function daysLabel(days) {
        var text = String(days || "");
        if (text === "Everyday") return tr("api.admin.everyday", "Every day");
        if (text === "Weekdays") return tr("api.admin.weekdays", "Weekdays");
        return text.split(",").map(function (name) { return name.trim().slice(0, 3); }).join(" ");
    }

    function renderSchedules() {
        var date = byId("schedule-date-filter").value;
        var status = byId("schedule-status-filter").value;
        var rows = state.schedules.filter(function (item) {
            var validOnDate = !date || (item.validFrom <= date && (!item.validTo || item.validTo >= date));
            var matchesStatus = !status || (status === "Active") === item.isActive;
            return validOnDate && matchesStatus;
        });
        var body = byId("schedules-body");

        if (!rows.length) {
            body.innerHTML = '<tr><td colspan="8" class="admin-empty">' + escapeHtml(tr("admin.noSchedules", "No schedules found.")) + "</td></tr>";
            return;
        }

        body.innerHTML = rows.map(function (item) {
            var validity = item.validFrom + (item.validTo ? " → " + item.validTo : " →");
            return "<tr>" +
                "<td>" + escapeHtml(item.flightNumber) + "</td>" +
                "<td>" + escapeHtml(item.originCity + " → " + item.destinationCity) + "</td>" +
                "<td>" + escapeHtml(item.aircraftModel || "—") + "</td>" +
                "<td>" + escapeHtml(daysLabel(item.daysOfWeek)) + "<br><small>" + escapeHtml(validity) + "</small></td>" +
                "<td>" + escapeHtml(String(item.departureTime).slice(0, 5)) + "</td>" +
                "<td>" + escapeHtml(String(item.arrivalTime).slice(0, 5) + (item.arrivalDayOffset ? " +" + item.arrivalDayOffset : "")) + "</td>" +
                "<td>" + statusBadge(item.isActive ? "Active" : "Inactive") + "</td>" +
                '<td><div class="admin-actions">' +
                '<button class="admin-btn admin-btn--ghost" type="button" data-generate-schedule="' + item.id + '">' + escapeHtml(tr("api.admin.generate", "Create flights")) + "</button>" +
                '<button class="admin-btn admin-btn--ghost" type="button" data-edit-schedule="' + item.id + '">' + escapeHtml(tr("admin.edit", "Edit")) + "</button>" +
                '<button class="admin-btn admin-btn--ghost" type="button" data-delete-schedule="' + item.id + '">' + escapeHtml(tr("admin.delete", "Delete")) + "</button>" +
                "</div></td></tr>";
        }).join("");
    }

    function loadSchedules() {
        loading("schedules-body", 8);
        Promise.all([referenceData(), api.get("api/admin/schedules")]).then(function (results) {
            state.schedules = results[1];
            renderSchedules();
        }).catch(function (error) {
            failed(error, "schedules-body", 8, loadSchedules);
        });
    }

    /* ------------------------------------------------------------------ aircraft */

    function renderAircraft() {
        var query = byId("aircraft-search").value.toLowerCase();
        var rows = state.aircraft.filter(function (item) {
            return !query || [item.name, item.model, item.registrationNumber].join(" ").toLowerCase().indexOf(query) !== -1;
        });
        var body = byId("aircraft-body");

        if (!rows.length) {
            body.innerHTML = '<tr><td colspan="9" class="admin-empty">' + escapeHtml(tr("admin.noAircraft", "No aircraft found.")) + "</td></tr>";
            return;
        }

        body.innerHTML = rows.map(function (item) {
            return "<tr>" +
                "<td>" + escapeHtml(item.name) + "</td>" +
                "<td>" + escapeHtml(item.model) + "</td>" +
                "<td>" + escapeHtml(item.registrationNumber) + "</td>" +
                "<td>" + item.totalSeats + "</td>" +
                "<td>" + item.businessSeats + "</td>" +
                "<td>" + item.comfortSeats + "</td>" +
                "<td>" + item.economySeats + "</td>" +
                "<td>" + statusBadge(item.status) + "</td>" +
                '<td><div class="admin-actions">' +
                '<button class="admin-btn admin-btn--ghost" type="button" data-view-aircraft="' + item.id + '">' + escapeHtml(tr("admin.viewDetails", "View Details")) + "</button>" +
                '<button class="admin-btn admin-btn--ghost" type="button" data-edit-aircraft="' + item.id + '">' + escapeHtml(tr("admin.edit", "Edit")) + "</button>" +
                '<button class="admin-btn admin-btn--ghost" type="button" data-delete-aircraft="' + item.id + '">' + escapeHtml(tr("admin.delete", "Delete")) + "</button>" +
                "</div></td></tr>";
        }).join("");
    }

    function loadAircraft() {
        loading("aircraft-body", 9);
        referenceData().then(renderAircraft).catch(function (error) {
            failed(error, "aircraft-body", 9, loadAircraft);
        });
    }

    /* ------------------------------------------------------------------ seat inventory */

    function seatState(status) {
        return status === "Held" ? "reserved" : (status === "Booked" ? "occupied" : String(status).toLowerCase());
    }

    function renderSeatInventory() {
        var inventory = state.seatInventory;
        var deck = byId("aircraft-deck");
        var cabinName = byId("seat-cabin-select").value || "Economy";

        if (!inventory) {
            deck.innerHTML = "";
            byId("seat-summary-list").innerHTML = "";
            return;
        }

        var seats = inventory.seats.filter(function (seat) { return seat.cabinClass === cabinName; });
        var counts = { Available: 0, Held: 0, Booked: 0, Blocked: 0 };
        seats.forEach(function (seat) { counts[seat.status] += 1; });

        byId("seat-map-title").textContent = inventory.flightNumber + " · " + cabinName + " " + tr("ui.seatMap", "Seat Map");
        byId("seat-summary-list").innerHTML =
            "<div><dt>" + escapeHtml(tr("api.admin.seatsAvailable", "Available seats")) + "</dt><dd>" + counts.Available + "</dd></div>" +
            "<div><dt>" + escapeHtml(tr("api.admin.seatsOccupied", "Occupied seats")) + "</dt><dd>" + counts.Booked + "</dd></div>" +
            "<div><dt>" + escapeHtml(tr("api.admin.seatsReserved", "Reserved seats")) + "</dt><dd>" + counts.Held + "</dd></div>" +
            "<div><dt>" + escapeHtml(tr("api.admin.seatsBlocked", "Blocked seats")) + "</dt><dd>" + counts.Blocked + "</dd></div>";

        if (!seats.length) {
            deck.innerHTML = '<p class="admin-empty">' + escapeHtml(tr("api.admin.noSeatsInCabin", "This aircraft has no seats in this cabin.")) + "</p>";
            return;
        }

        var letters = [];
        seats.forEach(function (seat) { if (letters.indexOf(seat.letter) === -1) letters.push(seat.letter); });
        letters.sort();

        // The usual aisle layout, plus any letter the aircraft has that the layout does not mention.
        var groups = (CABIN_GROUPS[cabinName] || [letters]).map(function (group) {
            return group.filter(function (letter) { return letters.indexOf(letter) !== -1; });
        }).filter(function (group) { return group.length; });
        var known = [].concat.apply([], groups);
        var extra = letters.filter(function (letter) { return known.indexOf(letter) === -1; });
        if (extra.length) groups.push(extra);

        var rows = [];
        seats.forEach(function (seat) { if (rows.indexOf(seat.rowNumber) === -1) rows.push(seat.rowNumber); });
        rows.sort(function (a, b) { return a - b; });

        var index = {};
        seats.forEach(function (seat) { index[seat.label] = seat; });

        var html = '<div class="aircraft-nose" aria-hidden="true"></div>';
        html += '<h3 class="cabin-block-title">' + escapeHtml(cabinName) + "</h3>";
        html += '<div class="seat-columns">';
        groups.forEach(function (group, groupIndex) {
            html += '<div class="seat-columns-group" style="grid-template-columns:repeat(' + group.length + ', var(--seat-size))">' +
                group.map(function (letter) { return "<span>" + letter + "</span>"; }).join("") + "</div>";
            if (groupIndex < groups.length - 1) html += '<span class="seat-columns-aisle" aria-hidden="true"></span>';
        });
        html += "</div>";

        rows.forEach(function (row) {
            html += '<div class="seat-row"><span class="seat-row-label">' + row + "</span>";
            groups.forEach(function (group, groupIndex) {
                html += '<div class="seat-group" style="grid-template-columns:repeat(' + group.length + ', var(--seat-size))">';
                group.forEach(function (letter) {
                    var seat = index[row + letter];
                    if (!seat) {
                        html += '<span class="seat-placeholder" aria-hidden="true"></span>';
                        return;
                    }
                    html += '<button class="admin-seat admin-seat--' + seatState(seat.status) + '" type="button" data-seat-id="' + seat.id +
                        '" title="' + escapeHtml(seat.label + " · " + statusText(seat.status)) + '">' + letter + "</button>";
                });
                html += "</div>";
                if (groupIndex < groups.length - 1) html += '<span class="seat-aisle" aria-hidden="true"></span>';
            });
            html += "</div>";
        });

        deck.setAttribute("data-layout", cabinName.toLowerCase());
        deck.innerHTML = html;
    }

    function loadSeatInventory() {
        var select = byId("seat-flight-select");
        var flightId = select.value;
        var deck = byId("aircraft-deck");

        if (!flightId) {
            state.seatInventory = null;
            renderSeatInventory();
            deck.innerHTML = '<p class="admin-empty">' + escapeHtml(tr("api.admin.noFlightsThatDay", "There are no flights on this day.")) + "</p>";
            return;
        }

        deck.innerHTML = '<p class="admin-empty" role="status">' + escapeHtml(tr("api.admin.loading", "Loading...")) + "</p>";

        api.get("api/admin/flights/" + encodeURIComponent(flightId) + "/seats").then(function (inventory) {
            state.seatInventory = inventory;
            renderSeatInventory();
        }).catch(function (error) {
            if (api && error instanceof api.ApiError && error.status === 403) {
                denyAccess();
                return;
            }
            deck.innerHTML = '<p class="admin-empty" role="alert">' + escapeHtml(apiMessage(error)) + "</p>";
        });
    }

    function loadSeatFlights() {
        var dayInput = byId("seat-date-select");
        var select = byId("seat-flight-select");
        var day = dayInput.value || new Date().toISOString().slice(0, 10);
        dayInput.value = day;

        select.innerHTML = "";
        byId("aircraft-deck").innerHTML = '<p class="admin-empty" role="status">' + escapeHtml(tr("api.admin.loading", "Loading...")) + "</p>";

        Promise.all([directory.load(), api.get("api/admin/flights?date=" + encodeURIComponent(day) + "&take=200")]).then(function (results) {
            state.airports = results[0];
            state.seatFlights = results[1].filter(function (flight) { return flight.status !== "Cancelled"; });
            select.innerHTML = state.seatFlights.map(function (flight) {
                return '<option value="' + flight.id + '">' + escapeHtml(flight.flightNumber + " · " + flight.originCity + " → " + flight.destinationCity) + "</option>";
            }).join("");
            loadSeatInventory();
        }).catch(function (error) {
            if (api && error instanceof api.ApiError && error.status === 403) {
                denyAccess();
                return;
            }
            byId("aircraft-deck").innerHTML = '<p class="admin-empty" role="alert">' + escapeHtml(apiMessage(error)) + "</p>";
        });
    }

    function toggleSeat(seatId) {
        var inventory = state.seatInventory;
        var seat = inventory && inventory.seats.filter(function (item) { return String(item.id) === String(seatId); })[0];
        if (!seat) return;

        if (seat.status !== "Available" && seat.status !== "Blocked") {
            showMessage(tr("api.admin.seatLocked", "A reserved or occupied seat cannot be changed."), true);
            return;
        }

        api.patch("api/admin/flights/" + inventory.flightId + "/seats/" + seat.id, { blocked: seat.status === "Available" }).then(function (updated) {
            seat.status = updated.status;
            renderSeatInventory();
        }).catch(function (error) {
            showMessage(apiMessage(error), true);
            loadSeatInventory();
        });
    }

    /* ------------------------------------------------------------------ bookings */

    function bookingQuery() {
        var params = ["take=100"];
        var pnr = byId("booking-pnr-search").value.trim();
        var passenger = byId("booking-passenger-search").value.trim();
        var status = byId("booking-status-filter").value;

        if (pnr) params.push("pnr=" + encodeURIComponent(pnr));
        if (passenger) params.push("passenger=" + encodeURIComponent(passenger));
        if (status) params.push("status=" + encodeURIComponent(status));
        return "api/admin/bookings?" + params.join("&");
    }

    function renderBookings() {
        var body = byId("bookings-body");

        if (!state.bookings.length) {
            body.innerHTML = '<tr><td colspan="10" class="admin-empty">' + escapeHtml(tr("admin.noBookings", "No bookings found.")) + "</td></tr>";
            return;
        }

        body.innerHTML = state.bookings.map(function (item) {
            var cancellable = item.status === "Confirmed" || item.status === "Pending";
            return "<tr>" +
                "<td>" + escapeHtml(item.pnr) + "</td>" +
                "<td>" + escapeHtml(item.leadPassenger + (item.passengerCount > 1 ? " +" + (item.passengerCount - 1) : "")) + "</td>" +
                "<td>" + escapeHtml(item.flightNumber) + "</td>" +
                "<td>" + escapeHtml(item.route) + "</td>" +
                "<td>" + escapeHtml(utcDay(item.departureAt)) + "</td>" +
                "<td>" + escapeHtml(item.cabinClass) + "</td>" +
                "<td>" + escapeHtml(item.seats.join(", ") || "—") + "</td>" +
                "<td>" + escapeHtml(formatMoney(item.totalAmount)) + "</td>" +
                "<td>" + statusBadge(item.status) + "</td>" +
                '<td><div class="admin-actions">' +
                '<button class="admin-btn admin-btn--ghost" type="button" data-view-booking="' + escapeHtml(item.pnr) + '">' + escapeHtml(tr("admin.viewDetails", "View Details")) + "</button>" +
                '<button class="admin-btn admin-btn--ghost" type="button" data-cancel-booking="' + escapeHtml(item.pnr) + '"' + (cancellable ? "" : " disabled") + ">" + escapeHtml(tr("admin.cancelBooking", "Cancel Booking")) + "</button>" +
                "</div></td></tr>";
        }).join("");
    }

    function loadBookings() {
        loading("bookings-body", 10);
        api.get(bookingQuery()).then(function (rows) {
            state.bookings = rows;
            renderBookings();
        }).catch(function (error) {
            failed(error, "bookings-body", 10, loadBookings);
        });
    }

    /* ------------------------------------------------------------------ passengers */

    function passengerQuery() {
        var params = [];
        var search = byId("passenger-search").value.trim();
        var status = byId("passenger-status-filter").value;

        if (search) params.push("search=" + encodeURIComponent(search));
        if (status) params.push("isActive=" + (status === "Active" ? "true" : "false"));
        return "api/admin/passengers" + (params.length ? "?" + params.join("&") : "");
    }

    function renderPassengers() {
        var body = byId("passengers-body");

        if (!state.passengers.length) {
            body.innerHTML = '<tr><td colspan="9" class="admin-empty">' + escapeHtml(tr("admin.noPassengers", "No passengers found.")) + "</td></tr>";
            return;
        }

        body.innerHTML = state.passengers.map(function (item, index) {
            return "<tr>" +
                "<td>" + escapeHtml(item.fullName) + "</td>" +
                "<td>" + escapeHtml(item.email) + "</td>" +
                "<td>" + escapeHtml(item.phone) + "</td>" +
                "<td>" + escapeHtml(item.nationalityCode) + "</td>" +
                "<td>" + escapeHtml(item.documentType) + "</td>" +
                "<td>" + escapeHtml(item.documentNumber) + "</td>" +
                "<td>" + item.trips + "</td>" +
                "<td>" + statusBadge(item.isActive ? "Active" : "Inactive") + "</td>" +
                '<td><div class="admin-actions">' +
                '<button class="admin-btn admin-btn--ghost" type="button" data-view-passenger="' + index + '">' + escapeHtml(tr("admin.viewDetails", "View Details")) + "</button>" +
                "</div></td></tr>";
        }).join("");
    }

    function loadPassengers() {
        loading("passengers-body", 9);
        api.get(passengerQuery()).then(function (rows) {
            state.passengers = rows;
            renderPassengers();
        }).catch(function (error) {
            failed(error, "passengers-body", 9, loadPassengers);
        });
    }

    /* ------------------------------------------------------------------ airports, promo codes, baggage, meals, cancellation rules */

    function activeBadge(isActive) {
        return statusBadge(isActive ? "Active" : "Inactive");
    }

    function rowButtons(kind, id) {
        return '<td><div class="admin-actions">' +
            '<button class="admin-btn admin-btn--ghost" type="button" data-edit-' + kind + '="' + id + '">' + escapeHtml(tr("admin.edit", "Edit")) + "</button>" +
            '<button class="admin-btn admin-btn--ghost" type="button" data-delete-' + kind + '="' + id + '">' + escapeHtml(tr("admin.delete", "Delete")) + "</button>" +
            "</div></td>";
    }

    function emptyRow(columns, text) {
        return '<tr><td colspan="' + columns + '" class="admin-empty">' + escapeHtml(text) + "</td></tr>";
    }

    function renderAirports() {
        var query = byId("airport-search").value.toLowerCase();
        var rows = state.adminAirports.filter(function (item) {
            return !query || [item.code, item.name, item.city].join(" ").toLowerCase().indexOf(query) !== -1;
        });

        byId("airports-body").innerHTML = rows.length ? rows.map(function (item) {
            return "<tr><td>" + escapeHtml(item.code) + "</td><td>" + escapeHtml(item.name) + "</td><td>" + escapeHtml(item.city) +
                "</td><td>" + escapeHtml(item.countryCode) + "</td><td>" + escapeHtml(item.timeZoneId) + "</td><td>" + activeBadge(item.isActive) + "</td>" +
                rowButtons("airport", item.id) + "</tr>";
        }).join("") : emptyRow(7, tr("api.admin.noAirports", "No airports found."));
    }

    function loadAirports() {
        loading("airports-body", 7);
        api.get("api/admin/airports").then(function (rows) {
            state.adminAirports = rows;
            renderAirports();
        }).catch(function (error) {
            failed(error, "airports-body", 7, loadAirports);
        });
    }

    function renderPromos() {
        var query = byId("promo-search").value.toLowerCase();
        var rows = state.promos.filter(function (item) {
            return !query || item.code.toLowerCase().indexOf(query) !== -1;
        });

        byId("promos-body").innerHTML = rows.length ? rows.map(function (item) {
            return "<tr><td>" + escapeHtml(item.code) + "</td><td>" + item.discountPercent + "%</td>" +
                "<td>" + escapeHtml(item.validFrom ? String(item.validFrom).slice(0, 16).replace("T", " ") + " UTC" : "\u2014") + "</td>" +
                "<td>" + escapeHtml(item.validTo ? String(item.validTo).slice(0, 16).replace("T", " ") + " UTC" : "\u2014") + "</td>" +
                "<td>" + item.usedCount + (item.maxUses != null ? " / " + item.maxUses : "") + "</td><td>" + activeBadge(item.isActive) + "</td>" +
                rowButtons("promo", item.id) + "</tr>";
        }).join("") : emptyRow(7, tr("api.admin.noPromos", "No promo codes found."));
    }

    function loadPromos() {
        loading("promos-body", 7);
        api.get("api/admin/promo-codes").then(function (rows) {
            state.promos = rows;
            renderPromos();
        }).catch(function (error) {
            failed(error, "promos-body", 7, loadPromos);
        });
    }

    function renderOptions() {
        byId("baggage-body").innerHTML = state.baggage.length ? state.baggage.map(function (item) {
            return "<tr><td>" + escapeHtml(item.code) + "</td><td>" + escapeHtml(item.name) + "</td><td>" + item.weightKg + " kg</td><td>" + escapeHtml(formatMoney(item.price)) +
                "</td><td>" + activeBadge(item.isActive) + "</td>" + rowButtons("baggage", item.id) + "</tr>";
        }).join("") : emptyRow(6, tr("api.admin.noBaggage", "No baggage options."));

        byId("meals-body").innerHTML = state.meals.length ? state.meals.map(function (item) {
            return "<tr><td>" + escapeHtml(item.code) + "</td><td>" + escapeHtml(item.name) + "</td><td>" + escapeHtml(item.description || "\u2014") + "</td><td>" + escapeHtml(formatMoney(item.price)) +
                "</td><td>" + activeBadge(item.isActive) + "</td>" + rowButtons("meal", item.id) + "</tr>";
        }).join("") : emptyRow(6, tr("api.admin.noMeals", "No meals."));
    }

    function loadOptions() {
        loading("baggage-body", 6);
        loading("meals-body", 6);
        Promise.all([api.get("api/admin/booking-options/baggage"), api.get("api/admin/booking-options/meals")]).then(function (results) {
            state.baggage = results[0];
            state.meals = results[1];
            renderOptions();
        }).catch(function (error) {
            failed(error, "baggage-body", 6, loadOptions);
            setTableStatus("meals-body", 6, "error", apiMessage(error), loadOptions);
        });
    }

    function renderRules() {
        byId("rules-body").innerHTML = state.rules.length ? state.rules.map(function (item) {
            var refundable = item.feePercent != null;
            return "<tr><td>" + escapeHtml(item.cabinClass) + "</td><td>\u2265 " + item.minDaysBeforeDeparture + " " + escapeHtml(tr("api.admin.daysUnit", "days")) + "</td><td>" +
                (refundable ? item.feePercent + "%" : "\u2014") + "</td><td>" + escapeHtml(refundable ? tr("api.admin.refundable", "Refund of the rest") : tr("api.admin.noRefund", "No refund")) + "</td>" +
                rowButtons("rule", item.id) + "</tr>";
        }).join("") : emptyRow(5, tr("api.admin.noRules", "No rules: every cancellation is without a refund."));
    }

    function loadRules() {
        loading("rules-body", 5);
        api.get("api/admin/cancellation-rules").then(function (rows) {
            state.rules = rows;
            renderRules();
        }).catch(function (error) {
            failed(error, "rules-body", 5, loadRules);
        });
    }

    /* ------------------------------------------------------------------ forms */

    function openModal() {
        byId("entity-modal").hidden = false;
    }

    function closeModal() {
        byId("entity-modal").hidden = true;
        state.formContext = null;
    }

    function openDetails(title, html) {
        byId("details-modal-title").textContent = title;
        byId("details-modal-body").innerHTML = html;
        byId("details-modal").hidden = false;
    }

    function closeDetails() {
        byId("details-modal").hidden = true;
    }

    function detailsGrid(pairs) {
        return '<div class="admin-form-grid">' + pairs.map(function (pair) {
            return '<div class="admin-field' + (pair.full ? " admin-field--full" : "") +
                '"><label>' + escapeHtml(pair.label) + "</label><p>" + pair.value + "</p></div>";
        }).join("") + "</div>";
    }

    /* A field is { key, label, type, options, full, required }. Select options are strings or { value, label }. */
    function buildFields(fields, values) {
        return fields.map(function (field) {
            var value = values && values[field.key] != null ? values[field.key] : "";
            var full = field.full ? " admin-field--full" : "";
            var control;

            if (field.type === "select") {
                control = '<select id="field-' + field.key + '">' + field.options.map(function (option) {
                    var optionValue = typeof option === "object" ? option.value : option;
                    var optionLabel = typeof option === "object" ? option.label : option;
                    return '<option value="' + escapeHtml(optionValue) + '"' + (String(optionValue) === String(value) ? " selected" : "") + ">" + escapeHtml(optionLabel) + "</option>";
                }).join("") + "</select>";
            } else if (field.type === "days") {
                var chosen = String(value).split(",").map(function (name) { return name.trim(); });
                control = '<div class="admin-days" id="field-' + field.key + '">' + DAY_NAMES.map(function (name) {
                    var on = chosen.indexOf(name) !== -1 || chosen.indexOf("Everyday") !== -1 || (chosen.indexOf("Weekdays") !== -1 && DAY_NAMES.indexOf(name) < 5);
                    return '<label class="admin-day"><input type="checkbox" value="' + name + '"' + (on ? " checked" : "") + "> " + escapeHtml(name.slice(0, 3)) + "</label>";
                }).join("") + "</div>";
            } else {
                control = '<input id="field-' + field.key + '" type="' + (field.type || "text") + '" value="' + escapeHtml(value) + '"' +
                    (field.type === "number" ? ' min="0" step="any"' : "") + (field.required === false ? "" : " required") + ">";
            }

            return '<div class="admin-field' + full + '"><label for="field-' + field.key + '">' + escapeHtml(field.label) + "</label>" + control + "</div>";
        }).join("");
    }

    function readFields(fields) {
        var data = {};
        fields.forEach(function (field) {
            var el = byId("field-" + field.key);
            if (field.type === "days") {
                data[field.key] = Array.prototype.slice.call(el.querySelectorAll("input:checked")).map(function (box) { return box.value; });
                return;
            }
            var value = el ? el.value : "";
            data[field.key] = field.type === "number" ? (value === "" ? null : Number(value)) : String(value).trim();
        });
        return data;
    }

    function openEntityForm(config, item) {
        state.formContext = { config: config, id: item ? item.id : null, item: item || null };
        byId("entity-modal-title").textContent = (item ? tr("admin.editPrefix", "Edit ") : tr("admin.addPrefix", "Add ")) + config.title;
        byId("entity-form-fields").innerHTML = buildFields(config.fields(), item ? config.toForm(item) : (config.defaults ? config.defaults() : {}));
        openModal();
    }

    function airportOptions() {
        return state.airports.map(function (airport) {
            return { value: airport.code, label: airport.code + " · " + airport.city };
        });
    }

    function aircraftOptions(allowNone) {
        var options = state.aircraft.map(function (item) {
            return { value: item.id, label: item.name + " (" + item.model + ")" };
        });
        return allowNone ? [{ value: "", label: tr("api.admin.none", "— none —") }].concat(options) : options;
    }

    function utcInput(value) {
        return value ? String(value).slice(0, 16) : "";
    }

    var FORMS = {
        flight: {
            title: tr("admin.flight", "Flight"),
            path: "api/admin/flights",
            fields: function () {
                return [
                    { key: "flightNumber", label: tr("admin.flightNumber", "Flight Number") },
                    { key: "aircraftId", label: tr("flightDetails.aircraft", "Aircraft"), type: "select", options: aircraftOptions(false) },
                    { key: "originCode", label: tr("common.origin", "Origin"), type: "select", options: airportOptions() },
                    { key: "destinationCode", label: tr("common.destination", "Destination"), type: "select", options: airportOptions() },
                    { key: "departureAt", label: tr("api.admin.departureUtc", "Departure (UTC)"), type: "datetime-local" },
                    { key: "arrivalAt", label: tr("api.admin.arrivalUtc", "Arrival (UTC)"), type: "datetime-local" },
                    { key: "status", label: tr("admin.status", "Status"), type: "select", options: FLIGHT_STATUSES.map(function (name) { return { value: name, label: statusText(name) }; }), full: true },
                    { key: "fareEconomy", label: tr("api.admin.fareEconomy", "Economy fare"), type: "number", required: false },
                    { key: "fareComfort", label: tr("api.admin.fareComfort", "Comfort fare"), type: "number", required: false },
                    { key: "fareBusiness", label: tr("api.admin.fareBusiness", "Business fare"), type: "number", required: false }
                ];
            },
            defaults: function () {
                return { status: "Scheduled", originCode: "GYD", destinationCode: "LHR" };
            },
            toForm: function (flight) {
                return {
                    flightNumber: flight.flightNumber,
                    aircraftId: flight.aircraftId,
                    originCode: flight.originCode,
                    destinationCode: flight.destinationCode,
                    departureAt: utcInput(flight.departureAt),
                    arrivalAt: utcInput(flight.arrivalAt),
                    status: flight.status,
                    fareEconomy: flight.fares.Economy,
                    fareComfort: flight.fares.Comfort,
                    fareBusiness: flight.fares.Business
                };
            },
            toRequest: function (data) {
                var fares = {};
                if (data.fareEconomy) fares.Economy = data.fareEconomy;
                if (data.fareComfort) fares.Comfort = data.fareComfort;
                if (data.fareBusiness) fares.Business = data.fareBusiness;
                return {
                    flightNumber: data.flightNumber,
                    originCode: data.originCode,
                    destinationCode: data.destinationCode,
                    aircraftId: Number(data.aircraftId),
                    departureAt: data.departureAt + ":00Z",
                    arrivalAt: data.arrivalAt + ":00Z",
                    status: data.status,
                    fares: fares
                };
            },
            reload: loadFlights
        },
        route: {
            title: tr("admin.route", "Route"),
            path: "api/admin/routes",
            fields: function () {
                return [
                    { key: "originCode", label: tr("common.origin", "Origin"), type: "select", options: airportOptions() },
                    { key: "destinationCode", label: tr("common.destination", "Destination"), type: "select", options: airportOptions() },
                    { key: "distanceKm", label: tr("api.admin.distanceKm", "Distance (km)"), type: "number" },
                    { key: "durationMinutes", label: tr("api.admin.durationMinutes", "Duration (minutes)"), type: "number" },
                    { key: "isActive", label: tr("admin.status", "Status"), type: "select", options: [{ value: "true", label: statusText("Active") }, { value: "false", label: statusText("Inactive") }], full: true }
                ];
            },
            defaults: function () {
                return { isActive: "true", originCode: "GYD", destinationCode: "LHR" };
            },
            toForm: function (route) {
                return { originCode: route.originCode, destinationCode: route.destinationCode, distanceKm: route.distanceKm, durationMinutes: route.durationMinutes, isActive: String(route.isActive) };
            },
            toRequest: function (data) {
                return { originCode: data.originCode, destinationCode: data.destinationCode, distanceKm: data.distanceKm, durationMinutes: data.durationMinutes, isActive: data.isActive === "true" };
            },
            reload: loadRoutes
        },
        schedule: {
            title: tr("api.admin.schedule", "Schedule"),
            path: "api/admin/schedules",
            fields: function () {
                return [
                    { key: "flightNumber", label: tr("admin.flightNumber", "Flight Number") },
                    { key: "routeId", label: tr("admin.route", "Route"), type: "select", options: state.routes.map(function (route) { return { value: route.id, label: route.code + " · " + route.originCity + " → " + route.destinationCity }; }) },
                    { key: "defaultAircraftId", label: tr("flightDetails.aircraft", "Aircraft"), type: "select", options: aircraftOptions(true) },
                    { key: "isActive", label: tr("admin.status", "Status"), type: "select", options: [{ value: "true", label: statusText("Active") }, { value: "false", label: statusText("Inactive") }] },
                    { key: "departureTime", label: tr("api.admin.departureLocal", "Departure (airport time)"), type: "time" },
                    { key: "arrivalTime", label: tr("api.admin.arrivalLocal", "Arrival (airport time)"), type: "time" },
                    { key: "arrivalDayOffset", label: tr("api.admin.dayOffset", "Lands days later (0 or 1)"), type: "number" },
                    { key: "validFrom", label: tr("api.admin.validFrom", "Valid from"), type: "date" },
                    { key: "validTo", label: tr("api.admin.validTo", "Valid until (optional)"), type: "date", required: false },
                    { key: "daysOfWeek", label: tr("api.admin.days", "Days of the week"), type: "days", full: true },
                    { key: "fareEconomy", label: tr("api.admin.fareEconomy", "Economy fare"), type: "number", required: false },
                    { key: "fareComfort", label: tr("api.admin.fareComfort", "Comfort fare"), type: "number", required: false },
                    { key: "fareBusiness", label: tr("api.admin.fareBusiness", "Business fare"), type: "number", required: false }
                ];
            },
            defaults: function () {
                return { isActive: "true", daysOfWeek: "Everyday", arrivalDayOffset: 0, validFrom: new Date().toISOString().slice(0, 10), routeId: state.routes[0] ? state.routes[0].id : "" };
            },
            toForm: function (schedule) {
                return {
                    flightNumber: schedule.flightNumber,
                    routeId: schedule.routeId,
                    defaultAircraftId: schedule.defaultAircraftId == null ? "" : schedule.defaultAircraftId,
                    isActive: String(schedule.isActive),
                    departureTime: String(schedule.departureTime).slice(0, 5),
                    arrivalTime: String(schedule.arrivalTime).slice(0, 5),
                    arrivalDayOffset: schedule.arrivalDayOffset,
                    validFrom: schedule.validFrom,
                    validTo: schedule.validTo || "",
                    daysOfWeek: schedule.daysOfWeek,
                    fareEconomy: schedule.fares.Economy,
                    fareComfort: schedule.fares.Comfort,
                    fareBusiness: schedule.fares.Business
                };
            },
            toRequest: function (data, original) {
                var fares = [];
                if (data.fareEconomy) fares.push({ cabinClass: "Economy", basePrice: data.fareEconomy });
                if (data.fareComfort) fares.push({ cabinClass: "Comfort", basePrice: data.fareComfort });
                if (data.fareBusiness) fares.push({ cabinClass: "Business", basePrice: data.fareBusiness });

                if (!data.daysOfWeek.length) {
                    throw new Error(tr("api.admin.pickDays", "Choose at least one day of the week."));
                }

                return {
                    flightNumber: data.flightNumber,
                    routeId: Number(data.routeId),
                    defaultAircraftId: data.defaultAircraftId === "" ? null : Number(data.defaultAircraftId),
                    departureTime: data.departureTime + ":00",
                    arrivalTime: data.arrivalTime + ":00",
                    arrivalDayOffset: data.arrivalDayOffset || 0,
                    daysOfWeek: data.daysOfWeek.length === 7 ? "Everyday" : data.daysOfWeek.join(", "),
                    validFrom: data.validFrom,
                    validTo: data.validTo || null,
                    isActive: data.isActive === "true",
                    fares: fares,
                    // Stops are not part of this form; an edit keeps the ones the schedule already has.
                    stops: original ? original.stops.map(function (stop) {
                        return { sequenceNo: stop.sequenceNo, airportCode: stop.airportCode, arrivalOffsetMinutes: stop.arrivalOffsetMinutes, layoverMinutes: stop.layoverMinutes };
                    }) : []
                };
            },
            reload: loadSchedules
        },
        aircraft: {
            title: tr("flightDetails.aircraft", "Aircraft"),
            path: "api/admin/aircraft",
            fields: function () {
                return [
                    { key: "name", label: tr("flightDetails.aircraft", "Aircraft") },
                    { key: "model", label: tr("api.admin.model", "Model") },
                    { key: "registrationNumber", label: tr("api.admin.registration", "Registration Number") },
                    { key: "status", label: tr("admin.status", "Status"), type: "select", options: ["Active", "Maintenance", "Inactive"].map(function (name) { return { value: name, label: statusText(name) }; }) },
                    { key: "businessSeats", label: tr("api.admin.businessSeats", "Business Seats"), type: "number" },
                    { key: "comfortSeats", label: tr("api.admin.comfortSeats", "Comfort Seats"), type: "number" },
                    { key: "economySeats", label: tr("api.admin.economySeats", "Economy Seats"), type: "number" }
                ];
            },
            defaults: function () {
                return { status: "Active", businessSeats: 0, comfortSeats: 0, economySeats: 0 };
            },
            toForm: function (item) {
                return { name: item.name, model: item.model, registrationNumber: item.registrationNumber, status: item.status, businessSeats: item.businessSeats, comfortSeats: item.comfortSeats, economySeats: item.economySeats };
            },
            toRequest: function (data) {
                return { name: data.name, model: data.model, registrationNumber: data.registrationNumber, status: data.status, businessSeats: data.businessSeats || 0, comfortSeats: data.comfortSeats || 0, economySeats: data.economySeats || 0 };
            },
            reload: loadAircraft
        },
        airport: {
            title: tr("api.admin.airport", "Airport"),
            path: "api/admin/airports",
            fields: function () {
                return [
                    { key: "code", label: tr("api.admin.codeIata", "Code (3 letters)") },
                    { key: "name", label: tr("api.admin.name", "Name") },
                    { key: "city", label: tr("api.admin.city", "City") },
                    { key: "countryCode", label: tr("api.admin.countryCode", "Country (2 letters)") },
                    { key: "timeZoneId", label: tr("api.admin.timeZoneId", "Time zone (e.g. Asia/Baku)"), full: true },
                    { key: "isActive", label: tr("admin.status", "Status"), type: "select", options: [{ value: "true", label: statusText("Active") }, { value: "false", label: statusText("Inactive") }], full: true }
                ];
            },
            defaults: function () { return { isActive: "true" }; },
            toForm: function (item) {
                return { code: item.code, name: item.name, city: item.city, countryCode: item.countryCode, timeZoneId: item.timeZoneId, isActive: String(item.isActive) };
            },
            toRequest: function (data) {
                return { code: data.code.toUpperCase(), name: data.name, city: data.city, countryCode: data.countryCode.toUpperCase(), timeZoneId: data.timeZoneId, isActive: data.isActive === "true" };
            },
            reload: loadAirports
        },
        promo: {
            title: tr("api.admin.promo", "Promo code"),
            path: "api/admin/promo-codes",
            fields: function () {
                return [
                    { key: "code", label: tr("api.admin.code", "Code") },
                    { key: "discountPercent", label: tr("api.admin.discountPercent", "Discount (%)"), type: "number" },
                    { key: "validFrom", label: tr("api.admin.validFromUtc", "Valid from (UTC, optional)"), type: "datetime-local", required: false },
                    { key: "validTo", label: tr("api.admin.validToUtc", "Valid until (UTC, optional)"), type: "datetime-local", required: false },
                    { key: "maxUses", label: tr("api.admin.maxUses", "Maximum uses (optional)"), type: "number", required: false },
                    { key: "isActive", label: tr("admin.status", "Status"), type: "select", options: [{ value: "true", label: statusText("Active") }, { value: "false", label: statusText("Inactive") }] }
                ];
            },
            defaults: function () { return { isActive: "true" }; },
            toForm: function (item) {
                return { code: item.code, discountPercent: item.discountPercent, validFrom: utcInput(item.validFrom), validTo: utcInput(item.validTo), maxUses: item.maxUses == null ? "" : item.maxUses, isActive: String(item.isActive) };
            },
            toRequest: function (data) {
                return {
                    code: data.code,
                    discountPercent: data.discountPercent,
                    validFrom: data.validFrom ? data.validFrom + ":00Z" : null,
                    validTo: data.validTo ? data.validTo + ":00Z" : null,
                    maxUses: data.maxUses,
                    isActive: data.isActive === "true"
                };
            },
            reload: loadPromos
        },
        baggage: {
            title: tr("api.admin.baggageOption", "Baggage option"),
            path: "api/admin/booking-options/baggage",
            fields: function () {
                return [
                    { key: "code", label: tr("api.admin.code", "Code") },
                    { key: "name", label: tr("api.admin.name", "Name") },
                    { key: "weightKg", label: tr("api.admin.weightKg", "Weight (kg)"), type: "number" },
                    { key: "price", label: tr("api.admin.price", "Price"), type: "number" },
                    { key: "isActive", label: tr("admin.status", "Status"), type: "select", options: [{ value: "true", label: statusText("Active") }, { value: "false", label: statusText("Inactive") }], full: true }
                ];
            },
            defaults: function () { return { isActive: "true" }; },
            toForm: function (item) { return { code: item.code, name: item.name, weightKg: item.weightKg, price: item.price, isActive: String(item.isActive) }; },
            toRequest: function (data) { return { code: data.code, name: data.name, weightKg: data.weightKg, price: data.price, isActive: data.isActive === "true" }; },
            reload: loadOptions
        },
        meal: {
            title: tr("api.admin.meal", "Meal"),
            path: "api/admin/booking-options/meals",
            fields: function () {
                return [
                    { key: "code", label: tr("api.admin.code", "Code") },
                    { key: "name", label: tr("api.admin.name", "Name") },
                    { key: "description", label: tr("api.admin.description", "Description"), full: true, required: false },
                    { key: "price", label: tr("api.admin.price", "Price"), type: "number" },
                    { key: "isActive", label: tr("admin.status", "Status"), type: "select", options: [{ value: "true", label: statusText("Active") }, { value: "false", label: statusText("Inactive") }] }
                ];
            },
            defaults: function () { return { isActive: "true" }; },
            toForm: function (item) { return { code: item.code, name: item.name, description: item.description || "", price: item.price, isActive: String(item.isActive) }; },
            toRequest: function (data) { return { code: data.code, name: data.name, description: data.description || null, price: data.price, isActive: data.isActive === "true" }; },
            reload: loadOptions
        },
        rule: {
            title: tr("api.admin.rule", "Rule"),
            path: "api/admin/cancellation-rules",
            fields: function () {
                return [
                    { key: "cabinClass", label: tr("admin.cabin", "Cabin"), type: "select", options: CABINS },
                    { key: "minDaysBeforeDeparture", label: tr("api.admin.minDays", "Cancelled at least (days before departure)"), type: "number" },
                    { key: "feePercent", label: tr("api.admin.feePercentHint", "Fee % of the amount paid (empty = no refund)"), type: "number", required: false, full: true }
                ];
            },
            defaults: function () { return { cabinClass: "Economy", minDaysBeforeDeparture: 7 }; },
            toForm: function (item) { return { cabinClass: item.cabinClass, minDaysBeforeDeparture: item.minDaysBeforeDeparture, feePercent: item.feePercent == null ? "" : item.feePercent }; },
            toRequest: function (data) { return { cabinClass: data.cabinClass, minDaysBeforeDeparture: data.minDaysBeforeDeparture, feePercent: data.feePercent }; },
            reload: loadRules
        }
    };

    function submitForm(event) {
        event.preventDefault();
        var context = state.formContext;
        if (!context) return;

        var config = context.config;
        var request;
        try {
            request = config.toRequest(readFields(config.fields()), context.item);
        } catch (error) {
            showMessage(error.message, true);
            return;
        }

        var button = byId("entity-form").querySelector("[type=submit]");
        if (button) button.disabled = true;

        var path = context.id ? config.path + "/" + context.id : config.path;
        (context.id ? api.put(path, request) : api.post(path, request)).then(function () {
            closeModal();
            showMessage(config.title + (context.id ? tr("api.admin.updated", " updated.") : tr("api.admin.added", " added.")));
            config.reload();
        }).catch(function (error) {
            showMessage(apiMessage(error), true);
        }).then(function () {
            if (button) button.disabled = false;
        });
    }

    function remove(config, id, label) {
        if (!window.confirm(tr("api.admin.confirmDelete", "Delete {name}? This cannot be undone.", { name: label }))) {
            return;
        }

        api.del(config.path + "/" + id).then(function () {
            showMessage(config.title + tr("api.admin.deleted", " deleted."));
            config.reload();
        }).catch(function (error) {
            showMessage(apiMessage(error), true);
        });
    }

    /* ------------------------------------------------------------------ sections */

    function showSection(sectionId) {
        var meta = getSectionMeta();
        var current = meta[sectionId] || meta.dashboard;
        state.section = meta[sectionId] ? sectionId : "dashboard";

        document.querySelectorAll("[data-section-panel]").forEach(function (panel) {
            var active = panel.getAttribute("data-section-panel") === state.section;
            panel.hidden = !active;
            panel.classList.toggle("is-active", active);
        });

        document.querySelectorAll("#admin-nav [data-section]").forEach(function (link) {
            link.classList.toggle("is-active", link.getAttribute("data-section") === state.section);
        });

        byId("admin-page-title").textContent = current.title;
        byId("admin-page-subtitle").textContent = current.subtitle;
        setSidebarOpen(false);

        var loaders = {
            dashboard: loadDashboard, flights: resetFlightsAndLoad, routes: loadRoutes, schedules: loadSchedules,
            aircraft: loadAircraft, seats: loadSeatFlights, bookings: loadBookings, passengers: loadPassengers,
            airports: loadAirports, promos: loadPromos, options: loadOptions, rules: loadRules
        };
        loaders[state.section]();
    }

    function repaint() {
        var painters = {
            dashboard: renderDashboard, flights: renderFlights, routes: renderRoutes, schedules: renderSchedules,
            aircraft: renderAircraft, seats: renderSeatInventory, bookings: renderBookings, passengers: renderPassengers,
            airports: renderAirports, promos: renderPromos, options: renderOptions, rules: renderRules
        };
        var meta = getSectionMeta()[state.section];
        byId("admin-page-title").textContent = meta.title;
        byId("admin-page-subtitle").textContent = meta.subtitle;
        painters[state.section]();
    }

    function setSidebarOpen(open) {
        var shell = byId("admin-shell");
        var toggle = byId("admin-menu-toggle");
        if (!shell || !toggle) return;
        shell.classList.toggle("is-sidebar-open", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }

    function find(list, id) {
        return list.filter(function (item) { return String(item.id) === String(id); })[0] || null;
    }

    /* ------------------------------------------------------------------ details windows */

    function showBookingDetails(pnr) {
        api.get("api/admin/bookings/" + encodeURIComponent(pnr)).then(function (booking) {
            var leg = booking.legs[0];
            var departure = atAirport(leg.departureAt, leg.originCode);
            openDetails(tr("api.admin.bookingDetails", "Booking Details"), detailsGrid([
                { label: "PNR", value: escapeHtml(booking.pnr) },
                { label: tr("admin.status", "Status"), value: statusBadge(booking.status) },
                { label: tr("api.admin.contact", "Contact"), value: escapeHtml(booking.contactEmail + " · " + booking.contactPhone), full: true },
                { label: tr("manage.flight", "Flight"), value: escapeHtml(leg.flightNumber) },
                { label: tr("manage.route", "Route"), value: escapeHtml(leg.originCity + " → " + leg.destinationCity) },
                { label: tr("manage.date", "Date"), value: escapeHtml(departure.date + " · " + departure.time) },
                { label: tr("admin.cabin", "Cabin"), value: escapeHtml(leg.cabinClass) },
                {
                    label: tr("booking.passengers", "Passengers"),
                    value: booking.passengers.map(function (passenger) {
                        var seat = passenger.tickets[0] && passenger.tickets[0].seat;
                        return escapeHtml([passenger.title, passenger.firstName, passenger.lastName].join(" ") + " · " + (seat || tr("api.admin.noSeat", "no seat")));
                    }).join("<br>"),
                    full: true
                },
                { label: tr("payment.grandTotal", "Total"), value: escapeHtml(formatMoney(booking.price.total)), full: true }
            ]));
        }).catch(function (error) {
            showMessage(apiMessage(error), true);
        });
    }

    function cancelBooking(pnr) {
        if (!window.confirm(tr("api.admin.confirmCancel", "Cancel booking {pnr}? The seats are released and a refund is requested where the fare rules allow it.", { pnr: pnr }))) {
            return;
        }

        api.post("api/admin/bookings/" + encodeURIComponent(pnr) + "/cancel", {}).then(function () {
            showMessage(tr("admin.bookingCancelledMsg", "Booking {pnr} cancelled.", { pnr: pnr }));
            loadBookings();
        }).catch(function (error) {
            showMessage(apiMessage(error), true);
        });
    }

    function showPassengerDetails(index) {
        var passenger = state.passengers[index];
        if (!passenger) return;

        api.get("api/admin/passengers/" + encodeURIComponent(passenger.documentType) + "/" + encodeURIComponent(passenger.documentNumber)).then(function (details) {
            var person = details.passenger;
            openDetails(tr("api.admin.passengerDetails", "Passenger Details"), detailsGrid([
                { label: tr("api.admin.passengerName", "Passenger Name"), value: escapeHtml(person.fullName) },
                { label: tr("admin.status", "Status"), value: statusBadge(person.isActive ? "Active" : "Inactive") },
                { label: "Email", value: escapeHtml(person.email) },
                { label: tr("api.admin.phone", "Phone"), value: escapeHtml(person.phone) },
                { label: tr("api.admin.nationality", "Nationality"), value: escapeHtml(person.nationalityCode) },
                { label: tr("api.admin.totalTrips", "Total Trips"), value: String(person.trips) },
                { label: tr("api.admin.documentType", "Document Type"), value: escapeHtml(person.documentType) },
                { label: tr("api.admin.documentNumber", "Document Number"), value: escapeHtml(person.documentNumber) },
                {
                    label: tr("admin.bookings", "Bookings"),
                    value: details.bookings.length ? details.bookings.map(function (booking) {
                        return escapeHtml(booking.pnr + " · " + statusText(booking.status) + " · " + formatMoney(booking.totalAmount));
                    }).join("<br>") : escapeHtml("—"),
                    full: true
                }
            ]));
        }).catch(function (error) {
            showMessage(apiMessage(error), true);
        });
    }

    function showAircraftDetails(id) {
        api.get("api/admin/aircraft/" + encodeURIComponent(id)).then(function (details) {
            var aircraft = details.aircraft;
            openDetails(tr("api.admin.aircraftDetails", "Aircraft Details"), detailsGrid([
                { label: tr("flightDetails.aircraft", "Aircraft"), value: escapeHtml(aircraft.name) },
                { label: tr("admin.status", "Status"), value: statusBadge(aircraft.status) },
                { label: tr("api.admin.model", "Model"), value: escapeHtml(aircraft.model) },
                { label: tr("api.admin.registration", "Registration Number"), value: escapeHtml(aircraft.registrationNumber) },
                { label: tr("api.admin.businessSeats", "Business Seats"), value: String(aircraft.businessSeats) },
                { label: tr("api.admin.comfortSeats", "Comfort Seats"), value: String(aircraft.comfortSeats) },
                { label: tr("api.admin.economySeats", "Economy Seats"), value: String(aircraft.economySeats) },
                { label: tr("api.admin.totalSeats", "Total Seats"), value: String(aircraft.totalSeats) }
            ]));
        }).catch(function (error) {
            showMessage(apiMessage(error), true);
        });
    }

    function generateFlights(id) {
        api.post("api/admin/schedules/" + encodeURIComponent(id) + "/generate", {}).then(function (result) {
            showMessage(tr("api.admin.generated", "{created} flights created, {existing} already existed, {skipped} skipped.", { created: result.created.length, existing: result.alreadyExisting, skipped: result.skipped.length }) + (result.skipped.length ? " " + result.skipped[0].reason : ""));
        }).catch(function (error) {
            showMessage(apiMessage(error), true);
        });
    }

    /* ------------------------------------------------------------------ wiring */

    function handleLogout() {
        if (window.AerovaAuth && typeof window.AerovaAuth.logout === "function") {
            window.AerovaAuth.logout();
        } else {
            api.session.clear();
            window.location.href = "login.html";
        }
    }

    function prepareFilters() {
        // The filter lists on the page carry no values; give them the ones the API understands.
        function assign(selectId, values) {
            var select = byId(selectId);
            if (!select) return;
            Array.prototype.forEach.call(select.options, function (option, index) {
                if (index < values.length) option.value = values[index];
            });
            while (select.options.length < values.length) {
                var extra = document.createElement("option");
                extra.value = values[select.options.length];
                extra.textContent = statusText(extra.value);
                select.appendChild(extra);
            }
            while (select.options.length > values.length) {
                select.remove(select.options.length - 1);
            }
        }

        assign("flight-status-filter", ["", "Scheduled", "OnTime", "Delayed", "Cancelled", "Completed"]);
        assign("booking-status-filter", ["", "Confirmed", "Pending", "Cancelled", "Completed", "Expired"]);
        assign("passenger-status-filter", ["", "Active", "Inactive"]);
        assign("schedule-status-filter", ["", "Active", "Inactive"]);
    }

    function bindUi() {
        prepareFilters();

        byId("admin-logout-btn").addEventListener("click", handleLogout);
        byId("admin-menu-toggle").addEventListener("click", function () {
            setSidebarOpen(!byId("admin-shell").classList.contains("is-sidebar-open"));
        });
        byId("admin-sidebar-backdrop").addEventListener("click", function () { setSidebarOpen(false); });
        byId("admin-nav").addEventListener("click", function (event) {
            var button = event.target.closest("[data-section]");
            if (button) showSection(button.getAttribute("data-section"));
        });

        var reloadFlights = debounce(resetFlightsAndLoad, 300);
        byId("flight-search").addEventListener("input", reloadFlights);
        byId("flight-status-filter").addEventListener("change", resetFlightsAndLoad);
        byId("flight-date-filter").addEventListener("change", resetFlightsAndLoad);
        byId("flights-prev").addEventListener("click", function () { state.flightPage = Math.max(0, state.flightPage - 1); loadFlights(); });
        byId("flights-next").addEventListener("click", function () { state.flightPage += 1; loadFlights(); });

        byId("route-search").addEventListener("input", renderRoutes);
        byId("schedule-date-filter").addEventListener("change", renderSchedules);
        byId("schedule-status-filter").addEventListener("change", renderSchedules);
        byId("aircraft-search").addEventListener("input", renderAircraft);

        var reloadBookings = debounce(loadBookings, 300);
        byId("booking-pnr-search").addEventListener("input", reloadBookings);
        byId("booking-passenger-search").addEventListener("input", reloadBookings);
        byId("booking-status-filter").addEventListener("change", loadBookings);

        var reloadPassengers = debounce(loadPassengers, 300);
        byId("passenger-search").addEventListener("input", reloadPassengers);
        byId("passenger-status-filter").addEventListener("change", loadPassengers);

        byId("seat-date-select").addEventListener("change", loadSeatFlights);
        byId("seat-flight-select").addEventListener("change", loadSeatInventory);
        byId("seat-cabin-select").addEventListener("change", renderSeatInventory);

        function addButton(id, form) {
            byId(id).addEventListener("click", function () {
                referenceData().then(function () { openEntityForm(FORMS[form], null); }).catch(function (error) { showMessage(apiMessage(error), true); });
            });
        }
        addButton("add-flight-btn", "flight");
        addButton("add-route-btn", "route");
        addButton("add-schedule-btn", "schedule");
        addButton("add-aircraft-btn", "aircraft");
        addButton("add-airport-btn", "airport");
        addButton("add-promo-btn", "promo");
        addButton("add-baggage-btn", "baggage");
        addButton("add-meal-btn", "meal");
        addButton("add-rule-btn", "rule");

        byId("airport-search").addEventListener("input", renderAirports);
        byId("promo-search").addEventListener("input", renderPromos);

        // One listener per table: Edit opens the form with the row, Delete asks first.
        [
            { bodyId: "airports-body", kind: "airport", list: "adminAirports", label: function (item) { return item.code; } },
            { bodyId: "promos-body", kind: "promo", list: "promos", label: function (item) { return item.code; } },
            { bodyId: "baggage-body", kind: "baggage", list: "baggage", label: function (item) { return item.name; } },
            { bodyId: "meals-body", kind: "meal", list: "meals", label: function (item) { return item.name; } },
            { bodyId: "rules-body", kind: "rule", list: "rules", label: function (item) { return item.cabinClass + " \u2265 " + item.minDaysBeforeDeparture; } }
        ].forEach(function (table) {
            byId(table.bodyId).addEventListener("click", function (event) {
                var editId = event.target.getAttribute("data-edit-" + table.kind);
                var deleteId = event.target.getAttribute("data-delete-" + table.kind);
                var item = find(state[table.list], editId || deleteId);
                if (editId && item) openEntityForm(FORMS[table.kind], item);
                if (deleteId && item) remove(FORMS[table.kind], deleteId, table.label(item));
            });
        });

        byId("flights-body").addEventListener("click", function (event) {
            var editId = event.target.getAttribute("data-edit-flight");
            var deleteId = event.target.getAttribute("data-delete-flight");
            var flight = find(state.flights, editId || deleteId);
            if (editId && flight) referenceData().then(function () { openEntityForm(FORMS.flight, flight); });
            if (deleteId && flight) remove(FORMS.flight, deleteId, flight.flightNumber);
        });

        byId("routes-body").addEventListener("click", function (event) {
            var editId = event.target.getAttribute("data-edit-route");
            var deleteId = event.target.getAttribute("data-delete-route");
            var route = find(state.routes, editId || deleteId);
            if (editId && route) openEntityForm(FORMS.route, route);
            if (deleteId && route) remove(FORMS.route, deleteId, route.code);
        });

        byId("schedules-body").addEventListener("click", function (event) {
            var editId = event.target.getAttribute("data-edit-schedule");
            var deleteId = event.target.getAttribute("data-delete-schedule");
            var generateId = event.target.getAttribute("data-generate-schedule");
            var schedule = find(state.schedules, editId || deleteId || generateId);
            if (editId && schedule) openEntityForm(FORMS.schedule, schedule);
            if (deleteId && schedule) remove(FORMS.schedule, deleteId, schedule.flightNumber);
            if (generateId && schedule) generateFlights(generateId);
        });

        byId("aircraft-body").addEventListener("click", function (event) {
            var viewId = event.target.getAttribute("data-view-aircraft");
            var editId = event.target.getAttribute("data-edit-aircraft");
            var deleteId = event.target.getAttribute("data-delete-aircraft");
            var aircraft = find(state.aircraft, viewId || editId || deleteId);
            if (viewId && aircraft) showAircraftDetails(viewId);
            if (editId && aircraft) openEntityForm(FORMS.aircraft, aircraft);
            if (deleteId && aircraft) remove(FORMS.aircraft, deleteId, aircraft.name);
        });

        byId("bookings-body").addEventListener("click", function (event) {
            var viewPnr = event.target.getAttribute("data-view-booking");
            var cancelPnr = event.target.getAttribute("data-cancel-booking");
            if (viewPnr) showBookingDetails(viewPnr);
            if (cancelPnr && !event.target.disabled) cancelBooking(cancelPnr);
        });

        byId("passengers-body").addEventListener("click", function (event) {
            var index = event.target.getAttribute("data-view-passenger");
            if (index != null) showPassengerDetails(Number(index));
        });

        byId("aircraft-deck").addEventListener("click", function (event) {
            var seatButton = event.target.closest("[data-seat-id]");
            if (seatButton) toggleSeat(seatButton.getAttribute("data-seat-id"));
        });

        byId("entity-form").addEventListener("submit", submitForm);
        document.querySelectorAll("[data-close-modal]").forEach(function (el) { el.addEventListener("click", closeModal); });
        document.querySelectorAll("[data-close-details]").forEach(function (el) { el.addEventListener("click", closeDetails); });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                setSidebarOpen(false);
                closeModal();
                closeDetails();
            }
        });

        window.addEventListener("resize", function () {
            if (window.innerWidth > 900) setSidebarOpen(false);
        });
    }

    function init() {
        if (!api || !api.session.isActive()) {
            window.location.replace("login.html?next=admin.html");
            return;
        }

        if (currentRole() !== "Admin") {
            denyAccess();
            return;
        }

        bindUi();
        showSection("dashboard");

        window.addEventListener("aerova:languagechange", function () {
            repaint();
            if (window.AEROVA_I18N && typeof window.AEROVA_I18N.applyTranslations === "function") {
                window.AEROVA_I18N.applyTranslations(document);
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
