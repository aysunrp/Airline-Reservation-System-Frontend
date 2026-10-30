/*
 * Notifications of the signed-in user, from GET api/notifications. Needs api-client.js and auth.js.
 * Reading, "mark all as read", "clear" and the unread badge in the account menu all go through the API.
 * The titles are translated here by notification type. The message text is written by the backend in English from fixed
 * sentences; each one is recognised below and shown again in the page language with the same values (booking reference,
 * amount, flight...). A sentence that is not recognised is shown as the backend wrote it.
 */
(function () {
    "use strict";

    var notifications = [];
    var expandedIds = {};
    var loadToken = 0;

    function tr(key, fallback, vars) {
        if (typeof window.t === "function") {
            var value = window.t(key, vars);
            if (value && value !== key) return value;
        }
        return fallback;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function showMessage(text) {
        var message = document.getElementById("notifications-message");
        if (!message) {
            return;
        }

        message.textContent = text || "";
        message.hidden = !text;
    }

    /* API timestamps are UTC and may come without the "Z"; they are shown on the visitor's own clock. */
    function formatDateTime(value) {
        var text = String(value || "");
        var date = new Date(/(Z|[+-]\d\d:?\d\d)$/i.test(text) ? text : text + "Z");
        if (!text || isNaN(date.getTime())) {
            return "—";
        }

        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return date.getDate() + " " + months[date.getMonth()] + " " + date.getFullYear() + " · " +
            String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
    }

    var TYPES = {
        BookingConfirmed: { icon: "✓", titleKey: "notifications.confirmedTitle" },
        BookingCancelled: { icon: "✕", titleKey: "notifications.cancelledTitle" },
        PaymentSuccessful: { icon: "$", titleKey: "notifications.paymentTitle" },
        FlightUpdate: { icon: "✈", titleKey: "notifications.flightUpdateTitle" },
        SupportUpdate: { icon: "✉", titleKey: null },
        CheckInReminder: { icon: "⏱", titleKey: "notifications.checkinTitle" },
        RefundCompleted: { icon: "↩", titleKey: "api.notifications.refundCompletedTitle" }
    };

    /* The backend sentences, by notification type: the pattern that finds the values, and the translated sentence with them. */
    var MESSAGES = {
        BookingConfirmed: [
            { pattern: /^Your booking (\S+) is confirmed\.$/, key: "confirmed", vars: ["pnr"] }
        ],
        PaymentSuccessful: [
            { pattern: /^We received your payment of ([\d.,]+) for booking (\S+)\.$/, key: "payment", vars: ["amount", "pnr"] }
        ],
        BookingCancelled: [
            { pattern: /^Your booking (\S+) has been cancelled\. An estimated refund of ([\d.,]+) has been requested\.$/, key: "cancelledRefund", vars: ["pnr", "amount"] },
            { pattern: /^Your booking (\S+) has been cancelled\. Under the fare rules no refund is due\.$/, key: "cancelledNoRefund", vars: ["pnr"] },
            { pattern: /^Your booking (\S+) has been cancelled\.$/, key: "cancelled", vars: ["pnr"] }
        ],
        RefundCompleted: [
            { pattern: /^Your refund of ([\d.,]+) for booking (\S+) has been completed\.$/, key: "refundCompleted", vars: ["amount", "pnr"] }
        ],
        CheckInReminder: [
            { pattern: /^Your flight (\S+) from (.+) to (.+) departs within (\d+) hours\. Booking reference (\S+)\.$/, key: "checkin", vars: ["flight", "from", "to", "hours", "pnr"] }
        ],
        SupportUpdate: [
            { pattern: /^We received your request "(.*)" \((\S+)\)\. We will answer in your Support page\.$/, key: "supportReceived", vars: ["subject", "number"] },
            { pattern: /^Support replied to "(.*)" \((\S+)\): ([\s\S]*) Status: ([^:]+)\.$/, key: "supportReply", vars: ["subject", "number", "body", "status"] },
            { pattern: /^The status of your request "(.*)" \((\S+)\) is now: (.+)\.$/, key: "supportStatus", vars: ["subject", "number", "status"] }
        ],
        FlightUpdate: [
            { pattern: /^Flight (\S+) on (.+) has been cancelled\.$/, key: "flightCancelled", vars: ["flight", "date"] },
            { pattern: /^Flight (\S+) now departs at (.+) UTC and arrives at (.+) UTC\.$/, key: "flightTimes", vars: ["flight", "departure", "arrival"] },
            { pattern: /^The status of flight (\S+) on (.+) is now (.+)\.$/, key: "flightStatus", vars: ["flight", "date", "status"] }
        ]
    };

    /* The backend writes the status of a ticket in English; the same four words are translated by the Support page's keys. */
    var SUPPORT_STATUS = { "Open": "Open", "İcradadır": "InProgress", "Cavabınız gözlənilir": "WaitingForCustomer", "Resolved": "Resolved" };

    function supportStatus(text) {
        var key = SUPPORT_STATUS[text];
        return key ? tr("support.status." + key, text) : text;
    }

    var SUPPORT_TITLES = [
        { pattern: /^Support request (\S+) received$/, key: "supportReceivedTitle", vars: ["number"] },
        { pattern: /^New reply on support request (\S+)$/, key: "supportReplyTitle", vars: ["number"] },
        { pattern: /^Support request (\S+) is now (.+)$/, key: "supportStatusTitle", vars: ["number", "status"] }
    ];

    function messageFor(notification) {
        var original = String(notification.message || "");
        var rules = MESSAGES[notification.type] || [];

        for (var index = 0; index < rules.length; index++) {
            var match = rules[index].pattern.exec(original);

            if (!match) {
                continue;
            }

            var vars = {};
            rules[index].vars.forEach(function (name, position) {
                var value = match[position + 1];
                vars[name] = name === "amount" ? "$" + value : name === "status" && notification.type === "SupportUpdate" ? supportStatus(value) : value;
            });

            return tr("api.notifications.msg." + rules[index].key, original, vars);
        }

        return original;
    }

    /*
     * Where a notification leads, using the pages that already exist: a support notification opens its own conversation, a booking, payment,
     * refund or check-in notification opens the booking (the reference is in the sentence). Anything else (a flight update names no booking)
     * has no destination and stays a plain card.
     */
    var BOOKING_TYPES = { BookingConfirmed: 1, BookingCancelled: 1, PaymentSuccessful: 1, RefundPending: 1, RefundCompleted: 1, RefundFailed: 1, CheckInReminder: 1 };

    function destinationFor(notification) {
        if (notification.type === "SupportUpdate" && Number(notification.supportTicketId) > 0) {
            return { href: "support.html?ticket=" + encodeURIComponent(notification.supportTicketId), labelKey: "notifications.openTicket", label: "Yazışmanı aç" };
        }

        if (BOOKING_TYPES[notification.type]) {
            var match = /\b[Bb]ooking(?: reference)? ([A-Z0-9]{6})\b/.exec(String(notification.message || ""));
            if (match) {
                return { href: "booking-details.html?pnr=" + encodeURIComponent(match[1]), labelKey: "notifications.openBooking", label: "Rezervasiyaya bax" };
            }
        }

        return null;
    }

    function titleFor(notification) {
        var type = TYPES[notification.type];
        if (notification.type === "SupportUpdate") {
            for (var index = 0; index < SUPPORT_TITLES.length; index++) {
                var match = SUPPORT_TITLES[index].pattern.exec(String(notification.title || ""));
                if (match) {
                    var vars = { number: match[1] };
                    if (match[2]) vars.status = supportStatus(match[2]);
                    return tr("api.notifications." + SUPPORT_TITLES[index].key, notification.title, vars);
                }
            }
        }
        return type && type.titleKey ? tr(type.titleKey, notification.title) : notification.title;
    }

    function stateLabelMarkup(isUnread) {
        return '<span class="notification-state ' +
            (isUnread ? "notification-state--unread" : "notification-state--read") + '">' +
            escapeHtml(isUnread ? tr("common.unread", "Oxunmayıb") : tr("common.read", "Oxunub")) +
            "</span>";
    }

    function paintList(markup) {
        var list = document.getElementById("notifications-list");
        if (list) {
            list.innerHTML = markup;
        }
        return list;
    }

    function statusMarkup(kind, title, text, withRetry) {
        return '<div class="notifications-empty" role="' + (kind === "error" ? "alert" : "status") + '">' +
            '<h2 class="notifications-empty-title">' + escapeHtml(title) + "</h2>" +
            '<p class="notifications-empty-text">' + escapeHtml(text) + "</p>" +
            (withRetry ? '<button type="button" class="notifications-toolbar-button" id="notifications-retry">' + escapeHtml(tr("api.options.retry", "Yenidən cəhd et")) + "</button>" : "") +
            "</div>";
    }

    function render() {
        if (!notifications.length) {
            paintList(statusMarkup("empty", tr("notifications.emptyTitle", "Hamısı oxunub"), tr("notifications.emptyText", "Hamısı oxunub. Bron və uçuş yenilikləri burada görünəcək."), false));
            return;
        }

        paintList(notifications.map(function (notification, index) {
            var isUnread = !notification.isRead;
            var isExpanded = !!expandedIds[notification.id];
            var panelId = "notification-panel-" + index;
            var toggleId = "notification-toggle-" + index;
            var type = TYPES[notification.type];
            var destination = destinationFor(notification);

            if (destination) {
                // A notification with a destination is a link: one click marks it read and opens the page it is about.
                return (
                    '<article class="notification-card notification-card--link' + (isUnread ? " is-unread" : "") + '" data-notification-id="' + escapeHtml(notification.id) + '">' +
                        '<h2 class="notification-heading">' +
                        '<a class="notification-toggle notification-link" href="' + escapeHtml(destination.href) + '">' +
                            '<span class="notification-icon" aria-hidden="true">' + escapeHtml(type ? type.icon : "•") + "</span>" +
                            '<span class="notification-body">' +
                                '<span class="notification-title-row">' +
                                    '<span class="notification-title">' + escapeHtml(titleFor(notification)) + "</span>" +
                                    stateLabelMarkup(isUnread) +
                                "</span>" +
                                '<span class="notification-preview">' + escapeHtml(messageFor(notification)) + "</span>" +
                                '<span class="notification-time">' + escapeHtml(formatDateTime(notification.createdAt)) + "</span>" +
                            "</span>" +
                            '<span class="notification-open">' + escapeHtml(tr(destination.labelKey, destination.label)) + "</span>" +
                        "</a>" +
                        "</h2>" +
                    "</article>"
                );
            }

            return (
                '<article class="notification-card' + (isUnread ? " is-unread" : "") + (isExpanded ? " is-expanded" : "") +
                    '" data-notification-id="' + escapeHtml(notification.id) + '">' +
                    '<h2 class="notification-heading">' +
                    '<button class="notification-toggle" type="button" id="' + toggleId + '" aria-expanded="' + (isExpanded ? "true" : "false") +
                        '" aria-controls="' + panelId + '">' +
                        '<span class="notification-icon" aria-hidden="true">' + escapeHtml(type ? type.icon : "•") + "</span>" +
                        '<span class="notification-body">' +
                            '<span class="notification-title-row">' +
                                '<span class="notification-title">' + escapeHtml(titleFor(notification)) + "</span>" +
                                stateLabelMarkup(isUnread) +
                            "</span>" +
                            '<span class="notification-preview">' + escapeHtml(messageFor(notification)) + "</span>" +
                            '<span class="notification-time">' + escapeHtml(formatDateTime(notification.createdAt)) + "</span>" +
                        "</span>" +
                        '<span class="notification-chevron" aria-hidden="true"></span>' +
                    "</button>" +
                    "</h2>" +
                    '<div class="notification-panel" id="' + panelId + '" role="region" aria-labelledby="' + toggleId + '"' +
                        (isExpanded ? "" : " inert") + ">" +
                        '<div class="notification-panel-inner">' +
                            '<p class="notification-message">' + escapeHtml(messageFor(notification)) + "</p>" +
                            '<dl class="notification-details">' +
                                '<div class="notification-detail"><dt>' + escapeHtml(tr("common.date", "Tarix")) + "</dt><dd>" +
                                    escapeHtml(formatDateTime(notification.createdAt)) + "</dd></div>" +
                                '<div class="notification-detail"><dt>' + escapeHtml(tr("common.status", "Status")) + '</dt><dd class="notification-detail-status">' +
                                    escapeHtml(isUnread ? tr("common.unread", "Oxunmayıb") : tr("common.read", "Oxunub")) + "</dd></div>" +
                            "</dl>" +
                        "</div>" +
                    "</div>" +
                "</article>"
            );
        }).join(""));
    }

    function announceChange() {
        window.dispatchEvent(new CustomEvent("aerova:notificationschange"));
    }

    function apiMessage(error) {
        var isApiError = window.AEROVA_API && error instanceof window.AEROVA_API.ApiError;
        if (!isApiError && window.console) {
            window.console.error(error);
        }
        return isApiError ? error.userMessage : tr("api.errors.generic", "Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.");
    }

    function load() {
        var token = ++loadToken;

        paintList(statusMarkup("loading", tr("api.notifications.loadingTitle", "Bildirişlər yüklənir"), tr("api.notifications.loadingText", "Zəhmət olmasa bir az gözləyin."), false));

        window.AEROVA_API.get("api/notifications").then(function (list) {
            if (token !== loadToken) {
                return;
            }
            notifications = list || [];
            render();
            announceChange();
        }).catch(function (error) {
            if (token !== loadToken) {
                return;
            }
            notifications = [];
            var list = paintList(statusMarkup("error", tr("api.notifications.errorTitle", "Bildirişlərinizi yükləmək mümkün olmadı"), apiMessage(error), true));
            var retry = list && list.querySelector("#notifications-retry");
            if (retry) {
                retry.addEventListener("click", load);
            }
        });
    }

    function setCardExpanded(card, expanded) {
        var toggle = card.querySelector(".notification-toggle");
        var panel = card.querySelector(".notification-panel");
        card.classList.toggle("is-expanded", expanded);
        if (toggle) toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
        if (panel) {
            if (expanded) panel.removeAttribute("inert");
            else panel.setAttribute("inert", "");
        }
    }

    function markCardRead(card) {
        card.classList.remove("is-unread");
        var state = card.querySelector(".notification-state");
        if (state) state.outerHTML = stateLabelMarkup(false);
        var detailStatus = card.querySelector(".notification-detail-status");
        if (detailStatus) detailStatus.textContent = tr("common.read", "Oxunub");
    }

    function toggleNotification(card) {
        var id = Number(card.getAttribute("data-notification-id"));
        var expanded = !card.classList.contains("is-expanded");

        if (expanded) expandedIds[id] = true;
        else delete expandedIds[id];
        setCardExpanded(card, expanded);

        var notification = notifications.filter(function (item) { return item.id === id; })[0];
        if (!expanded || !notification || notification.isRead) {
            return;
        }

        // Opening a notification reads it; the server is told, and the card only turns "read" once it agrees.
        window.AEROVA_API.patch("api/notifications/" + id + "/read").then(function () {
            notification.isRead = true;
            markCardRead(card);
            announceChange();
        }).catch(function (error) {
            showMessage(apiMessage(error));
        });
    }

    /*
     * Opening a linked notification reads it first (the server decides), then goes to its page. If reading fails the page still opens and the
     * notification stays unread, so nothing is hidden from the customer. A new-tab click only marks it read in the background.
     */
    function openLinked(event, link) {
        var card = link.closest(".notification-card");
        var id = card ? Number(card.getAttribute("data-notification-id")) : 0;
        var notification = notifications.filter(function (item) { return item.id === id; })[0];
        var newTab = event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1;

        function markRead() {
            if (!notification || notification.isRead) return Promise.resolve();
            return window.AEROVA_API.patch("api/notifications/" + id + "/read").then(function () {
                notification.isRead = true;
                markCardRead(card);
                announceChange();
            });
        }

        if (newTab) {
            markRead().catch(function () { /* stays unread */ });
            return;
        }

        event.preventDefault();
        var href = link.getAttribute("href");
        var finished = false;
        function go() { if (!finished) { finished = true; window.location.href = href; } }
        setTimeout(go, 2500);
        markRead().then(go, go);
    }

    function markAllAsRead() {
        if (!notifications.length) {
            showMessage(tr("notifications.noneToUpdate", "Yenilənəcək bildiriş yoxdur."));
            return;
        }

        if (!notifications.some(function (item) { return !item.isRead; })) {
            showMessage(tr("notifications.allAlreadyRead", "Bütün bildirişlər artıq oxunub."));
            return;
        }

        window.AEROVA_API.patch("api/notifications/read-all").then(function () {
            notifications.forEach(function (item) { item.isRead = true; });
            render();
            announceChange();
            showMessage(tr("notifications.allMarkedRead", "Bütün bildirişlər oxunmuş kimi işarələndi."));
        }).catch(function (error) {
            showMessage(apiMessage(error));
        });
    }

    function clearNotifications() {
        if (!notifications.length) {
            showMessage(tr("notifications.noneToClear", "Təmizlənəcək bildiriş yoxdur."));
            return;
        }

        window.AEROVA_API.del("api/notifications").then(function () {
            notifications = [];
            expandedIds = {};
            render();
            announceChange();
            showMessage(tr("notifications.allCleared", "Bütün bildirişlər təmizləndi."));
        }).catch(function (error) {
            showMessage(apiMessage(error));
        });
    }

    function bindActions() {
        var list = document.getElementById("notifications-list");
        var markAllButton = document.getElementById("mark-all-read-button");
        var clearButton = document.getElementById("clear-notifications-button");

        if (list) {
            list.addEventListener("click", function (event) {
                var link = event.target.closest(".notification-link");
                if (link) {
                    openLinked(event, link);
                    return;
                }

                var button = event.target.closest(".notification-toggle");
                var card = button ? button.closest(".notification-card") : null;
                if (card) {
                    toggleNotification(card);
                }
            });
        }

        if (markAllButton) {
            markAllButton.addEventListener("click", markAllAsRead);
        }

        if (clearButton) {
            clearButton.addEventListener("click", clearNotifications);
        }
    }

    function initMenuToggle() {
        var header = document.getElementById("site-header");
        if (!header) {
            return;
        }

        var toggle = header.querySelector(".menu-toggle");
        var nav = header.querySelector(".main-navigation");
        if (!toggle || !nav) {
            return;
        }

        function setMenu(open) {
            header.classList.toggle("is-menu-open", open);
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
            toggle.setAttribute("aria-label", open ? tr("nav.closeMenu", "Menyunu bağla") : tr("nav.openMenu", "Menyunu aç"));
        }

        toggle.addEventListener("click", function () {
            setMenu(!header.classList.contains("is-menu-open"));
        });

        nav.addEventListener("click", function (event) {
            if (event.target.closest("a")) {
                setMenu(false);
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                setMenu(false);
            }
        });

        window.addEventListener("resize", function () {
            if (window.innerWidth > 1366) {
                setMenu(false);
            }
        });
    }

    function init() {
        bindActions();
        initMenuToggle();
        load();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
