/*
 * Airports from the backend (GET api/airports) and the helpers pages need around them.
 * Needs api-client.js first. Nothing here makes up airports: when the request fails, load() rejects with an ApiError.
 *
 *   AEROVA_AIRPORTS.load().then(function (airports) {
 *     var baku = AEROVA_AIRPORTS.find(airports, "Baku");   // by city or IATA code
 *     var local = AEROVA_AIRPORTS.localTime("2026-12-01T05:30:00Z", baku.timeZoneId);
 *   });
 */
(function () {
  "use strict";

  var api = window.AEROVA_API;
  var pending = null;

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  /* One request per page; a failed request is forgotten so the next call can try again. */
  function load() {
    if (!api || typeof api.get !== "function") {
      return Promise.reject(new Error("api-client.js must be loaded before airports.js."));
    }
    if (!pending) {
      pending = api.get("api/airports").then(function (airports) {
        return Array.isArray(airports) ? airports : [];
      });
      pending.catch(function () { pending = null; });
    }
    return pending;
  }

  /* The airport whose city or IATA code equals the text (case-insensitive), or null. */
  function find(airports, text) {
    var wanted = normalize(text);
    if (!wanted) {
      return null;
    }
    for (var i = 0; i < airports.length; i += 1) {
      if (normalize(airports[i].city) === wanted || normalize(airports[i].code) === wanted) {
        return airports[i];
      }
    }
    return null;
  }

  /* City names for the suggestion lists, alphabetical, each city once. */
  function cities(airports) {
    var seen = {};
    return airports
      .map(function (airport) { return airport.city; })
      .filter(function (city) {
        var key = normalize(city);
        if (!key || seen[key]) {
          return false;
        }
        seen[key] = true;
        return true;
      })
      .sort(function (a, b) { return a.localeCompare(b); });
  }

  /* Cities whose name, or whose airport code, starts with what the traveller has typed so far. */
  function suggest(airports, query) {
    var typed = normalize(query);
    if (!typed) {
      return [];
    }
    return cities(airports.filter(function (airport) {
      return normalize(airport.city).indexOf(typed) === 0 || normalize(airport.code).indexOf(typed) === 0;
    }));
  }

  /*
   * Date, clock time and UTC offset at an airport for a UTC instant from the API.
   * The API sends UTC without a "Z" in some responses, so a missing offset is read as UTC.
   * Returns { date: "2026-12-01", time: "09:30", offsetMinutes: 240, utcMinutes: 29443890 }.
   */
  function localTime(utcValue, timeZoneId) {
    var text = String(utcValue || "");
    var millis = Date.parse(/(Z|[+-]\d\d:?\d\d)$/i.test(text) ? text : text + "Z");
    if (!isFinite(millis)) {
      throw new RangeError("Not a valid date and time: " + text);
    }

    var wholeMinute = Math.floor(millis / 60000) * 60000;
    var parts = {};
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZoneId,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).formatToParts(new Date(wholeMinute)).forEach(function (part) {
      parts[part.type] = part.value;
    });

    var localAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    return {
      date: parts.year + "-" + parts.month + "-" + parts.day,
      time: parts.hour + ":" + parts.minute,
      offsetMinutes: Math.round((localAsUtc - wholeMinute) / 60000),
      utcMinutes: wholeMinute / 60000
    };
  }

  window.AEROVA_AIRPORTS = {
    load: load,
    find: find,
    cities: cities,
    suggest: suggest,
    localTime: localTime
  };
})();
