import { h, mount } from "../core/dom.js";
import { crudView } from "../components/resource.js";
import { money } from "../core/format.js";
import { activeBadge } from "../components/badge.js";
import { cellMain } from "../components/table.js";
import { yesNoAll } from "../components/toolbar.js";

const status = { label: "Status", options: yesNoAll(), test: (r, v) => r.isActive === (v === "Active") };

const baggage = crudView({
    title: "Baqaj", desc: "Sərnişinin rezervasiyaya əlavə edə biləcəyi baqaj seçimləri.",
    noun: "Baqaj seçimi", endpoint: "api/admin/booking-options/baggage", createLabel: "Yeni baqaj seçimi",
    label: (r) => r.name, searchText: (r) => [r.code, r.name].join(" "), filters: [status],
    columns: [
        { label: "Seçim", render: (r) => cellMain(r.name, r.code) },
        { label: "Çəki", num: true, render: (r) => r.weightKg + " kq" },
        { label: "Qiymət", num: true, render: (r) => money(r.price) },
        { label: "Status", render: (r) => activeBadge(r.isActive) }
    ],
    fields: () => [
        { key: "code", label: "Kod" }, { key: "name", label: "Ad" },
        { key: "weightKg", label: "Çəki (kq)", type: "number", min: 0 }, { key: "price", label: "Qiymət ($)", type: "number", min: 0 },
        { key: "isActive", label: "Status", type: "switch", switchLabel: "Aktiv" }
    ],
    defaults: () => ({ isActive: true }),
    toForm: (r) => ({ code: r.code, name: r.name, weightKg: r.weightKg, price: r.price, isActive: r.isActive }),
    toRequest: (d) => ({ code: d.code, name: d.name, weightKg: d.weightKg, price: d.price, isActive: d.isActive })
});

const meals = crudView({
    title: "Yemək", desc: "Sərnişinin rezervasiyaya əlavə edə biləcəyi yeməklər.",
    noun: "Yemək", endpoint: "api/admin/booking-options/meals", createLabel: "Yeni yemək",
    label: (r) => r.name, searchText: (r) => [r.code, r.name, r.description].join(" "), filters: [status],
    columns: [
        { label: "Yemək", render: (r) => cellMain(r.name, r.code) },
        { label: "Təsvir", render: (r) => r.description || "—" },
        { label: "Qiymət", num: true, render: (r) => money(r.price) },
        { label: "Status", render: (r) => activeBadge(r.isActive) }
    ],
    fields: () => [
        { key: "code", label: "Kod" }, { key: "name", label: "Ad" },
        { key: "description", label: "Təsvir", type: "textarea", required: false, rows: 3 },
        { key: "price", label: "Qiymət ($)", type: "number", min: 0 },
        { key: "isActive", label: "Status", type: "switch", switchLabel: "Aktiv" }
    ],
    defaults: () => ({ isActive: true }),
    toForm: (r) => ({ code: r.code, name: r.name, description: r.description || "", price: r.price, isActive: r.isActive }),
    toRequest: (d) => ({ code: d.code, name: d.name, description: d.description || null, price: d.price, isActive: d.isActive })
});

/* Two small lists under one roof: tabs instead of two long tables on one page. */
export async function render(ctx) {
    const tabs = [["baggage", "Baqaj", baggage], ["meals", "Yemək", meals]];
    let active = ctx.query.tab === "meals" ? "meals" : "baggage";
    const body = h("div");
    const tabBar = h("div", { class: "tabs", role: "tablist", style: { marginBottom: "24px" } });

    const draw = async () => {
        tabBar.replaceChildren(...tabs.map(([key, label]) => h("button", {
            class: "tab" + (key === active ? " is-active" : ""), type: "button", role: "tab", "aria-selected": String(key === active),
            on: { click: () => { active = key; ctx.replaceQuery({ tab: key }); draw(); } }
        }, label)));
        const holder = h("div");
        mount(body, holder);
        await tabs.find(([key]) => key === active)[2].render({ ...ctx, container: holder });
        // The tab already names the list: only the "add" button of the inner heading is kept.
        const head = holder.querySelector(".page-head");
        if (head) {
            const actions = head.querySelector(".page-actions");
            head.replaceChildren(h("div"), actions || h("div"));
            head.style.marginBottom = "16px";
        }
    };

    ctx.container.replaceChildren(
        h("div", { class: "page-head" }, h("div", null, h("h1", { class: "page-title", text: "Baqaj və yemək" }), h("p", { class: "page-desc", text: "Rezervasiya zamanı əlavə seçilə bilən xidmətlər." }))),
        tabBar, body);
    await draw();
}
