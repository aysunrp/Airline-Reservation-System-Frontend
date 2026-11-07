/* Shared interface pieces: toast messages, the confirmation dialog, the side drawer and the row action menu. */
import { h, icon, $ } from "./dom.js";

/* ---------- toast ---------- */
let toastHost = null;

export function toast(text, kind = "info", ms = 4200) {
    if (!toastHost) {
        toastHost = h("div", { class: "toasts", role: "status", "aria-live": "polite" });
        document.body.appendChild(toastHost);
    }
    const el = h("div", { class: "toast" + (kind === "error" ? " is-error" : kind === "success" ? " is-success" : "") },
        h("span", { text: text }),
        h("button", { type: "button", "aria-label": "Bağla", on: { click: () => el.remove() } }, "×"));
    toastHost.appendChild(el);
    setTimeout(() => el.remove(), kind === "error" ? Math.max(ms, 7000) : ms);
}

export const ok = (text) => toast(text, "success");
export const fail = (text) => toast(text, "error");

/* ---------- confirm ---------- */
export function confirmDialog({ title, text, confirmLabel = "Təsdiqlə", danger = false }) {
    return new Promise((resolve) => {
        const previous = document.activeElement;
        const cancel = h("button", { class: "btn btn-secondary", type: "button" }, "Ləğv et");
        const accept = h("button", { class: "btn " + (danger ? "btn-danger" : "btn-primary"), type: "button" }, confirmLabel);
        const wrap = h("div", { class: "modal-wrap", role: "alertdialog", "aria-modal": "true", "aria-label": title },
            h("div", { class: "modal" }, h("h2", { text: title }), h("p", { text: text }), h("div", { class: "modal-actions" }, cancel, accept)));
        const done = (answer) => {
            document.removeEventListener("keydown", onKey, true);
            wrap.remove();
            if (previous && previous.focus) previous.focus();
            resolve(answer);
        };
        const onKey = (event) => { if (event.key === "Escape") { event.stopPropagation(); done(false); } };
        cancel.addEventListener("click", () => done(false));
        accept.addEventListener("click", () => done(true));
        wrap.addEventListener("mousedown", (event) => { if (event.target === wrap) done(false); });
        document.addEventListener("keydown", onKey, true);
        document.body.appendChild(wrap);
        cancel.focus();
    });
}

/* ---------- drawer ---------- */
let openDrawers = 0;

/*
 * Opens a panel from the right. content: a node; footer: nodes for the bottom bar.
 * guard(): returns true when closing would lose unsaved work (the admin is asked first).
 * Returns { close, body, setFooter, setTitle }.
 */
export function openDrawer({ title, content, footer, wide = false, guard, onClose }) {
    const previous = document.activeElement;
    const overlay = h("div", { class: "overlay" });
    const closeButton = h("button", { class: "btn btn-ghost btn-icon", type: "button", "aria-label": "Bağla" }, icon("close"));
    const titleEl = h("h2", { class: "drawer-title", text: title });
    const body = h("div", { class: "drawer-body" }, content);
    const foot = h("div", { class: "drawer-foot", hidden: !footer });
    if (footer) foot.append(...[].concat(footer));
    const panel = h("aside", { class: "drawer" + (wide ? " is-wide" : ""), role: "dialog", "aria-modal": "true", "aria-label": title },
        h("div", { class: "drawer-head" }, titleEl, closeButton), body, foot);

    let closed = false;
    const finish = () => {
        if (closed) return;
        closed = true;
        document.removeEventListener("keydown", onKey, true);
        panel.classList.remove("is-open");
        overlay.classList.remove("is-open");
        setTimeout(() => { panel.remove(); overlay.remove(); }, 230);
        openDrawers -= 1;
        if (!openDrawers) document.body.style.overflow = "";
        if (previous && previous.focus && document.contains(previous)) previous.focus();
        if (onClose) onClose();
    };
    const requestClose = async () => {
        if (guard && guard()) {
            const leave = await confirmDialog({ title: "Dəyişikliklər saxlanmayıb", text: "Çıxsan, yazdıqların itəcək.", confirmLabel: "Çıx", danger: true });
            if (!leave) return;
        }
        finish();
    };
    const onKey = (event) => {
        if (event.key !== "Escape" || document.querySelector(".modal-wrap")) return;
        event.stopPropagation();
        requestClose();
    };
    closeButton.addEventListener("click", requestClose);
    overlay.addEventListener("mousedown", requestClose);
    document.addEventListener("keydown", onKey, true);
    document.body.append(overlay, panel);
    document.body.style.overflow = "hidden";
    openDrawers += 1;
    requestAnimationFrame(() => {
        overlay.classList.add("is-open");
        panel.classList.add("is-open");
        const first = $("input:not([type=hidden]):not([disabled]), select, textarea", body);
        if (first) first.focus();
    });

    return {
        close: finish,
        body,
        setTitle: (text) => { titleEl.textContent = text; },
        setFooter: (nodes) => { foot.replaceChildren(...[].concat(nodes || [])); foot.hidden = !nodes; }
    };
}

/* ---------- row action menu ---------- */
let currentMenu = null;

export function closeMenu() {
    if (currentMenu) { currentMenu.remove(); currentMenu = null; }
}

/* items: [{ label, onClick, danger, hidden }] or "-" for a divider. */
export function openMenu(anchor, items) {
    closeMenu();
    const list = items.filter((item) => item === "-" || !item.hidden);
    if (!list.length) return;
    const menu = h("div", { class: "menu", role: "menu" }, list.map((item) => item === "-"
        ? h("hr")
        : h("button", { type: "button", role: "menuitem", class: item.danger ? "is-danger" : "", on: { click: () => { closeMenu(); item.onClick(); } } }, item.label)));
    document.body.appendChild(menu);
    const rect = anchor.getBoundingClientRect();
    const width = menu.offsetWidth;
    menu.style.top = Math.min(rect.bottom + 4, window.innerHeight - menu.offsetHeight - 8) + "px";
    menu.style.left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)) + "px";
    currentMenu = menu;
    const first = menu.querySelector("button");
    if (first) first.focus();
}

document.addEventListener("mousedown", (event) => { if (currentMenu && !event.target.closest(".menu")) closeMenu(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });
window.addEventListener("scroll", closeMenu, true);
window.addEventListener("hashchange", closeMenu);
