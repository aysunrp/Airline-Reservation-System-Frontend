/*
 * Support ticket status labels (API sends enum names in English).
 * Used on the Support page, admin support table, and notifications.
 */
(function () {
    "use strict";

    var AZ = {
        Open: "Açıq",
        InProgress: "İcradadır",
        WaitingForCustomer: "Cavabınız gözlənilir",
        Resolved: "Həll olunub"
    };

    function canonical(value) {
        var s = String(value || "").trim();
        if (!s) {
            return "";
        }
        if (Object.prototype.hasOwnProperty.call(AZ, s)) {
            return s;
        }
        var camel = {
            open: "Open",
            inprogress: "InProgress",
            waitingforcustomer: "WaitingForCustomer",
            resolved: "Resolved"
        };
        var lowered = s.replace(/\s+/g, "").toLowerCase();
        if (camel[lowered]) {
            return camel[lowered];
        }
        return s;
    }

    function label(value) {
        var key = canonical(value);
        if (AZ[key]) {
            return AZ[key];
        }
        if (typeof window.t === "function") {
            var translated = window.t("support.status." + key);
            if (translated && translated !== "support.status." + key) {
                return translated;
            }
        }
        return key.replace(/([a-z])([A-Z])/g, "$1 $2");
    }

    window.AEROVA_SUPPORT_STATUS = {
        label: label,
        canonical: canonical
    };
})();
