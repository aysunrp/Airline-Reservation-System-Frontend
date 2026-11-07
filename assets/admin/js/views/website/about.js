import { pageEditor } from "./page-editor.js";
import { slotWidget } from "./shared.js";

const f = (key, label, long) => ({ key, label, long });
const detail = (prefix, name) => [f(`${prefix}DetailTitle`, "Başlıq"), f(`${prefix}DetailLead`, "Giriş mətni", true), ...[1, 2, 3, 4, 5].map((n) => f(`${prefix}Detail${n}`, `Üstünlük ${n}`, true)), f(`${prefix}Book`, `“${name}” axtar düyməsi`)];

export const { render } = pageEditor({
    title: "AEROVA haqqında", desc: "Hekayə, salonlar, xidmətlər və şəkillər. Hər bölmənin mətni və şəkli bir yerdədir.",
    page: "about", previewUrl: "about-aerova.html",
    sections: [
        { title: "Əsas ekran", where: "Səhifənin yuxarısı: başlıq, mətn, düymə və böyük fon şəkli", open: true, fields: [f("heroEyebrow", "Üst başlıq"), f("heroTitle", "Başlıq"), f("heroText", "Qısa mətn", true), f("heroCta", "Düymənin mətni")], extra: () => slotWidget(["about.banner"]) },
        {
            title: "Hekayə, missiya, vizyon", where: "Brend hekayəsi və şəkli",
            fields: [f("storyEyebrow", "Üst başlıq"), f("storyTitle", "Başlıq"), f("storyText", "Hekayə mətni", true), f("missionTitle", "Missiya: başlıq"), f("missionText", "Missiya: mətn", true), f("visionTitle", "Vizyon: başlıq"), f("visionText", "Vizyon: mətn", true), f("philosophyTitle", "Fəlsəfə: başlıq"), f("philosophyText", "Fəlsəfə: mətn", true)],
            extra: () => slotWidget(["about.hero"])
        },
        {
            title: "Salonlar", where: "Economy, Comfort və Business kartları və şəkilləri",
            fields: [f("classesEyebrow", "Üst başlıq"), f("classesTitle", "Başlıq"), f("classesSub", "Alt başlıq", true),
                f("economyName", "Economy: ad"), f("economyText", "Economy: mətn", true), f("economyLink", "Economy: keçid mətni"),
                f("comfortName", "Comfort: ad"), f("comfortText", "Comfort: mətn", true), f("comfortLink", "Comfort: keçid mətni"),
                f("businessName", "Business: ad"), f("businessText", "Business: mətn", true), f("businessLink", "Business: keçid mətni")],
            extra: () => slotWidget(["about.economy", "about.comfort", "about.business"])
        },
        { title: "Economy təfərrüatları", where: "Economy salonunun siyahısı", fields: [f("cabinEyebrow", "Bölmənin üst başlığı"), ...detail("economy", "Economy")] },
        { title: "Comfort təfərrüatları", where: "Comfort salonunun siyahısı", fields: detail("comfort", "Comfort") },
        { title: "Business təfərrüatları", where: "Business salonunun siyahısı", fields: detail("business", "Business") },
        {
            title: "Səyahət addımları", where: "Addım-addım bölmə və fon şəkli",
            fields: [f("journeyEyebrow", "Üst başlıq"), f("journeyTitle", "Başlıq"), ...[1, 2, 3, 4].flatMap((n) => [f(`step${n}Title`, `${n}-ci addım: başlıq`), f(`step${n}Text`, `${n}-ci addım: mətn`, true)])],
            extra: () => slotWidget(["about.journey"])
        },
        {
            title: "Xidmətlər və dəyərlər", where: "Xidmət və dəyər kartları",
            fields: [f("servicesEyebrow", "Xidmətlər: üst başlıq"), f("servicesTitle", "Xidmətlər: başlıq"), f("svcSearchTitle", "Xidmət 1"), f("svcSeatTitle", "Xidmət 2"), f("svcManageTitle", "Xidmət 3"),
                f("valuesEyebrow", "Dəyərlər: üst başlıq"), f("valuesTitle", "Dəyərlər: başlıq"),
                f("valTrustTitle", "Dəyər 1: başlıq"), f("valTrustText", "Dəyər 1: mətn", true), f("valComfortTitle", "Dəyər 2: başlıq"), f("valComfortText", "Dəyər 2: mətn", true),
                f("valQualityTitle", "Dəyər 3: başlıq"), f("valQualityText", "Dəyər 3: mətn", true), f("valPersonalTitle", "Dəyər 4: başlıq"), f("valPersonalText", "Dəyər 4: mətn", true)]
        },
        { title: "Yekun çağırış", where: "Səhifənin sonundakı çağırış və fon şəkli", fields: [f("finalTitle", "Başlıq"), f("finalText", "Mətn", true), f("finalButton", "Düymənin mətni")], extra: () => slotWidget(["about.final"]) }
    ]
});
