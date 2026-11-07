import { pageEditor } from "./page-editor.js";
import { slotWidget } from "./shared.js";
import { linkEditor, HEADER_LINKS } from "./links.js";

export const { render } = pageEditor({
    title: "Başlıq və menyu", desc: "Hər səhifənin yuxarısındakı loqo və əsas menyu. Loqo yüklənməyibsə, standart AEROVA yazısı qalır.",
    page: null, previewUrl: "index.html",
    sections: [
        { title: "Loqo", where: "Başlıqda və footer-də göstərilir. Şəffaf PNG və ya WEBP tövsiyə olunur.", open: true, extra: () => slotWidget(["logo"]) },
        { title: "Menyu keçidləri", where: "Mətn, link, görünmə və sıra", open: true, extra: (rows, { reloadPreview }) => linkEditor(HEADER_LINKS, { onSaved: reloadPreview }) }
    ]
});
