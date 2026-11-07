/* A readable data table. On a phone every row turns into a card (td[data-label] is shown next to its value). */
import { h, icon } from "../core/dom.js";
import { openMenu } from "../core/ui.js";
import { emptyState } from "./page.js";

/*
 * columns: [{ label, render(row) -> node|string, class, num }]
 * options: { onRowClick(row), actions(row) -> menu items, emptyTitle, emptyText, emptyAction }
 */
export function dataTable(rows, columns, options = {}) {
    if (!rows.length) return emptyState(options.emptyTitle || "Heç nə tapılmadı", options.emptyText, options.emptyAction);

    const head = h("tr", null, columns.map((c) => h("th", { class: c.num ? "num" : "", text: c.label })), options.actions ? h("th", { class: "cell-actions" }, h("span", { class: "sr-only" }, "Əməliyyatlar")) : null);

    const body = rows.map((row) => {
        const tr = h("tr", { class: options.onRowClick ? "is-clickable" : "", tabindex: options.onRowClick ? "0" : undefined });
        columns.forEach((c) => tr.appendChild(h("td", { class: c.num ? "num" : "", "data-label": c.label }, c.render(row))));
        if (options.actions) {
            const items = () => options.actions(row);
            const cell = h("td", { class: "cell-actions" },
                h("button", { class: "btn btn-ghost btn-icon btn-sm", type: "button", "aria-label": "Əməliyyatlar", "aria-haspopup": "menu", on: { click: (event) => { event.stopPropagation(); openMenu(event.currentTarget, items()); } } }, icon("more", 18)));
            tr.appendChild(cell);
        }
        if (options.onRowClick) {
            tr.addEventListener("click", () => options.onRowClick(row));
            tr.addEventListener("keydown", (event) => { if (event.key === "Enter") options.onRowClick(row); });
        }
        return tr;
    });

    return h("div", { class: "table-wrap" }, h("table", { class: "table" }, h("thead", null, head), h("tbody", null, body)));
}

export function cellMain(main, sub) {
    return h("div", null, h("div", { class: "cell-main", text: main }), sub ? h("div", { class: "cell-sub", text: sub }) : null);
}

/* Client-side pager state: { page, size } and a footer bar. */
export function pagerBar({ page, size, total, hasNext, onPage }) {
    const from = total === 0 ? 0 : page * size + 1;
    const to = total != null ? Math.min(total, (page + 1) * size) : page * size + size;
    const label = total != null ? `${from}–${to} / ${total}` : `Səhifə ${page + 1}`;
    const last = total != null ? to >= total : !hasNext;
    if (page === 0 && last) return null;
    return h("div", { class: "pager" },
        h("span", { text: label }),
        h("div", { class: "row" },
            h("button", { class: "btn btn-secondary btn-sm", type: "button", disabled: page === 0, on: { click: () => onPage(page - 1) } }, "Əvvəlki"),
            h("button", { class: "btn btn-secondary btn-sm", type: "button", disabled: last, on: { click: () => onPage(page + 1) } }, "Növbəti")));
}
