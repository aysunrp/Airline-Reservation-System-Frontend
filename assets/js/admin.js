/*
 * AEROVA admin. Everything on this page comes from and goes to the backend (api/admin/*): an Admin or a SuperAdmin reaches most of it,
 * and the SuperAdmin alone the deletions, flight generation, cancellation rules, users and the audit log.
 * The stored role only decides what is offered here (and shows a clear message to a customer); the server decides what is allowed,
 * and the page stays hidden until the server has accepted the token.
 * Needs api-client.js, airports.js and auth.js.
 */
(function () {
    "use strict";

    var api = window.AEROVA_API;
    var auth = window.AerovaAuth;
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
            "Blocked": "common.blocked",
            "Processing": "cancellation.status.processing",
            "Failed": "cancellation.status.failed",
            "Not Eligible": "cancellation.status.notEligible"
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
            support: { title: tr("support.admin.title", "Support"), subtitle: tr("support.admin.sub", "Customer requests and replies") },
            refunds: { title: tr("cancellation.admin.nav", "Refunds"), subtitle: tr("cancellation.admin.sub", "Refunds of cancelled bookings and their Stripe status") },
            passengers: { title: tr("admin.passengers", "Passengers"), subtitle: tr("admin.passengersSub", "Traveler records and contact details") },
            airports: { title: tr("api.admin.airports", "Airports"), subtitle: tr("api.admin.airportsSub", "Where AEROVA flies and the time zone of each airport") },
            promos: { title: tr("api.admin.promos", "Promo Codes"), subtitle: tr("api.admin.promosSub", "Discount codes for the payment page") },
            options: { title: tr("api.admin.options", "Baggage & Meals"), subtitle: tr("api.admin.optionsSub", "Extras travellers can add to a booking") },
            rules: { title: tr("api.admin.rules", "Cancellation Rules"), subtitle: tr("api.admin.rulesSub", "Fees by cabin and days before departure") },
            users: { title: tr("api.admin.users", "Users"), subtitle: tr("api.admin.usersSub", "Accounts, roles and access") },
            audit: { title: tr("api.admin.audit", "Audit Log"), subtitle: tr("api.admin.auditSub", "Who did what, and when") }
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
        users: [],
        audit: [],
        refunds: [],
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
        else if (["delayed", "pending", "processing", "reserved", "held", "maintenance"].indexOf(lower) !== -1) tone = "warning";
        else if (["cancelled", "canceled", "blocked", "inactive", "occupied", "booked", "expired", "failed"].indexOf(lower) !== -1) tone = "danger";
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

        panel.hidden = false;
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
                // The row opens the booking: a click or Enter shows its details.
                var departs = String(item.departureAt || "");
                return '<tr class="admin-row-link" tabindex="0" data-open-booking="' + escapeHtml(item.pnr) + '" title="' +
                    escapeHtml(tr("admin.openBooking", "Open booking {pnr}", { pnr: item.pnr })) + '"><td>' + escapeHtml(item.pnr) + "</td><td>" + escapeHtml(item.leadPassenger) +
                    "</td><td>" + escapeHtml(item.flightNumber) + "</td><td>" + escapeHtml(item.route) +
                    "</td><td>" + escapeHtml(departs.slice(0, 10) + " · " + departs.slice(11, 16) + " UTC") +
                    "</td><td>" + escapeHtml(formatMoney(item.totalAmount)) + "</td><td>" + statusBadge(item.status) + "</td></tr>";
            }).join("")
            : '<tr><td colspan="7" class="admin-empty">' + escapeHtml(tr("admin.noBookings", "No bookings found.")) + "</td></tr>";

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

    /* The six numbers show a dash until the API has answered, so nothing made up is ever on screen. */
    function clearDashboardStats() {
        document.querySelectorAll(".admin-stat-value").forEach(function (value) {
            value.textContent = "—";
        });
    }

    function loadDashboard() {
        clearDashboardStats();
        loading("dashboard-bookings-body", 7);
        loading("dashboard-flights-body", 5);

        Promise.all([directory.load(), api.get("api/admin/dashboard")]).then(function (results) {
            state.airports = results[0];
            state.dashboard = results[1];
            renderDashboard();
        }).catch(function (error) {
            failed(error, "dashboard-bookings-body", 7, loadDashboard);
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
                    deleteButton("flight", item.id) +
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
                deleteButton("route", item.id) +
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
                generateButton(item.id) +
                '<button class="admin-btn admin-btn--ghost" type="button" data-edit-schedule="' + item.id + '">' + escapeHtml(tr("admin.edit", "Edit")) + "</button>" +
                deleteButton("schedule", item.id) +
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
                deleteButton("aircraft", item.id) +
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

    /* The map shows one difference only: a booked seat is occupied (grey), every other seat looks the same. Held and Blocked stay in the data and in the tooltip. */
    function seatState(status) {
        return status === "Booked" ? "occupied" : "open";
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
                        '" title="' + escapeHtml(seat.label + " · " + statusText(seat.status)) + '" aria-label="' + escapeHtml(seat.label + ", " + statusText(seat.status)) + '">' + letter + "</button>";
                });
                html += "</div>";
                if (groupIndex < groups.length - 1) html += '<span class="seat-aisle" aria-hidden="true"></span>';
            });
            html += "</div>";
        });

        deck.setAttribute("data-layout", cabinName.toLowerCase());
        deck.innerHTML = html;
    }

    var seatRequest = 0;

    /* A quiet reload (the timed refresh) keeps the map on screen and only repaints it when the server has answered. */
    function loadSeatInventory(quiet) {
        quiet = quiet === true;
        var select = byId("seat-flight-select");
        var flightId = select.value;
        var deck = byId("aircraft-deck");
        var request = ++seatRequest;

        if (!flightId) {
            state.seatInventory = null;
            renderSeatInventory();
            deck.innerHTML = '<p class="admin-empty">' + escapeHtml(tr("api.admin.noFlightsThatDay", "There are no flights on this day.")) + "</p>";
            return;
        }

        if (!quiet) {
            deck.innerHTML = '<p class="admin-empty" role="status">' + escapeHtml(tr("api.admin.loading", "Loading...")) + "</p>";
        }

        api.get("api/admin/flights/" + encodeURIComponent(flightId) + "/seats").then(function (inventory) {
            // An older answer never overwrites a newer one, and the answer for another flight is dropped.
            if (request !== seatRequest || select.value !== flightId) return;
            state.seatInventory = inventory;
            renderSeatInventory();
            paintSeatUpdated();
        }).catch(function (error) {
            if (api && error instanceof api.ApiError && error.status === 403) {
                denyAccess();
                return;
            }
            if (quiet) return; // the map shown stays, the next refresh tries again
            deck.innerHTML = '<p class="admin-empty" role="alert">' + escapeHtml(apiMessage(error)) + "</p>";
        });
    }

    function paintSeatUpdated() {
        var line = byId("seat-updated");
        if (!line) return;
        var now = new Date();
        var time = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0") + ":" + String(now.getSeconds()).padStart(2, "0");
        line.textContent = tr("api.admin.seatsUpdated", "Updated {time}. The map refreshes by itself.", { time: time });
    }

    var SEAT_REFRESH_MS = 10000;

    /* The map follows bookings, payments, cancellations and expiries without a page reload: it is read again every few seconds while it is open. */
    function startSeatRefresh() {
        function refresh() {
            if (state.section !== "seats" || document.hidden || !byId("seat-flight-select").value) return;
            loadSeatInventory(true);
        }
        window.setInterval(refresh, SEAT_REFRESH_MS);
        document.addEventListener("visibilitychange", function () { if (!document.hidden) refresh(); });
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
            // Blocked and open seats look the same, so the change is confirmed in words.
            showMessage(updated.status === "Blocked"
                ? tr("api.admin.seatBlockedMsg", "Seat {seat} is now blocked.", { seat: seat.label })
                : tr("api.admin.seatUnblockedMsg", "Seat {seat} is open again.", { seat: seat.label }));
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
        // An Admin can read the cancellation rules; changing them is for a SuperAdmin.
        if (kind === "rule" && !isSuperAdmin()) {
            return "<td></td>";
        }

        return '<td><div class="admin-actions">' +
            '<button class="admin-btn admin-btn--ghost" type="button" data-edit-' + kind + '="' + id + '">' + escapeHtml(tr("admin.edit", "Edit")) + "</button>" +
            deleteButton(kind, id) +
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
                promoButtons(item) + "</tr>";
        }).join("") : emptyRow(7, tr("api.admin.noPromos", "No promo codes found."));
    }

    /* The usual edit and delete buttons, and one more to preview and send the promotion by e-mail (never sent when a promo code is saved). */
    function promoButtons(item) {
        return rowButtons("promo", item.id).replace('<div class="admin-actions">',
            '<div class="admin-actions"><button class="admin-btn admin-btn--ghost" type="button" data-campaign-promo="' + item.id + '">' +
            escapeHtml(tr("api.admin.campaignButton", "Email campaign")) + "</button>");
    }

    var CAMPAIGN_PROBLEMS = {
        promo_inactive: "The promo code is not active.",
        promo_expired: "The promo code has expired.",
        promo_exhausted: "The promo code has no uses left.",
        no_subscribers: "There are no confirmed subscribers yet.",
        campaign_already_sent: "A campaign for this promo code was already created."
    };

    var CAMPAIGN_STATUS = { Queued: "Waiting to start", Sending: "Sending", Completed: "Completed", CompletedWithErrors: "Completed with errors" };

    function renderCampaigns() {
        var rows = state.campaigns || [];
        byId("campaigns-body").innerHTML = rows.length ? rows.map(function (item) {
            return "<tr><td>" + escapeHtml(item.code) + " (" + item.discountPercent + "%)</td>" +
                "<td>" + escapeHtml(tr("api.admin.campaignStatus" + item.status, CAMPAIGN_STATUS[item.status] || item.status)) + "</td>" +
                "<td>" + item.sent + " / " + item.totalRecipients + "</td><td>" + item.failed + "</td><td>" + item.skipped + "</td><td>" + item.pending + "</td>" +
                "<td>" + escapeHtml(String(item.createdAt || "").slice(0, 16).replace("T", " ") + " UTC") + "</td></tr>";
        }).join("") : emptyRow(7, tr("api.admin.noCampaigns", "No campaigns yet."));
    }

    function loadCampaigns() {
        api.get("api/admin/campaigns").then(function (rows) {
            state.campaigns = rows;
            renderCampaigns();
        }).catch(function (error) {
            byId("campaigns-body").innerHTML = emptyRow(7, campaignError(error));
        });
    }

    /* The reason the server names (the campaign tables are missing) is shown as it is; any other failure keeps the page's own wording. */
    function campaignError(error) {
        if (error && error.code === "campaign_setup_required") {
            return tr("api.admin.campaignSetupRequired", "E-mail campaigns are not set up yet: the latest database migration (AddEmailCampaignsAndAdminAlerts) has not been applied.");
        }

        return (error && error.userMessage) || tr("api.errors.generic", "Something went wrong. Please try again.");
    }

    /*
     * Preview and confirm: the page shows the e-mail the server built from the saved promotion (in a sandboxed frame, so nothing in it can run),
     * and sends back only the hash of that preview and the confirmation. The discount, code and dates are never sent by the page.
     */
    function openCampaign(id, language) {
        var lang = language || "en";
        byId("details-modal-title").textContent = tr("api.admin.campaignButton", "Email campaign");
        byId("details-modal-body").innerHTML = '<p class="admin-hint">' + escapeHtml(tr("api.search.loadingText", "Please wait...")) + "</p>";
        byId("details-modal").hidden = false;

        api.get("api/admin/promo-codes/" + id + "/campaign-preview?language=" + encodeURIComponent(lang)).then(function (preview) {
            var problems = (preview.problems || []).map(function (code) {
                return "<li>" + escapeHtml(tr("api.admin.campaignProblem_" + code, CAMPAIGN_PROBLEMS[code] || code)) + "</li>";
            }).join("");
            var options = ["en", "az", "ru"].map(function (code) {
                return '<option value="' + code + '"' + (code === preview.language ? " selected" : "") + ">" + code.toUpperCase() + "</option>";
            }).join("");

            byId("details-modal-body").innerHTML =
                '<p><strong>' + escapeHtml(preview.code) + "</strong> — " + preview.discountPercent + "%" +
                (preview.validTo ? " · " + escapeHtml(tr("api.admin.validUntil", "Valid until")) + " " + escapeHtml(String(preview.validTo).slice(0, 10)) : "") + "</p>" +
                "<p>" + escapeHtml(tr("api.admin.campaignRecipients", "Confirmed subscribers who will receive it:")) + " <strong>" + preview.recipientCount + "</strong></p>" +
                (problems ? '<ul class="admin-error">' + problems + "</ul>" : "") +
                '<label class="admin-field"><span>' + escapeHtml(tr("api.admin.campaignLanguage", "Preview language")) + '</span><select id="campaign-language" class="admin-input">' + options + "</select></label>" +
                "<p><strong>" + escapeHtml(preview.subject) + "</strong></p>" +
                '<iframe id="campaign-frame" class="admin-campaign-frame" sandbox="" style="width:100%;height:420px;border:1px solid #ddd;background:#fff"></iframe>' +
                '<label class="admin-check"><input type="checkbox" id="campaign-confirm"' + (preview.canSend ? "" : " disabled") + "> " +
                escapeHtml(tr("api.admin.campaignConfirm", "Send email campaign to subscribed customers")) + "</label>" +
                '<p class="admin-hint" id="campaign-result" role="status"></p>' +
                '<div class="admin-actions"><button type="button" class="admin-btn admin-btn--primary" id="campaign-send" disabled>' +
                escapeHtml(tr("api.admin.campaignSend", "Send campaign")) + "</button></div>";

            byId("campaign-frame").setAttribute("srcdoc", preview.html);
            byId("campaign-language").addEventListener("change", function () { openCampaign(id, this.value); });

            var box = byId("campaign-confirm");
            var button = byId("campaign-send");
            box.addEventListener("change", function () { button.disabled = !box.checked || !preview.canSend; });

            button.addEventListener("click", function () {
                button.disabled = true;
                byId("campaign-result").textContent = "";
                api.post("api/admin/promo-codes/" + id + "/campaign", { previewHash: preview.previewHash, confirm: true }).then(function () {
                    byId("campaign-result").textContent = tr("api.admin.campaignQueued", "The campaign was confirmed and is being sent in the background. Follow it in the Email campaigns table.");
                    box.disabled = true;
                    loadCampaigns();
                }, function (error) {
                    button.disabled = false;
                    byId("campaign-result").textContent = campaignError(error);
                });
            });
        }).catch(function (error) {
            byId("details-modal-body").innerHTML = '<p class="admin-error">' + escapeHtml(campaignError(error)) + "</p>";
        });
    }

    function loadPromos() {
        loading("promos-body", 7);
        loadCampaigns();
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
        state.openSupportId = null;
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
        admin: {
            title: tr("api.admin.adminAccount", "Admin account"),
            path: "api/admin/users",
            fields: function () {
                return [
                    { key: "firstName", label: tr("api.admin.fieldFirstName", "First name") },
                    { key: "lastName", label: tr("api.admin.fieldLastName", "Last name") },
                    { key: "email", label: tr("api.admin.colEmail", "Email"), type: "email", full: true },
                    { key: "password", label: tr("api.admin.fieldPassword", "Password (8+ characters, letters and digits)"), type: "password", full: true }
                ];
            },
            defaults: function () { return {}; },
            toForm: function () { return {}; },
            toRequest: function (data) { return { firstName: data.firstName, lastName: data.lastName, email: data.email, password: data.password }; },
            reload: loadUsers
        },
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

    var deleting = {};

    function remove(config, id, label) {
        var isPromo = config.path === "api/admin/promo-codes";
        confirmAction({
            title: tr("admin.delete", "Delete"),
            text: isPromo
                ? tr("api.admin.confirmDeletePromo", "Delete {name}? If bookings already used it, it will be deactivated and kept instead.", { name: label })
                : tr("api.admin.confirmDelete", "Delete {name}? This cannot be undone.", { name: label }),
            confirm: tr("admin.delete", "Delete"),
            danger: true
        }).then(function (confirmed) {
            if (!confirmed) return;

            // One request at a time: a second click on the same row while it runs does nothing.
            var key = config.path + "/" + id;
            if (deleting[key]) return;
            deleting[key] = true;

            api.del(key).then(function (result) {
                // Only now, with the server's answer, is anything said about the outcome.
                if (result && String(result.outcome).toLowerCase() === "deactivated") {
                    showMessage(tr("api.admin.promoDeactivated", "{name} has been used by bookings, so it was deactivated instead of deleted.", { name: label }));
                } else {
                    showMessage(config.title + tr("api.admin.deleted", " deleted."));
                }
                config.reload();
            }).catch(function (error) {
                showMessage(apiMessage(error), true);
            }).then(function () {
                delete deleting[key];
            });
        });
    }

    /* ------------------------------------------------------------------ sections */

    var SUPER_ADMIN_SECTIONS = { users: true, audit: true };

    function showSection(sectionId) {
        // The SuperAdmin sections are not offered to an Admin; asking for one anyway lands on the dashboard.
        if (SUPER_ADMIN_SECTIONS[sectionId] && !isSuperAdmin()) {
            sectionId = "dashboard";
        }

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
            airports: loadAirports, promos: loadPromos, options: loadOptions, rules: loadRules,
            users: loadUsers, audit: loadAudit, refunds: loadRefunds, support: loadSupport
        };
        loaders[state.section]();
    }

    function repaint() {
        var painters = {
            dashboard: renderDashboard, flights: renderFlights, routes: renderRoutes, schedules: renderSchedules,
            aircraft: renderAircraft, seats: renderSeatInventory, bookings: renderBookings, passengers: renderPassengers,
            airports: renderAirports, promos: renderPromos, options: renderOptions, rules: renderRules,
            users: renderUsers, audit: renderAudit, refunds: renderRefunds, support: renderSupport
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
        confirmAction({
            title: tr("admin.cancelBooking", "Cancel Booking"),
            text: tr("api.admin.confirmCancel", "Cancel booking {pnr}? The seats are released and a refund is requested where the fare rules allow it.", { pnr: pnr }),
            confirm: tr("admin.cancelBooking", "Cancel Booking"),
            danger: true
        }).then(function (confirmed) {
            if (!confirmed) return;

            api.post("api/admin/bookings/" + encodeURIComponent(pnr) + "/cancel", {}).then(function () {
                showMessage(tr("admin.bookingCancelledMsg", "Booking {pnr} cancelled.", { pnr: pnr }));
                loadBookings();
            }).catch(function (error) {
                showMessage(apiMessage(error), true);
            });
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

    /* ------------------------------------------------------------------ roles and the confirmation window */

    function isSuperAdmin() {
        return !!auth && auth.isSuperAdmin();
    }

    /* Deleting and creating flights from a schedule are for a SuperAdmin; an Admin is not shown them (the server refuses them too). */
    var TRASH_ICON = '<svg class="admin-btn-icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';

    function deleteButton(kind, id) {
        return isSuperAdmin()
            ? '<button class="admin-btn admin-btn--ghost admin-btn--danger-text" type="button" data-delete-' + kind + '="' + id + '">' + TRASH_ICON + escapeHtml(tr("admin.delete", "Delete")) + "</button>"
            : "";
    }

    function generateButton(id) {
        return isSuperAdmin()
            ? '<button class="admin-btn admin-btn--ghost" type="button" data-generate-schedule="' + id + '">' + escapeHtml(tr("api.admin.generate", "Create flights")) + "</button>"
            : "";
    }

    /* The account chip in the sidebar and the SuperAdmin-only controls. */
    function applyRole() {
        var user = auth && auth.getCurrentUser();
        var superAdmin = isSuperAdmin();

        document.querySelectorAll("[data-super-only]").forEach(function (element) {
            element.hidden = !superAdmin;
        });

        var chip = byId("admin-user");
        if (chip && user) {
            byId("admin-user-name").textContent = (String(user.firstName || "") + " " + String(user.lastName || "")).trim() || user.email || "";
            var badge = byId("admin-user-role");
            badge.textContent = roleLabel(user.role);
            badge.classList.toggle("admin-role-badge--super", user.role === "SuperAdmin");
            chip.hidden = false;
        }
    }

    function roleLabel(role) {
        var keys = { User: "api.admin.roleUser", Admin: "api.admin.roleAdmin", SuperAdmin: "api.admin.roleSuperAdmin" };
        return keys[role] ? tr(keys[role], role) : String(role || "");
    }

    var confirmResolve = null;

    /* Asks before something that cannot be taken back; resolves true or false. The safe answer (Cancel) has the focus. */
    function confirmAction(options) {
        return new Promise(function (resolve) {
            if (confirmResolve) closeConfirm(false);
            confirmResolve = resolve;

            byId("confirm-modal-title").textContent = options.title;
            byId("confirm-modal-text").textContent = options.text;
            var accept = byId("confirm-accept");
            accept.textContent = options.confirm || tr("api.admin.confirm", "Confirm");
            accept.classList.toggle("admin-btn--danger", !!options.danger);
            accept.classList.toggle("admin-btn--primary", !options.danger);
            byId("confirm-modal").hidden = false;
            byId("confirm-cancel").focus();
        });
    }

    function closeConfirm(answer) {
        byId("confirm-modal").hidden = true;
        if (confirmResolve) {
            var resolve = confirmResolve;
            confirmResolve = null;
            resolve(answer);
        }
    }

    /* ------------------------------------------------------------------ users (SuperAdmin) */

    function userQuery() {
        var params = ["take=200"];
        var search = byId("user-search").value.trim();
        var role = byId("user-role-filter").value;
        var active = byId("user-status-filter").value;

        if (search) params.push("search=" + encodeURIComponent(search));
        if (role) params.push("role=" + encodeURIComponent(role));
        if (active) params.push("isActive=" + encodeURIComponent(active));
        return "api/admin/users?" + params.join("&");
    }

    function roleBadge(role) {
        var tone = role === "SuperAdmin" ? "role-super" : (role === "Admin" ? "role-admin" : "neutral");
        return '<span class="admin-badge admin-badge--' + tone + '">' + escapeHtml(roleLabel(role)) + "</span>";
    }

    function userButton(action, id, label, danger) {
        return '<button class="admin-btn admin-btn--ghost' + (danger ? " admin-btn--danger-text" : "") + '" type="button" data-user-action="' + action + '" data-user-id="' + id + '">' + escapeHtml(label) + "</button>";
    }

    function renderUsers() {
        var body = byId("users-body");

        if (!state.users.length) {
            body.innerHTML = emptyRow(7, tr("api.admin.noUsers", "No accounts found."));
            return;
        }

        var me = auth && auth.getCurrentUser();
        body.innerHTML = state.users.map(function (item) {
            var self = !!me && me.id === item.id;
            var buttons = "";

            // A SuperAdmin's role is not changed here; nobody changes or removes their own account.
            if (item.role === "User") buttons += userButton("make-admin", item.id, tr("api.admin.makeAdmin", "Make Admin"));
            if (item.role === "Admin") buttons += userButton("remove-admin", item.id, tr("api.admin.removeAdmin", "Remove Admin"));
            if (!self) {
                buttons += userButton(item.isActive ? "deactivate" : "activate", item.id, item.isActive ? tr("api.admin.deactivate", "Deactivate") : tr("api.admin.activate", "Activate"), item.isActive);
                buttons += userButton("delete", item.id, tr("admin.delete", "Delete"), true);
            }

            return "<tr>" +
                "<td>" + escapeHtml(item.firstName + " " + item.lastName) + (self ? '<span class="admin-you">' + escapeHtml(tr("api.admin.you", "(you)")) + "</span>" : "") + "</td>" +
                '<td class="admin-cell-wrap">' + escapeHtml(item.email) + "</td>" +
                "<td>" + roleBadge(item.role) + "</td>" +
                "<td>" + activeBadge(item.isActive) + "</td>" +
                "<td>" + escapeHtml(item.emailVerified ? tr("api.admin.yes", "Yes") : tr("api.admin.no", "No")) + "</td>" +
                "<td>" + escapeHtml(utcDay(item.createdAt)) + "</td>" +
                '<td><div class="admin-actions">' + buttons + "</div></td></tr>";
        }).join("");
    }

    function loadUsers() {
        loading("users-body", 7);
        api.get(userQuery()).then(function (rows) {
            state.users = rows;
            renderUsers();
        }).catch(function (error) {
            failed(error, "users-body", 7, loadUsers);
        });
    }

    function userAction(action, user) {
        var name = user.firstName + " " + user.lastName;
        var plans = {
            "make-admin": { text: "api.admin.confirmMakeAdmin", fallback: "Give {name} the Admin role? They will be able to use the admin area.", label: tr("api.admin.makeAdmin", "Make Admin"), done: "api.admin.roleChangedMsg", run: function () { return api.put("api/admin/users/" + user.id + "/role", { role: "Admin" }); } },
            "remove-admin": { text: "api.admin.confirmRemoveAdmin", fallback: "Take the Admin role away from {name}? Their open sessions stop working at once.", label: tr("api.admin.removeAdmin", "Remove Admin"), done: "api.admin.roleChangedMsg", danger: true, run: function () { return api.put("api/admin/users/" + user.id + "/role", { role: "User" }); } },
            "deactivate": { text: "api.admin.confirmDeactivate", fallback: "Deactivate {name}? They cannot sign in and their open sessions stop at once.", label: tr("api.admin.deactivate", "Deactivate"), done: "api.admin.userUpdatedMsg", danger: true, run: function () { return api.put("api/admin/users/" + user.id + "/active", { isActive: false }); } },
            "activate": { text: "api.admin.confirmActivate", fallback: "Activate {name} again?", label: tr("api.admin.activate", "Activate"), done: "api.admin.userUpdatedMsg", run: function () { return api.put("api/admin/users/" + user.id + "/active", { isActive: true }); } },
            "delete": { text: "api.admin.confirmDeleteUser", fallback: "Delete the account of {name}? This cannot be undone. An account with bookings cannot be deleted; deactivate it instead.", label: tr("admin.delete", "Delete"), done: "api.admin.userDeletedMsg", danger: true, run: function () { return api.del("api/admin/users/" + user.id); } }
        };
        var plan = plans[action];
        if (!plan) return;

        confirmAction({
            title: plan.label,
            text: tr(plan.text, plan.fallback, { name: name }),
            confirm: plan.label,
            danger: !!plan.danger
        }).then(function (confirmed) {
            if (!confirmed) return;

            plan.run().then(function () {
                showMessage(tr(plan.done, "Done."));
                loadUsers();
            }).catch(function (error) {
                showMessage(apiMessage(error), true);
            });
        });
    }

    /* ------------------------------------------------------------------ refunds */

    function refundWhen(value) {
        return String(value || "").replace("T", " ").slice(0, 19) || "\u2014";
    }

    function renderRefunds() {
        var body = byId("refunds-body");

        if (!state.refunds.length) {
            body.innerHTML = emptyRow(9, tr("cancellation.admin.empty", "No refunds yet."));
            return;
        }

        // Only a SuperAdmin sends money again, and only a refund that Stripe refused or cancelled; the server enforces both.
        var canRetry = isSuperAdmin();

        body.innerHTML = state.refunds.map(function (item) {
            var retryable = canRetry && (item.status === "Failed" || item.status === "Cancelled");
            var why = [item.reason, item.failureReason].filter(Boolean).join(" \u00b7 ");

            return "<tr>" +
                "<td>" + escapeHtml(item.pnr) + "</td>" +
                "<td>" + escapeHtml(formatMoney(item.amount)) + "</td>" +
                "<td>" + statusBadge(item.status) + "</td>" +
                '<td class="admin-cell-wrap">' + escapeHtml(item.providerReference || "\u2014") + "</td>" +
                '<td class="admin-cell-wrap">' + escapeHtml(why || "\u2014") + "</td>" +
                "<td>" + escapeHtml(item.initiatedBy) + "</td>" +
                "<td>" + escapeHtml(refundWhen(item.createdAt)) + "</td>" +
                "<td>" + escapeHtml(refundWhen(item.updatedAt || item.processedAt)) + "</td>" +
                '<td><div class="admin-actions">' +
                (retryable ? '<button class="admin-btn admin-btn--ghost" type="button" data-retry-refund="' + escapeHtml(String(item.id)) + '">' + escapeHtml(tr("cancellation.admin.retry", "Send again")) + "</button>" : "") +
                "</div></td></tr>";
        }).join("");
    }

    function loadRefunds() {
        loading("refunds-body", 9);
        var status = byId("refund-status-filter").value;
        api.get("api/admin/refunds?take=200" + (status ? "&status=" + encodeURIComponent(status) : "")).then(function (rows) {
            state.refunds = rows;
            renderRefunds();
        }).catch(function (error) {
            failed(error, "refunds-body", 9, loadRefunds);
        });
    }

    /* ------------------------------------------------------------------ support requests (GET api/admin/support/tickets) */

    var SUPPORT_STATUSES = ["Open", "InProgress", "WaitingForCustomer", "Resolved"];

    function supportDate(value) {
        return escapeHtml(String(value || "").slice(0, 16).replace("T", " ") + " UTC");
    }

    function supportStatusText(value) {
        return tr("support.status." + value, value);
    }

    function renderSupport() {
        var page = state.supportPage || { items: [], total: 0, page: 1, pageSize: 20 };
        byId("support-body").innerHTML = page.items.length ? page.items.map(function (item) {
            return "<tr><td>" + escapeHtml(item.ticketNumber) + "</td><td>" + escapeHtml(item.customerName) + "<br><small>" + escapeHtml(item.customerEmail) + "</small></td>" +
                "<td>" + escapeHtml(item.subject) + (item.bookingPnr ? "<br><small>" + escapeHtml(item.bookingPnr) + "</small>" : "") + "</td>" +
                "<td>" + escapeHtml(tr("support.categories." + item.category, item.category)) + "</td>" +
                "<td>" + statusBadge(supportStatusText(item.status)) + "</td><td>" + supportDate(item.createdAt) + "</td><td>" + supportDate(item.updatedAt) + "</td>" +
                '<td><div class="admin-actions"><button class="admin-btn admin-btn--ghost" type="button" data-support-open="' + item.id + '">' + escapeHtml(tr("support.admin.open", "Open")) + "</button></div></td></tr>";
        }).join("") : emptyRow(8, tr("support.admin.empty", "No support requests found."));

        var pages = Math.max(1, Math.ceil(page.total / page.pageSize));
        byId("support-pager").innerHTML = page.total > page.pageSize
            ? '<button class="admin-btn admin-btn--ghost" type="button" data-support-page="' + (page.page - 1) + '"' + (page.page <= 1 ? " disabled" : "") + ">" + escapeHtml(tr("support.admin.prev", "Previous")) + "</button>" +
              "<span>" + escapeHtml(tr("support.admin.page", "Page {page} of {pages} ({total})", { page: page.page, pages: pages, total: page.total })) + "</span>" +
              '<button class="admin-btn admin-btn--ghost" type="button" data-support-page="' + (page.page + 1) + '"' + (page.page >= pages ? " disabled" : "") + ">" + escapeHtml(tr("support.admin.next", "Next")) + "</button>"
            : "";
    }

    function loadSupport(pageNumber, quiet) {
        var pageIndex = typeof pageNumber === "number" ? pageNumber : 1;
        if (!quiet) loading("support-body", 8);
        var query = "page=" + pageIndex + "&pageSize=20";
        var search = byId("support-search").value.trim();
        var status = byId("support-status-filter").value;
        var category = byId("support-category-filter").value;
        if (search) query += "&search=" + encodeURIComponent(search);
        if (status) query += "&status=" + encodeURIComponent(status);
        if (category) query += "&category=" + encodeURIComponent(category);
        api.get("api/admin/support/tickets?" + query).then(function (result) {
            state.supportPage = result;
            renderSupport();
        }).catch(function (error) {
            if (quiet) return;
            if (error && error.code === "database_setup_required") {
                byId("support-body").innerHTML = emptyRow(8, supportError(error));
                return;
            }

            failed(error, "support-body", 8, loadSupport);
        });
    }

    function openSupportTicket(id, keepDraft) {
        // A refresh while the admin is typing keeps the draft and the chosen status.
        var draft = keepDraft && byId("support-reply-text") ? { text: byId("support-reply-text").value, after: byId("support-after-reply").value } : null;
        state.openSupportId = id;
        byId("details-modal-title").textContent = tr("support.admin.title", "Support");
        if (!keepDraft) {
            byId("details-modal-body").innerHTML = '<p class="admin-hint">' + escapeHtml(tr("api.search.loadingText", "Please wait...")) + "</p>";
        }
        byId("details-modal").hidden = false;

        api.get("api/admin/support/tickets/" + id).then(function (ticket) {
            var thread = ticket.messages.map(function (message) {
                var staff = message.authorType === "Staff";
                return '<div style="margin:.5rem 0;padding:.6rem .8rem;border-radius:10px;background:' + (staff ? "#07111d" : "#f1ece0") + ";color:" + (staff ? "#f6f1e7" : "#1c150c") + '">' +
                    "<small><strong>" + escapeHtml(staff ? tr("support.admin.staff", "AEROVA Support") : message.authorName) + "</strong> \u00b7 " + supportDate(message.createdAt) + "</small>" +
                    '<div style="white-space:pre-wrap;word-break:break-word">' + escapeHtml(message.body) + "</div></div>";
            }).join("");
            var statusOptions = SUPPORT_STATUSES.map(function (value) {
                return '<option value="' + value + '"' + (value === ticket.status ? " selected" : "") + ">" + escapeHtml(supportStatusText(value)) + "</option>";
            }).join("");
            var afterOptions = '<option value="">' + escapeHtml(tr("support.admin.keepWaiting", "Waiting for the customer")) + "</option>" + SUPPORT_STATUSES.map(function (value) {
                return '<option value="' + value + '">' + escapeHtml(supportStatusText(value)) + "</option>";
            }).join("");

            byId("details-modal-body").innerHTML =
                "<p><strong>" + escapeHtml(ticket.ticketNumber) + "</strong> \u2014 " + escapeHtml(ticket.subject) + "</p>" +
                "<p>" + escapeHtml(tr("support.admin.customer", "Customer")) + ": " + escapeHtml(ticket.customerName) + " (" + escapeHtml(ticket.customerEmail) + ")" +
                (ticket.bookingPnr ? " \u00b7 " + escapeHtml(tr("support.admin.booking", "Booking")) + ": " + escapeHtml(ticket.bookingPnr) : "") + "</p>" +
                "<p>" + escapeHtml(tr("support.categories." + ticket.category, ticket.category)) + " \u00b7 " + escapeHtml(tr("support.admin.colCreated", "Created")) + ": " + supportDate(ticket.createdAt) +
                " \u00b7 " + escapeHtml(tr("support.admin.colUpdated", "Last update")) + ": " + supportDate(ticket.updatedAt) + "</p>" +
                '<div id="support-thread">' + thread + "</div>" +
                '<label class="admin-field"><span>' + escapeHtml(tr("support.admin.statusLabel", "Status")) + '</span><select id="support-status-select" class="admin-input">' + statusOptions + "</select></label>" +
                '<div class="admin-actions"><button type="button" class="admin-btn admin-btn--ghost" id="support-status-save">' + escapeHtml(tr("support.admin.saveStatus", "Save status")) + "</button></div>" +
                '<label class="admin-field"><span>' + escapeHtml(tr("support.admin.reply", "Reply to the customer")) + '</span><textarea id="support-reply-text" class="admin-input" rows="4" maxlength="4000" placeholder="' + escapeHtml(tr("support.admin.replyPlaceholder", "Write the reply (the customer is told by e-mail)...")) + '"></textarea></label>' +
                '<label class="admin-field"><span>' + escapeHtml(tr("support.admin.afterReply", "Status after the reply")) + '</span><select id="support-after-reply" class="admin-input">' + afterOptions + "</select></label>" +
                '<p class="admin-hint" id="support-result" role="status"></p>' +
                '<div class="admin-actions"><button type="button" class="admin-btn admin-btn--primary" id="support-reply-send">' + escapeHtml(tr("support.admin.send", "Send reply")) + "</button></div>";

            if (draft) {
                byId("support-reply-text").value = draft.text;
                byId("support-after-reply").value = draft.after;
            }

            byId("support-status-save").addEventListener("click", function () {
                api.put("api/admin/support/tickets/" + id + "/status", { status: byId("support-status-select").value }).then(function () {
                    byId("support-result").textContent = tr("support.admin.statusSaved", "The status was saved.");
                    loadSupport(state.supportPage ? state.supportPage.page : 1);
                }, function (error) {
                    byId("support-result").textContent = supportError(error);
                });
            });

            byId("support-reply-send").addEventListener("click", function () {
                var text = byId("support-reply-text").value.trim();
                var button = byId("support-reply-send");
                if (!text || button.disabled) return;
                button.disabled = true;
                var after = byId("support-after-reply").value;
                api.post("api/admin/support/tickets/" + id + "/replies", { message: text, status: after || null }).then(function () {
                    loadSupport(state.supportPage ? state.supportPage.page : 1);
                    openSupportTicket(id);
                }, function (error) {
                    button.disabled = false;
                    byId("support-result").textContent = supportError(error);
                });
            });
        }).catch(function (error) {
            byId("details-modal-body").innerHTML = '<p class="admin-error">' + escapeHtml(supportError(error)) + "</p>";
        });
    }

    /* ---------- support bell and real-time updates ---------- */

    var adminLive = null;
    var bellItems = [];
    var adminToastTimer = null;

    function renderBell() {
        var unread = bellItems.filter(function (item) { return !item.isRead; }).length;
        var badge = byId("admin-bell-count");
        badge.textContent = unread > 99 ? "99+" : String(unread);
        badge.hidden = unread === 0;
        byId("admin-bell").setAttribute("aria-label", tr("support.admin.bellTitle", "Support notifications") + (unread ? " (" + unread + ")" : ""));
        byId("admin-bell-list").innerHTML = bellItems.length ? bellItems.slice(0, 20).map(function (item) {
            return '<li><button type="button" class="admin-bell-item' + (item.isRead ? "" : " is-unread") + '" data-bell="' + item.id + '">' +
                "<strong>" + escapeHtml(item.title) + "</strong><small>" + escapeHtml(item.message) + " \u00b7 " + supportDate(item.createdAt) + "</small></button></li>";
        }).join("") : '<li class="admin-bell-empty">' + escapeHtml(tr("support.admin.bellEmpty", "No support notifications yet.")) + "</li>";
    }

    /* The persisted staff notifications (GET api/notifications): they are still there after a refresh or a new visit. */
    function loadBell() {
        return api.get("api/notifications").then(function (list) {
            bellItems = list.filter(function (item) { return item.type === "SupportStaff"; });
            renderBell();
        }).catch(function () { /* the bell is a convenience */ });
    }

    function adminToast(text, ticketNumber) {
        byId("admin-toast-text").textContent = text;
        byId("admin-toast-open").setAttribute("data-number", ticketNumber);
        byId("admin-toast").hidden = false;
        if (adminToastTimer) clearTimeout(adminToastTimer);
        adminToastTimer = setTimeout(function () { byId("admin-toast").hidden = true; }, 9000);
    }

    function openTicketByNumber(number) {
        api.get("api/admin/support/tickets?pageSize=1&search=" + encodeURIComponent(number)).then(function (page) {
            if (page.items.length) {
                showSection("support");
                openSupportTicket(page.items[0].id);
            }
        }).catch(function () { /* the list is still there */ });
    }

    function refreshSupportViews(supportEvent) {
        if (state.section === "support") loadSupport(state.supportPage ? state.supportPage.page : 1, true);
        if (state.openSupportId && !byId("details-modal").hidden && (!supportEvent || supportEvent.ticketId === state.openSupportId)) {
            openSupportTicket(state.openSupportId, true);
        }
    }

    function onSupportEvent(supportEvent) {
        if (supportEvent.type === "ticketCreated" || supportEvent.type === "customerReplied") {
            loadBell();
            adminToast(supportEvent.type === "ticketCreated"
                ? tr("support.admin.toastNew", "New support request {number}", { number: supportEvent.ticketNumber })
                : tr("support.admin.toastReply", "Customer reply on {number}", { number: supportEvent.ticketNumber }), supportEvent.ticketNumber);
        }
        refreshSupportViews(supportEvent);
    }

    function paintAdminLive(liveState) {
        var texts = {
            connected: tr("support.live.adminOn", "Live updates are on."),
            reconnecting: tr("support.live.reconnecting", "Reconnecting..."),
            polling: tr("support.live.adminPolling", "No live connection: checking every 20 seconds.")
        };
        byId("admin-live").textContent = texts[liveState] || "";
    }

    function startSupportRealtime() {
        loadBell();
        byId("admin-bell").addEventListener("click", function () {
            var panel = byId("admin-bell-panel");
            panel.hidden = !panel.hidden;
            byId("admin-bell").setAttribute("aria-expanded", panel.hidden ? "false" : "true");
            if (!panel.hidden) loadBell();
        });
        document.addEventListener("click", function (event) {
            if (!event.target.closest(".admin-bell-wrap")) {
                byId("admin-bell-panel").hidden = true;
                byId("admin-bell").setAttribute("aria-expanded", "false");
            }
        });
        byId("admin-bell-list").addEventListener("click", function (event) {
            var button = event.target.closest("[data-bell]");
            if (!button) return;
            var item = bellItems.filter(function (entry) { return String(entry.id) === button.getAttribute("data-bell"); })[0];
            if (!item) return;
            byId("admin-bell-panel").hidden = true;
            var match = /SUP-[A-Z0-9]{6}/.exec(item.title);
            if (!item.isRead) {
                item.isRead = true;
                renderBell();
                api.patch("api/notifications/" + item.id + "/read").catch(function () { /* shown again on the next load */ });
            }
            if (match) openTicketByNumber(match[0]);
        });
        byId("admin-bell-readall").addEventListener("click", function () {
            api.patch("api/notifications/read-all").then(loadBell, function () { /* unchanged */ });
        });
        byId("admin-toast-close").addEventListener("click", function () { byId("admin-toast").hidden = true; });
        byId("admin-toast-open").addEventListener("click", function () {
            byId("admin-toast").hidden = true;
            var number = byId("admin-toast-open").getAttribute("data-number");
            if (number) openTicketByNumber(number);
        });

        if (window.AEROVA_REALTIME) {
            adminLive = window.AEROVA_REALTIME.create({
                onEvent: onSupportEvent,
                onState: paintAdminLive,
                poll: function () { loadBell(); refreshSupportViews(null); },
                onResync: function () { loadBell(); refreshSupportViews(null); },
                pollMs: 20000
            });
            adminLive.start();
        }
    }

    function supportError(error) {
        if (error && error.code === "database_setup_required") {
            return tr("support.admin.setupRequired", "Support requests are not set up yet: the latest database migration (AddSupportTickets) has not been applied.");
        }

        return (error && error.userMessage) || tr("support.admin.failed", "Something went wrong. Please try again.");
    }

    function retryRefund(id) {
        var item = find(state.refunds, id);
        if (!item) return;

        confirmAction({
            title: tr("cancellation.admin.retryTitle", "Send the refund again"),
            text: tr("cancellation.admin.retryText", "Ask Stripe again to refund {amount} for booking {pnr}? The amount stays what the cancellation worked out.", { pnr: item.pnr, amount: formatMoney(item.amount) }),
            confirm: tr("cancellation.admin.retry", "Send again"),
            danger: true
        }).then(function (confirmed) {
            if (!confirmed) return;

            api.post("api/admin/refunds/" + encodeURIComponent(item.id) + "/retry", {}).then(function () {
                showMessage(tr("cancellation.admin.retried", "The refund of booking {pnr} was sent again.", { pnr: item.pnr }));
                loadRefunds();
            }).catch(function (error) {
                showMessage(apiMessage(error), true);
                loadRefunds();
            });
        });
    }

    /* ------------------------------------------------------------------ audit log (SuperAdmin) */

    var AUDIT_ACTIONS = ["UserCreated", "UserRoleChanged", "UserDeactivated", "UserActivated", "UserDeleted", "FlightCreated", "FlightUpdated",
        "FlightDeleted", "SeatChanged", "ScheduleCreated", "ScheduleUpdated", "ScheduleDeleted", "FlightsGenerated", "BookingCancelledByAdmin", "RefundRetried",
        "AccessDenied", "SuperAdminBootstrapped"];

    function auditActionLabel(action) {
        return tr("api.admin.act." + action, action);
    }

    function paintAuditFilter() {
        var select = byId("audit-action-filter");
        var chosen = select.value;
        select.innerHTML = '<option value="">' + escapeHtml(tr("api.admin.allActions", "All actions")) + "</option>" + AUDIT_ACTIONS.map(function (action) {
            return '<option value="' + action + '">' + escapeHtml(auditActionLabel(action)) + "</option>";
        }).join("");
        select.value = chosen;
    }

    function renderAudit() {
        var body = byId("audit-body");

        if (!state.audit.length) {
            body.innerHTML = emptyRow(5, tr("api.admin.noAudit", "No entries yet."));
            return;
        }

        body.innerHTML = state.audit.map(function (item) {
            var who = item.actorUserId != null
                ? "#" + item.actorUserId + (item.actorRole ? " · " + roleLabel(item.actorRole) : "")
                : (item.actorRole === "Server" ? tr("api.admin.auditServer", "Server") : tr("api.admin.auditNobody", "Not signed in"));
            var when = String(item.createdAt || "").replace("T", " ").slice(0, 19);
            var target = item.targetType + (item.targetId ? " · " + item.targetId : "");

            return "<tr>" +
                "<td>" + escapeHtml(when) + "</td>" +
                "<td>" + escapeHtml(who) + "</td>" +
                "<td>" + escapeHtml(auditActionLabel(item.action)) + "</td>" +
                '<td class="admin-cell-wrap">' + escapeHtml(target) + "</td>" +
                '<td class="admin-cell-wrap">' + escapeHtml(item.details || "—") + "</td></tr>";
        }).join("");
    }

    function loadAudit() {
        loading("audit-body", 5);
        var action = byId("audit-action-filter").value;
        api.get("api/admin/audit-logs?take=200" + (action ? "&action=" + encodeURIComponent(action) : "")).then(function (rows) {
            state.audit = rows;
            renderAudit();
        }).catch(function (error) {
            failed(error, "audit-body", 5, loadAudit);
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
        byId("seat-flight-select").addEventListener("change", function () { loadSeatInventory(); });
        startSeatRefresh();
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
        byId("promos-body").addEventListener("click", function (event) {
            var button = event.target.closest("[data-campaign-promo]");
            if (button) {
                openCampaign(Number(button.getAttribute("data-campaign-promo")));
            }
        });

        var reloadUsers = debounce(loadUsers, 300);
        byId("user-search").addEventListener("input", reloadUsers);
        byId("user-role-filter").addEventListener("change", loadUsers);
        byId("user-status-filter").addEventListener("change", loadUsers);
        byId("add-user-btn").addEventListener("click", function () { openEntityForm(FORMS.admin, null); });
        byId("users-body").addEventListener("click", function (event) {
            var button = event.target.closest("[data-user-action]");
            var user = button ? find(state.users, button.getAttribute("data-user-id")) : null;
            if (button && user) userAction(button.getAttribute("data-user-action"), user);
        });

        paintAuditFilter();
        byId("audit-action-filter").addEventListener("change", loadAudit);
        byId("audit-refresh-btn").addEventListener("click", loadAudit);

        byId("refund-status-filter").addEventListener("change", loadRefunds);
        byId("refund-refresh-btn").addEventListener("click", loadRefunds);
        var searchSupport = debounce(function () { loadSupport(1); }, 300);
        byId("support-search").addEventListener("input", searchSupport);
        byId("support-status-filter").addEventListener("change", function () { loadSupport(1); });
        byId("support-category-filter").addEventListener("change", function () { loadSupport(1); });
        byId("support-refresh-btn").addEventListener("click", function () { loadSupport(state.supportPage ? state.supportPage.page : 1); });
        byId("support-body").addEventListener("click", function (event) {
            var button = event.target.closest("[data-support-open]");
            if (button) openSupportTicket(Number(button.getAttribute("data-support-open")));
        });
        byId("support-pager").addEventListener("click", function (event) {
            var button = event.target.closest("[data-support-page]");
            if (button && !button.disabled) loadSupport(Number(button.getAttribute("data-support-page")));
        });
        byId("refunds-body").addEventListener("click", function (event) {
            var button = event.target.closest("[data-retry-refund]");
            if (button && !button.disabled) retryRefund(button.getAttribute("data-retry-refund"));
        });

        byId("confirm-accept").addEventListener("click", function () { closeConfirm(true); });
        byId("confirm-cancel").addEventListener("click", function () { closeConfirm(false); });
        document.querySelectorAll("[data-close-confirm]").forEach(function (el) { el.addEventListener("click", function () { closeConfirm(false); }); });

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

        function openDashboardBooking(event) {
            var row = event.target.closest("[data-open-booking]");
            if (row && (event.type === "click" || event.key === "Enter")) showBookingDetails(row.getAttribute("data-open-booking"));
        }
        byId("dashboard-bookings-body").addEventListener("click", openDashboardBooking);
        byId("dashboard-bookings-body").addEventListener("keydown", openDashboardBooking);

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
                if (!byId("confirm-modal").hidden) {
                    closeConfirm(false);
                    return;
                }
                setSidebarOpen(false);
                closeModal();
                closeDetails();
            }

            // Tab stays between the two answers while the question is open.
            if (event.key === "Tab" && !byId("confirm-modal").hidden) {
                var buttons = [byId("confirm-cancel"), byId("confirm-accept")];
                var index = buttons.indexOf(document.activeElement);
                event.preventDefault();
                buttons[(index + (event.shiftKey ? buttons.length - 1 : 1)) % buttons.length].focus();
            }
        });

        window.addEventListener("resize", function () {
            if (window.innerWidth > 900) setSidebarOpen(false);
        });
    }

    function reveal() {
        var placeholder = byId("admin-access");
        if (placeholder) placeholder.hidden = true;
        byId("admin-shell").hidden = false;

        bindUi();
        applyRole();
        showSection("dashboard");

        window.addEventListener("aerova:languagechange", function () {
            // The page's own words first, then the ones set from code (the title of the open section, the account chip, the table).
            if (window.AEROVA_I18N && typeof window.AEROVA_I18N.applyTranslations === "function") {
                window.AEROVA_I18N.applyTranslations(document);
            }
            applyRole();
            paintAuditFilter();
            repaint();
        });
    }

    function init() {
        if (!api || !api.session.isActive()) {
            window.location.replace("login.html?next=admin.html");
            return;
        }

        // The session expired while the page is open: back to sign-in, then back here.
        window.addEventListener("aerova:session-expired", function () {
            window.location.replace("login.html?next=admin.html");
        });

        if (!auth || !auth.canUseAdminPanel()) {
            denyAccess();
            return;
        }

        // The stored role is only a hint. Nothing of the page is shown until the server has accepted the token for the admin area.
        // A small admin request does that: the dashboard counts every seat, and the page must not wait for it before it appears.
        api.get("api/admin/cancellation-rules").then(function (result) {
            reveal(result);
            startSupportRealtime();
        }).catch(function (error) {
            var status = error instanceof api.ApiError ? error.status : 0;
            if (status === 401) {
                window.location.replace("login.html?next=admin.html");
            } else if (status === 403) {
                denyAccess();
            } else {
                showAccessPanel(
                    tr("api.admin.unreachableTitle", "We could not check your access"),
                    apiMessage(error),
                    [{ label: tr("api.options.retry", "Try again"), href: "admin.html" }, { label: tr("auth.backHome", "Back to Home"), href: "index.html" }]
                );
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
