/*
 * The real-time connection of the support pages (SignalR, /hubs/support), with the fallbacks a page needs:
 *   - it reconnects by itself, and asks the page to read its data again after a reconnect (events may have been missed);
 *   - when there is no connection (blocked WebSocket, server down, the library did not load) it polls every few seconds instead,
 *     and keeps trying to connect again;
 *   - it never reconnects once the sign-in is gone, and a duplicate event (same eventId) is given to the page once.
 * Events carry no message text: the page reads the ticket again through the API, which checks who is asking.
 *
 *   var live = AEROVA_REALTIME.create({ onEvent: fn, onState: fn("connected"|"reconnecting"|"polling"|"off"), poll: fn, onResync: fn });
 *   live.start();  live.stop();
 */
(function () {
    "use strict";

    var api = window.AEROVA_API;

    function create(options) {
        var seen = [];
        var seenSet = {};
        var connection = null;
        var pollTimer = null;
        var retryTimer = null;
        var stopped = false;
        var state = "off";

        function setState(next) {
            if (state !== next) {
                state = next;
                if (typeof options.onState === "function") options.onState(next);
            }
        }

        /* True when this event was already given to the page. */
        function isDuplicate(id) {
            if (!id) return false;
            if (seenSet[id]) return true;
            seenSet[id] = true;
            seen.push(id);
            if (seen.length > 200) delete seenSet[seen.shift()];
            return false;
        }

        function startPolling() {
            if (pollTimer || stopped) return;
            setState("polling");
            pollTimer = setInterval(function () {
                if (!api || !api.session.isActive()) { stop(); return; }
                if (typeof options.poll === "function") options.poll();
            }, options.pollMs || 20000);
        }

        function stopPolling() {
            if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
        }

        function scheduleRetry(ms) {
            if (retryTimer || stopped) return;
            retryTimer = setTimeout(function () { retryTimer = null; start(); }, ms);
        }

        function start() {
            if (stopped || !api || !api.session.isActive()) { setState("off"); return; }
            if (!window.signalR) { startPolling(); return; }

            if (connection) {
                try { connection.stop(); } catch (error) { /* already stopped */ }
            }

            connection = new window.signalR.HubConnectionBuilder()
                .withUrl(api.url("hubs/support"), {
                    accessTokenFactory: function () { return api.session.token(); },
                    withCredentials: false
                })
                .withAutomaticReconnect([0, 2000, 5000, 10000, 20000, 30000])
                .configureLogging(window.signalR.LogLevel.None)
                .build();

            connection.on("supportEvent", function (supportEvent) {
                if (supportEvent && !isDuplicate(supportEvent.eventId) && typeof options.onEvent === "function") options.onEvent(supportEvent);
            });
            connection.onreconnecting(function () { setState("reconnecting"); startPolling(); });
            connection.onreconnected(function () {
                stopPolling();
                setState("connected");
                if (typeof options.onResync === "function") options.onResync();
            });
            connection.onclose(function () {
                if (stopped) return;
                startPolling();
                scheduleRetry(60000);
            });

            connection.start().then(function () {
                stopPolling();
                setState("connected");
                if (typeof options.onResync === "function") options.onResync();
            }, function () {
                startPolling();
                // A rejected token is a normal request failing with 401: asking the API once lets the usual "session expired" handling run.
                api.get("api/notifications/unread-count").catch(function () { /* handled by the client */ });
                scheduleRetry(30000);
            });
        }

        function stop() {
            stopped = true;
            stopPolling();
            if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
            if (connection) {
                try { connection.stop(); } catch (error) { /* already stopped */ }
                connection = null;
            }
            setState("off");
        }

        window.addEventListener("pagehide", function () {
            if (connection) {
                try { connection.stop(); } catch (error) { /* closing anyway */ }
            }
        });

        return { start: start, stop: stop, state: function () { return state; } };
    }

    window.AEROVA_REALTIME = { create: create };
})();
