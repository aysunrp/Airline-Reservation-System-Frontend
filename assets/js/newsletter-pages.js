/*
 * The two pages the newsletter e-mails open: newsletter-confirm.html (activates the subscription) and newsletter-unsubscribe.html
 * (opts out). The token in the link goes to the API in the request body, is removed from the address bar, and is never stored or logged.
 */
(function () {
    "use strict";

    var body = document.body;
    var mode = body.getAttribute("data-newsletter-mode");
    var status = document.getElementById("news-status");
    var title = document.getElementById("news-title");
    var message = document.getElementById("news-message");
    var form = document.getElementById("news-again");
    var emailInput = document.getElementById("news-email");
    var emailError = document.getElementById("news-email-error");
    var againButton = document.getElementById("news-again-button");
    var feedback = document.getElementById("news-feedback");
    var unsubscribeButton = document.getElementById("news-confirm-unsubscribe");
    var home = document.getElementById("news-home");
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!mode || !status || !window.AEROVA_API) {
        return;
    }

    function say(key, fallback) {
        var value = typeof window.t === "function" ? window.t(key) : null;
        return value && value !== key ? value : fallback;
    }

    var token = new URLSearchParams(window.location.search).get("token") || "";
    // The link is spent from the address bar at once, so it is not left in the history or shown over a shoulder.
    try {
        window.history.replaceState(null, "", window.location.pathname);
    } catch (error) {
        // Not essential.
    }

    var state = { name: "", key: "" };

    function setState(name, titleKey, titleFallback, messageKey, messageFallback) {
        state = { name: name, titleKey: titleKey, titleFallback: titleFallback, messageKey: messageKey, messageFallback: messageFallback };
        paint();
    }

    function paint() {
        status.setAttribute("data-state", state.name);
        status.setAttribute("aria-busy", state.name === "loading" ? "true" : "false");
        title.textContent = say(state.titleKey, state.titleFallback);
        message.textContent = say(state.messageKey, state.messageFallback);
        document.title = "AEROVA | " + title.textContent;
    }

    function showFeedback(text) {
        feedback.textContent = text;
        feedback.hidden = !text;
    }

    /* ---- confirm ---- */

    function failedConfirmation(error) {
        var code = error && error.code;
        var expired = code === "link_expired";
        var unreachable = !error || !error.status;

        if (unreachable) {
            setState("error", "newsletter.errorTitle", "Abunəliyi təsdiqləmək alınmadı", "newsletter.unreachable", "Serverə qoşula bilmədik. Zəhmət olmasa bir az sonra yenidən cəhd edin.");
            home.hidden = false;
            return;
        }

        if (error.status === 429) {
            setState("error", "newsletter.errorTitle", "Abunəliyi təsdiqləmək alınmadı", "newsletter.busy", "Çox sayda sorğu göndərildi. Bir az gözləyib yenidən cəhd edin.");
            home.hidden = false;
            return;
        }

        setState("error", expired ? "newsletter.expiredTitle" : "newsletter.invalidTitle", expired ? "Bu keçidin vaxtı bitib" : "Keçid etibarsızdır",
            "newsletter.invalidText", "Təsdiq keçidi etibarsızdır və ya müddəti bitib. E-poçt ünvanınızı daxil edin, yeni keçid göndərək.");
        form.hidden = false;
        home.hidden = false;
    }

    function confirm() {
        if (!token) {
            failedConfirmation({ status: 422, code: "link_invalid" });
            return;
        }

        setState("loading", "newsletter.confirmingTitle", "Abunəliyiniz təsdiqlənir", "newsletter.confirming", "Bir anlıq...");

        window.AEROVA_API.post("api/newsletter/confirm", { token: token }).then(function () {
            setState("success", "newsletter.confirmedTitle", "Abunəlik təsdiqləndi", "newsletter.confirmed", "Abunəliyiniz təsdiqləndi. AEROVA yeniliklərini alacaqsınız.");
            home.hidden = false;
        }, failedConfirmation);
    }

    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            emailError.hidden = true;
            var email = emailInput.value.trim();

            if (!emailPattern.test(email)) {
                emailError.textContent = say("home.newsletterError", "Zəhmət olmasa düzgün e-poçt ünvanı daxil edin.");
                emailError.hidden = false;
                return;
            }

            againButton.disabled = true;
            showFeedback("");

            window.AEROVA_API.post("api/newsletter/subscribe", { email: email, language: "az" }).then(function () {
                form.hidden = true;
                showFeedback(say("newsletter.sentAgain", "Yeni təsdiq linki e-poçt ünvanınıza göndərildi."));
            }, function (error) {
                againButton.disabled = false;
                var text = error && error.status === 503
                    ? say("newsletter.unavailable", "E-poçtu hazırda göndərə bilmirik. Zəhmət olmasa bir az sonra yenidən cəhd edin.")
                    : error && error.status === 429
                        ? say("newsletter.busy", "Çox sayda sorğu göndərildi. Bir az gözləyib yenidən cəhd edin.")
                        : say("newsletter.unreachable", "Serverə qoşula bilmədik. Zəhmət olmasa bir az sonra yenidən cəhd edin.");
                showFeedback(text);
            });
        });
    }

    /* ---- unsubscribe (opts out only after the person presses the button, so a mail scanner that opens links changes nothing) ---- */

    function unsubscribeReady() {
        if (!token) {
            setState("error", "newsletter.invalidTitle", "Keçid etibarsızdır", "newsletter.unsubscribeInvalid", "Bu abunəlikdən çıxma keçidi etibarsızdır.");
            home.hidden = false;
            return;
        }

        setState("mail", "newsletter.unsubscribeTitle", "AEROVA yeniliklərindən çıxın", "newsletter.unsubscribeText", "Bu ünvana AEROVA yeniliklərinin gəlməsini dayandırmaq üçün düyməyə basın.");
        unsubscribeButton.hidden = false;
    }

    if (unsubscribeButton) {
        unsubscribeButton.addEventListener("click", function () {
            unsubscribeButton.disabled = true;
            showFeedback("");
            setState("loading", "newsletter.unsubscribingTitle", "Abunəlikdən çıxılır", "newsletter.confirming", "Bir anlıq...");

            window.AEROVA_API.post("api/newsletter/unsubscribe", { token: token }).then(function () {
                unsubscribeButton.hidden = true;
                setState("success", "newsletter.unsubscribedTitle", "Abunəlikdən çıxdınız", "newsletter.unsubscribed", "Bu ünvana artıq AEROVA yenilikləri göndərilməyəcək. İstədiyiniz vaxt yenidən abunə ola bilərsiniz.");
                home.hidden = false;
            }, function (error) {
                unsubscribeButton.disabled = false;
                unsubscribeButton.hidden = false;
                if (error && error.status === 422) {
                    unsubscribeButton.hidden = true;
                    setState("error", "newsletter.invalidTitle", "Keçid etibarsızdır", "newsletter.unsubscribeInvalid", "Bu abunəlikdən çıxma keçidi etibarsızdır.");
                    home.hidden = false;
                    return;
                }

                setState("mail", "newsletter.unsubscribeTitle", "AEROVA yeniliklərindən çıxın", "newsletter.unsubscribeText", "Bu ünvana AEROVA yeniliklərinin gəlməsini dayandırmaq üçün düyməyə basın.");
                showFeedback(error && error.status === 429
                    ? say("newsletter.busy", "Çox sayda sorğu göndərildi. Bir az gözləyib yenidən cəhd edin.")
                    : say("newsletter.unreachable", "Serverə qoşula bilmədik. Zəhmət olmasa bir az sonra yenidən cəhd edin."));
            });
        });
    }


    if (mode === "confirm") {
        confirm();
    } else {
        unsubscribeReady();
    }
})();
