/*
 * A complete list screen for a simple resource (search, filters, table, pager, create / edit drawer, delete with confirmation).
 * Used by routes, aircraft, airports, promo codes, baggage, meals, cancellation rules and others, so they all look and behave the same.
 */
import { h, mount } from "../core/dom.js";
import * as api from "../core/api.js";
import * as auth from "../core/auth.js";
import { ok, fail, confirmDialog } from "../core/ui.js";
import { pageHead, card, button, skeleton, errorState, loadingBlock } from "./page.js";
import { dataTable, pagerBar } from "./table.js";
import { searchBox, filterSelect, toolbar, spacer } from "./toolbar.js";
import { openForm } from "./form.js";

/*
 * cfg: {
 *   title, desc, noun, endpoint, createLabel,
 *   load(): Promise<rows>               (default GET endpoint)
 *   columns: [{ label, render(row), num }]
 *   searchText(row): string
 *   filters: [{ label, options, test(row, value) }]
 *   prepare(): Promise<any>              reference data for the form, passed to fields()
 *   fields(ref, row): field definitions
 *   defaults(ref), toForm(row, ref), toRequest(data, row, ref)
 *   label(row): string used in messages
 *   extraActions(row, ctx): menu items [{ label, onClick, danger, hidden }]
 *   canCreate(), canEdit(row), canDelete(row): permission checks (default: create/edit for admins, delete for SuperAdmin)
 *   deleteText(row), afterDelete(result, row), headerActions(ctx): extra page buttons
 *   pageSize
 * }
 */
export function crudView(cfg) {
    return {
        async render(ctx) {
            const state = { rows: [], query: "", filters: cfg.filters ? cfg.filters.map(() => "") : [], page: 0, ref: null };
            const size = cfg.pageSize || 25;
            const listBox = h("div");
            const barBox = h("div");
            const refresh = async () => {
                mount(listBox, loadingBlock());
                try {
                    state.rows = await (cfg.load ? cfg.load() : api.get(cfg.endpoint));
                    draw();
                } catch (error) { mount(listBox, errorState(error, refresh)); }
            };

            const canCreate = () => (cfg.canCreate ? cfg.canCreate() : true);
            const canEdit = (row) => (cfg.canEdit ? cfg.canEdit(row) : true);
            const canDelete = (row) => (cfg.canDelete ? cfg.canDelete(row) : auth.isSuper());

            const openEditor = async (row) => {
                try {
                    if (cfg.prepare && !state.ref) state.ref = await cfg.prepare();
                } catch (error) { fail(api.message(error)); return; }
                const ref = state.ref;
                const saved = await openForm({
                    title: row ? `${cfg.noun}: redaktə` : `${cfg.noun}: yeni`,
                    fields: cfg.fields(ref, row),
                    values: row ? cfg.toForm(row, ref) : (cfg.defaults ? cfg.defaults(ref) : {}),
                    wide: cfg.wide,
                    onSubmit: async (data) => {
                        const body = cfg.toRequest(data, row, ref);
                        return row ? api.put(`${cfg.endpoint}/${row.id}`, body) : api.post(cfg.endpoint, body);
                    }
                });
                if (saved) {
                    ok(`${cfg.noun} ${row ? "yeniləndi" : "əlavə olundu"}.`);
                    if (cfg.afterChange) cfg.afterChange();
                    refresh();
                }
            };

            const remove = async (row) => {
                const name = cfg.label ? cfg.label(row) : cfg.noun;
                const yes = await confirmDialog({
                    title: `${cfg.noun} silinsin?`,
                    text: cfg.deleteText ? cfg.deleteText(row) : `“${name}” silinəcək. Bu geri qaytarıla bilməz.`,
                    confirmLabel: "Sil", danger: true
                });
                if (!yes) return;
                try {
                    const result = await api.del(`${cfg.endpoint}/${row.id}`);
                    if (cfg.afterDelete) cfg.afterDelete(result, row); else ok(`${cfg.noun} silindi.`);
                    if (cfg.afterChange) cfg.afterChange();
                    refresh();
                } catch (error) { fail(api.message(error)); }
            };

            const menuFor = (row) => [
                ...(cfg.extraActions ? cfg.extraActions(row, { refresh }) : []),
                cfg.extraActions ? "-" : null,
                { label: "Redaktə et", onClick: () => openEditor(row), hidden: !canEdit(row) },
                { label: "Sil", onClick: () => remove(row), danger: true, hidden: !canDelete(row) }
            ].filter(Boolean);

            const visible = () => state.rows.filter((row) => {
                if (state.query && cfg.searchText && !cfg.searchText(row).toLowerCase().includes(state.query.toLowerCase())) return false;
                return (cfg.filters || []).every((f, i) => !state.filters[i] || f.test(row, state.filters[i]));
            });

            function draw() {
                const rows = visible();
                const total = rows.length;
                if (state.page * size >= total) state.page = 0;
                const slice = rows.slice(state.page * size, state.page * size + size);
                mount(listBox,
                    dataTable(slice, cfg.columns, {
                        onRowClick: (row) => { if (canEdit(row)) openEditor(row); },
                        actions: (row) => menuFor(row),
                        emptyTitle: state.query || state.filters.some(Boolean) ? "Uyğun nəticə tapılmadı" : cfg.emptyTitle || `${cfg.noun} yoxdur`,
                        emptyText: state.query || state.filters.some(Boolean) ? "Axtarışı və ya filtrləri dəyişib yenidən yoxla." : cfg.emptyText,
                        emptyAction: canCreate() && !state.query ? button(cfg.createLabel || `${cfg.noun} əlavə et`, { variant: "primary", iconName: "plus", onClick: () => openEditor(null) }) : null
                    }),
                    pagerBar({ page: state.page, size, total, onPage: (p) => { state.page = p; draw(); } }));
            }

            const controls = [];
            if (cfg.searchText) controls.push(searchBox({ placeholder: cfg.searchPlaceholder || "Axtar…", onInput: (value) => { state.query = value; state.page = 0; draw(); } }));
            (cfg.filters || []).forEach((f, i) => {
                const change = (value) => { state.filters[i] = value; state.page = 0; draw(); };
                if (f.type === "date") {
                    const input = h("input", { class: "input", type: "date", "aria-label": f.label, title: f.label });
                    input.addEventListener("change", () => change(input.value));
                    controls.push(input);
                } else if (typeof f.options === "function") {
                    // The choices are loaded (the airports): the select starts with "all" and fills when they arrive.
                    const all = { value: "", label: f.allLabel || f.label };
                    const select = filterSelect({ label: f.label, options: [all], onChange: change });
                    Promise.resolve(f.options()).then((list) => {
                        select.replaceChildren(...[all, ...list].map((o) => h("option", { value: String(o.value) }, o.label)));
                        select.value = state.filters[i] || "";
                    }).catch(() => { /* the search box still works */ });
                    controls.push(select);
                } else controls.push(filterSelect({ label: f.label, options: f.options, onChange: change }));
            });

            const actions = [...(cfg.headerActions ? cfg.headerActions({ refresh }) : [])];
            const note = !cfg.canDelete && !auth.isSuper() ? " Silmə yalnız SuperAdmin üçündür." : "";
            if (canCreate()) actions.push(button(cfg.createLabel || `${cfg.noun} əlavə et`, { variant: "primary", iconName: "plus", onClick: () => openEditor(null) }));

            ctx.container.replaceChildren(
                pageHead({ title: cfg.title, desc: (cfg.desc || "") + note, actions }),
                h("div", { class: "stack" },
                    card(controls.length ? toolbar(...controls, spacer()) : null, barBox, listBox),
                    cfg.below ? cfg.below({ refresh, ctx }) : null));
            mount(listBox, skeleton(4));
            await refresh();
        }
    };
}
