(function () {
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
        toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
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
        if (window.innerWidth > 1080) {
            setMenu(false);
        }
    });
})();

(function () {
    var form = document.getElementById("booking-form");
    var multiPanel = document.getElementById("multi-city");
    var segmentList = document.getElementById("segment-list");
    var addSegment = document.getElementById("add-segment");
    var returnField = form ? form.querySelector(".booking-return") : null;
    var departureField = form ? form.querySelector(".booking-departure") : null;
    var routePair = form ? form.querySelector(":scope > .route-pair") : null;

    if (!form || !multiPanel || !segmentList || !addSegment || !returnField || !departureField || !routePair) {
        return;
    }

    var tabs = form.querySelectorAll(".booking-tab");
    var maxSegments = 6;
    var bookingSearch = {
        trip: "round-trip"
    };

    window.aerovaBookingSearch = bookingSearch;

    function setTrip(type) {
        bookingSearch.trip = type;
        form.classList.toggle("is-round-trip", type === "round-trip");
        form.classList.toggle("is-one-way", type === "one-way");
        form.classList.toggle("is-multi-city", type === "multi-city");

        tabs.forEach(function (tab) {
            var active = tab.getAttribute("data-trip") === type;
            tab.classList.toggle("is-active", active);
            tab.setAttribute("aria-selected", active ? "true" : "false");
        });

        routePair.hidden = type === "multi-city";
        departureField.hidden = type === "multi-city";
        returnField.hidden = type !== "round-trip";
        multiPanel.hidden = type !== "multi-city";
    }

    tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
            setTrip(tab.getAttribute("data-trip"));
        });
    });

    function segments() {
        return segmentList.querySelectorAll(".flight-segment");
    }

    function refreshSegments() {
        var items = segments();
        items.forEach(function (segment, index) {
            var number = index + 1;
            segment.querySelector(".segment-name").textContent = "Flight " + number;
            segment.querySelector(".from-input").setAttribute("aria-label", "Flight " + number + " from");
            segment.querySelector(".to-input").setAttribute("aria-label", "Flight " + number + " to");
            segment.querySelector(".segment-date").setAttribute("aria-label", "Flight " + number + " departure");
            segment.querySelector(".swap-button").setAttribute("aria-label", "Swap flight " + number + " departure and destination");
            segment.querySelector('[data-voice="from"]').setAttribute("aria-label", "Voice input for flight " + number + " departure");
            segment.querySelector('[data-voice="to"]').setAttribute("aria-label", "Voice input for flight " + number + " destination");
            segment.querySelector(".segment-remove").hidden = items.length < 3;
        });
        addSegment.hidden = items.length >= maxSegments;
    }

    form.addEventListener("click", function (event) {
        var swap = event.target.closest(".swap-button");
        if (swap && form.contains(swap)) {
            var pair = swap.closest(".route-pair");
            var fromInput = pair.querySelector(".from-input");
            var toInput = pair.querySelector(".to-input");
            var fromValue = fromInput.value;
            fromInput.value = toInput.value;
            toInput.value = fromValue;
            return;
        }

        var remove = event.target.closest(".segment-remove");
        if (remove && segmentList.contains(remove) && segments().length > 2) {
            remove.closest(".flight-segment").remove();
            refreshSegments();
        }
    });

    addSegment.addEventListener("click", function () {
        if (segments().length >= maxSegments) {
            return;
        }

        var clone = segments()[0].cloneNode(true);
        clone.querySelectorAll("input").forEach(function (input) {
            input.value = "";
        });
        segmentList.appendChild(clone);
        refreshSegments();
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();
    });

    refreshSegments();
})();
