(function () {
    function tr(key, fallback, vars) {
        if (typeof window.t === "function") {
            var value = window.t(key, vars);
            if (value && value !== key) return value;
        }
        return typeof vars === "object" && vars
            ? String(fallback).replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? String(vars[k]) : "{" + k + "}"; })
            : fallback;
    }

    var DESTINATIONS = {
        baku: {
            id: "baku",
            nameKey: "destinationDetails.places.baku.name",
            name: "Baku",
            regionKey: "destinations.countryAzerbaijan",
            region: "Azerbaijan",
            taglineKey: "destinationDetails.places.baku.tagline",
            tagline: "Flame Towers, Caspian breezes, and a city where heritage meets modern light.",
            descriptionKey: "destinationDetails.places.baku.description",
            description: "AEROVA’s home city unfolds between the Caspian shoreline and the Old City’s stone lanes. Evenings glow against the Flame Towers, while modern avenues and quiet courtyards share the same horizon. Begin or continue your journey from the heart of our network.",
            image: "assets/images/baku.jpg",
            imageAltKey: "destinationDetails.places.baku.imageAlt",
            imageAlt: "Baku skyline on the Caspian coast",
            airportNameKey: "destinationDetails.places.baku.airportName",
            airportName: "Heydar Aliyev International Airport",
            iata: "GYD",
            airportLocationKey: "destinationDetails.places.baku.airportLocation",
            airportLocation: "Baku, Azerbaijan",
            durationKey: "destinationDetails.places.baku.duration",
            durationFromBaku: "Home base",
            baggage: [
                { labelKey: "destinationDetails.bagCabin", label: "Cabin", textKey: "destinationDetails.bagCabinText", text: "1 × 8 kg hand baggage" },
                { labelKey: "destinationDetails.bagChecked", label: "Checked", textKey: "destinationDetails.bagCheckedText", text: "1 × 23 kg included on Economy" },
                { labelKey: "destinationDetails.bagExtra", label: "Extra", textKey: "destinationDetails.places.baku.bagExtra", text: "Additional pieces available at booking" }
            ]
        },
        london: {
            id: "london",
            nameKey: "destinationDetails.places.london.name",
            name: "London",
            regionKey: "destinations.countryUk",
            region: "United Kingdom",
            taglineKey: "destinationDetails.places.london.tagline",
            tagline: "Royal avenues, river mist, and a capital of quiet, enduring grandeur.",
            descriptionKey: "destinationDetails.places.london.description",
            description: "Arrive into a city of measured elegance — museums at dawn, the Thames at dusk, and neighborhoods that reward unhurried wandering. AEROVA connects Baku to London with service shaped for composure from gate to gate.",
            image: "assets/images/london.jpg",
            imageAltKey: "destinationDetails.places.london.imageAlt",
            imageAlt: "London along the River Thames",
            airportNameKey: "destinationDetails.places.london.airportName",
            airportName: "London Heathrow Airport",
            iata: "LHR",
            airportLocationKey: "destinationDetails.places.london.airportLocation",
            airportLocation: "Hounslow, Greater London",
            durationKey: "destinationDetails.places.london.duration",
            durationFromBaku: "Approx. 5h 25m",
            baggage: [
                { labelKey: "destinationDetails.bagCabin", label: "Cabin", textKey: "destinationDetails.bagCabinText", text: "1 × 8 kg hand baggage" },
                { labelKey: "destinationDetails.bagChecked", label: "Checked", textKey: "destinationDetails.bagCheckedText", text: "1 × 23 kg included on Economy" },
                { labelKey: "destinationDetails.bagComfortPlus", label: "Comfort+", textKey: "destinationDetails.places.london.bagExtra", text: "2 × 23 kg on Comfort and Business" }
            ]
        },
        dubai: {
            id: "dubai",
            nameKey: "destinationDetails.places.dubai.name",
            name: "Dubai",
            regionKey: "destinations.countryUae",
            region: "United Arab Emirates",
            taglineKey: "destinationDetails.places.dubai.tagline",
            tagline: "Skyline brilliance, desert calm, and evenings composed for arrival.",
            descriptionKey: "destinationDetails.places.dubai.description",
            description: "From desert light to waterfront towers, Dubai balances spectacle with stillness. AEROVA’s short hop from Baku places you at the gateway to Gulf hospitality, shopping, and shoreline evenings.",
            image: "assets/images/dubai.jpg",
            imageAltKey: "destinationDetails.places.dubai.imageAlt",
            imageAlt: "Dubai skyline at dusk",
            airportNameKey: "destinationDetails.places.dubai.airportName",
            airportName: "Dubai International Airport",
            iata: "DXB",
            airportLocationKey: "destinationDetails.places.dubai.airportLocation",
            airportLocation: "Garhoud, Dubai",
            durationKey: "destinationDetails.places.dubai.duration",
            durationFromBaku: "Approx. 3h 10m",
            baggage: [
                { labelKey: "destinationDetails.bagCabin", label: "Cabin", textKey: "destinationDetails.bagCabinText", text: "1 × 8 kg hand baggage" },
                { labelKey: "destinationDetails.bagChecked", label: "Checked", textKey: "destinationDetails.bagCheckedText", text: "1 × 23 kg included on Economy" },
                { labelKey: "destinationDetails.bagSports", label: "Sports", textKey: "destinationDetails.places.dubai.bagExtra", text: "Golf and water sports equipment on request" }
            ]
        },
        paris: {
            id: "paris",
            nameKey: "destinationDetails.places.paris.name",
            name: "Paris",
            regionKey: "destinations.countryFrance",
            region: "France",
            taglineKey: "destinationDetails.places.paris.tagline",
            tagline: "Couture, cafés, and the soft gold of the Seine as night gathers.",
            descriptionKey: "destinationDetails.places.paris.description",
            description: "Paris rewards travelers who arrive with time to spare — galleries, quiet side streets, and the river’s evening light. Fly AEROVA from Baku and step into a city composed for lingering.",
            image: "assets/images/paris.jpg",
            imageAltKey: "destinationDetails.places.paris.imageAlt",
            imageAlt: "Paris in the evening",
            airportNameKey: "destinationDetails.places.paris.airportName",
            airportName: "Paris Charles de Gaulle Airport",
            iata: "CDG",
            airportLocationKey: "destinationDetails.places.paris.airportLocation",
            airportLocation: "Roissy-en-France, Île-de-France",
            durationKey: "destinationDetails.places.paris.duration",
            durationFromBaku: "Approx. 5h 40m",
            baggage: [
                { labelKey: "destinationDetails.bagCabin", label: "Cabin", textKey: "destinationDetails.bagCabinText", text: "1 × 8 kg hand baggage" },
                { labelKey: "destinationDetails.bagChecked", label: "Checked", textKey: "destinationDetails.bagCheckedText", text: "1 × 23 kg included on Economy" },
                { labelKey: "destinationDetails.bagBusiness", label: "Business", textKey: "destinationDetails.places.paris.bagExtra", text: "2 × 32 kg on Business Class" }
            ]
        },
        istanbul: {
            id: "istanbul",
            nameKey: "destinationDetails.places.istanbul.name",
            name: "Istanbul",
            regionKey: "destinationDetails.places.istanbul.region",
            region: "Türkiye",
            taglineKey: "destinationDetails.places.istanbul.tagline",
            tagline: "Domes, bazaars, and waters that join two continents in one evening.",
            descriptionKey: "destinationDetails.places.istanbul.description",
            description: "Istanbul gathers continents along the Bosphorus — spice markets, hillside neighborhoods, and ferry crossings at dusk. AEROVA’s frequent service from Baku makes this classic route effortless.",
            image: "assets/images/istanbul.jpg",
            imageAltKey: "destinationDetails.places.istanbul.imageAlt",
            imageAlt: "Istanbul and the Bosphorus",
            airportNameKey: "destinationDetails.places.istanbul.airportName",
            airportName: "Istanbul Airport",
            iata: "IST",
            airportLocationKey: "destinationDetails.places.istanbul.airportLocation",
            airportLocation: "Arnavutköy, Istanbul",
            durationKey: "destinationDetails.places.istanbul.duration",
            durationFromBaku: "Approx. 2h 45m",
            baggage: [
                { labelKey: "destinationDetails.bagCabin", label: "Cabin", textKey: "destinationDetails.bagCabinText", text: "1 × 8 kg hand baggage" },
                { labelKey: "destinationDetails.bagChecked", label: "Checked", textKey: "destinationDetails.bagCheckedText", text: "1 × 23 kg included on Economy" },
                { labelKey: "destinationDetails.bagFamily", label: "Family", textKey: "destinationDetails.places.istanbul.bagExtra", text: "Strollers and infant seats at no extra charge" }
            ]
        },
        maldives: {
            id: "maldives",
            nameKey: "destinationDetails.places.maldives.name",
            name: "Maldives",
            regionKey: "destinations.countryMaldives",
            region: "Indian Ocean",
            taglineKey: "destinationDetails.places.maldives.tagline",
            tagline: "Still lagoons, private shores, and horizons reserved for pause.",
            descriptionKey: "destinationDetails.places.maldives.description",
            description: "Turquoise water, overwater villas, and silence broken only by the tide. AEROVA’s service toward the Maldives is designed for travelers seeking distance, light, and unhurried arrival.",
            image: "assets/images/maldives.jpg",
            imageAltKey: "destinationDetails.places.maldives.imageAlt",
            imageAlt: "A Maldives lagoon",
            airportNameKey: "destinationDetails.places.maldives.airportName",
            airportName: "Velana International Airport",
            iata: "MLE",
            airportLocationKey: "destinationDetails.places.maldives.airportLocation",
            airportLocation: "Hulhulé, Malé Atoll",
            durationKey: "destinationDetails.places.maldives.duration",
            durationFromBaku: "Approx. 6h 50m",
            baggage: [
                { labelKey: "destinationDetails.bagCabin", label: "Cabin", textKey: "destinationDetails.bagCabinText", text: "1 × 8 kg hand baggage" },
                { labelKey: "destinationDetails.bagChecked", label: "Checked", textKey: "destinationDetails.bagCheckedText", text: "1 × 23 kg included on Economy" },
                { labelKey: "destinationDetails.bagResort", label: "Resort / Special Information", textKey: "destinationDetails.places.maldives.bagExtra", text: "Snorkel gear and soft cases welcome as checked items" }
            ]
        }
    };

    function byId(id) {
        return document.getElementById(id);
    }

    function getDestinationId() {
        var params = new URLSearchParams(window.location.search);
        return (params.get("id") || "").trim().toLowerCase();
    }

    function localized(destination, field, fallbackField) {
        return tr(destination[field], destination[fallbackField || field.replace(/Key$/, "")]);
    }

    function showNotFound() {
        var hero = byId("destination-hero");
        var content = byId("destination-content");
        var notFound = byId("destination-not-found");

        if (hero) hero.hidden = true;
        if (content) content.hidden = true;
        if (notFound) notFound.hidden = false;

        document.title = "AEROVA | " + tr("ui.destinationNotFound", "Destination Not Found");
    }

    function renderBaggage(items) {
        var list = byId("destination-baggage");
        if (!list) return;

        list.innerHTML = items.map(function (item) {
            var label = tr(item.labelKey, item.label);
            var text = tr(item.textKey, item.text);
            return "<li><strong>" + label + "</strong><span>" + text + "</span></li>";
        }).join("");
    }

    function renderDestination(destination) {
        var name = localized(destination, "nameKey", "name");
        var region = tr(destination.regionKey, destination.region);
        var tagline = localized(destination, "taglineKey", "tagline");
        var description = localized(destination, "descriptionKey", "description");
        var airportName = localized(destination, "airportNameKey", "airportName");
        var airportLocation = localized(destination, "airportLocationKey", "airportLocation");
        var duration = localized(destination, "durationKey", "durationFromBaku");
        var imageAlt = localized(destination, "imageAltKey", "imageAlt");
        var route = destination.id === "baku"
            ? tr("destinationDetails.routeHub", "Baku hub · {iata}", { iata: destination.iata })
            : tr("destinationDetails.routeTo", "Baku → {name}", { name: name });
        var bookUrl = "booking.html?to=" + encodeURIComponent(destination.name);

        document.title = "AEROVA | " + name;

        var heroMedia = byId("destination-hero-media");
        if (heroMedia) {
            var positions = {
                baku: "center 35%",
                london: "center 40%",
                dubai: "center 30%",
                paris: "center 35%",
                istanbul: "center 45%",
                maldives: "center 42%"
            };
            heroMedia.style.backgroundImage = "url('" + destination.image + "')";
            heroMedia.style.backgroundPosition = positions[destination.id] || "center";
            heroMedia.setAttribute("aria-label", imageAlt);
        }

        var nameEl = byId("destination-name");
        var heroMeta = byId("destination-hero-meta");
        var taglineEl = byId("destination-tagline");
        var descriptionEl = byId("destination-description");

        if (nameEl) nameEl.textContent = name;
        if (heroMeta) heroMeta.textContent = region + " · " + destination.iata;
        if (taglineEl) taglineEl.textContent = tagline;
        if (descriptionEl) descriptionEl.textContent = description;

        var airportNameEl = byId("destination-airport-name");
        var airportCode = byId("destination-airport-code");
        var airportLocationEl = byId("destination-airport-location");
        var durationEl = byId("destination-duration");

        if (airportNameEl) airportNameEl.textContent = airportName;
        if (airportCode) airportCode.textContent = destination.iata;
        if (airportLocationEl) airportLocationEl.textContent = airportLocation;
        if (durationEl) durationEl.textContent = duration;

        var asideRoute = byId("destination-aside-route");
        var asideRouteMeta = byId("destination-aside-route-meta");
        var asideDuration = byId("destination-aside-duration");

        if (asideRoute) asideRoute.textContent = route;
        if (asideRouteMeta) asideRouteMeta.textContent = route;
        if (asideDuration) asideDuration.textContent = duration;

        var bookAside = byId("destination-book-aside");
        if (bookAside) bookAside.href = bookUrl;

        renderBaggage(destination.baggage);
    }

    function init() {
        var id = getDestinationId();
        var destination = DESTINATIONS[id];

        if (!destination) {
            showNotFound();
            return;
        }

        var hero = byId("destination-hero");
        var content = byId("destination-content");
        var notFound = byId("destination-not-found");
        if (hero) hero.hidden = false;
        if (content) content.hidden = false;
        if (notFound) notFound.hidden = true;

        renderDestination(destination);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    window.addEventListener("aerova:languagechange", function () {
        if (window.AEROVA_I18N && typeof window.AEROVA_I18N.applyTranslations === "function") {
            window.AEROVA_I18N.applyTranslations(document);
        }
        init();
    });
})();
