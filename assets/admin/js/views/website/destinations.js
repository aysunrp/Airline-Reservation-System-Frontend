import { pageEditor } from "./page-editor.js";
import { catalogManager } from "./catalog.js";

export const { render } = pageEditor({
    title: "İstiqamətlər", desc: "Ölkələr, şəhərlər, təsvirlər və şəkillər bu səhifədə birlikdə idarə olunur.",
    page: "destinations", previewUrl: "destinations.html",
    sections: [
        { title: "Ölkə və şəhər kataloqu", where: "Adlar, təsvirlər, aktiv/passiv və şəhər şəkilləri (yüklə, önizlə, dəyiş)", open: true, extra: () => catalogManager() },
        {
            title: "Səhifə başlıqları", where: "İstiqamətlər siyahısı və şəhər səhifəsi",
            fields: [
                { key: "destinations.guideEyebrow", label: "Siyahı: üst başlıq" }, { key: "destinations.allDestinationsTitle", label: "Siyahı: başlıq" }, { key: "destinations.allDestinationsText", label: "Siyahı: təsvir", long: true },
                { key: "destinations.nextTitle", label: "Alt çağırış: başlıq" }, { key: "destinations.nextText", label: "Alt çağırış: mətn", long: true },
                { key: "destinations.aboutTitle", label: "Şəhər səhifəsi: “haqqında” başlığı" }, { key: "destinations.backToDestinations", label: "Şəhər səhifəsi: geri düyməsi" }
            ]
        }
    ]
});
