/* Shared cabin seat layouts used by seat-selection.js (booking) and seat-preview.js (read-only preview). */
window.AEROVA_SEAT_LAYOUTS = {
    Business: {
        key: "business",
        label: "Business Class", labelKey: "seats.businessClass",
        startRow: 1,
        endRow: 3,
        groups: [["A", "B"], ["C", "D"]],
        occupied: ["2B", "3C"],
        seatGap: "0.7rem",
        groupGap: "0.7rem"
    },
    Comfort: {
        key: "comfort",
        label: "Comfort", labelKey: "common.comfort",
        startRow: 5,
        endRow: 9,
        groups: [["A", "B"], ["C", "D", "E"]],
        occupied: ["6A", "7C", "8E"],
        seatGap: "0.55rem",
        groupGap: "0.55rem"
    },
    Economy: {
        key: "economy",
        label: "Economy", labelKey: "common.economy",
        startRow: 11,
        endRow: 20,
        groups: [["A", "B", "C"], ["D", "E", "F"]],
        occupied: ["12B", "14D", "16A", "18F", "19C"],
        seatGap: "0.35rem",
        groupGap: "0.35rem"
    }
};
