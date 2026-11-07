import { crudView } from "../components/resource.js";
import * as auth from "../core/auth.js";
import { CABINS } from "../core/format.js";

export const { render } = crudView({
    title: "Ləğv qaydaları", desc: "Bron ləğv ediləndə salona və uçuşa qalan günlərə görə tutulan komissiya. Dəyişikliyi yalnız SuperAdmin edə bilər.",
    noun: "Qayda", endpoint: "api/admin/cancellation-rules", createLabel: "Yeni qayda",
    canCreate: () => auth.isSuper(), canEdit: () => auth.isSuper(),
    label: (r) => r.cabinClass + " · " + r.minDaysBeforeDeparture + " gün",
    filters: [{ label: "Salon", options: [{ value: "", label: "Bütün salonlar" }, ...CABINS.map((c) => ({ value: c, label: c }))], test: (r, v) => r.cabinClass === v }],
    columns: [
        { label: "Salon", render: (r) => r.cabinClass },
        { label: "Uçuşa qalan", render: (r) => "≥ " + r.minDaysBeforeDeparture + " gün" },
        { label: "Komissiya", num: true, render: (r) => (r.feePercent != null ? r.feePercent + "%" : "—") },
        { label: "Nəticə", render: (r) => (r.feePercent != null ? "Qalan hissə geri qaytarılır" : "Geri ödəniş yoxdur") }
    ],
    fields: () => [
        { key: "cabinClass", label: "Salon", type: "select", options: CABINS.map((c) => ({ value: c, label: c })) },
        { key: "minDaysBeforeDeparture", label: "Uçuşa ən azı neçə gün qalıb", type: "number", min: 0 },
        { key: "feePercent", label: "Komissiya (%)", type: "number", min: 0, max: 100, required: false, span2: true, hint: "Boş buraxsan, bu halda geri ödəniş olmur." }
    ],
    defaults: () => ({ cabinClass: "Economy", minDaysBeforeDeparture: 7 }),
    toForm: (r) => ({ cabinClass: r.cabinClass, minDaysBeforeDeparture: r.minDaysBeforeDeparture, feePercent: r.feePercent ?? "" }),
    toRequest: (d) => ({ cabinClass: d.cabinClass, minDaysBeforeDeparture: d.minDaysBeforeDeparture, feePercent: d.feePercent })
});
