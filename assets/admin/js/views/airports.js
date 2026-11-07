import { crudView } from "../components/resource.js";
import * as store from "../core/store.js";
import { activeBadge } from "../components/badge.js";
import { cellMain } from "../components/table.js";
import { yesNoAll } from "../components/toolbar.js";

export const { render } = crudView({
    title: "Hava limanları", desc: "AEROVA-nın uçduğu hava limanları və hər birinin saat qurşağı. Şəhər və ölkə şəkilləri Website → İstiqamətlər bölməsindədir.",
    noun: "Hava limanı", endpoint: "api/admin/airports", createLabel: "Yeni hava limanı",
    searchPlaceholder: "Kod, ad və ya şəhər üzrə axtar…",
    label: (r) => r.code + " · " + r.city,
    searchText: (r) => [r.code, r.name, r.city].join(" "),
    filters: [{ label: "Status", options: yesNoAll(), test: (r, v) => r.isActive === (v === "Active") }],
    columns: [
        { label: "Kod", render: (r) => cellMain(r.code, r.countryCode) },
        { label: "Ad", render: (r) => r.name },
        { label: "Şəhər", render: (r) => r.city },
        { label: "Saat qurşağı", render: (r) => r.timeZoneId },
        { label: "Status", render: (r) => activeBadge(r.isActive) }
    ],
    fields: () => [
        { key: "code", label: "Kod (3 hərf)", maxLength: 3, hint: "IATA kodu, məsələn GYD." },
        { key: "countryCode", label: "Ölkə kodu (2 hərf)", maxLength: 2, hint: "Məsələn AZ." },
        { key: "name", label: "Ad", span2: true },
        { key: "city", label: "Şəhər" },
        { key: "timeZoneId", label: "Saat qurşağı", placeholder: "Asia/Baku" },
        { key: "isActive", label: "Status", type: "switch", switchLabel: "Aktiv" }
    ],
    defaults: () => ({ isActive: true }),
    toForm: (r) => ({ code: r.code, countryCode: r.countryCode, name: r.name, city: r.city, timeZoneId: r.timeZoneId, isActive: r.isActive }),
    toRequest: (d) => ({ code: d.code.toUpperCase(), name: d.name, city: d.city, countryCode: d.countryCode.toUpperCase(), timeZoneId: d.timeZoneId, isActive: d.isActive }),
    afterChange: () => store.invalidate("airports")
});
