(function () {
    "use strict";

    var STORAGE_KEY = "aerova.brandIntroSeen";
    var JET = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g transform="rotate(90 12 12)"><path d="M12 2c.9 0 1.6 1.3 1.6 3.4V9l8.4 5.2v2.2l-8.4-2.4v4.1l2.2 1.6V22L12 20.8 8.2 22v-1.5l2.2-1.6V14L2 16.4v-2.2L10.4 9V5.4C10.4 3.3 11.1 2 12 2z"/></g></svg>';
    var HANDOFF_AT_MS = 3600;
    var EXIT_MS = 1200;
    var SAFETY_MS = 8500;

    function markSeen() {
        try {
            sessionStorage.setItem(STORAGE_KEY, "1");
        } catch (error) { /* ignore */ }
    }

    function shouldRun() {
        if (!document.getElementById("hero")) {
            return false;
        }
        try {
            if (sessionStorage.getItem(STORAGE_KEY) === "1") {
                return false;
            }
        } catch (error) {
            return false;
        }
        return true;
    }

    function revealSiteChrome() {
        var header = document.getElementById("site-header");
        var main = document.querySelector("main");
        var footer = document.querySelector(".site-footer");
        if (header) header.style.visibility = "visible";
        if (main) main.style.visibility = "visible";
        if (footer) footer.style.visibility = "visible";
    }

    function finish(introEl) {
        markSeen();
        document.documentElement.classList.remove("is-brand-intro-pending", "is-brand-intro-handoff");
        if (introEl && introEl.parentNode) {
            introEl.classList.add("is-done");
            introEl.remove();
        }
        window.dispatchEvent(new CustomEvent("aerova:intro-complete"));
    }

    function buildIntro() {
        var root = document.createElement("div");
        root.className = "brand-intro";
        root.setAttribute("role", "presentation");
        root.innerHTML =
            '<div class="brand-intro__vignette" aria-hidden="true"></div>' +
            '<div class="brand-intro__stage">' +
            '  <div class="brand-intro__wordmark" aria-hidden="true"></div>' +
            '</div>';

        var wordmark = root.querySelector(".brand-intro__wordmark");
        var name = "Aerova";
        for (var i = 0; i < name.length; i++) {
            var letter = document.createElement("span");
            letter.className = "brand-intro__letter";
            letter.style.setProperty("--i", String(i));
            letter.textContent = name.charAt(i);
            wordmark.appendChild(letter);
        }

        var jetWrap = document.createElement("span");
        jetWrap.className = "brand-intro__jet-wrap";
        jetWrap.innerHTML = JET + '<span class="brand-intro__jet-trail" aria-hidden="true"></span>';
        wordmark.appendChild(jetWrap);

        return root;
    }

    function startIntro(introEl, reduced) {
        var finished = false;
        var wordmark = introEl.querySelector(".brand-intro__wordmark");

        function handoff() {
            if (finished) return;
            if (wordmark) {
                wordmark.classList.add("is-fading");
            }
            document.documentElement.classList.add("is-brand-intro-handoff");
            revealSiteChrome();
            introEl.classList.add("is-handoff");
        }

        function complete() {
            if (finished) return;
            finished = true;
            finish(introEl);
        }

        var handoffDelay = reduced ? 400 : HANDOFF_AT_MS;
        var exitDelay = reduced ? 350 : EXIT_MS;

        setTimeout(handoff, handoffDelay);
        setTimeout(complete, handoffDelay + exitDelay);
        setTimeout(complete, SAFETY_MS);
    }

    function init() {
        if (!shouldRun()) {
            document.documentElement.classList.remove("is-brand-intro-pending");
            return;
        }

        document.documentElement.classList.add("is-brand-intro-pending");
        var introEl = buildIntro();
        document.body.appendChild(introEl);

        var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) {
            var letters = introEl.querySelectorAll(".brand-intro__letter");
            for (var i = 0; i < letters.length; i++) {
                letters[i].style.opacity = "1";
                letters[i].style.filter = "none";
            }
            var jet = introEl.querySelector(".brand-intro__jet-wrap");
            if (jet) {
                jet.style.opacity = "1";
            }
        }

        startIntro(introEl, reduced);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
