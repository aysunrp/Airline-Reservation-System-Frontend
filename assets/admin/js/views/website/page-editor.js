/*
 * One screen per public page: its sections as accordions, each with its texts, pictures and sub-content together,
 * and an optional live preview of the page next to the editor.
 */
import { h } from "../../core/dom.js";
import { pageHead, button, skeleton, errorState, card } from "../../components/page.js";
import { siteRows, textEditor, section, previewPane } from "./shared.js";

/*
 * cfg: { title, desc, page, previewUrl, sections: [{ title, where, fields, extra(rows) -> node[], open }] }
 * "fields" are shown as a text editor; "extra" adds anything else the section owns (cards, video, pictures, catalog…).
 */
export function pageEditor(cfg) {
    return {
        async render(ctx) {
            ctx.container.replaceChildren(pageHead({ title: cfg.title, desc: cfg.desc }), skeleton(5));
            let rows = {};
            try { rows = cfg.page ? await siteRows(cfg.page) : {}; } catch (error) {
                ctx.container.replaceChildren(pageHead({ title: cfg.title }), card(errorState(error, () => this.render(ctx))));
                return;
            }

            let preview = null;
            const layout = h("div", { class: "editor" });
            const list = h("div", { class: "stack-sm" });
            const reloadPreview = () => { if (preview) preview.reload(); };

            cfg.sections.forEach((s, index) => {
                const body = () => h("div", { class: "stack" },
                    s.fields && s.fields.length ? textEditor({ page: cfg.page, rows, fields: s.fields, onSaved: reloadPreview }) : null,
                    ...(s.extra ? [].concat(s.extra(rows, { reloadPreview })) : []));
                list.appendChild(section({ title: s.title, where: s.where, open: s.open === undefined ? index === 0 : s.open, body }));
            });
            layout.appendChild(list);

            const toggle = button("Önizləmə", { iconName: "eye", onClick: () => {
                if (preview) { preview.remove(); preview = null; layout.classList.remove("has-preview"); return; }
                preview = previewPane(cfg.previewUrl);
                layout.append(preview);
                layout.classList.add("has-preview");
            } });

            ctx.container.replaceChildren(
                pageHead({ title: cfg.title, desc: cfg.desc, actions: cfg.previewUrl ? [toggle, h("a", { class: "btn btn-secondary", href: cfg.previewUrl, target: "_blank", rel: "noopener" }, "Saytda aç")] : [] }),
                layout);
        }
    };
}
