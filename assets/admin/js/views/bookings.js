import { h, mount } from "../core/dom.js";
import * as api from "../core/api.js";
import * as store from "../core/store.js";
import { ok, fail, confirmDialog, openDrawer } from "../core/ui.js";
import { money, day, localAt } from "../core/format.js";
import { pageHead, card, errorState, loadingBlock } from "../components/page.js";
import { dataTable, cellMain } from "../components/table.js";
import { searchBox, filterSelect, toolbar } from "../components/toolbar.js";
import { statusBadge } from "../components/badge.js";

const STATUSES = [{ value: "", label: "Bütün statuslar" }, ...["Confirmed", "Pending", "Cancelled", "Completed", "Expired"].map((s) => ({ value: s, label: { Confirmed: "Təsdiqlənib", Pending: "Gözləmədə", Cancelled: "Ləğv edilib", Completed: "Tamamlanıb", Expired: "Vaxtı bitib" }[s] }))];
const cancellable = (status) => status === "Confirmed" || status === "Pending";

function field(label, value) {
    return h("div", { class: "field" }, h("div", { class: "field-label", text: label }), h("div", null, value));
}

export async function openBooking(pnr, airports, onChange) {
    const body = h("div", null, loadingBlock());
    const drawer = openDrawer({ title: "Bron " + pnr, content: body, wide: true });
    try {
        const b = await api.get("api/admin/bookings/" + encodeURIComponent(pnr));
        const leg = b.legs[0];
        const from = localAt(airports, leg.departureAt, leg.originCode);
        body.replaceChildren(h("div", { class: "stack-sm" },
            h("div", { class: "form-grid" },
                field("Status", statusBadge(b.status)),
                field("Cəmi", money(b.price.total)),
                field("Əlaqə", `${b.contactEmail} · ${b.contactPhone}`),
                field("Salon", leg.cabinClass),
                field("Reys", `${leg.flightNumber} · ${leg.originCity} → ${leg.destinationCity}`),
                field("Yola düşmə", `${from.date} · ${from.time}`)),
            h("h3", { class: "card-title", text: "Sərnişinlər" }),
            b.passengers.map((p) => h("div", { class: "card card-pad" },
                h("div", { class: "cell-main", text: [p.title, p.firstName, p.lastName].join(" ") }),
                h("div", { class: "cell-sub", text: "Yer: " + ((p.tickets[0] && p.tickets[0].seat) || "təyin edilməyib") })))));
        drawer.setFooter([
            h("button", { class: "btn btn-secondary", type: "button", on: { click: () => drawer.close() } }, "Bağla"),
            h("button", { class: "btn btn-danger", type: "button", disabled: !cancellable(b.status), on: { click: async () => {
                const yes = await confirmDialog({ title: "Bron ləğv edilsin?", text: `${pnr} rezervasiyası ləğv ediləcək. Yerlər azad olunur, tarif qaydaları icazə verirsə geri ödəniş tələb olunur.`, confirmLabel: "Bronu ləğv et", danger: true });
                if (!yes) return;
                try { await api.post(`api/admin/bookings/${encodeURIComponent(pnr)}/cancel`, {}); ok(`${pnr} bronu ləğv edildi.`); drawer.close(); if (onChange) onChange(); } catch (error) { fail(api.message(error)); }
            } } }, "Bronu ləğv et")]);
    } catch (error) { body.replaceChildren(errorState(error)); }
}

export async function render(ctx) {
    const airports = await store.airports().catch(() => []);
    const f = { pnr: ctx.query.pnr || "", passenger: "", status: "" };
    const listBox = h("div");

    const load = async () => {
        mount(listBox, loadingBlock());
        try {
            const rows = await api.get("api/admin/bookings", { ...f, take: 100 });
            mount(listBox, dataTable(rows, [
                { label: "PNR", render: (r) => cellMain(r.pnr, r.leadPassenger + (r.passengerCount > 1 ? ` +${r.passengerCount - 1}` : "")) },
                { label: "Reys", render: (r) => cellMain(r.flightNumber, r.route) },
                { label: "Tarix", render: (r) => day(r.departureAt) },
                { label: "Salon · yer", render: (r) => cellMain(r.cabinClass, (r.seats || []).join(", ") || "yer yoxdur") },
                { label: "Məbləğ", num: true, render: (r) => money(r.totalAmount) },
                { label: "Status", render: (r) => statusBadge(r.status) }
            ], {
                onRowClick: (r) => openBooking(r.pnr, airports, load),
                actions: (r) => [{ label: "Təfərrüata bax", onClick: () => openBooking(r.pnr, airports, load) }],
                emptyTitle: "Bron tapılmadı", emptyText: "PNR, sərnişin adı və ya statusu dəyişib yenidən yoxla."
            }));
        } catch (error) { mount(listBox, errorState(error, load)); }
    };

    const pnrBox = searchBox({ placeholder: "PNR kodu", value: f.pnr, onInput: (v) => { f.pnr = v; load(); } });
    ctx.container.replaceChildren(
        pageHead({ title: "Bronlar", desc: "Rezervasiyalar. Sətrə klik edib təfərrüata bax və ya ləğv et." }),
        card(toolbar(pnrBox, searchBox({ placeholder: "Sərnişin adı", onInput: (v) => { f.passenger = v; load(); } }), filterSelect({ label: "Status", options: STATUSES, onChange: (v) => { f.status = v; load(); } })), listBox));
    await load();
    if (ctx.query.pnr && /^[A-Za-z0-9]{6}$/.test(ctx.query.pnr)) openBooking(ctx.query.pnr.toUpperCase(), airports, load);
}
