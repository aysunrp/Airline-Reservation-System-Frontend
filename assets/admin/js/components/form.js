/* Form fields, client-side checks in Azerbaijani, server error mapping and the drawer that hosts a form. */
import { h } from "../core/dom.js";
import { openDrawer, fail } from "../core/ui.js";
import * as api from "../core/api.js";
import { DAY_NAMES, DAY_SHORT } from "../core/format.js";

let counter = 0;

/*
 * field: { key, label, type, options, required, span2, hint, placeholder, min, max, maxLength, disabled, currentImage, removable }
 * types: text (default), email, password, number, date, time, datetime-local, textarea, select, switch, days, static, image
 */
export function buildForm(fields, values = {}) {
    const refs = {};
    const grid = h("div", { class: "form-grid" });

    for (const field of fields) {
        const id = "f" + ++counter + "-" + field.key;
        const value = values[field.key];
        const required = field.required !== false && !["switch", "days", "static", "image"].includes(field.type);
        const errorEl = h("div", { class: "field-error", id: id + "-err", role: "alert" });
        let control;
        let read;

        switch (field.type) {
            case "select": {
                control = h("select", { class: "select", id, disabled: !!field.disabled },
                    (field.options || []).map((o) => h("option", { value: String(o.value), selected: String(o.value) === String(value ?? "") }, o.label)));
                if (value === undefined && field.options && field.options.length) control.value = String(field.options[0].value);
                read = () => control.value;
                break;
            }
            case "textarea":
                control = h("textarea", { class: "textarea", id, maxlength: field.maxLength || 4000, placeholder: field.placeholder, rows: field.rows || 4 });
                control.value = value ?? "";
                read = () => control.value.trim();
                break;
            case "switch": {
                const input = h("input", { type: "checkbox", id, checked: !!value });
                control = h("label", { class: "switch", for: id }, input, h("span", { class: "switch-track" }), h("span", { text: field.switchLabel || field.label }));
                read = () => input.checked;
                break;
            }
            case "days": {
                const chosen = String(value || "Everyday").split(",").map((n) => n.trim());
                const boxes = DAY_NAMES.map((name) => {
                    const on = chosen.includes(name) || chosen.includes("Everyday") || (chosen.includes("Weekdays") && DAY_NAMES.indexOf(name) < 5);
                    return h("label", { class: "day" }, h("input", { type: "checkbox", value: name, checked: on }), h("span", { text: DAY_SHORT[name] }));
                });
                control = h("div", { class: "days", id }, boxes);
                read = () => boxes.map((b) => b.firstChild).filter((i) => i.checked).map((i) => i.value);
                break;
            }
            case "static":
                control = h("div", { class: "muted", id, text: value ?? "—" });
                read = () => undefined;
                break;
            case "upload": {
                // A web address that can also be filled by sending a file: field.uploader(file) resolves with the address.
                const urlInput = h("input", { class: "input", id, type: "text", placeholder: field.placeholder || "https://… və ya fayl yüklə", maxlength: 500 });
                urlInput.value = value ?? "";
                const picker = h("input", { type: "file", class: "input", accept: field.accept });
                const status = h("span", { class: "field-hint" });
                picker.addEventListener("change", async () => {
                    const file = picker.files[0];
                    if (!file) return;
                    status.textContent = "Yüklənir…";
                    try { urlInput.value = await field.uploader(file); status.textContent = "Fayl yükləndi."; urlInput.dispatchEvent(new Event("input", { bubbles: true })); } catch (error) { status.textContent = ""; errorEl.textContent = api.message(error); }
                });
                control = h("div", { class: "stack-sm" }, urlInput, picker, status);
                read = () => urlInput.value.trim();
                break;
            }
            case "image": {
                const preview = h("div", { class: "image-preview" }, field.currentImage ? h("img", { src: field.currentImage, alt: "" }) : "Şəkil yoxdur");
                const input = h("input", { type: "file", id, accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp", class: "input" });
                const remove = field.removable && field.currentImage ? h("input", { type: "checkbox" }) : null;
                input.addEventListener("change", () => {
                    const file = input.files[0];
                    errorEl.textContent = file ? imageProblem(file) : "";
                    if (file && !errorEl.textContent) preview.replaceChildren(h("img", { src: URL.createObjectURL(file), alt: "" }));
                    else if (file) input.value = "";
                });
                control = h("div", { class: "image-field" }, preview, h("div", { class: "stack-sm" }, input,
                    h("span", { class: "field-hint", text: "JPG, PNG və ya WEBP, ən çox 10 MB." }),
                    remove ? h("label", { class: "switch" }, remove, h("span", { class: "switch-track" }), h("span", { text: "Mövcud şəkli sil" })) : null));
                read = () => ({ file: input.files[0] || null, remove: !!(remove && remove.checked) });
                break;
            }
            default: {
                const type = field.type || "text";
                control = h("input", { class: "input", id, type, placeholder: field.placeholder, maxlength: field.maxLength, min: field.min, max: field.max, step: type === "number" ? (field.step || "any") : undefined, autocomplete: type === "password" ? "new-password" : "off", disabled: !!field.disabled });
                control.value = value ?? "";
                read = () => (type === "number" ? (control.value === "" ? null : Number(control.value)) : control.value.trim());
            }
        }

        const wrapper = h("div", { class: "field" + (field.span2 || ["textarea", "days", "image"].includes(field.type) ? " span-2" : "") },
            field.type === "switch" ? null : h("label", { class: "field-label", for: id }, field.label, field.required === false ? h("span", { class: "muted", text: " (ixtiyari)" }) : ""),
            control, field.hint ? h("div", { class: "field-hint", text: field.hint }) : null, errorEl);
        grid.appendChild(wrapper);
        refs[field.key] = { field, control, errorEl, wrapper, read, required };
        control.addEventListener && control.addEventListener("input", () => clearError(refs[field.key]));
    }

    const snapshot = () => JSON.stringify(read());

    function read() {
        const data = {};
        for (const key of Object.keys(refs)) {
            if (refs[key].field.type === "static") continue;
            const value = refs[key].read();
            if (refs[key].field.type === "image") { data[key] = value.file; data[key + "Remove"] = value.remove; } else data[key] = value;
        }
        return data;
    }

    let initial = null;

    return {
        el: h("form", { novalidate: "", on: { submit: (event) => event.preventDefault() } }, grid),
        read,
        markClean: () => { initial = snapshotSafe(read()); },
        isDirty: () => initial !== null && snapshotSafe(read()) !== initial,
        setErrors(map) {
            let first = null;
            for (const key of Object.keys(map)) {
                const ref = refs[key];
                if (!ref) continue;
                showError(ref, map[key]);
                first = first || ref;
            }
            if (first && first.control.focus) first.control.focus();
            return !!first;
        },
        validate() {
            let first = null;
            const data = read();
            for (const key of Object.keys(refs)) {
                const ref = refs[key];
                const problem = check(ref, data[key]);
                if (problem) { showError(ref, problem); first = first || ref; } else clearError(ref);
            }
            if (first && first.control.focus) first.control.focus();
            return !first;
        },
        refs
    };
}

function snapshotSafe(data) {
    return JSON.stringify(data, (key, value) => (value instanceof File ? "file:" + value.name + value.size : value));
}

function showError(ref, text) {
    ref.errorEl.textContent = text;
    ref.wrapper.classList.add("is-invalid");
    ref.control.setAttribute && ref.control.setAttribute("aria-invalid", "true");
}

function clearError(ref) {
    ref.errorEl.textContent = "";
    ref.wrapper.classList.remove("is-invalid");
    ref.control.removeAttribute && ref.control.removeAttribute("aria-invalid");
}

function imageProblem(file) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || !/\.(jpe?g|png|webp)$/i.test(file.name)) return "Yalnız JPG, PNG və ya WEBP şəkli seç.";
    if (file.size > 10 * 1024 * 1024) return "Şəkil 10 MB-dan böyük ola bilməz.";
    return "";
}

function check(ref, value) {
    const { field } = ref;
    if (field.type === "image") return value && value.file ? imageProblem(value.file) : "";
    if (field.type === "static" || field.type === "switch") return "";
    if (field.type === "days") return value.length ? "" : "Ən azı bir gün seç.";
    const empty = value === "" || value === null || value === undefined;
    if (empty) return ref.required ? "Bu sahə vacibdir." : "";
    if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Düzgün e-poçt ünvanı yaz.";
    if (field.type === "number") {
        if (!isFinite(value)) return "Rəqəm yaz.";
        if (field.min !== undefined && value < field.min) return `Ən azı ${field.min} olmalıdır.`;
        if (field.max !== undefined && value > field.max) return `Ən çoxu ${field.max} olmalıdır.`;
    }
    if (typeof value === "string" && field.maxLength && value.length > field.maxLength) return `Ən çox ${field.maxLength} simvol ola bilər.`;
    if (field.validate) return field.validate(value) || "";
    return "";
}

/*
 * Opens a form in the drawer. onSubmit(data) does the request and may throw; its result resolves the promise.
 * Resolves with null when the admin cancels.
 */
export function openForm({ title, fields, values, submitLabel = "Yadda saxla", onSubmit, wide = false, intro }) {
    return new Promise((resolve) => {
        const form = buildForm(fields, values);
        form.markClean();
        let result = null;
        let drawer = null;
        const cancel = h("button", { class: "btn btn-secondary", type: "button" }, "Ləğv et");
        const save = h("button", { class: "btn btn-primary", type: "submit" }, submitLabel);
        const hint = h("span", { class: "hint", hidden: true }, "Yadda saxlanmamış dəyişiklik var");

        const submit = async () => {
            if (!form.validate()) return;
            save.classList.add("is-busy");
            save.disabled = true;
            try {
                result = await onSubmit(form.read());
                form.markClean();
                drawer.close();
            } catch (error) {
                const mapped = api.fieldErrors(error);
                if (!form.setErrors(mapped) || Object.keys(mapped).length === 0) {
                    fail(api.message(error));
                }
            } finally {
                save.classList.remove("is-busy");
                save.disabled = false;
            }
        };
        form.el.addEventListener("submit", (event) => { event.preventDefault(); submit(); });
        form.el.addEventListener("input", () => { hint.hidden = !form.isDirty(); });
        save.addEventListener("click", submit);
        cancel.addEventListener("click", () => drawer.close());

        const content = h("div", { class: "stack-sm" }, intro ? h("p", { class: "muted", text: intro }) : null, form.el);
        drawer = openDrawer({ title, content, footer: [hint, cancel, save], wide, guard: () => form.isDirty(), onClose: () => resolve(result) });
    });
}
