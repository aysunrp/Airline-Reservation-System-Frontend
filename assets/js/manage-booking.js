(function () {
    function tr(key, fallback, vars) {
        if (typeof window.t === "function") {
            var value = window.t(key, vars);
            if (value && value !== key) return value;
        }
        return typeof vars === "object" && vars
            ? String(fallback).replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? String(vars[k]) : "{" + k + "}"; })
            : fallback;
    }

    var MONTH_NAMES = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    var activeBooking = null;

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function normalizeValue(value) {
        return String(value || "").trim().toLowerCase();
    }

    function normalizePnr(value) {
        return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
    }

    function formatDisplayDate(dateValue) {
        if (!dateValue) {
            return "—";
        }

        var parts = String(dateValue).split("-");
        if (parts.length !== 3) {
            return String(dateValue);
        }

        var year = Number(parts[0]);
        var month = Number(parts[1]);
        var day = Number(parts[2]);

        if (!year || !month || !day || month < 1 || month > 12) {
            return String(dateValue);
        }

        return day + " " + MONTH_NAMES[month - 1] + " " + year;
    }

    function writeJSON(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            return false;
        }
    }

    function getPassengerName(passenger) {
        if (!passenger || typeof passenger !== "object") {
            return "";
        }

        if (passenger.fullName || passenger.name) {
            return String(passenger.fullName || passenger.name);
        }

        return [passenger.title, passenger.firstName, passenger.middleName, passenger.lastName]
            .map(function (part) {
                return String(part || "").trim();
            })
            .filter(Boolean)
            .join(" ");
    }

    function showMessage(text) {
        var message = document.getElementById("manage-message");
        if (!message) {
            return;
        }

        message.textContent = text || "";
        message.hidden = !text;
    }

    function clearFieldError(input) {
        if (!input || !input.classList.contains("is-invalid")) {
            return;
        }

        input.classList.remove("is-invalid");

        var original = input.getAttribute("data-original-placeholder");
        if (original !== null) {
            if (original) {
                input.setAttribute("placeholder", original);
            } else {
                input.removeAttribute("placeholder");
            }
        }
    }

    function markInvalid(input, message) {
        if (!input) {
            return;
        }

        if (input.getAttribute("data-original-placeholder") === null) {
            input.setAttribute("data-original-placeholder", input.getAttribute("placeholder") || "");
        }

        input.classList.add("is-invalid");
        input.setAttribute("placeholder", message || tr("manage.fieldRequired", "This field is required"));

        if (!String(input.value || "").trim()) {
            input.value = "";
        }
    }

    function validateForm() {
        var pnrInput = document.getElementById("booking-pnr");
        var lastNameInput = document.getElementById("passenger-last-name");
        var isValid = true;

        clearFieldError(pnrInput);
        clearFieldError(lastNameInput);

        if (!pnrInput || !String(pnrInput.value || "").trim()) {
            markInvalid(pnrInput, tr("manage.enterPnr", "Enter your booking reference"));
            isValid = false;
        }

        if (!lastNameInput || !String(lastNameInput.value || "").trim()) {
            markInvalid(lastNameInput, tr("manage.enterLastName", "Enter the passenger last name"));
            isValid = false;
        }

        return isValid;
    }

    function renderNotFound() {
        var results = document.getElementById("manage-results");
        if (!results) {
            return;
        }

        results.hidden = false;
        results.innerHTML =
            '<div class="booking-not-found">' +
                '<h2 class="booking-not-found-title">' + tr("manage.notFoundTitle", "Booking Not Found") + '</h2>' +
                '<p class="booking-not-found-text">' + tr("manage.notFoundText", "We could not find a reservation matching that reference and last name. Please check your details and try again.") + '</p>' +
            "</div>";
    }

    /* A BookingDto from the API as the result card shows it: times and the date are those of the departure airport. */
    function toResult(dto, airports) {
        var directory = window.AEROVA_AIRPORTS;
        var leg = dto.legs[0];
        var departure = directory.localTime(leg.departureAt, directory.find(airports, leg.originCode).timeZoneId);

        return {
            pnr: dto.pnr,
            status: dto.status,
            passenger: getPassengerName(dto.passengers[0]),
            flightNumber: leg.flightNumber,
            route: leg.originCity + " \u2192 " + leg.destinationCity,
            date: departure.date
        };
    }

    function statusLabel(status) {
        if (status === "Cancelled") return tr("common.statusCancelled", "Cancelled");
        if (status === "Completed") return tr("api.trips.statusCompleted", "Completed");
        if (status === "Pending") return tr("api.manage.awaitingPayment", "Awaiting payment");
        return tr("common.statusConfirmed", "Confirmed");
    }

    function renderBookingResult(result) {
        var results = document.getElementById("manage-results");
        if (!results) {
            return;
        }

        results.hidden = false;
        results.innerHTML =
            '<article class="booking-result-card" aria-label="' + tr("manage.resultAria", "Booking result") + '">' +
                '<div class="booking-result-top">' +
                    "<div>" +
                        '<p class="booking-result-pnr-label">' + tr("manage.bookingReference", "Booking Reference") + '</p>' +
                        '<p class="booking-result-pnr">' + escapeHtml(result.pnr) + "</p>" +
                    "</div>" +
                    '<p class="booking-status-badge">' + escapeHtml(statusLabel(result.status)) + "</p>" +
                "</div>" +
                '<dl class="booking-result-meta">' +
                    '<div class="booking-result-meta-item"><dt>' + tr("manage.passenger", "Passenger") + '</dt><dd>' + escapeHtml(result.passenger || "\u2014") + "</dd></div>" +
                    '<div class="booking-result-meta-item"><dt>' + tr("manage.flight", "Flight") + '</dt><dd>' + escapeHtml(result.flightNumber) + "</dd></div>" +
                    '<div class="booking-result-meta-item"><dt>' + tr("manage.route", "Route") + '</dt><dd>' + escapeHtml(result.route) + "</dd></div>" +
                    '<div class="booking-result-meta-item"><dt>' + tr("manage.date", "Date") + '</dt><dd>' + escapeHtml(formatDisplayDate(result.date)) + "</dd></div>" +
                "</dl>" +
                '<div class="booking-result-actions">' +
                    '<button class="booking-action-button booking-action-button--primary" type="button" data-action="view">' + tr("manage.viewBooking", "View Booking") + '</button>' +
                    (result.status === "Confirmed" || result.status === "Pending"
                        ? '<button class="booking-action-button booking-action-button--secondary" type="button" data-action="cancel">' + tr("manage.cancelBooking", "Cancel Booking") + '</button>'
                        : "") +
                "</div>" +
            "</article>";

        results.querySelectorAll("[data-action]").forEach(function (button) {
            button.addEventListener("click", function () {
                handleResultAction(button.getAttribute("data-action"));
            });
        });
    }

    /* Booking details asks the backend again with the reference and last name that found this booking; nothing else is passed on. */
    function handleResultAction(action) {
        if (!activeBooking) {
            return;
        }

        try {
            sessionStorage.setItem("aerovaManaged", JSON.stringify({ pnr: activeBooking.pnr, lastName: activeBooking.lastName }));
        } catch (error) {
            showMessage(tr("api.errors.generic", "Something went wrong. Please try again."));
            return;
        }

        window.location.href = "booking-details.html?source=manage&intent=" + (action === "cancel" ? "cancel" : "view");
    }

    function handleSearch(event) {
        event.preventDefault();
        showMessage("");

        var results = document.getElementById("manage-results");
        if (results) {
            results.hidden = true;
            results.innerHTML = "";
        }

        activeBooking = null;

        if (!validateForm()) {
            return;
        }

        var pnr = normalizePnr(document.getElementById("booking-pnr").value);
        var lastName = String(document.getElementById("passenger-last-name").value || "").trim();
        var button = document.getElementById("search-booking-button");
        if (button) {
            button.disabled = true;
        }

        Promise.all([
            window.AEROVA_AIRPORTS.load(),
            window.AEROVA_API.get("api/bookings/" + encodeURIComponent(pnr) + "?lastName=" + encodeURIComponent(lastName))
        ]).then(function (responses) {
            var result = toResult(responses[1], responses[0]);
            activeBooking = { pnr: result.pnr, lastName: lastName };
            renderBookingResult(result);
        }).catch(function (error) {
            var isApiError = window.AEROVA_API && error instanceof window.AEROVA_API.ApiError;

            if (isApiError && error.status === 404) {
                renderNotFound();
                return;
            }

            if (!isApiError && window.console) {
                window.console.error(error);
            }
            showMessage(isApiError ? error.userMessage : tr("api.errors.generic", "Something went wrong. Please try again."));
        }).then(function () {
            if (button) {
                button.disabled = false;
            }
        });
    }

    function initMenuToggle() {
        var header = document.getElementById("site-header");
        if (!header) {
            return;
        }

        var toggle = header.querySelector(".menu-toggle");
        var nav = header.querySelector(".main-navigation");
        if (!toggle || !nav) {
            return;
        }

        function setMenu(open) {
            header.classList.toggle("is-menu-open", open);
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
            toggle.setAttribute("aria-label", open ? tr("manage.closeMenu", "Close menu") : tr("manage.openMenu", "Open menu"));
        }

        toggle.addEventListener("click", function () {
            setMenu(!header.classList.contains("is-menu-open"));
        });

        nav.addEventListener("click", function (event) {
            if (event.target.closest("a")) {
                setMenu(false);
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                setMenu(false);
            }
        });

        window.addEventListener("resize", function () {
            if (window.innerWidth > 1366) {
                setMenu(false);
            }
        });
    }

    function init() {
        var form = document.getElementById("manage-booking-form");
        if (form) {
            form.addEventListener("submit", handleSearch);
        }

        ["booking-pnr", "passenger-last-name"].forEach(function (id) {
            var input = document.getElementById(id);
            if (!input) {
                return;
            }

            input.addEventListener("input", function () {
                clearFieldError(input);
            });
        });

        initMenuToggle();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
