/*
 * Brand intro (first visit of a session to the home page).
 *
 * Timeline (ms from the moment the scene starts; every number is a CSS variable on .brand-intro, see brand-intro.css):
 *      0 - 1200  the background light opens and then drifts slowly (CSS)
 *    500 - 2400  the jet flies from the lower left, over the top of the word and away to the upper right on a gentle arc; a thin gold line
 *                is drawn along its path and a tapering streak follows it
 *    ~700 - 2350 the letters of AEROVA open one after another, each just after the jet has passed over it (opacity, blur, 0.12em rise)
 *   ~2400 - 3700 the letters close in a little (the word "tightens"), the gold rule is drawn (2500) and the tagline rises (2750)
 *   3600 - 4800  the scene dissolves into the hero (the old hand-off is kept: is-handoff, then the site is revealed and the event fires)
 *
 * Everything that moves is a transform or an opacity (the letters also lose a small blur). Skip: click or tap anywhere, Escape or Enter,
 * or the small "Keç" button that appears after 1.8 s. With reduced motion nothing travels: the word fades in and the intro ends quickly.
 * If the device cannot keep up (fewer than about 8 frames a second early on), the animation is dropped and a short fade takes over. A safety timer ends the intro whatever happens.
 */
(function () {
    "use strict";

    var STORAGE_KEY = "aerova.brandIntroSeen";
    var SAFETY_MS = 8500;
    var NAME = "Aerova";
    var SVG_NS = "http://www.w3.org/2000/svg";

    /* An airliner seen from above, nose to the right: a rounded fuselage, swept wings with engines, a small tail. */
    var JET =
        '<svg viewBox="0 0 120 60" aria-hidden="true" focusable="false">' +
        '<path d="M70 27.4L41 3.5H29.5L48 27.4Z"/><path d="M70 32.6L41 56.5H29.5L48 32.6Z"/>' +
        '<path d="M13 28L3.5 15.5H-1L8.5 28Z"/><path d="M13 32L3.5 44.5H-1L8.5 32Z"/>' +
        '<path d="M8 29.4C8 28 11 27.2 15 27L95 26.2C108 26 118 28 118 30S108 34 95 33.8L15 33C11 32.8 8 32 8 30.6Z"/>' +
        '<ellipse cx="52" cy="17.4" rx="6.2" ry="2.1"/><ellipse cx="52" cy="42.6" rx="6.2" ry="2.1"/>' +
        '<path class="brand-intro__cockpit" d="M104 28.6C107 28.4 110 29 111.5 30C110 31 107 31.6 104 31.4Z"/>' +
        "</svg>";

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
        // The page gets its focus back: nothing of the intro stays focused.
        try {
            if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) {
                document.activeElement.blur();
            }
        } catch (error) { /* ignore */ }
        window.dispatchEvent(new CustomEvent("aerova:intro-complete"));
    }

    /* A number (milliseconds) from a CSS variable of the intro. */
    function cssNumber(element, name, fallback) {
        var value = parseFloat(getComputedStyle(element).getPropertyValue(name));
        return isFinite(value) ? value : fallback;
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /* The jet speeds up a little in the middle of its flight. */
    function flightProgress(t) {
        return 0.7 * t + 0.3 * (0.5 - 0.5 * Math.cos(Math.PI * t));
    }

    function buildIntro() {
        var root = document.createElement("div");
        root.className = "brand-intro";
        root.setAttribute("role", "presentation");
        root.innerHTML =
            '<div class="brand-intro__glow" aria-hidden="true"></div>' +
            '<div class="brand-intro__glow--low" aria-hidden="true"></div>' +
            '<div class="brand-intro__grain" aria-hidden="true"></div>' +
            '<div class="brand-intro__vignette" aria-hidden="true"></div>' +
            '<svg class="brand-intro__path" aria-hidden="true" focusable="false">' +
            '  <defs>' +
            '    <linearGradient id="brand-intro-line-gradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1" y2="0">' +
            '      <stop offset="0" stop-color="#e0c48a" stop-opacity="0"/><stop offset="0.55" stop-color="#e0c48a" stop-opacity="0.28"/><stop offset="1" stop-color="#f0d6a0" stop-opacity="0.7"/>' +
            '    </linearGradient>' +
            '    <linearGradient id="brand-intro-plane-gradient" x1="0" y1="0" x2="1" y2="0">' +
            '      <stop offset="0" stop-color="#c6a36a"/><stop offset="1" stop-color="#f0d6a0"/>' +
            '    </linearGradient>' +
            '  </defs>' +
            '  <path class="brand-intro__line" stroke="url(#brand-intro-line-gradient)" stroke-width="1.25"/>' +
            '</svg>' +
            '<div class="brand-intro__stage">' +
            '  <div class="brand-intro__word" aria-hidden="true"></div>' +
            '  <div class="brand-intro__rule" aria-hidden="true"></div>' +
            '  <p class="brand-intro__tagline" aria-hidden="true">Gözləntilərinizin fövqünə uçun</p>' +
            '</div>' +
            '<div class="brand-intro__plane" aria-hidden="true">' + JET + '<span class="brand-intro__trail"></span></div>' +
            '<button type="button" class="brand-intro__skip" aria-label="Giriş animasiyasını keç" tabindex="0">Keç</button>';

        var word = root.querySelector(".brand-intro__word");
        for (var i = 0; i < NAME.length; i++) {
            var letter = document.createElement("span");
            letter.className = "brand-intro__letter";
            letter.style.setProperty("--i", String(i));
            letter.textContent = NAME.charAt(i);
            word.appendChild(letter);
        }

        return root;
    }

    /* The flight path, in page pixels: it starts low on the left, rises above the capitals before it reaches the word and climbs away. */
    function planPath(root, planeW, planeH) {
        var width = window.innerWidth;
        var word = root.querySelector(".brand-intro__word").getBoundingClientRect();
        var fontSize = parseFloat(getComputedStyle(root.querySelector(".brand-intro__word")).fontSize) || 64;
        var centerY = word.top + word.height / 2;

        var x0 = -planeW * 1.6;
        var x1 = width + planeW * 1.6;
        var textLeft = word.left;
        var uLeft = (textLeft - x0) / (x1 - x0);
        var uRise = Math.max(0.1, uLeft - 0.04);

        // The jet clears the top of the capitals by half its own height plus a margin, all along the word.
        var yHigh = centerY - (0.52 * fontSize + 0.5 * planeH + 0.3 * fontSize);
        var yLow = yHigh + 1.7 * fontSize;
        var climb = 1.15 * fontSize;

        function point(u) {
            var y = u < uRise
                ? lerp(yLow, yHigh, easeOutCubic(u / uRise))
                : yHigh - ((u - uRise) / (1 - uRise)) * climb;
            return { x: lerp(x0, x1, u), y: y };
        }

        return { point: point, x0: x0, x1: x1, word: word };
    }

    function startIntro(introEl, reduced) {
        var finished = false;
        var handoffStarted = false;
        var animations = [];
        var timers = [];
        var stage = introEl.querySelector(".brand-intro__stage");

        var handoffAt = cssNumber(introEl, "--bi-handoff-at", 2900);
        var handoffDuration = cssNumber(introEl, "--bi-handoff-duration", 1100);

        function later(fn, ms) {
            var id = setTimeout(fn, ms);
            timers.push(id);
            return id;
        }

        function complete() {
            if (finished) return;
            finished = true;
            timers.forEach(clearTimeout);
            finish(introEl);
        }

        function handoff(fast) {
            if (handoffStarted || finished) return;
            handoffStarted = true;
            if (fast) {
                introEl.style.setProperty("--bi-handoff-duration", "380");
                handoffDuration = 380;
            }
            document.documentElement.classList.add("is-brand-intro-handoff");
            revealSiteChrome();
            introEl.classList.add("is-handoff");
            later(complete, handoffDuration + 60);
        }

        /* Skip: whatever is on the screen dissolves at once. */
        function skip() {
            if (finished) return;
            handoff(true);
        }

        introEl.addEventListener("pointerdown", skip);
        document.addEventListener("keydown", function onKey(event) {
            if (finished) {
                document.removeEventListener("keydown", onKey);
                return;
            }
            if (event.key === "Escape" || event.key === "Enter") {
                event.preventDefault();
                skip();
            }
        });

        var skipButton = introEl.querySelector(".brand-intro__skip");
        later(function () { if (skipButton) skipButton.classList.add("is-visible"); }, 1800);

        later(complete, SAFETY_MS);

        if (reduced || !introEl.animate) {
            // The CSS fades the word in (0.6 s); the intro ends shortly after.
            later(function () { handoff(false); }, reduced ? 1000 : 600);
            return;
        }

        /* The slow-device fallback: the moving parts are dropped and a plain fade takes over. */
        function simplify() {
            animations.forEach(function (animation) { try { animation.cancel(); } catch (error) { /* ignore */ } });
            animations = [];
            introEl.classList.add("is-simple");
            var letters = introEl.querySelectorAll(".brand-intro__letter");
            for (var i = 0; i < letters.length; i++) {
                letters[i].style.opacity = "1";
                letters[i].style.filter = "none";
                letters[i].style.transform = "none";
                letters[i].style.translate = "none";
            }
            var rule = introEl.querySelector(".brand-intro__rule");
            var tagline = introEl.querySelector(".brand-intro__tagline");
            if (rule) { rule.style.transform = "none"; }
            if (tagline) { tagline.style.opacity = "1"; tagline.style.transform = "none"; }
            ["brand-intro__plane", "brand-intro__path"].forEach(function (name) {
                var element = introEl.querySelector("." + name);
                if (element) element.style.display = "none";
            });
            later(function () { handoff(false); }, 500);
        }

        function run() {
            if (finished) return;

            var planeDelay = cssNumber(introEl, "--bi-plane-delay", 450);
            var planeDuration = cssNumber(introEl, "--bi-plane-duration", 1350);
            var ruleAt = cssNumber(introEl, "--bi-rule-at", 1850);
            var taglineAt = cssNumber(introEl, "--bi-tagline-at", 2050);

            var wordEl = introEl.querySelector(".brand-intro__word");
            var letters = introEl.querySelectorAll(".brand-intro__letter");
            var plane = introEl.querySelector(".brand-intro__plane");
            var pathSvg = introEl.querySelector(".brand-intro__path");
            var line = introEl.querySelector(".brand-intro__line");
            var trail = introEl.querySelector(".brand-intro__trail");
            var rule = introEl.querySelector(".brand-intro__rule");
            var tagline = introEl.querySelector(".brand-intro__tagline");

            var fontSize = parseFloat(getComputedStyle(wordEl).fontSize) || 64;
            var planeH = Math.max(18, fontSize * 0.5);
            var planeW = planeH * 2;
            plane.style.width = planeW + "px";
            plane.style.height = planeH + "px";

            var width = window.innerWidth;
            var height = window.innerHeight;
            pathSvg.setAttribute("width", String(width));
            pathSvg.setAttribute("height", String(height));
            pathSvg.setAttribute("viewBox", "0 0 " + width + " " + height);

            var plan = planPath(introEl, planeW, planeH);

            // Samples along the flight: where the jet is, which way it points and how long the drawn line is up to there.
            var STEPS = 56;
            var samples = [];
            var length = 0;
            var previous = null;
            for (var s = 0; s <= STEPS; s++) {
                var t = s / STEPS;
                var u = flightProgress(t);
                var p = plan.point(u);
                if (previous) length += Math.hypot(p.x - previous.x, p.y - previous.y);
                samples.push({ t: t, u: u, x: p.x, y: p.y, len: length });
                previous = p;
            }
            for (var k = 0; k < samples.length; k++) {
                var a = samples[Math.max(0, k - 1)];
                var b = samples[Math.min(samples.length - 1, k + 1)];
                samples[k].angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
            }

            var d = "M" + samples.map(function (item) { return item.x.toFixed(1) + " " + item.y.toFixed(1); }).join(" L");
            line.setAttribute("d", d);
            var gradient = pathSvg.querySelector("#brand-intro-line-gradient");
            gradient.setAttribute("x1", String(plan.x0));
            gradient.setAttribute("x2", String(plan.x1));
            line.style.strokeDasharray = length + " " + length;
            line.style.strokeDashoffset = String(length);

            // The jet: a transform per sample, so the arc stays smooth; it fades in at the start and out at the end.
            var planeFrames = samples.map(function (item) {
                return {
                    offset: item.t,
                    transform: "translate3d(" + (item.x - planeW / 2).toFixed(1) + "px," + (item.y - planeH / 2).toFixed(1) + "px,0) rotate(" + item.angle.toFixed(1) + "deg)",
                    opacity: item.t < 0.06 ? item.t / 0.06 : (item.t > 0.9 ? Math.max(0, (1 - item.t) / 0.1) : 1)
                };
            });
            plane.style.willChange = "transform, opacity";
            animations.push(plane.animate(planeFrames, { duration: planeDuration, delay: planeDelay, easing: "linear", fill: "both" }));

            // The line is drawn up to the jet, and fades once the jet is gone.
            line.style.willChange = "stroke-dashoffset, opacity";
            animations.push(line.animate(samples.map(function (item) {
                return { offset: item.t, strokeDashoffset: String(length - item.len), opacity: item.t > 0.85 ? 0.85 : 1 };
            }), { duration: planeDuration, delay: planeDelay, easing: "linear", fill: "both" }));
            animations.push(line.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1100, delay: planeDelay + planeDuration * 0.9, easing: "ease-in", fill: "forwards" }));

            // The streak behind the jet grows quickly, stays, and shrinks when the jet leaves.
            trail.style.willChange = "transform, opacity";
            animations.push(trail.animate([
                { offset: 0, transform: "scaleX(0)", opacity: 0 },
                { offset: 0.18, transform: "scaleX(0.85)", opacity: 0.95 },
                { offset: 0.8, transform: "scaleX(1)", opacity: 0.8 },
                { offset: 1, transform: "scaleX(0.4)", opacity: 0 }
            ], { duration: planeDuration, delay: planeDelay, easing: "ease-out", fill: "both" }));

            // Each letter opens just after the jet has flown over its middle.
            var wordRect = wordEl.getBoundingClientRect();
            var settleAt = planeDelay + planeDuration * 0.97;
            for (var i = 0; i < letters.length; i++) {
                var rect = letters[i].getBoundingClientRect();
                var middle = rect.left + rect.width / 2;
                var passed = samples[samples.length - 1];
                for (var m = 0; m < samples.length; m++) {
                    if (samples[m].x >= middle) { passed = samples[m]; break; }
                }
                var opens = planeDelay + passed.t * planeDuration + 110;
                letters[i].style.willChange = "transform, opacity, filter";
                animations.push(letters[i].animate([
                    { opacity: 0, filter: "blur(8px)", transform: "translateY(0.12em)" },
                    { opacity: 1, filter: "blur(0px)", transform: "translateY(0)" }
                ], { duration: 1100, delay: opens, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" }));
                // The word closes in: the letters slide together a little once all of them are open.
                var spread = (i - (letters.length - 1) / 2) * 0.07;
                animations.push(letters[i].animate([
                    { translate: spread + "em 0" },
                    { translate: "0 0" }
                ], { duration: 1300, delay: settleAt, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" }));
            }

            animations.push(rule.animate([
                { transform: "scaleX(0)", opacity: 0 },
                { transform: "scaleX(1)", opacity: 0.9 }
            ], { duration: 1200, delay: ruleAt, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "both" }));

            animations.push(tagline.animate([
                { opacity: 0, transform: "translateY(0.6em)" },
                { opacity: 1, transform: "translateY(0)" }
            ], { duration: 1200, delay: taglineAt, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" }));

            // The moving parts need no compositing hints once they have finished.
            later(function () {
                [plane, line, trail].concat(Array.prototype.slice.call(letters)).forEach(function (el) { el.style.willChange = "auto"; });
            }, planeDelay + planeDuration + 1500);

            // Frame check: from 0.3 s to 1.5 s a visible page that paints fewer than 10 frames (under about 8 per second) cannot play this.
            var frames = 0;
            var checking = false;
            (function tick() {
                if (finished) return;
                if (checking) frames += 1;
                requestAnimationFrame(tick);
            })();
            later(function () { checking = true; }, 300);
            later(function () {
                checking = false;
                if (frames < 10 && document.visibilityState === "visible" && !handoffStarted) simplify();
            }, 1500);

            later(function () { handoff(false); }, handoffAt);
            void wordRect;
            void stage;
        }

        // Start once the wordmark's own font is ready (its size decides where the jet flies); never wait longer than 0.7 s.
        var started = false;
        function go() {
            if (started) return;
            started = true;
            run();
        }
        if (document.fonts && document.fonts.load) {
            Promise.race([
                document.fonts.load('600 64px "Cinzel"', "AEROVA"),
                new Promise(function (resolve) { setTimeout(resolve, 700); })
            ]).then(go, go);
        } else {
            go();
        }
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
        startIntro(introEl, reduced);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
