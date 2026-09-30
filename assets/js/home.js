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
    var card = document.getElementById("flight-search-card");
    if (!card) {
        return;
    }

    var tabs = card.querySelectorAll(".search-tab");
    var routeFields = document.getElementById("route-fields");
    var departureField = document.getElementById("departure-field");
    var returnField = document.getElementById("return-field");
    var multiPanel = document.getElementById("home-multi");
    var segmentList = document.getElementById("home-segment-list");
    var addFlight = document.getElementById("home-add-flight");
    var swapButton = document.getElementById("swap-route-button");
    var fromInput = document.getElementById("from-input");
    var toInput = document.getElementById("to-input");
    var maxSegments = 6;

    function setTrip(type) {
        card.classList.toggle("is-round-trip", type === "round-trip");
        card.classList.toggle("is-one-way", type === "one-way");
        card.classList.toggle("is-multi-city", type === "multi-city");

        tabs.forEach(function (tab) {
            var active = tab.getAttribute("data-trip") === type;
            tab.classList.toggle("is-active", active);
            tab.setAttribute("aria-selected", active ? "true" : "false");
        });

        if (routeFields) {
            routeFields.hidden = type === "multi-city";
        }
        if (departureField) {
            departureField.hidden = type === "multi-city";
        }
        if (returnField) {
            returnField.hidden = type !== "round-trip";
            returnField.classList.remove("is-disabled");
        }
        if (multiPanel) {
            multiPanel.hidden = type !== "multi-city";
        }
    }

    tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
            setTrip(tab.getAttribute("data-trip"));
        });
    });

    if (swapButton && fromInput && toInput) {
        swapButton.addEventListener("click", function () {
            var fromValue = fromInput.value;
            fromInput.value = toInput.value;
            toInput.value = fromValue;
        });
    }

    if (!segmentList || !addFlight) {
        return;
    }

    function segments() {
        return segmentList.querySelectorAll(".home-segment");
    }

    function refreshSegments() {
        var items = segments();
        items.forEach(function (segment, index) {
            var number = index + 1;
            segment.querySelector(".home-segment-name").textContent = "Flight " + number;
            segment.querySelector(".from-input").setAttribute("aria-label", "Flight " + number + " from");
            segment.querySelector(".to-input").setAttribute("aria-label", "Flight " + number + " to");
            segment.querySelector(".segment-date").setAttribute("aria-label", "Flight " + number + " departure");
            segment.querySelector('[data-voice="from"]').setAttribute("aria-label", "Voice input for flight " + number + " departure");
            segment.querySelector('[data-voice="to"]').setAttribute("aria-label", "Voice input for flight " + number + " destination");
            segment.querySelector(".segment-remove").hidden = items.length < 3;
        });
        addFlight.hidden = items.length >= maxSegments;
    }

    addFlight.addEventListener("click", function () {
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

    segmentList.addEventListener("click", function (event) {
        var remove = event.target.closest(".segment-remove");
        if (remove && segments().length > 2) {
            remove.closest(".home-segment").remove();
            refreshSegments();
        }
    });

    refreshSegments();
})();

(function () {
    var images = document.querySelectorAll(".destination-image");

    images.forEach(function (image) {
        function hideMissingImage() {
            image.classList.add("is-missing");
        }

        if (image.complete && image.naturalWidth === 0) {
            hideMissingImage();
        }

        image.addEventListener("error", hideMissingImage);
    });
})();

(function () {
    var form = document.getElementById("newsletter-form");
    var input = document.getElementById("newsletter-email");
    var message = document.getElementById("newsletter-message");

    if (!form || !input || !message) {
        return;
    }

    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function showMessage(text, isError) {
        message.textContent = text;
        message.hidden = false;
        message.classList.toggle("is-error", isError);
        message.classList.toggle("is-success", !isError);
        input.setAttribute("aria-invalid", isError ? "true" : "false");
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        var email = input.value.trim();
        input.value = email;

        if (!email) {
            showMessage("Please enter your email address.", true);
            input.focus();
            return;
        }

        if (!emailPattern.test(email)) {
            showMessage("Please enter a valid email address.", true);
            input.focus();
            return;
        }

        showMessage("You're subscribed. Welcome to AEROVA.", false);
        input.value = "";
    });
})();
