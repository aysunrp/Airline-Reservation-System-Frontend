/* The single map of the admin: the sidebar, the router and the command palette are all built from this list. */

export const GROUPS = [
    {
        id: "dashboard", label: "Panel", icon: "dashboard",
        items: [{ path: "/", label: "Panel", icon: "dashboard", desc: "Əməliyyatların ümumi vəziyyəti", keywords: "ana səhifə dashboard statistika", load: () => import("../views/dashboard.js") }]
    },
    {
        id: "flights", label: "Uçuş əməliyyatları", icon: "plane",
        items: [
            { path: "/flights", label: "Uçuşlar", icon: "plane", desc: "Reyslər, statuslar və qiymətlər", keywords: "reys flight uçuş", load: () => import("../views/flights.js") },
            { path: "/schedules", label: "Cədvəllər", icon: "calendar", desc: "Təkrarlanan reys cədvəlləri", keywords: "schedule cədvəl", load: () => import("../views/schedules.js") },
            { path: "/routes", label: "Marşrutlar", icon: "route", desc: "Hava limanları arasındakı xətlər", keywords: "route marşrut", load: () => import("../views/routes.js") },
            { path: "/aircraft", label: "Təyyarələr", icon: "plane", desc: "Park və oturacaq tutumu", keywords: "aircraft təyyarə", load: () => import("../views/aircraft.js") },
            { path: "/seats", label: "Oturacaq xəritəsi", icon: "seat", desc: "Reys üzrə yerlərin vəziyyəti", keywords: "seat oturacaq yer", load: () => import("../views/seats.js") },
            { path: "/airports", label: "Hava limanları", icon: "airport", desc: "Hava limanları və saat qurşaqları", keywords: "airport hava limanı", load: () => import("../views/airports.js") }
        ]
    },
    {
        id: "customers", label: "Bronlar və müştərilər", icon: "ticket",
        items: [
            { path: "/bookings", label: "Bronlar", icon: "ticket", desc: "Rezervasiyalar və ləğvlər", keywords: "booking bron pnr rezervasiya", load: () => import("../views/bookings.js") },
            { path: "/refunds", label: "Geri ödənişlər", icon: "refund", desc: "Ləğv olunmuş bronların geri ödənişləri", keywords: "refund geri ödəniş stripe", load: () => import("../views/refunds.js") },
            { path: "/passengers", label: "Sərnişinlər", icon: "users", desc: "Sərnişin qeydləri", keywords: "passenger sərnişin", load: () => import("../views/passengers.js") },
            { path: "/support", label: "Dəstək", icon: "chat", desc: "Müştəri müraciətləri və cavablar", keywords: "support dəstək müraciət ticket", load: () => import("../views/support.js") }
        ]
    },
    {
        id: "pricing", label: "Qiymət və xidmətlər", icon: "tag",
        items: [
            { path: "/promos", label: "Promo kodlar", icon: "tag", desc: "Endirim kodları və e-poçt kampaniyaları", keywords: "promo kod kampaniya endirim", load: () => import("../views/promos.js") },
            { path: "/options", label: "Baqaj və yemək", icon: "bag", desc: "Əlavə xidmətlər", keywords: "baggage meal baqaj yemək", load: () => import("../views/options.js") },
            { path: "/rules", label: "Ləğv qaydaları", icon: "rule", desc: "Ləğv komissiyası qaydaları", keywords: "cancellation ləğv qayda", load: () => import("../views/rules.js") }
        ]
    },
    {
        id: "website", label: "Website", icon: "globe",
        items: [
            { path: "/website", label: "Ümumi baxış", icon: "globe", desc: "Saytın səhifələri bir yerdə", keywords: "website sayt cms", load: () => import("../views/website/overview.js") },
            { path: "/website/home", label: "Ana səhifə", icon: "home", desc: "Hero, kartlar, newsletter", keywords: "home ana səhifə hero video kart", load: () => import("../views/website/home.js") },
            { path: "/website/about", label: "AEROVA haqqında", icon: "info", desc: "Hekayə, salonlar, xidmətlər, şəkillər", keywords: "about haqqında", load: () => import("../views/website/about.js") },
            { path: "/website/destinations", label: "İstiqamətlər", icon: "map", desc: "Ölkələr, şəhərlər, şəkillər", keywords: "destination istiqamət şəhər ölkə", load: () => import("../views/website/destinations.js") },
            { path: "/website/support", label: "Dəstək və FAQ", icon: "help", desc: "Suallar və əlaqə məlumatları", keywords: "faq sual dəstək əlaqə", load: () => import("../views/website/support.js") },
            { path: "/website/header", label: "Başlıq və menyu", icon: "menu", desc: "Loqo və menyu keçidləri", keywords: "header menu loqo naviqasiya", load: () => import("../views/website/header.js") },
            { path: "/website/footer", label: "Footer", icon: "list", desc: "Mətnlər, keçidlər, sosial şəbəkələr", keywords: "footer sosial", load: () => import("../views/website/footer.js") },
            { path: "/website/media", label: "Media kitabxanası", icon: "image", desc: "Bütün şəkillər və istifadə yerləri", keywords: "media şəkil fayl library", load: () => import("../views/website/media.js") }
        ]
    },
    {
        id: "system", label: "Sistem", icon: "shield", superOnly: true,
        items: [
            { path: "/users", label: "İstifadəçilər", icon: "shield", desc: "Hesablar, rollar və giriş", keywords: "users istifadəçi admin rol", superOnly: true, load: () => import("../views/users.js") },
            { path: "/audit", label: "Audit jurnalı", icon: "list", desc: "Kim nə vaxt nə etdi", keywords: "audit jurnal log", superOnly: true, load: () => import("../views/audit.js") }
        ]
    }
];

export const ALL_ITEMS = GROUPS.flatMap((group) => group.items.map((item) => ({ ...item, group: group.label, groupId: group.id })));

export const findItem = (path) => ALL_ITEMS.find((item) => item.path === path) || null;
