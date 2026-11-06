/*
 * The page the e-mailed "delete my account" link opens. Opening the link deletes nothing: the page only asks the server whether the link
 * is still good (a read), and the person has to press "Bəli, hesabımı həmişəlik sil". So a mail program or link scanner that opens
 * addresses cannot delete an account. The token is taken out of the address bar at once and is never kept anywhere. No sign-in is needed:
 * the link itself proves the mailbox. After the deletion every sign-in trace of this browser is removed.
 */
(function () {
    "use strict";

    var status = document.getElementById("delete-status");
    var title = document.getElementById("delete-title");
    var message = document.getElementById("delete-message");
    var list = document.getElementById("delete-list");
    var confirmButton = document.getElementById("delete-confirm-button");
    var keep = document.getElementById("delete-keep");
    var home = document.getElementById("delete-home");
    if (!status || !title || !message || !confirmButton || !window.AEROVA_API) return;

    var token = "";
    var redirectTimer = null;

    var TEXTS = {
        loading: ["Keçid yoxlanılır", "Bir az gözləyin...", "loading"],
        ask: ["Hesab həmişəlik silinsin?", "Hesabınız yalnız aşağıdakı düyməni basdıqdan sonra silinəcək.", "mail"],
        working: ["Hesab silinir", "Bir az gözləyin...", "loading"],
        done: ["Hesabınız silindi", "Təsdiq məktubunu e-poçtunuza göndərdik. Bir neçə saniyədən sonra ana səhifəyə yönləndirilirsiniz.", "success"],
        expired: ["Keçidin vaxtı bitib", "Profilinizdən hesabın silinməsini yenidən istəyin; yeni keçid göndərəcəyik.", "error"],
        used: ["Keçid artıq istifadə olunub", "Hələ də silmək istəyirsinizsə, profilinizdən yenidən istəyin.", "error"],
        gone: ["Hesab artıq silinib", "Bu keçid ilə hesab əvvəl silinib.", "success"],
        invalid: ["Bu keçid işləmir", "Keçid etibarsızdır və ya vaxtı bitib.", "error"],
        blocked: ["Hesab hələ silinə bilməz", "", "error"],
        error: ["Xəta baş verdi", "Zəhmət olmasa bir az sonra yenidən cəhd edin.", "error"]
    };

    function show(kind, extraMessage) {
        var entry = TEXTS[kind] || TEXTS.error;
        status.setAttribute("data-state", entry[2]);
        title.textContent = entry[0];
        message.textContent = extraMessage || entry[1];
        list.hidden = kind !== "ask";
        confirmButton.hidden = kind !== "ask";
        confirmButton.disabled = false;
        keep.hidden = kind !== "ask";
        home.hidden = kind === "ask" || kind === "loading" || kind === "working";
        if (kind === "ask") confirmButton.focus();
    }

    function takeToken() {
        var value = new URLSearchParams(window.location.search).get("token") || "";
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, "", window.location.pathname);
        }
        return value;
    }

    function fail(error) {
        var reason = error && error.status === 422 ? error.code : "";
        if (reason === "link_expired") show("expired");
        else if (reason === "link_used") show("used");
        else if (reason === "link_confirmed") show("gone");
        else if (reason === "link_invalid") show("invalid");
        else if (error && error.status === 422) show("blocked", error.userMessage || "");
        else if (error && error.status === 429) show("error", error.userMessage || "");
        else show("error");
    }

    /* The deleted account's sign-in, saved bookings and profile traces are removed from this browser. */
    function forgetThisBrowser() {
        try {
            if (window.AerovaAuth && window.AerovaAuth.logout) {
                // logout() leaves for the login page; here the person goes to the home page instead, so only the state is cleared.
                window.AerovaAuth.clearAuthState();
            } else if (window.AEROVA_API && window.AEROVA_API.session) {
                window.AEROVA_API.session.clear();
            }
        } catch (error) { /* ignore */ }

        [sessionStorage, localStorage].forEach(function (store) {
            try {
                ["bookingData", "aerovaBooking", "aerovaBookingOwner", "aerovaSelectedFlight", "aerovaJourney", "aerovaCheckout", "aerovaTrips", "aerovaProfile"].forEach(function (key) {
                    store.removeItem(key);
                });
            } catch (error) { /* ignore */ }
        });
    }

    confirmButton.addEventListener("click", function () {
        if (!token) {
            show("invalid");
            return;
        }

        confirmButton.disabled = true;
        show("working");
        window.AEROVA_API.post("api/account-deletion/confirm", { token: token, language: "az" }).then(function () {
            token = "";
            forgetThisBrowser();
            show("done");
            redirectTimer = window.setTimeout(function () { window.location.href = "index.html"; }, 5000);
        }).catch(fail);
    });

    home.addEventListener("click", function () {
        if (redirectTimer) window.clearTimeout(redirectTimer);
    });

    token = takeToken();
    if (!token) {
        show("invalid");
    } else {
        show("loading");
        window.AEROVA_API.post("api/account-deletion/check", { token: token }).then(function () {
            show("ask");
        }).catch(fail);
    }
})();
