/* The media library: every uploaded file with where it is used, replacing in place, safe deleting, and the pictures of the site. */
import { h, mount } from "../../core/dom.js";
import * as api from "../../core/api.js";
import { ok, fail, confirmDialog } from "../../core/ui.js";
import { pageHead, card, button, loadingBlock, errorState, emptyState } from "../../components/page.js";
import { searchBox, filterSelect, toolbar, spacer } from "../../components/toolbar.js";
import { imageSrc } from "./cards.js";

const CATEGORIES = [{ value: "", label: "Bütün kateqoriyalar" }, { value: "site", label: "Sayt (loqo, haqqında)" }, { value: "home", label: "Ana səhifə" }, { value: "destinations", label: "İstiqamətlər" }, { value: "hero", label: "Hero video" }];
const KB = (bytes) => (bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(bytes / 1024)) + " KB");
const okFile = (f) => f && ["image/jpeg", "image/png", "image/webp"].includes(f.type) && f.size <= 10 * 1024 * 1024;

function filesTab() {
    const f = { category: "", unusedOnly: false, query: "" };
    let files = [];
    const grid = h("div", null, loadingBlock());

    const draw = () => {
        const q = f.query.toLowerCase();
        const shown = files.filter((x) => !q || (x.fileName + " " + x.usedBy.join(" ")).toLowerCase().includes(q));
        if (!shown.length) { mount(grid, emptyState("Fayl tapılmadı", f.unusedOnly ? "İstifadə olunmayan fayl yoxdur." : "Filtrləri dəyişib yenidən yoxla.")); return; }
        mount(grid, h("div", { class: "media-grid" }, shown.map((x) => {
            const replace = h("input", { type: "file", hidden: true, accept: x.path.replace(/^.*(\.[a-z0-9]+)$/i, "$1") });
            replace.addEventListener("change", async () => {
                const file = replace.files[0];
                if (!okFile(file)) { fail("Yalnız JPG, PNG və ya WEBP, ən çox 10 MB."); return; }
                if (!(await confirmDialog({ title: "Şəkil dəyişdirilsin?", text: `“${x.path}” faylının şəkli yenisi ilə əvəz olunacaq. Bu şəkil istifadə olunan hər yerdə dəyişəcək.`, confirmLabel: "Dəyiş" }))) return;
                try { await api.upload("PUT", "api/admin/media/file?path=" + encodeURIComponent(x.path), file); ok("Şəkil dəyişdirildi."); load(); } catch (error) { fail(api.message(error)); }
            });
            return h("div", { class: "media-item" },
                h("div", { class: "media-thumb" }, x.isImage ? h("img", { src: api.url(x.url), alt: "", loading: "lazy" }) : h("video", { src: api.url(x.url) + "#t=0.5", preload: "metadata", muted: true, playsinline: true })),
                h("div", { class: "media-meta" }, h("div", { class: "media-name", text: x.path }), h("div", { class: "muted", text: KB(x.sizeBytes) + " · " + new Date(x.modifiedUtc).toLocaleDateString("az-AZ") }),
                    h("div", { class: "chips" }, x.usedBy.length ? x.usedBy.map((u) => h("span", { class: "badge badge-success", text: u })) : [h("span", { class: "badge badge-warning", text: "İstifadə olunmur" })])),
                h("div", { class: "media-actions" },
                    x.isImage ? h("button", { class: "btn btn-secondary btn-sm", type: "button", on: { click: () => replace.click() } }, "Dəyiş") : null, replace,
                    h("button", { class: "btn btn-ghost btn-sm btn-danger-text", type: "button", on: { click: async () => {
                        if (!(await confirmDialog({ title: "Fayl silinsin?", text: `“${x.path}” həmişəlik silinəcək. Fayl istifadə olunursa silinməyəcək.`, confirmLabel: "Sil", danger: true }))) return;
                        try { await api.del("api/admin/media/file", { path: x.path }); ok("Fayl silindi."); load(); } catch (error) { fail(api.message(error)); }
                    } } }, "Sil")));
        })));
    };

    async function load() {
        mount(grid, loadingBlock());
        try { files = await api.get("api/admin/media", { category: f.category, unusedOnly: f.unusedOnly ? "true" : "" }); draw(); } catch (error) { mount(grid, errorState(error, load)); }
    }
    const unused = h("input", { type: "checkbox" });
    unused.addEventListener("change", () => { f.unusedOnly = unused.checked; load(); });
    load();
    return card(toolbar(searchBox({ placeholder: "Fayl adı və ya istifadə yeri…", onInput: (v) => { f.query = v; draw(); } }), filterSelect({ label: "Kateqoriya", options: CATEGORIES, onChange: (v) => { f.category = v; load(); } }),
        h("label", { class: "switch" }, unused, h("span", { class: "switch-track" }), h("span", { text: "Yalnız istifadə olunmayanlar" })), spacer(), button("Yenilə", { variant: "ghost", small: true, iconName: "refresh", onClick: load })), grid);
}

/* The pictures the site shows (cities, cards, logo, About page), including the built-in ones; "Dəyiş" uploads a new picture. */
function siteImagesTab() {
    const grid = h("div", null, loadingBlock());
    let items = [];
    let query = "";

    const draw = () => {
        const q = query.toLowerCase();
        const groups = {};
        items.filter((i) => !q || i.name.toLowerCase().includes(q)).forEach((i) => { (groups[i.group] = groups[i.group] || []).push(i); });
        const names = Object.keys(groups);
        if (!names.length) { mount(grid, emptyState("Şəkil tapılmadı")); return; }
        mount(grid, h("div", { class: "stack" }, names.map((name) => card(h("div", { class: "card-head" }, h("h2", { class: "card-title", text: `${name} (${groups[name].length})` })),
            h("div", { class: "media-grid" }, groups[name].map((i) => {
                const pick = h("input", { type: "file", hidden: true, accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" });
                pick.addEventListener("change", async () => {
                    if (!okFile(pick.files[0])) { fail("Yalnız JPG, PNG və ya WEBP, ən çox 10 MB."); return; }
                    try { await api.upload("POST", i.upload, pick.files[0]); ok("Şəkil dəyişdirildi."); load(); } catch (error) { fail(api.message(error)); }
                });
                const thumb = h("div", { class: "media-thumb" }, i.shown ? h("img", { src: i.shown, alt: "", loading: "lazy" }) : i.builtIn ? "Səhifənin öz şəkli" : "Şəkil yoxdur");
                const img = thumb.querySelector("img");
                if (img) img.addEventListener("error", () => thumb.replaceChildren("Şəkil yoxdur"));
                return h("div", { class: "media-item" }, thumb,
                    h("div", { class: "media-meta" }, h("div", { class: "cell-main", text: i.name }), h("span", { class: "badge " + (i.uploaded ? "badge-success" : "badge-warning"), text: i.uploaded ? "Yüklənmiş" : "Standart (sayt faylı)" })),
                    h("div", { class: "media-actions" }, h("button", { class: "btn btn-secondary btn-sm", type: "button", on: { click: () => pick.click() } }, "Dəyiş"), pick,
                        i.uploaded && i.revert ? h("button", { class: "btn btn-ghost btn-sm", type: "button", on: { click: async () => {
                            if (!(await confirmDialog({ title: "Yüklənmiş şəkil silinsin?", text: `“${i.name}” üçün yüklənmiş şəkil silinəcək.`, confirmLabel: "Sil", danger: true }))) return;
                            try { await api.del(i.upload); ok("Şəkil silindi."); load(); } catch (error) { fail(api.message(error)); }
                        } } }, i.removeLabel || "Standarta qaytar") : null));
            }))))));
    };

    async function load() {
        mount(grid, loadingBlock());
        try {
            const [countries, cards, slots] = await Promise.all([api.get("api/admin/destinations"), api.get("api/admin/home-cards"), api.get("api/admin/media/slots")]);
            const catalog = window.AEROVA_DESTINATIONS;
            items = [];
            countries.forEach((c) => (c.cities || []).forEach((city) => items.push({ group: "Şəhərlər", name: `${city.nameAz || city.name} · ${c.nameAz || c.name}`, shown: catalog && catalog.cityPhotoUrls ? catalog.cityPhotoUrls(city).sm : "", uploaded: String(city.imageFile || "").startsWith("destinations/"), upload: `api/admin/destinations/cities/${city.id}/image`, revert: true })));
            cards.forEach((c) => { const up = !!c.imagePath && !c.imagePath.startsWith("assets/"); items.push({ group: "Ana səhifə kartları", name: (c.section === "premium" ? "Premium: " : "Niyə AEROVA: ") + c.title, shown: imageSrc(c.imagePath), uploaded: up, upload: `api/admin/home-cards/${c.id}/image`, revert: up, removeLabel: "Şəkli sil" }); });
            slots.forEach((s) => items.push({ group: "Loqo və Haqqında", name: s.label, shown: s.url ? api.url(s.url) : "", uploaded: !!s.path, upload: "api/admin/media/slots/" + encodeURIComponent(s.slot), revert: true, builtIn: true }));
            draw();
        } catch (error) { mount(grid, errorState(error, load)); }
    }
    load();
    return h("div", { class: "stack" }, card(toolbar(searchBox({ placeholder: "Ada görə axtar…", onInput: (v) => { query = v; draw(); } }), spacer()), h("p", { class: "note", style: { margin: "16px 24px" }, text: "Standart şəkil saytın öz faylıdır. “Dəyiş” yeni şəkil yükləyir və o göstərilir; “Standarta qaytar” yüklənəni silib standartı geri qaytarır." })), grid);
}

export async function render(ctx) {
    let tab = ctx.query.tab === "site" ? "site" : "files";
    const body = h("div");
    const tabs = h("div", { class: "tabs", style: { marginBottom: "24px" } });
    const draw = () => {
        tabs.replaceChildren(...[["files", "Yüklənmiş fayllar"], ["site", "Saytın şəkilləri"]].map(([key, label]) => h("button", { class: "tab" + (key === tab ? " is-active" : ""), type: "button", on: { click: () => { tab = key; ctx.replaceQuery({ tab }); draw(); } } }, label)));
        mount(body, tab === "files" ? filesTab() : siteImagesTab());
    };
    ctx.container.replaceChildren(pageHead({ title: "Media kitabxanası", desc: "Yüklənmiş bütün şəkillər, haradan istifadə olunduğu və təhlükəsiz silmə. Şəkil başqa yerdə istifadə olunursa silinə bilməz." }), tabs, body);
    draw();
}
