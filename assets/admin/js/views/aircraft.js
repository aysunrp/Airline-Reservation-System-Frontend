import { crudView } from "../components/resource.js";
import * as store from "../core/store.js";
import { statusBadge } from "../components/badge.js";
import { cellMain } from "../components/table.js";

const STATUSES = [{ value: "Active", label: "Aktiv" }, { value: "Maintenance", label: "Təmirdə" }, { value: "Inactive", label: "Qeyri-aktiv" }];

export const { render } = crudView({
    title: "Təyyarələr", desc: "Park və hər təyyarənin salonlar üzrə oturacaq tutumu.",
    noun: "Təyyarə", endpoint: "api/admin/aircraft", createLabel: "Yeni təyyarə",
    searchPlaceholder: "Ad, model və ya qeydiyyat nömrəsi…",
    label: (r) => r.name,
    searchText: (r) => [r.name, r.model, r.registrationNumber].join(" "),
    filters: [{ label: "Status", options: [{ value: "", label: "Bütün statuslar" }, ...STATUSES], test: (r, v) => r.status === v }],
    columns: [
        { label: "Təyyarə", render: (r) => cellMain(r.name, r.model) },
        { label: "Qeydiyyat", render: (r) => r.registrationNumber },
        { label: "Yerlər (B / C / E)", num: true, render: (r) => `${r.totalSeats} (${r.businessSeats} / ${r.comfortSeats} / ${r.economySeats})` },
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
