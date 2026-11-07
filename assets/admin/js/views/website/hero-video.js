/* The background video of the home page: list, create, edit (files are uploaded here), activate, delete. */
import { h, mount } from "../../core/dom.js";
import * as api from "../../core/api.js";
import { ok, fail, confirmDialog } from "../../core/ui.js";
import { button, loadingBlock, errorState } from "../../components/page.js";
import { dataTable, cellMain } from "../../components/table.js";
import { activeBadge } from "../../components/badge.js";
import { openForm } from "../../components/form.js";

const mediaUrl = (path) => {
    const text = String(path || "");
    if (!text) return "";
    return /^https?:\/\//i.test(text) ? text : api.url(text.replace(/^\/+/, ""));
};

export function heroVideoManager({ onChange } = {}) {
    const box = h("div", null, loadingBlock());

    const edit = async (item) => {
        const saved = await openForm({
            title: item ? "Hero video: redaktə" : "Yeni hero video", wide: true,
            fields: [
                { key: "title", label: "Ad", span2: true, maxLength: 200 },
                { key: "videoUrl", label: "Video (masaüstü)", type: "upload", accept: ".mp4,.webm,video/mp4,video/webm", uploader: async (f) => (await api.upload("POST", "api/admin/hero-videos/upload/video", f)).url, span2: true, hint: "MP4 və ya WEBM video." },
                { key: "mobileVideoUrl", label: "Video (telefon)", type: "upload", accept: ".mp4,.webm,video/mp4,video/webm", uploader: async (f) => (await api.upload("POST", "api/admin/hero-videos/upload/video", f)).url, required: false, span2: true },
                { key: "posterUrl", label: "Poster şəkli", type: "upload", accept: ".jpg,.jpeg,.png,.webp,image/*", uploader: async (f) => (await api.upload("POST", "api/admin/hero-videos/upload/poster", f)).url, required: false, span2: true, hint: "Video yüklənənə qədər göstərilir." },
                { key: "sourceName", label: "Mənbə adı", required: false },
                { key: "sourceUrl", label: "Mənbə linki", required: false },
                { key: "licenseInfo", label: "Lisenziya", required: false, span2: true },
                { key: "internalNotes", label: "Daxili qeyd (saytda görünmür)", type: "textarea", required: false, rows: 2 },
                { key: "sortOrder", label: "Sıra", type: "number", min: 0, required: false },
                { key: "isActive", label: "Status", type: "switch", switchLabel: "Aktiv (saytda göstərilir)" }
            ],
            values: item ? { title: item.title, videoUrl: item.videoUrl, mobileVideoUrl: item.mobileVideoUrl || "", posterUrl: item.posterUrl || "", sourceName: item.sourceName || "", sourceUrl: item.sourceUrl || "", licenseInfo: item.licenseInfo || "", internalNotes: item.internalNotes || "", sortOrder: item.sortOrder, isActive: item.isActive } : { isActive: false, sortOrder: 0 },
            onSubmit: (d) => {
                const body = { title: d.title, videoUrl: d.videoUrl, mobileVideoUrl: d.mobileVideoUrl || null, posterUrl: d.posterUrl || null, sourceName: d.sourceName || null, sourceUrl: d.sourceUrl || null, licenseInfo: d.licenseInfo || null, internalNotes: d.internalNotes || null, sortOrder: d.sortOrder || 0, isActive: d.isActive };
                return item ? api.put("api/admin/hero-videos/" + item.id, body) : api.post("api/admin/hero-videos", body);
            }
        });
        if (saved) { ok("Hero video yadda saxlanıldı."); load(); if (onChange) onChange(); }
    };

    const activate = async (item) => {
        try { await api.post(`api/admin/hero-videos/${item.id}/activate`); ok("Bu video indi saytda göstərilir."); load(); if (onChange) onChange(); } catch (error) { fail(api.message(error)); }
    };

    const remove = async (item) => {
        if (!(await confirmDialog({ title: "Hero video silinsin?", text: `“${item.title}” silinəcək.`, confirmLabel: "Sil", danger: true }))) return;
        try { await api.del("api/admin/hero-videos/" + item.id); ok("Hero video silindi."); load(); if (onChange) onChange(); } catch (error) { fail(api.message(error)); }
    };

    async function load() {
        try {
            const rows = await api.get("api/admin/hero-videos");
            mount(box, h("div", { class: "stack-sm" },
                h("div", { class: "row", style: { justifyContent: "space-between" } }, h("strong", { text: "Hero video" }), button("Video əlavə et", { variant: "secondary", small: true, iconName: "plus", onClick: () => edit(null) })),
                h("p", { class: "small muted", text: "Yalnız bir video aktiv ola bilər. Aktiv video yoxdursa, sayt öz standart videosunu göstərir." }),
                h("div", { class: "card" }, dataTable(rows, [
                    { label: "Poster", render: (r) => (r.posterUrl ? h("img", { class: "city-thumb", src: mediaUrl(r.posterUrl), alt: "" }) : "—") },
                    { label: "Video", render: (r) => cellMain(r.title, String(r.videoUrl).split("/").pop()) },
                    { label: "Status", render: (r) => activeBadge(r.isActive) }
                ], { onRowClick: edit, actions: (r) => [{ label: "Redaktə et", onClick: () => edit(r) }, { label: "Aktiv et", onClick: () => activate(r), hidden: r.isActive }, "-", { label: "Sil", danger: true, onClick: () => remove(r) }], emptyTitle: "Hələ video yoxdur", emptyText: "Video əlavə edənə qədər saytın öz standart videosu göstərilir." }))));
        } catch (error) { mount(box, errorState(error, load)); }
    }
    load();
    return box;
}
