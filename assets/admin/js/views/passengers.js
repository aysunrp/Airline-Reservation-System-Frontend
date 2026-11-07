import { h, mount } from "../core/dom.js";
import * as api from "../core/api.js";
import { openDrawer } from "../core/ui.js";
import { money } from "../core/format.js";
import { pageHead, card, errorState, loadingBlock } from "../components/page.js";
import { dataTable, cellMain } from "../components/table.js";
import { searchBox, filterSelect, toolbar, yesNoAll } from "../components/toolbar.js";
import { activeBadge, statusBadge } from "../components/badge.js";

function field(label, value) {
    return h("div", { class: "field" }, h("div", { class: "field-label", text: label }), h("div", null, value));
}

async function openPassenger(p) {
    const body = h("div", null, loadingBlock());
    openDrawer({ title: p.fullName, content: body, wide: true });
    try {
        const details = await api.get(`api/admin/passengers/${encodeURIComponent(p.documentType)}/${encodeURIComponent(p.documentNumber)}`);
        const person = details.passenger;
        body.replaceChildren(h("div", { class: "stack-sm" },
            h("div", { class: "form-grid" },
                field("Status", activeBadge(person.isActive)), field("Səyahət sayı", String(person.trips)),
                field("E-poçt", person.email), field("Telefon", person.phone),
                field("Vətəndaşlıq", person.nationalityCode), field("Sənəd", `${person.documentType} · ${person.documentNumber}`)),
            h("h3", { class: "card-title", text: "Bronlar" }),
            details.bookings.length ? details.bookings.map((b) => h("div", { class: "card card-pad row", style: { justifyContent: "space-between" } }, h("span", { class: "cell-main", text: b.pnr }), statusBadge(b.status), h("span", { text: money(b.totalAmount) }))) : h("p", { class: "muted", text: "Bron yoxdur." })));
    } catch (error) { body.replaceChildren(errorState(error)); }
}

export async function render(ctx) {
    const f = { search: "", isActive: "" };
    const listBox = h("div");
    const load = async () => {
        mount(listBox, loadingBlock());
        try {
            const rows = await api.get("api/admin/passengers", { search: f.search, isActive: f.isActive });
            mount(listBox, dataTable(rows, [
                { label: "Sərnişin", render: (r) => cellMain(r.fullName, r.email) },
                { label: "Telefon", render: (r) => r.phone },
                { label: "Sənəd", render: (r) => cellMain(r.documentNumber, r.documentType + " · " + r.nationalityCode) },
                { label: "Səyahət", num: true, render: (r) => r.trips },
                { label: "Status", render: (r) => activeBadge(r.isActive) }
            ], { onRowClick: openPassenger, actions: (r) => [{ label: "Təfərrüata bax", onClick: () => openPassenger(r) }], emptyTitle: "Sərnişin tapılmadı" }));
        } catch (error) { mount(listBox, errorState(error, load)); }
    };
    ctx.container.replaceChildren(
        pageHead({ title: "Sərnişinlər", desc: "Bron edən sərnişinlərin qeydləri. Sətrə klik edib bronlarına bax." }),
        card(toolbar(searchBox({ placeholder: "Ad, e-poçt və ya sənəd nömrəsi…", onInput: (v) => { f.search = v; load(); } }),
            filterSelect({ label: "Status", options: yesNoAll(), onChange: (v) => { f.isActive = v === "" ? "" : v === "Active" ? "true" : "false"; load(); } })), listBox));
    await load();
}
