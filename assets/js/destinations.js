(function () {
    function applyFilter(value) {
        var items = document.querySelectorAll("[data-destination]");
        items.forEach(function (el) {
            var id = el.getAttribute("data-destination");
            var show = value === "all" || id === value;
            el.classList.toggle("is-filtered-out", !show);
            // also hide wrapper grids if both children hidden
        });
        // hide empty pair/strip wrappers
        document.querySelectorAll(".dest-pair, .dest-strip").forEach(function (wrap) {
            var kids = wrap.querySelectorAll("[data-destination]");
            var anyVisible = Array.prototype.some.call(kids, function (k) {
                return !k.classList.contains("is-filtered-out");
            });
            wrap.classList.toggle("is-filtered-out", !anyVisible);
        });
    }

    function init() {
        var chips = document.querySelectorAll(".dest-filter__chip");
        if (!chips.length) return;
        chips.forEach(function (chip) {
            chip.addEventListener("click", function () {
                chips.forEach(function (c) { c.classList.remove("is-active"); });
                chip.classList.add("is-active");
                applyFilter(chip.getAttribute("data-filter") || "all");
            });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
