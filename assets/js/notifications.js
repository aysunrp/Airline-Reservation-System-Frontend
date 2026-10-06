(function () {
    var STORAGE_KEY = "notificationsData";

    var DEFAULT_NOTIFICATIONS = [
        {
            id: "notif-1",
            type: "booking",
            title: "Booking Confirmation",
            message: "Your AEROVA reservation AV7K92M for Baku → London is confirmed.",
            datetime: "2026-10-05T14:20:00",
            read: false,
            icon: "B"
        },
        {
            id: "notif-2",
            type: "flight",
            title: "Flight Update",
            message: "AV 101 is on schedule. Departure remains 09:30 from GYD.",
            datetime: "2026-10-05T18:05:00",
            read: false,
            icon: "F"
        },
        {
            id: "notif-3",
            type: "payment",
            title: "Payment Confirmation",
            message: "Payment of $1,594.00 was received successfully for your booking.",
            datetime: "2026-10-05T14:22:00",
            read: true,
            icon: "P"
        },
        {
            id: "notif-4",
            type: "checkin",
            title: "Check-in Reminder",
            message: "Online check-in opens 24 hours before departure for flight AV 101.",
            datetime: "2026-10-06T09:00:00",
            read: false,
            icon: "C"
        },
        {
            id: "notif-5",
            type: "promo",
            title: "Promotional Offer",
            message: "Enjoy complimentary lounge access on your next Comfort booking this month.",
            datetime: "2026-10-04T11:30:00",
            read: true,
            icon: "O"
        }
    ];

    var notificationsState = [];

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function readJSON(key) {
        try {
            var raw = sessionStorage.getItem(key);
            if (!raw) {
                return null;
            }

            var parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    function writeJSON(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            return false;
        }
    }

    function showMessage(text) {
        var message = document.getElementById("notifications-message");
        if (!message) {
            return;
        }

        message.textContent = text || "";
        message.hidden = !text;
    }

    function formatDateTime(value) {
        if (!value) {
            return "—";
        }

        var date = new Date(value);
        if (isNaN(date.getTime())) {
            return String(value);
        }

        var months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];

        var day = date.getDate();
        var month = months[date.getMonth()];
        var year = date.getFullYear();
        var hours = String(date.getHours()).padStart(2, "0");
        var minutes = String(date.getMinutes()).padStart(2, "0");

        return day + " " + month + " " + year + " · " + hours + ":" + minutes;
    }

    function loadNotifications() {
        var stored = readJSON(STORAGE_KEY);

        if (stored && Array.isArray(stored.notifications)) {
            return stored.notifications;
        }

        if (Array.isArray(stored)) {
            return stored;
        }

        return JSON.parse(JSON.stringify(DEFAULT_NOTIFICATIONS));
    }

    function persistNotifications() {
        writeJSON(STORAGE_KEY, { notifications: notificationsState });
    }

    function renderNotifications() {
        var list = document.getElementById("notifications-list");
        if (!list) {
            return;
        }

        if (!notificationsState.length) {
            list.innerHTML =
                '<div class="notifications-empty">' +
                    '<h2 class="notifications-empty-title">No Notifications</h2>' +
                    '<p class="notifications-empty-text">You are all caught up. New booking and flight updates will appear here.</p>' +
                "</div>";
            return;
        }

        list.innerHTML = notificationsState.map(function (notification) {
            var isUnread = !notification.read;

            return (
                '<article class="notification-card' + (isUnread ? " is-unread" : "") + '" data-notification-id="' + escapeHtml(notification.id) + '">' +
                    '<span class="notification-icon" aria-hidden="true">' + escapeHtml(notification.icon || "•") + "</span>" +
                    '<div class="notification-body">' +
                        '<div class="notification-title-row">' +
                            '<h2 class="notification-title">' + escapeHtml(notification.title) + "</h2>" +
                            '<span class="notification-state ' + (isUnread ? "notification-state--unread" : "notification-state--read") + '">' +
                                (isUnread ? "Unread" : "Read") +
                            "</span>" +
                        "</div>" +
                        '<p class="notification-message">' + escapeHtml(notification.message) + "</p>" +
                        '<p class="notification-time">' + escapeHtml(formatDateTime(notification.datetime)) + "</p>" +
                    "</div>" +
                    '<div class="notification-actions">' +
                        '<button class="notification-action-button" type="button" data-action="mark-read"' +
                            (notification.read ? " disabled" : "") +
                        ">Mark as Read</button>" +
                    "</div>" +
                "</article>"
            );
        }).join("");

        list.querySelectorAll("[data-action='mark-read']").forEach(function (button) {
            button.addEventListener("click", function () {
                var card = button.closest(".notification-card");
                if (!card) {
                    return;
                }

                markAsRead(card.getAttribute("data-notification-id"));
            });
        });
    }

    function markAsRead(notificationId) {
        var changed = false;

        notificationsState = notificationsState.map(function (notification) {
            if (notification.id !== notificationId || notification.read) {
                return notification;
            }

            changed = true;
            return Object.assign({}, notification, { read: true });
        });

        if (!changed) {
            return;
        }

        persistNotifications();
        renderNotifications();
        showMessage("Notification marked as read.");
    }

    function markAllAsRead() {
        if (!notificationsState.length) {
            showMessage("There are no notifications to update.");
            return;
        }

        var hasUnread = notificationsState.some(function (notification) {
            return !notification.read;
        });

        if (!hasUnread) {
            showMessage("All notifications are already read.");
            return;
        }

        notificationsState = notificationsState.map(function (notification) {
            return Object.assign({}, notification, { read: true });
        });

        persistNotifications();
        renderNotifications();
        showMessage("All notifications marked as read.");
    }

    function clearNotifications() {
        if (!notificationsState.length) {
            showMessage("There are no notifications to clear.");
            return;
        }

        notificationsState = [];
        persistNotifications();
        renderNotifications();
        showMessage("All notifications have been cleared.");
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
            toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
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
            if (window.innerWidth > 1080) {
                setMenu(false);
            }
        });
    }

    function init() {
        notificationsState = loadNotifications();
        renderNotifications();

        var markAllButton = document.getElementById("mark-all-read-button");
        if (markAllButton) {
            markAllButton.addEventListener("click", markAllAsRead);
        }

        var clearButton = document.getElementById("clear-notifications-button");
        if (clearButton) {
            clearButton.addEventListener("click", clearNotifications);
        }

        initMenuToggle();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
