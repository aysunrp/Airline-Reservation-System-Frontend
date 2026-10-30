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
    var live = null;
    var openMessageCount = 0;
    var toastTimer = null;

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

    function formatDate(value) {
        var text = String(value || "");
        var date = new Date(/(Z|[+-]\d\d:?\d\d)$/i.test(text) ? text : text + "Z");
        if (isNaN(date.getTime())) return "";
        function pad(n) { return n < 10 ? "0" + n : String(n); }
        var clock = pad(date.getHours()) + ":" + pad(date.getMinutes());
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
        if (error && error.code === "database_setup_required") return tr("support.setupRequired", "Dəstək müraciətləri hələ əlçatan deyil: saytın verilənlər bazası qurulması bitməyib. Zəhmət olmasa bir az sonra yenidən cəhd edin; sayt administratoru son verilənlər bazası yenilənməsini tətbiq etməlidir.");
        if (error && error.status === 429) return tr("support.busy", "Çox sayda sorğu göndərildi. Bir az gözləyib yenidən cəhd edin.");
        if (error && error.code === "too_many_open_tickets") return tr("support.tooMany", "Çox sayda açıq müraciətiniz var. Zəhmət olmasa bir qisminin həllini gözləyin.");
        if (error && error.status === 400 && error.userMessage) return error.userMessage;
        if (error && error.status === 409) return tr("support.resolvedNote", "Bu müraciət həll olunub. Hələ də köməyə ehtiyacınız varsa, yeni müraciət göndərin.");
        if (error && error.status === 404) return tr("support.notFound", "Bu müraciət tapılmadı.");
        if (error && error.status === 401) return tr("support.signInPrompt", "Müraciət göndərmək və cavabları izləmək üçün daxil olun.");
        if (error && !error.status) return error.userMessage || tr("support.unreachable", "Serverə qoşula bilmədik. Zəhmət olmasa bir az sonra yenidən cəhd edin.");
        return tr(fallbackKey, fallback);
    }

    /* ---------- contact options ---------- */

    function loadInfo() {
        api.get("api/support/info").then(function (info) {
            if (info && info.contactEmail) {
                var line = $("sp-contact-email");
                line.innerHTML = escapeHtml(tr("support.contactEmail", "E-poçt")) + ': <a href="mailto:' + escapeHtml(info.contactEmail) + '">' + escapeHtml(info.contactEmail) + "</a>";
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

        if (!subject) { fieldError("sp-subject-error", tr("support.errors.subjectRequired", "Zəhmət olmasa mövzu başlığı yazın.")); ok = false; }
        else if (subject.length > 120) { fieldError("sp-subject-error", tr("support.errors.subjectLong", "Mövzu başlığı ən çox 120 simvol ola bilər.")); ok = false; }
        if (message.length < 10) { fieldError("sp-message-error", tr("support.errors.messageShort", "Zəhmət olmasa problemi bir neçə sözlə izah edin (ən azı 10 simvol).")); ok = false; }
        else if (message.length > 4000) { fieldError("sp-message-error", tr("support.errors.messageLong", "Mesaj ən çox 4000 simvol ola bilər.")); ok = false; }
        if (pnr && !/^[A-Za-z0-9]{5,10}$/.test(pnr)) { fieldError("sp-pnr-error", tr("support.errors.pnrInvalid", "Rezervasiya kodu 5-10 hərf və rəqəmdən ibarətdir.")); ok = false; }
        return ok;
    }

    function submitForm(event) {
        event.preventDefault();
        var button = $("sp-submit");
        if (button.disabled || !validate()) return;

        button.disabled = true;
        button.textContent = tr("support.sending", "Göndərilir...");
        setFeedback($("sp-feedback"), "");

        api.post("api/support/tickets", {
            category: $("sp-category").value,
            subject: $("sp-subject").value.trim(),
            message: $("sp-message").value.trim(),
            bookingPnr: $("sp-pnr").value.trim() || null
        }).then(function (ticket) {
            button.disabled = false;
            button.textContent = tr("support.submit", "Müraciəti göndər");
            $("sp-subject").value = "";
            $("sp-message").value = "";
            $("sp-pnr").value = "";
            setFeedback($("sp-feedback"), tr("support.success", "{number} nömrəli müraciətiniz qəbul edildi. Yazışmanı \"Mənim dəstək müraciətlərim\" bölməsində tapacaqsınız; yenilikləri həm də hesabınızın e-poçt ünvanına göndəririk.", { number: ticket.ticketNumber }), false);
            loadList().then(function () { openTicket(ticket.id); });
        }, function (error) {
            button.disabled = false;
            button.textContent = tr("support.submit", "Müraciəti göndər");
            setFeedback($("sp-feedback"), errorText(error, "support.failed", "Müraciətinizi göndərə bilmədik. Zəhmət olmasa yenidən cəhd edin."), true);
        });
    }

    /* ---------- my requests ---------- */

    function loadList(quiet) {
        if (!quiet) $("sp-requests-state").textContent = tr("support.loading", "Yüklənir...");
        return api.get("api/support/tickets").then(function (list) {
            $("sp-requests-state").textContent = list.length ? "" : tr("support.myEmpty", "Hələ heç bir dəstək müraciəti göndərməmisiniz.");
            $("sp-list").innerHTML = list.map(function (ticket) {
                return '<button type="button" class="sp-ticket" data-ticket="' + ticket.id + '">' +
                    '<span><span class="sp-ticket-subject">' + escapeHtml(ticket.subject) + '</span><br><span class="sp-ticket-number">' + escapeHtml(ticket.ticketNumber) + "</span></span>" +
                    '<span class="sp-badge sp-badge--' + escapeHtml(ticket.status) + '">' + escapeHtml(statusText(ticket.status)) + "</span>" +
                    '<span class="sp-ticket-meta"><span>' + escapeHtml(categoryText(ticket.category)) + "</span>" +
                    "<span>" + escapeHtml(tr("support.created", "Yaradılıb")) + ": " + escapeHtml(formatDate(ticket.createdAt)) + "</span>" +
                    "<span>" + escapeHtml(tr("support.updated", "Yenilənib")) + ": " + escapeHtml(formatDate(ticket.updatedAt)) + "</span></span></button>";
            }).join("");
        }, function (error) {
            if (!quiet) $("sp-requests-state").textContent = errorText(error, "support.loadFailed", "Müraciətlərinizi yükləyə bilmədik.");
        });
    }

    function renderThread(ticket) {
        var previous = openMessageCount;
        $("sp-detail-title").textContent = ticket.subject;
        var badge = $("sp-detail-status");
        badge.className = "sp-badge sp-badge--" + ticket.status;
        badge.textContent = statusText(ticket.status);
        $("sp-detail-meta").textContent = ticket.ticketNumber + " \u00b7 " + categoryText(ticket.category) +
            (ticket.bookingPnr ? " \u00b7 " + tr("support.pnrShort", "Rezervasiya") + " " + ticket.bookingPnr : "") +
            " \u00b7 " + tr("support.created", "Yaradılıb") + ": " + formatDate(ticket.createdAt);
        $("sp-thread").innerHTML = ticket.messages.map(function (message) {
            var staff = message.authorType === "Staff";
            return '<div class="sp-msg sp-msg--' + (staff ? "staff" : "customer") + '"><div class="sp-msg-head"><strong>' +
                escapeHtml(staff ? tr("support.staff", "AEROVA Dəstək") : tr("support.you", "Siz")) + "</strong><span>" + escapeHtml(formatDate(message.createdAt)) +
                '</span></div><div class="sp-msg-body">' + escapeHtml(message.body) + "</div></div>";
        }).join("");
        // A message that arrived while the conversation was open is marked for a moment; a draft in the reply box is kept.
        var bubbles = $("sp-thread").querySelectorAll(".sp-msg");
        if (previous > 0) {
            for (var i = previous; i < bubbles.length; i += 1) bubbles[i].classList.add("sp-msg--new");
        }
        openMessageCount = ticket.messages.length;
        show($("sp-reply-form"), ticket.canReply);
        show($("sp-resolved"), !ticket.canReply);
        setFeedback($("sp-reply-feedback"), "");
    }

    /* ---------- live updates ---------- */

    function showToast(text, ticketId) {
        $("sp-toast-text").textContent = text;
        $("sp-toast-open").setAttribute("data-ticket", String(ticketId));
        show($("sp-toast"), true);
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { show($("sp-toast"), false); }, 9000);
    }

    function paintLive(state) {
        var line = $("sp-live");
        var texts = {
            connected: tr("support.live.on", "Canlı yeniləmələr aktivdir: yeni cavablar burada özləri görünür."),
            reconnecting: tr("support.live.reconnecting", "Yenidən qoşulur... bu arada yeni cavablar hər 20 saniyədən bir yoxlanılır."),
            polling: tr("support.live.polling", "Canlı bağlantı əlçatan deyil: yeni cavablar hər 20 saniyədən bir yoxlanılır.")
        };
        line.className = "sp-live is-" + state;
        line.textContent = texts[state] || "";
        show(line, Boolean(texts[state]));
    }

    function refreshOpen() {
        if (openId === null) return;
        var id = openId;
        api.get("api/support/tickets/" + encodeURIComponent(id)).then(function (ticket) {
            if (openId === id) renderThread(ticket);
        }, function () { /* the next event or poll tries again */ });
    }

    /* Everything on the page is read again: after a reconnect, and on every poll. */
    function refreshAll() {
        loadList(true);
        refreshOpen();
        window.dispatchEvent(new CustomEvent("aerova:notificationschange"));
    }

    function onLiveEvent(event) {
        var number = event.ticketNumber;
        var text = event.type === "staffReplied"
            ? tr("support.toast.reply", "{number} üzrə yeni cavab", { number: number })
            : tr("support.toast.status", "{number} indi: {status}", { number: number, status: statusText(event.status) });
        showToast(text, event.ticketId);
        loadList(true);
        if (openId === event.ticketId) refreshOpen();
        // The persisted notification is behind the badge of the account menu.
        window.dispatchEvent(new CustomEvent("aerova:notificationschange"));
    }

    function startLive() {
        if (live || !window.AEROVA_REALTIME) return;
        live = window.AEROVA_REALTIME.create({ onEvent: onLiveEvent, onState: paintLive, poll: refreshAll, onResync: refreshAll, pollMs: 20000 });
        live.start();
    }

    function openTicket(id) {
        openId = id;
        openMessageCount = 0;
        api.get("api/support/tickets/" + encodeURIComponent(id)).then(function (ticket) {
            renderThread(ticket);
            show($("sp-list"), false);
            show($("sp-detail"), true);
            $("sp-detail").scrollIntoView({ behavior: "smooth", block: "start" });
        }, function (error) {
            $("sp-requests-state").textContent = errorText(error, "support.loadFailed", "Müraciətlərinizi yükləyə bilmədik.");
        });
    }

    function submitReply(event) {
        event.preventDefault();
        var button = $("sp-reply-submit");
        var text = $("sp-reply").value.trim();
        $("sp-reply-error").hidden = true;
        if (button.disabled || openId === null) return;
        if (!text) { $("sp-reply-error").textContent = tr("support.errors.replyRequired", "Zəhmət olmasa cavabınızı yazın."); $("sp-reply-error").hidden = false; return; }

        button.disabled = true;
        button.textContent = tr("support.sending", "Göndərilir...");
        api.post("api/support/tickets/" + encodeURIComponent(openId) + "/replies", { message: text }).then(function (ticket) {
            button.disabled = false;
            button.textContent = tr("support.sendReply", "Cavabı göndər");
            $("sp-reply").value = "";
            renderThread(ticket);
            loadList();
        }, function (error) {
            button.disabled = false;
            button.textContent = tr("support.sendReply", "Cavabı göndər");
            setFeedback($("sp-reply-feedback"), errorText(error, "support.replyFailed", "Cavabınızı göndərə bilmədik. Zəhmət olmasa yenidən cəhd edin."), true);
            if (error && error.status === 409) {
                show($("sp-reply-form"), false);
                show($("sp-resolved"), true);
            }
        });
    }

    function backToList() {
        openId = null;
        openMessageCount = 0;
        show($("sp-detail"), false);
        show($("sp-list"), true);
        loadList();
    }

    /* ---------- start ---------- */

    function start() {
        loadInfo();

        if (!api.session.isActive()) {
            show($("sp-signin"), true);
            $("sp-requests-state").textContent = tr("support.signInPrompt", "Müraciət göndərmək və cavabları izləmək üçün daxil olun.");
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
            // A notification links straight to its conversation: support.html?ticket=ID.
            var wanted = Number(new URLSearchParams(window.location.search).get("ticket"));
            if (wanted > 0) {
                openTicket(wanted);
                return;
            }
            if (window.location.hash === "#requests") {
                var section = $("requests");
                if (section) section.scrollIntoView();
            }
        });
        startLive();
    }

    $("sp-form").addEventListener("submit", submitForm);
    $("sp-reply-form").addEventListener("submit", submitReply);
    $("sp-back").addEventListener("click", backToList);
    $("sp-toast-close").addEventListener("click", function () { show($("sp-toast"), false); });
    $("sp-toast-open").addEventListener("click", function () {
        show($("sp-toast"), false);
        var id = Number($("sp-toast-open").getAttribute("data-ticket"));
        if (id) openTicket(id);
    });
    $("sp-list").addEventListener("click", function (event) {
        var button = event.target.closest("[data-ticket]");
        if (button) openTicket(Number(button.getAttribute("data-ticket")));
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
