import { h } from "../core/dom.js";
import { statusLabel, statusTone } from "../core/format.js";

export function badge(text, tone = "neutral") {
    return h("span", { class: "badge" + (tone === "neutral" ? "" : " badge-" + tone), text });
}

export const statusBadge = (status) => badge(statusLabel(status), statusTone(status));
export const activeBadge = (isActive) => statusBadge(isActive ? "Active" : "Inactive");
