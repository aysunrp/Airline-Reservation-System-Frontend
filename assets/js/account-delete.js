/*
 * "Hesabı sil" on the profile page. This only asks for the deletion: the password is checked on the server and a confirmation link is
 * e-mailed to the account. Nothing is deleted here; the account goes only when the link's page (account-delete-confirm.html) confirms.
 */
(function () {
    "use strict";

    var card = document.getElementById("delete-account-card");
    var form = document.getElementById("profile-form");
    var openButton = document.getElementById("delete-account-open");
    var panel = document.getElementById("delete-account-panel");
    var password = document.getElementById("delete-account-password");
    var errorLine = document.getElementById("delete-account-error");
    var sendButton = document.getElementById("delete-account-send");
    var cancelButton = document.getElementById("delete-account-cancel");
    var sentLine = document.getElementById("delete-account-sent");
    if (!card || !openButton || !panel || !password || !sendButton || !window.AEROVA_API) return;

    function tr(key, fallback, vars) {
        var text = typeof window.t === "function" ? window.t(key, vars) : null;
        if (!text || text === key) text = fallback;
        if (vars) Object.keys(vars).forEach(function (name) { text = text.split("{" + name + "}").join(String(vars[name])); });
        return text;
    }

    /* Staff accounts are managed from the admin panel; the card is for customers, and only once the profile itself is shown. */
    function isStaff() {
        try {
            var user = window.AerovaAuth && window.AerovaAuth.getCurrentUser && window.AerovaAuth.getCurrentUser();
            return !!user && /admin/i.test(String(user.role || ""));
        } catch (error) {
            return false;
        }
    }

    function syncVisibility() {
        card.hidden = !form || form.hidden || isStaff();
    }

    function setError(text) {
        errorLine.textContent = text || "";
        errorLine.hidden = !text;
        if (text) {
            password.setAttribute("aria-invalid", "true");
        } else {
            password.removeAttribute("aria-invalid");
        }
    }

    function setBusy(busy) {
        sendButton.disabled = busy;
        password.disabled = busy;
        sendButton.setAttribute("aria-busy", busy ? "true" : "false");
        sendButton.textContent = busy ? tr("account.delete.sending", "Göndərilir...") : tr("account.delete.send", "Təsdiq keçidi göndər");
    }

    function openPanel() {
        panel.hidden = false;
        openButton.setAttribute("aria-expanded", "true");
        openButton.hidden = true;
        sentLine.hidden = true;
        password.focus();
    }

    function closePanel() {
        panel.hidden = true;
        openButton.hidden = false;
        openButton.setAttribute("aria-expanded", "false");
        password.value = "";
        setError("");
        openButton.focus();
    }

    function submit() {
        setError("");
        sentLine.hidden = true;

        if (!password.value) {
            setError(tr("account.delete.passwordRequired", "Şifrənizi daxil edin."));
            password.focus();
            return;
        }

        setBusy(true);
        window.AEROVA_API.post("api/account-deletion/request", { password: password.value, language: "az" }).then(function (result) {
            password.value = "";
            sentLine.textContent = tr("account.delete.sent",
                "E-poçtunuza ({email}) təsdiq keçidi göndərdik. Keçid {minutes} dəqiqə etibarlıdır. Hesabınız hələ silinməyib: onu yalnız e-poçtdakı keçidi açıb təsdiqləyəndən sonra siləcəyik.",
                { email: result.maskedEmail, minutes: result.minutes });
            sentLine.hidden = false;
            sendButton.hidden = true;
            password.closest(".field").hidden = true;
            cancelButton.textContent = tr("account.delete.close", "Bağla");
            sentLine.focus();
        }).catch(function (error) {
            var code = error && error.status === 422 ? error.code : "";
            if (code === "wrong_password") {
                setError(tr("account.delete.wrongPassword", "Şifrə yanlışdır."));
                password.focus();
            } else if (error && error.status === 429) {
                setError(error.userMessage || tr("account.delete.tooMany", "Çox sayda cəhd. Bir az sonra yenidən cəhd edin."));
            } else if (error && error.userMessage) {
                setError(error.userMessage);
            } else {
                setError(tr("api.errors.generic", "Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin."));
            }
        }).then(function () {
            setBusy(false);
            // The field was disabled while the request ran, so focus returns to it only now (for a wrong password).
            if (!errorLine.hidden) password.focus();
        });
    }

    openButton.addEventListener("click", openPanel);
    cancelButton.addEventListener("click", closePanel);
    sendButton.addEventListener("click", submit);
    password.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            submit();
        } else if (event.key === "Escape") {
            closePanel();
        }
    });

    if (form && window.MutationObserver) {
        new MutationObserver(syncVisibility).observe(form, { attributes: true, attributeFilter: ["hidden"] });
    }
    syncVisibility();
})();
