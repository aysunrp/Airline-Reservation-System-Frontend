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
        loading: ["api.booking.confirmLoadingTitle", "Confirming your booking", "api.booking.confirmLoading", "Please wait a moment..."],
        done: ["api.booking.confirmDoneTitle", "Booking confirmed!", "api.booking.confirmDoneText", "Your booking is confirmed. Return to the AEROVA tab where you were booking: it continues to payment by itself. You can close this tab."],
        already: ["api.booking.confirmAlreadyTitle", "Already confirmed", "api.booking.confirmAlreadyText", "This booking is already confirmed. Continue in the AEROVA tab where you were booking."],
        expired: ["api.booking.confirmExpiredTitle", "This link has expired", "api.booking.confirmExpiredText", "The seats were held for a short time and are released. Please book again."],
        used: ["api.booking.confirmUsedTitle", "This link was already used", "api.booking.confirmUsedText", "Open the AEROVA tab where you were booking and ask for a new link there."],
        invalid: ["api.booking.confirmFailedTitle", "This link will not work", "api.booking.confirmInvalidText", "This link is invalid or has expired."],
        error: ["api.booking.confirmFailedTitle", "This link will not work", "api.errors.generic", "Something went wrong. Please try again."]
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
        try { return !!window.sessionStorage.getItem("aerovaAccessToken"); } catch (error) { return false; }
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

    window.addEventListener("aerova:languagechange", paint);
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
