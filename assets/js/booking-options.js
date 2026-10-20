/*
 * Baggage and meal choices from the backend (GET api/booking-options/baggage and /meals). Needs api-client.js first.
 * "No extra baggage" and "No meal" are not options: they simply mean no option id.
 *
 *   AEROVA_OPTIONS.baggage().then(function (options) { options[0].id; options[0].name; options[0].price; });
 */
(function () {
  "use strict";

  var cache = {};

  function load(kind) {
    if (!cache[kind]) {
      cache[kind] = window.AEROVA_API.get("api/booking-options/" + kind).then(function (list) {
        return (list || []).filter(function (option) { return option.isActive !== false; });
      }, function (error) {
        cache[kind] = null;
        throw error;
      });
    }
    return cache[kind];
  }

  window.AEROVA_OPTIONS = {
    baggage: function () { return load("baggage"); },
    meals: function () { return load("meals"); }
  };
})();
