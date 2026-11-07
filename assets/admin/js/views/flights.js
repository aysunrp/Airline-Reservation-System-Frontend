import { h, mount } from "../core/dom.js";
import * as api from "../core/api.js";
import * as store from "../core/store.js";
import * as auth from "../core/auth.js";
import { ok, fail, confirmDialog, openDrawer } from "../core/ui.js";
import { money, localAt, duration, FLIGHT_STATUSES, statusLabel } from "../core/format.js";
import { pageHead, card, button, errorState, loadingBlock } from "../components/page.js";
import { dataTable, cellMain, pagerBar } from "../components/table.js";
import { searchBox, filterSelect, toolbar, spacer } from "../components/toolbar.js";
import { statusBadge, activeBadge } from "../components/badge.js";
import { openForm } from "../components/form.js";

const SIZE = 25;
const toInput = (value) => (value ? String(value).slice(0, 16) : "");
const ALL = (label) => ({ value: "", label });

async function openFlightForm(flight, refs) {
    const saved = await openForm({
        title: flight ? "Uçuş: redaktə" : "Uçuş: yeni",
        wide: true,
        fields: [
            { key: "flightNumber", label: "Reys nömrəsi" },
            { key: "aircraftId", label: "Təyyarə", type: "select", options: refs.aircraft },
            { key: "originCode", label: "Haradan", type: "select", options: refs.airports },
            { key: "destinationCode", label: "Haraya", type: "select", options: refs.airports },
            { key: "departureAt", label: "Yola düşmə (UTC)", type: "datetime-local" },
            { key: "arrivalAt", label: "Çatma (UTC)", type: "datetime-local" },
            { key: "status", label: "Status", type: "select", options: FLIGHT_STATUSES.map((s) => ({ value: s, label: statusLabel(s) })), span2: true },
            { key: "fareEconomy", label: "Economy qiyməti ($)", type: "number", min: 0, required: false },
            { key: "fareComfort", label: "Comfort qiyməti ($)", type: "number", min: 0, required: false },
            { key: "fareBusiness", label: "Business qiyməti ($)", type: "number", min: 0, required: false }
        ],
        values: flight ? {
            flightNumber: flight.flightNumber, aircraftId: String(flight.aircraftId), originCode: flight.originCode, destinationCode: flight.destinationCode,
            departureAt: toInput(flight.departureAt), arrivalAt: toInput(flight.arrivalAt), status: flight.status,
            fareEconomy: flight.fares.Economy ?? "", fareComfort: flight.fares.Comfort ?? "", fareBusiness: flight.fares.Business ?? ""
        } : { status: "Scheduled", originCode: "GYD" },
        onSubmit: (d) => {
            const fares = {};
            if (d.fareEconomy) fares.Economy = d.fareEconomy;
            if (d.fareComfort) fares.Comfort = d.fareComfort;
            if (d.fareBusiness) fares.Business = d.fareBusiness;
            const body = { flightNumber: d.flightNumber, originCode: d.originCode, destinationCode: d.destinationCode, aircraftId: Number(d.aircraftId), departureAt: d.departureAt + ":00Z", arrivalAt: d.arrivalAt + ":00Z", status: d.status, fares };
            return flight ? api.put("api/admin/flights/" + flight.id, body) : api.post("api/admin/flights", body);
        }
    });
    if (saved) ok(flight ? "Uçuş yeniləndi." : "Uçuş əlavə olundu.");
    return !!saved;
}

async function showSegments(flight, airports) {
    const body = h("div", null, loadingBlock());
    openDrawer({ title: "Reys " + flight.flightNumber, content: body });
    try {
        const full = await api.get("api/admin/flights/" + flight.id);
        const segments = full.segments || [];
        body.replaceChildren(h("div", { class: "stack-sm" },
            h("p", { class: "muted", text: `${flight.originCity} → ${flight.destinationCity}` }),
            segments.length ? segments.map((s, i) => {
                const from = localAt(airports, s.departureAt, s.originCode);
                const to = localAt(airports, s.arrivalAt, s.destinationCode);
                const wait = i > 0 ? Math.round((Date.parse(s.departureAt + (/Z$/i.test(s.departureAt) ? "" : "Z")) - Date.parse(segments[i - 1].arrivalAt + (/Z$/i.test(segments[i - 1].arrivalAt) ? "" : "Z"))) / 60000) : 0;
                return h("div", { class: "card card-pad" }, h("div", { class: "cell-main", text: `Seqment ${i + 1}: ${s.originCode} ${from.time} → ${s.destinationCode} ${to.time}` }),
                    h("div", { class: "cell-sub", text: from.date + (wait ? " · dayanacaqda " + duration(wait) : "") }));
            }) : h("p", { class: "muted", text: "Bu reysin ayrıca seqmenti yoxdur." })));
    } catch (error) { body.replaceChildren(errorState(error)); }
}

async function journeysTab(box, airports) {
    const opts = airports.slice().sort((a, b) => (a.code < b.code ? -1 : 1)).map((a) => ({ value: a.code, label: a.code + " · " + a.city }));
    const q = { origin: "GYD", destination: opts.find((o) => o.value !== "GYD")?.value || "", from: new Date().toISOString().slice(0, 10), to: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10) };
    const result = h("div");
    const run = async () => {
        mount(result, loadingBlock());
        try {
            const rows = await api.get("api/admin/flights/journeys", q);
            mount(result, dataTable(rows, [
                { label: "Marşrut", render: (r) => cellMain(r.originCode + " → " + r.destinationCode, "Aktarma: " + r.transferCode + " · " + r.transferCity) },
                { label: "Uçuşlar", render: (r) => r.legs.map((l) => h("div", { text: `${l.flightNumber} · ${l.originCode} ${localAt(airports, l.departureAt, l.originCode).time} → ${l.destinationCode} ${localAt(airports, l.arrivalAt, l.destinationCode).time}` })) },
                { label: "Gözləmə", render: (r) => duration(r.transferMinutes) },
                { label: "Ümumi", render: (r) => duration(r.durationMinutes) },
                { label: "Qiymət (E / C / B)", render: (r) => ["Economy", "Comfort", "Business"].map((c) => (r.fares[c] != null ? money(r.fares[c]) : "—")).join(" / ") }
            ], { emptyTitle: "Bu dövr üçün aktarmalı səyahət tapılmadı" }));
        } catch (error) { mount(result, errorState(error, run)); }
    };
    const input = (key, type) => { const el = h("input", { class: "input", type, value: q[key], "aria-label": key }); el.addEventListener("change", () => { q[key] = el.value; run(); }); return el; };
    box.replaceChildren(toolbar(filterSelect({ label: "Haradan", options: opts, value: q.origin, onChange: (v) => { q.origin = v; run(); } }), filterSelect({ label: "Haraya", options: opts, value: q.destination, onChange: (v) => { q.destination = v; run(); } }), input("from", "date"), input("to", "date")), result);
    run();
}

export async function render(ctx) {
    const [airports, aircraftList, airportOpts, aircraftOpts] = await Promise.all([store.airports(), store.aircraft(), store.airportOptions(), store.aircraftOptions(false)]);
    const refs = { airports: airportOpts, aircraft: aircraftOpts };
    const f = { search: "", status: "", timing: "upcoming", date: "", origin: "", destination: "", aircraftId: "", flightType: "", active: "", month: "", year: "" };
    let page = 0;
    let tab = "list";

    const listBox = h("div");
    const extra = h("div", { class: "toolbar", hidden: true });
    const body = h("div");

    const load = async () => {
        mount(listBox, loadingBlock());
        const query = { ...f, take: SIZE, skip: page * SIZE };
        try {
            const rows = await api.get("api/admin/flights", query);
            mount(listBox,
                dataTable(rows, [
                    { label: "Reys", render: (r) => cellMain(r.flightNumber, r.stops > 0 ? `Dayanacaqlı (${r.stops})` : "Birbaşa") },
                    { label: "Marşrut", render: (r) => cellMain(`${r.originCode} → ${r.destinationCode}`, `${r.originCity} → ${r.destinationCity}`) },
                    { label: "Yola düşmə", render: (r) => { const t = localAt(airports, r.departureAt, r.originCode); return cellMain(t.time, t.date); } },
                    { label: "Təyyarə", render: (r) => r.aircraftModel },
                    { label: "Qiymət (E / C / B)", render: (r) => ["Economy", "Comfort", "Business"].map((c) => (r.fares[c] != null ? money(r.fares[c]) : "—")).join(" / ") },
                    { label: "Yer", num: true, render: (r) => `${r.seatsAvailable} / ${r.seatsTotal}` },
                    { label: "Status", render: (r) => h("div", { class: "stack-sm", style: { gap: "4px" } }, statusBadge(r.status), r.scheduleActive ? null : activeBadge(false)) }
                ], {
                    onRowClick: (r) => openFlightForm(r, refs).then((changed) => changed && load()),
                    actions: (r) => [
                        { label: "Seqmentlərə bax", onClick: () => showSegments(r, airports) },
                        { label: "Oturacaq xəritəsi", onClick: () => ctx.navigate("/seats", { flight: r.id, date: String(r.departureAt).slice(0, 10) }) },
                        { label: "Redaktə et", onClick: () => openFlightForm(r, refs).then((changed) => changed && load()) },
                        "-",
                        { label: "Sil", danger: true, hidden: !auth.isSuper(), onClick: () => remove(r) }
                    ],
                    emptyTitle: "Uyğun uçuş tapılmadı", emptyText: "Filtrləri dəyişib yenidən yoxla."
                }),
                pagerBar({ page, size: SIZE, hasNext: rows.length === SIZE, onPage: (p) => { page = p; load(); } }));
        } catch (error) { mount(listBox, errorState(error, load)); }
    };

    const remove = async (r) => {
        const yes = await confirmDialog({ title: "Uçuş silinsin?", text: `${r.flightNumber} (${r.originCode} → ${r.destinationCode}) silinəcək. Bronları olan uçuşu silmək olmaz.`, confirmLabel: "Sil", danger: true });
        if (!yes) return;
        try { await api.del("api/admin/flights/" + r.id); ok("Uçuş silindi."); load(); } catch (error) { fail(api.message(error)); }
    };

    const set = (key) => (value) => { f[key] = value; page = 0; load(); };
    const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
    const airportFilter = (label, key) => filterSelect({ label, options: [ALL(label), ...airportOpts], onChange: set(key) });
    const dateInput = h("input", { class: "input", type: "date", "aria-label": "Tarix", title: "Tarix" });
    dateInput.addEventListener("change", () => set("date")(dateInput.value));

    extra.append(
        filterSelect({ label: "Ay", options: [ALL("Bütün aylar"), ...months.map((m, i) => ({ value: String(i + 1), label: m }))], onChange: set("month") }),
        filterSelect({ label: "İl", options: [ALL("Bütün illər"), { value: "2026", label: "2026" }, { value: "2027", label: "2027" }], onChange: set("year") }),
        filterSelect({ label: "Növ", options: [ALL("Bütün növlər"), { value: "direct", label: "Birbaşa" }, { value: "withStops", label: "Dayanacaqlı" }], onChange: set("flightType") }),
        filterSelect({ label: "Cədvəl", options: [ALL("Bütün cədvəllər"), { value: "true", label: "Aktiv cədvəl" }, { value: "false", label: "Deaktiv cədvəl" }], onChange: set("active") }),
        filterSelect({ label: "Təyyarə", options: [ALL("Bütün təyyarələr"), ...aircraftList.map((a) => ({ value: String(a.id), label: a.name }))], onChange: set("aircraftId") }));
    const moreButton = button("Daha çox filtr", { variant: "ghost", small: true, iconName: "down", onClick: () => { extra.hidden = !extra.hidden; } });

    const listView = () => card(
        toolbar(searchBox({ placeholder: "Reys nömrəsi və ya şəhər…", onInput: set("search") }),
            filterSelect({ label: "Vaxt", options: [ALL("Bütün vaxtlar"), { value: "upcoming", label: "Gələcək uçuşlar" }, { value: "past", label: "Keçmiş uçuşlar" }], value: f.timing, onChange: set("timing") }),
            filterSelect({ label: "Status", options: [ALL("Bütün statuslar"), ...FLIGHT_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))], onChange: set("status") }),
            dateInput, airportFilter("Haradan", "origin"), airportFilter("Haraya", "destination"), spacer(), moreButton),
        extra, listBox);

    const tabBar = h("div", { class: "tabs", style: { marginBottom: "24px" } });
    const drawTabs = () => {
        tabBar.replaceChildren(...[["list", "Uçuşlar"], ["journeys", "Aktarmalı səyahətlər"]].map(([key, label]) =>
            h("button", { class: "tab" + (key === tab ? " is-active" : ""), type: "button", on: { click: () => { tab = key; drawTabs(); drawBody(); } } }, label)));
    };
    const drawBody = () => {
        if (tab === "list") { mount(body, listView()); load(); } else { const box = h("div"); mount(body, card(box)); journeysTab(box, airports); }
    };

    const create = async () => { if (await openFlightForm(null, refs)) { tab = "list"; drawTabs(); drawBody(); } };
    ctx.container.replaceChildren(
        pageHead({ title: "Uçuşlar", desc: "Reyslər, statuslar və qiymətlər. Vaxtlar hava limanının yerli saatı ilə göstərilir.", actions: [button("Yeni uçuş", { variant: "primary", iconName: "plus", onClick: create })] }),
        tabBar, body);
    drawTabs();
    drawBody();
    if (ctx.query.new) { ctx.replaceQuery({}); create(); }
}
