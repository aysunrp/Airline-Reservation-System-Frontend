(function () {
    var MONTH_NAMES = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    var CABIN_LAYOUTS = {
        Business: {
            key: "business",
            label: "Business Class",
            startRow: 1,
            endRow: 3,
            groups: [["A", "B"], ["C", "D"]],
            occupied: ["2B", "3C"],
            seatGap: "0.7rem",
            groupGap: "0.7rem"
        },
        Comfort: {
            key: "comfort",
            label: "Comfort",
            startRow: 5,
            endRow: 9,
            groups: [["A", "B"], ["C"], ["D", "E"]],
            occupied: ["6A", "7C", "8E"],
            seatGap: "0.55rem",
            groupGap: "0.55rem"
        },
        Economy: {
            key: "economy",
            label: "Economy",
            startRow: 11,
            endRow: 20,
            groups: [["A", "B", "C"], ["D", "E", "F"]],
            occupied: ["12B", "14D", "16A", "18F", "19C"],
            seatGap: "0.35rem",
            groupGap: "0.35rem"
        }
    };

    var selectedSeat = "";
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
            return "Date not selected";
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

        return day + " " + MONTH_NAMES[month - 1] + " " + year;
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

    function updateSelectedSeatSummary() {
        setText("selected-seat-value", selectedSeat || "No seat selected");
        setText("selected-seat-price", "Included");
    }

    function persistSelectedSeat(flightData) {
        var baseData = flightData && typeof flightData === "object" ? flightData : {};

        var updated = Object.assign({}, baseData, {
            selectedSeat: selectedSeat || "",
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
        setText("summary-cabin", layout.label);
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
            button.setAttribute("aria-label", "Seat " + seatId + " occupied");
        } else {
            button.setAttribute("aria-label", "Seat " + seatId);
            button.setAttribute("aria-pressed", "false");
        }

        return button;
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
    }

    function clearSeatSelection() {
        var map = document.getElementById("seat-map");
        if (!map) {
            return;
        }

        map.querySelectorAll(".seat--selected").forEach(function (seat) {
            seat.classList.remove("seat--selected");
            seat.classList.add("seat--available");
            seat.setAttribute("aria-pressed", "false");
        });
    }

    function selectSeat(seatButton, flightData) {
        if (!seatButton || seatButton.disabled || seatButton.classList.contains("seat--occupied")) {
            return;
        }

        var seatId = seatButton.getAttribute("data-seat");
        if (!seatId) {
            return;
        }

        clearSeatSelection();

        seatButton.classList.remove("seat--available");
        seatButton.classList.add("seat--selected");
        seatButton.setAttribute("aria-pressed", "true");

        selectedSeat = seatId;
        updateSelectedSeatSummary();
        showMessage("");
        persistSelectedSeat(flightData);
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

            selectSeat(seatButton, flightData);
        });
    }

    function getCurrentlySelectedSeat() {
        if (selectedSeat) {
            return selectedSeat;
        }

        var selectedButton = document.querySelector("#seat-map .seat--selected");
        if (selectedButton) {
            return selectedButton.getAttribute("data-seat") || "";
        }

        var storedFlight = readSelectedFlight();
        if (storedFlight && storedFlight.selectedSeat) {
            return String(storedFlight.selectedSeat);
        }

        return "";
    }

    function bindContinue(flightData) {
        var continueButton = document.getElementById("continue-button") ||
            document.querySelector(".continue-button");

        if (!continueButton) {
            return;
        }

        continueButton.addEventListener("click", function (event) {
            event.preventDefault();

            var seatToSave = getCurrentlySelectedSeat();
            if (!seatToSave) {
                showMessage("Please select a seat to continue.");
                return;
            }

            selectedSeat = seatToSave;
            showMessage("");
            persistSelectedSeat(flightData);
            window.location.href = "passenger-details.html";
        });
    }

    function init() {
        var flightData = readSelectedFlight();
        activeLayout = resolveCabinLayout(flightData && flightData.cabinClass);

        if (flightData && flightData.selectedSeat) {
            selectedSeat = String(flightData.selectedSeat);
        }

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
})();
