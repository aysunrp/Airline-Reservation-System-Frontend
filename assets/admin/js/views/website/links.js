/* Menu and footer links: text, address, visibility and order of each one (stored as link.{id}.label|url|visible|order rows of the "site" page). */
import { h, mount } from "../../core/dom.js";
import * as api from "../../core/api.js";
import { ok, fail, confirmDialog } from "../../core/ui.js";
import { loadingBlock, errorState } from "../../components/page.js";
import { siteRows, saveValue, safeLink } from "./shared.js";

export const HEADER_LINKS = [
    { id: "nav.home", label: "Ana səhifə", url: "index.html" },
    { id: "nav.booking", label: "Bron", url: "booking.html" },
    { id: "nav.destinations", label: "İstiqamətlər", url: "destinations.html" },
    { id: "nav.brandStory", label: "AEROVA haqqında", url: "about-aerova.html" }
];

export const FOOTER_LINKS = [
    { id: "footer.home", label: "Ana səhifə", url: "index.html" },
    { id: "footer.flights", label: "Uçuşlar", url: "booking.html" },
    { id: "footer.destinations", label: "İstiqamətlər", url: "destinations.html" },
    { id: "nav.experience", label: "Təcrübə", url: "about-aerova.html" },
    { id: "footer.about", label: "Haqqımızda", url: "about-aerova.html" },
    { id: "footer.manageBooking", label: "Bronu idarə et", url: "manage-booking.html" },
    { id: "footer.myTrips", label: "Səyahətlərim", url: "my-trips.html" },
    { id: "nav.notifications", label: "Bildirişlər", url: "notifications.html" },
    { id: "footer.faqs", label: "Suallar", url: "support.html#faq" },
    { id: "footer.privacy", label: "Məxfilik siyasəti", url: "index.html#privacy" },
    { id: "footer.terms", label: "Şərtlər və qaydalar", url: "index.html#terms" }
];

const PARTS = ["label", "url", "visible", "order"];

export function linkEditor(links, { onSaved } = {}) {
    const box = h("div", null, loadingBlock());

    async function load() {
        let rows;
        try { rows = await siteRows("site"); } catch (error) { mount(box, errorState(error, load)); return; }
        const val = (id, part, fallback) => (rows[`link.${id}.${part}`] ? rows[`link.${id}.${part}`].textAz : fallback);

        const lines = links.map((link, index) => {
            const label = h("input", { class: "input", type: "text", maxlength: 100, value: val(link.id, "label", link.label), "aria-label": "Mətn" });
            const url = h("input", { class: "input", type: "text", maxlength: 300, value: val(link.id, "url", link.url), "aria-label": "Link" });
            const visible = h("input", { type: "checkbox", checked: val(link.id, "visible", "1") !== "0" });
            const order = h("input", { class: "input", type: "number", min: 0, max: 999, value: val(link.id, "order", String((index + 1) * 10)), "aria-label": "Sıra", style: { width: "84px" } });
            const err = h("div", { class: "field-error" });
            const reset = h("button", { class: "btn btn-ghost btn-sm", type: "button" }, "Standart");
            reset.addEventListener("click", async () => {
                const existing = PARTS.map((p) => rows[`link.${link.id}.${p}`]).filter(Boolean);
                if (!existing.length) { ok("Bu keçid artıq standartdır."); return; }
                if (!(await confirmDialog({ title: "Standarta qaytarılsın?", text: "Keçid standart mətn, link və sıraya qayıdacaq.", confirmLabel: "Qaytar" }))) return;
                try { await Promise.all(existing.map((r) => api.del("api/admin/site-content/" + r.id))); ok("Keçid standarta qaytarıldı."); load(); if (onSaved) onSaved(); } catch (error) { fail(api.message(error)); }
            });
            return { link, label, url, visible, order, err, row: h("tr", null,
                h("td", { "data-label": "Mətn" }, label), h("td", { "data-label": "Link" }, url, err),
                h("td", { "data-label": "Göstər" }, h("label", { class: "switch" }, visible, h("span", { class: "switch-track" }))), h("td", { "data-label": "Sıra" }, order), h("td", { class: "cell-actions" }, reset)) };
        });

        const save = h("button", { class: "btn btn-primary", type: "button" }, "Yadda saxla");
        save.addEventListener("click", async () => {
            let invalid = 0;
            lines.forEach((l) => {
                l.err.textContent = "";
                if (!l.label.value.trim()) { l.err.textContent = "Mətn boş ola bilməz."; invalid++; } else if (!safeLink(l.url.value)) { l.err.textContent = "Link səhifə adı (məs. about-aerova.html) və ya https:// ilə başlamalıdır."; invalid++; } else if (!/^\d{1,3}$/.test(l.order.value.trim())) { l.err.textContent = "Sıra 0–999 arası rəqəm olmalıdır."; invalid++; }
            });
            if (invalid) { fail("Səhvləri düzəlt, heç nə yadda saxlanılmadı."); return; }
            save.classList.add("is-busy"); save.disabled = true;
            let failed = 0;
            for (const l of lines) {
                const values = { label: l.label.value, url: l.url.value, visible: l.visible.checked ? "1" : "0", order: l.order.value };
                for (const part of PARTS) {
                    try { await saveValue("site", `link.${l.link.id}.${part}`, values[part], rows); } catch (error) { failed++; l.err.textContent = api.message(error); }
                }
            }
            save.classList.remove("is-busy"); save.disabled = false;
            if (failed) fail("Bəzi keçidlər yadda saxlanılmadı."); else { ok("Keçidlər yadda saxlanıldı."); if (onSaved) onSaved(); }
        });

        mount(box, h("div", { class: "stack-sm" },
            h("div", { class: "table-wrap" }, h("table", { class: "table link-table" }, h("thead", null, h("tr", null, ["Mətn", "Link", "Göstər", "Sıra"].map((t) => h("th", { text: t })), h("th"))), h("tbody", null, lines.map((l) => l.row)))),
            h("p", { class: "small muted", text: "Sıra kiçik rəqəmdən böyüyə doğrudur. “Göstər” söndürülsə keçid gizlənir." }),
            h("div", { class: "row", style: { justifyContent: "flex-end" } }, save)));
    }
    load();
    return box;
}
