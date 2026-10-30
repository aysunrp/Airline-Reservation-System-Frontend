/*
 * The departure and destination picker of the flight search: an autocomplete dropdown fed by the backend (GET api/airports), where every
 * airport comes with its city and country from the destination catalog (airport -> city -> country). Nothing about a country is written here.
 *
 *   AEROVA_PICKER.bind(form);                          // inputs with class from-input / to-input (also the ones cloned later)
 *   AEROVA_PICKER.selection(input)                     // { airport, display } for what the input holds, or null
 *   AEROVA_PICKER.set(input, airportOrCodeOrText)      // select programmatically (URL prefill, voice, swap)
 *   AEROVA_PICKER.swap(fromInput, toInput)             // exchange the two selections
 *   AEROVA_PICKER.checkRoute(fromCode, toCode)         // Promise<boolean|null>: an active route joins them (null: could not be checked)
 *
 * The input shows "City, Country (IATA)"; the airport itself (id, code, names) is kept on the input, so the search uses the airport and not
 * the text. Typing again clears the choice until a suggestion is picked. Nothing is submitted by choosing a suggestion.
 * Needs api-client.js and airports.js first.
 */
(function () {
    "use strict";

    var directory = window.AEROVA_AIRPORTS;
    var api = window.AEROVA_API;
    var airports = [];
    var loaded = false;
    var loadFailed = false;
    var form = null;
    var panel = null;
    var activeInput = null;
    var options = [];
    var activeIndex = -1;
    var uid = 0;
    var MAX_RESULTS = 8;

    function tr(key, fallback, vars) {
        if (window.AEROVA_I18N && typeof window.AEROVA_I18N.t === "function") {
            var value = window.AEROVA_I18N.t(key, vars);
            if (value && value !== key) return value;
        }
        return String(fallback).replace(/\{(\w+)\}/g, function (_, name) { return vars && vars[name] != null ? String(vars[name]) : "{" + name + "}"; });
    }

    function language() {
        var active = window.AEROVA_I18N && typeof window.AEROVA_I18N.getLanguage === "function" ? window.AEROVA_I18N.getLanguage() : document.documentElement.lang;
        return active === "az" || active === "ru" ? active : "en";
    }

    function escapeHtml(value) {
        return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    /* Letters only, lower case, without accents: "İstanbul", "Istanbul" and "istanbul" are the same word; "ə" is read as "e". */
    function fold(value) {
        return String(value || "").toLowerCase().replace(/ə/g, "e").replace(/ı/g, "i").replace(/ё/g, "е")
            .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss");
    }

    function pick(airport, base) {
        var lang = language();
        var suffix = lang === "az" ? "Az" : lang === "ru" ? "Ru" : "";
        return airport[base + suffix] || airport[base] || "";
    }

    function cityName(airport) { return pick(airport, "cityName") || airport.city; }
    function countryName(airport) { return pick(airport, "countryName") || airport.countryCode || ""; }

    /* What the input shows once an airport is chosen: "London, United Kingdom (LHR)". */
    function display(airport) {
        var country = countryName(airport);
        return cityName(airport) + (country ? ", " + country : "") + " (" + airport.code + ")";
    }

    function haystack(airport) {
        return fold([airport.city, airport.cityNameAz, airport.cityNameRu, airport.countryName, airport.countryNameAz, airport.countryNameRu,
            airport.name, airport.code, airport.countryCode].concat(airport.aliases || []).join(" | "));
    }

    function load() {
        if (loaded) return Promise.resolve(airports);
        if (!directory) return Promise.reject(new Error("airports.js is missing."));
        return directory.load().then(function (list) {
            airports = (list || []).filter(function (airport) { return airport.isActive !== false; }).map(function (airport) {
                airport._search = haystack(airport);
                airport._words = airport._search.split(/[^a-z0-9Ѐ-ӿ]+/).filter(Boolean);
                return airport;
            });
            loaded = true;
            loadFailed = false;
            return airports;
        }, function (error) {
            loadFailed = true;
            throw error;
        });
    }

    function byCode(code) {
        var wanted = String(code || "").trim().toUpperCase();
        return airports.filter(function (airport) { return airport.code === wanted; })[0] || null;
    }

    function hubAirport() {
        return airports.filter(function (airport) { return airport.isHub; })[0] || null;
    }

    /* The airport a piece of text stands for: "(IATA)" at its end, an IATA code, or a city name (the airport with routes first). */
    function resolveText(text) {
        var value = String(text || "").trim();
        if (!value) return null;
        var coded = /\(([A-Za-z]{3})\)\s*$/.exec(value);
        if (coded) return byCode(coded[1]);
        var asCode = value.length === 3 ? byCode(value) : null;
        if (asCode) return asCode;

        var wanted = fold(value.replace(/,.*$/, "").trim());
        var matches = airports.filter(function (airport) {
            return [airport.city, airport.cityNameAz, airport.cityNameRu].concat(airport.aliases || []).some(function (name) { return fold(name) === wanted; });
        });
        matches.sort(function (a, b) { return Number(b.hasRoutes) - Number(a.hasRoutes) || a.code.localeCompare(b.code); });
        return matches[0] || null;
    }

    /* ---- the chosen airport of an input ---- */

    function selection(input) {
        if (!input) return null;
        var chosen = input._airport;
        if (chosen && input.value === input._display) return { airport: chosen, display: input._display };

        // The text was changed from outside (the price calendar, a saved search): read it again.
        var found = loaded ? resolveText(input.value) : null;
        if (found) {
            input._airport = found;
            input._display = display(found);
            return { airport: found, display: input._display };
        }
        return null;
    }

    function otherInput(input) {
        var pair = input.closest(".route-pair");
        if (!pair) return null;
        return pair.querySelector(input.classList.contains("from-input") ? ".to-input" : ".from-input");
    }

    function paint(input, airport) {
        input._airport = airport;
        input._display = airport ? display(airport) : "";
        input.value = input._display;
        input.removeAttribute("aria-invalid");
        input.classList.remove("is-invalid");
        showMeta(input);
        input.dispatchEvent(new CustomEvent("aerova:airportchange", { bubbles: true, detail: { airport: airport } }));
    }

    /* A small line under the input: the airport's name and, when it has no route yet, a note. The IATA code is already in the text. */
    function showMeta(input) {
        var control = input.closest(".field-control");
        if (!control) return;
        var meta = control.querySelector(".airport-meta");
        var chosen = selection(input);
        if (!chosen) {
            if (meta) meta.remove();
            return;
        }
        if (!meta) {
            meta = document.createElement("p");
            meta.className = "airport-meta";
            control.appendChild(meta);
        }
        meta.innerHTML = escapeHtml(chosen.airport.name) + (chosen.airport.hasRoutes ? "" :
            ' <span class="airport-meta-note">' + escapeHtml(tr("picker.noFlightsYet", "No scheduled flights yet")) + "</span>");
    }

    function set(input, value) {
        if (!input) return Promise.resolve(null);
        return load().then(function () {
            var airport = value && typeof value === "object" ? value : (typeof value === "string" && value.length === 3 && byCode(value)) || resolveText(value);
            if (airport) {
                paint(input, airport);
            } else {
                input.value = typeof value === "string" ? value : "";
                input._airport = null;
                input._display = "";
                showMeta(input);
            }
            return airport || null;
        }, function () { return null; });
    }

    function swap(fromInput, toInput) {
        var first = selection(fromInput);
        var second = selection(toInput);
        var firstText = fromInput.value;
        var secondText = toInput.value;

        if (first && second) {
            paint(fromInput, second.airport);
            paint(toInput, first.airport);
        } else {
            // A side that is not an airport yet (typed text) swaps as text.
            fromInput.value = secondText;
            toInput.value = firstText;
            fromInput._airport = null;
            toInput._airport = null;
            if (second) paint(fromInput, second.airport);
            if (first) paint(toInput, first.airport);
            showMeta(fromInput);
            showMeta(toInput);
        }
    }

    /* ---- searching ---- */

    function rank(airport, terms, typed) {
        var code = airport.code.toLowerCase();
        var city = fold(cityName(airport));
        if (code === typed) return 0;
        if (city === typed) return 1;
        if (city.indexOf(typed) === 0) return 2;
        if (code.indexOf(typed) === 0) return 3;
        if (fold(countryName(airport)).indexOf(typed) === 0) return 4;
        return 5;
    }

    function search(query, exclude) {
        var typed = fold(query).trim();
        var pool = airports.filter(function (airport) { return !exclude || airport.code !== exclude.code; });

        if (!typed) {
            // Nothing typed yet: the airports that can be flown to, then the rest.
            return pool.slice().sort(function (a, b) { return Number(b.hasRoutes) - Number(a.hasRoutes) || cityName(a).localeCompare(cityName(b)); }).slice(0, MAX_RESULTS);
        }

        var terms = typed.split(/\s+/);
        // Every typed word must start a word of the city, country, airport, code or alias (so "ist" finds Istanbul, not "Erebistani").
        return pool.filter(function (airport) {
            return terms.every(function (term) { return airport._words.some(function (word) { return word.indexOf(term) === 0; }); });
        }).sort(function (a, b) {
            return rank(a, terms, typed) - rank(b, terms, typed) || Number(b.hasRoutes) - Number(a.hasRoutes) || cityName(a).localeCompare(cityName(b));
        }).slice(0, MAX_RESULTS);
    }

    /* The typed text marked inside a label (accent-insensitive). */
    function highlight(text, query) {
        var typed = fold(query).trim();
        if (!typed) return escapeHtml(text);
        var folded = fold(text);
        var index = -1;
        for (var from = folded.indexOf(typed); from !== -1; from = folded.indexOf(typed, from + 1)) {
            if (from === 0 || /[^a-z0-9Ѐ-ӿ]/.test(folded.charAt(from - 1))) { index = from; break; }
        }
        if (index === -1 || folded.length !== text.length) return escapeHtml(text);
        return escapeHtml(text.slice(0, index)) + "<mark>" + escapeHtml(text.slice(index, index + typed.length)) + "</mark>" + escapeHtml(text.slice(index + typed.length));
    }

    var PLANE = '<svg class="airport-plane" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>';

    /* ---- the dropdown ---- */

    function ensurePanel() {
        if (panel) return panel;
        panel = document.createElement("div");
        panel.className = "airport-panel";
        panel.id = "airport-panel";
        panel.hidden = true;
        panel.setAttribute("role", "listbox");
        document.body.appendChild(panel);
        panel.addEventListener("mousedown", function (event) { event.preventDefault(); });
        panel.addEventListener("click", function (event) {
            var row = event.target.closest("[data-code]");
            if (row && activeInput) choose(activeInput, byCode(row.getAttribute("data-code")));
        });
        return panel;
    }

    function place(input) {
        var control = input.closest(".field-control") || input;
        var box = control.getBoundingClientRect();
        var width = Math.max(box.width, Math.min(380, window.innerWidth - 24));
        var left = Math.min(Math.max(12, box.left + window.scrollX), window.scrollX + window.innerWidth - width - 12);
        panel.style.width = width + "px";
        panel.style.left = left + "px";
        panel.style.top = (box.bottom + window.scrollY + 6) + "px";
    }

    function rowMarkup(airport, query, id, role) {
        var city = cityName(airport);
        var country = countryName(airport);
        var note = airport.hasRoutes ? "" : '<span class="airport-row-note">' + escapeHtml(tr("picker.noFlightsYet", "No scheduled flights yet")) + "</span>";
        return '<div class="airport-row" role="option" id="' + id + '" data-code="' + escapeHtml(airport.code) + '" aria-selected="false">' + PLANE +
            '<span class="airport-row-main"><span class="airport-row-title">' + highlight(city, query) + (country ? ", " + highlight(country, query) : "") + "</span>" +
            '<span class="airport-row-sub">' + highlight(airport.name, query) + note + "</span></span>" +
            '<span class="airport-row-code">' + highlight(airport.code, query) + "</span></div>";
    }

    function open(input) {
        if (!form || !input) return;
        activeInput = input;
        ensurePanel();

        var other = selection(otherInput(input));
        var query = input._typed != null ? input._typed : (selection(input) ? "" : input.value);
        var found = loaded ? search(query, other && other.airport) : [];
        var html;

        if (!loaded) {
            html = '<p class="airport-empty" role="status">' + escapeHtml(loadFailed ? tr("picker.loadError", "We could not load the destinations. Please try again.")
                : tr("picker.loading", "Loading destinations...")) + "</p>";
            options = [];
        } else if (!found.length) {
            html = '<p class="airport-empty" role="status">' + escapeHtml(tr("picker.noMatches", "No destination matches your search.")) + "</p>";
            options = [];
        } else {
            options = found;
            html = found.map(function (airport, index) { return rowMarkup(airport, query, "airport-option-" + index, input.classList.contains("from-input") ? "from" : "to"); }).join("");
        }

        panel.innerHTML = html + '<a class="airport-all" href="destinations.html">' + escapeHtml(tr("picker.allDestinations", "All destinations")) + "</a>";
        activeIndex = -1;
        panel.hidden = false;
        panel.classList.add("is-open");
        place(input);
        input.setAttribute("role", "combobox");
        input.setAttribute("aria-expanded", "true");
        input.setAttribute("aria-controls", "airport-panel");
        input.setAttribute("aria-autocomplete", "list");
        input.removeAttribute("aria-activedescendant");
    }

    function close() {
        if (panel) {
            panel.hidden = true;
            panel.classList.remove("is-open");
        }
        if (activeInput) {
            activeInput.setAttribute("aria-expanded", "false");
            activeInput.removeAttribute("aria-activedescendant");
        }
        activeInput = null;
        options = [];
        activeIndex = -1;
    }

    function highlightRow(index) {
        var rows = panel ? panel.querySelectorAll(".airport-row") : [];
        rows.forEach(function (row, position) {
            var on = position === index;
            row.classList.toggle("is-active", on);
            row.setAttribute("aria-selected", on ? "true" : "false");
            if (on && activeInput) {
                activeInput.setAttribute("aria-activedescendant", row.id);
                if (row.scrollIntoView) row.scrollIntoView({ block: "nearest" });
            }
        });
        activeIndex = index;
    }

    function choose(input, airport) {
        if (!airport) return;
        input._typed = null;
        paint(input, airport);
        close();
        input.focus();
    }

    /* ---- events (delegated, so cloned inputs work too) ---- */

    function isPickerInput(element) {
        return element && element.classList && (element.classList.contains("from-input") || element.classList.contains("to-input"));
    }

    function bind(root) {
        form = root;

        load().then(function () {
            // Inputs that already hold text (a link, the calendar) become real selections.
            root.querySelectorAll(".from-input, .to-input").forEach(function (input) {
                if (input.value.trim()) set(input, input.value);
            });
        }, function () { /* the dropdown says so when opened */ });

        root.addEventListener("focusin", function (event) {
            if (!isPickerInput(event.target)) return;
            event.target._typed = null;
            open(event.target);
            if (loaded) {
                event.target.select();
            } else {
                // The list is still coming: the panel says so and fills in when it is here.
                var waiting = event.target;
                load().then(function () { if (document.activeElement === waiting) open(waiting); }, function () { if (document.activeElement === waiting) open(waiting); });
            }
        });

        root.addEventListener("click", function (event) {
            if (isPickerInput(event.target) && (!panel || panel.hidden)) open(event.target);
        });

        root.addEventListener("input", function (event) {
            var input = event.target;
            if (!isPickerInput(input)) return;
            // Typing starts a new choice: the old airport no longer stands for the text.
            input._airport = null;
            input._display = "";
            input._typed = input.value;
            var meta = input.closest(".field-control");
            meta = meta ? meta.querySelector(".airport-meta") : null;
            if (meta) meta.remove();
            open(input);
        });

        root.addEventListener("keydown", function (event) {
            var input = event.target;
            if (!isPickerInput(input)) return;

            if (event.key === "Escape") {
                if (panel && !panel.hidden) { event.preventDefault(); close(); }
                return;
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                if (!panel || panel.hidden) open(input);
                if (!options.length) return;
                var next = event.key === "ArrowDown" ? (activeIndex + 1) % options.length : (activeIndex <= 0 ? options.length - 1 : activeIndex - 1);
                highlightRow(next);
                return;
            }
            if (event.key === "Enter" && panel && !panel.hidden && activeIndex >= 0 && options[activeIndex]) {
                event.preventDefault();
                choose(input, options[activeIndex]);
                return;
            }
            if (event.key === "Enter" && panel && !panel.hidden && options.length === 1 && input._typed) {
                event.preventDefault();
                choose(input, options[0]);
                return;
            }
            if (event.key === "Tab") close();
        });

        root.addEventListener("focusout", function (event) {
            var input = event.target;
            if (!isPickerInput(input)) return;
            window.setTimeout(function () {
                if (document.activeElement !== input) {
                    if (activeInput === input) close();
                    // Text that is exactly one airport (a code, a city) becomes that choice.
                    if (loaded && !selection(input) && input.value.trim()) {
                        var found = resolveText(input.value);
                        if (found) paint(input, found);
                    }
                }
            }, 120);
        });

        document.addEventListener("click", function (event) {
            if (!event.target.closest(".field-control") && !event.target.closest(".airport-panel")) close();
        });
        window.addEventListener("resize", function () { if (activeInput && panel && !panel.hidden) place(activeInput); });
        window.addEventListener("aerova:languagechange", function () {
            // The chosen airports are shown again in the new language.
            root.querySelectorAll(".from-input, .to-input").forEach(function (input) {
                if (input._airport) paint(input, input._airport);
            });
            if (activeInput) open(activeInput);
        });
    }

    /* Whether an active route joins the two airports. null when it could not be checked (the search then goes on and the results say what is there). */
    function checkRoute(fromCode, toCode) {
        if (!api) return Promise.resolve(null);
        return api.get("api/airports/route-check?origin=" + encodeURIComponent(fromCode) + "&destination=" + encodeURIComponent(toCode)).then(function (result) {
            return !!(result && result.exists);
        }, function () { return null; });
    }

    window.AEROVA_PICKER = {
        bind: bind, load: load, selection: selection, set: set, swap: swap, close: close, checkRoute: checkRoute,
        hub: function () { return load().then(hubAirport, function () { return null; }); },
        byCode: byCode, display: display, resolve: resolveText
    };
})();
