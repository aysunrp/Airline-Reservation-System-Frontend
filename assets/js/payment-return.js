/*
 * The pages Stripe sends the customer back to (payment-success.html and payment-cancel.html).
 * Coming back proves nothing: the success page asks the backend for the payment and shows "confirmed" only when the backend
 * says the payment is Paid and the booking Confirmed. The booking is confirmed by Stripe's webhook, never by this page.
 * Needs api-client.js, airports.js and booking-api.js.
 */
(function () {
    "use strict";

    var POLL_MS = 2000;
    var SLOW_AFTER_MS = 20000;
    var GIVE_UP_MS = 90000;
    var CHECKOUT_KEY = "aerovaCheckout";

    var api = window.AEROVA_API;
    var mode = document.body.getAttribute("data-return");
    var view = null;
    var startedAt = Date.now();
    var timer = null;
    var checking = false;

    function tr(key, fallback, vars) {
        if (typeof window.t === "function") {
            var value = window.t(key, vars);
            if (value && value !== key) return value;
        }
        return typeof vars === "object" && vars
            ? String(fallback).replace(/\{(\w+)\}/g, function (_, name) { return vars[name] != null ? String(vars[name]) : "{" + name + "}"; })
            : fallback;
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function isLoggedIn() {
        return !!(window.AerovaAuth && window.AerovaAuth.isLoggedIn());
    }

    /* ---------------------------------------------------------------- what the address and the tab remember */

    function readStored() {
        try {
            return JSON.parse(sessionStorage.getItem(CHECKOUT_KEY) || "null") || {};
        } catch (error) {
            return {};
        }
    }

    function writeStored(value) {
        try {
            sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(value));
        } catch (error) {
            // Without it the page still shows the payment; only the link to the booking is lost.
        }
    }

    function clearStored() {
        try {
            sessionStorage.removeItem(CHECKOUT_KEY);
            sessionStorage.removeItem("bookingData");
        } catch (error) {
            // Nothing to clear.
        }
        if (window.AEROVA_BOOKING) window.AEROVA_BOOKING.forget();
    }

    /* The id of the payment is a number; the Stripe session id has a fixed shape. Anything else in the address is ignored. */
    function readAddress() {
        var params = new URLSearchParams(window.location.search);
        var payment = params.get("payment") || "";
        var session = params.get("session") || "";
        var result = {
            paymentId: /^\d{1,9}$/.test(payment) ? Number(payment) : null,
            session: /^cs_[A-Za-z0-9_]{8,200}$/.test(session) ? session : ""
        };

        // The session id is a key to read this one payment; it does not stay in the address bar or the history.
        if (params.has("session") && window.history && typeof window.history.replaceState === "function") {
            window.history.replaceState(null, "", window.location.pathname + (result.paymentId ? "?payment=" + result.paymentId : ""));
        }

        return result;
    }

    /* ---------------------------------------------------------------- painting */

    var ACTIONS = ["return-primary", "return-trips", "return-again", "return-retry", "return-home"];

    function paint() {
        if (!view) return;

        byId("return-status").setAttribute("data-state", view.state);
        if (view.state === "loading") {
            byId("return-status").setAttribute("aria-busy", "true");
        } else {
            byId("return-status").removeAttribute("aria-busy");
        }

        byId("return-title").textContent = tr(view.title[0], view.title[1]);
        byId("return-text").textContent = tr(view.text[0], view.text[1], view.vars);

        ACTIONS.forEach(function (id) {
            var element = byId(id);
            if (element) element.hidden = view.actions.indexOf(id) === -1;
        });

        var summary = byId("return-summary");
        summary.hidden = !view.summary;
        summary.innerHTML = "";
        (view.summary || []).forEach(function (row) {
            var wrap = document.createElement("div");
            var term = document.createElement("dt");
            var value = document.createElement("dd");
            term.textContent = tr(row.key, row.fallback);
            value.textContent = row.value;
            if (row.pnr) value.className = "payment-return-pnr";
            wrap.appendChild(term);
            wrap.appendChild(value);
            summary.appendChild(wrap);
        });
    }

    function show(next) {
        view = next;
        paint();
    }

    window.addEventListener("aerova:languagechange", paint);

    /* ---------------------------------------------------------------- the booking behind a confirmed payment */

    function formatMoney(amount, currency) {
        try {
            return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(amount);
        } catch (error) {
            return String(amount) + " " + (currency || "");
        }
    }

    function loadBooking(pnr, lastName) {
        if (isLoggedIn()) {
            return api.get("api/bookings/my/" + encodeURIComponent(pnr));
        }
        if (lastName) {
            return api.get("api/bookings/" + encodeURIComponent(pnr), { query: { lastName: lastName } });
        }
        return Promise.reject(new Error("No way to read the booking."));
    }

    function describe(booking, status) {
        var rows = [{ key: "api.payment.labelReference", fallback: "Booking reference", value: booking ? booking.pnr : status.pnr, pnr: true }];
        var directory = window.AEROVA_AIRPORTS;

        if (!booking) {
            rows.push({ key: "api.payment.labelTotal", fallback: "Total paid", value: formatMoney(status.amount, status.currency) });
            return Promise.resolve(rows);
        }

        return directory.load().then(function (airports) {
            booking.legs.forEach(function (leg) {
                var origin = directory.find(airports, leg.originCode);
                var local = origin ? directory.localTime(leg.departureAt, origin.timeZoneId) : null;
                rows.push({ key: "api.payment.labelRoute", fallback: "Route", value: leg.originCity + " → " + leg.destinationCity + " · " + leg.flightNumber });
                rows.push({ key: "api.payment.labelDeparture", fallback: "Departure", value: local ? local.date + " · " + local.time : String(leg.departureAt).slice(0, 16).replace("T", " ") + " UTC" });
            });
            rows.push({ key: "api.payment.labelPassengers", fallback: "Passengers", value: booking.passengers.map(function (p) { return p.firstName + " " + p.lastName; }).join(", ") });
            rows.push({ key: "api.payment.labelTotal", fallback: "Total paid", value: formatMoney(status.amount, status.currency) });
            return rows;
        }, function () {
            rows.push({ key: "api.payment.labelTotal", fallback: "Total paid", value: formatMoney(status.amount, status.currency) });
            return rows;
        });
    }

    /* ---------------------------------------------------------------- success page */

    function confirmed(status, stored) {
        var finish = function (booking) {
            var lastName = stored.lastName || (booking && booking.passengers[0] && booking.passengers[0].lastName) || "";
            try {
                // The confirmation page asks the backend for the booking with exactly this.
                sessionStorage.setItem("aerovaPaid", JSON.stringify({ pnr: status.pnr, lastName: lastName }));
            } catch (error) {
                // The confirmation page then asks for the reference again.
            }

            describe(booking, status).then(function (rows) {
                var actions = ["return-primary"];
                if (isLoggedIn()) actions.push("return-trips");
                actions.push("return-home");
                show({ state: "success", title: ["api.payment.successTitle", "Payment confirmed"], text: ["api.payment.successText", "Thank you! Your booking is confirmed."], actions: actions, summary: rows });
                clearStored();
            });
        };

        loadBooking(status.pnr, stored.lastName).then(finish, function () { finish(null); });
    }

    function interpret(status, stored) {
        if (status.status === "Paid" && status.bookingStatus === "Confirmed") {
            confirmed(status, stored);
            return true;
        }

        if (status.status === "Paid") {
            // The money is taken but the booking could not be confirmed (its time had run out): support has to refund it.
            show({
                state: "error",
                title: ["api.payment.paidNotConfirmedTitle", "We received your payment, but could not confirm the booking"],
                text: ["api.payment.paidNotConfirmedText", "The seats were no longer held when the payment arrived. Please contact AEROVA support with your booking reference; the payment will be refunded."],
                actions: ["return-trips", "return-home"],
                summary: [{ key: "api.payment.labelReference", fallback: "Booking reference", value: status.pnr, pnr: true }]
            });
            return true;
        }

        if (status.status === "Failed" || status.status === "Cancelled") {
            show({
                state: "error",
                title: ["api.payment.failedTitle", "Payment did not go through"],
                text: ["api.payment.failedText", "Stripe could not take the payment. No money was charged. You can try again."],
                actions: ["return-retry", "return-home"]
            });
            return true;
        }

        return false;
    }

    function waitingView(slow) {
        return slow
            ? { state: "loading", title: ["api.payment.waitingTitle", "Still confirming your payment"], text: ["api.payment.waitingText", "Your payment is taking a little longer to confirm. This page keeps checking. Your seats stay reserved for now."], actions: [] }
            : { state: "loading", title: ["api.payment.checkingTitle", "Checking your payment"], text: ["api.payment.checkingText", "Please wait while we confirm your payment with Stripe. Do not close this page."], actions: [] };
    }

    function pollSuccess(address, stored) {
        if (checking) return;
        checking = true;

        var query = address.session ? { session: address.session } : undefined;
        api.get("api/payments/" + address.paymentId, query ? { query: query } : undefined).then(function (status) {
            checking = false;
            if (interpret(status, stored)) return;

            var waited = Date.now() - startedAt;
            if (waited >= GIVE_UP_MS) {
                show({
                    state: "loading",
                    title: ["api.payment.slowTitle", "We are still waiting for confirmation"],
                    text: ["api.payment.slowText", "Stripe has not confirmed your payment yet. If money left your account, your booking will appear in My Trips once it is confirmed. You can check again now."],
                    actions: ["return-again", "return-trips", "return-home"]
                });
                byId("return-status").removeAttribute("aria-busy");
                return;
            }

            show(waitingView(waited >= SLOW_AFTER_MS));
            timer = window.setTimeout(function () { pollSuccess(address, stored); }, POLL_MS);
        }).catch(function (error) {
            checking = false;
            if (error && error.status === 404) {
                show({
                    state: "error",
                    title: ["api.payment.notFoundTitle", "We could not find this payment"],
                    text: ["api.payment.notFoundText", "Open My Trips to see your bookings, or start again from the home page."],
                    actions: ["return-trips", "return-home"]
                });
                return;
            }

            // A hiccup of the network or a busy server: keep asking until the time is up.
            if (Date.now() - startedAt < GIVE_UP_MS) {
                timer = window.setTimeout(function () { pollSuccess(address, stored); }, POLL_MS * 2);
                return;
            }

            show({
                state: "error",
                title: ["api.payment.errorTitle", "We could not check your payment"],
                text: ["api.errors.generic", "Something went wrong. Please try again."],
                actions: ["return-again", "return-trips", "return-home"]
            });
        });
    }

    function startSuccess() {
        var address = readAddress();
        var stored = readStored();

        if (!address.paymentId) {
            show({
                state: "error",
                title: ["api.payment.notFoundTitle", "We could not find this payment"],
                text: ["api.payment.notFoundText", "Open My Trips to see your bookings, or start again from the home page."],
                actions: ["return-trips", "return-home"]
            });
            return;
        }

        if (!address.session && stored.session && stored.paymentId === address.paymentId) {
            address.session = stored.session;
        }

        if (stored.paymentId !== address.paymentId) {
            stored = { paymentId: address.paymentId, session: address.session };
        } else {
            stored.session = address.session || stored.session;
        }
        writeStored(stored);

        byId("return-again").addEventListener("click", function () {
            startedAt = Date.now();
            show(waitingView(false));
            window.clearTimeout(timer);
            pollSuccess(address, stored);
        });

        show(waitingView(false));
        pollSuccess(address, stored);
    }

    /* ---------------------------------------------------------------- cancel page */

    function startCancel() {
        var address = readAddress();
        var stored = readStored();

        show({
            state: "cancel",
            title: ["api.payment.cancelTitle", "Payment cancelled"],
            text: ["api.payment.cancelText", "You left Stripe's page before paying, so nothing was charged. Your seats stay held for a little longer so you can try again."],
            actions: ["return-retry", "return-home"]
        });

        // A booking that was paid in the meantime must not be offered a second payment.
        if (address.paymentId && isLoggedIn()) {
            api.get("api/payments/" + address.paymentId).then(function (status) {
                if (status.status === "Paid" && status.bookingStatus === "Confirmed") {
                    show({
                        state: "success",
                        title: ["api.payment.cancelPaidTitle", "This booking is already paid"],
                        text: ["api.payment.cancelPaidText", "Your booking is confirmed, so there is nothing more to pay."],
                        actions: ["return-trips", "return-home"]
                    });
                }
            }).catch(function () {
                // The cancel message stands.
            });
        }
    }

    function init() {
        if (!api || !mode) return;
        if (mode === "success") {
            startSuccess();
        } else {
            startCancel();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
