import { h, mount } from "../core/dom.js";
import * as api from "../core/api.js";
import { auditLabel, AUDIT_ACTIONS, roleLabel } from "../core/format.js";
import { pageHead, card, errorState, loadingBlock } from "../components/page.js";
import { dataTable, cellMain } from "../components/table.js";
import { filterSelect, toolbar } from "../components/toolbar.js";

export async function render(ctx) {
    let action = "";
    const listBox = h("div");

    const load = async () => {
        mount(listBox, loadingBlock());
        try {
            const rows = await api.get("api/admin/audit-logs", { take: 200, action });
            mount(listBox, dataTable(rows, [
                { label: "Vaxt", render: (r) => String(r.createdAt || "").replace("T", " ").slice(0, 19) },
                { label: "Kim", render: (r) => (r.actorUserId != null ? `#${r.actorUserId}` + (r.actorRole ? " · " + roleLabel(r.actorRole) : "") : (r.actorRole === "Server" ? "Server" : "Daxil olunmayıb")) },
                { label: "Əməliyyat", render: (r) => auditLabel(r.action) },
                { label: "Obyekt", render: (r) => cellMain(r.targetType, r.targetId || "") },
                { label: "Təfərrüat", render: (r) => r.details || "—" }
            ], { emptyTitle: "Hələ qeyd yoxdur" }));
        } catch (error) { mount(listBox, errorState(error, load)); }
    };

    const actions = [{ value: "", label: "Bütün əməliyyatlar" }, ...AUDIT_ACTIONS.map((a) => ({ value: a, label: auditLabel(a) }))];
    ctx.container.replaceChildren(
        pageHead({ title: "Audit jurnalı", desc: "Kim nə vaxt nə etdi: son 200 qeyd. Yalnız SuperAdmin görür." }),
        card(toolbar(filterSelect({ label: "Əməliyyat", options: actions, onChange: (v) => { action = v; load(); } })), listBox));
    await load();
}
