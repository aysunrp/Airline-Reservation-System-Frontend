import { h, mount } from "../core/dom.js";
import * as api from "../core/api.js";
import { ok, fail, openDrawer } from "../core/ui.js";
import { dateTime, statusLabel, supportStatus } from "../core/format.js";
import { pageHead, card, errorState, loadingBlock } from "../components/page.js";
import { dataTable, cellMain, pagerBar } from "../components/table.js";
import { searchBox, filterSelect, toolbar } from "../components/toolbar.js";
import { statusBadge } from "../components/badge.js";

const SIZE = 20;
const STATUSES = ["Open", "InProgress", "WaitingForCustomer", "Resolved"];
const CATEGORIES = { Booking: "Rezervasiya", Payment: "Ödəniş", CancellationRefund: "Ləğv və geri ödəniş", FlightChange: "Uçuş dəyişikliyi", Baggage: "Baqaj", Account: "Hesab", WebsiteProblem: "Sayt problemi", Other: "Digər" };
const category = (value) => CATEGORIES[value] || String(value || "—");

let openId = null;
let reloadTicket = null;

async function openTicket(id, refreshList) {
    openId = id;
    const body = h("div", null, loadingBlock());
    const drawer = openDrawer({ title: "Müraciət", content: body, wide: true, onClose: () => { if (openId === id) { openId = null; reloadTicket = null; } } });
    const draw = async (keepDraft) => {
        const draft = keepDraft && body.querySelector("textarea") ? { text: body.querySelector("textarea").value, after: body.querySelector("select[data-after]").value } : null;
        try {
            const t = await api.get("api/admin/support/tickets/" + id);
            drawer.setTitle(t.ticketNumber + " · " + t.subject);
            const status = h("select", { class: "select", "aria-label": "Status" }, STATUSES.map((s) => h("option", { value: s, selected: s === supportStatus(t.status) }, statusLabel(s))));
            const after = h("select", { class: "select", "data-after": "1", "aria-label": "Cavabdan sonrakı status" }, [h("option", { value: "" }, "Statusu dəyişmə"), ...STATUSES.map((s) => h("option", { value: s }, statusLabel(s)))]);
            const text = h("textarea", { class: "textarea", rows: 4, maxlength: 4000, placeholder: "Cavabı yaz. Müştəriyə e-poçtla bildirilir." });
            if (draft) { text.value = draft.text; after.value = draft.after; }
            const send = h("button", { class: "btn btn-primary", type: "button" }, "Cavabı göndər");
            send.addEventListener("click", async () => {
                const message = text.value.trim();
                if (!message) return;
                send.classList.add("is-busy"); send.disabled = true;
                try { await api.post(`api/admin/support/tickets/${id}/replies`, { message, status: after.value || null }); ok("Cavab göndərildi."); refreshList(); await draw(false); } catch (error) { fail(api.message(error)); send.classList.remove("is-busy"); send.disabled = false; }
            });
            status.addEventListener("change", async () => {
                try { await api.put(`api/admin/support/tickets/${id}/status`, { status: status.value }); ok("Status saxlanıldı."); refreshList(); } catch (error) { fail(api.message(error)); }
            });
            body.replaceChildren(h("div", { class: "stack-sm" },
                h("p", { class: "muted small" }, `${t.customerName} (${t.customerEmail})` + (t.bookingPnr ? ` · Bron: ${t.bookingPnr}` : "") + ` · ${category(t.category)} · ${dateTime(t.createdAt)} UTC`),
                h("div", { class: "row" }, h("span", { class: "field-label", text: "Status:" }), status),
                h("div", { class: "thread" }, t.messages.map((m) => h("div", { class: "msg" + (m.authorType === "Staff" ? " is-staff" : "") }, h("small", { text: (m.authorType === "Staff" ? "AEROVA Dəstək" : m.authorName) + " · " + dateTime(m.createdAt) }), h("div", { text: m.body })))),
                h("div", { class: "field" }, h("label", { class: "field-label", text: "Müştəriyə cavab" }), text),
                h("div", { class: "row", style: { justifyContent: "space-between" } }, h("div", { class: "row" }, h("span", { class: "small muted", text: "Cavabdan sonra:" }), after), send)));
        } catch (error) { body.replaceChildren(errorState(error, () => draw(false))); }
    };
    reloadTicket = () => draw(true);
    await draw(false);
}

export async function render(ctx) {
    const f = { search: ctx.query.search || "", status: "", category: "" };
    let page = 1;
    const listBox = h("div");

    const load = async (quiet) => {
        if (!quiet) mount(listBox, loadingBlock());
        try {
            const result = await api.get("api/admin/support/tickets", { page, pageSize: SIZE, ...f });
            mount(listBox, dataTable(result.items, [
                { label: "Müraciət", render: (r) => cellMain(r.ticketNumber, r.subject) },
                { label: "Müştəri", render: (r) => cellMain(r.customerName, r.customerEmail) },
                { label: "Mövzu", render: (r) => cellMain(category(r.category), r.bookingPnr || "") },
                { label: "Status", render: (r) => statusBadge(supportStatus(r.status)) },
                { label: "Son yenilənmə", render: (r) => dateTime(r.updatedAt) + " UTC" }
            ], { onRowClick: (r) => openTicket(r.id, () => load(true)), actions: (r) => [{ label: "Aç", onClick: () => openTicket(r.id, () => load(true)) }], emptyTitle: "Müraciət tapılmadı", emptyText: "Yeni müraciətlər gələndə burada görünəcək." }),
            pagerBar({ page: page - 1, size: SIZE, total: result.total, onPage: (p) => { page = p + 1; load(); } }));
        } catch (error) {
            if (quiet) return;
            mount(listBox, errorState(error.code === "database_setup_required" ? { userMessage: "Dəstək müraciətləri hələ qurulmayıb: bazanın son miqrasiyası tətbiq olunmayıb." } : error, () => load()));
        }
    };

    const onLive = () => { load(true); if (reloadTicket && openId) reloadTicket(); };
    window.addEventListener("admin:support", onLive);

    ctx.container.replaceChildren(
        pageHead({ title: "Dəstək", desc: "Müştəri müraciətləri. Yeni müraciət və cavablar avtomatik gəlir." }),
        card(toolbar(
            searchBox({ placeholder: "Nömrə, ad, e-poçt, mövzu…", value: f.search, onInput: (v) => { f.search = v; page = 1; load(); } }),
            filterSelect({ label: "Status", options: [{ value: "", label: "Bütün statuslar" }, ...STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))], onChange: (v) => { f.status = v; page = 1; load(); } }),
            filterSelect({ label: "Mövzu", options: [{ value: "", label: "Bütün mövzular" }, ...Object.entries(CATEGORIES).map(([value, label]) => ({ value, label }))], onChange: (v) => { f.category = v; page = 1; load(); } })), listBox));
    await load();
    if (ctx.query.ticket) openTicket(Number(ctx.query.ticket), () => load(true));
    return () => window.removeEventListener("admin:support", onLive);
}
