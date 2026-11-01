/* The mobile menu of the brand page: opens and closes the navigation, and closes it with Escape. */
(function () {
    var toggle = document.querySelector(".menu-toggle");
    var nav = document.getElementById("primary-navigation");
    if (!toggle || !nav) return;

    function setMenu(open) {
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        nav.classList.toggle("is-open", open);
    }

    toggle.addEventListener("click", function () {
        setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") setMenu(false);
    });
})();

/* Cabin details: one cabin is shown at a time; the hash (#economy, #comfort, #business) opens it. */
(function () {
    var CABINS = ["economy", "comfort", "business"];

    function showCabin(id, scroll) {
        if (CABINS.indexOf(id) === -1) return;
        var target = document.getElementById(id);
        if (!target) return;
        document.querySelectorAll(".brand-cabin-panel").forEach(function (panel) {
            panel.hidden = panel !== target;
        });
        if (scroll) {
            document.getElementById("cabin-detail").scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    document.querySelectorAll("[data-cabin-open]").forEach(function (link) {
        link.addEventListener("click", function (event) {
            event.preventDefault();
            var id = link.getAttribute("data-cabin-open");
            showCabin(id, true);
            history.replaceState(null, "", "#" + id);
        });
    });

    if (location.hash) {
        showCabin(location.hash.slice(1), true);
    }
})();
