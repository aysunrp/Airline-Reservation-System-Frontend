/* Who is signed in and what the server lets them reach. The stored role is only a hint: the server decides. */
import * as api from "./api.js";

const auth = window.AerovaAuth;

export const user = () => (auth && auth.getCurrentUser ? auth.getCurrentUser() : null);
export const isSuper = () => !!auth && auth.isSuperAdmin();

export function displayName() {
    const u = user();
    if (!u) return "";
    return (String(u.firstName || "") + " " + String(u.lastName || "")).trim() || u.email || "";
}

export function initials() {
    const u = user();
    const letters = u ? (String(u.firstName || "").charAt(0) + String(u.lastName || "").charAt(0)) : "";
    return (letters || (u && u.email ? u.email.charAt(0) : "A")).toUpperCase();
}

export function logout() {
    if (auth && auth.logout) auth.logout();
    else { window.AEROVA_API.session.clear(); window.location.href = "login.html"; }
}

const LOGIN = "login.html?next=admin.html";

/* Resolves with { ok: true } or { ok: false, title, text, retry } for the gate screen; may redirect to the sign-in page. */
export async function gate() {
    if (!window.AEROVA_API || !window.AEROVA_API.session.isActive()) {
        window.location.replace(LOGIN);
        return { ok: false, redirect: true };
    }
    window.addEventListener("aerova:session-expired", () => window.location.replace(LOGIN));

    if (!auth || !auth.canUseAdminPanel()) {
        return { ok: false, title: "Yalnız administratorlar üçün", text: "Bu bölmə AEROVA administratorları üçündür. Davam etmək üçün administrator hesabı ilə daxil ol.", login: true };
    }

    try {
        await api.get("api/admin/cancellation-rules");
        return { ok: true };
    } catch (error) {
        if (error && error.status === 401) {
            window.location.replace(LOGIN);
            return { ok: false, redirect: true };
        }
        if (error && error.status === 403) {
            return { ok: false, title: "Yalnız administratorlar üçün", text: "Bu hesabın admin panelinə icazəsi yoxdur.", login: true };
        }
        return { ok: false, title: "Girişi yoxlaya bilmədik", text: api.message(error), retry: true };
    }
}
