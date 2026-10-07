(function () {
    function tr(key, fallback, vars) {
        if (typeof window.t === "function") {
            var value = window.t(key, vars);
            if (value && value !== key) return value;
        }
        return fallback;
    }

    var STORAGE_KEY = "notificationsData";

    var notificationsState = [];
    var bookingFingerprint = "none";

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

    function formatPrice(amount) {
        var value = Number(amount);
        if (!isFinite(value)) {
            return "$0";
        }
        return "$" + value.toFixed(value % 1 === 0 ? 0 : 2);
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

        return date.getDate() + " " + months[date.getMonth()] + " " + date.getFullYear() +
            " · " +
            String(date.getHours()).padStart(2, "0") + ":" +
            String(date.getMinutes()).padStart(2, "0");
    }

    function formatFlightDate(dateValue) {
        if (!dateValue) {
            return "your departure date";
        }

        var parts = String(dateValue).split("-");
        if (parts.length !== 3) {
            return String(dateValue);
        }

        var months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        var month = Number(parts[1]);
        var day = Number(parts[2]);
        var year = Number(parts[0]);

        if (!month || !day || !year) {
            return String(dateValue);
        }

        return day + " " + months[month - 1] + " " + year;
    }

    function getBookingData() {
        return readJSON("bookingData");
    }

    function getBookingFingerprint(booking) {
        if (!booking) {
            return "none";
        }

        var flight = booking.flight || {};

        return [
            booking.pnr || "",
            booking.status || "",
            booking.paymentStatus || "",
            flight.departureDate || "",
            flight.flightNumber || "",
            booking.cabinClass || "",
            booking.totalPrice != null ? String(booking.totalPrice) : ""
        ].join("|");
    }

    function isCancelled(booking) {
        var status = String(booking.status || "").toLowerCase();
        var payment = String(booking.paymentStatus || "").toLowerCase();
        return status === "cancelled" || payment === "cancelled";
    }

    function isPaid(booking) {
        var payment = String(booking.paymentStatus || "").toLowerCase();
        return payment === "paid" || payment === "confirmed";
    }

    function isConfirmed(booking) {
        if (isCancelled(booking)) {
            return false;
        }

        var status = String(booking.status || "").toLowerCase();
        return status === "confirmed" || isPaid(booking) || !!booking.pnr;
    }

    function buildNotification(id, type, title, message, icon, datetime) {
        return {
            id: id,
            type: type,
            title: title,
            message: message,
            icon: icon,
            datetime: datetime || new Date().toISOString(),
            read: false
        };
    }

    function generateFromBooking(booking) {
        if (!booking) {
            return [];
        }

        var flight = booking.flight || {};
        var pnr = booking.pnr || "your booking";
        var flightNumber = flight.flightNumber || "your flight";
        var route = flight.from && flight.to
            ? flight.from + " → " + flight.to
            : (flight.route || "your route");
        var departureDate = flight.departureDate || "";
        var departureTime = flight.departure || "";
        var now = Date.now();
        var items = [];

        if (isCancelled(booking)) {
            items.push(buildNotification(
                "cancelled-" + pnr,
                "cancelled",
                tr("notifications.cancelledTitle", "Booking Cancelled"),
                tr("notifications.cancelledBody", "Reservation " + pnr + " for " + route + " has been cancelled.", { pnr: pnr, route: route }),
                "X",
                new Date(now).toISOString()
            ));
            return items;
        }

        if (isConfirmed(booking)) {
            items.push(buildNotification(
                "confirmed-" + pnr,
                "booking",
                tr("notifications.confirmedTitle", "Booking Confirmed"),
                tr("notifications.confirmedBody", "Your AEROVA reservation " + pnr + " for " + route + " is confirmed.", { pnr: pnr, route: route }),
                "B",
                new Date(now - 120000).toISOString()
            ));
        }

        if (isPaid(booking)) {
            items.push(buildNotification(
                "payment-" + pnr,
                "payment",
                tr("notifications.paymentTitle", "Payment Successful"),
                tr("notifications.paymentBody", "Payment of " + formatPrice(booking.totalPrice) + " was received successfully for booking " + pnr + ".", { amount: formatPrice(booking.totalPrice), pnr: pnr }),
                "P",
                new Date(now - 90000).toISOString()
            ));
        }

        if (flight.flightNumber || departureDate) {
            items.push(buildNotification(
                "flight-update-" + pnr,
                "flight",
                tr("notifications.flightUpdateTitle", "Flight Update"),
                flightNumber + " is scheduled for " + formatFlightDate(departureDate) +
                    (departureTime ? " at " + departureTime : "") +
                    ". Cabin: " + (booking.cabinClass || "Economy") + ".",
                "F",
                new Date(now - 60000).toISOString()
            ));
        }

        if (departureDate) {
            items.push(buildNotification(
                "checkin-" + pnr,
                "checkin",
                tr("notifications.checkinTitle", "Check-in Reminder"),
                "Online check-in opens 24 hours before departure for flight " +
                    flightNumber + " on " + formatFlightDate(departureDate) + ".",
                "C",
                new Date(now - 30000).toISOString()
            ));
        }

        return items;
    }

    function mergeReadState(generated, previousNotifications) {
        var readMap = {};

        (previousNotifications || []).forEach(function (item) {
            if (item && item.id) {
                readMap[item.id] = !!item.read;
            }
        });

        return generated.map(function (item) {
            if (Object.prototype.hasOwnProperty.call(readMap, item.id)) {
                return Object.assign({}, item, { read: readMap[item.id] });
            }
            return item;
        });
    }

    function loadStoredPayload() {
        var stored = readJSON(STORAGE_KEY);
        if (!stored) {
            return { notifications: [], clearedFingerprint: null };
        }

        if (Array.isArray(stored)) {
            return { notifications: stored, clearedFingerprint: null };
        }

        return {
            notifications: Array.isArray(stored.notifications) ? stored.notifications : [],
            clearedFingerprint: stored.clearedFingerprint || null
        };
    }

    function persistNotifications(options) {
        var existing = loadStoredPayload();
        var payload = {
            notifications: notificationsState,
            fingerprint: bookingFingerprint,
            clearedFingerprint: existing.clearedFingerprint || null
        };

        if (options && Object.prototype.hasOwnProperty.call(options, "clearedFingerprint")) {
            payload.clearedFingerprint = options.clearedFingerprint;
        }

        // If booking changed after a clear, drop the old clear lock.
        if (payload.clearedFingerprint && payload.clearedFingerprint !== bookingFingerprint) {
            payload.clearedFingerprint = null;
        }

        writeJSON(STORAGE_KEY, payload);
    }

    function loadNotifications() {
        var booking = getBookingData();
        bookingFingerprint = getBookingFingerprint(booking);
        var stored = loadStoredPayload();

        if (!booking) {
            return stored.notifications.slice();
        }

        if (stored.clearedFingerprint && stored.clearedFingerprint === bookingFingerprint) {
            return [];
        }

        var generated = generateFromBooking(booking);
        return mergeReadState(generated, stored.notifications);
    }

    function countUnread() {
        return notificationsState.filter(function (item) {
            return !item.read;
        }).length;
    }

    function renderNotifications() {
        var list = document.getElementById("notifications-list");
        if (!list) {
            return;
        }

        if (!notificationsState.length) {
            list.innerHTML =
                '<div class="notifications-empty">' +
                    '<h2 class="notifications-empty-title">' + (typeof t === "function" ? t("notifications.emptyTitle") : "No Notifications") + '</h2>' +
                    '<p class="notifications-empty-text">' + (typeof t === "function" ? t("notifications.emptyText") : "You are all caught up. Booking and flight updates will appear here when available.") + '</p>' +
                "</div>";
            return;
        }

        list.innerHTML = notificationsState.map(function (notification) {
            var isUnread = !notification.read;

            return (
                '<article class="notification-card' + (isUnread ? " is-unread" : "") +
                    '" data-notification-id="' + escapeHtml(notification.id) + '">' +
                    '<span class="notification-icon" aria-hidden="true">' +
                        escapeHtml(notification.icon || "•") +
                    "</span>" +
                    '<div class="notification-body">' +
                        '<div class="notification-title-row">' +
                            '<h2 class="notification-title">' + escapeHtml(notification.title) + "</h2>" +
                            '<span class="notification-state ' +
                                (isUnread ? "notification-state--unread" : "notification-state--read") + '">' +
                                (isUnread ? tr("common.unread", "Unread") : tr("common.read", "Read")) +
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
        showMessage(tr("notifications.markedRead", "Notification marked as read."));
    }

    function markAllAsRead() {
        if (!notificationsState.length) {
            showMessage(tr("notifications.noneToUpdate", "There are no notifications to update."));
            return;
        }

        if (!countUnread()) {
            showMessage(tr("notifications.allAlreadyRead", "All notifications are already read."));
            return;
        }

        notificationsState = notificationsState.map(function (notification) {
            return Object.assign({}, notification, { read: true });
        });

        persistNotifications();
        renderNotifications();
        showMessage(tr("notifications.allMarkedRead", "All notifications marked as read."));
    }

    function clearNotifications() {
        if (!notificationsState.length) {
            showMessage(tr("notifications.noneToClear", "There are no notifications to clear."));
            return;
        }

        notificationsState = [];
        persistNotifications({ clearedFingerprint: bookingFingerprint });
        renderNotifications();
        showMessage(tr("notifications.allCleared", "All notifications have been cleared."));
    }

    function bindActions() {
        var list = document.getElementById("notifications-list");
        var markAllButton = document.getElementById("mark-all-read-button");
        var clearButton = document.getElementById("clear-notifications-button");

        if (list) {
            list.addEventListener("click", function (event) {
                var button = event.target.closest("[data-action='mark-read']");
                if (!button || button.disabled) {
                    return;
                }

                var card = button.closest(".notification-card");
                if (!card) {
                    return;
                }

                markAsRead(card.getAttribute("data-notification-id"));
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
            if (window.innerWidth > 1080) {
                setMenu(false);
            }
        });
    }

    function init() {
        notificationsState = loadNotifications();
        renderNotifications();
        bindActions();
        initMenuToggle();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
    window.addEventListener("aerova:languagechange", function () {
        if (typeof renderNotifications === 'function') { try { renderNotifications(); } catch (e) {} } if (window.AEROVA_I18N) window.AEROVA_I18N.applyTranslations(document);
    });
})();
