(function () {
    var DESTINATIONS = {
        baku: {
            id: "baku",
            name: "Baku",
            country: "Azerbaijan",
            tagline: "Flame Towers, Caspian breezes, and a city where heritage meets modern light.",
            description: "AEROVA’s home city unfolds between the Caspian shoreline and the Old City’s stone lanes. Evenings glow against the Flame Towers, while modern avenues and quiet courtyards share the same horizon. Begin or continue your journey from the heart of our network.",
            image: "assets/images/baku.jpg",
            imageAlt: "Baku skyline on the Caspian coast",
            airportName: "Heydar Aliyev International Airport",
            iata: "GYD",
            airportLocation: "Baku, Azerbaijan",
            durationFromBaku: "Home base",
            startingFare: 180,
            baggage: [
                { label: "Cabin", text: "1 × 8 kg hand baggage" },
                { label: "Checked", text: "1 × 23 kg included on Economy" },
                { label: "Extra", text: "Additional pieces available at booking" }
            ],
            flights: [
                { flightNo: "AV 101", route: "Baku → London", departs: "08:40", arrives: "12:05", price: 420 },
                { flightNo: "AV 220", route: "Baku → Dubai", departs: "11:15", arrives: "14:05", price: 310 },
                { flightNo: "AV 318", route: "Baku → Istanbul", departs: "16:30", arrives: "18:45", price: 260 }
            ]
        },
        london: {
            id: "london",
            name: "London",
            country: "United Kingdom",
            tagline: "Royal avenues, river mist, and a capital of quiet, enduring grandeur.",
            description: "Arrive into a city of measured elegance — museums at dawn, the Thames at dusk, and neighborhoods that reward unhurried wandering. AEROVA connects Baku to London with service shaped for composure from gate to gate.",
            image: "assets/images/london.jpg",
            imageAlt: "London along the River Thames",
            airportName: "London Heathrow Airport",
            iata: "LHR",
            airportLocation: "Hounslow, Greater London",
            durationFromBaku: "Approx. 5h 25m",
            startingFare: 420,
            baggage: [
                { label: "Cabin", text: "1 × 8 kg hand baggage" },
                { label: "Checked", text: "1 × 23 kg included on Economy" },
                { label: "Comfort+", text: "2 × 23 kg on Comfort and Business" }
            ],
            flights: [
                { flightNo: "AV 101", route: "Baku → London", departs: "08:40", arrives: "12:05", price: 420 },
                { flightNo: "AV 105", route: "Baku → London", departs: "14:20", arrives: "17:45", price: 465 },
                { flightNo: "AV 109", route: "Baku → London", departs: "21:10", arrives: "00:35", price: 395 }
            ]
        },
        dubai: {
            id: "dubai",
            name: "Dubai",
            country: "United Arab Emirates",
            tagline: "Skyline brilliance, desert calm, and evenings composed for arrival.",
            description: "From desert light to waterfront towers, Dubai balances spectacle with stillness. AEROVA’s short hop from Baku places you at the gateway to Gulf hospitality, shopping, and shoreline evenings.",
            image: "assets/images/dubai.jpg",
            imageAlt: "Dubai skyline at dusk",
            airportName: "Dubai International Airport",
            iata: "DXB",
            airportLocation: "Garhoud, Dubai",
            durationFromBaku: "Approx. 3h 10m",
            startingFare: 310,
            baggage: [
                { label: "Cabin", text: "1 × 8 kg hand baggage" },
                { label: "Checked", text: "1 × 23 kg included on Economy" },
                { label: "Sports", text: "Golf and water sports equipment on request" }
            ],
            flights: [
                { flightNo: "AV 220", route: "Baku → Dubai", departs: "11:15", arrives: "14:05", price: 310 },
                { flightNo: "AV 224", route: "Baku → Dubai", departs: "18:50", arrives: "21:40", price: 345 },
                { flightNo: "AV 228", route: "Baku → Dubai", departs: "23:30", arrives: "02:20", price: 295 }
            ]
        },
        paris: {
            id: "paris",
            name: "Paris",
            country: "France",
            tagline: "Couture, cafés, and the soft gold of the Seine as night gathers.",
            description: "Paris rewards travelers who arrive with time to spare — galleries, quiet side streets, and the river’s evening light. Fly AEROVA from Baku and step into a city composed for lingering.",
            image: "assets/images/paris.jpg",
            imageAlt: "Paris in the evening",
            airportName: "Paris Charles de Gaulle Airport",
            iata: "CDG",
            airportLocation: "Roissy-en-France, Île-de-France",
            durationFromBaku: "Approx. 5h 40m",
            startingFare: 390,
            baggage: [
                { label: "Cabin", text: "1 × 8 kg hand baggage" },
                { label: "Checked", text: "1 × 23 kg included on Economy" },
                { label: "Business", text: "2 × 32 kg on Business Class" }
            ],
            flights: [
                { flightNo: "AV 410", route: "Baku → Paris", departs: "07:55", arrives: "11:35", price: 390 },
                { flightNo: "AV 414", route: "Baku → Paris", departs: "13:40", arrives: "17:20", price: 430 },
                { flightNo: "AV 418", route: "Baku → Paris", departs: "19:05", arrives: "22:45", price: 405 }
            ]
        },
        istanbul: {
            id: "istanbul",
            name: "Istanbul",
            country: "Türkiye",
            tagline: "Domes, bazaars, and waters that join two continents in one evening.",
            description: "Istanbul gathers continents along the Bosphorus — spice markets, hillside neighborhoods, and ferry crossings at dusk. AEROVA’s frequent service from Baku makes this classic route effortless.",
            image: "assets/images/istanbul.jpg",
            imageAlt: "Istanbul and the Bosphorus",
            airportName: "Istanbul Airport",
            iata: "IST",
            airportLocation: "Arnavutköy, Istanbul",
            durationFromBaku: "Approx. 2h 45m",
            startingFare: 260,
            baggage: [
                { label: "Cabin", text: "1 × 8 kg hand baggage" },
                { label: "Checked", text: "1 × 23 kg included on Economy" },
                { label: "Family", text: "Strollers and infant seats at no extra charge" }
            ],
            flights: [
                { flightNo: "AV 318", route: "Baku → Istanbul", departs: "06:20", arrives: "08:35", price: 260 },
                { flightNo: "AV 322", route: "Baku → Istanbul", departs: "12:10", arrives: "14:25", price: 285 },
                { flightNo: "AV 326", route: "Baku → Istanbul", departs: "20:45", arrives: "23:00", price: 245 }
            ]
        },
        maldives: {
            id: "maldives",
            name: "Maldives",
            country: "Maldives",
            tagline: "Still lagoons, private shores, and horizons reserved for pause.",
            description: "Turquoise water, overwater villas, and silence broken only by the tide. AEROVA’s service toward the Maldives is designed for travelers seeking distance, light, and unhurried arrival.",
            image: "assets/images/maldives.jpg",
            imageAlt: "A Maldives lagoon",
            airportName: "Velana International Airport",
            iata: "MLE",
            airportLocation: "Hulhulé, Malé Atoll",
            durationFromBaku: "Approx. 6h 50m",
            startingFare: 780,
            baggage: [
                { label: "Cabin", text: "1 × 8 kg hand baggage" },
                { label: "Checked", text: "1 × 23 kg included on Economy" },
                { label: "Resort", text: "Snorkel gear and soft cases welcome as checked items" }
            ],
            flights: [
                { flightNo: "AV 560", route: "Baku → Malé", departs: "09:30", arrives: "16:55", price: 780 },
                { flightNo: "AV 564", route: "Baku → Malé", departs: "22:15", arrives: "05:40", price: 820 }
            ]
        }
    };

    function byId(id) {
        return document.getElementById(id);
    }

    function formatFare(amount) {
        return "$" + amount;
    }

    function getDestinationId() {
        var params = new URLSearchParams(window.location.search);
        var id = (params.get("id") || "").trim().toLowerCase();
        return id;
    }

    function showNotFound() {
        var hero = byId("destination-hero");
        var content = byId("destination-content");
        var notFound = byId("destination-not-found");

        if (hero) {
            hero.hidden = true;
        }
        if (content) {
            content.hidden = true;
        }
        if (notFound) {
            notFound.hidden = false;
        }

        document.title = "AEROVA | Destination Not Found";
    }

    function renderBaggage(items) {
        var list = byId("destination-baggage");
        if (!list) {
            return;
        }

        list.innerHTML = items.map(function (item) {
            return "<li><strong>" + item.label + "</strong><span>" + item.text + "</span></li>";
        }).join("");
    }

    function renderFlights(flights) {
        var container = byId("destination-flights");
        if (!container) {
            return;
        }

        if (!flights.length) {
            container.innerHTML = '<p class="section-copy">No scheduled departures at this time.</p>';
            return;
        }

        container.innerHTML = flights.map(function (flight) {
            return (
                '<article class="destination-flight">' +
                    '<div>' +
                        '<p class="destination-flight-route">' + flight.route + "</p>" +
                        '<p class="destination-flight-meta">' + flight.flightNo + "</p>" +
                    "</div>" +
                    '<p class="destination-flight-time">' + flight.departs + " → " + flight.arrives + "</p>" +
                    '<p class="destination-flight-price">From ' + formatFare(flight.price) + "</p>" +
                "</article>"
            );
        }).join("");
    }

    function renderDestination(destination) {
        var bookUrl = "booking.html?to=" + encodeURIComponent(destination.name);
        var fareText = "From " + formatFare(destination.startingFare);

        document.title = "AEROVA | " + destination.name;

        var heroMedia = byId("destination-hero-media");
        if (heroMedia) {
            heroMedia.style.backgroundImage = "url('" + destination.image + "')";
            heroMedia.setAttribute("aria-label", destination.imageAlt);
        }

        var nameEl = byId("destination-name");
        var countryEl = byId("destination-country");
        var taglineEl = byId("destination-tagline");
        var aboutTitle = byId("destination-about-title");
        var descriptionEl = byId("destination-description");

        if (nameEl) {
            nameEl.textContent = destination.name;
        }
        if (countryEl) {
            countryEl.textContent = destination.country;
        }
        if (taglineEl) {
            taglineEl.textContent = destination.tagline;
        }
        if (aboutTitle) {
            aboutTitle.textContent = "Discover " + destination.name;
        }
        if (descriptionEl) {
            descriptionEl.textContent = destination.description;
        }

        var airportName = byId("destination-airport-name");
        var airportCode = byId("destination-airport-code");
        var airportLocation = byId("destination-airport-location");
        var duration = byId("destination-duration");
        var fare = byId("destination-fare");

        if (airportName) {
            airportName.textContent = destination.airportName;
        }
        if (airportCode) {
            airportCode.textContent = destination.iata;
        }
        if (airportLocation) {
            airportLocation.textContent = destination.airportLocation;
        }
        if (duration) {
            duration.textContent = destination.durationFromBaku;
        }
        if (fare) {
            fare.textContent = fareText;
        }

        var asideTitle = byId("destination-aside-title");
        var asideText = byId("destination-aside-text");
        var asideRoute = byId("destination-aside-route");
        var asideFare = byId("destination-aside-fare");
        var asideDuration = byId("destination-aside-duration");

        if (asideTitle) {
            asideTitle.textContent = "Fly to " + destination.name;
        }
        if (asideText) {
            asideText.textContent = destination.id === "baku"
                ? "Explore connections from AEROVA’s home city, or begin a new journey outward."
                : "Book your AEROVA flight from Baku to " + destination.name + " with calm precision.";
        }
        if (asideRoute) {
            asideRoute.textContent = destination.id === "baku"
                ? "Baku hub · " + destination.iata
                : "Baku → " + destination.name;
        }
        if (asideFare) {
            asideFare.textContent = fareText;
        }
        if (asideDuration) {
            asideDuration.textContent = destination.durationFromBaku;
        }

        var bookHero = byId("destination-book-hero");
        var bookAside = byId("destination-book-aside");
        if (bookHero) {
            bookHero.href = bookUrl;
        }
        if (bookAside) {
            bookAside.href = bookUrl;
        }

        renderBaggage(destination.baggage);
        renderFlights(destination.flights);
    }

    function init() {
        var id = getDestinationId();
        var destination = DESTINATIONS[id];

        if (!destination) {
            showNotFound();
            return;
        }

        renderDestination(destination);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
