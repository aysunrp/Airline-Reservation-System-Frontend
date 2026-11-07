import { h, mount } from "../core/dom.js";
import * as api from "../core/api.js";
import * as auth from "../core/auth.js";
import { ok, fail, confirmDialog } from "../core/ui.js";
import { money, dateTime } from "../core/format.js";
import { pageHead, card, errorState, loadingBlock } from "../components/page.js";
import { dataTable, cellMain } from "../components/table.js";
import { filterSelect, toolbar } from "../components/toolbar.js";
import { statusBadge } from "../components/badge.js";

const STATUSES = [["", "Bütün statuslar"], ["Pending", "Gözləmədə"], ["Processing", "İcra olunur"], ["Succeeded", "Tamamlanıb"], ["Failed", "Uğursuz"], ["Cancelled", "Ləğv edilib"]];

export async function render(ctx) {
    let status = "";
    const listBox = h("div");

    const retry = async (r) => {
        const yes = await confirmDialog({ title: "Geri ödəniş yenidən göndərilsin?", text: `${r.pnr} üçün ${money(r.amount)} Stripe-dan yenidən istənilsin? Məbləğ ləğv zamanı hesablanan məbləğ olaraq qalır.`, confirmLabel: "Yenidən göndər", danger: true });
        if (!yes) return;
        try { await api.post(`api/admin/refunds/${encodeURIComponent(r.id)}/retry`, {}); ok(`${r.pnr} geri ödənişi yenidən göndərildi.`); } catch (error) { fail(api.message(error)); }
        load();
    };

    const load = async () => {
        mount(listBox, loadingBlock());
        try {
            const rows = await api.get("api/admin/refunds", { take: 200, status });
            mount(listBox, dataTable(rows, [
                { label: "PNR", render: (r) => cellMain(r.pnr, r.initiatedBy) },
                { label: "Məbləğ", num: true, render: (r) => money(r.amount) },
                { label: "Status", render: (r) => statusBadge(r.status) },
                { label: "Səbəb", render: (r) => cellMain([r.reason, r.failureReason].filter(Boolean).join(" · ") || "—", r.providerReference || "") },
                { label: "Yaradılıb", render: (r) => dateTime(r.createdAt) },
                { label: "Yenilənib", render: (r) => dateTime(r.updatedAt || r.processedAt) }
            ], {
                actions: (r) => [{ label: "Yenidən göndər", onClick: () => retry(r), hidden: !(auth.isSuper() && (r.status === "Failed" || r.status === "Cancelled")) }],
                emptyTitle: "Hələ geri ödəniş yoxdur", emptyText: "Ləğv olunan bronlar üçün geri ödənişlər burada görünəcək."
            }));
        } catch (error) { mount(listBox, errorState(error, load)); }
    };

    ctx.container.replaceChildren(
        pageHead({ title: "Geri ödənişlər", desc: "Ləğv olunmuş bronların geri ödənişləri və Stripe statusu. Uğursuz geri ödənişi yalnız SuperAdmin yenidən göndərə bilər." }),
        card(toolbar(filterSelect({ label: "Status", options: STATUSES.map(([value, label]) => ({ value, label })), onChange: (v) => { status = v; load(); } })), listBox));
    await load();
}
