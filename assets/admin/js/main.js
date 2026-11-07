/* Entry point: check the sign-in, build the frame, start the router and the live updates. */
import { h } from "./core/dom.js";
import { gate } from "./core/auth.js";
import { buildShell } from "./core/shell.js";
import { start } from "./core/router.js";
import { startLive } from "./core/live.js";

const root = document.getElementById("app");

function gateScreen({ title, text, login, retry }) {
    root.replaceChildren(h("div", { class: "gate" }, h("div", { class: "gate-box", role: "alert" },
        h("div", { class: "brand-word", text: "AEROVA" }),
        h("h1", { text: title }),
        h("p", { text }),
        h("div", { class: "row", style: { justifyContent: "center" } },
            login ? h("a", { class: "btn btn-primary", href: "login.html?next=admin.html" }, "Daxil ol") : null,
            retry ? h("button", { class: "btn btn-primary", type: "button", on: { click: () => location.reload() } }, "Yenidən cəhd et") : null,
            h("a", { class: "btn btn-secondary", href: "index.html" }, "Ana səhifəyə qayıt")))));
}

async function boot() {
    root.replaceChildren(h("div", { class: "gate" }, h("div", { class: "gate-box" }, h("div", { class: "brand-word", text: "AEROVA" }), h("p", { text: "Yoxlanılır…" }))));
    const result = await gate();
    if (result.redirect) return;
    if (!result.ok) { gateScreen(result); return; }

    const { shell, content } = buildShell();
    root.replaceChildren(shell);
    start(content);
    startLive();
}

boot();
