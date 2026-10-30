/* Read-only cabin seat layout preview. Renders AEROVA_SEAT_LAYOUTS; never reads or writes storage. */
(function () {
    var LAYOUTS = window.AEROVA_SEAT_LAYOUTS || {};
    var ORDER = ["Economy", "Comfort", "Business"];
    var LABEL_KEYS = { Economy: "seatPreview.economy", Comfort: "seatPreview.comfort", Business: "seatPreview.business" };
    var LABELS = { Economy: "Ekonom sinif", Comfort: "Komfort sinif", Business: "Biznes sinif" };
    var active = "Economy";

    function tr(key, fallback, vars) {
        if (typeof window.t === "function") {
            var value = window.t(key, vars);
            if (value && value !== key) return value;
        }
        return fallback;
    }

    function render() {
        var layout = LAYOUTS[active];
        var cabin = document.getElementById("aircraft-cabin");
        var columns = document.getElementById("seat-columns");
        var map = document.getElementById("seat-map");
        if (!layout || !cabin || !columns || !map) return;

        var label = tr(LABEL_KEYS[active], LABELS[active]);
        cabin.setAttribute("data-layout", layout.key);
        cabin.style.setProperty("--seat-gap", layout.seatGap);
        cabin.style.setProperty("--group-gap", layout.groupGap);
        document.getElementById("cabin-section-label").textContent = label;

        columns.innerHTML = "";
        layout.groups.forEach(function (group, groupIndex) {
            group.forEach(function (letter) {
                var span = document.createElement("span");
                span.textContent = letter;
                columns.appendChild(span);
            });
            if (groupIndex < layout.groups.length - 1) {
                var gap = document.createElement("span");
                gap.className = "seat-columns-aisle";
                columns.appendChild(gap);
            }
        });

        map.innerHTML = "";
        for (var row = layout.startRow; row <= layout.endRow; row += 1) {
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
                    var seat = document.createElement("span");
                    seat.className = "seat seat--available seat--preview";
                    seat.textContent = String(row) + letter;
                    groupElement.appendChild(seat);
                });
                rowElement.appendChild(groupElement);
                if (groupIndex < layout.groups.length - 1) {
                    var aisle = document.createElement("div");
                    aisle.className = "seat-aisle";
                    rowElement.appendChild(aisle);
                }
            });
            map.appendChild(rowElement);
        }

        var config = layout.groups.map(function (group) { return group.length; }).join("-");
        document.getElementById("seat-preview-summary").textContent = tr(
            "seatPreview.summary",
            label + ": rows " + layout.startRow + "–" + layout.endRow + ", " + config + " seating",
            { cabin: label, from: layout.startRow, to: layout.endRow, config: config }
        );
    }

    function select(cabin, focus) {
        active = cabin;
        var panel = document.getElementById("seat-preview-tabpanel");
        document.querySelectorAll(".seat-preview-tab").forEach(function (tab) {
            var on = tab.getAttribute("data-cabin") === cabin;
            tab.setAttribute("aria-selected", on ? "true" : "false");
            tab.tabIndex = on ? 0 : -1;
            if (on) {
                if (panel) panel.setAttribute("aria-labelledby", tab.id);
                if (focus) tab.focus();
            }
        });
        render();
    }

    function init() {
        var list = document.querySelector(".seat-preview-tabs");
        if (!list) return;
        list.addEventListener("click", function (event) {
            var tab = event.target.closest(".seat-preview-tab");
            if (tab) select(tab.getAttribute("data-cabin"), false);
        });
        list.addEventListener("keydown", function (event) {
            var index = ORDER.indexOf(active);
            var next = null;
            if (event.key === "ArrowRight" || event.key === "ArrowDown") next = ORDER[(index + 1) % ORDER.length];
            else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = ORDER[(index + ORDER.length - 1) % ORDER.length];
            else if (event.key === "Home") next = ORDER[0];
            else if (event.key === "End") next = ORDER[ORDER.length - 1];
            if (next) {
                event.preventDefault();
                select(next, true);
            }
        });
        select(active, false);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
