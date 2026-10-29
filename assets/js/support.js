/*
 * The Support Center: contact options (GET api/support/info), the form that opens a request (POST api/support/tickets), the signed-in
 * customer's own requests and their conversation (GET api/support/tickets, GET api/support/tickets/{id}), and replies.
 * The account is the one in the sign-in token; nothing here sends a user id. The page never says an e-mail was delivered: e-mails go out in
 * the background and the answers are always found here.
 */
(function () {
    "use strict";

    var api = window.AEROVA_API;
    if (!api) {
        return;
    }

    var CATEGORIES = ["Booking", "Payment", "CancellationRefund", "FlightChange", "Baggage", "Account", "WebsiteProblem", "Other"];
    var openId = null;

    function $(id) { return document.getElementById(id); }

    function tr(key, fallback, vars) {
        if (typeof window.t === "function") {
            var value = window.t(key, vars);
            if (value && value !== key) return value;
        }
        return String(fallback).replace(/\{(\w+)\}/g, function (_, k) { return vars && vars[k] != null ? String(vars[k]) : "{" + k + "}"; });
    }

    function escapeHtml(value) {
        return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function language() {
        var i18n = window.AEROVA_I18N;
        return i18n && typeof i18n.getLanguage === "function" ? i18n.getLanguage() : "en";
    }

    function formatDate(value) {
        var text = String(value || "");
        var date = new Date(/(Z|[+-]\d\d:?\d\d)$/i.test(text) ? text : text + "Z");
        if (isNaN(date.getTime())) return "";
        function pad(n) { return n < 10 ? "0" + n : String(n); }
        var clock = pad(date.getHours()) + ":" + pad(date.getMinutes());
        if (language() === "en") {
            try {
                return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) + ", " + clock;
            } catch (error) {
                // falls through to the numeric form
            }
        }
        return pad(date.getDate()) + "." + pad(date.getMonth() + 1) + "." + date.getFullYear() + " " + clock;
    }

    function categoryText(value) { return tr("support.categories." + value, value); }
    function statusText(value) { return tr("support.status." + value, value); }

    function show(el, visible) { el.hidden = !visible; }

    function setFeedback(el, text, isError) {
        el.textContent = text || "";
        el.hidden = !text;
        el.classList.toggle("is-error", Boolean(isError));
    }

    function errorText(error, fallbackKey, fallback) {
        if (error && error.code === "database_setup_required") return tr("support.setupRequired", "Support requests are not available yet: the database setup of the site is not finished. Please try again later; the site administrator has to apply the latest database update.");
        if (error && error.status === 429) return tr("support.busy", "Too many requests. Please wait a moment and try again.");
        if (error && error.code === "too_many_open_tickets") return tr("support.tooMany", "You have too many open requests. Please wait for some of them to be resolved.");
        if (error && error.status === 400 && error.userMessage) return error.userMessage;
        if (error && error.status === 409) return tr("support.resolvedNote", "This request is resolved. If you still need help, send a new request.");
        if (error && error.status === 404) return tr("support.notFound", "This request was not found.");
        if (error && error.status === 401) return tr("support.signInPrompt", "Sign in to send a request and follow the answers.");
        if (error && !error.status) return error.userMessage || tr("support.unreachable", "We could not reach the server. Please try again in a moment.");
        return tr(fallbackKey, fallback);
    }

    /* ---------- contact options ---------- */

    function loadInfo() {
        api.get("api/support/info").then(function (info) {
            if (info && info.contactEmail) {
                var line = $("sp-contact-email");
                line.innerHTML = escapeHtml(tr("support.contactEmail", "Email")) + ': <a href="mailto:' + escapeHtml(info.contactEmail) + '">' + escapeHtml(info.contactEmail) + "</a>";
                show(line, true);
            }
        }, function () { /* the form works without it */ });
    }

    /* ---------- the form ---------- */

    function clearErrors() {
        ["sp-subject-error", "sp-message-error", "sp-pnr-error"].forEach(function (id) { $(id).hidden = true; });
    }

    function fieldError(id, text) {
        $(id).textContent = text;
        $(id).hidden = false;
    }

    function validate() {
        clearErrors();
        var ok = true;
        var subject = $("sp-subject").value.trim();
        var message = $("sp-message").value.trim();
        var pnr = $("sp-pnr").value.trim();

        if (!subject) { fieldError("sp-subject-error", tr("support.errors.subjectRequired", "Please enter a subject.")); ok = false; }
        else if (subject.length > 120) { fieldError("sp-subject-error", tr("support.errors.subjectLong", "The subject can have at most 120 characters.")); ok = false; }
        if (message.length < 10) { fieldError("sp-message-error", tr("support.errors.messageShort", "Please describe the problem in a few words (at least 10 characters).")); ok = false; }
        else if (message.length > 4000) { fieldError("sp-message-error", tr("support.errors.messageLong", "The message can have at most 4000 characters.")); ok = false; }
        if (pnr && !/^[A-Za-z0-9]{5,10}$/.test(pnr)) { fieldError("sp-pnr-error", tr("support.errors.pnrInvalid", "A booking reference has 5 to 10 letters and digits.")); ok = false; }
        return ok;
    }

    function submitForm(event) {
        event.preventDefault();
        var button = $("sp-submit");
        if (button.disabled || !validate()) return;

        button.disabled = true;
        button.textContent = tr("support.sending", "Sending...");
        setFeedback($("sp-feedback"), "");

        api.post("api/support/tickets", {
            category: $("sp-category").value,
            subject: $("sp-subject").value.trim(),
            message: $("sp-message").value.trim(),
            bookingPnr: $("sp-pnr").value.trim() || null
        }).then(function (ticket) {
            button.disabled = false;
            button.textContent = tr("support.submit", "Send request");
            $("sp-subject").value = "";
            $("sp-message").value = "";
            $("sp-pnr").value = "";
            setFeedback($("sp-feedback"), tr("support.success", "Your request {number} was received. You will find the conversation under My Support Requests; we also email updates to your account address.", { number: ticket.ticketNumber }), false);
            loadList().then(function () { openTicket(ticket.id); });
        }, function (error) {
            button.disabled = false;
            button.textContent = tr("support.submit", "Send request");
            setFeedback($("sp-feedback"), errorText(error, "support.failed", "We could not send your request. Please try again."), true);
        });
    }

    /* ---------- my requests ---------- */

    function loadList() {
        $("sp-requests-state").textContent = tr("support.loading", "Loading...");
        return api.get("api/support/tickets").then(function (list) {
            $("sp-requests-state").textContent = list.length ? "" : tr("support.myEmpty", "You have not sent any support requests yet.");
            $("sp-list").innerHTML = list.map(function (ticket) {
                return '<button type="button" class="sp-ticket" data-ticket="' + ticket.id + '">' +
                    '<span><span class="sp-ticket-subject">' + escapeHtml(ticket.subject) + '</span><br><span class="sp-ticket-number">' + escapeHtml(ticket.ticketNumber) + "</span></span>" +
                    '<span class="sp-badge sp-badge--' + escapeHtml(ticket.status) + '">' + escapeHtml(statusText(ticket.status)) + "</span>" +
                    '<span class="sp-ticket-meta"><span>' + escapeHtml(categoryText(ticket.category)) + "</span>" +
                    "<span>" + escapeHtml(tr("support.created", "Created")) + ": " + escapeHtml(formatDate(ticket.createdAt)) + "</span>" +
                    "<span>" + escapeHtml(tr("support.updated", "Updated")) + ": " + escapeHtml(formatDate(ticket.updatedAt)) + "</span></span></button>";
            }).join("");
        }, function (error) {
            $("sp-requests-state").textContent = errorText(error, "support.loadFailed", "We could not load your requests.");
        });
    }

    function renderThread(ticket) {
        $("sp-detail-title").textContent = ticket.subject;
        var badge = $("sp-detail-status");
        badge.className = "sp-badge sp-badge--" + ticket.status;
        badge.textContent = statusText(ticket.status);
        $("sp-detail-meta").textContent = ticket.ticketNumber + " \u00b7 " + categoryText(ticket.category) +
            (ticket.bookingPnr ? " \u00b7 " + tr("support.pnrShort", "Booking") + " " + ticket.bookingPnr : "") +
            " \u00b7 " + tr("support.created", "Created") + ": " + formatDate(ticket.createdAt);
        $("sp-thread").innerHTML = ticket.messages.map(function (message) {
            var staff = message.authorType === "Staff";
            return '<div class="sp-msg sp-msg--' + (staff ? "staff" : "customer") + '"><div class="sp-msg-head"><strong>' +
                escapeHtml(staff ? tr("support.staff", "AEROVA Support") : tr("support.you", "You")) + "</strong><span>" + escapeHtml(formatDate(message.createdAt)) +
                '</span></div><div class="sp-msg-body">' + escapeHtml(message.body) + "</div></div>";
        }).join("");
        show($("sp-reply-form"), ticket.canReply);
        show($("sp-resolved"), !ticket.canReply);
        setFeedback($("sp-reply-feedback"), "");
    }

    function openTicket(id) {
        openId = id;
        api.get("api/support/tickets/" + encodeURIComponent(id)).then(function (ticket) {
            renderThread(ticket);
            show($("sp-list"), false);
            show($("sp-detail"), true);
            $("sp-detail").scrollIntoView({ behavior: "smooth", block: "start" });
        }, function (error) {
            $("sp-requests-state").textContent = errorText(error, "support.loadFailed", "We could not load your requests.");
        });
    }

    function submitReply(event) {
        event.preventDefault();
        var button = $("sp-reply-submit");
        var text = $("sp-reply").value.trim();
        $("sp-reply-error").hidden = true;
        if (button.disabled || openId === null) return;
        if (!text) { $("sp-reply-error").textContent = tr("support.errors.replyRequired", "Please write your reply."); $("sp-reply-error").hidden = false; return; }

        button.disabled = true;
        button.textContent = tr("support.sending", "Sending...");
        api.post("api/support/tickets/" + encodeURIComponent(openId) + "/replies", { message: text }).then(function (ticket) {
            button.disabled = false;
            button.textContent = tr("support.sendReply", "Send reply");
            $("sp-reply").value = "";
            renderThread(ticket);
            loadList();
        }, function (error) {
            button.disabled = false;
            button.textContent = tr("support.sendReply", "Send reply");
            setFeedback($("sp-reply-feedback"), errorText(error, "support.replyFailed", "We could not send your reply. Please try again."), true);
            if (error && error.status === 409) {
                show($("sp-reply-form"), false);
                show($("sp-resolved"), true);
            }
        });
    }

    function backToList() {
        openId = null;
        show($("sp-detail"), false);
        show($("sp-list"), true);
        loadList();
    }

    /* ---------- start ---------- */

    function start() {
        loadInfo();

        if (!api.session.isActive()) {
            show($("sp-signin"), true);
            $("sp-requests-state").textContent = tr("support.signInPrompt", "Sign in to send a request and follow the answers.");
            return;
        }

        show($("sp-form"), true);
        // Name and e-mail come from the signed-in account (GET api/profile answers for the token's account only).
        api.get("api/profile").then(function (profile) {
            $("sp-name").value = ((profile.firstName || "") + " " + (profile.lastName || "")).trim();
            $("sp-email").value = profile.email || "";
        }, function (error) {
            if (error && error.status === 401) {
                show($("sp-form"), false);
                show($("sp-signin"), true);
            }
        });
        loadList().then(function () {
            if (window.location.hash === "#requests") {
                var section = $("requests");
                if (section) section.scrollIntoView();
            }
        });
    }

    $("sp-form").addEventListener("submit", submitForm);
    $("sp-reply-form").addEventListener("submit", submitReply);
    $("sp-back").addEventListener("click", backToList);
    $("sp-list").addEventListener("click", function (event) {
        var button = event.target.closest("[data-ticket]");
        if (button) openTicket(Number(button.getAttribute("data-ticket")));
    });
    window.addEventListener("aerova:languagechange", function () {
        if (api.session.isActive()) loadList();
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
