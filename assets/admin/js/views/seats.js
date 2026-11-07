import { h, mount } from "../core/dom.js";
import * as api from "../core/api.js";
import { ok, fail } from "../core/ui.js";
import { statusLabel } from "../core/format.js";
import { pageHead, card, loadingBlock, errorState, emptyState } from "../components/page.js";
import { toolbar, filterSelect } from "../components/toolbar.js";

const GROUPS = { Business: [["A", "B"], ["C", "D"]], Comfort: [["A", "B"], ["C"], ["D", "E"]], Economy: [["A", "B", "C"], ["D", "E", "F"]] };
const CLASS = { Available: "is-available", Booked: "is-booked", Held: "is-held", Blocked: "is-blocked" };
const CABINS = ["Economy", "Comfort", "Business"];

function seatMap(inventory, cabin, onToggle) {
    const seats = inventory.seats.filter((s) => s.cabinClass === cabin);
    if (!seats.length) return emptyState("Bu salonda yer yoxdur", "Bu təyyarənin seçilmiş salonda oturacağı yoxdur.");
    const letters = [...new Set(seats.map((s) => s.letter))].sort();
    let groups = (GROUPS[cabin] || [letters]).map((g) => g.filter((l) => letters.includes(l))).filter((g) => g.length);
    const known = groups.flat();
    const extra = letters.filter((l) => !known.includes(l));
    if (extra.length) groups = [...groups, extra];
    const rows = [...new Set(seats.map((s) => s.rowNumber))].sort((a, b) => a - b);
    const byLabel = Object.fromEntries(seats.map((s) => [s.label, s]));

    const head = h("div", { class: "seat-cols" }, groups.map((g, i) => [h("div", { class: "seat-group", style: { gridTemplateColumns: `repeat(${g.length}, var(--seat))` } }, g.map((l) => h("span", { text: l }))), i < groups.length - 1 ? h("span", { class: "seat-aisle" }) : null]));
    const lines = rows.map((row) => h("div", { class: "seat-row" },
        h("span", { class: "seat-row-label", text: String(row) }),
        groups.map((g, i) => [h("div", { class: "seat-group", style: { gridTemplateColumns: `repeat(${g.length}, var(--seat))` } }, g.map((l) => {
            const seat = byLabel[row + l];
            if (!seat) return h("span");
            return h("button", { class: "seat " + (CLASS[seat.status] || "is-available"), type: "button", title: `${seat.label} · ${statusLabel(seat.status)}`, "aria-label": `${seat.label}, ${statusLabel(seat.status)}`, "aria-disabled": ["Available", "Blocked"].includes(seat.status) ? undefined : "true", on: { click: () => onToggle(seat) } }, l);
        })), i < groups.length - 1 ? h("span", { class: "seat-aisle" }) : null])));
    return h("div", { class: "seatmap" }, head, lines);
}

export async function render(ctx) {
    const today = new Date().toISOString().slice(0, 10);
    const state = { day: ctx.query.date || today, flightId: ctx.query.flight || "", cabin: "Economy", inventory: null, flights: [] };
    let request = 0;

    const mapBox = h("div", null, loadingBlock());
    const summary = h("div", { class: "legend", style: { padding: "16px 24px" } });
    const flightHolder = h("span");
    const cabinHolder = h("span");
    const stamp = h("span", { class: "small muted" });

    const draw = () => {
        const inv = state.inventory;
        if (!inv) { mount(mapBox, emptyState("Reys seçilməyib", "Yuxarıdan tarix və reys seç.")); summary.replaceChildren(); return; }
        const seats = inv.seats.filter((s) => s.cabinClass === state.cabin);
        const count = (status) => seats.filter((s) => s.status === status).length;
        summary.replaceChildren(
            ...[["Available", "Boş"], ["Booked", "Tutulub"], ["Held", "Rezerv"], ["Blocked", "Bloklanıb"]].map(([key, label]) =>
                h("span", null, h("i", { style: { background: key === "Available" ? "var(--surface)" : key === "Booked" ? "var(--danger-soft)" : key === "Held" ? "var(--warning-soft)" : "var(--text-3)" } }), `${label}: ${count(key)}`)));
        mount(mapBox, seatMap(inv, state.cabin, toggle));
    };

    const loadInventory = async (quiet) => {
        const mine = ++request;
        if (!state.flightId) { state.inventory = null; draw(); return; }
        if (!quiet) mount(mapBox, loadingBlock());
        try {
            const inv = await api.get(`api/admin/flights/${state.flightId}/seats`);
            if (mine !== request) return;
            state.inventory = inv;
            stamp.textContent = "Xəritə özü yenilənir · " + new Date().toLocaleTimeString("az-AZ");
            draw();
        } catch (error) { if (!quiet) mount(mapBox, errorState(error, () => loadInventory(false))); }
    };

    const toggle = async (seat) => {
        if (!["Available", "Blocked"].includes(seat.status)) { fail("Tutulmuş və ya rezerv olunmuş yeri dəyişmək olmaz."); return; }
        try {
            const updated = await api.patch(`api/admin/flights/${state.inventory.flightId}/seats/${seat.id}`, { blocked: seat.status === "Available" });
            seat.status = updated.status;
            draw();
            ok(updated.status === "Blocked" ? `${seat.label} yeri bloklandı.` : `${seat.label} yeri yenidən açıqdır.`);
        } catch (error) { fail(api.message(error)); loadInventory(false); }
    };

    const loadFlights = async () => {
        try {
            const rows = await api.get("api/admin/flights", { date: state.day, take: 200 });
            state.flights = rows.filter((f) => f.status !== "Cancelled");
            if (!state.flights.some((f) => String(f.id) === String(state.flightId))) state.flightId = state.flights[0] ? String(state.flights[0].id) : "";
            flightHolder.replaceChildren(filterSelect({ label: "Reys", options: state.flights.length ? state.flights.map((f) => ({ value: String(f.id), label: `${f.flightNumber} · ${f.originCity} → ${f.destinationCity}` })) : [{ value: "", label: "Bu gün reys yoxdur" }], value: state.flightId, onChange: (v) => { state.flightId = v; loadInventory(false); } }));
        } catch (error) { mount(mapBox, errorState(error, loadFlights)); return; }
        await loadInventory(false);
    };

    const dayInput = h("input", { class: "input", type: "date", value: state.day, "aria-label": "Tarix" });
    dayInput.addEventListener("change", () => { state.day = dayInput.value || today; state.flightId = ""; loadFlights(); });
    cabinHolder.append(filterSelect({ label: "Salon", options: CABINS.map((c) => ({ value: c, label: c })), value: state.cabin, onChange: (v) => { state.cabin = v; draw(); } }));

    ctx.container.replaceChildren(
        pageHead({ title: "Oturacaq xəritəsi", desc: "Boş yerə klik edib bloklaya bilərsən. Bron və ödənişlər xəritədə avtomatik görünür." }),
        card(toolbar(dayInput, flightHolder, cabinHolder, h("div", { class: "toolbar-spacer" }), stamp), summary, mapBox));
    await loadFlights();
    const timer = setInterval(() => { if (!document.hidden && state.flightId) loadInventory(true); }, 3000);
    return () => clearInterval(timer);
}
