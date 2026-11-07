/* The cards of the home page ("why" and "premium"): list, create, edit with picture, order, active switch, delete. */
import { h, mount } from "../../core/dom.js";
import * as api from "../../core/api.js";
import { ok, fail, confirmDialog } from "../../core/ui.js";
import { button, iconButton, loadingBlock, errorState } from "../../components/page.js";
import { dataTable } from "../../components/table.js";
import { activeBadge } from "../../components/badge.js";
import { openForm } from "../../components/form.js";
import { cellMain } from "../../components/table.js";

const ICONS = [{ value: "", label: "İkon yoxdur" }, { value: "booking", label: "Bilet" }, { value: "seat", label: "Oturacaq" }, { value: "trips", label: "Səfərlər" }, { value: "status", label: "Status" }, { value: "premium", label: "Premium" }, { value: "support", label: "Dəstək" }];

export const imageSrc = (path) => {
    const text = String(path || "");
    if (!text) return "";
    if (/^https?:\/\//i.test(text) || text.startsWith("assets/")) return text;
    return api.url("/media/" + text.replace(/^\/+/, ""));
};

export function cardsManager(section, { onChange, hasImage = section === "premium" } = {}) {
    const box = h("div", null, loadingBlock());
    let rows = [];

    const edit = async (card) => {
        const saved = await openForm({
            title: card ? "Kart: redaktə" : "Yeni kart",
            fields: [
                { key: "title", label: "Başlıq", maxLength: 200, span2: true },
                { key: "description", label: "Təsvir", type: "textarea", maxLength: 1000 },
                { key: "label", label: "Etiket", maxLength: 100, required: false },
                { key: "iconKey", label: "İkon", type: "select", options: ICONS, required: false },
                { key: "linkText", label: "Link mətni", maxLength: 100, required: false },
                { key: "linkUrl", label: "Link ünvanı", maxLength: 500, required: false, placeholder: "booking.html və ya https://…", validate: (v) => (v && !/^(https:\/\/\S+|[a-z0-9-]+\.html(#[A-Za-z0-9_-]+)?)$/i.test(v) ? "Link səhifə adı (məs. booking.html) və ya https:// olmalıdır." : "") },
                ...(hasImage ? [{ key: "image", label: "Şəkil", type: "image", currentImage: card ? imageSrc(card.imagePath) : "", removable: true }, { key: "imageAlt", label: "Şəklin alternativ mətni", maxLength: 200, required: false, span2: true }] : []),
                { key: "sortOrder", label: "Sıra nömrəsi", type: "number", min: 1, required: false, hint: "Boş = sona əlavə olunur." },
                { key: "isActive", label: "Saytda göstərilsin", type: "switch", switchLabel: "Aktiv" }
            ],
            values: card ? { title: card.title, description: card.description, label: card.label || "", iconKey: card.iconKey || "", linkText: card.linkText || "", linkUrl: card.linkUrl || "", imageAlt: card.imageAlt || "", sortOrder: card.sortOrder, isActive: card.isActive } : { isActive: true, iconKey: "" },
            wide: true,
            onSubmit: async (d) => {
                const body = { section, title: d.title, description: d.description, label: d.label || null, linkText: d.linkText || null, linkUrl: d.linkUrl || null, iconKey: d.iconKey || null, imageAlt: d.imageAlt || null, sortOrder: d.sortOrder, isActive: d.isActive };
                const saved = card ? await api.put("api/admin/home-cards/" + card.id, body) : await api.post("api/admin/home-cards", body);
                if (hasImage) {
                    if (d.image) await api.upload("POST", `api/admin/home-cards/${saved.id}/image`, d.image);
                    else if (d.imageRemove && card) await api.del(`api/admin/home-cards/${saved.id}/image`);
                }
                return saved;
            }
        });
        if (saved) { ok(card ? "Kart yeniləndi." : "Kart əlavə olundu."); load(); if (onChange) onChange(); }
    };

    const remove = async (card) => {
        if (!(await confirmDialog({ title: "Kart silinsin?", text: `“${card.title}” və yüklənmiş şəkli silinəcək. Bu geri qaytarıla bilməz.`, confirmLabel: "Sil", danger: true }))) return;
        try { await api.del("api/admin/home-cards/" + card.id); ok("Kart silindi."); load(); if (onChange) onChange(); } catch (error) { fail(api.message(error)); }
    };

    const move = async (card, direction) => {
        const i = rows.findIndex((r) => r.id === card.id);
        const other = rows[direction === "up" ? i - 1 : i + 1];
        if (!other) return;
        const put = (c, order) => api.put("api/admin/home-cards/" + c.id, { section, title: c.title, description: c.description, label: c.label, linkText: c.linkText, linkUrl: c.linkUrl, iconKey: c.iconKey, imageAlt: c.imageAlt, sortOrder: order, isActive: c.isActive });
        let a = card.sortOrder;
        let b = other.sortOrder;
        if (a === b) b = direction === "up" ? a - 1 : a + 1;
        try { await put(card, b); await put(other, a); load(); if (onChange) onChange(); } catch (error) { fail(api.message(error)); }
    };

    const toggleActive = async (card) => {
        try {
            await api.put("api/admin/home-cards/" + card.id, { section, title: card.title, description: card.description, label: card.label, linkText: card.linkText, linkUrl: card.linkUrl, iconKey: card.iconKey, imageAlt: card.imageAlt, sortOrder: card.sortOrder, isActive: !card.isActive });
            load(); if (onChange) onChange();
        } catch (error) { fail(api.message(error)); }
    };

    async function load() {
        try {
            rows = (await api.get("api/admin/home-cards", { section })).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
            mount(box, h("div", { class: "stack-sm" },
                h("div", { class: "row", style: { justifyContent: "space-between" } }, h("strong", { text: section === "premium" ? "Premium təcrübə kartları" : "Niyə AEROVA kartları" }), button("Kart əlavə et", { variant: "secondary", small: true, iconName: "plus", onClick: () => edit(null) })),
                h("div", { class: "card" }, dataTable(rows, [
                    ...(hasImage ? [{ label: "Şəkil", render: (r) => (r.imagePath ? h("img", { class: "city-thumb", src: imageSrc(r.imagePath), alt: "" }) : "—") }] : []),
                    { label: "Kart", render: (r) => cellMain(r.title, r.description) },
                    { label: "Sıra", num: true, render: (r) => h("span", { class: "row", style: { justifyContent: "flex-end", gap: "2px", flexWrap: "nowrap" } }, iconButton("up", "Yuxarı", () => move(r, "up")), String(r.sortOrder), iconButton("down", "Aşağı", () => move(r, "down"))) },
                    { label: "Status", render: (r) => activeBadge(r.isActive) }
                ], { onRowClick: edit, actions: (r) => [{ label: "Redaktə et", onClick: () => edit(r) }, { label: r.isActive ? "Gizlət" : "Göstər", onClick: () => toggleActive(r) }, "-", { label: "Sil", danger: true, onClick: () => remove(r) }], emptyTitle: "Hələ kart yoxdur" }))));
        } catch (error) { mount(box, errorState(error, load)); }
    }
    load();
    return box;
}
