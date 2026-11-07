/* Hash router: "#/flights?search=TK" -> the "/flights" view with { search: "TK" }. Views are loaded on first visit. */
import { h, icon } from "./dom.js";
import { findItem } from "./nav.js";
import { isSuper } from "./auth.js";
import { skeleton, stateBox } from "../components/page.js";
import * as api from "./api.js";

let host = null;
let cleanup = null;
let token = 0;
const listeners = [];

export function parse(hash = window.location.hash) {
    const raw = String(hash || "").replace(/^#/, "") || "/";
    const [path, queryText = ""] = raw.split("?");
    const query = {};
    new URLSearchParams(queryText).forEach((value, key) => { query[key] = value; });
    return { path: path.startsWith("/") ? path : "/" + path, query };
}

export function navigate(path, query) {
    const text = query && Object.keys(query).length ? "?" + new URLSearchParams(query).toString() : "";
    const next = "#" + path + text;
    if (window.location.hash === next) window.dispatchEvent(new HashChangeEvent("hashchange"));
    else window.location.hash = next;
}

/* Updates the query of the current screen without re-rendering it (filters, selected record). */
export function replaceQuery(query) {
    const { path } = parse();
    const clean = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== "" && value != null));
    const text = Object.keys(clean).length ? "?" + new URLSearchParams(clean).toString() : "";
    history.replaceState(null, "", "#" + path + text);
}

export const onChange = (fn) => listeners.push(fn);

async function render() {
    const { path, query } = parse();
    const item = findItem(path);
    const mine = ++token;
    if (cleanup) { try { cleanup(); } catch (error) { /* the view is gone anyway */ } cleanup = null; }
    listeners.forEach((fn) => fn(path, item));
    window.scrollTo(0, 0);

    if (!item) {
        host.replaceChildren(stateBox({ icon: "search", title: "Belə bölmə yoxdur", text: "Ünvan səhv yazılıb və ya bölmə köçürülüb.", action: h("a", { class: "btn btn-primary", href: "#/" }, "Panelə qayıt") }));
        return;
    }
    if (item.superOnly && !isSuper()) {
        host.replaceChildren(stateBox({ icon: "shield", title: "Bu bölmə yalnız SuperAdmin üçündür", text: "Hesabının bu bölməyə icazəsi yoxdur.", action: h("a", { class: "btn btn-primary", href: "#/" }, "Panelə qayıt") }));
        return;
    }

    host.replaceChildren(skeleton(6));
    try {
        const mod = await item.load();
        if (mine !== token) return;
        host.replaceChildren();
        const result = await mod.render({ container: host, query, item, navigate, replaceQuery });
        if (mine !== token) { if (typeof result === "function") result(); return; }
        if (typeof result === "function") cleanup = result;
    } catch (error) {
        if (mine !== token) return;
        const forbidden = api.isForbidden(error);
        host.replaceChildren(stateBox({
            icon: "alert",
            title: forbidden ? "Bu əməliyyata icazən yoxdur" : "Bölmə yüklənmədi",
            text: forbidden ? "Hesabının bu bölməyə çıxışı yoxdur." : api.message(error),
            action: forbidden ? null : h("button", { class: "btn btn-primary", type: "button", on: { click: render } }, icon("refresh", 16), "Yenidən cəhd et")
        }));
        if (window.console) window.console.error(error);
    }
}

export function start(container) {
    host = container;
    window.addEventListener("hashchange", render);
    render();
}
