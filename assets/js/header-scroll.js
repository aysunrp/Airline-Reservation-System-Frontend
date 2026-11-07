/* Adds "is-scrolled" to the site header once the page has moved, so a header that floats over the hero gets a solid background. */
(function () {
    "use strict";

    var header = document.querySelector(".site-header");
    if (!header) return;

    function update() {
        header.classList.toggle("is-scrolled", (window.pageYOffset || document.documentElement.scrollTop) > 24);
    }

    window.addEventListener("scroll", update, { passive: true });
    update();
})();
