/*
 * Booking requests for the backend. Needs api-client.js first.
 * Turns the data collected by the booking pages (sessionStorage "bookingData") into a CreateBookingRequestDto,
 * asks the API for the price and creates the booking, which holds the seats until payment.
 * Nothing here invents a booking or a price: failures reject with an ApiError (or a TypeError for incomplete data).
 *
 *   AEROVA_BOOKING.ensure(bookingData).then(function (held) { held.pnr; held.expiresAt; held.price.total; });
 */
(function () {
  "use strict";

  var STORAGE_KEY = "aerovaBooking";

  var GENDERS = { "male": "Male", "female": "Female", "other": "Other", "prefer not to say": "PreferNotToSay", "prefernottosay": "PreferNotToSay" };
  var DOCUMENT_TYPES = { "passport": "Passport", "az_id_card": "NationalIdCard", "id card": "NationalIdCard" };
  var CABINS = { "economy": "Economy", "comfort": "Comfort", "business": "Business" };
  var TRIP_TYPES = { "one-way": "OneWay", "oneway": "OneWay", "one_way": "OneWay", "round-trip": "RoundTrip", "roundtrip": "RoundTrip", "multi-city": "MultiCity", "multicity": "MultiCity" };

  function lookup(table, value, label) {
    var mapped = table[String(value || "").trim().toLowerCase()];
    if (!mapped) {
      throw new TypeError("Unknown " + label + ": " + value);
    }
    return mapped;
  }

  function digits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function positiveInteger(value, label) {
    var number = Number(value);
    if (!(number > 0) || Math.floor(number) !== number) {
      throw new TypeError("Missing " + label);
    }
    return number;
  }

  function passengerRequest(passenger, flightId, legCount) {
    var document = passenger.document || {};
    var seats = [];

    // Infants travel on an adult's lap and have no seat; everyone else has one seat on every flight of the trip.
    if (passenger.passengerType !== "Infant") {
      if (passenger.assignedSeats && passenger.assignedSeats.length) {
        if (passenger.assignedSeats.length !== legCount) {
          throw new TypeError("A seat is missing for one of the flights.");
        }
        passenger.assignedSeats.forEach(function (seat) {
          seats.push({ flightId: positiveInteger(seat.flightId, "flight"), flightSeatId: positiveInteger(seat.flightSeatId, "seat") });
        });
      } else {
        seats.push({ flightId: flightId, flightSeatId: positiveInteger(passenger.assignedSeatId, "seat") });
      }
    }

    return {
      title: passenger.title,
      firstName: passenger.firstName,
      middleName: passenger.middleName || null,
      lastName: passenger.lastName,
      dateOfBirth: passenger.dateOfBirth,
      gender: lookup(GENDERS, passenger.gender, "gender"),
      nationalityCode: passenger.nationalityCode,
      documentType: lookup(DOCUMENT_TYPES, document.type || passenger.documentType, "document type"),
      documentNumber: document.number || passenger.documentNumber,
      documentIssuingCountry: document.issuingCountry,
      documentExpiryDate: document.expiryDate || passenger.documentExpiryDate || null,
      baggageOptionId: passenger.baggageOptionId || null,
      mealOptionId: passenger.mealOptionId || null,
      seats: seats
    };
  }

  /* The request the API expects, from bookingData: one flight, or the two flights of a round trip. */
  function buildRequest(bookingData) {
    if (!bookingData || !bookingData.flight || !Array.isArray(bookingData.passengers) || !bookingData.passengers.length) {
      throw new TypeError("Booking data is incomplete.");
    }

    var contact = bookingData.contact || {};
    var legs = bookingData.legs && bookingData.legs.length
      ? bookingData.legs
      : [{ flight: bookingData.flight, cabinClass: bookingData.cabinClass }];
    var tripType = legs.length > 1
      ? "RoundTrip"
      : (bookingData.flight.tripType ? lookup(TRIP_TYPES, bookingData.flight.tripType, "trip type") : "OneWay");

    if (tripType === "MultiCity" || legs.length > 2) {
      throw new TypeError("Only one-way and round trips can be booked for now.");
    }

    var flightId = positiveInteger(legs[0].flight.id, "flight");

    return {
      tripType: legs.length > 1 ? "RoundTrip" : "OneWay",
      legs: legs.map(function (leg) {
        return { flightId: positiveInteger(leg.flight.id, "flight"), cabinClass: lookup(CABINS, leg.cabinClass || bookingData.cabinClass, "cabin") };
      }),
      passengers: bookingData.passengers.map(function (passenger) { return passengerRequest(passenger, flightId, legs.length); }),
      contactEmail: contact.email,
      contactPhone: (String(contact.countryCode || "").trim() + " " + digits(contact.mobilePhone)).trim(),
      promoCode: bookingData.promoCode || null
    };
  }

  /* API timestamps are UTC and may come without the "Z". */
  function parseUtc(value) {
    var text = String(value || "");
    return new Date(/(Z|[+-]\d\d:?\d\d)$/i.test(text) ? text : text + "Z");
  }

  function fingerprint(request) {
    var text = JSON.stringify(request);
    var hash = 5381;
    for (var i = 0; i < text.length; i += 1) {
      hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
    }
    return String(hash);
  }

  function readHeld() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    } catch (error) {
      return null;
    }
  }

  function forget() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // Nothing stored.
    }
  }

  function quote(bookingData) {
    return window.AEROVA_API.post("api/bookings/quote", buildRequest(bookingData));
  }

  /*
   * Creates the booking, or returns the one already created for this same request while its hold lasts,
   * so reloading the payment page never books the same seats twice. Only the reference, the hold time and
   * the price are kept in sessionStorage: no names, documents or payment details.
   */
  function ensure(bookingData) {
    var request;
    try {
      request = buildRequest(bookingData);
    } catch (error) {
      return Promise.reject(error);
    }

    var key = fingerprint(request);
    var held = readHeld();
    if (held && held.fingerprint === key && held.expiresAt && parseUtc(held.expiresAt).getTime() > Date.now()) {
      return Promise.resolve(held);
    }

    // A hold made for different choices (other seats, baggage...) would keep those seats busy, so release it first.
    var lastName = bookingData.passengers[0].lastName;
    var release = held && held.pnr
      ? window.AEROVA_API.post("api/bookings/" + encodeURIComponent(held.pnr) + "/cancel", { lastName: lastName, reason: "Replaced by a new reservation" }).catch(function () {
        // Already expired or released: nothing to free.
      })
      : Promise.resolve();

    forget();
    return release.then(function () {
      return window.AEROVA_API.post("api/bookings", request);
    }).then(function (booking) {
      var created = { fingerprint: key, id: booking.id, pnr: booking.pnr, expiresAt: booking.expiresAt, price: booking.price };
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(created));
      } catch (error) {
        // The booking exists; the page simply cannot be reloaded without creating it again.
      }
      return created;
    });
  }

  window.AEROVA_BOOKING = {
    buildRequest: buildRequest,
    quote: quote,
    ensure: ensure,
    forget: forget,
    parseUtc: parseUtc
  };
})();
