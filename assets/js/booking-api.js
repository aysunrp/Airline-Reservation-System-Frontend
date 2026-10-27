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
      savedPassengerId: passenger.savedPassengerId || null,
      baggageOptionId: passenger.baggageOptionId || null,
      mealOptionId: passenger.mealOptionId || null,
      seats: seats
    };
  }

  /*
   * The passengers the traveller typed in by hand (not picked from the saved list), in the shape of a saved passenger.
   * After paying, the confirmation page offers them for the profile. A document is only included with its number and type.
   */
  function savablePassengers(bookingData) {
    return ((bookingData && bookingData.passengers) || []).filter(function (passenger) {
      return !passenger.savedPassengerId && passenger.firstName && passenger.lastName;
    }).map(function (passenger) {
      var document = passenger.document || {};
      var number = String(document.number || passenger.documentNumber || "").replace(/[\s-]/g, "").toUpperCase();
      var type = DOCUMENT_TYPES[String(document.type || passenger.documentType || "").trim().toLowerCase()] || null;
      var hasDocument = !!number && !!type;

      return {
        firstName: passenger.firstName,
        lastName: passenger.lastName,
        dateOfBirth: passenger.dateOfBirth || null,
        gender: GENDERS[String(passenger.gender || "").trim().toLowerCase()] || null,
        nationalityCode: passenger.nationalityCode || null,
        documentType: hasDocument ? type : null,
        documentNumber: hasDocument ? number : null,
        documentIssuingCountry: hasDocument ? (document.issuingCountry || null) : null,
        documentExpiryDate: hasDocument ? (document.expiryDate || passenger.documentExpiryDate || null) : null
      };
    });
  }

  /* The request the API expects, from bookingData: one flight, the two flights of a round trip, or the flights of a multi-city trip. */
  function buildRequest(bookingData) {
    if (!bookingData || !bookingData.flight || !Array.isArray(bookingData.passengers) || !bookingData.passengers.length) {
      throw new TypeError("Booking data is incomplete.");
    }

    var contact = bookingData.contact || {};
    var legs = bookingData.legs && bookingData.legs.length
      ? bookingData.legs
      : [{ flight: bookingData.flight, cabinClass: bookingData.cabinClass }];
    var chosen = bookingData.flight.tripType ? lookup(TRIP_TYPES, bookingData.flight.tripType, "trip type") : "OneWay";
    // Two to six flights chosen as a multi-city trip; two flights back and forth are a round trip.
    var tripType = legs.length > 1 ? (chosen === "MultiCity" || legs.length > 2 ? "MultiCity" : "RoundTrip") : "OneWay";

    var flightId = positiveInteger(legs[0].flight.id, "flight");

    return {
      tripType: tripType,
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
    // The page language is for the e-mail that confirms the booking; it is not part of what makes two bookings the same.
    request.language = (window.AEROVA_I18N && window.AEROVA_I18N.getLanguage && window.AEROVA_I18N.getLanguage()) || null;
    return release.then(function () {
      return window.AEROVA_API.post("api/bookings", request);
    }).then(function (booking) {
      var created = {
        fingerprint: key, id: booking.id, pnr: booking.pnr, expiresAt: booking.expiresAt, price: booking.price,
        // Each booking is confirmed by its own e-mailed link before it can be paid.
        contactConfirmed: booking.contactConfirmed !== false
      };
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(created));
      } catch (error) {
        // The booking exists; the page simply cannot be reloaded without creating it again.
      }
      return created;
    });
  }

  /* Opening the Stripe page holds the seats longer on the server; the page then counts down to that time instead. */
  function extendHold(expiresAt) {
    var held = readHeld();
    if (!held || !expiresAt) {
      return;
    }
    held.expiresAt = expiresAt;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(held));
    } catch (error) {
      // The countdown on the payment page is shorter than the real hold, nothing worse.
    }
  }

  /* The link of this booking was opened (the server said so). */
  function markConfirmed() {
    var held = readHeld();
    if (!held) {
      return;
    }
    held.contactConfirmed = true;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(held));
    } catch (error) {
      // The page asks the server again after a reload.
    }
  }

  window.AEROVA_BOOKING = {
    markConfirmed: markConfirmed,
    extendHold: extendHold,
    buildRequest: buildRequest,
    savablePassengers: savablePassengers,
    quote: quote,
    ensure: ensure,
    forget: forget,
    parseUtc: parseUtc
  };
})();
