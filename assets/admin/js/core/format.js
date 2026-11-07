/* Formatting and the Azerbaijani names of the values the API sends as English words. */

const STATUS = {
    Scheduled: ["Planlaşdırılıb", "success"], OnTime: ["Vaxtında", "success"], Delayed: ["Gecikir", "warning"],
    Cancelled: ["Ləğv edilib", "danger"], Canceled: ["Ləğv edilib", "danger"], Completed: ["Tamamlanıb", "success"],
    Active: ["Aktiv", "success"], Inactive: ["Qeyri-aktiv", "danger"], Maintenance: ["Təmirdə", "warning"],
    Confirmed: ["Təsdiqlənib", "success"], Pending: ["Gözləmədə", "warning"], Expired: ["Vaxtı bitib", "danger"],
    Available: ["Boş", "success"], Booked: ["Tutulub", "danger"], Held: ["Rezerv", "warning"], Blocked: ["Bloklanıb", "danger"],
    Processing: ["İcra olunur", "warning"], Succeeded: ["Tamamlanıb", "success"], Failed: ["Uğursuz", "danger"], NotEligible: ["Uyğun deyil", "info"],
    Open: ["Açıq", "warning"], InProgress: ["İşlənir", "warning"], WaitingForCustomer: ["Müştəri gözlənilir", "info"], Resolved: ["Həll olunub", "success"],
    Queued: ["Növbədə", "info"], Sending: ["Göndərilir", "warning"], CompletedWithErrors: ["Xətalarla tamamlandı", "warning"]
};

export function statusLabel(status) {
    const entry = STATUS[status];
    if (entry) return entry[0];
    return String(status || "—").replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function statusTone(status) {
    const entry = STATUS[status];
    return entry ? entry[1] : "neutral";
}

export const ROLES = { User: "İstifadəçi", Admin: "Admin", SuperAdmin: "SuperAdmin" };
export const roleLabel = (role) => ROLES[role] || String(role || "");

export const CABINS = ["Economy", "Comfort", "Business"];
export const FLIGHT_STATUSES = ["Scheduled", "OnTime", "Delayed", "Cancelled", "Completed"];
export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAY_SHORT = { Monday: "B.e.", Tuesday: "Ç.a.", Wednesday: "Çər.", Thursday: "C.a.", Friday: "Cümə", Saturday: "Şən.", Sunday: "Baz." };

export function money(amount) {
    const value = Number(amount);
    return "$" + (isFinite(value) ? value : 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function duration(minutes) {
    const m = Math.round(Number(minutes) || 0);
    return Math.floor(m / 60) + " s " + String(m % 60).padStart(2, "0") + " dəq";
}

/* "2026-11-05T14:30:00Z" -> "2026-11-05 14:30" (UTC). */
export function utc(value) {
    const text = String(value || "");
    return text ? text.slice(0, 10) + " " + text.slice(11, 16) : "—";
}

export const day = (value) => String(value || "").slice(0, 10) || "—";

export function dateTime(value) {
    const text = String(value || "").replace("T", " ");
    return text ? text.slice(0, 16) : "—";
}

/* A UTC time as date and time at the airport (airports: the list from the reference store). */
export function localAt(airports, value, code) {
    const directory = window.AEROVA_AIRPORTS;
    const airport = directory && airports ? directory.find(airports, code) : null;
    if (airport) {
        const local = directory.localTime(value, airport.timeZoneId);
        return { date: local.date, time: local.time };
    }
    return { date: day(value), time: String(value || "").slice(11, 16) };
}

export function daysLabel(days) {
    const text = String(days || "");
    if (text === "Everyday") return "Hər gün";
    if (text === "Weekdays") return "İş günləri";
    return text.split(",").map((name) => DAY_SHORT[name.trim()] || name.trim().slice(0, 3)).join(" ");
}

export function plural(count, one) {
    return count + " " + one;
}

/* Support categories and statuses come with their own translations on the public side. */
export function supportStatus(value) {
    const lib = window.AEROVA_SUPPORT_STATUS;
    const key = lib && lib.canonical ? lib.canonical(value) : value;
    return key;
}

export function supportCategory(value) {
    if (typeof window.t === "function") {
        const text = window.t("support.categories." + value);
        if (text && text !== "support.categories." + value) return text;
    }
    return String(value || "—");
}

const AUDIT = {
    UserCreated: "İstifadəçi yaradıldı", UserRoleChanged: "Rol dəyişdi", UserDeactivated: "Hesab deaktiv edildi", UserActivated: "Hesab aktiv edildi",
    UserDeleted: "Hesab silindi", FlightCreated: "Uçuş yaradıldı", FlightUpdated: "Uçuş dəyişdi", FlightDeleted: "Uçuş silindi", SeatChanged: "Oturacaq dəyişdi",
    ScheduleCreated: "Cədvəl yaradıldı", ScheduleUpdated: "Cədvəl dəyişdi", ScheduleDeleted: "Cədvəl silindi", FlightsGenerated: "Reyslər yaradıldı",
    BookingCancelledByAdmin: "Bron admin tərəfindən ləğv edildi", RefundRetried: "Geri ödəniş təkrar göndərildi", AccessDenied: "Giriş rədd edildi",
    SuperAdminBootstrapped: "SuperAdmin yaradıldı", HomeCardCreated: "Ana səhifə kartı yaradıldı", HomeCardUpdated: "Ana səhifə kartı dəyişdi",
    HomeCardDeleted: "Ana səhifə kartı silindi", HomeCardImageUpdated: "Kart şəkli dəyişdi", HomeCardImageRemoved: "Kart şəkli silindi",
    FaqItemCreated: "Sual yaradıldı", FaqItemUpdated: "Sual dəyişdi", FaqItemDeleted: "Sual silindi", MediaFileReplaced: "Media faylı dəyişdi",
    MediaFileDeleted: "Media faylı silindi", SiteImageUpdated: "Sayt şəkli dəyişdi", SiteImageRemoved: "Sayt şəkli silindi"
};
export const auditLabel = (action) => AUDIT[action] || String(action || "").replace(/([a-z])([A-Z])/g, "$1 $2");
export const AUDIT_ACTIONS = Object.keys(AUDIT);
