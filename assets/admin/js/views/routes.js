import { crudView } from "../components/resource.js";
import * as store from "../core/store.js";
import { duration } from "../core/format.js";
import { activeBadge } from "../components/badge.js";
import { cellMain } from "../components/table.js";
import { yesNoAll } from "../components/toolbar.js";


export const { render } = crudView({
    title: "Marşrutlar", desc: "Hava limanları arasındakı xətlər. Cədvəllər marşrutlara bağlanır.",
    noun: "Marşrut", endpoint: "api/admin/routes", createLabel: "Yeni marşrut",
    searchPlaceholder: "Kod və ya şəhər üzrə axtar…",
    prepare: () => store.airportOptions(),
    label: (r) => r.code,
    searchText: (r) => [r.code, r.originCity, r.destinationCity].join(" "),
    filters: [{ label: "Status", options: yesNoAll(), test: (r, v) => r.isActive === (v === "Active") }],
    columns: [
        { label: "Marşrut", render: (r) => cellMain(r.code, r.originCity + " → " + r.destinationCity) },
        { label: "Məsafə", num: true, render: (r) => r.distanceKm.toLocaleString("en-US") + " km" },
        { label: "Müddət", render: (r) => duration(r.durationMinutes) },
        { label: "Status", render: (r) => activeBadge(r.isActive) }
    ],
    fields: (airports) => [
        { key: "originCode", label: "Haradan", type: "select", options: airports },
        { key: "destinationCode", label: "Haraya", type: "select", options: airports },
        { key: "distanceKm", label: "Məsafə (km)", type: "number", min: 1 },
        { key: "durationMinutes", label: "Müddət (dəqiqə)", type: "number", min: 1 },
        { key: "isActive", label: "Status", type: "switch", switchLabel: "Aktiv" }
    ],
    defaults: () => ({ isActive: true, originCode: "GYD" }),
    toForm: (r) => ({ originCode: r.originCode, destinationCode: r.destinationCode, distanceKm: r.distanceKm, durationMinutes: r.durationMinutes, isActive: r.isActive }),
    toRequest: (d) => ({ originCode: d.originCode, destinationCode: d.destinationCode, distanceKm: d.distanceKm, durationMinutes: d.durationMinutes, isActive: d.isActive }),
    afterChange: () => store.invalidate("routes")
});
