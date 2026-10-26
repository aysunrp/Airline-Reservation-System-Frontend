/*
 * The AEROVA name in the header gets its animation: it is split into letters (so each can react when the jet flies through) and
 * the jet is added. The styles are in logo.css. Screen readers still read the name as one word.
 */
(function () {
    "use strict";

    var JET = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g transform="rotate(90 12 12)"><path d="M12 2c.9 0 1.6 1.3 1.6 3.4V9l8.4 5.2v2.2l-8.4-2.4v4.1l2.2 1.6V22L12 20.8 8.2 22v-1.5l2.2-1.6V14L2 16.4v-2.2L10.4 9V5.4C10.4 3.3 11.1 2 12 2z"/></g></svg>';

    function dress(element) {
        if (element.getAttribute("data-logo-ready")) return;

        var name = (element.textContent || "").trim();
        if (!name) return;

        element.setAttribute("data-logo-ready", "1");
        element.setAttribute("aria-label", name);
        element.textContent = "";

        for (var i = 0; i < name.length; i++) {
            var letter = document.createElement("span");
            letter.className = "logo-letter";
            letter.setAttribute("aria-hidden", "true");
            // Where the middle of the letter is along the name, 0 to 1: it decides when the jet reaches it.
            letter.style.setProperty("--at", ((i + 0.5) / name.length).toFixed(3));
            letter.textContent = name.charAt(i);
            element.appendChild(letter);
        }

        var jet = document.createElement("span");
        jet.className = "logo-jet";
        jet.setAttribute("aria-hidden", "true");
        jet.innerHTML = JET;
        element.appendChild(jet);
    }

    function init() {
        Array.prototype.forEach.call(document.querySelectorAll(".logo-text, .auth-logo-text, .admin-brand-text"), dress);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
