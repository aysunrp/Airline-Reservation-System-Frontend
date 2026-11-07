/* Page-level building blocks: header, cards, loading skeleton, empty and error states. */
import { h, icon } from "../core/dom.js";
import * as api from "../core/api.js";

export function pageHead({ title, desc, actions }) {
    return h("header", { class: "page-head" },
        h("div", null, h("h1", { class: "page-title", text: title }), desc ? h("p", { class: "page-desc", text: desc }) : null),
        actions && actions.length ? h("div", { class: "page-actions" }, actions) : null);
}

export const card = (...kids) => h("section", { class: "card" }, kids);

export function cardHead(title, sub, actions) {
    return h("div", { class: "card-head" },
        h("div", null, h("h2", { class: "card-title", text: title }), sub ? h("p", { class: "card-sub", text: sub }) : null),
        actions ? h("div", { class: "row" }, actions) : null);
}

export function skeleton(lines = 5) {
    return h("div", { class: "card skeleton", "aria-busy": "true", "aria-label": "Yüklənir" }, Array.from({ length: lines }, () => h("span")));
}

export function stateBox({ icon: name = "empty", title, text, action }) {
    return h("div", { class: "state card" }, icon(name), h("h3", { text: title }), text ? h("p", { text }) : null, action || null);
}

export function emptyState(title, text, action) {
    return h("div", { class: "state" }, icon("empty"), h("h3", { text: title }), text ? h("p", { text }) : null, action || null);
}

export function errorState(error, retry) {
    return h("div", { class: "state", role: "alert" }, icon("alert"), h("h3", { text: "Yüklənmədi" }), h("p", { text: api.message(error) }),
        retry ? h("button", { class: "btn btn-secondary", type: "button", on: { click: retry } }, icon("refresh", 16), "Yenidən cəhd et") : null);
}

export function loadingBlock() {
    return h("div", { class: "skeleton", "aria-busy": "true" }, Array.from({ length: 4 }, () => h("span")));
}

export function button(label, { variant = "secondary", iconName, onClick, small = false, type = "button", title, disabled = false } = {}) {
    return h("button", { class: `btn btn-${variant}${small ? " btn-sm" : ""}`, type, title, disabled, on: onClick ? { click: onClick } : undefined },
        iconName ? icon(iconName, 16) : null, label);
}

export function iconButton(iconName, label, onClick, { small = true, variant = "ghost" } = {}) {
    return h("button", { class: `btn btn-${variant} btn-icon${small ? " btn-sm" : ""}`, type: "button", "aria-label": label, title: label, on: { click: onClick } }, icon(iconName, 16));
}

/* Runs an async action on a button: shows the busy state and always lets the button back. */
export async function busy(buttonEl, task) {
    buttonEl.classList.add("is-busy");
    buttonEl.disabled = true;
    try { return await task(); } finally { buttonEl.classList.remove("is-busy"); buttonEl.disabled = false; }
}
