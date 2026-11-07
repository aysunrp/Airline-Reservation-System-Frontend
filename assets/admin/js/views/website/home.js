import { h } from "../../core/dom.js";
import { pageEditor } from "./page-editor.js";
import { siteEditor } from "./shared.js";
import { cardsManager } from "./cards.js";
import { heroVideoManager } from "./hero-video.js";

const note = (text) => h("p", { class: "note", text });

export const { render } = pageEditor({
    title: "Ana səhifə", desc: "Əsas ekran, axtarış, kartlar və newsletter. Hər bölmənin mətni, şəkli və kartları öz içindədir.",
    page: "home", previewUrl: "index.html",
    sections: [
        {
            title: "Əsas ekran", where: "Ən yuxarıdakı böyük başlıq, düymə və arxa fon videosu", open: true,
            fields: [
                { key: "home.heroEyebrow", label: "Üst başlıq" }, { key: "home.heroTitle1", label: "Başlıq, 1-ci sətir" }, { key: "home.heroTitle2", label: "Başlıq, 2-ci sətir" },
                { key: "home.heroDescription", label: "Qısa təsvir", long: true }, { key: "home.bookNow", label: "Düymənin mətni" },
                { key: "home.heroAria", label: "Ekran oxuyucular üçün təsvir", hint: "Görünmür, görmə məhdudiyyətli istifadəçilər üçündür." }
            ],
            extra: (rows, { reloadPreview }) => [
                h("div", null, h("h3", { class: "card-title", text: "Düymənin linki" }), siteEditor([{ key: "hero.ctaUrl", label: "“İndi bron et” düyməsi hara aparır", link: true, placeholder: "booking.html" }], reloadPreview)),
                h("div", null, heroVideoManager({ onChange: reloadPreview }))
            ]
        },
        { title: "Uçuş axtarışı", where: "Əsas ekranın altındakı axtarış qutusu", fields: [{ key: "home.searchTitle", label: "Başlıq" }, { key: "home.searchPlaceholder", label: "Yazı sahəsinin nümunə mətni" }, { key: "home.searchFlights", label: "Axtar düyməsi" }, { key: "home.voiceStart", label: "Səsli axtarış düyməsinin izahı" }] },
        {
            title: "İstiqamətlər bölməsi", where: "Şəhər kartlarının başlığı",
            fields: [{ key: "ui.exploreTheWorld", label: "Üst başlıq" }, { key: "ui.discoverYourNextDestination", label: "Başlıq" }, { key: "home.destinationsDesc", label: "Təsvir", long: true }],
            extra: () => note("Şəhər kartları və onların şəkilləri Website → İstiqamətlər bölməsindən idarə olunur.")
        },
        {
            title: "Niyə AEROVA", where: "Üstünlük kartları: başlıq, təsvir, ikon, link, sıra və aktiv/passiv",
            fields: [{ key: "home.premiumEyebrow", label: "Üst başlıq" }, { key: "ui.travelBetterWithAerova", label: "Başlıq" }, { key: "ui.aerovaCombinesEffortlessBookingFlexibleTravel", label: "Təsvir", long: true }],
            extra: (rows, { reloadPreview }) => cardsManager("why", { onChange: reloadPreview })
        },
        {
            title: "Premium təcrübə", where: "Şəkilli salon kartları",
            fields: [{ key: "home.premiumTitle", label: "Başlıq" }, { key: "home.premiumDesc", label: "Təsvir", long: true }],
            extra: (rows, { reloadPreview }) => cardsManager("premium", { onChange: reloadPreview })
        },
        {
            title: "Newsletter", where: "Səhifənin aşağısındakı abunə bölməsi",
            fields: [{ key: "home.newsletterEyebrow", label: "Üst başlıq" }, { key: "home.newsletterTitle", label: "Başlıq" }, { key: "home.newsletterDesc", label: "Təsvir", long: true }, { key: "home.newsletterLabel", label: "Sahənin adı" }, { key: "home.newsletterPlaceholder", label: "Nümunə mətn" }, { key: "home.newsletterButton", label: "Düymənin mətni" }]
        }
    ]
});
