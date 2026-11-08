import { crudView } from "../components/resource.js";
import * as store from "../core/store.js";
import { statusBadge } from "../components/badge.js";
import { cellMain } from "../components/table.js";
import * as api from "../core/api.js";
import { h } from "../core/dom.js";
import { card } from "../components/page.js";

const STATUSES = [{ value: "Active", label: "Aktiv" }, { value: "Maintenance", label: "Təmirdə" }, { value: "Inactive", label: "Qeyri-aktiv" }];

let overlapRows = [];

/* The aircraft and, for each, the pairs of flights that overlap in time (the schedules do not stop an aircraft from being in two places at once). */
async function loadAircraft() {
    const [rows, overlaps] = await Promise.all([api.get("api/admin/aircraft"), api.get("api/admin/aircraft/overlaps").catch(() => [])]);
    overlapRows = overlaps;
    const byId = new Map(overlaps.map((o) => [o.aircraftId, o]));
    return rows.map((r) => ({ ...r, overlap: byId.get(r.id) || null }));
}

const overlapBadge = (r) => (r.overlap
    ? h("span", { class: "badge badge-danger", title: `İlk toqquşma: ${r.overlap.flightA} və ${r.overlap.flightB}, ${String(r.overlap.at).slice(0, 16).replace("T", " ")} UTC` }, `${r.overlap.pairs.toLocaleString("en-US")} cüt`)
    : h("span", { class: "muted", text: "Yoxdur" }));

export const { render } = crudView({
    title: "Təyyarələr", desc: "Park və hər təyyarənin salonlar üzrə oturacaq tutumu. “Toqquşma” eyni təyyarənin eyni vaxtda iki reysdə olduğu cütləri göstərir (hələ uçmamış reyslər).",
    noun: "Təyyarə", endpoint: "api/admin/aircraft", createLabel: "Yeni təyyarə", load: loadAircraft,
    below: () => (overlapRows.length
        ? card(h("p", { class: "muted", text: `${overlapRows.length} təyyarədə eyni vaxtda iki reysə təyin olunma var. Yeni cədvəl yaradanda boş təyyarə seç (toqquşması “Yoxdur” olan və cədvəli olmayan).` }))
        : null),
    searchPlaceholder: "Ad, model və ya qeydiyyat nömrəsi…",
    label: (r) => r.name,
    searchText: (r) => [r.name, r.model, r.registrationNumber].join(" "),
    filters: [{ label: "Status", options: [{ value: "", label: "Bütün statuslar" }, ...STATUSES], test: (r, v) => r.status === v }],
    columns: [
        { label: "Təyyarə", render: (r) => cellMain(r.name, r.model) },
        { label: "Qeydiyyat", render: (r) => r.registrationNumber },
        { label: "Yerlər (B / C / E)", num: true, render: (r) => `${r.totalSeats} (${r.businessSeats} / ${r.comfortSeats} / ${r.economySeats})` },
        { label: "Toqquşma", render: overlapBadge },
        { label: "Status", render: (r) => statusBadge(r.status) }
    ],
    fields: () => [
        { key: "name", label: "Ad" },
        { key: "model", label: "Model" },
        { key: "registrationNumber", label: "Qeydiyyat nömrəsi" },
        { key: "status", label: "Status", type: "select", options: STATUSES },
        { key: "businessSeats", label: "Business yerləri", type: "number", min: 0 },
        { key: "comfortSeats", label: "Comfort yerləri", type: "number", min: 0 },
        { key: "economySeats", label: "Economy yerləri", type: "number", min: 0 }
    ],
    defaults: () => ({ status: "Active", businessSeats: 0, comfortSeats: 0, economySeats: 0 }),
    toForm: (r) => ({ name: r.name, model: r.model, registrationNumber: r.registrationNumber, status: r.status, businessSeats: r.businessSeats, comfortSeats: r.comfortSeats, economySeats: r.economySeats }),
    toRequest: (d) => ({ name: d.name, model: d.model, registrationNumber: d.registrationNumber, status: d.status, businessSeats: d.businessSeats || 0, comfortSeats: d.comfortSeats || 0, economySeats: d.economySeats || 0 }),
    afterChange: () => store.invalidate("aircraft")
});
