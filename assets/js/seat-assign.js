/*
 * Who sits where on one flight. Pure helpers (no DOM, no network) used by seat-selection.js.
 *
 * `slots` is an array with one entry per passenger who needs a seat, in passenger order: the seat label ("14C") or null.
 * The order matters: the booking sends the seats in this order, so slot 0 is passenger 1's seat, and so on.
 *
 *   AEROVA_SEAT_ASSIGN.COLORS                     one colour per passenger (the number is always shown too)
 *   AEROVA_SEAT_ASSIGN.place(slots, active, label) -> { slots, action, owner, previous }
 *   AEROVA_SEAT_ASSIGN.nextEmpty(slots, from)      -> index of the next passenger without a seat, or -1
 *   AEROVA_SEAT_ASSIGN.findTogether(seats, groups, slots, count) -> ["14C", "14D", ...] or null
 */
(function () {
    "use strict";

    var COLORS = ["#e0c48a", "#7cc0f0", "#7fd6a4", "#f0a3bd", "#b9a2f2", "#f2b27a", "#6fd6d2", "#e8d96a", "#c9c9c9"];

    function copy(slots) {
        return slots.slice();
    }

    /*
     * The active passenger clicks seat `label`:
     *  - free seat            -> it becomes theirs (a seat they had before is released)         action "assigned"
     *  - their own seat       -> it is released                                                 action "freed"
     *  - another passenger's  -> the two passengers swap seats when the active one has a seat   action "swapped"
     *                            otherwise nothing changes and the caller tells the user          action "owned"
     */
    function place(slots, active, label) {
        var next = copy(slots);
        var owner = next.indexOf(label);
        var previous = next[active] || null;

        if (owner === active) {
            next[active] = null;
            return { slots: next, action: "freed", owner: owner, previous: previous };
        }

        if (owner === -1) {
            next[active] = label;
            return { slots: next, action: "assigned", owner: -1, previous: previous };
        }

        if (previous) {
            next[owner] = previous;
            next[active] = label;
            return { slots: next, action: "swapped", owner: owner, previous: previous };
        }

        return { slots: next, action: "owned", owner: owner, previous: null };
    }

    /* The next passenger (after `from`, wrapping round) who has no seat yet. */
    function nextEmpty(slots, from) {
        for (var step = 1; step <= slots.length; step += 1) {
            var index = (from + step) % slots.length;
            if (!slots[index]) {
                return index;
            }
        }
        return -1;
    }

    /*
     * Seats side by side for `count` passengers: the same row, next to each other without an aisle between them. When no row of the
     * cabin has that many seats together in one block, seats of one row across the aisle are accepted. Seats that already belong to
     * this booking count as free. The block nearest to the first passenger's seat (or to the front) wins.
     */
    function findTogether(seats, groups, slots, count) {
        var mine = {};
        slots.forEach(function (label) {
            if (label) {
                mine[label] = true;
            }
        });

        var rows = {};
        seats.forEach(function (seat) {
            rows[seat.rowNumber] = rows[seat.rowNumber] || {};
            rows[seat.rowNumber][seat.letter] = seat;
        });

        var anchor = null;
        seats.forEach(function (seat) {
            if (slots[0] && seat.label === slots[0]) {
                anchor = seat.rowNumber;
            }
        });

        function usable(seat) {
            return !!seat && (seat.isAvailable || mine[seat.label]);
        }

        function windows(letters, row) {
            var found = [];
            for (var start = 0; start + count <= letters.length; start += 1) {
                var block = letters.slice(start, start + count).map(function (letter) { return rows[row][letter]; });
                if (block.every(usable)) {
                    found.push(block.map(function (seat) { return seat.label; }));
                }
            }
            return found;
        }

        function best(candidates) {
            var winner = null;
            var winnerScore = Infinity;
            candidates.forEach(function (candidate) {
                var score = anchor == null ? candidate.row : Math.abs(candidate.row - anchor) * 2 + (candidate.labels.indexOf(slots[0]) >= 0 ? -1 : 0);
                if (score < winnerScore) {
                    winnerScore = score;
                    winner = candidate.labels;
                }
            });
            return winner;
        }

        var rowNumbers = Object.keys(rows).map(Number).sort(function (a, b) { return a - b; });

        var inBlock = [];
        rowNumbers.forEach(function (row) {
            groups.forEach(function (group) {
                windows(group, row).forEach(function (labels) { inBlock.push({ row: row, labels: labels }); });
            });
        });
        if (inBlock.length) {
            return best(inBlock);
        }

        var acrossAisle = [];
        rowNumbers.forEach(function (row) {
            var letters = [].concat.apply([], groups);
            windows(letters, row).forEach(function (labels) { acrossAisle.push({ row: row, labels: labels }); });
        });
        return acrossAisle.length ? best(acrossAisle) : null;
    }

    window.AEROVA_SEAT_ASSIGN = {
        COLORS: COLORS,
        place: place,
        nextEmpty: nextEmpty,
        findTogether: findTogether
    };
})();
