/* The support bell in the top bar and the live updates (SignalR with a polling fallback). */
import { h, icon } from "./dom.js";
import * as api from "./api.js";
import { toast } from "./ui.js";
import { navigate } from "./router.js";
import { supportCategory } from "./format.js";

let items = [];
let bellButton = null;
let countEl = null;
let listEl = null;
let panel = null;

function titleText(title) {
    const text = String(title || "");
    const created = /^New support request (\S+)$/.exec(text);
    if (created) return "Yeni dəstək müraciəti " + created[1];
    const reply = /^Customer reply on (\S+)$/.exec(text);
    if (reply) return reply[1] + " üzrə müştəri cavabı";
    return text;
}

function messageText(message) {
    const text = String(message || "").trim();
    const withCategory = /^(.+?)\s+\(([A-Za-z]+)\)\s*$/.exec(text);
    return withCategory ? withCategory[1] + " · " + supportCategory(withCategory[2]) : text;
}

function paint() {
    const unread = items.filter((item) => !item.isRead).length;
    countEl.textContent = unread > 99 ? "99+" : String(unread);
    countEl.hidden = unread === 0;
    bellButton.setAttribute("aria-label", "Dəstək bildirişləri" + (unread ? " (" + unread + " oxunmamış)" : ""));
    listEl.replaceChildren(...(items.length
        ? items.slice(0, 20).map((item) => h("li", null, h("button", { class: "bell-item" + (item.isRead ? "" : " is-unread"), type: "button", on: { click: () => openItem(item) } },
            h("strong", { text: titleText(item.title) }), h("small", { text: messageText(item.message) + " · " + String(item.createdAt || "").slice(0, 16).replace("T", " ") }))))
        : [h("li", { class: "bell-item muted", text: "Hələ bildiriş yoxdur." })]));
}

function loadBell() {
    return api.get("api/notifications").then((list) => {
        items = list.filter((item) => item.type === "SupportStaff");
        paint();
    }).catch(() => { /* the bell is a convenience */ });
}

async function openTicket(number) {
    try {
        const page = await api.get("api/admin/support/tickets", { pageSize: 1, search: number });
        if (page.items.length) navigate("/support", { ticket: page.items[0].id });
    } catch (error) { /* the list is still there */ }
}

function openItem(item) {
    panel.hidden = true;
    const match = /SUP-[A-Z0-9]{6}/.exec(item.title || "");
    if (!item.isRead) {
        item.isRead = true;
        paint();
        api.patch("api/notifications/" + item.id + "/read").catch(() => {});
    }
    if (match) openTicket(match[0]);
}

export function bell() {
    countEl = h("span", { class: "bell-count", hidden: true });
    listEl = h("ul");
    bellButton = h("button", { class: "btn btn-ghost btn-icon", type: "button", "aria-haspopup": "true", "aria-expanded": "false", "aria-label": "Dəstək bildirişləri" }, icon("bell"), countEl);
    const readAll = h("button", { class: "btn btn-ghost btn-sm", type: "button", on: { click: () => api.patch("api/notifications/read-all").then(loadBell).catch(() => {}) } }, "Hamısını oxunmuş et");
    panel = h("div", { class: "bell-panel", hidden: true }, h("div", { class: "row", style: { justifyContent: "space-between", padding: "8px 12px" } }, h("strong", { text: "Bildirişlər" }), readAll), listEl);
    bellButton.addEventListener("click", () => {
        panel.hidden = !panel.hidden;
        bellButton.setAttribute("aria-expanded", String(!panel.hidden));
        if (!panel.hidden) loadBell();
    });
    document.addEventListener("click", (event) => { if (!event.target.closest(".bell-wrap")) { panel.hidden = true; bellButton.setAttribute("aria-expanded", "false"); } });
    return h("div", { class: "bell-wrap" }, bellButton, panel);
}

export function startLive() {
    loadBell();
    if (!window.AEROVA_REALTIME) return;
    const refreshViews = (detail) => window.dispatchEvent(new CustomEvent("admin:support", { detail }));
    const live = window.AEROVA_REALTIME.create({
        onEvent: (event) => {
            if (event.type === "ticketCreated" || event.type === "customerReplied") {
                loadBell();
                const text = event.type === "ticketCreated" ? "Yeni dəstək müraciəti " + event.ticketNumber : event.ticketNumber + " üzrə müştəri cavabı";
                toast(text, "info", 8000);
            }
            refreshViews(event);
        },
        onState: () => {},
        poll: () => { loadBell(); refreshViews(null); },
        onResync: () => { loadBell(); refreshViews(null); },
        pollMs: 5000
    });
    live.start();
}
