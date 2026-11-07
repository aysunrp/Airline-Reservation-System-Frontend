/* Countries and cities of the destinations catalog: texts, switched on or off (never deleted) and each city's photograph. */
import { h, mount, icon } from "../../core/dom.js";
import * as api from "../../core/api.js";
import * as auth from "../../core/auth.js";
import { ok, fail, confirmDialog, openDrawer } from "../../core/ui.js";
import { loadingBlock, errorState, emptyState } from "../../components/page.js";
import { searchBox } from "../../components/toolbar.js";
import { openForm } from "../../components/form.js";
import { activeBadge } from "../../components/badge.js";

const nameOf = (item) => item.nameAz || item.name;
const isUploaded = (city) => String(city.imageFile || "").startsWith("destinations/");

function cityPhoto(city) {
    const catalog = window.AEROVA_DESTINATIONS;
    return catalog && catalog.cityPhotoUrls ? catalog.cityPhotoUrls(city).sm : "";
}

async function editCountry(country) {
    return openForm({
        title: "Ölkə: " + nameOf(country), wide: true,
        fields: [
            { key: "name", label: "Ad (ingilis)" }, { key: "nameAz", label: "Ad (azərbaycan)" }, { key: "nameRu", label: "Ad (rus)" },
            { key: "description", label: "Təsvir (ingilis)", type: "textarea", rows: 3 },
            { key: "descriptionAz", label: "Təsvir (azərbaycan)", type: "textarea", rows: 3 },
            { key: "descriptionRu", label: "Təsvir (rus)", type: "textarea", rows: 3 }
        ],
        values: { name: country.name, nameAz: country.nameAz, nameRu: country.nameRu, description: country.description, descriptionAz: country.descriptionAz, descriptionRu: country.descriptionRu },
        onSubmit: (d) => api.put("api/admin/destinations/countries/" + country.id, d)
    });
}

async function editCity(city) {
    return openForm({
        title: "Şəhər: " + nameOf(city), wide: true,
        fields: [
            { key: "nameAz", label: "Ad (azərbaycan)" }, { key: "nameRu", label: "Ad (rus)" },
            { key: "description", label: "Təsvir (ingilis)", type: "textarea", rows: 3 },
            { key: "descriptionAz", label: "Təsvir (azərbaycan)", type: "textarea", rows: 3 },
            { key: "descriptionRu", label: "Təsvir (rus)", type: "textarea", rows: 3 },
            { key: "aliases", label: "Digər yazılışlar", required: false, span2: true, hint: "Nöqtəli vergül ilə ayır (səsli axtarış üçün)." }
        ],
        values: { nameAz: city.nameAz, nameRu: city.nameRu, description: city.description, descriptionAz: city.descriptionAz, descriptionRu: city.descriptionRu, aliases: (city.aliases || []).join("; ") },
        onSubmit: (d) => api.put("api/admin/destinations/cities/" + city.id, d)
    });
}

function photoDrawer(city, reload) {
    const preview = h("div", { class: "image-preview", style: { width: "100%", height: "220px" } }, h("img", { src: cityPhoto(city), alt: "" }));
    const file = h("input", { type: "file", class: "input", accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" });
    const err = h("div", { class: "field-error" });
    const upload = h("button", { class: "btn btn-primary", type: "button", disabled: true }, "Yüklə");
    const revert = h("button", { class: "btn btn-secondary", type: "button", disabled: !isUploaded(city) }, "Standarta qaytar");
    let drawer = null;
    file.addEventListener("change", () => {
        const f = file.files[0];
        const bad = f && (!["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 10 * 1024 * 1024);
        err.textContent = bad ? "Yalnız JPG, PNG və ya WEBP, ən çox 10 MB." : "";
        upload.disabled = !f || !!bad;
        if (f && !bad) preview.replaceChildren(h("img", { src: URL.createObjectURL(f), alt: "" }));
    });
    upload.addEventListener("click", async () => {
        upload.classList.add("is-busy"); upload.disabled = true;
        try { await api.upload("POST", `api/admin/destinations/cities/${city.id}/image`, file.files[0]); ok("Şəkil dəyişdirildi."); drawer.close(); reload(); } catch (error) { err.textContent = api.message(error); upload.classList.remove("is-busy"); upload.disabled = false; }
    });
    revert.addEventListener("click", async () => {
        try { await api.del(`api/admin/destinations/cities/${city.id}/image`); ok("Standart şəkil bərpa olundu."); drawer.close(); reload(); } catch (error) { fail(api.message(error)); }
    });
    drawer = openDrawer({
        title: "Şəhər şəkli: " + nameOf(city),
        content: h("div", { class: "stack-sm" }, preview, h("p", { class: "small muted", text: isUploaded(city) ? "Yüklənmiş şəkil göstərilir." : "Saytın öz standart şəkli göstərilir. Yeni şəkil yükləsən, onu əvəz edəcək." }), file, err),
        footer: [revert, upload]
    });
}

export function catalogManager() {
    const box = h("div", null, loadingBlock());
    let countries = [];
    let query = "";
    const opened = new Set();
    const list = h("div", { class: "stack-sm" });

    const toggle = async (item, kind) => {
        const turnOn = !item.isActive;
        if (!turnOn && !(await confirmDialog({ title: "Deaktiv edilsin?", text: `${nameOf(item)} təyinat siyahısından və axtarış təkliflərindən çıxacaq. Hava limanları, marşrutlar, reyslər və bronlar toxunulmaz qalır.`, confirmLabel: "Deaktiv et", danger: true }))) return;
        try { await api.put(`api/admin/destinations/${kind === "country" ? "countries" : "cities"}/${item.id}/active`, { isActive: turnOn }); ok(`${nameOf(item)} indi ${turnOn ? "aktivdir" : "deaktivdir"}.`); load(); } catch (error) { fail(api.message(error)); }
    };

    /* Only a SuperAdmin deletes; the server refuses while a route, a schedule or a flight still uses the airports. */
    const remove = async (item, kind) => {
        const what = kind === "city" ? "Şəhər" : "Ölkə";
        const text = kind === "city"
            ? `${nameOf(item)} və onun hava limanları həmişəlik silinəcək. Marşrut, cədvəl və ya reysdə istifadə olunursa silinməyəcək.`
            : `${nameOf(item)}, bütün şəhərləri və hava limanları həmişəlik silinəcək. Hər hansı biri marşrut, cədvəl və ya reysdə istifadə olunursa silinməyəcək.`;
        if (!(await confirmDialog({ title: `${what} silinsin?`, text, confirmLabel: "Sil", danger: true }))) return;
        try { await api.del(`api/admin/destinations/${kind === "city" ? "cities" : "countries"}/${item.id}`); ok(`${what} silindi.`); load(); } catch (error) { fail(api.message(error)); }
    };
    const deleteButton = (item, kind) => (auth.isSuper() ? h("button", { class: "btn btn-ghost btn-sm btn-danger-text", type: "button", on: { click: () => remove(item, kind) } }, icon("trash", 14), "Sil") : null);

    const cityRow = (city) => h("div", { class: "city-row" },
        h("img", { class: "city-thumb", src: cityPhoto(city), alt: "", loading: "lazy" }),
        h("div", { class: "grow" }, h("div", { class: "cell-main", text: nameOf(city) }), h("div", { class: "cell-sub", text: city.airports.map((a) => a.code).join(", ") + (city.airports.some((a) => a.hasRoutes) ? " · reysləri var" : " · reys yoxdur") + (isUploaded(city) ? " · yüklənmiş şəkil" : "") })),
        activeBadge(city.isActive),
        h("div", { class: "row", style: { gap: "4px" } },
            h("button", { class: "btn btn-ghost btn-sm", type: "button", on: { click: () => photoDrawer(city, load) } }, icon("image", 14), "Şəkil"),
            h("button", { class: "btn btn-ghost btn-sm", type: "button", on: { click: async () => { if (await editCity(city)) { ok("Şəhər yeniləndi."); load(); } } } }, "Redaktə"),
            h("button", { class: "btn btn-ghost btn-sm" + (city.isActive ? " btn-danger-text" : ""), type: "button", on: { click: () => toggle(city, "city") } }, city.isActive ? "Deaktiv et" : "Aktiv et"),
            deleteButton(city, "city")));

    const countryBlock = (country, forceOpen) => {
        const isOpen = forceOpen || opened.has(country.id);
        const cities = h("div", { hidden: !isOpen }, country.cities.map(cityRow));
        const head = h("div", { class: "country-row" },
            h("button", { class: "btn btn-ghost btn-icon btn-sm", type: "button", "aria-expanded": String(isOpen), "aria-label": nameOf(country) + " şəhərləri", on: { click: () => { if (opened.has(country.id)) opened.delete(country.id); else opened.add(country.id); cities.hidden = !cities.hidden; } } }, icon("down", 16)),
            h("div", { class: "grow" }, h("div", { class: "cell-main", text: `${nameOf(country)} (${country.code})` }), h("div", { class: "cell-sub", text: `${country.cities.length} şəhər` })),
            activeBadge(country.isActive),
            h("button", { class: "btn btn-ghost btn-sm", type: "button", on: { click: async () => { if (await editCountry(country)) { ok("Ölkə yeniləndi."); load(); } } } }, "Redaktə"),
            h("button", { class: "btn btn-ghost btn-sm" + (country.isActive ? " btn-danger-text" : ""), type: "button", on: { click: () => toggle(country, "country") } }, country.isActive ? "Deaktiv et" : "Aktiv et"),
            deleteButton(country, "country"));
        return h("div", { class: "card", style: { overflow: "hidden" } }, head, cities);
    };

    const draw = () => {
        const q = query.toLowerCase();
        const shown = countries.map((c) => {
            if (!q) return { country: c, force: false };
            const match = [c.name, c.nameAz, c.code].join(" ").toLowerCase().includes(q);
            const cities = c.cities.filter((city) => [city.name, city.nameAz, ...city.airports.map((a) => a.code)].join(" ").toLowerCase().includes(q));
            return match ? { country: c, force: false } : cities.length ? { country: { ...c, cities }, force: true } : null;
        }).filter(Boolean);
        mount(list, shown.length ? shown.map((s) => countryBlock(s.country, s.force)) : emptyState("Heç nə tapılmadı", "Başqa söz yoxla."));
    };

    async function load() {
        try {
            countries = await api.get("api/admin/destinations");
            mount(box, h("div", { class: "stack-sm" },
                h("div", { class: "row" }, searchBox({ placeholder: "Ölkə, şəhər və ya hava limanı kodu…", onInput: (v) => { query = v; draw(); } })),
                h("p", { class: "small muted", text: (auth.isSuper() ? "Ölkə və şəhərləri deaktiv etmək (saytdan gizlətmək) və ya silmək olar. Silmə yalnız marşrutda, cədvəldə və ya reysdə istifadə olunmayanlar üçündür." : "Ölkə və şəhərləri deaktiv etmək olar. Silmə yalnız SuperAdmin üçündür.") + " Şəhər şəkli yükləyib dəyişə və ya standarta qaytara bilərsən." }),
                list));
            draw();
        } catch (error) { mount(box, errorState(error, load)); }
    }
    load();
    return box;
}
