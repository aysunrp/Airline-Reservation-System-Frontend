/* Building blocks shared by every Website screen: stored texts, text editors, image slots, accordion sections and the live preview. */
import { h, icon } from "../../core/dom.js";
import * as api from "../../core/api.js";
import { ok, fail } from "../../core/ui.js";
import { buildForm } from "../../components/form.js";
import { loadingBlock, errorState } from "../../components/page.js";

/* ---------- stored texts (api/admin/site-content) ---------- */
export async function siteRows(page) {
    const list = await api.get("api/admin/site-content", { page });
    const map = {};
    (list || []).forEach((row) => { map[row.key] = row; });
    return map;
}

/* Saves one value: changes the row, creates it, or removes it when emptied and the row may be removed. */
export async function saveValue(page, key, value, rows) {
    const text = String(value).trim();
    const row = rows[key];
    if (row) {
        if (row.textAz === text) return;
        if (!text) {
            if (row.canDelete === false) throw { userMessage: "Bu sahə boş ola bilməz." };
            await api.del("api/admin/site-content/" + row.id);
            delete rows[key];
            return;
        }
        const saved = await api.put("api/admin/site-content/" + row.id, { textAz: text });
        rows[key] = { ...row, textAz: (saved && saved.textAz) || text };
        return;
    }
    if (!text) return;
    const created = await api.post("api/admin/site-content", { page, key, textAz: text });
    rows[key] = created || { page, key, textAz: text, canDelete: true };
}

export const safeLink = (url) => {
    const text = String(url || "").trim();
    return /^[a-z0-9-]+\.html(#[A-Za-z0-9_-]+)?(\?[\w=&%.-]*)?$/.test(text) || (/^https:\/\//i.test(text) && !/\s/.test(text));
};

/*
 * A group of text fields saved together.
 * fields: [{ key, label, long, optional, link, hint, placeholder }]; page: the content page the keys belong to.
 */
export function textEditor({ page, rows, fields, onSaved, compact = false }) {
    const present = fields.filter((f) => f.optional || rows[f.key]);
    if (!present.length) return h("p", { class: "muted small", text: "Bu mətnlər hələ bazada yoxdur. API-ni yenidən başlat." });

    const defs = present.map((f) => ({
        key: f.key, label: f.label, type: f.long ? "textarea" : "text", required: !f.optional, span2: !!f.long || compact === false && f.wide,
        maxLength: f.long ? 1000 : 500, hint: f.hint, placeholder: f.placeholder, rows: 3,
        validate: f.link ? (value) => (value && !safeLink(value) ? "Link səhifə adı (məs. booking.html) və ya https:// ilə başlamalıdır." : "") : undefined
    }));
    const values = Object.fromEntries(present.map((f) => [f.key, rows[f.key] ? rows[f.key].textAz : ""]));
    let form = buildForm(defs, values);
    form.markClean();

    const hint = h("span", { class: "small", style: { color: "var(--warning)" }, hidden: true }, "Yadda saxlanmamış dəyişiklik var");
    const save = h("button", { class: "btn btn-primary", type: "button" }, "Yadda saxla");
    const cancel = h("button", { class: "btn btn-secondary", type: "button" }, "Ləğv et");
    const holder = h("div", null, form.el);

    const refresh = () => { hint.hidden = !form.isDirty(); };
    holder.addEventListener("input", refresh);
    cancel.addEventListener("click", () => {
        form = buildForm(defs, Object.fromEntries(present.map((f) => [f.key, rows[f.key] ? rows[f.key].textAz : ""])));
        form.markClean();
        holder.replaceChildren(form.el);
        refresh();
    });
    save.addEventListener("click", async () => {
        if (!form.validate()) return;
        const data = form.read();
        const changed = present.filter((f) => String(data[f.key]).trim() !== (rows[f.key] ? rows[f.key].textAz : ""));
        if (!changed.length) { ok("Dəyişiklik yoxdur."); return; }
        save.classList.add("is-busy"); save.disabled = true;
        const errors = {};
        for (const f of changed) {
            try { await saveValue(page, f.key, data[f.key], rows); } catch (error) { errors[f.key] = api.message(error); }
        }
        save.classList.remove("is-busy"); save.disabled = false;
        if (Object.keys(errors).length) { form.setErrors(errors); fail("Bəzi sahələr yadda saxlanılmadı."); } else { ok("Yadda saxlanıldı."); form.markClean(); }
        refresh();
        if (onSaved) onSaved();
    });

    const el = h("div", { class: "stack-sm" }, holder, h("div", { class: "row", style: { justifyContent: "flex-end" } }, hint, cancel, save));
    el.isDirty = () => form.isDirty();
    return el;
}

/* ---------- accordion section ---------- */
export function section({ title, where, open = false, body }) {
    const caret = icon("down", 16);
    caret.classList.add("acc-caret");
    const dot = h("span", { class: "dirty-dot", hidden: true, title: "Yadda saxlanmamış dəyişiklik" });
    const head = h("button", { class: "acc-head", type: "button", "aria-expanded": String(open) },
        h("div", { style: { minWidth: 0 } }, h("div", { class: "acc-title", text: title }), where ? h("div", { class: "acc-where", text: where }) : null), dot, caret);
    const content = h("div", { class: "acc-body" });
    const el = h("section", { class: "acc" + (open ? " is-open" : "") }, head, content);
    let built = false;
    const ensure = () => { if (!built) { built = true; content.replaceChildren(typeof body === "function" ? body() : body); } };
    if (open) ensure();
    head.addEventListener("click", () => {
        const now = el.classList.toggle("is-open");
        head.setAttribute("aria-expanded", String(now));
        if (now) ensure();
    });
    el.openUp = () => { el.classList.add("is-open"); head.setAttribute("aria-expanded", "true"); ensure(); };
    el.setDirty = (value) => { dot.hidden = !value; };
    return el;
}

/* ---------- image slots (logo and About page pictures) ---------- */
export function slotWidget(slotIds) {
    const box = h("div", null, loadingBlock());
    const load = async () => {
        try {
            const slots = await api.get("api/admin/media/slots");
            box.replaceChildren(...slots.filter((s) => slotIds.includes(s.slot)).map((s) => slotRow(s, load)));
        } catch (error) { box.replaceChildren(errorState(error, load)); }
    };
    load();
    return box;
}

function slotRow(slot, reload) {
    const preview = h("div", { class: "slot-preview" }, slot.url ? h("img", { src: api.url(slot.url), alt: "" }) : "Standart şəkil");
    const file = h("input", { type: "file", class: "input", accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp", "aria-label": slot.label });
    const err = h("div", { class: "field-error" });
    const upload = h("button", { class: "btn btn-primary btn-sm", type: "button", disabled: true }, "Yüklə");
    const revert = h("button", { class: "btn btn-secondary btn-sm", type: "button", disabled: !slot.path }, "Standarta qaytar");
    file.addEventListener("change", () => {
        const f = file.files[0];
        const bad = f && (!["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 10 * 1024 * 1024);
        err.textContent = bad ? "Yalnız JPG, PNG və ya WEBP, ən çox 10 MB." : "";
        upload.disabled = !f || !!bad;
        if (f && !bad) preview.replaceChildren(h("img", { src: URL.createObjectURL(f), alt: "" }));
    });
    upload.addEventListener("click", async () => {
        upload.classList.add("is-busy"); upload.disabled = true;
        try { await api.upload("POST", "api/admin/media/slots/" + encodeURIComponent(slot.slot), file.files[0]); ok("Şəkil yükləndi."); reload(); } catch (error) { err.textContent = api.message(error); upload.classList.remove("is-busy"); upload.disabled = false; }
    });
    revert.addEventListener("click", async () => {
        try { await api.del("api/admin/media/slots/" + encodeURIComponent(slot.slot)); ok("Standart şəkil bərpa olundu."); reload(); } catch (error) { fail(api.message(error)); }
    });
    return h("div", { class: "slot" }, preview, h("div", { class: "stack-sm" },
        h("div", { class: "cell-main", text: slot.label }),
        h("div", { class: "small muted", text: slot.path ? "Yüklənmiş şəkil istifadə olunur." : "Hazırda saytın öz standart şəkli göstərilir." }),
        file, err, h("div", { class: "row" }, upload, revert)));
}

/* ---------- live preview ---------- */
export function previewPane(url) {
    const frame = h("iframe", { src: url, title: "Saytın önizləməsi" });
    const pane = h("aside", { class: "preview-pane card" },
        h("div", { class: "preview-bar" }, h("strong", { text: "Önizləmə" }),
            h("div", { class: "row" },
                h("button", { class: "btn btn-ghost btn-sm", type: "button", on: { click: () => { frame.src = url; } } }, icon("refresh", 14), "Yenilə"),
                h("a", { class: "btn btn-ghost btn-sm", href: url, target: "_blank", rel: "noopener" }, icon("external", 14), "Yeni pəncərə"))),
        frame);
    pane.reload = () => { try { frame.contentWindow.location.reload(); } catch (error) { frame.src = url; } };
    return pane;
}

export const SOCIAL_FIELDS = [
    { key: "social.facebook", label: "Facebook", link: true, optional: true, placeholder: "https://…" },
    { key: "social.instagram", label: "Instagram", link: true, optional: true, placeholder: "https://…" },
    { key: "social.x", label: "X", link: true, optional: true, placeholder: "https://…" },
    { key: "social.youtube", label: "YouTube", link: true, optional: true, placeholder: "https://…" },
    { key: "social.linkedin", label: "LinkedIn", link: true, optional: true, placeholder: "https://…" }
];
export const CONTACT_FIELDS = [
    { key: "contact.email", label: "E-poçt", optional: true, placeholder: "info@aerova.az" },
    { key: "contact.phone", label: "Telefon", optional: true, placeholder: "+994 …" },
    { key: "contact.address", label: "Ünvan", optional: true, long: true }
];

/* A block that is filled when its data has arrived. */
export function lazy(task) {
    const box = h("div", null, loadingBlock());
    task().then((node) => box.replaceChildren(node)).catch((error) => box.replaceChildren(errorState(error, () => box.replaceChildren(...[lazy(task)]))));
    return box;
}

/* Settings stored on the "site" page (links, contact details): the same editor, rows loaded on demand. */
export const siteEditor = (fields, onSaved) => lazy(async () => textEditor({ page: "site", rows: await siteRows("site"), fields, onSaved }));
