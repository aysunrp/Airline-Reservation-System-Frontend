/*
 * Account settings: password, active devices and e-mail options of the signed-in account (User, Admin and SuperAdmin alike).
 * Every action goes to the server (api/account/...); nothing is shown as done until the server says so. The account is always the one of the token.
 * A password change, an e-mail change and "sign out of other devices" give back a fresh token, which replaces the old one here, so this device stays in.
 */
(function () {
    "use strict";

    var api = window.AEROVA_API;
    var auth = window.AerovaAuth;
    if (!api || !auth) return;

    var state = { overview: null, sessions: [] };

    function $(id) { return document.getElementById(id); }

    function tr(key, fallback, vars) {
        var text = typeof window.t === "function" ? window.t(key, vars) : null;
        if (!text || text === key) text = fallback;
        if (vars) Object.keys(vars).forEach(function (name) { text = text.split("{" + name + "}").join(String(vars[name])); });
        return text;
    }

    function two(n) { return String(n).padStart(2, "0"); }

    /* The API sends UTC times, sometimes without the "Z"; without it the browser would read them as local time. */
    function parseUtc(value) {
        if (!value) return null;
        var text = String(value);
        var date = new Date(/(Z|[+-]\d\d:?\d\d)$/i.test(text) ? text : text + "Z");
        return isNaN(date.getTime()) ? null : date;
    }

    function formatDate(value, withTime) {
        var date = parseUtc(value);
        if (!date) return "—";
        var day = two(date.getDate()) + "." + two(date.getMonth() + 1) + "." + date.getFullYear();
        return withTime ? day + ", " + two(date.getHours()) + ":" + two(date.getMinutes()) : day;
    }

    function roleLabel(role) {
        if (role === "SuperAdmin") return "Super Admin";
        if (role === "Admin") return "Admin";
        return "İstifadəçi";
    }

    /* The server's own words when it has them (they are Azerbaijani), else a plain sentence. */
    function problemText(error, fallback) {
        if (!error) return fallback;
        if (error.status === 429) return error.detail || error.message || fallback;
        if (error.status === 0 || error.status === undefined) return error.message || fallback;
        if (error.status === 400) return fallback;
        return error.detail || error.message || fallback;
    }

    /* ---- small UI helpers ---- */

    function show(element, visible) { if (element) element.hidden = !visible; }

    function setResult(id, kind, text) {
        var el = $(id);
        if (!el) return;
        el.classList.toggle("is-success", kind === "success");
        el.classList.toggle("is-error", kind === "error");
        el.textContent = text || "";
        el.hidden = !text;
    }

    function fieldError(inputId, text) {
        var input = $(inputId);
        var line = document.querySelector('[data-error-for="' + inputId + '"]');
        if (input) {
            input.classList.toggle("is-invalid", !!text);
            if (text) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
        }
        if (line) {
            line.textContent = text || "";
            line.hidden = !text;
        }
    }

    function clearFieldErrors(form) {
        form.querySelectorAll(".field-input").forEach(function (input) { fieldError(input.id, ""); });
    }

    function busy(button, working, label) {
        if (!button) return;
        if (working) {
            button.dataset.label = button.textContent;
            button.textContent = label || "Gözləyin...";
            button.disabled = true;
        } else {
            button.textContent = button.dataset.label || button.textContent;
            button.disabled = false;
        }
    }

    function flash(text, kind) {
        var el = $("settings-message");
        if (!el) return;
        el.textContent = text;
        el.classList.toggle("is-success", kind === "success");
        el.hidden = !text;
    }

    /* A fresh token (password, e-mail, "other devices"): it replaces the old one and the shown user. */
    function takeSession(response) {
        if (!response || !response.accessToken) return false;
        api.session.save(response);
        var user = response.user || {};
        auth.updateCurrentUser({ firstName: user.firstName, lastName: user.lastName, email: user.email, emailVerified: user.emailVerified });
        return true;
    }

    /* ---- loading ---- */

    function setStatus(kind, title, text, retry) {
        var panel = $("settings-status");
        if (!panel) return;
        $("settings-status-title").textContent = title || "";
        $("settings-status-text").textContent = text || "";
        panel.hidden = kind === "ready";
        show($("settings-status-retry"), !!retry);
        show($("settings-body"), kind === "ready");
    }

    function load() {
        setStatus("loading", "Yüklənir...", "Hesab məlumatlarınız oxunur.", false);
        return Promise.all([
            api.get("api/account/overview", { fresh: true }),
            api.get("api/account/sessions", { fresh: true }),
            api.get("api/account/notification-preferences", { fresh: true })
        ]).then(function (results) {
            state.overview = results[0];
            state.sessions = results[1] || [];
            renderOverview();
            renderSessions();
            renderPreferences(results[2]);
            setStatus("ready");
        }).catch(function (error) {
            if (error && error.status === 401) {
                // The session ended (or the migration of the settings tables is missing, which also answers with an error).
                window.location.href = "login.html?next=" + encodeURIComponent("account-settings.html");
                return;
            }
            setStatus("error", "Hesab tənzimləmələri açıla bilmədi", problemText(error, "Bağlantını yoxlayıb yenidən cəhd edin."), true);
        });
    }

    /* ---- overview ---- */

    function renderOverview() {
        var o = state.overview;
        if (!o) return;
        $("fact-email").textContent = o.email;
        $("fact-role").textContent = roleLabel(o.role);
        $("fact-member").textContent = formatDate(o.memberSince, false);
        $("fact-signin").textContent = formatDate(o.lastSignInAt, true);
        $("fact-password").textContent = o.passwordChangedAt ? formatDate(o.passwordChangedAt, true) : "Dəyişdirilməyib";
        $("fact-sessions").textContent = String(o.openSessions);
        var staff = !!o.canUseAdminPanel;
        var note = $("staff-note");
        note.hidden = !staff;
        if (staff) {
            note.textContent = o.role === "SuperAdmin"
                ? "Bu hesab Super Admin səlahiyyətinə malikdir (admin paneli, istifadəçi və məzmun idarəsi). Güclü, yalnız sizə məxsus bir şifrə saxlayın və tanımadığınız cihazları dərhal bağlayın."
                : "Bu hesab admin panelinə giriş icazəsinə malikdir. Güclü, yalnız sizə məxsus bir şifrə saxlayın və tanımadığınız cihazları dərhal bağlayın.";
        }
    }

    /* ---- password ---- */

    function strengthOf(value) {
        var score = 0;
        if (value.length >= 6) score++;
        if (value.length >= 10) score++;
        if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
        if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
        else if (/\d/.test(value) || /[^A-Za-z0-9]/.test(value)) score += 0.5;
        return value.length === 0 ? 0 : Math.max(1, Math.min(4, Math.floor(score)));
    }

    function paintStrength() {
        var value = $("pw-new").value;
        var level = strengthOf(value);
        var bar = $("pw-strength-bar");
        if (level) bar.setAttribute("data-level", String(level)); else bar.removeAttribute("data-level");
        $("pw-strength-label").textContent = [
            "Ən azı 6 simvol. Hərf, rəqəm və simvolları qarışdırın.",
            "Zəif şifrə: uzun və daha müxtəlif simvollarla gücləndirin.",
            "Orta şifrə: böyük hərf, rəqəm və simvol əlavə edin.",
            "Yaxşı şifrə.",
            "Güclü şifrə."
        ][level];
    }

    function submitPassword(event) {
        event.preventDefault();
        var form = event.currentTarget;
        clearFieldErrors(form);
        setResult("pw-result", "", "");

        var current = $("pw-current").value;
        var next = $("pw-new").value;
        var again = $("pw-confirm").value;
        var ok = true;
        if (!current) { fieldError("pw-current", "Cari şifrəni daxil edin."); ok = false; }
        if (next.length < 6) { fieldError("pw-new", "Yeni şifrə ən azı 6 simvol olmalıdır."); ok = false; }
        else if (next === current) { fieldError("pw-new", "Yeni şifrə cari şifrədən fərqli olmalıdır."); ok = false; }
        if (again !== next) { fieldError("pw-confirm", "Şifrələr uyğun gəlmir."); ok = false; }
        if (!ok) return;

        var button = $("pw-submit");
        busy(button, true, "Dəyişdirilir...");
        api.put("api/account/password", { currentPassword: current, newPassword: next, confirmPassword: again }).then(function (response) {
            takeSession(response);
            form.reset();
            paintStrength();
            setResult("pw-result", "success", "Şifrəniz dəyişdirildi. Təhlükəsizlik üçün digər cihazlardan çıxış edildi, bu cihaz açıq qalır. Sizə təhlükəsizlik bildirişi göndərildi.");
            $("pw-result").focus();
            return load();
        }).catch(function (error) {
            if (error && error.code === "wrong_password") {
                fieldError("pw-current", error.detail || "Cari şifrə yanlışdır.");
            } else if (error && error.status === 429) {
                setResult("pw-result", "error", problemText(error, "Çox sayda cəhd oldu. Bir az gözləyin."));
            } else {
                setResult("pw-result", "error", problemText(error, "Şifrə dəyişdirilmədi. Yenidən cəhd edin."));
            }
        }).then(function () { busy(button, false); });
    }

    /* "Forgot the current password": the existing reset flow. A six-digit code is e-mailed to the account's own address; the code page
       and the reset page that follow are the same ones the sign-in page uses. */
    function forgotPassword() {
        setResult("pw-result", "", "");
        var email = state.overview && state.overview.email;
        if (!email) return;
        var button = $("pw-forgot");
        busy(button, true, "Kod göndərilir...");
        api.post("api/auth/forgot-password", { email: email, language: "az" }).then(function () {
            try { window.sessionStorage.setItem("aerovaResetEmail", email); } catch (error) { /* the code page asks for the address again */ }
            window.location.href = "verify-reset-code.html";
        }).catch(function (error) {
            busy(button, false);
            setResult("pw-result", "error", problemText(error, "Kod göndərilmədi. Bir az sonra yenidən cəhd edin."));
        });
    }

    function bindPasswordToggles() {
        document.querySelectorAll(".password-toggle").forEach(function (button) {
            button.addEventListener("click", function () {
                var input = $(button.getAttribute("data-toggle-for"));
                if (!input) return;
                var visible = input.type === "password";
                input.type = visible ? "text" : "password";
                button.textContent = visible ? "Gizlət" : "Göstər";
                button.setAttribute("aria-pressed", visible ? "true" : "false");
                button.setAttribute("aria-label", visible ? "Şifrəni gizlət" : "Şifrəni göstər");
            });
        });
    }

    /* ---- sessions ---- */

    function renderSessions() {
        var list = $("session-list");
        list.innerHTML = "";
        var sessions = state.sessions || [];
        show($("session-empty"), sessions.length === 0);
        sessions.forEach(function (session) {
            var item = document.createElement("li");
            item.className = "session";

            var info = document.createElement("div");
            var name = document.createElement("p");
            name.className = "session-name";
            name.textContent = (session.device || "Naməlum cihaz") + (session.isCurrent ? " · bu cihaz" : "");
            var meta = document.createElement("p");
            meta.className = "session-meta";
            meta.textContent = "Giriş: " + formatDate(session.createdAt, true) + (session.maskedIp ? " · " + session.maskedIp : "") +
                " · " + formatDate(session.expiresAt, false) + " tarixinədək";
            info.appendChild(name);
            info.appendChild(meta);
            item.appendChild(info);

            if (!session.isCurrent) {
                var end = document.createElement("button");
                end.type = "button";
                end.className = "session-end";
                end.textContent = "Çıxış et";
                end.setAttribute("aria-label", "Bu cihazdan çıxış et: " + (session.device || "naməlum cihaz"));
                end.addEventListener("click", function () { endSession(session, end); });
                item.appendChild(end);
            }

            list.appendChild(item);
        });
        $("revoke-others").disabled = sessions.filter(function (s) { return !s.isCurrent; }).length === 0;
    }

    function endSession(session, button) {
        setResult("sessions-result", "", "");
        button.disabled = true;
        api.del("api/account/sessions/" + session.id).then(function () {
            setResult("sessions-result", "success", "Cihazdan çıxış edildi.");
            return refreshSessions();
        }).catch(function (error) {
            button.disabled = false;
            setResult("sessions-result", "error", problemText(error, "Çıxış edilmədi. Yenidən cəhd edin."));
        });
    }

    function refreshSessions() {
        return Promise.all([api.get("api/account/sessions", { fresh: true }), api.get("api/account/overview", { fresh: true })]).then(function (results) {
            state.sessions = results[0] || [];
            state.overview = results[1];
            renderSessions();
            renderOverview();
        });
    }

    function revokeOthers() {
        setResult("sessions-result", "", "");
        var button = $("revoke-others");
        busy(button, true, "Çıxış edilir...");
        api.post("api/account/sessions/revoke-others").then(function (response) {
            takeSession(response);
            setResult("sessions-result", "success", "Bütün digər cihazlardan çıxış edildi. Bu cihaz açıq qalır.");
            return refreshSessions();
        }).catch(function (error) {
            setResult("sessions-result", "error", problemText(error, "Çıxış edilmədi. Yenidən cəhd edin."));
        }).then(function () { busy(button, false); renderSessions(); });
    }

    /* ---- e-mail options ---- */

    function renderPreferences(prefs) {
        var p = prefs || {};
        $("pref-flight").checked = p.flightUpdates !== false;
        $("pref-system").checked = p.systemMessages !== false;
        $("pref-marketing").checked = p.marketing !== false;
    }

    function submitPreferences(event) {
        event.preventDefault();
        setResult("prefs-result", "", "");
        var button = $("prefs-submit");
        busy(button, true, "Saxlanılır...");
        api.put("api/account/notification-preferences", {
            flightUpdates: $("pref-flight").checked,
            systemMessages: $("pref-system").checked,
            marketing: $("pref-marketing").checked
        }).then(function (saved) {
            renderPreferences(saved);
            setResult("prefs-result", "success", "Bildiriş seçimləriniz saxlanıldı.");
        }).catch(function (error) {
            setResult("prefs-result", "error", problemText(error, "Seçimlər saxlanılmadı. Yenidən cəhd edin."));
        }).then(function () { busy(button, false); });
    }

    /* ---- start ---- */

    function init() {
        if (!auth.isLoggedIn()) {
            window.location.href = "login.html?next=" + encodeURIComponent("account-settings.html");
            return;
        }

        bindPasswordToggles();
        $("pw-new").addEventListener("input", paintStrength);
        $("password-form").addEventListener("submit", submitPassword);
        $("pw-forgot").addEventListener("click", forgotPassword);
        $("revoke-others").addEventListener("click", revokeOthers);
        $("prefs-form").addEventListener("submit", submitPreferences);
        $("settings-status-retry").addEventListener("click", load);
        document.querySelectorAll(".settings-form .field-input").forEach(function (input) {
            input.addEventListener("input", function () { fieldError(input.id, ""); });
        });

        load();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
