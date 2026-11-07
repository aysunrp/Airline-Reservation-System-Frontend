/* The questions of the support page: list, create, edit, order, active switch, delete. */
import { h, mount } from "../../core/dom.js";
import * as api from "../../core/api.js";
import { ok, fail, confirmDialog } from "../../core/ui.js";
import { button, iconButton, loadingBlock, errorState } from "../../components/page.js";
import { dataTable, cellMain } from "../../components/table.js";
import { activeBadge } from "../../components/badge.js";
import { openForm } from "../../components/form.js";

export function faqManager({ onChange } = {}) {
    const box = h("div", null, loadingBlock());
    let rows = [];

    const body = (item, order) => ({ question: item.question, answer: item.answer, sortOrder: order, isActive: item.isActive });

    const edit = async (item) => {
        const saved = await openForm({
            title: item ? "Sual: redaktə" : "Yeni sual", wide: true,
            fields: [
                { key: "question", label: "Sual", maxLength: 300, span2: true },
                { key: "answer", label: "Cavab", type: "textarea", maxLength: 3000, rows: 6 },
                { key: "sortOrder", label: "Sıra nömrəsi", type: "number", min: 1, required: false, hint: "Boş = sona əlavə olunur." },
                { key: "isActive", label: "Saytda göstərilsin", type: "switch", switchLabel: "Aktiv" }
            ],
            values: item ? { question: item.question, answer: item.answer, sortOrder: item.sortOrder, isActive: item.isActive } : { isActive: true },
            onSubmit: (d) => { const payload = { question: d.question, answer: d.answer, sortOrder: d.sortOrder, isActive: d.isActive }; return item ? api.put("api/admin/faq/" + item.id, payload) : api.post("api/admin/faq", payload); }
        });
        if (saved) { ok(item ? "Sual yeniləndi." : "Sual əlavə olundu."); load(); if (onChange) onChange(); }
    };

    const remove = async (item) => {
        if (!(await confirmDialog({ title: "Sual silinsin?", text: `“${item.question}” silinəcək. Bu geri qaytarıla bilməz.`, confirmLabel: "Sil", danger: true }))) return;
        try { await api.del("api/admin/faq/" + item.id); ok("Sual silindi."); load(); if (onChange) onChange(); } catch (error) { fail(api.message(error)); }
    };

    const move = async (item, direction) => {
        const i = rows.findIndex((r) => r.id === item.id);
        const other = rows[direction === "up" ? i - 1 : i + 1];
        if (!other) return;
        let a = item.sortOrder;
        let b = other.sortOrder;
        if (a === b) b = direction === "up" ? a - 1 : a + 1;
        try { await api.put("api/admin/faq/" + item.id, body(item, b)); await api.put("api/admin/faq/" + other.id, body(other, a)); load(); if (onChange) onChange(); } catch (error) { fail(api.message(error)); }
    };

    const toggle = async (item) => {
        try { await api.put("api/admin/faq/" + item.id, { ...body(item, item.sortOrder), isActive: !item.isActive }); load(); if (onChange) onChange(); } catch (error) { fail(api.message(error)); }
    };

    async function load() {
        try {
            rows = (await api.get("api/admin/faq")).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
            mount(box, h("div", { class: "stack-sm" },
                h("div", { class: "row", style: { justifyContent: "space-between" } }, h("strong", { text: `Suallar (${rows.length})` }), button("Sual əlavə et", { variant: "secondary", small: true, iconName: "plus", onClick: () => edit(null) })),
                h("div", { class: "card" }, dataTable(rows, [
                    { label: "Sual", render: (r) => cellMain(r.question, r.answer.length > 90 ? r.answer.slice(0, 90) + "…" : r.answer) },
                    { label: "Sıra", num: true, render: (r) => h("span", { class: "row", style: { justifyContent: "flex-end", gap: "2px", flexWrap: "nowrap" } }, iconButton("up", "Yuxarı", () => move(r, "up")), String(r.sortOrder), iconButton("down", "Aşağı", () => move(r, "down"))) },
                    { label: "Status", render: (r) => activeBadge(r.isActive) }
                ], { onRowClick: edit, actions: (r) => [{ label: "Redaktə et", onClick: () => edit(r) }, { label: r.isActive ? "Gizlət" : "Göstər", onClick: () => toggle(r) }, "-", { label: "Sil", danger: true, onClick: () => remove(r) }], emptyTitle: "Hələ sual yoxdur" }))));
        } catch (error) { mount(box, errorState(error, load)); }
    }
    load();
    return box;
}
