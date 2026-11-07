import { h } from "../../core/dom.js";
import * as api from "../../core/api.js";
import { ALL_ITEMS } from "../../core/nav.js";
import { pageHead } from "../../components/page.js";

const CARDS = [
    ["/website/home", "home"], ["/website/about", "about"], ["/website/destinations", "destinations"], ["/website/support", "support"],
    ["/website/header", null], ["/website/footer", "footer"], ["/website/media", "media"]
];

export async function render(ctx) {
    const stats = new Map();
    const grid = h("div", { class: "grid-cards" }, CARDS.map(([path, key]) => {
        const item = ALL_ITEMS.find((i) => i.path === path);
        const stat = h("p", { class: "small muted", text: " " });
        stats.set(key, stat);
        return h("a", { class: "card card-pad stack-sm", href: "#" + path, style: { textDecoration: "none" } }, h("h2", { class: "card-title", text: item.label }), h("p", { class: "muted", text: item.desc }), stat);
    }));
    ctx.container.replaceChildren(
        pageHead({ title: "Website idarəsi", desc: "Saytın hər səhifəsi öz idarəetmə mərkəzidir: mətnlər, şəkillər, kartlar və linklər orada birlikdədir." }),
        h("div", { class: "stack" }, h("p", { class: "note", text: "Uçuş, bron, ödəniş və digər əməliyyat bölmələri sol menyuda ayrıca qalır." }), grid));

    for (const key of ["home", "about", "support", "destinations", "footer"]) {
        api.get("api/admin/site-content", { page: key }).then((rows) => { stats.get(key).textContent = `${(rows || []).length} mətn`; }).catch(() => { stats.get(key).textContent = "—"; });
    }
    api.get("api/admin/home-cards").then((rows) => { stats.get("home").textContent += ` · ${rows.length} kart`; }).catch(() => {});
    api.get("api/admin/faq").then((rows) => { stats.get("support").textContent += ` · ${rows.length} sual`; }).catch(() => {});
    api.get("api/admin/destinations").then((rows) => { stats.get("destinations").textContent = `${rows.length} ölkə · ${rows.reduce((n, c) => n + c.cities.length, 0)} şəhər`; }).catch(() => {});
    api.get("api/admin/media").then((files) => { stats.get("media").textContent = `${files.length} fayl · ${files.filter((f) => !f.usedBy.length).length} istifadəsiz`; }).catch(() => { stats.get("media").textContent = "—"; });
}
