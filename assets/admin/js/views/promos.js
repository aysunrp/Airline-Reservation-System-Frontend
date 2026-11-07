import { h } from "../core/dom.js";
import * as api from "../core/api.js";
import { crudView } from "../components/resource.js";
import { openDrawer, ok } from "../core/ui.js";
import { utc, dateTime } from "../core/format.js";
import { activeBadge, statusBadge } from "../components/badge.js";
import { cellMain, dataTable } from "../components/table.js";
import { card, cardHead, loadingBlock, errorState, busy } from "../components/page.js";
import { yesNoAll } from "../components/toolbar.js";

const PROBLEMS = {
    promo_inactive: "Promo kod aktiv deyil.",
    promo_expired: "Promo kodun müddəti bitib.",
    promo_exhausted: "Promo kodun istifadə limiti bitib.",
    no_subscribers: "Hələ təsdiqlənmiş abunəçi yoxdur.",
    campaign_already_sent: "Bu promo kod üçün kampaniya artıq yaradılıb."
};

function campaignError(error) {
    if (error && error.code === "campaign_setup_required") return "E-poçt kampaniyaları hələ qurulmayıb: bazanın son miqrasiyası tətbiq olunmayıb.";
    return api.message(error);
}

/* The e-mail is built by the server from the saved promo code; only its hash and the confirmation are sent back. */
async function openCampaign(promo, onSent) {
    const body = h("div", null, loadingBlock());
    const drawer = openDrawer({ title: "E-poçt kampaniyası: " + promo.code, content: body, wide: true });
    try {
        const preview = await api.get(`api/admin/promo-codes/${promo.id}/campaign-preview`, { language: "az" });
        const frame = h("iframe", { sandbox: "", style: { width: "100%", height: "380px", border: "1px solid var(--border)", borderRadius: "8px", background: "#fff" } });
        frame.setAttribute("srcdoc", preview.html);
        const confirm = h("input", { type: "checkbox", disabled: !preview.canSend });
        const send = h("button", { class: "btn btn-primary", type: "button", disabled: true }, "Kampaniyanı göndər");
        confirm.addEventListener("change", () => { send.disabled = !confirm.checked || !preview.canSend; });
        const result = h("p", { class: "small muted", role: "status" });
        send.addEventListener("click", () => busy(send, async () => {
            try {
                await api.post(`api/admin/promo-codes/${promo.id}/campaign`, { previewHash: preview.previewHash, confirm: true });
                ok("Kampaniya göndərilməyə başladı. Nəticəni siyahıda izlə.");
                confirm.disabled = true;
                if (onSent) onSent();
                drawer.close();
            } catch (error) { result.textContent = campaignError(error); }
        }));
        body.replaceChildren(h("div", { class: "stack-sm" },
            h("p", null, h("strong", { text: preview.code }), ` — ${preview.discountPercent}%` + (preview.validTo ? ` · ${String(preview.validTo).slice(0, 10)} tarixinədək` : "")),
            h("p", null, "Məktubu alacaq təsdiqlənmiş abunəçilər: ", h("strong", { text: String(preview.recipientCount) })),
            (preview.problems || []).length ? h("div", { class: "note note-warn" }, (preview.problems || []).map((p) => h("div", { text: PROBLEMS[p] || p }))) : null,
            h("div", { class: "cell-main", text: preview.subject }), frame,
            h("label", { class: "switch" }, confirm, h("span", { class: "switch-track" }), h("span", { text: "Bu kampaniyanı abunə olmuş müştərilərə göndərməyə əminəm" })),
            result));
        drawer.setFooter([h("button", { class: "btn btn-secondary", type: "button", on: { click: () => drawer.close() } }, "Bağla"), send]);
    } catch (error) {
        body.replaceChildren(errorState(campaignError(error) ? { userMessage: campaignError(error) } : error));
    }
}

function campaigns() {
    const box = h("div", null, loadingBlock());
    const load = async () => {
        try {
            const rows = await api.get("api/admin/campaigns");
            box.replaceChildren(dataTable(rows, [
                { label: "Promo kod", render: (r) => cellMain(r.code, r.discountPercent + "% endirim") },
                { label: "Status", render: (r) => statusBadge(r.status) },
                { label: "Göndərilib", num: true, render: (r) => `${r.sent} / ${r.totalRecipients}` },
                { label: "Xəta", num: true, render: (r) => r.failed },
                { label: "Gözləyir", num: true, render: (r) => r.pending },
                { label: "Yaradılıb", render: (r) => dateTime(r.createdAt) + " UTC" }
            ], { emptyTitle: "Hələ kampaniya yoxdur", emptyText: "Promo kodun menyusundan “E-poçt kampaniyası” seç." }));
        } catch (error) { box.replaceChildren(errorState({ userMessage: campaignError(error) }, load)); }
    };
    load();
    return { el: card(cardHead("E-poçt kampaniyaları", "Promo kodları abunəçilərə göndərmə tarixçəsi."), box), load };
}

export const { render } = crudView({
    title: "Promo kodlar", desc: "Ödəniş səhifəsində işləyən endirim kodları. Kampaniya promo kodun menyusundan göndərilir.",
    noun: "Promo kod", endpoint: "api/admin/promo-codes", createLabel: "Yeni promo kod",
    searchPlaceholder: "Kod üzrə axtar…",
    label: (r) => r.code, searchText: (r) => r.code,
    filters: [{ label: "Status", options: yesNoAll(), test: (r, v) => r.isActive === (v === "Active") }],
    columns: [
        { label: "Kod", render: (r) => cellMain(r.code, r.discountPercent + "% endirim") },
        { label: "Müddət", render: (r) => (r.validFrom || r.validTo ? `${utc(r.validFrom)} → ${utc(r.validTo)}` : "Məhdudiyyətsiz") },
        { label: "İstifadə", num: true, render: (r) => r.usedCount + (r.maxUses != null ? " / " + r.maxUses : "") },
        { label: "Status", render: (r) => activeBadge(r.isActive) }
    ],
    fields: () => [
        { key: "code", label: "Kod" },
        { key: "discountPercent", label: "Endirim (%)", type: "number", min: 1, max: 100 },
        { key: "validFrom", label: "Başlama (UTC)", type: "datetime-local", required: false },
        { key: "validTo", label: "Bitmə (UTC)", type: "datetime-local", required: false },
        { key: "maxUses", label: "Ən çox istifadə", type: "number", min: 1, required: false, hint: "Boş = limitsiz." },
        { key: "isActive", label: "Status", type: "switch", switchLabel: "Aktiv" }
    ],
    defaults: () => ({ isActive: true }),
    toForm: (r) => ({ code: r.code, discountPercent: r.discountPercent, validFrom: r.validFrom ? String(r.validFrom).slice(0, 16) : "", validTo: r.validTo ? String(r.validTo).slice(0, 16) : "", maxUses: r.maxUses ?? "", isActive: r.isActive }),
    toRequest: (d) => ({ code: d.code, discountPercent: d.discountPercent, validFrom: d.validFrom ? d.validFrom + ":00Z" : null, validTo: d.validTo ? d.validTo + ":00Z" : null, maxUses: d.maxUses, isActive: d.isActive }),
    deleteText: () => "Promo kod silinəcək. Bronlarda artıq istifadə olunubsa, silinmir, deaktiv edilir.",
    afterDelete: (result, row) => (result && String(result.outcome).toLowerCase() === "deactivated"
        ? ok(`“${row.code}” bronlarda istifadə olunub, ona görə silinmədi, deaktiv edildi.`) : ok("Promo kod silindi.")),
    extraActions: (row) => [{ label: "E-poçt kampaniyası…", onClick: () => openCampaign(row, () => { if (state.campaigns) state.campaigns.load(); }) }],
    below: () => { state.campaigns = campaigns(); return state.campaigns.el; }
});

const state = { campaigns: null };
