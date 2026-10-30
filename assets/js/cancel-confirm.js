/*
 * The page the e-mailed cancellation link opens. Opening the link cancels nothing: the person presses "Yes, cancel my booking" here, so a
 * mail program or a link scanner that opens addresses cannot cancel a trip. The token is traded for the cancellation at that moment and
 * is taken out of the address bar at once. No sign-in is needed: the link itself proves the mailbox of the account.
 */
(function () {
    "use strict";

    var status = document.getElementById("cancel-status");
    var title = document.getElementById("cancel-title");
    var message = document.getElementById("cancel-message");
    var feedback = document.getElementById("cancel-feedback");
    var confirmButton = document.getElementById("cancel-confirm-button");
    var keep = document.getElementById("cancel-keep");
    var trips = document.getElementById("cancel-trips");
    if (!status || !title || !message || !confirmButton || !window.AEROVA_API) return;

    var token = "";
    var state = { kind: "ask", pnr: "", refund: "" };

    function tr(key, fallback, vars) {
        var text = typeof window.t === "function" ? window.t(key, vars) : null;
        if (!text || text === key) {
            text = fallback;
        }
        if (vars) {
            Object.keys(vars).forEach(function (name) { text = text.split("{" + name + "}").join(String(vars[name])); });
        }
        return text;
    }

    var TEXTS = {
        ask: ["cancellation.confirmTitle", "Rezervasiya ləğv edilsin?", "cancellation.confirmText", "Rezervasiyanız yalnız aşağıda təsdiqlədikdən sonra ləğv olunur. Ləğvi geri qaytarmaq olmur."],
        working: ["cancellation.confirmWorkingTitle", "Rezervasiya ləğv edilir", "cancellation.confirmWorking", "Bir az gözləyin..."],
        done: ["cancellation.confirmDoneTitle", "Rezervasiya ləğv edildi", "cancellation.confirmDoneText", "{pnr} rezervasiyası ləğv edildi. {refund}"],
        expired: ["cancellation.confirmExpiredTitle", "Keçidin vaxtı bitib", "cancellation.confirmExpiredText", "AEROVA-da rezervasiyanızı açıb ləğvi yenidən istəyin; yeni keçid göndərəcəyik."],
        used: ["cancellation.confirmUsedTitle", "Keçid artıq istifadə olunub", "cancellation.confirmUsedText", "Hələ də ləğv etmək istəyirsinizsə, AEROVA-da rezervasiyanızı açıb ləğvi yenidən istəyin."],
        invalid: ["cancellation.confirmFailedTitle", "Bu keçid işləmir", "cancellation.confirmInvalidText", "Keçid etibarsızdır və ya vaxtı bitib."],
        blocked: ["cancellation.confirmFailedTitle", "Bu keçid işləmir", "cancellation.confirmBlockedText", "Bu rezervasiyanı artıq ləğv etmək olmur."],
        error: ["cancellation.confirmFailedTitle", "Bu keçid işləmir", "api.errors.generic", "Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin."]
    };

    function paint() {
        var entry = TEXTS[state.kind] || TEXTS.error;
        var visual = state.kind === "ask" ? "mail" : (state.kind === "working" ? "loading" : (state.kind === "done" ? "success" : "error"));
        status.setAttribute("data-state", visual);
        title.textContent = tr(entry[0], entry[1]);
        message.textContent = tr(entry[2], entry[3], { pnr: state.pnr, refund: state.refund }).trim();
        confirmButton.hidden = state.kind !== "ask";
        confirmButton.disabled = false;
        keep.hidden = state.kind !== "ask";
        trips.hidden = state.kind === "ask" || state.kind === "working";
    }

    function show(kind) {
        state.kind = kind;
        paint();
    }

    function takeToken() {
        var value = new URLSearchParams(window.location.search).get("token") || "";
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, "", window.location.pathname);
        }
        return value;
    }

    /* The sentence about the refund, from what the server recorded when it cancelled (never from this page). */
    function refundSentence(cancellation) {
        if (!cancellation || !(Number(cancellation.refundAmount) > 0) || cancellation.refundStatus === "NotEligible") {
            return tr("cancellation.confirmNoRefund", "Tarif qaydalarına görə qaytarılacaq məbləğ yoxdur.");
        }
        var amount = Number(cancellation.refundAmount).toFixed(2) + " " + String(cancellation.currency || "USD").toUpperCase();
        return tr("cancellation.confirmRefund", "{amount} məbləğinin ödəniş etdiyiniz karta qaytarılması üçün sorğu göndərilib. Təsdiqlənəndə sizə məktub yazacağıq; hələ heç nə qaytarılmayıb.", { amount: amount });
    }

    confirmButton.addEventListener("click", function () {
        if (!token) {
            show("invalid");
            return;
        }

        confirmButton.disabled = true;
        show("working");
        var language = "az";
        window.AEROVA_API.post("api/bookings/cancel-confirm", { token: token, language: language }).then(function (booking) {
            state.pnr = booking.pnr;
            state.refund = refundSentence(booking.cancellation);
            token = "";
            show("done");
        }).catch(function (error) {
            var reason = error && error.status === 422 ? error.code : "";
            if (reason === "link_confirmed") {
                state.pnr = "";
                state.refund = "";
                token = "";
                show("done");
                message.textContent = tr("cancellation.confirmAlready", "Bu rezervasiya artıq ləğv edilib. Refund statusuna Səyahətlərim bölməsindən baxın.");
            } else if (reason === "link_expired") {
                show("expired");
            } else if (reason === "link_used") {
                show("used");
            } else if (error && (error.status === 409 || error.status === 422 && reason !== "link_invalid")) {
                show("blocked");
                if (error.userMessage) message.textContent = error.userMessage;
            } else if (error && error.status === 422) {
                show("invalid");
            } else {
                show("error");
            }
        });
    });

    token = takeToken();
    if (!token) {
        show("invalid");
    } else {
        paint();
    }
})();
