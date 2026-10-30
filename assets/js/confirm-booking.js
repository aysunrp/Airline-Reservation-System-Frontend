/*
 * The page the e-mailed booking link opens. The token in the address is the proof of reaching the mailbox, so nothing here needs a
 * sign-in: the link is traded for "this booking is confirmed" and then removed from the address bar. The booking itself carries on in
 * the tab where it was made, which asks the server by itself; this tab only says so, and tells that tab right away when it can.
 */
(function () {
    "use strict";

    var status = document.getElementById("confirm-status");
    var title = document.getElementById("confirm-title");
    var message = document.getElementById("confirm-message");
    var next = document.getElementById("confirm-continue");
    if (!status || !title || !message || !window.AEROVA_API) return;

    var state = { kind: "loading" };

    function tr(key, fallback) {
        var value = typeof window.t === "function" ? window.t(key) : null;
        return value && value !== key ? value : fallback;
    }

    var TEXTS = {
        loading: ["api.booking.confirmLoadingTitle", "Rezervasiya təsdiqlənir", "api.booking.confirmLoading", "Bir az gözləyin..."],
        done: ["api.booking.confirmDoneTitle", "Rezervasiya təsdiqləndi!", "api.booking.confirmDoneText", "Rezervasiyanız təsdiqləndi. Rezerv etdiyiniz AEROVA səhifəsinə qayıdın: o, özü ödənişə davam edəcək. Bu səhifəni bağlaya bilərsiniz."],
        already: ["api.booking.confirmAlreadyTitle", "Artıq təsdiqlənib", "api.booking.confirmAlreadyText", "Bu rezervasiya artıq təsdiqlənib. Rezerv etdiyiniz AEROVA səhifəsində davam edin."],
        expired: ["api.booking.confirmExpiredTitle", "Keçidin vaxtı bitib", "api.booking.confirmExpiredText", "Yerlər qısa müddət tutulur və buraxılıb. Zəhmət olmasa yenidən rezerv edin."],
        used: ["api.booking.confirmUsedTitle", "Keçid artıq istifadə olunub", "api.booking.confirmUsedText", "Rezerv etdiyiniz AEROVA səhifəsini açın və yeni keçidi orada istəyin."],
        invalid: ["api.booking.confirmFailedTitle", "Bu keçid işləmir", "api.booking.confirmInvalidText", "Keçid etibarsızdır və ya vaxtı bitib."],
        error: ["api.booking.confirmFailedTitle", "Bu keçid işləmir", "api.errors.generic", "Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin."]
    };

    function paint() {
        var entry = TEXTS[state.kind] || TEXTS.error;
        var visual = state.kind === "loading" ? "loading" : (state.kind === "done" || state.kind === "already" ? "success" : "error");
        status.setAttribute("data-state", visual);
        if (visual !== "loading") status.removeAttribute("aria-busy");
        title.textContent = tr(entry[0], entry[1]);
        message.textContent = tr(entry[2], entry[3]);
        if (next) next.hidden = !(state.kind === "done" || state.kind === "already") || !state.signedIn;
    }

    function show(kind) {
        state.kind = kind;
        paint();
    }

    /* Takes the token out of the address (and out of the history entry) so it is not left in the bar or in a screenshot. */
    function takeToken() {
        var params = new URLSearchParams(window.location.search);
        var token = params.get("token") || "";
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, "", window.location.pathname);
        }
        return token;
    }

    function tellOtherTabs() {
        if (!window.BroadcastChannel) return;
        try {
            var channel = new window.BroadcastChannel("aerova-email");
            channel.postMessage({ type: "booking-confirmed" });
            window.setTimeout(function () { channel.close(); }, 1500);
        } catch (error) { /* the other tab also asks by itself */ }
    }

    function signedInHere() {
        try { return !!window.localStorage.getItem("aerovaAccessToken"); } catch (error) { return false; }
    }

    function finish(kind) {
        state.signedIn = signedInHere();
        show(kind);
        tellOtherTabs();

        // A tab that is signed in and still holds its booking data (the link was opened right here) carries on to payment itself.
        var hasBooking = false;
        try { hasBooking = !!window.sessionStorage.getItem("bookingData"); } catch (error) { hasBooking = false; }
        if (state.signedIn && hasBooking) {
            window.setTimeout(function () { window.location.href = "payment.html"; }, 1500);
        }
    }

    paint();

    var token = takeToken();
    if (!token) {
        show("invalid");
        return;
    }

    window.AEROVA_API.post("api/bookings/confirm-email", { token: token }).then(function () {
        finish("done");
    }).catch(function (error) {
        var reason = error && error.status === 422 ? error.code : "";
        if (reason === "link_confirmed") {
            finish("already");
        } else if (reason === "link_expired") {
            show("expired");
        } else if (reason === "link_used") {
            show("used");
        } else if (error && error.status === 422) {
            show("invalid");
        } else {
            show("error");
        }
    });
})();
