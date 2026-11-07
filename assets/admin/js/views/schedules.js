import * as api from "../core/api.js";
import * as store from "../core/store.js";
import * as auth from "../core/auth.js";
import { crudView } from "../components/resource.js";
import { ok, fail, toast } from "../core/ui.js";
import { daysLabel } from "../core/format.js";
import { activeBadge } from "../components/badge.js";
import { cellMain } from "../components/table.js";
import { yesNoAll } from "../components/toolbar.js";

async function generate(row) {
    try {
        const result = await api.post(`api/admin/schedules/${row.id}/generate`, {});
        const text = `${result.created.length} reys yaradıldı, ${result.alreadyExisting} artıq var idi, ${result.skipped.length} atlandı.`;
        if (result.skipped.length) toast(text + " " + result.skipped[0].reason, "info", 9000); else ok(text);
    } catch (error) { fail(api.message(error)); }
}

export const { render } = crudView({
    title: "Cədvəllər", desc: "Təkrarlanan reys cədvəlləri. “Reysləri yarat” cədvəldən konkret tarixli reyslər düzəldir (SuperAdmin).",
    noun: "Cədvəl", endpoint: "api/admin/schedules", createLabel: "Yeni cədvəl", wide: true,
    searchPlaceholder: "Reys nömrəsi və ya şəhər…",
    prepare: async () => ({ routes: await store.routes(), aircraft: await store.aircraftOptions(true) }),
    label: (r) => r.flightNumber,
    searchText: (r) => [r.flightNumber, r.originCity, r.destinationCity].join(" "),
    filters: [
        { label: "Status", options: yesNoAll(), test: (r, v) => r.isActive === (v === "Active") },
        { label: "Bu tarixdə qüvvədə olan", type: "date", test: (r, v) => r.validFrom <= v && (!r.validTo || r.validTo >= v) }
    ],
    columns: [
        { label: "Reys", render: (r) => cellMain(r.flightNumber, r.originCity + " → " + r.destinationCity) },
        { label: "Günlər", render: (r) => cellMain(daysLabel(r.daysOfWeek), r.validFrom + (r.validTo ? " → " + r.validTo : " →")) },
        { label: "Saat", render: (r) => String(r.departureTime).slice(0, 5) + " → " + String(r.arrivalTime).slice(0, 5) + (r.arrivalDayOffset ? " +" + r.arrivalDayOffset : "") },
        { label: "Təyyarə", render: (r) => r.aircraftModel || "—" },
        { label: "Status", render: (r) => activeBadge(r.isActive) }
    ],
    fields: (ref) => [
        { key: "flightNumber", label: "Reys nömrəsi" },
        { key: "routeId", label: "Marşrut", type: "select", options: ref.routes.map((r) => ({ value: String(r.id), label: r.code + " · " + r.originCity + " → " + r.destinationCity + (r.isActive ? "" : " (qeyri-aktiv)") })), hint: "Cədvəl yalnız aktiv marşrutda saxlanıla bilər." },
        { key: "defaultAircraftId", label: "Təyyarə", type: "select", options: ref.aircraft, required: false },
        { key: "isActive", label: "Status", type: "switch", switchLabel: "Aktiv" },
        { key: "departureTime", label: "Yola düşmə (hava limanı vaxtı)", type: "time" },
        { key: "arrivalTime", label: "Çatma (hava limanı vaxtı)", type: "time" },
        { key: "arrivalDayOffset", label: "Neçə gün sonra enir", type: "number", min: 0, max: 1, hint: "0 = eyni gün, 1 = ertəsi gün." },
        { key: "validFrom", label: "Başlama tarixi", type: "date" },
        { key: "validTo", label: "Bitmə tarixi", type: "date", required: false },
        { key: "daysOfWeek", label: "Həftənin günləri", type: "days" },
        { key: "fareEconomy", label: "Economy qiyməti ($)", type: "number", min: 0, required: false },
        { key: "fareComfort", label: "Comfort qiyməti ($)", type: "number", min: 0, required: false },
        { key: "fareBusiness", label: "Business qiyməti ($)", type: "number", min: 0, required: false }
    ],
    defaults: (ref) => ({ isActive: true, daysOfWeek: "Everyday", arrivalDayOffset: 0, validFrom: new Date().toISOString().slice(0, 10), routeId: ref.routes[0] ? String(ref.routes[0].id) : "" }),
    toForm: (r) => ({
        flightNumber: r.flightNumber, routeId: String(r.routeId), defaultAircraftId: r.defaultAircraftId == null ? "" : String(r.defaultAircraftId), isActive: r.isActive,
        departureTime: String(r.departureTime).slice(0, 5), arrivalTime: String(r.arrivalTime).slice(0, 5), arrivalDayOffset: r.arrivalDayOffset,
        validFrom: r.validFrom, validTo: r.validTo || "", daysOfWeek: r.daysOfWeek, fareEconomy: r.fares.Economy ?? "", fareComfort: r.fares.Comfort ?? "", fareBusiness: r.fares.Business ?? ""
    }),
    toRequest: (d, original) => {
        const fares = [];
        if (d.fareEconomy) fares.push({ cabinClass: "Economy", basePrice: d.fareEconomy });
        if (d.fareComfort) fares.push({ cabinClass: "Comfort", basePrice: d.fareComfort });
        if (d.fareBusiness) fares.push({ cabinClass: "Business", basePrice: d.fareBusiness });
        return {
            flightNumber: d.flightNumber, routeId: Number(d.routeId), defaultAircraftId: d.defaultAircraftId === "" ? null : Number(d.defaultAircraftId),
            departureTime: d.departureTime + ":00", arrivalTime: d.arrivalTime + ":00", arrivalDayOffset: d.arrivalDayOffset || 0,
            daysOfWeek: d.daysOfWeek.length === 7 ? "Everyday" : d.daysOfWeek.join(", "), validFrom: d.validFrom, validTo: d.validTo || null, isActive: d.isActive, fares,
            // Stops are not edited here: an edit keeps the ones the schedule already has.
            stops: original ? original.stops.map((s) => ({ sequenceNo: s.sequenceNo, airportCode: s.airportCode, arrivalOffsetMinutes: s.arrivalOffsetMinutes, layoverMinutes: s.layoverMinutes })) : []
        };
    },
    extraActions: (row) => [{ label: "Reysləri yarat", onClick: () => generate(row), hidden: !auth.isSuper() }]
});
