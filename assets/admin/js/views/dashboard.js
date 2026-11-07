import { h } from "../core/dom.js";
import * as api from "../core/api.js";
import * as store from "../core/store.js";
import { money, utc, localAt } from "../core/format.js";
import { pageHead, card, cardHead, skeleton, errorState, button } from "../components/page.js";
import { dataTable, cellMain } from "../components/table.js";
import { statusBadge } from "../components/badge.js";

const STATS = [
    ["totalFlights", "Uçuşlar"], ["activeRoutes", "Aktiv marşrutlar"], ["aircraft", "Təyyarələr"],
    ["totalBookings", "Bronlar"], ["availableSeats", "Boş yerlər"], ["passengers", "Sərnişinlər"]
];

export async function render({ container, navigate }) {
    container.replaceChildren(pageHead({ title: "Panel", desc: "Əməliyyatların bugünkü vəziyyəti." }), skeleton(5));

    let data;
    let airports;
    try {
        [airports, data] = await Promise.all([store.airports().catch(() => []), api.get("api/admin/dashboard")]);
    } catch (error) {
        container.replaceChildren(pageHead({ title: "Panel" }), card(errorState(error, () => render({ container, navigate }))));
        return;
    }

    const stats = h("div", { class: "stats" }, STATS.map(([key, label]) =>
        h("div", { class: "card stat" }, h("div", { class: "stat-label", text: label }), h("div", { class: "stat-value mono", text: Number(data.stats[key] || 0).toLocaleString("en-US") }))));

    const bookings = dataTable(data.recentBookings, [
        { label: "PNR", render: (r) => cellMain(r.pnr, r.leadPassenger) },
        { label: "Reys", render: (r) => cellMain(r.flightNumber, r.route) },
        { label: "Uçuş vaxtı", render: (r) => utc(r.departureAt) + " UTC" },
        { label: "Məbləğ", num: true, render: (r) => money(r.totalAmount) },
        { label: "Status", render: (r) => statusBadge(r.status) }
    ], { onRowClick: (r) => navigate("/bookings", { pnr: r.pnr }), emptyTitle: "Hələ bron yoxdur" });

    const flights = dataTable(data.upcomingFlights, [
        { label: "Reys", render: (r) => cellMain(r.flightNumber, r.originCity + " → " + r.destinationCity) },
        { label: "Yola düşmə", render: (r) => { const t = localAt(airports, r.departureAt, r.originCode); return t.date + " · " + t.time; } },
        { label: "Təyyarə", render: (r) => r.aircraftModel },
        { label: "Status", render: (r) => statusBadge(r.status) }
    ], { onRowClick: () => navigate("/flights"), emptyTitle: "Yaxınlaşan uçuş yoxdur" });

    container.replaceChildren(
        pageHead({ title: "Panel", desc: "Əməliyyatların bugünkü vəziyyəti.", actions: [
            button("Yeni uçuş", { variant: "primary", iconName: "plus", onClick: () => navigate("/flights", { new: "1" }) }),
            button("Bron axtar", { iconName: "search", onClick: () => navigate("/bookings") })
        ] }),
        h("div", { class: "stack" }, stats,
            card(cardHead("Son bronlar", "Sətrə klik et, təfərrüata bax.", [button("Hamısı", { small: true, variant: "ghost", onClick: () => navigate("/bookings") })]), bookings),
            card(cardHead("Yaxınlaşan uçuşlar", "Hava limanının yerli vaxtı ilə.", [button("Hamısı", { small: true, variant: "ghost", onClick: () => navigate("/flights") })]), flights)));
}
