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
    var returnField = document.getElementById("return-field");
    var returnInput = document.getElementById("return-date");

    function setTrip(tab) {
        tabs.forEach(function (item) {
            var active = item === tab;
            item.classList.toggle("is-active", active);
            item.setAttribute("aria-selected", active ? "true" : "false");
        });

        var oneWay = tab.getAttribute("data-trip") === "one-way";
        if (returnField && returnInput) {
            returnField.classList.toggle("is-disabled", oneWay);
            returnInput.disabled = oneWay;
        }
    }

    tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
            setTrip(tab);
        });
    });

    var swapButton = document.getElementById("swap-route-button");
    var fromInput = document.getElementById("from-input");
    var toInput = document.getElementById("to-input");

    if (swapButton && fromInput && toInput) {
        swapButton.addEventListener("click", function () {
            var fromValue = fromInput.value;
            fromInput.value = toInput.value;
            toInput.value = fromValue;
        });
    }
})();
