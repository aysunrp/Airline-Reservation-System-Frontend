# -*- coding: utf-8 -*-
"""Inject i18n assets and common data-i18n attributes into all HTML pages."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

CSS_TAG = '<link rel="stylesheet" href="assets/css/i18n.css">'
SCRIPTS = """    <script src="assets/js/locales/en.js"></script>
    <script src="assets/js/locales/az.js"></script>
    <script src="assets/js/locales/ru.js"></script>
    <script src="assets/js/i18n.js"></script>
"""

def stamp_nav_link(html, href, key, label):
    pattern = rf'(<a class="nav-link(?: is-current)?" href="{re.escape(href)}"(?: aria-current="page")?)(?![^>]*data-i18n)([^>]*>)({re.escape(label)})(</a>)'
    return re.sub(pattern, rf'\1 data-i18n="{key}"\2\3\4', html)

def process(html: str, name: str) -> str:
    if "assets/css/i18n.css" not in html:
        html = re.sub(
            r'(<link rel="stylesheet" href="assets/css/[^"]+\.css">)',
            r'\1\n    ' + CSS_TAG,
            html,
            count=1,
        )

    if "assets/js/i18n.js" not in html:
        injected = False
        for script_name in ("auth.js", "admin.js", "home.js"):
            tag = f'<script src="assets/js/{script_name}"></script>'
            # also match versioned query strings
            pattern = rf'<script src="assets/js/{re.escape(script_name)}(?:\?[^"]*)?"></script>'
            if re.search(pattern, html):
                html = re.sub(pattern, SCRIPTS + r'    \g<0>', html, count=1)
                injected = True
                break
        if not injected:
            # insert before first assets/js script
            html = re.sub(
                r'(<script src="assets/js/)',
                SCRIPTS + r'    \1',
                html,
                count=1,
            )

    for href, key, label in [
        ("booking.html", "nav.booking", "Booking"),
        ("destinations.html", "nav.destinations", "Destinations"),
        ("experience.html", "nav.experience", "Experience"),
        ("about.html", "nav.about", "About"),
        ("my-trips.html", "nav.myTrips", "My Trips"),
    ]:
        html = stamp_nav_link(html, href, key, label)

    html = re.sub(
        r'(<a class="trips-link" href="my-trips\.html")(?![^>]*data-i18n)(>)My Trips(</a>)',
        r'\1 data-i18n="nav.myTrips"\2My Trips\3',
        html,
    )
    html = re.sub(
        r'(<a class="login-button(?: login-button--drawer)?" href="login\.html")(?![^>]*data-i18n)(>)Login(</a>)',
        r'\1 data-i18n="nav.login"\2Login\3',
        html,
    )
    html = re.sub(
        r'(class="menu-toggle"[^>]*aria-label="Open menu")(?![^>]*data-i18n-aria)',
        r'\1 data-i18n-aria="nav.openMenu"',
        html,
    )
    html = re.sub(
        r'(class="search-button"[^>]*aria-label="Search")(?![^>]*data-i18n-aria)',
        r'\1 data-i18n-aria="nav.search"',
        html,
    )
    html = re.sub(
        r'(aria-label="AEROVA Home")(?![^>]*data-i18n-aria)',
        r'\1 data-i18n-aria="nav.homeAria"',
        html,
    )

    # Footer-scoped replacements
    def footer_sub(footer_html):
        reps = [
            (r'(<p class="footer-description")(?![^>]*data-i18n)(>)Fly beyond expectations\.(</p>)',
             r'\1 data-i18n="footer.description"\2Fly beyond expectations.\3'),
            (r'(<h2 class="footer-heading")(?![^>]*data-i18n)(>)Quick Links(</h2>)',
             r'\1 data-i18n="footer.quickLinks"\2Quick Links\3'),
            (r'(<h2 class="footer-heading")(?![^>]*data-i18n)(>)Support(</h2>)',
             r'\1 data-i18n="footer.support"\2Support\3'),
            (r'(<h2 class="footer-heading")(?![^>]*data-i18n)(>)Follow Us(</h2>)',
             r'\1 data-i18n="footer.followUs"\2Follow Us\3'),
            (r'(<p class="footer-copyright")(?![^>]*data-i18n)(>)© 2026 AEROVA\. All rights reserved\.(</p>)',
             r'\1 data-i18n="footer.copyright"\2© 2026 AEROVA. All rights reserved.\3'),
            (r'(class="footer-link" href="index\.html")(?![^>]*data-i18n)(>)Home(</a>)',
             r'\1 data-i18n="footer.home"\2Home\3'),
            (r'(class="footer-link" href="booking\.html")(?![^>]*data-i18n)(>)Flights(</a>)',
             r'\1 data-i18n="footer.flights"\2Flights\3'),
            (r'(class="footer-link" href="destinations\.html")(?![^>]*data-i18n)(>)Destinations(</a>)',
             r'\1 data-i18n="footer.destinations"\2Destinations\3'),
            (r'(class="footer-link" href="about\.html")(?![^>]*data-i18n)(>)About(</a>)',
             r'\1 data-i18n="footer.about"\2About\3'),
            (r'(class="footer-link" href="my-trips\.html")(?![^>]*data-i18n)(>)My Trips(</a>)',
             r'\1 data-i18n="footer.myTrips"\2My Trips\3'),
            (r'(class="footer-link" href="manage-booking\.html")(?![^>]*data-i18n)(>)Manage Booking(</a>)',
             r'\1 data-i18n="footer.manageBooking"\2Manage Booking\3'),
            (r'(class="footer-link" href="experience\.html")(?![^>]*data-i18n)(>)Experience(</a>)',
             r'\1 data-i18n="nav.experience"\2Experience\3'),
            (r'(class="footer-link" href="#help")(?![^>]*data-i18n)(>)Help Center(</a>)',
             r'\1 data-i18n="footer.help"\2Help Center\3'),
            (r'(class="footer-link" href="#contact")(?![^>]*data-i18n)(>)Contact Us(</a>)',
             r'\1 data-i18n="footer.contact"\2Contact Us\3'),
            (r'(class="footer-link" href="#travel-info")(?![^>]*data-i18n)(>)Travel Information(</a>)',
             r'\1 data-i18n="footer.travelInfo"\2Travel Information\3'),
            (r'(class="footer-link" href="#faqs")(?![^>]*data-i18n)(>)FAQs(</a>)',
             r'\1 data-i18n="footer.faqs"\2FAQs\3'),
            (r'(class="footer-legal-link" href="#privacy")(?![^>]*data-i18n)(>)Privacy Policy(</a>)',
             r'\1 data-i18n="footer.privacy"\2Privacy Policy\3'),
            (r'(class="footer-legal-link" href="#terms")(?![^>]*data-i18n)(>)Terms &amp; Conditions(</a>)',
             r'\1 data-i18n="footer.terms"\2Terms &amp; Conditions\3'),
        ]
        for pat, repl in reps:
            footer_html = re.sub(pat, repl, footer_html)
        return footer_html

    html = re.sub(
        r'(<footer\b[^>]*>)(.*?)(</footer>)',
        lambda m: m.group(1) + footer_sub(m.group(2)) + m.group(3),
        html,
        flags=re.S,
    )

    if name == "login.html":
        reps = [
            (r'(class="auth-header-link"[^>]*)(?![^>]*data-i18n)(>)Back to Home(</a>)',
             r'\1 data-i18n="auth.backHome"\2Back to Home\3'),
            (r'(class="auth-eyebrow")(?![^>]*data-i18n)(>)Welcome Back(</p>)',
             r'\1 data-i18n="auth.loginEyebrow"\2Welcome Back\3'),
            (r'(class="auth-title")(?![^>]*data-i18n)(>)Sign in to AEROVA(</h1>)',
             r'\1 data-i18n="auth.loginTitle"\2Sign in to AEROVA\3'),
            (r'(class="auth-subtitle")(?![^>]*data-i18n)(>)Access your trips, profile, and travel preferences\.(</p>)',
             r'\1 data-i18n="auth.loginSubtitle"\2Access your trips, profile, and travel preferences.\3'),
            (r'(for="login-email")(?![^>]*data-i18n)(>)Email(</label>)',
             r'\1 data-i18n="auth.email"\2Email\3'),
            (r'(for="login-password")(?![^>]*data-i18n)(>)Password(</label>)',
             r'\1 data-i18n="auth.password"\2Password\3'),
            (r'(id="login-email"[^>]*)(placeholder=")you@email\.com(")',
             r'\1 data-i18n-placeholder="auth.emailPlaceholder" \2you@email.com\3'),
            (r'(id="login-password"[^>]*)(placeholder=")Your password(")',
             r'\1 data-i18n-placeholder="auth.passwordPlaceholder" \2Your password\3'),
            (r'(class="auth-submit")(?![^>]*data-i18n)( type="submit">)Login(</button>)',
             r'\1 data-i18n="auth.loginButton"\2Login\3'),
            (r"(Don't have an account\? )", r'<span data-i18n="auth.noAccount">Don\'t have an account?</span> '),
            (r'(href="register\.html")(?![^>]*data-i18n)(>)Register(</a>)',
             r'\1 data-i18n="auth.registerLink"\2Register\3'),
        ]
        for pat, repl in reps:
            html = re.sub(pat, repl, html)

    if name == "register.html":
        reps = [
            (r'(class="auth-header-link"[^>]*)(?![^>]*data-i18n)(>)Back to Home(</a>)',
             r'\1 data-i18n="auth.backHome"\2Back to Home\3'),
            (r'(href="login\.html")(?![^>]*data-i18n)(>)Login(</a>)',
             r'\1 data-i18n="auth.loginLink"\2Login\3'),
        ]
        for pat, repl in reps:
            html = re.sub(pat, repl, html)

    # Home page key strings
    if name == "index.html":
        reps = [
            (r'(class="hero-eyebrow")(?![^>]*data-i18n)(>)Luxury Travel Experience(</p>)',
             r'\1 data-i18n="home.heroEyebrow"\2Luxury Travel Experience\3'),
            (r'(class="hero-title-line")(?![^>]*data-i18n)(>)Your Journey(</span>)',
             r'\1 data-i18n="home.heroTitle1"\2Your Journey\3'),
            (r'(class="hero-title-line")(?![^>]*data-i18n)(>)Starts Here(</span>)',
             r'\1 data-i18n="home.heroTitle2"\2Starts Here\3'),
            (r'(class="hero-description")(?![^>]*data-i18n)(>)Discover new destinations, create unforgettable memories and fly beyond expectations\.(</p>)',
             r'\1 data-i18n="home.heroDescription"\2Discover new destinations, create unforgettable memories and fly beyond expectations.\3'),
            (r'(class="hero-cta"[^>]*>)\s*Book Now',
             r'\1<span data-i18n="home.bookNow">Book Now</span>'),
            (r'(class="voice-search-title")(?![^>]*data-i18n)(>)Where Would You Like To Fly\?(</h2>)',
             r'\1 data-i18n="home.searchTitle"\2Where Would You Like To Fly?\3'),
            (r'(id="voice-search-input"[^>]*)(placeholder=")Try: Baku to Dubai next Friday, 2 passengers, business(")',
             r'\1 data-i18n-placeholder="home.searchPlaceholder" \2Try: Baku to Dubai next Friday, 2 passengers, business\3'),
        ]
        for pat, repl in reps:
            html = re.sub(pat, repl, html)

    if name == "booking.html":
        reps = [
            (r'(class="booking-eyebrow")(?![^>]*data-i18n)(>)Book Your Flight(</p>)',
             r'\1 data-i18n="booking.eyebrow"\2Book Your Flight\3'),
            (r'(class="booking-title")(?![^>]*data-i18n)(>)Find Your AEROVA Flight(</h1>)',
             r'\1 data-i18n="booking.title"\2Find Your AEROVA Flight\3'),
            (r'(class="booking-subtitle")(?![^>]*data-i18n)(>)Search, compare and book your perfect journey\.(</p>)',
             r'\1 data-i18n="booking.subtitle"\2Search, compare and book your perfect journey.\3'),
            (r'(data-trip="round-trip"[^>]*)(?![^>]*data-i18n)(>)Round Trip(</button>)',
             r'\1 data-i18n="booking.roundTrip"\2Round Trip\3'),
            (r'(data-trip="one-way"[^>]*)(?![^>]*data-i18n)(>)One Way(</button>)',
             r'\1 data-i18n="booking.oneWay"\2One Way\3'),
            (r'(data-trip="multi-city"[^>]*)(?![^>]*data-i18n)(>)Multi City(</button>)',
             r'\1 data-i18n="booking.multiCity"\2Multi City\3'),
            (r'(for="booking-from")(?![^>]*data-i18n)(>)From(</label>)',
             r'\1 data-i18n="booking.from"\2From\3'),
            (r'(for="booking-to")(?![^>]*data-i18n)(>)To(</label>)',
             r'\1 data-i18n="booking.to"\2To\3'),
            (r'(placeholder=")City or airport(")',
             r'data-i18n-placeholder="booking.cityPlaceholder" placeholder="City or airport"'),
        ]
        for pat, repl in reps:
            html = re.sub(pat, repl, html)

    if name == "flight-results.html":
        reps = [
            (r'(class="results-eyebrow")(?![^>]*data-i18n)(>)Available Flights(</p>)',
             r'\1 data-i18n="results.eyebrow"\2Available Flights\3'),
            (r'(class="results-back-link"[^>]*)(?![^>]*data-i18n)(>)← Modify search(</a>)',
             r'\1 data-i18n="results.modifySearch"\2← Modify search\3'),
            (r'(class="filters-panel-title")(?![^>]*data-i18n)(>)Filters &amp; Sort(</h2>)',
             r'\1 data-i18n="results.filtersSort"\2Filters &amp; Sort\3'),
            (r'(id="clear-filters-button"[^>]*)(?![^>]*data-i18n)(>)Clear Filters(</button>)',
             r'\1 data-i18n="results.clearFilters"\2Clear Filters\3'),
            (r'(class="filter-group-title")(?![^>]*data-i18n)(>)Sort By(</h3>)',
             r'\1 data-i18n="results.sortBy"\2Sort By\3'),
            (r'(class="filter-group-title")(?![^>]*data-i18n)(>)Price(</h3>)',
             r'\1 data-i18n="results.price"\2Price\3'),
            (r'(class="filter-group-title")(?![^>]*data-i18n)(>)Duration(</h3>)',
             r'\1 data-i18n="results.duration"\2Duration\3'),
            (r'(class="filter-group-title")(?![^>]*data-i18n)(>)Stops(</h3>)',
             r'\1 data-i18n="results.stops"\2Stops\3'),
            (r'(class="filter-group-title")(?![^>]*data-i18n)(>)Cabin Class(</h3>)',
             r'\1 data-i18n="results.cabinClass"\2Cabin Class\3'),
            (r'(value="recommended")(?![^>]*data-i18n)(>)Recommended(</option>)',
             r'\1 data-i18n="results.recommended"\2Recommended\3'),
            (r'(value="cheapest")(?![^>]*data-i18n)(>)Cheapest(</option>)',
             r'\1 data-i18n="results.cheapest"\2Cheapest\3'),
            (r'(value="fastest")(?![^>]*data-i18n)(>)Fastest(</option>)',
             r'\1 data-i18n="results.fastest"\2Fastest\3'),
            (r'(value="earliest")(?![^>]*data-i18n)(>)Earliest Departure(</option>)',
             r'\1 data-i18n="results.earliest"\2Earliest Departure\3'),
            (r'(>)Lowest to Highest(</span>)', r' data-i18n="results.lowestHighest">Lowest to Highest</span>'),
            (r'(>)Highest to Lowest(</span>)', r' data-i18n="results.highestLowest">Highest to Lowest</span>'),
            (r'(>)Shortest(</span>)', r' data-i18n="results.shortest">Shortest</span>'),
            (r'(>)Longest(</span>)', r' data-i18n="results.longest">Longest</span>'),
            (r'(<input type="checkbox" name="filter-stops" value="Non-stop">\s*<span)(>)Non-stop(</span>)',
             r'\1 data-i18n="results.nonstop"\2Non-stop\3'),
            (r'(<input type="checkbox" name="filter-stops" value="1 Stop">\s*<span)(>)1 Stop(</span>)',
             r'\1 data-i18n="results.oneStop"\g<2>1 Stop\3'),
            (r'(<input type="radio" name="filter-cabin" value="Economy">\s*<span)(>)Economy(</span>)',
             r'\1 data-i18n="results.economy"\2Economy\3'),
            (r'(<input type="radio" name="filter-cabin" value="Comfort">\s*<span)(>)Comfort(</span>)',
             r'\1 data-i18n="results.comfort"\2Comfort\3'),
            (r'(<input type="radio" name="filter-cabin" value="Business">\s*<span)(>)Business(</span>)',
             r'\1 data-i18n="results.business"\2Business\3'),
        ]
        for pat, repl in reps:
            html = re.sub(pat, repl, html)
        # filters toggle span
        html = re.sub(
            r'(<button class="filters-toggle"[^>]*>\s*<span)(>)Filters &amp; Sort(</span>)',
            r'\1 data-i18n="results.filtersSort"\2Filters &amp; Sort\3',
            html,
        )

    if name == "admin.html":
        reps = [
            (r'(class="admin-brand-sub")(?![^>]*data-i18n)(>)Admin(</p>)',
             r'\1 data-i18n="admin.brandSub"\2Admin\3'),
            (r'(class="admin-topbar-meta")(?![^>]*data-i18n)(>)AEROVA Operations Control(</p>)',
             r'\1 data-i18n="admin.topbarMeta"\2AEROVA Operations Control\3'),
            (r'(data-section="dashboard"[^>]*)(?![^>]*data-i18n)(>)Dashboard(</button>)',
             r'\1 data-i18n="admin.dashboard"\2Dashboard\3'),
            (r'(data-section="flights"[^>]*)(?![^>]*data-i18n)(>)Flights(</button>)',
             r'\1 data-i18n="admin.flights"\2Flights\3'),
            (r'(data-section="routes"[^>]*)(?![^>]*data-i18n)(>)Routes(</button>)',
             r'\1 data-i18n="admin.routes"\2Routes\3'),
            (r'(data-section="schedules"[^>]*)(?![^>]*data-i18n)(>)Schedules(</button>)',
             r'\1 data-i18n="admin.schedules"\2Schedules\3'),
            (r'(data-section="aircraft"[^>]*)(?![^>]*data-i18n)(>)Aircraft(</button>)',
             r'\1 data-i18n="admin.aircraft"\2Aircraft\3'),
            (r'(data-section="seats"[^>]*)(?![^>]*data-i18n)(>)Seat Inventory(</button>)',
             r'\1 data-i18n="admin.seats"\2Seat Inventory\3'),
            (r'(data-section="bookings"[^>]*)(?![^>]*data-i18n)(>)Bookings(</button>)',
             r'\1 data-i18n="admin.bookings"\2Bookings\3'),
            (r'(data-section="passengers"[^>]*)(?![^>]*data-i18n)(>)Passengers(</button>)',
             r'\1 data-i18n="admin.passengers"\2Passengers\3'),
            (r'(id="admin-logout-btn"[^>]*)(?![^>]*data-i18n)(>)Logout(</button>)',
             r'\1 data-i18n="admin.logout"\2Logout\3'),
        ]
        for pat, repl in reps:
            html = re.sub(pat, repl, html)

    return html


def read_html(path: Path) -> str:
    raw = path.read_bytes()
    for enc in ("utf-8", "utf-8-sig", "cp1252", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")

def main():
    for path in sorted(ROOT.glob("*.html")):
        original = read_html(path)
        updated = process(original, path.name)
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            print("Updated", path.name)
        else:
            print("No change", path.name)

if __name__ == "__main__":
    main()
