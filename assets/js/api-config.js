/* AEROVA API configuration (shared by features that call the ASP.NET Core backend). */
(function () {
  "use strict";

  var existing = window.AEROVA_API || {};

  window.AEROVA_API = {
    /* Local development API (AerovaAPI launch profile "http"). Change for deployment. */
    baseUrl: existing.baseUrl || "http://localhost:5080",
    chatPath: existing.chatPath || "/api/chat",
    timeoutMs: existing.timeoutMs || 45000,
    /* Temporary: pages may fall back to their built-in mock data ONLY when this is true (and must say so on screen). */
    useMock: existing.useMock === true,
    url: function (path) {
      return this.baseUrl.replace(/\/+$/, "") + "/" + String(path || "").replace(/^\/+/, "");
    }
  };
})();
