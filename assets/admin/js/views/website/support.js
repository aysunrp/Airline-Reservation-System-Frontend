import { pageEditor } from "./page-editor.js";
import { faqManager } from "./faq.js";
import { siteEditor, CONTACT_FIELDS } from "./shared.js";

export const { render } = pageEditor({
    title: "Dəstək və FAQ", desc: "Dəstək səhifəsinin mətnləri, tez-tez verilən suallar və əlaqə məlumatları bir yerdədir.",
    page: "support", previewUrl: "support.html",
    sections: [
        {
            title: "Səhifə mətnləri", where: "support.html başlıqları", open: true,
            fields: [{ key: "support.title", label: "Səhifə başlığı" }, { key: "support.subtitle", label: "Alt başlıq", long: true }, { key: "support.contactTitle", label: "Əlaqə bölməsi: başlıq" }, { key: "support.contactNone", label: "Əlaqə yoxdursa göstərilən mətn", long: true }, { key: "support.formTitle", label: "Forma başlığı" }, { key: "support.faqTitle", label: "Suallar bölməsi: başlıq" }]
        },
        { title: "Tez-tez verilən suallar", where: "Sual, cavab, sıra və aktiv/passiv", extra: (rows, { reloadPreview }) => faqManager({ onChange: reloadPreview }) },
        { title: "Əlaqə məlumatları", where: "Footer-də göstərilir. Boş buraxılan sahə göstərilmir.", extra: (rows, { reloadPreview }) => siteEditor(CONTACT_FIELDS, reloadPreview) }
    ]
});
