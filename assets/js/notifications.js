/*
 * Notifications of the signed-in user, from GET api/notifications. Needs api-client.js and auth.js.
 * Reading, "mark all as read", "clear" and the unread badge in the account menu all go through the API.
 * The titles are translated here by notification type; the message text is the one the backend wrote (English).
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
        CheckInReminder: { icon: "⏱", titleKey: "notifications.checkinTitle" },
        RefundCompleted: { icon: "↩", titleKey: "api.notifications.refundCompletedTitle" }
    };

    function titleFor(notification) {
        var type = TYPES[notification.type];
        return type ? tr(type.titleKey, notification.title) : notification.title;
    }

    function stateLabelMarkup(isUnread) {
        return '<span class="notification-state ' +
            (isUnread ? "notification-state--unread" : "notification-state--read") + '">' +
            escapeHtml(isUnread ? tr("common.unread", "Unread") : tr("common.read", "Read")) +
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
            (withRetry ? '<button type="button" class="notifications-toolbar-button" id="notifications-retry">' + escapeHtml(tr("api.options.retry", "Try again")) + "</button>" : "") +
            "</div>";
    }

    function render() {
        if (!notifications.length) {
            paintList(statusMarkup("empty", tr("notifications.emptyTitle", "No Notifications"), tr("notifications.emptyText", "You are all caught up. Booking and flight updates will appear here when available."), false));
            return;
        }

        paintList(notifications.map(function (notification, index) {
            var isUnread = !notification.isRead;
            var isExpanded = !!expandedIds[notification.id];
            var panelId = "notification-panel-" + index;
            var toggleId = "notification-toggle-" + index;
            var type = TYPES[notification.type];

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
                            '<span class="notification-preview">' + escapeHtml(notification.message) + "</span>" +
                            '<span class="notification-time">' + escapeHtml(formatDateTime(notification.createdAt)) + "</span>" +
                        "</span>" +
                        '<span class="notification-chevron" aria-hidden="true"></span>' +
                    "</button>" +
                    "</h2>" +
                    '<div class="notification-panel" id="' + panelId + '" role="region" aria-labelledby="' + toggleId + '"' +
                        (isExpanded ? "" : " inert") + ">" +
                        '<div class="notification-panel-inner">' +
                            '<p class="notification-message">' + escapeHtml(notification.message) + "</p>" +
                            '<dl class="notification-details">' +
                                '<div class="notification-detail"><dt>' + escapeHtml(tr("common.date", "Date")) + "</dt><dd>" +
                                    escapeHtml(formatDateTime(notification.createdAt)) + "</dd></div>" +
                                '<div class="notification-detail"><dt>' + escapeHtml(tr("common.status", "Status")) + '</dt><dd class="notification-detail-status">' +
                                    escapeHtml(isUnread ? tr("common.unread", "Unread") : tr("common.read", "Read")) + "</dd></div>" +
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
        return isApiError ? error.userMessage : tr("api.errors.generic", "Something went wrong. Please try again.");
    }

    function load() {
        var token = ++loadToken;

        paintList(statusMarkup("loading", tr("api.notifications.loadingTitle", "Loading notifications"), tr("api.notifications.loadingText", "Please wait a moment."), false));

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
            var list = paintList(statusMarkup("error", tr("api.notifications.errorTitle", "We could not load your notifications"), apiMessage(error), true));
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
        if (detailStatus) detailStatus.textContent = tr("common.read", "Read");
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

    function markAllAsRead() {
        if (!notifications.length) {
            showMessage(tr("notifications.noneToUpdate", "There are no notifications to update."));
            return;
        }

        if (!notifications.some(function (item) { return !item.isRead; })) {
            showMessage(tr("notifications.allAlreadyRead", "All notifications are already read."));
            return;
        }

        window.AEROVA_API.patch("api/notifications/read-all").then(function () {
            notifications.forEach(function (item) { item.isRead = true; });
            render();
            announceChange();
            showMessage(tr("notifications.allMarkedRead", "All notifications marked as read."));
        }).catch(function (error) {
            showMessage(apiMessage(error));
        });
    }

    function clearNotifications() {
        if (!notifications.length) {
            showMessage(tr("notifications.noneToClear", "There are no notifications to clear."));
            return;
        }

        window.AEROVA_API.del("api/notifications").then(function () {
            notifications = [];
            expandedIds = {};
            render();
            announceChange();
            showMessage(tr("notifications.allCleared", "All notifications have been cleared."));
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
            toggle.setAttribute("aria-label", open ? tr("nav.closeMenu", "Close menu") : tr("nav.openMenu", "Open menu"));
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

    window.addEventListener("aerova:languagechange", function () {
        if (notifications.length) {
            try { render(); } catch (error) { /* the next load repaints */ }
        }
        if (window.AEROVA_I18N) window.AEROVA_I18N.applyTranslations(document);
    });
})();
