import { h, debounce } from "../core/dom.js";

export function searchBox({ placeholder = "Axtar…", value = "", onInput, wait = 250 }) {
    const input = h("input", { class: "input search", type: "search", placeholder, value, "aria-label": placeholder, autocomplete: "off" });
    input.addEventListener("input", debounce(() => onInput(input.value.trim()), wait));
    return input;
}

/* options: [{ value, label }]; the first entry (value "") is the "all" choice. */
export function filterSelect({ label, options, value = "", onChange }) {
    const select = h("select", { class: "select", "aria-label": label },
        options.map((o) => h("option", { value: String(o.value), selected: String(o.value) === String(value) }, o.label)));
    select.addEventListener("change", () => onChange(select.value));
    return select;
}

export const toolbar = (...kids) => h("div", { class: "toolbar" }, kids);
export const spacer = () => h("div", { class: "toolbar-spacer" });

export const yesNoAll = (allLabel = "Bütün statuslar") => [
    { value: "", label: allLabel }, { value: "Active", label: "Aktiv" }, { value: "Inactive", label: "Qeyri-aktiv" }
];
