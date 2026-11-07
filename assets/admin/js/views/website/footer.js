import { pageEditor } from "./page-editor.js";
import { slotWidget, siteEditor, SOCIAL_FIELDS, CONTACT_FIELDS } from "./shared.js";
import { linkEditor, FOOTER_LINKS } from "./links.js";

export const { render } = pageEditor({
    title: "Footer", desc: "Hər səhifənin aşağısı: loqo, mətnlər, keçidlər, sosial şəbəkələr və müəllif hüququ bir yerdədir.",
    page: "footer", previewUrl: "index.html",
    sections: [
        {
            title: "Mətnlər və müəllif hüququ", where: "Footer-in təsviri, sütun başlıqları və müəllif hüququ sətri", open: true,
            fields: [{ key: "footer.description", label: "Qısa təsvir", long: true }, { key: "footer.quickLinks", label: "“Sürətli keçidlər” başlığı" }, { key: "footer.support", label: "“Dəstək” sütununun başlığı" }, { key: "footer.help", label: "Kömək mərkəzi" }, { key: "footer.contact", label: "Əlaqə" }, { key: "footer.travelInfo", label: "Səyahət məlumatı" }, { key: "footer.followUs", label: "“Bizi izləyin” başlığı" }, { key: "footer.copyright", label: "Müəllif hüququ sətri" }],
            extra: () => slotWidget(["logo"])
        },
        { title: "Footer keçidləri", where: "Mətn, link, görünmə və sıra", extra: (rows, { reloadPreview }) => linkEditor(FOOTER_LINKS, { onSaved: reloadPreview }) },
        { title: "Sosial şəbəkələr", where: "Footer-dəki sosial ikonların linkləri (yalnız https://)", extra: (rows, { reloadPreview }) => siteEditor(SOCIAL_FIELDS, reloadPreview) },
        { title: "Əlaqə məlumatları", where: "Boş buraxılan sahə göstərilmir", extra: (rows, { reloadPreview }) => siteEditor(CONTACT_FIELDS, reloadPreview) }
    ]
});
