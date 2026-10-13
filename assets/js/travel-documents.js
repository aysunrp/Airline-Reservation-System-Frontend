/*
 * AEROVA travel document rules - MOCK CONFIGURATION (demo only).
 *
 * These rules drive which document types the passenger form offers for a
 * route and nationality. They are NOT officially verified entry, exit or
 * identification requirements. Real requirements change and must be
 * confirmed with the airline and the relevant authorities before travel.
 * Edit the tables below to change the demo behaviour.
 */
(function () {
    var CONFIG_VERSION = "mock-2026-10";

    /* Countries offered as nationality / issuing country (ISO 3166-1 alpha-2). */
    var COUNTRIES = [
        { code: "AZ", name: "Azerbaijan" },
        { code: "TR", name: "Turkey" },
        { code: "GE", name: "Georgia" },
        { code: "GB", name: "United Kingdom" },
        { code: "FR", name: "France" },
        { code: "AT", name: "Austria" },
        { code: "DE", name: "Germany" },
        { code: "AE", name: "United Arab Emirates" },
        { code: "RU", name: "Russia" },
        { code: "US", name: "United States" }
    ];

    /* Fallback airport/city -> country lookup when segments carry no country. */
    var AIRPORT_COUNTRIES = {
        GYD: "AZ", NAJ: "AZ", LHR: "GB", CDG: "FR", DXB: "AE", IST: "TR", TBS: "GE", VIE: "AT"
    };
    var CITY_COUNTRIES = {
        baku: "AZ", nakhchivan: "AZ", london: "GB", paris: "FR", dubai: "AE", istanbul: "TR", tbilisi: "GE", vienna: "AT"
    };

    /*
     * Document types. legacyLabel keeps the old free-text documentType values
     * ("Passport" / "ID Card") that existing code and bookings already use.
     * numberPattern / numberExample are mock formats for client-side checks.
     */
    var DOCUMENT_TYPES = {
        passport: {
            code: "passport",
            legacyLabel: "Passport",
            numberPattern: /^[A-Z0-9]{6,9}$/,
            numberExample: "C01234567",
            issuingCountry: "select",
            expiryRequired: true
        },
        az_id_card: {
            code: "az_id_card",
            legacyLabel: "ID Card",
            /* Mock format: "AA" + 7 digits (newer cards) or "AZE" + 8 digits (older cards). */
            numberPattern: /^(AA\d{7}|AZE\d{8})$/,
            numberExample: "AA1234567",
            issuingCountry: "AZ",
            expiryRequired: true
        }
    };

    /*
     * Rules (mock). Resolution:
     *  - domestic (every airport on the route in one country): domestic[country][nationality]
     *    or domestic[country].default;
     *  - international: for every country on the route other than the origin
     *    (stops and destination), international[country][nationality] or
     *    international[country].default or international.default; the offered
     *    list is the intersection, falling back to passport.
     * minValidityDays: document must stay valid this many days after the last travel date (mock).
     */
    var RULES = {
        domestic: {
            AZ: {
                AZ: ["az_id_card", "passport"],
                default: ["passport"]
            }
        },
        international: {
            default: { documents: ["passport"], minValidityDays: 0 },
            TR: {
                /* Mock, configurable: AZ ID card accepted for AZ citizens on direct AZ-TR travel. */
                AZ: ["passport", "az_id_card"],
                default: ["passport"]
            },
            AE: {
                default: ["passport"],
                minValidityDays: 180
            }
        }
    };

    function normalize(value) {
        return String(value || "").trim().toLowerCase();
    }

    function countryForPoint(point) {
        if (!point) return "";
        if (point.country) return point.country;
        if (point.code && AIRPORT_COUNTRIES[point.code]) return AIRPORT_COUNTRIES[point.code];
        return CITY_COUNTRIES[normalize(point.city)] || "";
    }

    /* Country codes along the route, origin first. */
    function routeCountries(flight) {
        var list = [];
        if (flight && Array.isArray(flight.segments) && flight.segments.length) {
            list.push(countryForPoint(flight.segments[0].from));
            flight.segments.forEach(function (segment) {
                list.push(countryForPoint(segment.to));
            });
        } else if (flight) {
            list.push(CITY_COUNTRIES[normalize(flight.from)] || "");
            list.push(CITY_COUNTRIES[normalize(flight.to)] || "");
        }
        return list;
    }

    function routeType(flight) {
        var countries = routeCountries(flight);
        if (countries.length < 2 || countries.some(function (code) { return !code; })) {
            return "international";
        }
        return countries.every(function (code) { return code === countries[0]; }) ? "domestic" : "international";
    }

    function allowedFor(entry, nationality) {
        if (!entry) return null;
        if (nationality && entry[nationality]) return entry[nationality];
        return entry.default && !entry.default.documents ? entry.default : null;
    }

    function intersect(a, b) {
        return a.filter(function (item) { return b.indexOf(item) !== -1; });
    }

    function documentOptions(flight, nationality) {
        var countries = routeCountries(flight);
        var type = routeType(flight);
        var docs;
        var minValidityDays = 0;

        if (type === "domestic") {
            var domestic = RULES.domestic[countries[0]];
            docs = allowedFor(domestic, nationality) || ["passport"];
        } else {
            var base = RULES.international.default;
            docs = null;
            minValidityDays = base.minValidityDays || 0;
            countries.slice(1).forEach(function (code) {
                var entry = RULES.international[code];
                var allowed = allowedFor(entry, nationality) || base.documents;
                docs = docs ? intersect(docs, allowed) : allowed.slice();
                if (entry && entry.minValidityDays > minValidityDays) minValidityDays = entry.minValidityDays;
            });
            if (!docs || !docs.length) docs = ["passport"];
        }

        return {
            routeType: type,
            countries: countries,
            documents: docs.filter(function (code) { return !!DOCUMENT_TYPES[code]; }),
            minValidityDays: minValidityDays
        };
    }

    function countryName(code) {
        for (var i = 0; i < COUNTRIES.length; i += 1) {
            if (COUNTRIES[i].code === code) return COUNTRIES[i].name;
        }
        return code || "";
    }

    function countryCodeFromName(value) {
        var text = normalize(value);
        for (var i = 0; i < COUNTRIES.length; i += 1) {
            if (normalize(COUNTRIES[i].name) === text || normalize(COUNTRIES[i].code) === text) return COUNTRIES[i].code;
        }
        return "";
    }

    window.AEROVA_TRAVEL_DOCS = {
        version: CONFIG_VERSION,
        isMock: true,
        countries: COUNTRIES,
        documentTypes: DOCUMENT_TYPES,
        rules: RULES,
        routeCountries: routeCountries,
        routeType: routeType,
        documentOptions: documentOptions,
        countryName: countryName,
        countryCodeFromName: countryCodeFromName
    };
})();
