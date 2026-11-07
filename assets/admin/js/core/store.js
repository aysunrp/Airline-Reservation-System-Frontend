/* Reference data several screens need (airports, aircraft, routes): fetched once, shared, refreshed on demand. */
import * as api from "./api.js";

const cache = {};

function once(key, loader) {
    if (!cache[key]) {
        cache[key] = loader().catch((error) => { delete cache[key]; throw error; });
    }
    return cache[key];
}

export const airports = () => once("airports", () => window.AEROVA_AIRPORTS.load());
export const aircraft = () => once("aircraft", () => api.get("api/admin/aircraft"));
export const routes = () => once("routes", () => api.get("api/admin/routes"));

export function invalidate(...keys) {
    for (const key of keys) delete cache[key];
    if (keys.includes("airports")) {
        try { sessionStorage.removeItem("aerovaAirportsCache"); } catch (error) { /* nothing cached */ }
    }
}

export async function airportOptions() {
    const list = await airports();
    return list.slice().sort((a, b) => (a.code < b.code ? -1 : 1)).map((a) => ({ value: a.code, label: a.code + " · " + a.city }));
}

export async function aircraftOptions(allowNone = false) {
    const list = await aircraft();
    const options = list.map((a) => ({ value: String(a.id), label: a.name + " (" + a.model + ")" }));
    return allowNone ? [{ value: "", label: "— yoxdur —" }, ...options] : options;
}
