/*
 * AEROVA API client: one place for requests to the ASP.NET Core backend.
 *
 *   AEROVA_API.get("api/airports").then(function (airports) { ... });
 *   AEROVA_API.post("api/auth/login", { email: "...", password: "..." }).catch(function (error) { error.userMessage });
 *
 * - Needs api-config.js first (base URL, timeout).
 * - Sends JSON, adds the sign-in token when there is one, and parses the backend's problem responses
 *   (400 validation, 401, 403, 404, 409, 422, 5xx) into an ApiError whose userMessage is safe to show.
 * - A request that fails is always rejected: nothing here ever answers with made-up data.
 * - The sign-in token lives in sessionStorage (cleared when the tab closes) and is only sent to the API.
 *   Passwords and card details are never stored by this file.
 */
(function () {
  "use strict";

  var api = window.AEROVA_API;
  if (!api) {
    return;
  }

  var TOKEN_KEY = "aerovaAccessToken";
  var EXPIRES_KEY = "aerovaAccessTokenExpires";
  var memory = { token: "", expires: 0 };

  /* ---------- translated messages ---------- */

  var FALLBACKS = {
    network: "Cannot reach the server. Check your connection and try again.",
    fileProtocol: "This page was opened as a file, so the browser blocks it from reaching the server. Open it at http://localhost:5500 instead.",
    timeout: "The server took too long to answer. Please try again.",
    invalid: "Some of the details are not valid. Please check them and try again.",
    unauthorized: "Please sign in to continue.",
    sessionExpired: "Your session has expired. Please sign in again.",
    forbidden: "You do not have permission to do this.",
    notFound: "We could not find what you were looking for.",
    conflict: "This was changed by someone else. Please refresh and try again.",
    businessRule: "This action is not allowed right now.",
    emailNotVerified: "Please confirm your email address before booking. Open the link we sent you, or ask for a new one in your profile.",
    rateLimited: "Too many requests. Please wait a moment and try again.",
    server: "Something went wrong on our side. Please try again later.",
    generic: "Something went wrong. Please try again."
  };

  function tr(name) {
    var key = "api.errors." + name;
    var value = typeof window.t === "function" ? window.t(key) : null;
    return value && value !== key ? value : FALLBACKS[name];
  }

  /* ---------- sign-in token ---------- */

  function readStorage(key) {
    try {
      return window.sessionStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      if (value === null) {
        window.sessionStorage.removeItem(key);
      } else {
        window.sessionStorage.setItem(key, value);
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  function readSession() {
    var token = readStorage(TOKEN_KEY) || memory.token;
    var expires = Number(readStorage(EXPIRES_KEY)) || memory.expires;
    if (!token) {
      return { token: "", expires: 0 };
    }
    if (expires && expires <= Date.now()) {
      clearSession();
      return { token: "", expires: 0 };
    }
    return { token: token, expires: expires };
  }

  /* Stores the accessToken/expiresAt of a login or register response. */
  function saveSession(authResponse) {
    var token = authResponse && authResponse.accessToken;
    if (!token) {
      return false;
    }
    // The API sends UTC times, sometimes without the "Z"; without it the browser would read them as local time.
    var expiresText = String(authResponse.expiresAt || "");
    var parsed = Date.parse(/(Z|[+-]\d\d:?\d\d)$/i.test(expiresText) ? expiresText : expiresText + "Z");
    var expires = isFinite(parsed) ? parsed : 0;
    memory = { token: token, expires: expires };
    writeStorage(TOKEN_KEY, token);
    writeStorage(EXPIRES_KEY, String(expires));
    return true;
  }

  function clearSession() {
    memory = { token: "", expires: 0 };
    writeStorage(TOKEN_KEY, null);
    writeStorage(EXPIRES_KEY, null);
  }

  function announce(name) {
    var event;
    try {
      event = new CustomEvent(name);
    } catch (error) {
      event = document.createEvent("Event");
      event.initEvent(name, false, false);
    }
    window.dispatchEvent(event);
  }

  /* ---------- errors ---------- */

  function ApiError(info) {
    this.name = "ApiError";
    this.status = info.status;
    this.code = info.code;
    this.title = info.title || "";
    this.detail = info.detail || "";
    this.errors = info.errors || {};
    this.traceId = info.traceId || "";
    this.userMessage = info.userMessage;
    this.message = info.userMessage;
  }
  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  function validationMessages(errors) {
    var seen = {};
    var list = [];
    Object.keys(errors || {}).forEach(function (field) {
      [].concat(errors[field]).forEach(function (message) {
        if (message && !seen[message]) {
          seen[message] = true;
          list.push(String(message));
        }
      });
    });
    return list;
  }

  function buildError(status, body, tokenWasSent) {
    var problem = body && typeof body === "object" ? body : {};
    var detail = typeof problem.detail === "string" ? problem.detail : "";
    var code;
    var message;

    if (status === 400) {
      code = "validation";
      var messages = validationMessages(problem.errors);
      message = messages.length ? messages.slice(0, 3).join(" ") : tr("invalid");
    } else if (status === 401) {
      code = "unauthorized";
      // A rejected token means the session ran out; without a token (e.g. login) the server explains why.
      message = tokenWasSent ? tr("sessionExpired") : (detail || tr("unauthorized"));
    } else if (status === 403) {
      code = "forbidden";
      message = tr("forbidden");
    } else if (status === 404) {
      code = "notFound";
      message = detail || tr("notFound");
    } else if (status === 409) {
      code = "conflict";
      message = detail || tr("conflict");
    } else if (status === 422) {
      code = "businessRule";
      message = detail || tr("businessRule");
      // A short reason the server names (link_expired, code_invalid...) lets a page react without reading the text.
      if (typeof problem.code === "string" && /^[a-z_]{3,40}$/.test(problem.code)) {
        code = problem.code;
      }
      // Booking before the address is confirmed: shown in the page language.
      if (/confirm your email address before booking/i.test(detail)) {
        code = "emailNotVerified";
        message = tr("emailNotVerified");
      }
    } else if (status === 429) {
      code = "rateLimited";
      message = tr("rateLimited");
    } else if (status >= 500) {
      // Server details are for the logs, not for travellers.
      code = "server";
      message = tr("server");
    } else {
      code = "http";
      message = tr("generic");
    }

    return new ApiError({
      status: status,
      code: code,
      title: problem.title,
      detail: detail,
      errors: problem.errors,
      traceId: problem.traceId,
      userMessage: message
    });
  }

  /* ---------- requests ---------- */

  function buildUrl(path, query) {
    var text = String(path || "");
    if (/^[a-z][a-z0-9+.-]*:/i.test(text) || text.indexOf("//") === 0) {
      throw new TypeError("AEROVA_API only accepts paths on its own server, e.g. \"api/airports\".");
    }
    var url = api.url(text);
    var params = [];
    Object.keys(query || {}).forEach(function (key) {
      var value = query[key];
      if (value === undefined || value === null || value === "") {
        return;
      }
      params.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(value)));
    });
    return params.length ? url + (url.indexOf("?") === -1 ? "?" : "&") + params.join("&") : url;
  }

  /*
   * options: { query: {...}, body: any, skipAuth: true, timeoutMs: 20000 }
   * Resolves with the parsed JSON (null when the response has no body); rejects with an ApiError.
   */
  function request(method, path, options) {
    var settings = options || {};
    var url;
    try {
      url = buildUrl(path, settings.query);
    } catch (error) {
      return Promise.reject(error);
    }

    var headers = { Accept: "application/json" };
    var hasBody = settings.body !== undefined && settings.body !== null;
    if (hasBody) {
      headers["Content-Type"] = "application/json";
    }
    var token = settings.skipAuth ? "" : readSession().token;
    if (token) {
      headers.Authorization = "Bearer " + token;
    }

    var timeoutMs = settings.timeoutMs || api.timeoutMs || 45000;
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timedOut = false;
    var timer = controller ? setTimeout(function () { timedOut = true; controller.abort(); }, timeoutMs) : null;

    return fetch(url, {
      method: method,
      headers: headers,
      body: hasBody ? JSON.stringify(settings.body) : undefined,
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      if (timer) { clearTimeout(timer); }
      return response.text().then(function (text) {
        var body = null;
        if (text) {
          try { body = JSON.parse(text); } catch (error) { body = null; }
        }

        if (response.ok) {
          return body;
        }

        if (response.status === 401 && token) {
          clearSession();
          announce("aerova:session-expired");
        }
        throw buildError(response.status, body, !!token);
      });
    }, function () {
      if (timer) { clearTimeout(timer); }
      throw new ApiError({
        status: 0,
        code: timedOut ? "timeout" : "network",
        // A page opened straight from the folder (file://) is always blocked by the browser: say how to open it properly.
        userMessage: tr(timedOut ? "timeout" : (window.location && window.location.protocol === "file:" ? "fileProtocol" : "network"))
      });
    });
  }

  api.ApiError = ApiError;
  api.request = request;
  api.get = function (path, options) { return request("GET", path, options); };
  api.post = function (path, body, options) { return request("POST", path, merge(options, body)); };
  api.put = function (path, body, options) { return request("PUT", path, merge(options, body)); };
  api.patch = function (path, body, options) { return request("PATCH", path, merge(options, body)); };
  api.del = function (path, options) { return request("DELETE", path, options); };
  api.session = {
    save: saveSession,
    clear: clearSession,
    isActive: function () { return !!readSession().token; },
    expiresAt: function () { return readSession().expires; }
  };

  function merge(options, body) {
    var settings = {};
    Object.keys(options || {}).forEach(function (key) { settings[key] = options[key]; });
    settings.body = body;
    return settings;
  }
})();
