/* Ctrl+K: jump to any section, or paste a booking code (PNR) or a support number (SUP-XXXXXX). */
import { h } from "./dom.js";
import { ALL_ITEMS } from "./nav.js";
import { isSuper } from "./auth.js";
import { navigate } from "./router.js";

let open = false;

function entries(query) {
    const q = query.trim().toLowerCase();
    const list = ALL_ITEMS.filter((item) => !item.superOnly || isSuper())
        .filter((item) => !q || (item.label + " " + item.group + " " + (item.keywords || "")).toLowerCase().includes(q))
        .map((item) => ({ label: item.label, hint: item.group, go: () => navigate(item.path) }));
    const raw = query.trim();
    if (/^SUP-[A-Z0-9]{4,}$/i.test(raw)) list.unshift({ label: "Müraciət: " + raw.toUpperCase(), hint: "Dəstək", go: () => navigate("/support", { search: raw.toUpperCase() }) });
    else if (/^[A-Z0-9]{6}$/i.test(raw)) list.unshift({ label: "Bron: " + raw.toUpperCase(), hint: "PNR", go: () => navigate("/bookings", { pnr: raw.toUpperCase() }) });
    return list;
}

export function openPalette() {
    if (open) return;
    open = true;
    const previous = document.activeElement;
    let selected = 0;
    let current = [];
    const input = h("input", { type: "text", placeholder: "Bölmə, PNR və ya SUP-nömrə yaz…", "aria-label": "Axtarış", autocomplete: "off" });
    const list = h("ul", { role: "listbox" });
    const wrap = h("div", { class: "palette-wrap", on: { mousedown: (event) => { if (event.target === wrap) close(); } } }, h("div", { class: "palette", role: "dialog", "aria-modal": "true", "aria-label": "Sürətli keçid" }, input, list));

    const close = () => { open = false; wrap.remove(); document.removeEventListener("keydown", onKey, true); if (previous && previous.focus) previous.focus(); };
    const choose = (entry) => { close(); entry.go(); };
    const paint = () => {
        current = entries(input.value);
        selected = Math.min(selected, Math.max(0, current.length - 1));
        list.replaceChildren(...(current.length
            ? current.map((entry, i) => h("li", null, h("button", { type: "button", class: i === selected ? "is-selected" : "", on: { click: () => choose(entry), mousemove: () => { selected = i; paint(); } } }, h("span", { text: entry.label }), h("small", { text: entry.hint }))))
            : [h("li", { class: "muted", style: { padding: "12px" }, text: "Nəticə yoxdur." })]));
    };
    const onKey = (event) => {
        if (event.key === "Escape") { event.stopPropagation(); close(); }
        else if (event.key === "ArrowDown") { event.preventDefault(); selected = Math.min(current.length - 1, selected + 1); paint(); }
        else if (event.key === "ArrowUp") { event.preventDefault(); selected = Math.max(0, selected - 1); paint(); }
        else if (event.key === "Enter" && current[selected]) { event.preventDefault(); choose(current[selected]); }
    };
    input.addEventListener("input", () => { selected = 0; paint(); });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(wrap);
    paint();
    input.focus();
}

document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openPalette(); }
});
