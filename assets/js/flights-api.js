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
  function toPageFlight(dto, airports) {
    var directory = window.AEROVA_AIRPORTS;
    var origin = directory.find(airports, dto.originCode);
    var destination = directory.find(airports, dto.destinationCode);
    var departure = directory.localTime(dto.departureAt, origin.timeZoneId);
    var arrival = directory.localTime(dto.arrivalAt, destination.timeZoneId);

    var legs = (dto.segments || []).slice().sort(function (a, b) { return a.sequenceNo - b.sequenceNo; });
    if (!legs.length) {
      legs = [{ originCode: dto.originCode, destinationCode: dto.destinationCode, departureAt: dto.departureAt, arrivalAt: dto.arrivalAt }];
    }

    var segments = legs.map(function (leg) {
      var from = directory.find(airports, leg.originCode);
      var to = directory.find(airports, leg.destinationCode);
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
    get: get
  };
})();
