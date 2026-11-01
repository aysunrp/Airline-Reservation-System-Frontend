/*
 * The flights of one trip. A one-way trip is the flight in "aerovaSelectedFlight". A round trip is chosen in two passes
 * through the same pages: the outbound flight (details, seats), then the return flight (results for the way back, details,
 * seats). When the seats of the outbound flight are saved it is kept here; when the return flight's seats are saved the
 * traveller goes on to the passenger details, where legs() gives both flights in travel order.
 *
 *   AEROVA_JOURNEY.afterSeats(selection)   -> the page to open next
 *   AEROVA_JOURNEY.legs(selection)         -> [outbound, return], or [selection]
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

    // Who travels: the same adults, children and infants on every flight of the trip.
    ["adults", "children", "infants"].forEach(function (kind) {
      if (selection[kind] != null) {
        params.set(kind, String(selection[kind]));
      }
    });
    return "flight-results.html?" + params.toString();
  }

  /* The results page for the way back: the same cabin and travellers, from where the outbound journey ended to where it began, on the return date. */
  function returnSearchUrl(first, last) {
    return resultsUrl(new URLSearchParams({
      from: last.to,
      to: first.from,
      fromCode: last.toCode || "",
      toCode: first.fromCode || "",
      departureDate: first.returnDate,
      returnDate: first.returnDate,
      passengers: String(first.passengers || "1"),
      tripType: "roundtrip",
      leg: "2"
    }), first);
  }

  function rememberResultsUrl(url) {
    try {
      sessionStorage.setItem("aerovaBookingResultsUrl", url);
    } catch (error) {
      // The back link falls back to the plain results page.
    }
  }

  function storeSelected(selection) {
    try {
      sessionStorage.setItem("aerovaSelectedFlight", JSON.stringify(selection));
    } catch (error) {
      // Storage may be unavailable.
    }
  }

  /*
   * What to open after the seats of a flight are saved. A journey with a transfer (selection.via holds its other flights) goes
   * on to the seats of its next flight first; a round trip then goes on to the return journey; everything else to the passenger
   * details. The flights of the trip with their seats are kept, in travel order, in journey.flights.
   */
  function afterSeats(selection) {
    var journey = readJourney();
    var flights = (journey.flights || []).filter(function (item) { return item.id !== selection.id; });
    var saved = Object.assign({}, selection, { journeyNo: legNumber(selection) });
    delete saved.via;
    var more = selection.via && selection.via.length ? selection.via : [];

    if (more.length) {
      flights.push(saved);
      journey.flights = flights;
      writeJourney(journey);
      var next = Object.assign({}, more[0], { via: more.slice(1) });
      storeSelected(next);
      return "seat-selection.html";
    }

    if (!isRoundTrip(selection)) {
      if (!flights.length) {
        reset();
        return "passenger-details.html";
      }

      flights.push(saved);
      journey.flights = flights;
      writeJourney(journey);
      return "passenger-details.html";
    }

    if (isReturnLeg(selection)) {
      if (!journey.outbound) {
        // The outbound flight is gone (a new tab or cleared storage): start the search again.
        return "booking.html";
      }
      flights.push(saved);
      journey.flights = flights;
      journey["return"] = saved;
      writeJourney(journey);
      return "passenger-details.html";
    }

    flights.push(saved);
    writeJourney({ flights: flights, outbound: saved });

    var url = returnSearchUrl(flights[0], saved);
    rememberResultsUrl(url);
    return url;
  }

  function legs(selection) {
    var flights = readJourney().flights || [];
    if (selection && flights.length && flights[flights.length - 1].id === selection.id) {
      return flights;
    }
    return selection ? [selection] : [];
  }

  /* True when the selection belongs to a trip whose other flights are not all there (so it cannot be booked on its own). */
  function isIncomplete(selection, activeLegs) {
    if (!selection) {
      return false;
    }
    return isReturnLeg(selection) && (activeLegs || []).length < 2;
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
   * the trip (the return flight of a round trip); with one flight it removes
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
      // The next flight of the same journey is a transfer; a flight of the other journey is the return.
      var sameJourney = flight.journeyNo != null && first.journeyNo != null && Number(flight.journeyNo) === Number(first.journeyNo);
      line.textContent = sameJourney
        ? say("api.journey.connectionLine", "Aktarma reysi: {flight}, {route}, {date}, {times}", vars)
        : say("api.journey.returnLine", "Qayıdış: {flight}, {route}, {date}, {times}", vars);

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
    isReturnLeg: isReturnLeg,
    isIncomplete: isIncomplete,
    legNumber: legNumber,
    outbound: function () { return readJourney().outbound || null; },
    reset: reset,
    afterSeats: afterSeats,
    legs: legs
  };
})();
