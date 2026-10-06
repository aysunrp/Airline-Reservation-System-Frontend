(function () {
    var SECTION_META = {
        dashboard: { title: "Dashboard", subtitle: "Airline operations overview" },
        flights: { title: "Flights", subtitle: "Manage flight operations and status" },
        routes: { title: "Routes", subtitle: "Network route management" },
        schedules: { title: "Schedules", subtitle: "Departure planning and timetable control" },
        aircraft: { title: "Aircraft", subtitle: "Fleet configuration and seat capacity" },
        seats: { title: "Seat Inventory", subtitle: "Cabin availability by flight" },
        bookings: { title: "Bookings", subtitle: "Reservation management and cancellations" },
        passengers: { title: "Passengers", subtitle: "Traveler records and document details" }
    };

    var CABIN_LAYOUTS = {
        Business: {
            key: "business",
            label: "Business",
            startRow: 1,
            endRow: 3,
            groups: [["A", "B"], ["C", "D"]],
            occupied: ["1A", "2D", "3B"],
            reserved: ["1C", "2A"],
            blocked: ["3D"]
        },
        Comfort: {
            key: "comfort",
            label: "Comfort",
            startRow: 5,
            endRow: 9,
            groups: [["A", "B"], ["C"], ["D", "E"]],
            occupied: ["5A", "6C", "7E", "8B"],
            reserved: ["5D", "9A"],
            blocked: ["6E"]
        },
        Economy: {
            key: "economy",
            label: "Economy",
            startRow: 11,
            endRow: 18,
            groups: [["A", "B", "C"], ["D", "E", "F"]],
            occupied: ["11B", "12D", "14A", "15F", "16C", "17E"],
            reserved: ["11F", "13A", "18C"],
            blocked: ["12A", "15C"]
        }
    };

    var SEAT_CYCLE = ["available", "reserved", "blocked", "occupied"];

    var state = {
        flights: [
            { id: "f1", flightNumber: "AV 101", origin: "Baku", destination: "London", date: "2026-10-10", departure: "09:30", arrival: "13:10", aircraft: "787-9", status: "On Time", basePrice: "720" },
            { id: "f2", flightNumber: "AV 205", origin: "Baku", destination: "Paris", date: "2026-10-10", departure: "14:20", arrival: "18:05", aircraft: "A350-900", status: "Delayed", basePrice: "680" },
            { id: "f3", flightNumber: "AV 318", origin: "Baku", destination: "Dubai", date: "2026-10-11", departure: "08:15", arrival: "11:40", aircraft: "A321neo", status: "Scheduled", basePrice: "410" },
            { id: "f4", flightNumber: "AV 401", origin: "London", destination: "Baku", date: "2026-10-11", departure: "16:45", arrival: "00:20", aircraft: "787-9", status: "Scheduled", basePrice: "740" },
            { id: "f5", flightNumber: "AV 220", origin: "Baku", destination: "Istanbul", date: "2026-10-12", departure: "07:50", arrival: "10:15", aircraft: "A321neo", status: "Cancelled", basePrice: "320" }
        ],
        routes: [
            { id: "r1", code: "GYD-LHR", origin: "Baku", destination: "London", distance: "3,950 km", duration: "5h 40m", status: "Active" },
            { id: "r2", code: "GYD-CDG", origin: "Baku", destination: "Paris", distance: "3,720 km", duration: "5h 20m", status: "Active" },
            { id: "r3", code: "GYD-DXB", origin: "Baku", destination: "Dubai", distance: "1,820 km", duration: "3h 25m", status: "Active" },
            { id: "r4", code: "GYD-IST", origin: "Baku", destination: "Istanbul", distance: "1,760 km", duration: "3h 10m", status: "Active" },
            { id: "r5", code: "GYD-MLE", origin: "Baku", destination: "Maldives", distance: "4,680 km", duration: "7h 15m", status: "Inactive" }
        ],
        schedules: [
            { id: "s1", flightNumber: "AV 101", route: "Baku → London", aircraft: "787-9", date: "2026-10-10", departure: "09:30", arrival: "13:10", status: "On Time" },
            { id: "s2", flightNumber: "AV 205", route: "Baku → Paris", aircraft: "A350-900", date: "2026-10-10", departure: "14:20", arrival: "18:05", status: "Delayed" },
            { id: "s3", flightNumber: "AV 318", route: "Baku → Dubai", aircraft: "A321neo", date: "2026-10-11", departure: "08:15", arrival: "11:40", status: "Scheduled" },
            { id: "s4", flightNumber: "AV 401", route: "London → Baku", aircraft: "787-9", date: "2026-10-11", departure: "16:45", arrival: "00:20", status: "Scheduled" },
            { id: "s5", flightNumber: "AV 226", route: "Baku → Istanbul", aircraft: "A321neo", date: "2026-10-12", departure: "19:10", arrival: "21:35", status: "Cancelled" }
        ],
        aircraft: [
            { id: "a1", name: "AEROVA Dreamliner 1", model: "787-9", registration: "4K-AV01", total: 286, business: 28, comfort: 42, economy: 216, status: "Active" },
            { id: "a2", name: "AEROVA Horizon", model: "A350-900", registration: "4K-AV08", total: 300, business: 32, comfort: 48, economy: 220, status: "Active" },
            { id: "a3", name: "AEROVA Caspian", model: "A321neo", registration: "4K-AV14", total: 190, business: 16, comfort: 24, economy: 150, status: "Maintenance" },
            { id: "a4", name: "AEROVA Silk Wing", model: "787-9", registration: "4K-AV03", total: 286, business: 28, comfort: 42, economy: 216, status: "Active" },
            { id: "a5", name: "AEROVA Pearl", model: "A321neo", registration: "4K-AV21", total: 190, business: 16, comfort: 24, economy: 150, status: "Inactive" }
        ],
        bookings: [
            { id: "b1", pnr: "AV7K92M", passenger: "Leyla Mammadova", flight: "AV 101", route: "Baku → London", date: "2026-10-10", cabin: "Comfort", seats: "12A, 12B", total: "$1,594", status: "Confirmed" },
            { id: "b2", pnr: "AV3H81Q", passenger: "Orkhan Aliyev", flight: "AV 205", route: "Baku → Paris", date: "2026-10-10", cabin: "Economy", seats: "18C", total: "$840", status: "Confirmed" },
            { id: "b3", pnr: "AV9P44L", passenger: "Nigar Huseynova", flight: "AV 318", route: "Baku → Dubai", date: "2026-10-11", cabin: "Business", seats: "2A", total: "$1,450", status: "Pending" },
            { id: "b4", pnr: "AV2M17C", passenger: "Rashad Ismayilov", flight: "AV 220", route: "Baku → Istanbul", date: "2026-10-12", cabin: "Economy", seats: "22F", total: "$620", status: "Cancelled" },
            { id: "b5", pnr: "AV6T55B", passenger: "Aysel Karimova", flight: "AV 401", route: "London → Baku", date: "2026-10-11", cabin: "Comfort", seats: "10D", total: "$980", status: "Confirmed" }
        ],
        passengers: [
            { id: "p1", name: "Leyla Mammadova", email: "leyla.mammadova@email.com", phone: "+994 50 123 4567", nationality: "Azerbaijani", documentType: "Passport", documentNumber: "AZE1234567", trips: 8, status: "Active" },
            { id: "p2", name: "Orkhan Aliyev", email: "orkhan.aliyev@email.com", phone: "+994 55 987 6543", nationality: "Azerbaijani", documentType: "Passport", documentNumber: "AZE7654321", trips: 5, status: "Active" },
            { id: "p3", name: "Nigar Huseynova", email: "nigar.h@email.com", phone: "+994 70 222 3344", nationality: "Azerbaijani", documentType: "ID Card", documentNumber: "AA9988776", trips: 2, status: "Active" },
            { id: "p4", name: "James Carter", email: "james.carter@email.com", phone: "+44 7700 900123", nationality: "British", documentType: "Passport", documentNumber: "UK5544332", trips: 11, status: "Active" },
            { id: "p5", name: "Amira Hassan", email: "amira.hassan@email.com", phone: "+971 50 445 6677", nationality: "Emirati", documentType: "Passport", documentNumber: "UAE1122334", trips: 0, status: "Inactive" }
        ],
        seatMaps: {},
        formContext: null
    };

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function showMessage(text) {
        var message = document.getElementById("admin-message");
        if (!message) return;
        message.textContent = text || "";
        message.hidden = !text;
        if (text) {
            window.clearTimeout(showMessage._timer);
            showMessage._timer = window.setTimeout(function () {
                message.hidden = true;
            }, 2800);
        }
    }

    function statusBadge(status) {
        var value = String(status || "Unknown");
        var tone = "neutral";
        var lower = value.toLowerCase();
        if (["active", "scheduled", "confirmed", "available", "on time"].indexOf(lower) !== -1) tone = "success";
        else if (["delayed", "pending", "reserved", "maintenance"].indexOf(lower) !== -1) tone = "warning";
        else if (["cancelled", "canceled", "blocked", "inactive", "occupied"].indexOf(lower) !== -1) tone = "danger";
        return '<span class="admin-badge admin-badge--' + tone + '">' + escapeHtml(value) + "</span>";
    }

    function setSidebarOpen(open) {
        var shell = document.getElementById("admin-shell");
        var toggle = document.getElementById("admin-menu-toggle");
        if (!shell || !toggle) return;
        shell.classList.toggle("is-sidebar-open", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }

    function showSection(sectionId) {
        var meta = SECTION_META[sectionId] || SECTION_META.dashboard;

        document.querySelectorAll("[data-section-panel]").forEach(function (panel) {
            var active = panel.getAttribute("data-section-panel") === sectionId;
            panel.hidden = !active;
            panel.classList.toggle("is-active", active);
        });

        document.querySelectorAll("#admin-nav [data-section]").forEach(function (link) {
            link.classList.toggle("is-active", link.getAttribute("data-section") === sectionId);
        });

        document.getElementById("admin-page-title").textContent = meta.title;
        document.getElementById("admin-page-subtitle").textContent = meta.subtitle;
        setSidebarOpen(false);

        if (sectionId === "dashboard") renderDashboard();
        if (sectionId === "flights") renderFlights();
        if (sectionId === "routes") renderRoutes();
        if (sectionId === "schedules") renderSchedules();
        if (sectionId === "aircraft") renderAircraft();
        if (sectionId === "seats") renderSeatInventory();
        if (sectionId === "bookings") renderBookings();
        if (sectionId === "passengers") renderPassengers();
    }

    function openModal() {
        document.getElementById("entity-modal").hidden = false;
    }

    function closeModal() {
        document.getElementById("entity-modal").hidden = true;
        state.formContext = null;
    }

    function openDetails(title, html) {
        document.getElementById("details-modal-title").textContent = title;
        document.getElementById("details-modal-body").innerHTML = html;
        document.getElementById("details-modal").hidden = false;
    }

    function closeDetails() {
        document.getElementById("details-modal").hidden = true;
    }

    function buildFields(fields, values) {
        return fields.map(function (field) {
            var value = values && values[field.key] != null ? values[field.key] : "";
            var full = field.full ? " admin-field--full" : "";
            var control;

            if (field.type === "select") {
                control = '<select id="field-' + field.key + '">' +
                    field.options.map(function (option) {
                        return '<option value="' + escapeHtml(option) + '"' +
                            (String(option) === String(value) ? " selected" : "") +
                            ">" + escapeHtml(option) + "</option>";
                    }).join("") +
                    "</select>";
            } else {
                control = '<input id="field-' + field.key + '" type="' + (field.type || "text") +
                    '" value="' + escapeHtml(value) + '" required>';
            }

            return '<div class="admin-field' + full + '"><label for="field-' + field.key + '">' +
                escapeHtml(field.label) + "</label>" + control + "</div>";
        }).join("");
    }

    function readFields(fields) {
        var data = {};
        fields.forEach(function (field) {
            var el = document.getElementById("field-" + field.key);
            var value = el ? el.value : "";
            data[field.key] = field.type === "number" ? Number(value) || 0 : String(value).trim();
        });
        return data;
    }

    function openEntityForm(config, item) {
        state.formContext = { type: config.type, id: item ? item.id : null, fields: config.fields };
        document.getElementById("entity-modal-title").textContent = (item ? "Edit " : "Add ") + config.title;
        document.getElementById("entity-form-fields").innerHTML = buildFields(config.fields, item || {});
        openModal();
    }

    function renderDashboard() {
        document.getElementById("dashboard-bookings-body").innerHTML = state.bookings.slice(0, 5).map(function (item) {
            return "<tr><td>" + escapeHtml(item.pnr) + "</td><td>" + escapeHtml(item.passenger) +
                "</td><td>" + escapeHtml(item.flight) + "</td><td>" + escapeHtml(item.total) +
                "</td><td>" + statusBadge(item.status) + "</td></tr>";
        }).join("");

        document.getElementById("dashboard-flights-body").innerHTML = state.flights
            .filter(function (item) { return item.status !== "Cancelled"; })
            .slice(0, 5)
            .map(function (item) {
                return "<tr><td>" + escapeHtml(item.flightNumber) + "</td><td>" +
                    escapeHtml(item.origin + " → " + item.destination) + "</td><td>" +
                    escapeHtml(item.date + " · " + item.departure) + "</td><td>" +
                    escapeHtml(item.aircraft) + "</td><td>" + statusBadge(item.status) + "</td></tr>";
            }).join("");
    }

    function renderFlights() {
        var query = (document.getElementById("flight-search").value || "").toLowerCase();
        var status = document.getElementById("flight-status-filter").value;
        var rows = state.flights.filter(function (item) {
            var haystack = [item.flightNumber, item.origin, item.destination, item.aircraft].join(" ").toLowerCase();
            return (!query || haystack.indexOf(query) !== -1) && (!status || item.status === status);
        });

        var body = document.getElementById("flights-body");
        if (!rows.length) {
            body.innerHTML = '<tr><td colspan="9" class="admin-empty">No flights found.</td></tr>';
            return;
        }

        body.innerHTML = rows.map(function (item) {
            return "<tr>" +
                "<td>" + escapeHtml(item.flightNumber) + "</td>" +
                "<td>" + escapeHtml(item.origin) + "</td>" +
                "<td>" + escapeHtml(item.destination) + "</td>" +
                "<td>" + escapeHtml(item.date) + "</td>" +
                "<td>" + escapeHtml(item.departure) + "</td>" +
                "<td>" + escapeHtml(item.arrival) + "</td>" +
                "<td>" + escapeHtml(item.aircraft) + "</td>" +
                "<td>" + statusBadge(item.status) + "</td>" +
                '<td><div class="admin-actions">' +
                '<button class="admin-btn admin-btn--ghost" type="button" data-edit-flight="' + item.id + '">Edit</button>' +
                '<button class="admin-btn admin-btn--ghost" type="button" data-delete-flight="' + item.id + '">Delete</button>' +
                "</div></td></tr>";
        }).join("");
    }

    function renderRoutes() {
        var query = (document.getElementById("route-search").value || "").toLowerCase();
        var rows = state.routes.filter(function (item) {
            return !query || [item.code, item.origin, item.destination].join(" ").toLowerCase().indexOf(query) !== -1;
        });
        var body = document.getElementById("routes-body");
        if (!rows.length) {
            body.innerHTML = '<tr><td colspan="7" class="admin-empty">No routes found.</td></tr>';
            return;
        }
        body.innerHTML = rows.map(function (item) {
            return "<tr>" +
                "<td>" + escapeHtml(item.code) + "</td>" +
                "<td>" + escapeHtml(item.origin) + "</td>" +
                "<td>" + escapeHtml(item.destination) + "</td>" +
                "<td>" + escapeHtml(item.distance) + "</td>" +
                "<td>" + escapeHtml(item.duration) + "</td>" +
                "<td>" + statusBadge(item.status) + "</td>" +
                '<td><div class="admin-actions">' +
                '<button class="admin-btn admin-btn--ghost" type="button" data-edit-route="' + item.id + '">Edit</button>' +
                '<button class="admin-btn admin-btn--ghost" type="button" data-delete-route="' + item.id + '">Delete</button>' +
                "</div></td></tr>";
        }).join("");
    }

    function renderSchedules() {
        var date = document.getElementById("schedule-date-filter").value;
        var status = document.getElementById("schedule-status-filter").value;
        var rows = state.schedules.filter(function (item) {
            return (!date || item.date === date) && (!status || item.status === status);
        });
        var body = document.getElementById("schedules-body");
        if (!rows.length) {
            body.innerHTML = '<tr><td colspan="8" class="admin-empty">No schedules found.</td></tr>';
            return;
        }
        body.innerHTML = rows.map(function (item) {
            return "<tr>" +
                "<td>" + escapeHtml(item.flightNumber) + "</td>" +
                "<td>" + escapeHtml(item.route) + "</td>" +
                "<td>" + escapeHtml(item.aircraft) + "</td>" +
                "<td>" + escapeHtml(item.date) + "</td>" +
                "<td>" + escapeHtml(item.departure) + "</td>" +
                "<td>" + escapeHtml(item.arrival) + "</td>" +
                "<td>" + statusBadge(item.status) + "</td>" +
                '<td><div class="admin-actions">' +
                '<button class="admin-btn admin-btn--ghost" type="button" data-edit-schedule="' + item.id + '">Edit</button>' +
                '<button class="admin-btn admin-btn--ghost" type="button" data-delete-schedule="' + item.id + '">Delete</button>' +
                "</div></td></tr>";
        }).join("");
    }

    function renderAircraft() {
        var query = (document.getElementById("aircraft-search").value || "").toLowerCase();
        var rows = state.aircraft.filter(function (item) {
            return !query || [item.name, item.model, item.registration].join(" ").toLowerCase().indexOf(query) !== -1;
        });
        var body = document.getElementById("aircraft-body");
        if (!rows.length) {
            body.innerHTML = '<tr><td colspan="9" class="admin-empty">No aircraft found.</td></tr>';
            return;
        }
        body.innerHTML = rows.map(function (item) {
            return "<tr>" +
                "<td>" + escapeHtml(item.name) + "</td>" +
                "<td>" + escapeHtml(item.model) + "</td>" +
                "<td>" + escapeHtml(item.registration) + "</td>" +
                "<td>" + item.total + "</td>" +
                "<td>" + item.business + "</td>" +
                "<td>" + item.comfort + "</td>" +
                "<td>" + item.economy + "</td>" +
                "<td>" + statusBadge(item.status) + "</td>" +
                '<td><div class="admin-actions">' +
                '<button class="admin-btn admin-btn--ghost" type="button" data-view-aircraft="' + item.id + '">View Details</button>' +
                '<button class="admin-btn admin-btn--ghost" type="button" data-edit-aircraft="' + item.id + '">Edit</button>' +
                '<button class="admin-btn admin-btn--ghost" type="button" data-delete-aircraft="' + item.id + '">Delete</button>' +
                "</div></td></tr>";
        }).join("");
    }

    function ensureSeatMap(flightId, cabinName) {
        var key = flightId + "::" + cabinName;
        if (state.seatMaps[key]) return state.seatMaps[key];

        var layout = CABIN_LAYOUTS[cabinName] || CABIN_LAYOUTS.Economy;
        var seats = {};
        var occupied = {};
        var reserved = {};
        var blocked = {};

        (layout.occupied || []).forEach(function (id) { occupied[id] = true; });
        (layout.reserved || []).forEach(function (id) { reserved[id] = true; });
        (layout.blocked || []).forEach(function (id) { blocked[id] = true; });

        for (var row = layout.startRow; row <= layout.endRow; row += 1) {
            layout.groups.forEach(function (group) {
                group.forEach(function (letter) {
                    var seatId = String(row) + letter;
                    if (occupied[seatId]) seats[seatId] = "occupied";
                    else if (reserved[seatId]) seats[seatId] = "reserved";
                    else if (blocked[seatId]) seats[seatId] = "blocked";
                    else seats[seatId] = "available";
                });
            });
        }

        state.seatMaps[key] = seats;
        return seats;
    }

    function countSeats(seats) {
        var counts = { available: 0, occupied: 0, reserved: 0, blocked: 0, total: 0 };
        Object.keys(seats).forEach(function (seatId) {
            counts[seats[seatId]] += 1;
            counts.total += 1;
        });
        return counts;
    }

    function renderSeatInventory() {
        var flightSelect = document.getElementById("seat-flight-select");
        var cabinSelect = document.getElementById("seat-cabin-select");

        if (!flightSelect.options.length) {
            flightSelect.innerHTML = state.flights
                .filter(function (item) { return item.status !== "Cancelled"; })
                .map(function (item) {
                    return '<option value="' + escapeHtml(item.id) + '">' +
                        escapeHtml(item.flightNumber + " · " + item.origin + " → " + item.destination) +
                        "</option>";
                }).join("");
        }

        var flight = findById(state.flights, flightSelect.value) || state.flights[0];
        var cabinName = cabinSelect.value || "Economy";
        var layout = CABIN_LAYOUTS[cabinName] || CABIN_LAYOUTS.Economy;
        var seats = ensureSeatMap(flight.id, cabinName);
        var counts = countSeats(seats);

        document.getElementById("seat-map-title").textContent =
            flight.flightNumber + " · " + cabinName + " Seat Map";

        document.getElementById("seat-summary-list").innerHTML =
            "<div><dt>Available seats</dt><dd>" + counts.available + "</dd></div>" +
            "<div><dt>Occupied seats</dt><dd>" + counts.occupied + "</dd></div>" +
            "<div><dt>Reserved seats</dt><dd>" + counts.reserved + "</dd></div>" +
            "<div><dt>Blocked seats</dt><dd>" + counts.blocked + "</dd></div>";

        var columnsHtml = '<div class="seat-columns">';
        layout.groups.forEach(function (group, groupIndex) {
            columnsHtml += '<div class="seat-columns-group" style="grid-template-columns:repeat(' +
                group.length + ', var(--seat-size))">' +
                group.map(function (letter) { return "<span>" + letter + "</span>"; }).join("") +
                "</div>";
            if (groupIndex < layout.groups.length - 1) {
                columnsHtml += '<span class="seat-columns-aisle" aria-hidden="true"></span>';
            }
        });
        columnsHtml += "</div>";

        var html = '<div class="aircraft-nose" aria-hidden="true"></div>';
        html += '<h3 class="cabin-block-title">' + escapeHtml(layout.label) + "</h3>";
        html += columnsHtml;

        for (var row = layout.startRow; row <= layout.endRow; row += 1) {
            html += '<div class="seat-row"><span class="seat-row-label">' + row + "</span>";
            layout.groups.forEach(function (group, groupIndex) {
                html += '<div class="seat-group" style="grid-template-columns:repeat(' +
                    group.length + ', var(--seat-size))">';
                group.forEach(function (letter) {
                    var seatId = String(row) + letter;
                    var seatState = seats[seatId] || "available";
                    html += '<button class="admin-seat admin-seat--' + seatState +
                        '" type="button" data-seat-id="' + seatId + '" title="' +
                        seatId + " · " + seatState + '">' + letter + "</button>";
                });
                html += "</div>";
                if (groupIndex < layout.groups.length - 1) {
                    html += '<span class="seat-aisle" aria-hidden="true"></span>';
                }
            });
            html += "</div>";
        }

        var deck = document.getElementById("aircraft-deck");
        deck.setAttribute("data-layout", layout.key);
        deck.innerHTML = html;
    }

    function renderBookings() {
        var pnrQuery = (document.getElementById("booking-pnr-search").value || "").trim().toUpperCase();
        var passengerQuery = (document.getElementById("booking-passenger-search").value || "").trim().toLowerCase();
        var status = document.getElementById("booking-status-filter").value;
        var rows = state.bookings.filter(function (item) {
            var matchPnr = !pnrQuery || item.pnr.toUpperCase().indexOf(pnrQuery) !== -1;
            var matchPassenger = !passengerQuery || item.passenger.toLowerCase().indexOf(passengerQuery) !== -1;
            var matchStatus = !status || item.status === status;
            return matchPnr && matchPassenger && matchStatus;
        });
        var body = document.getElementById("bookings-body");
        if (!rows.length) {
            body.innerHTML = '<tr><td colspan="10" class="admin-empty">No bookings found.</td></tr>';
            return;
        }
        body.innerHTML = rows.map(function (item) {
            return "<tr>" +
                "<td>" + escapeHtml(item.pnr) + "</td>" +
                "<td>" + escapeHtml(item.passenger) + "</td>" +
                "<td>" + escapeHtml(item.flight) + "</td>" +
                "<td>" + escapeHtml(item.route) + "</td>" +
                "<td>" + escapeHtml(item.date) + "</td>" +
                "<td>" + escapeHtml(item.cabin) + "</td>" +
                "<td>" + escapeHtml(item.seats) + "</td>" +
                "<td>" + escapeHtml(item.total) + "</td>" +
                "<td>" + statusBadge(item.status) + "</td>" +
                '<td><div class="admin-actions">' +
                '<button class="admin-btn admin-btn--ghost" type="button" data-view-booking="' + item.id + '">View Details</button>' +
                '<button class="admin-btn admin-btn--ghost" type="button" data-cancel-booking="' + item.id + '"' +
                    (item.status === "Cancelled" ? " disabled" : "") + ">Cancel Booking</button>" +
                "</div></td></tr>";
        }).join("");
    }

    function renderPassengers() {
        var query = (document.getElementById("passenger-search").value || "").toLowerCase();
        var status = document.getElementById("passenger-status-filter").value;
        var rows = state.passengers.filter(function (item) {
            var haystack = [item.name, item.email, item.documentNumber].join(" ").toLowerCase();
            return (!query || haystack.indexOf(query) !== -1) && (!status || item.status === status);
        });
        var body = document.getElementById("passengers-body");
        if (!rows.length) {
            body.innerHTML = '<tr><td colspan="9" class="admin-empty">No passengers found.</td></tr>';
            return;
        }
        body.innerHTML = rows.map(function (item) {
            return "<tr>" +
                "<td>" + escapeHtml(item.name) + "</td>" +
                "<td>" + escapeHtml(item.email) + "</td>" +
                "<td>" + escapeHtml(item.phone) + "</td>" +
                "<td>" + escapeHtml(item.nationality) + "</td>" +
                "<td>" + escapeHtml(item.documentType) + "</td>" +
                "<td>" + escapeHtml(item.documentNumber) + "</td>" +
                "<td>" + item.trips + "</td>" +
                "<td>" + statusBadge(item.status) + "</td>" +
                '<td><div class="admin-actions">' +
                '<button class="admin-btn admin-btn--ghost" type="button" data-view-passenger="' + item.id + '">View Details</button>' +
                "</div></td></tr>";
        }).join("");
    }

    var FORM_CONFIG = {
        flight: {
            type: "flight",
            title: "Flight",
            fields: [
                { key: "flightNumber", label: "Flight Number" },
                { key: "aircraft", label: "Aircraft" },
                { key: "origin", label: "Origin" },
                { key: "destination", label: "Destination" },
                { key: "date", label: "Departure Date", type: "date" },
                { key: "status", label: "Status", type: "select", options: ["Scheduled", "On Time", "Delayed", "Cancelled"] },
                { key: "departure", label: "Departure Time", type: "time" },
                { key: "arrival", label: "Arrival Time", type: "time" },
                { key: "basePrice", label: "Base Price", type: "number", full: true }
            ]
        },
        route: {
            type: "route",
            title: "Route",
            fields: [
                { key: "origin", label: "Origin" },
                { key: "destination", label: "Destination" },
                { key: "distance", label: "Distance" },
                { key: "duration", label: "Duration" },
                { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"], full: true }
            ]
        },
        schedule: {
            type: "schedule",
            title: "Schedule",
            fields: [
                { key: "flightNumber", label: "Flight Number" },
                { key: "aircraft", label: "Aircraft" },
                { key: "route", label: "Route", full: true },
                { key: "date", label: "Date", type: "date" },
                { key: "status", label: "Status", type: "select", options: ["Scheduled", "On Time", "Delayed", "Cancelled"] },
                { key: "departure", label: "Departure", type: "time" },
                { key: "arrival", label: "Arrival", type: "time" }
            ]
        },
        aircraft: {
            type: "aircraft",
            title: "Aircraft",
            fields: [
                { key: "name", label: "Aircraft" },
                { key: "model", label: "Model" },
                { key: "registration", label: "Registration Number" },
                { key: "status", label: "Status", type: "select", options: ["Active", "Maintenance", "Inactive"] },
                { key: "business", label: "Business Seats", type: "number" },
                { key: "comfort", label: "Comfort Seats", type: "number" },
                { key: "economy", label: "Economy Seats", type: "number" },
                { key: "total", label: "Total Seats", type: "number" }
            ]
        }
    };

    function findById(list, id) {
        return list.find(function (item) { return item.id === id; }) || null;
    }

    function removeById(listName, id, message) {
        state[listName] = state[listName].filter(function (item) { return item.id !== id; });
        showMessage(message);
    }

    function detailsGrid(pairs) {
        return '<div class="admin-form-grid">' + pairs.map(function (pair) {
            return '<div class="admin-field' + (pair.full ? " admin-field--full" : "") +
                '"><label>' + escapeHtml(pair.label) + "</label><p>" + pair.value + "</p></div>";
        }).join("") + "</div>";
    }

    function clearLoginState() {
        var authKeys = ["isLoggedIn", "aerovaUser", "currentUser", "aerovaAuth", "adminSession"];
        authKeys.forEach(function (key) {
            try { sessionStorage.removeItem(key); } catch (e) { /* ignore */ }
            try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
        });
    }

    function handleLogout() {
        if (window.AerovaAuth && typeof window.AerovaAuth.clearAuthState === "function") {
            window.AerovaAuth.clearAuthState();
        } else {
            clearLoginState();
        }
        window.location.href = "login.html";
    }

    function bindUi() {
        var logoutBtn = document.getElementById("admin-logout-btn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", handleLogout);
        }

        document.getElementById("admin-menu-toggle").addEventListener("click", function () {
            var shell = document.getElementById("admin-shell");
            setSidebarOpen(!shell.classList.contains("is-sidebar-open"));
        });

        document.getElementById("admin-sidebar-backdrop").addEventListener("click", function () {
            setSidebarOpen(false);
        });

        document.getElementById("admin-nav").addEventListener("click", function (event) {
            var button = event.target.closest("[data-section]");
            if (!button) return;
            showSection(button.getAttribute("data-section"));
        });

        document.getElementById("flight-search").addEventListener("input", renderFlights);
        document.getElementById("flight-status-filter").addEventListener("change", renderFlights);
        document.getElementById("route-search").addEventListener("input", renderRoutes);
        document.getElementById("schedule-date-filter").addEventListener("change", renderSchedules);
        document.getElementById("schedule-status-filter").addEventListener("change", renderSchedules);
        document.getElementById("aircraft-search").addEventListener("input", renderAircraft);
        document.getElementById("booking-pnr-search").addEventListener("input", renderBookings);
        document.getElementById("booking-passenger-search").addEventListener("input", renderBookings);
        document.getElementById("booking-status-filter").addEventListener("change", renderBookings);
        document.getElementById("passenger-search").addEventListener("input", renderPassengers);
        document.getElementById("passenger-status-filter").addEventListener("change", renderPassengers);
        document.getElementById("seat-flight-select").addEventListener("change", renderSeatInventory);
        document.getElementById("seat-cabin-select").addEventListener("change", renderSeatInventory);

        document.getElementById("add-flight-btn").addEventListener("click", function () {
            openEntityForm(FORM_CONFIG.flight, null);
        });
        document.getElementById("add-route-btn").addEventListener("click", function () {
            openEntityForm(FORM_CONFIG.route, null);
        });
        document.getElementById("add-schedule-btn").addEventListener("click", function () {
            openEntityForm(FORM_CONFIG.schedule, null);
        });
        document.getElementById("add-aircraft-btn").addEventListener("click", function () {
            openEntityForm(FORM_CONFIG.aircraft, null);
        });

        document.getElementById("flights-body").addEventListener("click", function (event) {
            var editId = event.target.getAttribute("data-edit-flight");
            var deleteId = event.target.getAttribute("data-delete-flight");
            if (editId) openEntityForm(FORM_CONFIG.flight, findById(state.flights, editId));
            if (deleteId) {
                removeById("flights", deleteId, "Flight deleted.");
                renderFlights();
            }
        });

        document.getElementById("routes-body").addEventListener("click", function (event) {
            var editId = event.target.getAttribute("data-edit-route");
            var deleteId = event.target.getAttribute("data-delete-route");
            if (editId) openEntityForm(FORM_CONFIG.route, findById(state.routes, editId));
            if (deleteId) {
                removeById("routes", deleteId, "Route deleted.");
                renderRoutes();
            }
        });

        document.getElementById("schedules-body").addEventListener("click", function (event) {
            var editId = event.target.getAttribute("data-edit-schedule");
            var deleteId = event.target.getAttribute("data-delete-schedule");
            if (editId) openEntityForm(FORM_CONFIG.schedule, findById(state.schedules, editId));
            if (deleteId) {
                removeById("schedules", deleteId, "Schedule deleted.");
                renderSchedules();
            }
        });

        document.getElementById("aircraft-body").addEventListener("click", function (event) {
            var viewId = event.target.getAttribute("data-view-aircraft");
            var editId = event.target.getAttribute("data-edit-aircraft");
            var deleteId = event.target.getAttribute("data-delete-aircraft");
            if (viewId) {
                var aircraft = findById(state.aircraft, viewId);
                if (!aircraft) return;
                openDetails("Aircraft Details", detailsGrid([
                    { label: "Aircraft", value: escapeHtml(aircraft.name) },
                    { label: "Status", value: statusBadge(aircraft.status) },
                    { label: "Model", value: escapeHtml(aircraft.model) },
                    { label: "Registration", value: escapeHtml(aircraft.registration) },
                    { label: "Business Seats", value: String(aircraft.business) },
                    { label: "Comfort Seats", value: String(aircraft.comfort) },
                    { label: "Economy Seats", value: String(aircraft.economy) },
                    { label: "Total Seats", value: String(aircraft.total) }
                ]));
            }
            if (editId) openEntityForm(FORM_CONFIG.aircraft, findById(state.aircraft, editId));
            if (deleteId) {
                removeById("aircraft", deleteId, "Aircraft deleted.");
                renderAircraft();
            }
        });

        document.getElementById("bookings-body").addEventListener("click", function (event) {
            var viewId = event.target.getAttribute("data-view-booking");
            var cancelId = event.target.getAttribute("data-cancel-booking");
            if (viewId) {
                var booking = findById(state.bookings, viewId);
                if (!booking) return;
                openDetails("Booking Details", detailsGrid([
                    { label: "PNR", value: escapeHtml(booking.pnr) },
                    { label: "Status", value: statusBadge(booking.status) },
                    { label: "Passenger", value: escapeHtml(booking.passenger) },
                    { label: "Flight", value: escapeHtml(booking.flight) },
                    { label: "Route", value: escapeHtml(booking.route) },
                    { label: "Date", value: escapeHtml(booking.date) },
                    { label: "Cabin", value: escapeHtml(booking.cabin) },
                    { label: "Seats", value: escapeHtml(booking.seats) },
                    { label: "Total", value: escapeHtml(booking.total), full: true }
                ]));
            }
            if (cancelId) {
                var target = findById(state.bookings, cancelId);
                if (!target || target.status === "Cancelled") return;
                target.status = "Cancelled";
                showMessage("Booking " + target.pnr + " cancelled.");
                renderBookings();
                renderDashboard();
            }
        });

        document.getElementById("passengers-body").addEventListener("click", function (event) {
            var viewId = event.target.getAttribute("data-view-passenger");
            if (!viewId) return;
            var passenger = findById(state.passengers, viewId);
            if (!passenger) return;
            openDetails("Passenger Details", detailsGrid([
                { label: "Passenger Name", value: escapeHtml(passenger.name) },
                { label: "Status", value: statusBadge(passenger.status) },
                { label: "Email", value: escapeHtml(passenger.email) },
                { label: "Phone", value: escapeHtml(passenger.phone) },
                { label: "Nationality", value: escapeHtml(passenger.nationality) },
                { label: "Total Trips", value: String(passenger.trips) },
                { label: "Document Type", value: escapeHtml(passenger.documentType) },
                { label: "Document Number", value: escapeHtml(passenger.documentNumber) }
            ]));
        });

        document.getElementById("aircraft-deck").addEventListener("click", function (event) {
            var seatButton = event.target.closest("[data-seat-id]");
            if (!seatButton) return;

            var flightId = document.getElementById("seat-flight-select").value;
            var cabinName = document.getElementById("seat-cabin-select").value || "Economy";
            var seats = ensureSeatMap(flightId, cabinName);
            var seatId = seatButton.getAttribute("data-seat-id");
            var current = seats[seatId] || "available";

            if (current !== "available" && current !== "reserved" && current !== "blocked" && current !== "occupied") {
                return;
            }

            var nextIndex = (SEAT_CYCLE.indexOf(current) + 1) % SEAT_CYCLE.length;
            seats[seatId] = SEAT_CYCLE[nextIndex];
            renderSeatInventory();
        });

        document.getElementById("entity-form").addEventListener("submit", function (event) {
            event.preventDefault();
            if (!state.formContext) return;

            var type = state.formContext.type;
            var id = state.formContext.id;
            var payload = readFields(state.formContext.fields);
            payload.id = id || (type.charAt(0) + Date.now());

            if (type === "route" && !id) {
                payload.code = (payload.origin.slice(0, 3) + "-" + payload.destination.slice(0, 3)).toUpperCase();
            }

            var listName = type === "aircraft" ? "aircraft" : (type + "s");

            if (id) {
                state[listName] = state[listName].map(function (item) {
                    return item.id === id ? Object.assign({}, item, payload) : item;
                });
                showMessage(FORM_CONFIG[type].title + " updated.");
            } else {
                state[listName].unshift(payload);
                showMessage(FORM_CONFIG[type].title + " added.");
            }

            closeModal();
            if (type === "flight") {
                renderFlights();
                var seatSelect = document.getElementById("seat-flight-select");
                seatSelect.innerHTML = "";
            }
            if (type === "route") renderRoutes();
            if (type === "schedule") renderSchedules();
            if (type === "aircraft") renderAircraft();
            renderDashboard();
        });

        document.querySelectorAll("[data-close-modal]").forEach(function (el) {
            el.addEventListener("click", closeModal);
        });
        document.querySelectorAll("[data-close-details]").forEach(function (el) {
            el.addEventListener("click", closeDetails);
        });

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
        bindUi();
        showSection("dashboard");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
