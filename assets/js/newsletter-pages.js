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

    function language() {
        var i18n = window.AEROVA_I18N;
        return i18n && typeof i18n.getLanguage === "function" ? i18n.getLanguage() : "en";
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
            setState("error", "newsletter.errorTitle", "We could not confirm your subscription", "newsletter.unreachable", "We could not reach the server. Please try again in a moment.");
            home.hidden = false;
            return;
        }

        if (error.status === 429) {
            setState("error", "newsletter.errorTitle", "We could not confirm your subscription", "newsletter.busy", "Too many requests. Please wait a moment and try again.");
            home.hidden = false;
            return;
        }

        setState("error", expired ? "newsletter.expiredTitle" : "newsletter.invalidTitle", expired ? "This link has expired" : "This link is not valid",
            "newsletter.invalidText", "The confirmation link is invalid or has expired. Enter your email address and we will send a new one.");
        form.hidden = false;
        home.hidden = false;
    }

    function confirm() {
        if (!token) {
            failedConfirmation({ status: 422, code: "link_invalid" });
            return;
        }

        setState("loading", "newsletter.confirmingTitle", "Confirming your subscription", "newsletter.confirming", "One moment...");

        window.AEROVA_API.post("api/newsletter/confirm", { token: token }).then(function () {
            setState("success", "newsletter.confirmedTitle", "Subscription confirmed", "newsletter.confirmed", "Your subscription is confirmed. You will receive AEROVA news.");
            home.hidden = false;
        }, failedConfirmation);
    }

    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            emailError.hidden = true;
            var email = emailInput.value.trim();

            if (!emailPattern.test(email)) {
                emailError.textContent = say("home.newsletterError", "Please enter a valid email address.");
                emailError.hidden = false;
                return;
            }

            againButton.disabled = true;
            showFeedback("");

            window.AEROVA_API.post("api/newsletter/subscribe", { email: email, language: language() }).then(function () {
                form.hidden = true;
                showFeedback(say("newsletter.sentAgain", "A new confirmation link was sent to your email address."));
            }, function (error) {
                againButton.disabled = false;
                var text = error && error.status === 503
                    ? say("newsletter.unavailable", "We cannot send the e-mail right now. Please try again later.")
                    : error && error.status === 429
                        ? say("newsletter.busy", "Too many requests. Please wait a moment and try again.")
                        : say("newsletter.unreachable", "We could not reach the server. Please try again in a moment.");
                showFeedback(text);
            });
        });
    }

    /* ---- unsubscribe (opts out only after the person presses the button, so a mail scanner that opens links changes nothing) ---- */

    function unsubscribeReady() {
        if (!token) {
            setState("error", "newsletter.invalidTitle", "This link is not valid", "newsletter.unsubscribeInvalid", "This unsubscribe link is not valid.");
            home.hidden = false;
            return;
        }

        setState("mail", "newsletter.unsubscribeTitle", "Unsubscribe from AEROVA news", "newsletter.unsubscribeText", "Press the button to stop receiving AEROVA news at this address.");
        unsubscribeButton.hidden = false;
    }

    if (unsubscribeButton) {
        unsubscribeButton.addEventListener("click", function () {
            unsubscribeButton.disabled = true;
            showFeedback("");
            setState("loading", "newsletter.unsubscribingTitle", "Unsubscribing", "newsletter.confirming", "One moment...");

            window.AEROVA_API.post("api/newsletter/unsubscribe", { token: token }).then(function () {
                unsubscribeButton.hidden = true;
                setState("success", "newsletter.unsubscribedTitle", "You are unsubscribed", "newsletter.unsubscribed", "You will not receive AEROVA news at this address any more. You can subscribe again at any time.");
                home.hidden = false;
            }, function (error) {
                unsubscribeButton.disabled = false;
                unsubscribeButton.hidden = false;
                if (error && error.status === 422) {
                    unsubscribeButton.hidden = true;
                    setState("error", "newsletter.invalidTitle", "This link is not valid", "newsletter.unsubscribeInvalid", "This unsubscribe link is not valid.");
                    home.hidden = false;
                    return;
                }

                setState("mail", "newsletter.unsubscribeTitle", "Unsubscribe from AEROVA news", "newsletter.unsubscribeText", "Press the button to stop receiving AEROVA news at this address.");
                showFeedback(error && error.status === 429
                    ? say("newsletter.busy", "Too many requests. Please wait a moment and try again.")
                    : say("newsletter.unreachable", "We could not reach the server. Please try again in a moment."));
            });
        });
    }

    window.addEventListener("aerova:languagechange", paint);

    if (mode === "confirm") {
        confirm();
    } else {
        unsubscribeReady();
    }
})();
