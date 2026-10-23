(function () {
    function tr(key, fallback, vars) {
        if (typeof window.t === "function") {
            var value = window.t(key, vars);
            if (value && value !== key) return value;
        }
        return fallback;
    }

    var MONTH_NAMES = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    /* Cabin layouts live in seat-layouts.js so the home-page seat preview renders the same cabins. */
    var CABIN_LAYOUTS = window.AEROVA_SEAT_LAYOUTS;

    var selectedSeats = [];
    var requiredSeats = 1;
    var activeLayout = CABIN_LAYOUTS.Economy;

    function normalizeText(value) {
        return String(value || "").trim().toLowerCase();
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function formatDisplayDate(dateValue) {
        if (!dateValue) {
            return tr("seats.dateNotSelected", "Date not selected");
        }

        var parts = String(dateValue).split("-");
        if (parts.length !== 3) {
            return dateValue;
        }

        var year = Number(parts[0]);
        var month = Number(parts[1]);
        var day = Number(parts[2]);

        if (!year || !month || !day || month < 1 || month > 12) {
            return dateValue;
        }

        var monthLabel = (typeof tr === "function")
            ? tr("common.months." + String(month), MONTH_NAMES[month - 1])
            : MONTH_NAMES[month - 1];
        if (!monthLabel || monthLabel === ("common.months." + String(month))) {
            monthLabel = MONTH_NAMES[month - 1];
        }
        return day + " " + monthLabel + " " + year;
    }

    function readSelectedFlight() {
        try {
            var raw = sessionStorage.getItem("aerovaSelectedFlight");
            if (!raw) {
                return null;
            }

            var parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    function resolveCabinLayout(cabinValue) {
        var normalized = normalizeText(cabinValue);

        if (normalized === "business" || normalized === "business class") {
            return CABIN_LAYOUTS.Business;
        }

        if (normalized === "comfort") {
            return CABIN_LAYOUTS.Comfort;
        }

        return CABIN_LAYOUTS.Economy;
    }

    /* The backend takes up to 9 travellers on one booking. */
    function resolvePassengerCount(flightData) {
        var count = Number(flightData && flightData.passengers);

        if (!count || count < 1) {
            return 1;
        }

        if (count > 9) {
            return 9;
        }

        return Math.floor(count);
    }

    function normalizeStoredSeats(flightData) {
        if (!flightData) {
            return [];
        }

        if (Array.isArray(flightData.selectedSeats)) {
            return flightData.selectedSeats
                .map(function (seat) {
                    return String(seat || "").trim();
                })
                .filter(function (seat) {
                    return !!seat;
                });
        }

        if (flightData.selectedSeat) {
            return [String(flightData.selectedSeat).trim()].filter(Boolean);
        }

        return [];
    }

    /* Keep only stored seats that exist and are free in this cabin's layout and were chosen for this cabin. */
    /* Keeps the earlier choice only when it was made for this flight and cabin and every seat is still free. */
    function restoreSeats(storedSeats, flightData, flightId, cabin, seats) {
        if (!flightData || flightData.seatsFlightId !== flightId || flightData.seatsCabin !== cabin) {
            return [];
        }

        var free = {};
        seats.forEach(function (seat) {
            if (seat.isAvailable) {
                free[seat.label] = true;
            }
        });

        var seen = {};
        return storedSeats.filter(function (label) {
            if (!free[label] || seen[label]) {
                return false;
            }
            seen[label] = true;
            return true;
        });
    }

    function cabinClassForLayout(layout) {
        return layout === CABIN_LAYOUTS.Business ? "Business" : (layout === CABIN_LAYOUTS.Comfort ? "Comfort" : "Economy");
    }

    function setText(id, value) {
        var element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    function showMessage(text) {
        var message = document.getElementById("seat-selection-message");
        if (!message) {
            return;
        }

        message.textContent = text || "";
        message.hidden = !text;
    }

    function updateContinueAvailability() {
        var continueButton = document.getElementById("continue-button") ||
            document.querySelector(".continue-button");
        if (!continueButton) {
            return;
        }

        var ready = selectedSeats.length === requiredSeats;
        continueButton.disabled = !ready;
        continueButton.setAttribute("aria-disabled", ready ? "false" : "true");
    }

    function updateSelectedSeatSummary() {
        var seatsLabel = selectedSeats.length === 1 ? tr("seats.selectedSeat", "Selected Seat") : tr("seats.selectedSeats", "Selected Seats");
        setText("selected-seat-label", seatsLabel);
        setText(
            "selected-seat-value",
            selectedSeats.length ? selectedSeats.join(", ") : tr("seats.noSeat", "No seat selected")
        );
        setText(
            "seat-progress",
            tr("seats.ofSelected", selectedSeats.length + " of " + requiredSeats + " seats selected", { selected: selectedSeats.length, total: requiredSeats })
        );
        setText("selected-seat-price", tr("seats.priceIncluded", "Included"));
        updateContinueAvailability();
    }

    function persistSelectedSeats(flightData) {
        var baseData = flightData && typeof flightData === "object" ? flightData : {};
        var cabin = cabinClassForLayout(activeLayout);

        var updated = Object.assign({}, baseData, {
            selectedSeats: selectedSeats.slice(),
            selectedSeatIds: selectedSeats.map(function (label) { return seatIdByLabel[label]; }),
            selectedSeat: selectedSeats.length === 1 ? selectedSeats[0] : selectedSeats.join(", "),
            passengers: String(requiredSeats),
            cabinClass: cabin,
            seatsCabin: cabin,
            seatsFlightId: Number(baseData.id)
        });

        try {
            sessionStorage.setItem("aerovaSelectedFlight", JSON.stringify(updated));
        } catch (error) {
            // Storage may be unavailable.
        }
    }

    function populateFlightSummary(flightData, layout) {
        var flight = flightData || {};

        var title = document.querySelector(".seat-title");
        if (title && window.AEROVA_JOURNEY && window.AEROVA_JOURNEY.isMultiCity(flight)) {
            title.textContent = tr("api.journey.seatsLeg", "Select Your Seats: Flight {n} of {total}", { n: window.AEROVA_JOURNEY.legNumber(flight), total: flight.multi.count });
        } else if (title && window.AEROVA_JOURNEY && window.AEROVA_JOURNEY.isRoundTrip(flight)) {
            title.textContent = window.AEROVA_JOURNEY.isReturnLeg(flight)
                ? tr("api.journey.seatsReturn", "Select Your Return Seats")
                : tr("api.journey.seatsOutbound", "Select Your Outbound Seats");
        }

        setText("summary-airline", flight.airline || "AEROVA");
        setText("summary-flight", flight.flightNumber || "—");
        setText("summary-route", flight.from && flight.to ? flight.from + " → " + flight.to : "—");
        setText("summary-date", flight.departureDate ? formatDisplayDate(flight.departureDate) : "—");
        setText("summary-times", flight.departure && flight.arrival ? flight.departure + " → " + flight.arrival : "—");
        setText("summary-aircraft", flight.aircraft || "—");
        setText("summary-cabin", (layout.labelKey && typeof tr === "function") ? tr(layout.labelKey, layout.label) : layout.label);
    }

    function buildColumnHeaders(groups) {
        var markup = "";

        groups.forEach(function (group, groupIndex) {
            group.forEach(function (letter) {
                markup += "<span>" + escapeHtml(letter) + "</span>";
            });

            if (groupIndex < groups.length - 1) {
                markup += '<span class="seat-columns-aisle"></span>';
            }
        });

        return markup;
    }

    /* The cabin's visual groups (aisles), plus any seat letter the layout does not know. */
    function seatGroups(layout, seats) {
        var known = {};
        layout.groups.forEach(function (group) {
            group.forEach(function (letter) {
                known[letter] = true;
            });
        });

        var extra = [];
        seats.forEach(function (seat) {
            if (!known[seat.letter] && extra.indexOf(seat.letter) === -1) {
                extra.push(seat.letter);
            }
        });

        return extra.length ? layout.groups.concat([extra.sort()]) : layout.groups;
    }

    function createSeatButton(seat) {
        var seatId = seat.label;
        var isOccupied = !seat.isAvailable;
        var button = document.createElement("button");
        button.type = "button";
        button.className = "seat " + (isOccupied ? "seat--occupied" : "seat--available");
        button.setAttribute("data-seat", seatId);
        button.setAttribute("data-seat-id", String(seat.id));
        button.textContent = seatId;

        if (seat.isExtraLegroom) {
            button.title = tr("api.seats.extraLegroom", "Extra legroom");
        }

        if (isOccupied) {
            button.disabled = true;
            button.setAttribute("aria-label", tr("seats.seatOccupiedAria", "Seat " + seatId + " occupied", { id: seatId }));
        } else {
            button.setAttribute("aria-label", tr("seats.seatAria", "Seat " + seatId, { id: seatId }));
            button.setAttribute("aria-pressed", "false");
        }

        return button;
    }

    function syncSeatButtonStates() {
        var map = document.getElementById("seat-map");
        if (!map) {
            return;
        }

        var selectedLookup = {};
        selectedSeats.forEach(function (seatId) {
            selectedLookup[seatId] = true;
        });

        map.querySelectorAll(".seat").forEach(function (seatButton) {
            if (seatButton.classList.contains("seat--occupied") || seatButton.disabled) {
                return;
            }

            var seatId = seatButton.getAttribute("data-seat");
            var isSelected = !!selectedLookup[seatId];

            seatButton.classList.toggle("seat--selected", isSelected);
            seatButton.classList.toggle("seat--available", !isSelected);
            seatButton.setAttribute("aria-pressed", isSelected ? "true" : "false");
        });
    }

    /* The seats, their numbers and who has them come from the API; the layout only places the aisles. */
    function renderSeatMap(layout, seats) {
        var cabin = document.getElementById("aircraft-cabin");
        var columns = document.getElementById("seat-columns");
        var map = document.getElementById("seat-map");
        var sectionLabel = document.getElementById("cabin-section-label");

        if (!cabin || !columns || !map) {
            return;
        }

        cabin.setAttribute("data-layout", layout.key);
        cabin.style.setProperty("--seat-gap", layout.seatGap);
        cabin.style.setProperty("--group-gap", layout.groupGap);

        if (sectionLabel) {
            sectionLabel.textContent = tr(layout.labelKey, layout.label);
        }

        var groups = seatGroups(layout, seats);
        columns.innerHTML = buildColumnHeaders(groups);
        map.innerHTML = "";

        var rows = {};
        seats.forEach(function (seat) {
            rows[seat.rowNumber] = rows[seat.rowNumber] || {};
            rows[seat.rowNumber][seat.letter] = seat;
        });

        Object.keys(rows).map(Number).sort(function (a, b) { return a - b; }).forEach(function (row) {
            var rowElement = document.createElement("div");
            rowElement.className = "seat-row";

            var rowNumber = document.createElement("span");
            rowNumber.className = "row-number";
            rowNumber.textContent = String(row);
            rowElement.appendChild(rowNumber);

            groups.forEach(function (group, groupIndex) {
                var groupElement = document.createElement("div");
                groupElement.className = "seat-group";
                groupElement.style.gridTemplateColumns = "repeat(" + group.length + ", var(--seat-size))";

                group.forEach(function (letter) {
                    var seat = rows[row][letter];
                    if (seat) {
                        groupElement.appendChild(createSeatButton(seat));
                    } else {
                        var gap = document.createElement("span");
                        gap.className = "seat-placeholder";
                        gap.setAttribute("aria-hidden", "true");
                        groupElement.appendChild(gap);
                    }
                });

                rowElement.appendChild(groupElement);

                if (groupIndex < groups.length - 1) {
                    var aisle = document.createElement("div");
                    aisle.className = "seat-aisle";
                    aisle.setAttribute("aria-hidden", "true");
                    rowElement.appendChild(aisle);
                }
            });

            map.appendChild(rowElement);
        });

        syncSeatButtonStates();
    }

    function toggleSeat(seatButton, flightData) {
        if (!seatButton || seatButton.disabled || seatButton.classList.contains("seat--occupied")) {
            return;
        }

        var seatId = seatButton.getAttribute("data-seat");
        if (!seatId) {
            return;
        }

        var existingIndex = selectedSeats.indexOf(seatId);

        if (existingIndex !== -1) {
            selectedSeats.splice(existingIndex, 1);
            showMessage("");
        } else {
            if (selectedSeats.length >= requiredSeats) {
                showMessage(
                    requiredSeats === 1
                        ? tr("seats.maxSeatOne", "You can select up to 1 seat.")
                        : tr("seats.maxSeats", "You can select up to " + requiredSeats + " seats.", { count: requiredSeats })
                );
                return;
            }

            selectedSeats.push(seatId);
            showMessage("");
        }

        syncSeatButtonStates();
        updateSelectedSeatSummary();
        persistSelectedSeats(flightData);
    }

    function bindSeatInteractions(flightData) {
        var map = document.getElementById("seat-map");
        if (!map) {
            return;
        }

        map.addEventListener("click", function (event) {
            var seatButton = event.target.closest(".seat");
            if (!seatButton || !map.contains(seatButton)) {
                return;
            }

            toggleSeat(seatButton, flightData);
        });
    }

    function getRemainingSeatsMessage() {
        var remaining = requiredSeats - selectedSeats.length;

        if (remaining <= 0) {
            return "";
        }

        if (selectedSeats.length === 0) {
            return requiredSeats === 1
                ? tr("seats.validation", "Please select a seat to continue.")
                : tr("seats.selectN", "Please select " + requiredSeats + " seats to continue.", { count: requiredSeats });
        }

        return remaining === 1
            ? tr("seats.selectOneMore", "Please select 1 more seat.")
            : tr("seats.selectMore", "Please select " + remaining + " more seats.", { count: remaining });
    }

    function bindContinue(flightData) {
        var continueButton = document.getElementById("continue-button") ||
            document.querySelector(".continue-button");

        if (!continueButton) {
            return;
        }

        continueButton.addEventListener("click", function (event) {
            event.preventDefault();

            if (selectedSeats.length !== requiredSeats) {
                showMessage(getRemainingSeatsMessage());
                return;
            }

            showMessage("");
            persistSelectedSeats(flightData);

            // A round trip goes on to the return flight first; everything else goes to the passenger details.
            var saved = readSelectedFlight();
            window.location.href = window.AEROVA_JOURNEY && saved ? window.AEROVA_JOURNEY.afterSeats(saved) : "passenger-details.html";
        });
    }

    var currentFlightData = null;
    var seatList = null;
    var seatIdByLabel = {};
    var statusSpec = null;

    function paintStatus() {
        var cabin = document.getElementById("aircraft-cabin");
        var panel = document.getElementById("seat-status");
        if (!panel) {
            return;
        }

        if (cabin) {
            cabin.hidden = !!statusSpec;
        }

        if (!statusSpec) {
            panel.hidden = true;
            panel.innerHTML = "";
            return;
        }

        var spec = statusSpec;
        panel.hidden = false;
        panel.setAttribute("role", spec.kind === "error" ? "alert" : "status");
        panel.innerHTML =
            '<h2 class="seat-status-title">' + escapeHtml(tr(spec.titleKey, spec.titleFallback)) + "</h2>" +
            '<p class="seat-status-text">' + escapeHtml(spec.text || tr(spec.textKey, spec.textFallback)) + "</p>" +
            (spec.retry ? '<button type="button" class="continue-button seat-retry">' + escapeHtml(tr("api.search.retry", "Try again")) + "</button>" : "");

        var retryButton = panel.querySelector(".seat-retry");
        if (retryButton) {
            retryButton.addEventListener("click", loadSeats);
        }
    }

    function setStatus(spec) {
        statusSpec = spec;
        paintStatus();
    }

    /* The seat map of this flight and cabin from the API: ids, numbers and who is already taken. */
    function loadSeats() {
        var flightData = currentFlightData;
        var flightId = Number(flightData && flightData.id);
        var cabin = cabinClassForLayout(activeLayout);

        seatList = null;
        seatIdByLabel = {};
        selectedSeats = [];
        updateSelectedSeatSummary();

        if (!(flightId > 0) || Math.floor(flightId) !== flightId) {
            setStatus({ kind: "notice", titleKey: "api.seats.noFlightTitle", titleFallback: "No flight selected", textKey: "api.seats.noFlightText", textFallback: "Choose a flight first, then select your seats." });
            return;
        }

        setStatus({ kind: "loading", titleKey: "api.seats.loadingTitle", titleFallback: "Loading seat map", textKey: "api.seats.loadingText", textFallback: "Please wait while we load the seats." });

        window.AEROVA_API.get("api/flights/" + flightId + "/seats", { query: { cabinClass: cabin } }).then(function (map) {
            var seats = ((map && map.seats) || []).filter(function (seat) {
                return seat.cabinClass === cabin;
            });

            if (!seats.length) {
                setStatus({ kind: "notice", titleKey: "api.seats.noSeatsTitle", titleFallback: "No seats to show", textKey: "api.seats.noSeatsText", textFallback: "This cabin has no seats on this flight." });
                return;
            }

            var stored = normalizeStoredSeats(flightData);
            seatList = seats;
            seats.forEach(function (seat) {
                seatIdByLabel[seat.label] = seat.id;
            });
            selectedSeats = restoreSeats(stored, flightData, flightId, cabin, seats).slice(0, requiredSeats);

            if (stored.length && selectedSeats.length !== stored.length) {
                /* Drop seats that are gone or taken so later steps never see them. */
                persistSelectedSeats(flightData);
            }

            setStatus(null);
            renderSeatMap(activeLayout, seats);
            updateSelectedSeatSummary();
        }).catch(function (error) {
            var isApiError = window.AEROVA_API && error instanceof window.AEROVA_API.ApiError;

            if (isApiError && error.status === 404) {
                setStatus({ kind: "notice", titleKey: "api.details.notFoundTitle", titleFallback: "This flight is not available", textKey: "api.details.notFoundText", textFallback: "It may have been removed or changed. Please search again." });
                return;
            }

            if (!isApiError && window.console) {
                window.console.error(error);
            }

            setStatus({ kind: "error", titleKey: "api.seats.errorTitle", titleFallback: "We could not load the seat map", text: isApiError ? error.userMessage : tr("api.errors.generic", "Something went wrong. Please try again."), retry: true });
        });
    }

    function init() {
        var flightData = readSelectedFlight();
        currentFlightData = flightData;
        activeLayout = resolveCabinLayout(flightData && flightData.cabinClass);
        requiredSeats = resolvePassengerCount(flightData);

        populateFlightSummary(flightData, activeLayout);
        updateSelectedSeatSummary();
        bindSeatInteractions(flightData);
        bindContinue(flightData);
        loadSeats();
    }

    function refreshForLanguage() {
        populateFlightSummary(currentFlightData, activeLayout);
        if (seatList) {
            renderSeatMap(activeLayout, seatList);
        } else {
            paintStatus();
        }
        updateSelectedSeatSummary();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
    window.addEventListener("aerova:languagechange", function () {
        refreshForLanguage();
    });
})();
