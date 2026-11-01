/*
 * Flights from the backend, in the shape the AEROVA pages already use (cards, filters, details, booking steps).
 * Needs api-client.js and airports.js first. Nothing here makes up flights or prices: failures reject with an ApiError.
 *
 *   AEROVA_FLIGHTS.get(1817).then(function (flight) { flight.cabinPrices.Economy; flight.segments; });
 */
(function () {
  "use strict";

  function formatDurationLabel(totalMinutes) {
    var hours = Math.floor(totalMinutes / 60);
    var minutes = totalMinutes % 60;
    return hours + "h " + (minutes < 10 ? "0" : "") + minutes + "m";
  }

  function stopsLabel(count) {
    return count === 0 ? "Non-stop" : (count === 1 ? "1 dayanacaq" : count + " Stops");
  }

  function airportInfo(airport) {
    return { code: airport.code, city: airport.city, name: airport.name, country: airport.countryCode };
  }

  /*
   * One FlightResultDto from the API (GET api/flights/{id} or an item of POST api/flights/search).
   * Times are shown where they happen: each airport's own clock, from its time zone.
   * `airports` is the list from AEROVA_AIRPORTS.load().
   */
  /* An airport that is not in the list (switched off) is shown by its code in UTC rather than breaking the whole results page. */
  function knownAirport(directory, airports, code) {
    return directory.find(airports, code) || { code: code, city: code, name: code, countryCode: "", timeZoneId: "UTC" };
  }

  function toPageFlight(dto, airports) {
    var directory = window.AEROVA_AIRPORTS;
    var origin = knownAirport(directory, airports, dto.originCode);
    var destination = knownAirport(directory, airports, dto.destinationCode);
    var departure = directory.localTime(dto.departureAt, origin.timeZoneId);
    var arrival = directory.localTime(dto.arrivalAt, destination.timeZoneId);

    var legs = (dto.segments || []).slice().sort(function (a, b) { return a.sequenceNo - b.sequenceNo; });
    if (!legs.length) {
      legs = [{ originCode: dto.originCode, destinationCode: dto.destinationCode, departureAt: dto.departureAt, arrivalAt: dto.arrivalAt }];
    }

    var segments = legs.map(function (leg) {
      var from = knownAirport(directory, airports, leg.originCode);
      var to = knownAirport(directory, airports, leg.destinationCode);
      var legDeparture = directory.localTime(leg.departureAt, from.timeZoneId);
      var legArrival = directory.localTime(leg.arrivalAt, to.timeZoneId);

      return {
        from: airportInfo(from),
        to: airportInfo(to),
        departureDate: legDeparture.date,
        departureTime: legDeparture.time,
        departureUtcOffset: legDeparture.offsetMinutes,
        arrivalDate: legArrival.date,
        arrivalTime: legArrival.time,
        arrivalUtcOffset: legArrival.offsetMinutes,
        durationMinutes: legArrival.utcMinutes - legDeparture.utcMinutes
      };
    });

    var cabinPrices = {};
    Object.keys(dto.fares || {}).forEach(function (cabin) {
      cabinPrices[cabin] = Number(dto.fares[cabin]);
    });

    var durationMinutes = arrival.utcMinutes - departure.utcMinutes;

    return {
      id: dto.id,
      instanceId: String(dto.id) + "-" + departure.date,
      airline: "AEROVA",
      flightNumber: dto.flightNumber,
      from: dto.originCity,
      to: dto.destinationCity,
      fromCode: dto.originCode,
      toCode: dto.destinationCode,
      departure: departure.time,
      arrival: arrival.time,
      duration: formatDurationLabel(durationMinutes),
      durationMinutes: durationMinutes,
      stops: stopsLabel(dto.stops),
      stopsCount: dto.stops,
      aircraft: "AEROVA " + dto.aircraftModel,
      cabinPrices: cabinPrices,
      date: departure.date,
      arrivalDate: arrival.date,
      // The same moments in UTC, to compare flights of one trip whatever airports they use.
      departureAtUtc: dto.departureAt,
      arrivalAtUtc: dto.arrivalAt,
      segments: segments
    };
  }

  /*
   * One journey with a transfer (an item of "connections" in POST api/flights/search) in the shape of a page flight, so the cards, the
   * filters and the sorting treat it like any flight: it leaves where the first flight leaves, lands where the last one lands, has one
   * stop and costs the sum of its flights. legsData keeps the page flights it is made of, transfer the airport where the passenger changes.
   */
  function toConnectionFlight(dto, airports) {
    var parts = dto.flights.map(function (flight) { return toPageFlight(flight, airports); });
    var first = parts[0];
    var last = parts[parts.length - 1];
    var departure = Date.parse(dto.departureAt.slice(-1) === "Z" ? dto.departureAt : dto.departureAt + "Z");
    var arrival = Date.parse(dto.arrivalAt.slice(-1) === "Z" ? dto.arrivalAt : dto.arrivalAt + "Z");
    var durationMinutes = Math.round((arrival - departure) / 60000);

    var cabinPrices = {};
    Object.keys(dto.fares || {}).forEach(function (cabin) {
      cabinPrices[cabin] = Number(dto.fares[cabin]);
    });

    var segments = [];
    parts.forEach(function (part) { segments = segments.concat(part.segments); });

    return Object.assign({}, first, {
      instanceId: "c" + parts.map(function (part) { return part.id; }).join("-") + "-" + first.date,
      flightNumber: parts.map(function (part) { return part.flightNumber; }).join(" + "),
      to: last.to,
      toCode: last.toCode,
      arrival: last.arrival,
      arrivalDate: last.arrivalDate,
      arrivalAtUtc: dto.arrivalAt,
      duration: formatDurationLabel(durationMinutes),
      durationMinutes: durationMinutes,
      stops: stopsLabel(1),
      stopsCount: 1,
      aircraft: parts.map(function (part) { return part.aircraft; }).filter(function (name, index, all) { return all.indexOf(name) === index; }).join(" / "),
      cabinPrices: cabinPrices,
      segments: segments,
      legsData: parts,
      transfer: { code: dto.transferCode, city: dto.transferCity, minutes: dto.transferMinutes }
    });
  }

  /* One flight by its backend id, with its fares, times at each airport and stops. */
  function get(id) {
    var airports = window.AEROVA_AIRPORTS;
    var api = window.AEROVA_API;
    var identifier = Number(id);

    if (!api || !airports || !(identifier > 0) || Math.floor(identifier) !== identifier) {
      return Promise.reject(new TypeError("A flight id and the API client are required."));
    }

    return Promise.all([airports.load(), api.get("api/flights/" + identifier)]).then(function (results) {
      return toPageFlight(results[1], results[0]);
    });
  }

  window.AEROVA_FLIGHTS = {
    toPageFlight: toPageFlight,
    toConnectionFlight: toConnectionFlight,
    get: get
  };
})();
