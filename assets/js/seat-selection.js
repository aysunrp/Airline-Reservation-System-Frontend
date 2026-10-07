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

    var CABIN_LAYOUTS = {
        Business: {
            key: "business",
            label: "Business Class", labelKey: "seats.businessClass",
            startRow: 1,
            endRow: 3,
            groups: [["A", "B"], ["C", "D"]],
            occupied: ["2B", "3C"],
            seatGap: "0.7rem",
            groupGap: "0.7rem"
        },
        Comfort: {
            key: "comfort",
            label: "Comfort", labelKey: "common.comfort",
            startRow: 5,
            endRow: 9,
            groups: [["A", "B"], ["C"], ["D", "E"]],
            occupied: ["6A", "7C", "8E"],
            seatGap: "0.55rem",
            groupGap: "0.55rem"
        },
        Economy: {
            key: "economy",
            label: "Economy", labelKey: "common.economy",
            startRow: 11,
            endRow: 20,
            groups: [["A", "B", "C"], ["D", "E", "F"]],
            occupied: ["12B", "14D", "16A", "18F", "19C"],
            seatGap: "0.35rem",
            groupGap: "0.35rem"
        }
    };

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

    function resolvePassengerCount(flightData) {
        var count = Number(flightData && flightData.passengers);

        if (!count || count < 1) {
            return 1;
        }

        if (count > 4) {
            return 4;
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

        var updated = Object.assign({}, baseData, {
            selectedSeats: selectedSeats.slice(),
            selectedSeat: selectedSeats.length === 1 ? selectedSeats[0] : selectedSeats.join(", "),
            passengers: String(requiredSeats),
            cabinClass: activeLayout.label === "Business Class" ? "Business" : activeLayout.label
        });

        try {
            sessionStorage.setItem("aerovaSelectedFlight", JSON.stringify(updated));
        } catch (error) {
            // Storage may be unavailable.
        }
    }

    function populateFlightSummary(flightData, layout) {
        setText("summary-airline", (flightData && flightData.airline) || "AEROVA");
        setText("summary-flight", (flightData && flightData.flightNumber) || "AV 101");
        setText(
            "summary-route",
            ((flightData && flightData.from) || "Baku") + " → " + ((flightData && flightData.to) || "London")
        );
        setText(
            "summary-date",
            formatDisplayDate(flightData && flightData.departureDate)
        );
        setText(
            "summary-times",
            ((flightData && flightData.departure) || "09:30") +
                " → " +
                ((flightData && flightData.arrival) || "13:10")
        );
        setText("summary-aircraft", (flightData && flightData.aircraft) || "AEROVA 787-9");
        setText("summary-cabin", (layout.labelKey && typeof tr === "function") ? tr(layout.labelKey, layout.label) : layout.label);
    }

    function buildColumnHeaders(layout) {
        var markup = "";

        layout.groups.forEach(function (group, groupIndex) {
            group.forEach(function (letter) {
                markup += "<span>" + escapeHtml(letter) + "</span>";
            });

            if (groupIndex < layout.groups.length - 1) {
                markup += '<span class="seat-columns-aisle"></span>';
            }
        });

        return markup;
    }

    function createSeatButton(seatId, isOccupied) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "seat " + (isOccupied ? "seat--occupied" : "seat--available");
        button.setAttribute("data-seat", seatId);
        button.textContent = seatId;

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

    function renderSeatMap(layout) {
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
            sectionLabel.textContent = layout.label;
        }

        columns.innerHTML = buildColumnHeaders(layout);
        map.innerHTML = "";

        var occupiedLookup = {};
        layout.occupied.forEach(function (seatId) {
            occupiedLookup[seatId] = true;
        });

        var row;

        for (row = layout.startRow; row <= layout.endRow; row += 1) {
            var rowElement = document.createElement("div");
            rowElement.className = "seat-row";

            var rowNumber = document.createElement("span");
            rowNumber.className = "row-number";
            rowNumber.textContent = String(row);
            rowElement.appendChild(rowNumber);

            layout.groups.forEach(function (group, groupIndex) {
                var groupElement = document.createElement("div");
                groupElement.className = "seat-group";
                groupElement.style.gridTemplateColumns = "repeat(" + group.length + ", var(--seat-size))";

                group.forEach(function (letter) {
                    var seatId = String(row) + letter;
                    groupElement.appendChild(createSeatButton(seatId, !!occupiedLookup[seatId]));
                });

                rowElement.appendChild(groupElement);

                if (groupIndex < layout.groups.length - 1) {
                    var aisle = document.createElement("div");
                    aisle.className = "seat-aisle";
                    aisle.setAttribute("aria-hidden", "true");
                    rowElement.appendChild(aisle);
                }
            });

            map.appendChild(rowElement);
        }

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
            window.location.href = "passenger-details.html";
        });
    }

    function init() {
        var flightData = readSelectedFlight();
        activeLayout = resolveCabinLayout(flightData && flightData.cabinClass);
        requiredSeats = resolvePassengerCount(flightData);
        selectedSeats = normalizeStoredSeats(flightData).slice(0, requiredSeats);

        populateFlightSummary(flightData, activeLayout);
        renderSeatMap(activeLayout);
        updateSelectedSeatSummary();
        bindSeatInteractions(flightData);
        bindContinue(flightData);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
    window.addEventListener("aerova:languagechange", function () {
        if (typeof refreshSummary === 'function') { /* noop */ } if (typeof renderSeatMap === 'function') { try { init(); } catch (e) {} }
    });
})();
