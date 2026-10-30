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
        "Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun",
        "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"
    ];

    /* The choices offered by the backend, with the "none" choice first. */
    var options = [];

    var passengersState = [];

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function setText(id, value) {
        var element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
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

        return (day < 10 ? "0" + day : day) + "." + (month < 10 ? "0" + month : month) + "." + year;
    }

    function formatPrice(price) {
        var amount = Number(price);

        if (!isFinite(amount)) {
            return "$0";
        }

        if (amount === 0) {
            return "$0";
        }

        return "$" + amount.toFixed(amount % 1 === 0 ? 0 : 2);
    }

    function readJSON(key) {
        try {
            var raw = sessionStorage.getItem(key);
            if (!raw) {
                return null;
            }

            var parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    function getPassengerDisplayName(passenger, index) {
        return nameFor(passenger, index);
    }

    function resolvePassengers() {
        var bookingData = readJSON("bookingData");
        var stored = bookingData && Array.isArray(bookingData.passengers) ? bookingData.passengers : [];

        return stored.map(function (passenger, index) {
            return {
                index: index,
                name: getPassengerDisplayName(passenger, index),
                optionId: passenger.baggageOptionId ? String(passenger.baggageOptionId) : "none"
            };
        });
    }

    function resolveFlightSummary() {
        return summaryOfFlight();
    }

    function getOptionById(optionId) {
        for (var i = 0; i < options.length; i += 1) {
            if (options[i].id === optionId) {
                return options[i];
            }
        }

        return options[0];
    }

    function buildOptionsMarkup(passengerIndex, selectedOptionId) {
        return options.map(function (option) {
            var isSelected = option.id === selectedOptionId;

            return (
                '<button' +
                    ' type="button"' +
                    ' class="baggage-option' + (isSelected ? " is-selected" : "") + '"' +
                    ' data-passenger-index="' + passengerIndex + '"' +
                    ' data-option-id="' + escapeHtml(option.id) + '"' +
                    ' aria-pressed="' + (isSelected ? "true" : "false") + '"' +
                ">" +
                    '<p class="baggage-option-label">' + escapeHtml(option.label) + "</p>" +
                    '<p class="baggage-option-price">' + escapeHtml(formatPrice(option.price)) + "</p>" +
                    '<p class="baggage-option-note">' + escapeHtml(option.note) + "</p>" +
                "</button>"
            );
        }).join("");
    }

    function buildPassengerCard(passenger) {
        var passengerNumber = passenger.index + 1;
        var titleId = "passenger-baggage-title-" + passengerNumber;

        return (
            '<article class="details-card passenger-baggage-card" data-passenger-index="' + passenger.index + '" aria-labelledby="' + titleId + '">' +
                '<h2 class="details-card-title" id="' + titleId + '">' + escapeHtml(tr("api.options.passenger", "Sərnişin {n}", { n: passengerNumber })) + "</h2>" +
                '<p class="passenger-baggage-note">' + escapeHtml(passenger.name) + "</p>" +
                '<div class="baggage-options" role="group" aria-label="Baggage options for ' + escapeHtml(passenger.name) + '">' +
                    buildOptionsMarkup(passenger.index, passenger.optionId) +
                "</div>" +
            "</article>"
        );
    }

    function renderPassengerCards() {
        var container = document.getElementById("passenger-baggage-list");
        if (!container) {
            return;
        }

        container.innerHTML = passengersState.map(buildPassengerCard).join("");

        container.querySelectorAll(".baggage-option").forEach(function (button) {
            button.addEventListener("click", function () {
                var passengerIndex = Number(button.getAttribute("data-passenger-index"));
                var optionId = button.getAttribute("data-option-id");
                selectBaggageOption(passengerIndex, optionId);
            });
        });
    }

    function renderFlightSummary(flight) {
        setText("flight-airline", flight.airline);
        setText("flight-number", flight.flightNumber);
        setText("flight-route", flight.from + " → " + flight.to);
        setText("flight-date", formatDisplayDate(flight.departureDate));
        setText("flight-times", flight.departure + " → " + flight.arrival);
        setText("flight-cabin", flight.cabinClass);
        setText("flight-aircraft", flight.aircraft);

        if (window.AEROVA_JOURNEY) {
            window.AEROVA_JOURNEY.paintReturnLine("flight-times", flight.legs);
        }
    }

    function getTotalBaggageCost() {
        return passengersState.reduce(function (total, passenger) {
            return total + getOptionById(passenger.optionId).price;
        }, 0);
    }

    function renderSummary() {
        var list = document.getElementById("baggage-summary-list");
        var totalElement = document.getElementById("baggage-total-cost");

        if (list) {
            list.innerHTML = passengersState.map(function (passenger) {
                var option = getOptionById(passenger.optionId);

                return (
                    '<li class="baggage-summary-item">' +
                        '<p class="baggage-summary-name">' + escapeHtml(passenger.name) + "</p>" +
                        '<p class="baggage-summary-choice">' +
                            '<span class="baggage-summary-choice-label">' + escapeHtml(option.label) + "</span>" +
                            '<span class="baggage-summary-choice-price">' + escapeHtml(formatPrice(option.price)) + "</span>" +
                        "</p>" +
                    "</li>"
                );
            }).join("");
        }

        if (totalElement) {
            totalElement.textContent = formatPrice(getTotalBaggageCost());
        }
    }

    function selectBaggageOption(passengerIndex, optionId) {
        var passenger = passengersState[passengerIndex];
        if (!passenger || !getOptionById(optionId)) {
            return;
        }

        passenger.optionId = optionId;

        var card = document.querySelector(
            '.passenger-baggage-card[data-passenger-index="' + passengerIndex + '"]'
        );

        if (card) {
            card.querySelectorAll(".baggage-option").forEach(function (button) {
                var isSelected = button.getAttribute("data-option-id") === optionId;
                button.classList.toggle("is-selected", isSelected);
                button.setAttribute("aria-pressed", isSelected ? "true" : "false");
            });
        }

        renderSummary();
    }

    function toOptions(list) {
        return [{
            id: "none",
            label: tr("api.options.noBaggage", "Əlavə baqaj yoxdur"),
            weightKg: 0,
            price: 0,
            note: tr("api.options.cabinOnly", "Yalnız salon baqajı")
        }].concat(list.map(function (option) {
            return {
                id: String(option.id),
                label: option.name,
                weightKg: option.weightKg,
                price: Number(option.price),
                note: tr("api.options.extraBag", "Əlavə qeydiyyatlı baqaj")
            };
        }));
    }

    function showStatus(kind, title, text, actions) {
        var panel = document.getElementById("options-status");
        var layout = document.querySelector(".baggage-layout");
        var buttons = document.getElementById("options-status-actions");

        if (!panel) {
            return;
        }

        setText("options-status-title", title);
        setText("options-status-text", text);
        panel.setAttribute("role", kind === "error" ? "alert" : "status");
        buttons.innerHTML = "";

        (actions || []).forEach(function (action) {
            var element = document.createElement(action.href ? "a" : "button");
            element.className = "continue-button options-status-button";
            element.textContent = action.label;
            if (action.href) {
                element.setAttribute("href", action.href);
            } else {
                element.type = "button";
                element.addEventListener("click", action.onClick);
            }
            buttons.appendChild(element);
        });

        panel.hidden = false;
        if (layout) {
            layout.hidden = true;
        }
    }

    function hideStatus() {
        var panel = document.getElementById("options-status");
        var layout = document.querySelector(".baggage-layout");

        if (panel) {
            panel.hidden = true;
        }
        if (layout) {
            layout.hidden = false;
        }
    }

    function showFailure(error, retry) {
        var isApiError = window.AEROVA_API && error instanceof window.AEROVA_API.ApiError;

        if (!isApiError && window.console) {
            window.console.error(error);
        }

        showStatus("error", tr("api.options.errorTitle", "Seçimləri yükləmək mümkün olmadı"), isApiError ? error.userMessage : tr("api.errors.generic", "Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin."), [
            { label: tr("api.options.retry", "Yenidən cəhd et"), onClick: retry }
        ]);
    }

    function nameFor(passenger, index) {
        var parts = [passenger && passenger.firstName, passenger && passenger.middleName, passenger && passenger.lastName]
            .map(function (part) { return String(part || "").trim(); })
            .filter(Boolean);

        return parts.length ? parts.join(" ") : tr("api.options.passenger", "Sərnişin {n}", { n: index + 1 });
    }

    function summaryOfFlight() {
        var bookingData = readJSON("bookingData");
        var flight = bookingData && bookingData.flight;

        if (!flight || !bookingData.passengers || !bookingData.passengers.length) {
            return null;
        }

        return {
            legs: bookingData.legs || [],
            airline: flight.airline || "AEROVA",
            flightNumber: flight.flightNumber || "\u2014",
            from: flight.from || "\u2014",
            to: flight.to || "\u2014",
            departureDate: flight.departureDate || "",
            departure: flight.departure || "\u2014",
            arrival: flight.arrival || "\u2014",
            cabinClass: bookingData.cabinClass || "\u2014",
            aircraft: flight.aircraft || "\u2014"
        };
    }

    function missingBooking() {
        showStatus("notice", tr("api.options.noBookingTitle", "Davam edən rezervasiya yoxdur"), tr("api.options.noBookingText", "Əvvəlcə uçuş seçin və sərnişin məlumatlarını daxil edin."), [
            { label: tr("api.options.backToPassengers", "Sərnişin məlumatlarına qayıt"), href: "passenger-details.html" }
        ]);
    }

    /* Writes the chosen option id of each passenger into bookingData, which the booking request is built from. */
    function saveChoices(field) {
        var bookingData = readJSON("bookingData");

        if (!bookingData || !Array.isArray(bookingData.passengers)) {
            return false;
        }

        passengersState.forEach(function (state) {
            var passenger = bookingData.passengers[state.index];
            if (passenger) {
                passenger[field] = state.optionId === "none" ? null : Number(state.optionId);
            }
        });

        try {
            sessionStorage.setItem("bookingData", JSON.stringify(bookingData));
            return true;
        } catch (error) {
            return false;
        }
    }

    function saveFailed() {
        showStatus("error", tr("api.options.saveErrorTitle", "Seçimlərinizi yadda saxlamaq mümkün olmadı"), tr("api.options.saveErrorText", "Brauzeriniz onları saxlamadı. Zəhmət olmasa yenidən cəhd edin."), [
            { label: tr("api.options.retry", "Yenidən cəhd et"), onClick: hideStatus }
        ]);
    }

    function saveBaggageData() {
        var saved = saveChoices("baggageOptionId");
        if (saved) {
            try {
                sessionStorage.removeItem("baggageData");
            } catch (error) {
                // Nothing stored.
            }
        }
        return saved;
    }

    function bindContinue() {
        var button = document.getElementById("continue-meal-button");
        if (!button) {
            return;
        }

        button.addEventListener("click", function () {
            if (!saveBaggageData()) {
                saveFailed();
                return;
            }
            window.location.href = "meal-selection.html";
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
            toggle.setAttribute("aria-label", open ? "Menyunu bağla" : "Menyunu aç");
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

    function loadOptions() {
        showStatus("loading", tr("api.options.loadingTitle", "Seçimlər yüklənir"), tr("api.options.loadingText", "Zəhmət olmasa bir az gözləyin."), []);

        window.AEROVA_OPTIONS.baggage().then(function (list) {
            options = toOptions(list);
            passengersState.forEach(function (passenger) {
                if (!getOptionById(passenger.optionId) || getOptionById(passenger.optionId).id !== passenger.optionId) {
                    passenger.optionId = "none";
                }
            });
            hideStatus();
            renderPassengerCards();
            renderSummary();
        }).catch(function (error) {
            showFailure(error, loadOptions);
        });
    }

    function init() {
        var flight = resolveFlightSummary();
        passengersState = resolvePassengers();

        bindContinue();
        initMenuToggle();

        if (!flight) {
            missingBooking();
            return;
        }

        renderFlightSummary(flight);
        loadOptions();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
