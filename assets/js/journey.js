/*
 * The flights of one trip. A one-way trip is the flight in "aerovaSelectedFlight". A round trip is chosen in two passes
 * through the same pages: the outbound flight (details, seats), then the return flight (results for the way back, details,
 * seats). A multi-city trip is the same idea with two to six passes, one results page per flight of the trip. When the seats
 * of a flight are saved it is kept here; when the last flight's seats are saved the traveller goes on to the passenger
 * details, where legs() gives all the flights in travel order.
 *
 *   AEROVA_JOURNEY.afterSeats(selection)   -> the page to open next
 *   AEROVA_JOURNEY.legs(selection)         -> [outbound, return], every flight of a multi-city trip, or [selection]
 */
(function () {
  "use strict";

  var KEY = "aerovaJourney";

  function readJourney() {
    try {
      var parsed = JSON.parse(sessionStorage.getItem(KEY) || "null");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function writeJourney(journey) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(journey));
      return true;
    } catch (error) {
      return false;
    }
  }

  function reset() {
    try {
      sessionStorage.removeItem(KEY);
    } catch (error) {
      // Nothing stored.
    }
  }

  /* A round trip needs its return date; without one the search is treated as one-way. */
  function isRoundTrip(selection) {
    return !!selection && /round/i.test(String(selection.tripType || "")) && !!selection.returnDate;
  }

  /* A multi-city trip carries all of its searches ({ count, segments: [{ from, to, departureDate }] }). */
  function isMultiCity(selection) {
    return !!selection && /multi/i.test(String(selection.tripType || "")) && !!selection.multi && Number(selection.multi.count) >= 2 && Array.isArray(selection.multi.segments);
  }

  /* Which flight of the trip this selection is: 1 for the outbound flight, 2 for the return flight of a round trip... */
  function legNumber(selection) {
    return Math.max(1, Number(selection && selection.leg) || 1);
  }

  function isReturnLeg(selection) {
    return isRoundTrip(selection) && legNumber(selection) === 2;
  }

  function resultsUrl(params, selection) {
    if (selection.cabinClass) {
      params.set("cabinClass", selection.cabinClass);
    }
    return "flight-results.html?" + params.toString();
  }

  /* The results page for the way back: the same cabin and travellers, from the outbound destination on the return date. */
  function returnSearchUrl(outbound) {
    return resultsUrl(new URLSearchParams({
      from: outbound.to,
      to: outbound.from,
      departureDate: outbound.returnDate,
      returnDate: outbound.returnDate,
      passengers: String(outbound.passengers || "1"),
      tripType: "roundtrip",
      leg: "2"
    }), outbound);
  }

  /* The results page for the next flight of a multi-city trip: its own from, to and date come from the stored searches. */
  function nextLegUrl(selection, next) {
    return resultsUrl(new URLSearchParams({
      tripType: "multicity",
      leg: String(next),
      segments: String(selection.multi.count),
      segmentsJson: JSON.stringify(selection.multi.segments),
      passengers: String(selection.passengers || "1")
    }), selection);
  }

  function rememberResultsUrl(url) {
    try {
      sessionStorage.setItem("aerovaBookingResultsUrl", url);
    } catch (error) {
      // The back link falls back to the plain results page.
    }
  }

  function afterMultiCitySeats(selection) {
    var number = legNumber(selection);
    var count = Number(selection.multi.count);
    var journey = number === 1 ? { multi: true, legs: [] } : readJourney();

    if (number > 1 && (!journey.multi || !Array.isArray(journey.legs) || journey.legs.length < number - 1)) {
      // An earlier flight is gone (a new tab or cleared storage): start the search again.
      return "booking.html";
    }

    // Choosing this flight again drops the flights chosen after it.
    journey.legs = journey.legs.slice(0, number - 1);
    journey.legs.push(selection);
    writeJourney(journey);

    if (number >= count) {
      return "passenger-details.html";
    }

    var url = nextLegUrl(selection, number + 1);
    rememberResultsUrl(url);
    return url;
  }

  function afterSeats(selection) {
    if (isMultiCity(selection)) {
      return afterMultiCitySeats(selection);
    }

    if (!isRoundTrip(selection)) {
      reset();
      return "passenger-details.html";
    }

    if (isReturnLeg(selection)) {
      var journey = readJourney();
      if (!journey.outbound) {
        // The outbound flight is gone (a new tab or cleared storage): start the search again.
        return "booking.html";
      }
      journey["return"] = selection;
      writeJourney(journey);
      return "passenger-details.html";
    }

    writeJourney({ outbound: selection });

    var url = returnSearchUrl(selection);
    rememberResultsUrl(url);
    return url;
  }

  function legs(selection) {
    if (isMultiCity(selection)) {
      var trip = readJourney();
      var count = Number(selection.multi.count);
      if (trip.multi && Array.isArray(trip.legs) && trip.legs.length === count && legNumber(selection) === count && trip.legs[count - 1] && trip.legs[count - 1].id === selection.id) {
        return trip.legs;
      }
      return [selection];
    }

    if (isRoundTrip(selection) && isReturnLeg(selection)) {
      var journey = readJourney();
      if (journey.outbound && journey["return"] && journey["return"].id === selection.id) {
        return [journey.outbound, journey["return"]];
      }
    }
    return selection ? [selection] : [];
  }

  /* True when the selection belongs to a trip whose other flights are not all there (so it cannot be booked on its own). */
  function isIncomplete(selection, activeLegs) {
    if (!selection) {
      return false;
    }
    if (isMultiCity(selection)) {
      return (activeLegs || []).length < Number(selection.multi.count);
    }
    return isReturnLeg(selection) && (activeLegs || []).length < 2;
  }

  /* The flight chosen just before the given flight number of a multi-city trip. */
  function previous(number) {
    var trip = readJourney();
    return trip.multi && Array.isArray(trip.legs) && number > 1 ? (trip.legs[number - 2] || null) : null;
  }

  function say(key, fallback, vars) {
    if (typeof window.t === "function") {
      var value = window.t(key, vars);
      if (value && value !== key) {
        return value;
      }
    }
    return String(fallback).replace(/\{(\w+)\}/g, function (_, name) { return vars && vars[name] != null ? String(vars[name]) : "{" + name + "}"; });
  }

  /*
   * A summary shows the first flight in its own fields. This adds one line under `afterElementId` for every other flight of
   * the trip (the return flight of a round trip, the following flights of a multi-city trip); with one flight it removes
   * the lines. `legs` are the booking legs ({ flight: {...} }).
   */
  function paintReturnLine(afterElementId, legs) {
    var anchor = document.getElementById(afterElementId);
    if (!anchor) {
      return;
    }

    var baseId = "journey-return-" + afterElementId;
    var old = document.getElementById(baseId);
    var index = 2;
    while (old) {
      old.parentNode.removeChild(old);
      old = document.getElementById(baseId + "-" + index);
      index += 1;
    }

    if (!legs || legs.length < 2) {
      return;
    }

    var first = legs[0].flight || legs[0];
    var multi = legs.length > 2 || /multi/i.test(String(first.tripType || ""));
    var after = anchor;

    legs.slice(1).forEach(function (leg, position) {
      var flight = leg.flight || leg;
      var line = document.createElement("p");
      line.id = position === 0 ? baseId : baseId + "-" + (position + 2);
      line.style.margin = "0.4rem 0 0";
      line.style.fontSize = "0.88em";
      line.style.opacity = "0.85";

      var vars = {
        n: position + 2,
        flight: flight.flightNumber,
        route: flight.from + " → " + flight.to,
        date: flight.departureDate,
        times: flight.departure + " → " + flight.arrival
      };
      line.textContent = multi
        ? say("api.journey.legLine", "Flight {n}: {flight}, {route}, {date}, {times}", vars)
        : say("api.journey.returnLine", "Return: {flight}, {route}, {date}, {times}", vars);

      after.parentNode.insertBefore(line, after.nextSibling);
      after = line;
    });
  }

  /* The seats of every flight of the trip, e.g. "11A, 11B | 12C, 12D". */
  function seatsText(legs) {
    return (legs || []).map(function (leg) {
      return (leg.selectedSeats || []).join(", ");
    }).filter(Boolean).join(" | ");
  }

  /*
   * Flight cards copied for the other flights of the trip. The first copy gets the id suffix "-return", the next ones "-leg3",
   * "-leg4"...; the title of each is titleFor(its flight number). Old copies are removed. Returns [{ element, suffix }] (empty
   * when the booking has only one flight); the caller fills each copy by its ids.
   */
  function ensureLegCards(card, count, titleFor) {
    if (!card) {
      return [];
    }

    var titleId = card.getAttribute("aria-labelledby");
    Array.prototype.forEach.call(card.parentNode.querySelectorAll('[data-journey-return="' + titleId + '"]'), function (old) {
      old.parentNode.removeChild(old);
    });

    var made = [];
    var after = card;

    for (var index = 0; index < count; index += 1) {
      var suffix = index === 0 ? "-return" : "-leg" + (index + 2);
      var copy = card.cloneNode(true);
      copy.setAttribute("data-journey-return", titleId);
      copy.setAttribute("aria-labelledby", titleId + suffix);

      Array.prototype.forEach.call(copy.querySelectorAll("[id]"), function (element) {
        element.id = element.id + suffix;
      });

      var heading = copy.querySelector("#" + titleId + suffix);
      if (heading) {
        heading.removeAttribute("data-i18n");
        heading.textContent = titleFor(index + 2);
      }

      after.parentNode.insertBefore(copy, after.nextSibling);
      after = copy;
      made.push({ element: copy, suffix: suffix });
    }

    return made;
  }

  /* One copy for the return flight of a round trip (the title is the same text for it). */
  function ensureReturnCard(card, show, title) {
    var made = ensureLegCards(card, show ? 1 : 0, function () { return title; });
    return made.length ? made[0].element : null;
  }

  window.AEROVA_JOURNEY = {
    ensureReturnCard: ensureReturnCard,
    ensureLegCards: ensureLegCards,
    paintReturnLine: paintReturnLine,
    seatsText: seatsText,
    isRoundTrip: isRoundTrip,
    isMultiCity: isMultiCity,
    isReturnLeg: isReturnLeg,
    isIncomplete: isIncomplete,
    legNumber: legNumber,
    outbound: function () { return readJourney().outbound || null; },
    previous: previous,
    reset: reset,
    afterSeats: afterSeats,
    legs: legs
  };
})();
