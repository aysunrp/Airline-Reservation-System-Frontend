/* The one place the admin talks to the backend. It wraps the shared AEROVA_API client (token, timeouts, error mapping). */

const A = window.AEROVA_API;

export const get = (path, query) => A.get(path, query ? { query } : undefined);
export const post = (path, body) => A.post(path, body === undefined ? {} : body);
export const put = (path, body) => A.put(path, body);
export const patch = (path, body) => A.patch(path, body);
export const del = (path, query) => A.del(path, query ? { query } : undefined);
export const url = (path) => A.url(path);
export const token = () => (A.session && A.session.token ? A.session.token() : "");

/* Sends a file as multipart form data (the shared client sends JSON only). */
export async function upload(method, path, file, field = "file") {
    const form = new FormData();
    form.append(field, file);
    let response;
    try {
        response = await fetch(A.url(path), { method, headers: { Authorization: "Bearer " + token() }, body: form });
    } catch (error) {
        throw { userMessage: "Serverə qoşulmaq alınmadı. Bağlantını yoxla." };
    }
    if (response.ok) return response.status === 204 ? null : response.json();
    let problem = {};
    try { problem = await response.json(); } catch (error) { /* no body */ }
    const messages = problem.errors ? Object.values(problem.errors).flat().join(" ") : "";
    throw { status: response.status, userMessage: messages || problem.detail || problem.title || "Fayl yüklənmədi." };
}

/* Messages the server sends in English, shown in Azerbaijani (the server text is kept when it is not listed). */
const KNOWN = [
    [/schedules can only be created on active routes/i, "Cədvəl yalnız aktiv marşrutda saxlanıla bilər. Bu marşrut qeyri-aktivdir: əvvəl Marşrutlar bölməsində onu aktiv et və ya başqa marşrut seç."],
    [/the route (\S+) already exists/i, "Bu marşrut artıq mövcuddur."],
    [/the schedule has no aircraft assigned/i, "Cədvələ təyyarə təyin edilməyib."]
];

export function message(error) {
    if (error && error.userMessage) {
        const known = KNOWN.find(([pattern]) => pattern.test(error.userMessage));
        return known ? known[1] : error.userMessage;
    }
    return "Xəta baş verdi. Bir az sonra yenidən yoxla.";
}

export const isForbidden = (error) => !!error && error.status === 403;

/* Server validation errors ({ "FirstName": ["..."] }) keyed by the camelCase field name. */
export function fieldErrors(error) {
    const result = {};
    if (!error || !error.errors) return result;
    for (const key of Object.keys(error.errors)) {
        const name = key.charAt(0).toLowerCase() + key.slice(1);
        result[name] = [].concat(error.errors[key]).join(" ");
    }
    return result;
}

export const ApiError = A.ApiError;
