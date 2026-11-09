/* The permanent frame: sidebar (grouped menu), top bar (title, search, theme, bell) and the content area. */
import { h, icon, $$ } from "./dom.js";
import { GROUPS } from "./nav.js";
import * as auth from "./auth.js";
import { onChange } from "./router.js";
import { openPalette } from "./palette.js";
import { bell } from "./live.js";
import { roleLabel } from "./format.js";

const THEME_KEY = "aerovaTheme";

function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (error) { /* lasts for this page only */ }
}

export function buildShell() {
    const visibleGroups = GROUPS.filter((group) => !group.superOnly || auth.isSuper());
    const shell = h("div", { class: "shell" });
    const content = h("main", { class: "content", id: "content", tabindex: "-1" });
    const crumb = h("div", { class: "topbar-title" });

    const closeMenu = () => shell.classList.remove("is-menu-open");

    /* ---------- sidebar ---------- */
    const navEl = h("nav", { class: "nav", "aria-label": "Əsas menyu" });
    const groupEls = {};

    for (const group of visibleGroups) {
        if (group.items.length === 1) {
            const item = group.items[0];
            navEl.appendChild(h("a", { class: "nav-top", href: "#" + item.path, dataset: { path: item.path }, on: { click: closeMenu } }, icon(item.icon, 18).cloneNode(true), item.label));
            continue;
        }
        const sub = h("div", { class: "nav-sub" }, group.items.map((item) =>
            h("a", { class: "nav-link", href: "#" + item.path, dataset: { path: item.path }, on: { click: closeMenu } }, item.label)));
        const toggle = h("button", { class: "nav-top", type: "button", "aria-expanded": "false" },
            h("span", { class: "row", style: { gap: "12px", flexWrap: "nowrap" } }, icon(group.icon, 18), group.label), icon("chevron", 14));
        toggle.querySelector("svg:last-child").classList.add("nav-caret");
        const el = h("div", { class: "nav-group" }, toggle, sub);
        toggle.addEventListener("click", () => {
            const open = el.classList.toggle("is-open");
            toggle.setAttribute("aria-expanded", String(open));
        });
        groupEls[group.id] = { el, toggle };
        navEl.appendChild(el);
    }

    const me = auth.user();
    const sidebar = h("aside", { class: "sidebar" },
        h("div", { class: "sidebar-brand" }, h("div", { class: "brand-word", text: "AEROVA" }), h("div", { class: "brand-sub", text: "Admin" })),
        navEl,
        h("div", { class: "sidebar-foot" },
            h("div", { class: "who" }, h("div", { class: "avatar", text: auth.initials() }),
                h("div", { style: { minWidth: 0 } }, h("div", { class: "who-name", text: auth.displayName() }), h("div", { class: "who-role", text: roleLabel(me && me.role) }))),
            h("a", { class: "nav-link", href: "index.html", title: "Saytın ana səhifəsinə qayıt" }, icon("home", 18), "Ana səhifəyə qayıt"),
            h("button", { class: "nav-link", type: "button", on: { click: auth.logout } }, icon("logout", 18), "Çıxış")));

    /* ---------- top bar ---------- */
    const themeButton = h("button", { class: "btn btn-ghost btn-icon", type: "button", "aria-label": "Tema" });
    const paintTheme = () => {
        const dark = currentTheme() === "dark";
        themeButton.replaceChildren(icon(dark ? "sun" : "moon"));
        themeButton.setAttribute("aria-label", dark ? "Açıq temaya keç" : "Tünd temaya keç");
        themeButton.title = themeButton.getAttribute("aria-label");
    };
    themeButton.addEventListener("click", () => { setTheme(currentTheme() === "dark" ? "light" : "dark"); paintTheme(); });
    paintTheme();

    const topbar = h("header", { class: "topbar" },
        h("button", { class: "btn btn-ghost btn-icon menu-toggle", type: "button", "aria-label": "Menyunu aç", on: { click: () => shell.classList.toggle("is-menu-open") } }, icon("menu")),
        crumb,
        h("div", { class: "topbar-spacer" }),
        h("button", { class: "search-trigger", type: "button", on: { click: openPalette } }, icon("search", 16), h("span", { text: "Axtar və ya keç…" }), h("span", { class: "kbd", text: "Ctrl K" })),
        themeButton,
        bell());

    shell.append(sidebar, h("div", { class: "main" }, topbar, content));

    shell.addEventListener("click", (event) => { if (event.target === shell) closeMenu(); });

    /* The active link, the opened group and the breadcrumb follow the route. */
    onChange((path, item) => {
        $$(".nav-top[data-path], .nav-link[data-path]", navEl).forEach((a) => {
            const active = a.dataset.path === path;
            a.classList.toggle("is-active", active);
            if (active) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
        });
        if (item && groupEls[item.groupId]) {
            groupEls[item.groupId].el.classList.add("is-open");
            groupEls[item.groupId].toggle.setAttribute("aria-expanded", "true");
        }
        crumb.replaceChildren(...(item && item.groupId !== "dashboard" ? [h("span", { text: item.group }), icon("chevron", 12), h("strong", { text: item.label })] : [h("strong", { text: item ? item.label : "AEROVA Admin" })]));
        document.title = (item ? item.label + " · " : "") + "AEROVA Admin";
        closeMenu();
    });

    return { shell, content };
}
