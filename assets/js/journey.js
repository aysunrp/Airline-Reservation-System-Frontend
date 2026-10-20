/*
 * The flights of one trip. A one-way trip is the flight in "aerovaSelectedFlight". A round trip is chosen in two passes
 * through the same pages: the outbound flight (details, seats), then the return flight (results for the way back, details,
 * seats). When the outbound seats are saved the outbound selection is kept here; when the return seats are saved the traveller
 * goes on to the passenger details, where legs() gives both flights in travel order.
 *
 *   AEROVA_JOURNEY.afterSeats(selection)   -> the page to open next
 *   AEROVA_JOURNEY.legs(selection)         -> [outbound, return] or [selection]
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

  function isReturnLeg(selection) {
    return !!selection && Number(selection.leg) === 2;
  }

  /* The results page for the way back: the same cabin and travellers, from the outbound destination on the return date. */
  function returnSearchUrl(outbound) {
    var params = new URLSearchParams({
      from: outbound.to,
      to: outbound.from,
      departureDate: outbound.returnDate,
      returnDate: outbound.returnDate,
      passengers: String(outbound.passengers || "1"),
      tripType: "roundtrip",
      leg: "2"
    });

    if (outbound.cabinClass) {
      params.set("cabinClass", outbound.cabinClass);
    }

    return "flight-results.html?" + params.toString();
  }

  function afterSeats(selection) {
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
    try {
      sessionStorage.setItem("aerovaBookingResultsUrl", url);
    } catch (error) {
      // The back link falls back to the plain results page.
    }
    return url;
  }

  function legs(selection) {
    if (isRoundTrip(selection) && isReturnLeg(selection)) {
      var journey = readJourney();
      if (journey.outbound && journey["return"] && journey["return"].id === selection.id) {
        return [journey.outbound, journey["return"]];
      }
    }
    return selection ? [selection] : [];
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
   * A summary shows the first flight in its own fields. For a round trip this adds one line under `afterElementId` for the
   * return flight; with one flight it removes the line. `legs` are the booking legs ({ flight: {...} }).
   */
  function paintReturnLine(afterElementId, legs) {
    var anchor = document.getElementById(afterElementId);
    if (!anchor) {
      return;
    }

    var id = "journey-return-" + afterElementId;
    var line = document.getElementById(id);

    if (!legs || legs.length < 2) {
      if (line) {
        line.parentNode.removeChild(line);
      }
      return;
    }

    var flight = legs[1].flight || legs[1];
    if (!line) {
      line = document.createElement("p");
      line.id = id;
      line.style.margin = "0.4rem 0 0";
      line.style.fontSize = "0.88em";
      line.style.opacity = "0.85";
      anchor.parentNode.insertBefore(line, anchor.nextSibling);
    }

    line.textContent = say("api.journey.returnLine", "Return: {flight}, {route}, {date}, {times}", {
      flight: flight.flightNumber,
      route: flight.from + " \u2192 " + flight.to,
      date: flight.departureDate,
      times: flight.departure + " \u2192 " + flight.arrival
    });
  }

  /* The seats of every flight of the trip, e.g. "11A, 11B | 12C, 12D". */
  function seatsText(legs) {
    return (legs || []).map(function (leg) {
      return (leg.selectedSeats || []).join(", ");
    }).filter(Boolean).join(" | ");
  }

  /*
   * A flight card copied for the return flight: every id gets the suffix "-return" and the title is replaced. Returns the copy,
   * or null (and removes an old copy) when the booking has only one flight. The caller fills the copy by its new ids.
   */
  function ensureReturnCard(card, show, title) {
    if (!card) {
      return null;
    }

    var titleId = card.getAttribute("aria-labelledby");
    var old = card.parentNode.querySelector('[data-journey-return="' + titleId + '"]');

    if (old) {
      old.parentNode.removeChild(old);
    }

    if (!show) {
      return null;
    }

    var copy = card.cloneNode(true);
    copy.setAttribute("data-journey-return", titleId);
    copy.setAttribute("aria-labelledby", titleId + "-return");

    Array.prototype.forEach.call(copy.querySelectorAll("[id]"), function (element) {
      element.id = element.id + "-return";
    });

    var heading = copy.querySelector("#" + titleId + "-return");
    if (heading) {
      heading.removeAttribute("data-i18n");
      heading.textContent = title;
    }

    card.parentNode.insertBefore(copy, card.nextSibling);
    return copy;
  }

  window.AEROVA_JOURNEY = {
    ensureReturnCard: ensureReturnCard,
    paintReturnLine: paintReturnLine,
    seatsText: seatsText,
    isRoundTrip: isRoundTrip,
    isReturnLeg: isReturnLeg,
    outbound: function () { return readJourney().outbound || null; },
    reset: reset,
    afterSeats: afterSeats,
    legs: legs
  };
})();
