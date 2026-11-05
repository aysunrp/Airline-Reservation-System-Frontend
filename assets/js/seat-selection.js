(function () {
    function tr(key, fallback, vars) {
        if (typeof window.t === "function") {
            var value = window.t(key, vars);
            if (value && value !== key) return value;
        }
        return fallback;
    }

    /* tr() with the {name} placeholders filled in (the fallback text is not interpolated by tr itself). */
    function say(key, fallback, vars) {
        return String(tr(key, fallback, vars)).replace(/\{(\w+)\}/g, function (_, name) {
            return vars && vars[name] != null ? String(vars[name]) : "{" + name + "}";
        });
    }

    var MONTH_NAMES = [
        "Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun",
        "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"
    ];

    /* Cabin layouts live in seat-layouts.js so the home-page seat preview renders the same cabins. */
    var CABIN_LAYOUTS = window.AEROVA_SEAT_LAYOUTS;
    var ASSIGN = window.AEROVA_SEAT_ASSIGN;

    /*
     * slots[i] is the seat of passenger i + 1 on this flight (or null). selectedSeats is the same list without the gaps, in passenger
     * order: that is the list the booking later reads, passenger 1 first, so it keeps the format the earlier page version saved.
     */
    var slots = [];
    var selectedSeats = [];
    var activeIndex = 0;
    var requiredSeats = 1;
    var activeLayout = CABIN_LAYOUTS.Economy;

    var currentFlightData = null;
    var seatList = null;
    var seatIdByLabel = {};
    var statusSpec = null;
    var checking = false;

    function normalizeText(value) {
        return String(value || "").trim().toLowerCase();
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function syncDerived() {
        selectedSeats = slots.filter(Boolean);
    }

    function colorOf(index) {
        return ASSIGN.COLORS[index % ASSIGN.COLORS.length];
    }

    /* "1-ci", "2-ci", "3-cü"... (Azerbaijani ordinal suffixes). */
    function ordinal(number) {
        var suffixes = { 1: "ci", 2: "ci", 3: "cü", 4: "cü", 5: "ci", 6: "cı", 7: "ci", 8: "ci", 9: "cu", 10: "cu" };
        return number + "-" + (suffixes[number] || "ci");
    }

    function firstMissing() {
        for (var index = 0; index < requiredSeats; index += 1) {
            if (!slots[index]) {
                return index;
            }
        }
        return -1;
    }

    function formatDisplayDate(dateValue) {
        if (!dateValue) {
            return tr("seats.dateNotSelected", "Tarix seçilməyib");
        }

        var parts = String(dateValue).split("-");
        if (parts.length !== 3) {
            return dateValue;
        }

        var year = Number(parts[0]);
        var month = Number(parts[1]);
        var day = Number(parts[2]);

        if (!year || !month || !day || month < 1 || month > 12) {
            return dateValue;
        }

        return (day < 10 ? "0" + day : day) + "." + (month < 10 ? "0" + month : month) + "." + year;
    }

    function readSelectedFlight() {
        try {
            var raw = sessionStorage.getItem("aerovaSelectedFlight");
            if (!raw) {
                return null;
            }

            var parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    function resolveCabinLayout(cabinValue) {
        var normalized = normalizeText(cabinValue);

        if (normalized === "business" || normalized === "business class") {
            return CABIN_LAYOUTS.Business;
        }

        if (normalized === "comfort") {
            return CABIN_LAYOUTS.Comfort;
        }

        return CABIN_LAYOUTS.Economy;
    }

    /* The backend takes up to 9 travellers on one booking. */
    function resolvePassengerCount(flightData) {
        var count = Number(flightData && flightData.passengers);

        if (!count || count < 1) {
            return 1;
        }

        if (count > 9) {
            return 9;
        }

        return Math.floor(count);
    }

    function normalizeStoredSeats(flightData) {
        if (!flightData) {
            return [];
        }

        if (Array.isArray(flightData.selectedSeats)) {
            return flightData.selectedSeats
                .map(function (seat) {
                    return String(seat || "").trim();
                })
                .filter(function (seat) {
                    return !!seat;
                });
        }

        if (flightData.selectedSeat) {
            return [String(flightData.selectedSeat).trim()].filter(Boolean);
        }

        return [];
    }

    /*
     * Restores the earlier choice (back button, refresh) when it was made for this flight and cabin. Each seat stays with its passenger
     * (gaps stay gaps). Seats that are gone or taken since are dropped and returned in `lost` with their passenger.
     */
    function restoreSeats(storedSeats, flightData, flightId, cabin, seats) {
        var result = { slots: new Array(requiredSeats).fill(null), lost: [] };

        if (!flightData || flightData.seatsFlightId !== flightId || flightData.seatsCabin !== cabin) {
            return result;
        }

        var perPassenger = Array.isArray(flightData.seatAssignments) && flightData.seatAssignments.length === requiredSeats
            ? flightData.seatAssignments.map(function (label) { return label ? String(label) : null; })
            : storedSeats.slice(0, requiredSeats);

        var free = {};
        seats.forEach(function (seat) {
            if (seat.isAvailable) {
                free[seat.label] = true;
            }
        });

        var seen = {};
        perPassenger.forEach(function (label, index) {
            if (!label) {
                return;
            }
            if (!free[label] || seen[label]) {
                result.lost.push({ index: index, label: label });
                return;
            }
            seen[label] = true;
            result.slots[index] = label;
        });

        return result;
    }

    function cabinClassForLayout(layout) {
        return layout === CABIN_LAYOUTS.Business ? "Business" : (layout === CABIN_LAYOUTS.Comfort ? "Comfort" : "Economy");
    }

    function setText(id, value) {
        var element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    /* kind: "info" (default), "warn" (something needs the traveller's attention, announced at once). */
    function showMessage(text, kind) {
        var message = document.getElementById("seat-selection-message");
        if (!message) {
            return;
        }

        message.textContent = text || "";
        message.hidden = !text;
        message.setAttribute("data-kind", kind || "info");
        message.setAttribute("aria-live", kind === "warn" ? "assertive" : "polite");
    }

    function updateContinueAvailability() {
        var continueButton = document.getElementById("continue-button") ||
            document.querySelector(".continue-button");
        if (!continueButton) {
            return;
        }

        var ready = selectedSeats.length === requiredSeats && !checking;
        continueButton.disabled = !ready;
        continueButton.setAttribute("aria-disabled", ready ? "false" : "true");
    }

    /* The one line that says who still needs a seat, with a button that jumps to that passenger. */
    function paintMissing() {
        var box = document.getElementById("seat-missing");
        var text = document.getElementById("seat-missing-text");
        var jump = document.getElementById("seat-missing-jump");
        if (!box || !text || !jump) {
            return;
        }

        var missing = [];
        for (var index = 0; index < requiredSeats; index += 1) {
            if (!slots[index]) {
                missing.push(index);
            }
        }

        if (!missing.length || !seatList) {
            box.hidden = true;
            return;
        }

        box.hidden = false;
        if (requiredSeats === 1) {
            text.textContent = say("seats.validation", "Hər sərnişin üçün oturacaq seçin.");
            jump.hidden = true;
            return;
        }

        var names = missing.slice(0, 3).map(function (index) { return say("seats.passengerN", "Sərnişin {n}", { n: index + 1 }); }).join(", ");
        text.textContent = missing.length > 3
            ? say("api.seats.missingMany", "{names} və daha {count} sərnişin üçün yer seçilməyib.", { names: names, count: missing.length - 3 })
            : say("api.seats.missingSome", "{names} üçün yer seçilməyib.", { names: names });
        jump.hidden = false;
        jump.textContent = say("api.seats.jumpTo", "{name}-ə keç", { name: say("seats.passengerN", "Sərnişin {n}", { n: missing[0] + 1 }) });
        jump.setAttribute("data-index", String(missing[0]));
    }

    function updateSelectedSeatSummary() {
        syncDerived();
        var seatsLabel = requiredSeats === 1 ? tr("seats.selectedSeat", "Seçilmiş oturacaq") : tr("seats.selectedSeats", "Seçilmiş oturacaqlar");
        setText("selected-seat-label", seatsLabel);
        setText(
            "selected-seat-value",
            selectedSeats.length ? selectedSeats.join(", ") : tr("seats.noSeat", "Oturacaq seçilməyib")
        );
        setText(
            "seat-progress",
            tr("seats.ofSelected", selectedSeats.length + " of " + requiredSeats + " seats selected", { selected: selectedSeats.length, total: requiredSeats })
        );
        setText("selected-seat-price", tr("seats.priceIncluded", "Daxildir"));
        paintAssignments();
        paintMissing();
        updateContinueAvailability();
    }

    /* The summary under the map: "Sərnişin 1 — 14C", "Sərnişin 2 — seçilməyib" (sticky, so it stays in view while the map scrolls). */
    function paintAssignments() {
        var list = document.getElementById("seat-assignments");
        var info = document.querySelector(".seat-info");
        if (info) {
            info.classList.toggle("seat-info--multi", requiredSeats > 1);
        }
        if (!list) {
            return;
        }

        list.innerHTML = "";
        if (requiredSeats < 2) {
            list.hidden = true;
            return;
        }

        list.hidden = false;
        for (var index = 0; index < requiredSeats; index += 1) {
            var item = document.createElement("li");
            var seat = slots[index];
            item.className = "seat-assignment" + (seat ? " is-chosen" : "") + (index === activeIndex ? " is-active" : "");
            item.style.setProperty("--pax-color", colorOf(index));

            var dot = document.createElement("span");
            dot.className = "seat-assignment-dot";
            dot.setAttribute("aria-hidden", "true");
            dot.textContent = String(index + 1);

            var label = document.createElement("span");
            label.textContent = say("seats.passengerN", "Sərnişin {n}", { n: index + 1 }) + " — " + (seat || say("api.seats.notChosenShort", "seçilməyib"));

            item.appendChild(dot);
            item.appendChild(label);
            list.appendChild(item);
        }
    }

    /*
     * On the return flight of a round trip the outbound seats are shown for reference only: they belong to the other flight and are
     * never picked here. The same seat numbers can be chosen again when they are free on this flight.
     */
    function paintOutboundNote() {
        var note = document.getElementById("seat-outbound-note");
        var journey = window.AEROVA_JOURNEY;
        if (!note) {
            return;
        }

        var outbound = journey && currentFlightData && journey.isReturnLeg(currentFlightData) ? journey.outbound() : null;
        var seats = outbound && Array.isArray(outbound.selectedSeats) ? outbound.selectedSeats.join(", ") : "";
        note.hidden = !seats;
        note.textContent = seats
            ? say("api.journey.outboundSeatsNote", "Gediş oturacaqlarınız ({seats}) gediş reysində qalır. Qayıdış oturacaqlarını burada seçin; bu reysdə boşdursa, eyni nömrələri də seçə bilərsiniz.", { seats: seats })
            : "";
    }

    /* Same keys and formats as before, plus seatAssignments (the seat of each passenger, gaps included) so a refresh keeps who sits where. */
    function persistSelectedSeats(flightData) {
        var baseData = flightData && typeof flightData === "object" ? flightData : {};
        var cabin = cabinClassForLayout(activeLayout);
        syncDerived();

        var updated = Object.assign({}, baseData, {
            selectedSeats: selectedSeats.slice(),
            selectedSeatIds: selectedSeats.map(function (label) { return seatIdByLabel[label]; }),
            selectedSeat: selectedSeats.length === 1 ? selectedSeats[0] : selectedSeats.join(", "),
            seatAssignments: slots.slice(),
            passengers: String(requiredSeats),
            cabinClass: cabin,
            seatsCabin: cabin,
            seatsFlightId: Number(baseData.id)
        });

        try {
            sessionStorage.setItem("aerovaSelectedFlight", JSON.stringify(updated));
        } catch (error) {
            // Storage may be unavailable.
        }
    }

    function populateFlightSummary(flightData, layout) {
        var flight = flightData || {};

        var title = document.querySelector(".seat-title");
        if (title && window.AEROVA_JOURNEY && window.AEROVA_JOURNEY.isRoundTrip(flight)) {
            title.textContent = window.AEROVA_JOURNEY.isReturnLeg(flight)
                ? tr("api.journey.seatsReturn", "Qayıdış yerlərini seçin")
                : tr("api.journey.seatsOutbound", "Gediş yerlərini seçin");
        }

        setText("summary-airline", flight.airline || "AEROVA");
        setText("summary-flight", flight.flightNumber || "—");
        setText("summary-route", flight.from && flight.to ? flight.from + " → " + flight.to : "—");
        setText("summary-date", flight.departureDate ? formatDisplayDate(flight.departureDate) : "—");
        setText("summary-times", flight.departure && flight.arrival ? flight.departure + " → " + flight.arrival : "—");
        setText("summary-aircraft", flight.aircraft || "—");
        setText("summary-cabin", (layout.labelKey && typeof tr === "function") ? tr(layout.labelKey, layout.label) : layout.label);
    }

    function buildColumnHeaders(groups) {
        var markup = "";

        groups.forEach(function (group, groupIndex) {
            group.forEach(function (letter) {
                markup += "<span>" + escapeHtml(letter) + "</span>";
            });

            if (groupIndex < groups.length - 1) {
                markup += '<span class="seat-columns-aisle"></span>';
            }
        });

        return markup;
    }

    /* The cabin's visual groups (aisles), plus any seat letter the layout does not know. */
    function seatGroups(layout, seats) {
        var known = {};
        layout.groups.forEach(function (group) {
            group.forEach(function (letter) {
                known[letter] = true;
            });
        });

        var extra = [];
        seats.forEach(function (seat) {
            if (!known[seat.letter] && extra.indexOf(seat.letter) === -1) {
                extra.push(seat.letter);
            }
        });

        return extra.length ? layout.groups.concat([extra.sort()]) : layout.groups;
    }

    function createSeatButton(seat) {
        var seatId = seat.label;
        var isOccupied = !seat.isAvailable;
        var button = document.createElement("button");
        button.type = "button";
        button.className = "seat " + (isOccupied ? "seat--occupied" : "seat--available");
        button.setAttribute("data-seat", seatId);
        button.setAttribute("data-seat-id", String(seat.id));

        var text = document.createElement("span");
        text.className = "seat-text";
        text.textContent = seatId;
        button.appendChild(text);

        if (seat.isExtraLegroom) {
            button.title = tr("api.seats.extraLegroom", "Əlavə ayaq yeri");
            button.setAttribute("data-legroom", "true");
        }

        if (isOccupied) {
            button.disabled = true;
            button.setAttribute("aria-label", say("api.seats.occupiedAria", "{id}, məşğul", { id: seatId }));
        } else {
            var badge = document.createElement("span");
            badge.className = "seat-badge";
            badge.setAttribute("aria-hidden", "true");
            badge.hidden = true;
            button.appendChild(badge);
            button.setAttribute("aria-pressed", "false");
        }

        return button;
    }

    /* Colours, passenger numbers and screen-reader names of the seats follow `slots`. */
    function syncSeatButtonStates() {
        var map = document.getElementById("seat-map");
        if (!map) {
            return;
        }

        var activeSeat = slots[activeIndex] || null;

        map.querySelectorAll(".seat").forEach(function (seatButton) {
            if (seatButton.classList.contains("seat--occupied") || seatButton.disabled) {
                return;
            }

            var seatId = seatButton.getAttribute("data-seat");
            var owner = slots.indexOf(seatId);
            var isSelected = owner !== -1;
            var badge = seatButton.querySelector(".seat-badge");

            seatButton.classList.toggle("seat--selected", isSelected);
            seatButton.classList.toggle("seat--available", !isSelected);
            seatButton.classList.toggle("seat--mine", isSelected && owner === activeIndex);
            seatButton.setAttribute("aria-pressed", isSelected ? "true" : "false");

            if (isSelected && requiredSeats > 1) {
                seatButton.style.setProperty("--pax-color", colorOf(owner));
                if (badge) {
                    badge.hidden = false;
                    badge.textContent = String(owner + 1);
                }
                seatButton.setAttribute("aria-label", owner === activeIndex
                    ? say("api.seats.ariaOwnActive", "{id}, {ord} sərnişinin yeri, boşaltmaq üçün bas", { id: seatId, ord: ordinal(owner + 1) })
                    : say("api.seats.ariaOwnOther", "{id}, {ord} sərnişinin yeri, aktiv sərnişinlə dəyişmək üçün bas", { id: seatId, ord: ordinal(owner + 1) }));
            } else {
                seatButton.style.removeProperty("--pax-color");
                if (badge) {
                    badge.hidden = true;
                    badge.textContent = "";
                }

                if (isSelected) {
                    seatButton.setAttribute("aria-label", say("api.seats.ariaSelectedSingle", "{id}, seçilib, ləğv etmək üçün bas", { id: seatId }));
                } else if (requiredSeats > 1) {
                    seatButton.setAttribute("aria-label", say("api.seats.ariaFreeFor", "{id}, boş, {ord} sərnişin üçün seç", { id: seatId, ord: ordinal(activeIndex + 1) }) +
                        (activeSeat ? say("api.seats.ariaReplace", " (köhnə yeri {seat} boşalacaq)", { seat: activeSeat }) : ""));
                } else {
                    seatButton.setAttribute("aria-label", say("api.seats.ariaFreeSingle", "{id}, boş, seç", { id: seatId }));
                }
            }
        });
    }

    /* The seats, their numbers and who has them come from the API; the layout only places the aisles. */
    function renderSeatMap(layout, seats) {
        var cabin = document.getElementById("aircraft-cabin");
        var columns = document.getElementById("seat-columns");
        var map = document.getElementById("seat-map");
        var sectionLabel = document.getElementById("cabin-section-label");

        if (!cabin || !columns || !map) {
            return;
        }

        cabin.setAttribute("data-layout", layout.key);
        cabin.setAttribute("data-multi", requiredSeats > 1 ? "true" : "false");
        cabin.style.setProperty("--seat-gap", layout.seatGap);
        cabin.style.setProperty("--group-gap", layout.groupGap);

        if (sectionLabel) {
            sectionLabel.textContent = tr(layout.labelKey, layout.label);
        }

        var groups = seatGroups(layout, seats);
        columns.innerHTML = buildColumnHeaders(groups);
        map.innerHTML = "";

        var rows = {};
        seats.forEach(function (seat) {
            rows[seat.rowNumber] = rows[seat.rowNumber] || {};
            rows[seat.rowNumber][seat.letter] = seat;
        });

        Object.keys(rows).map(Number).sort(function (a, b) { return a - b; }).forEach(function (row) {
            var rowElement = document.createElement("div");
            rowElement.className = "seat-row";

            var rowNumber = document.createElement("span");
            rowNumber.className = "row-number";
            rowNumber.textContent = String(row);
            rowElement.appendChild(rowNumber);

            groups.forEach(function (group, groupIndex) {
                var groupElement = document.createElement("div");
                groupElement.className = "seat-group";
                groupElement.style.gridTemplateColumns = "repeat(" + group.length + ", var(--seat-size))";

                group.forEach(function (letter) {
                    var seat = rows[row][letter];
                    if (seat) {
                        groupElement.appendChild(createSeatButton(seat));
                    } else {
                        var gap = document.createElement("span");
                        gap.className = "seat-placeholder";
                        gap.setAttribute("aria-hidden", "true");
                        groupElement.appendChild(gap);
                    }
                });

                rowElement.appendChild(groupElement);

                if (groupIndex < groups.length - 1) {
                    var aisle = document.createElement("div");
                    aisle.className = "seat-aisle";
                    aisle.setAttribute("aria-hidden", "true");
                    rowElement.appendChild(aisle);
                }
            });

            map.appendChild(rowElement);
        });

        syncSeatButtonStates();
    }

    /* ----- the passengers panel (two or more travellers) ----- */

    function passengerKind(index) {
        var adults = Number(currentFlightData && currentFlightData.adults);
        var children = Number(currentFlightData && currentFlightData.children);
        if (adults >= 0 && children >= 0 && adults + children === requiredSeats) {
            return index < adults ? tr("common.adult", "Böyük") : tr("common.child", "Uşaq");
        }
        return "";
    }

    function buildPanel() {
        var panel = document.getElementById("seat-passengers");
        var list = document.getElementById("pax-list");
        if (!panel || !list) {
            return;
        }

        panel.hidden = requiredSeats < 2;
        list.innerHTML = "";
        if (requiredSeats < 2) {
            return;
        }

        for (var index = 0; index < requiredSeats; index += 1) {
            var item = document.createElement("div");
            item.className = "pax-item";
            item.style.setProperty("--pax-color", colorOf(index));

            var card = document.createElement("button");
            card.type = "button";
            card.className = "pax-card";
            card.setAttribute("role", "radio");
            card.setAttribute("data-index", String(index));

            var number = document.createElement("span");
            number.className = "pax-num";
            number.setAttribute("aria-hidden", "true");
            number.textContent = String(index + 1);

            var meta = document.createElement("span");
            meta.className = "pax-meta";
            var name = document.createElement("span");
            name.className = "pax-name";
            name.textContent = say("seats.passengerN", "Sərnişin {n}", { n: index + 1 });
            var kind = document.createElement("span");
            kind.className = "pax-kind";
            kind.textContent = passengerKind(index);
            meta.appendChild(name);
            meta.appendChild(kind);

            var seat = document.createElement("span");
            seat.className = "pax-seat";

            card.appendChild(number);
            card.appendChild(meta);
            card.appendChild(seat);

            var clear = document.createElement("button");
            clear.type = "button";
            clear.className = "pax-clear";
            clear.setAttribute("data-index", String(index));
            clear.textContent = "×";

            item.appendChild(card);
            item.appendChild(clear);
            list.appendChild(item);
        }

        setText("seat-passengers-title", tr("api.seats.panelTitle", "Sərnişinlər"));
        paintPanel();
    }

    function paintPanel() {
        var list = document.getElementById("pax-list");
        if (!list || requiredSeats < 2) {
            return;
        }

        Array.prototype.forEach.call(list.querySelectorAll(".pax-item"), function (item, index) {
            var card = item.querySelector(".pax-card");
            var seat = slots[index];
            var isActive = index === activeIndex;
            var clear = item.querySelector(".pax-clear");

            item.classList.toggle("is-active", isActive);
            item.classList.toggle("has-seat", !!seat);
            card.setAttribute("aria-checked", isActive ? "true" : "false");
            card.tabIndex = isActive ? 0 : -1;
            card.querySelector(".pax-seat").textContent = seat || say("api.seats.notChosen", "Yer seçilməyib");
            card.setAttribute("aria-label", say("seats.passengerN", "Sərnişin {n}", { n: index + 1 }) + ", " +
                (seat ? say("api.seats.cardSeat", "yeri {seat}", { seat: seat }) : say("api.seats.notChosen", "Yer seçilməyib")) +
                (isActive ? ", " + say("api.seats.cardActive", "seçilir") : ""));

            clear.hidden = !seat;
            clear.setAttribute("aria-label", say("api.seats.clearAria", "{name} üçün {seat} yerini boşalt", {
                name: say("seats.passengerN", "Sərnişin {n}", { n: index + 1 }),
                seat: seat || ""
            }));
            clear.title = say("api.seats.clearTitle", "Yeri boşalt");
        });

        /* On a narrow screen the cards scroll sideways: keep the passenger being seated in view. */
        var activeItem = list.querySelectorAll(".pax-item")[activeIndex];
        if (activeItem && list.scrollWidth > list.clientWidth) {
            list.scrollLeft = Math.max(0, activeItem.offsetLeft - (list.clientWidth - activeItem.offsetWidth) / 2);
        }

        var hint = document.getElementById("seat-passengers-hint");
        if (hint) {
            hint.textContent = say("api.seats.panelHint", "{name} üçün yer seçirsiniz. Boş yerə basın; sonra növbəti sərnişinə keçilir. Rəngli rəqəm yerin kimə aid olduğunu göstərir.", {
                name: say("seats.passengerN", "Sərnişin {n}", { n: activeIndex + 1 })
            });
        }

        var together = document.getElementById("seat-together");
        if (together) {
            together.disabled = !seatList;
        }
    }

    function repaintAll() {
        syncSeatButtonStates();
        paintPanel();
        updateSelectedSeatSummary();
    }

    function setActive(index, focusCard) {
        if (index < 0 || index >= requiredSeats) {
            return;
        }
        activeIndex = index;
        repaintAll();
        if (focusCard) {
            var card = document.querySelector('#pax-list .pax-card[data-index="' + index + '"]');
            if (card) {
                card.focus();
            }
        }
    }

    /* ----- choosing seats ----- */

    function chooseSeat(seatId, flightData) {
        var result = ASSIGN.place(slots, activeIndex, seatId);
        var who = function (index) { return ordinal(index + 1); };

        if (result.action === "owned") {
            /* The seat is another passenger's: nothing is taken from them. Switch to them so the traveller can see and change it. */
            activeIndex = result.owner;
            showMessage(say("api.seats.ownedBy", "{seat} yeri {ord} sərnişinə aiddir və ondan alınmadı. İndi onun üçün başqa yer seçə və ya yerini boşalda bilərsiniz.", { seat: seatId, ord: who(result.owner) }), "warn");
            repaintAll();
            return;
        }

        slots = result.slots;

        if (result.action === "swapped") {
            showMessage(say("api.seats.swapped", "{a} və {b} sərnişinin yerləri dəyişdirildi: {seatA} ↔ {seatB}.", {
                a: who(activeIndex), b: who(result.owner), seatA: slots[activeIndex], seatB: slots[result.owner]
            }));
        } else if (result.action === "assigned" && requiredSeats > 1) {
            showMessage("");
            var next = ASSIGN.nextEmpty(slots, activeIndex);
            if (next !== -1) {
                activeIndex = next;
            }
        } else {
            showMessage("");
        }

        syncDerived();
        repaintAll();
        persistSelectedSeats(flightData);
    }

    function clearPassenger(index, flightData) {
        if (!slots[index]) {
            return;
        }
        slots[index] = null;
        activeIndex = index;
        showMessage("");
        repaintAll();
        persistSelectedSeats(flightData);
    }

    function seatTogether(flightData) {
        if (!seatList || requiredSeats < 2) {
            return;
        }

        var found = ASSIGN.findTogether(seatList, seatGroups(activeLayout, seatList), slots, requiredSeats);
        if (!found) {
            showMessage(say("api.seats.noTogether", "Bu salonda {count} nəfər üçün yanaşı boş yer tapılmadı. Yerləri əl ilə seçə bilərsiniz.", { count: requiredSeats }), "warn");
            return;
        }

        slots = found.slice();
        activeIndex = 0;
        showMessage(say("api.seats.together", "Yanaşı yerlər: {seats}. İstəsəniz hər sərnişinin yerini ayrıca dəyişə bilərsiniz.", { seats: found.join(", ") }));
        repaintAll();
        persistSelectedSeats(flightData);
    }

    function bindSeatInteractions(flightData) {
        var map = document.getElementById("seat-map");
        if (!map) {
            return;
        }

        map.addEventListener("click", function (event) {
            var seatButton = event.target.closest(".seat");
            if (!seatButton || !map.contains(seatButton) || seatButton.disabled || seatButton.classList.contains("seat--occupied")) {
                return;
            }

            var seatId = seatButton.getAttribute("data-seat");
            if (seatId) {
                chooseSeat(seatId, flightData);
            }
        });

        var list = document.getElementById("pax-list");
        if (list) {
            list.addEventListener("click", function (event) {
                var clear = event.target.closest(".pax-clear");
                if (clear) {
                    clearPassenger(Number(clear.getAttribute("data-index")), flightData);
                    var card = list.querySelector('.pax-card[data-index="' + clear.getAttribute("data-index") + '"]');
                    if (card) {
                        card.focus();
                    }
                    return;
                }

                var pick = event.target.closest(".pax-card");
                if (pick) {
                    setActive(Number(pick.getAttribute("data-index")), false);
                }
            });

            /* Arrow keys move between passengers; Delete frees the focused passenger's seat. */
            list.addEventListener("keydown", function (event) {
                var card = event.target.closest(".pax-card");
                if (!card) {
                    return;
                }

                var index = Number(card.getAttribute("data-index"));
                var target = null;
                if (event.key === "ArrowRight" || event.key === "ArrowDown") target = (index + 1) % requiredSeats;
                else if (event.key === "ArrowLeft" || event.key === "ArrowUp") target = (index - 1 + requiredSeats) % requiredSeats;
                else if (event.key === "Home") target = 0;
                else if (event.key === "End") target = requiredSeats - 1;

                if (target !== null) {
                    event.preventDefault();
                    setActive(target, true);
                } else if (event.key === "Delete" || event.key === "Backspace") {
                    event.preventDefault();
                    clearPassenger(index, flightData);
                    card.focus();
                }
            });
        }

        var together = document.getElementById("seat-together");
        if (together) {
            together.addEventListener("click", function () { seatTogether(flightData); });
        }

        var clearAll = document.getElementById("seat-clear-all");
        if (clearAll) {
            clearAll.addEventListener("click", function () {
                slots = new Array(requiredSeats).fill(null);
                activeIndex = 0;
                showMessage("");
                repaintAll();
                persistSelectedSeats(flightData);
            });
        }

        var jump = document.getElementById("seat-missing-jump");
        if (jump) {
            jump.addEventListener("click", function () {
                var index = Number(jump.getAttribute("data-index"));
                setActive(index, false);
                var panel = document.getElementById("seat-passengers");
                if (panel && !panel.hidden && panel.scrollIntoView) {
                    panel.scrollIntoView({ block: "center", behavior: "smooth" });
                }
            });
        }
    }

    /* ----- continuing, and seats that were taken meanwhile ----- */

    function getRemainingSeatsMessage() {
        var remaining = requiredSeats - selectedSeats.length;

        if (remaining <= 0) {
            return "";
        }

        if (requiredSeats > 1) {
            var index = firstMissing();
            return say("api.seats.pickFor", "{name} üçün yer seçin.", { name: say("seats.passengerN", "Sərnişin {n}", { n: index + 1 }) });
        }

        return tr("seats.validation", "Hər sərnişin üçün oturacaq seçin.");
    }

    /* Seats of this booking that are no longer free: they are released and the passengers named so they can choose again. */
    function dropTakenSeats(seats) {
        var free = {};
        seats.forEach(function (seat) {
            if (seat.isAvailable) {
                free[seat.label] = true;
            }
        });

        var lost = [];
        slots.forEach(function (label, index) {
            if (label && !free[label]) {
                lost.push({ index: index, label: label });
                slots[index] = null;
            }
        });
        return lost;
    }

    function announceLost(lost) {
        if (!lost.length) {
            return;
        }

        activeIndex = lost[0].index;
        var parts = lost.map(function (entry) {
            return requiredSeats > 1
                ? say("api.seats.takenFor", "{ord} sərnişinin {seat} yeri artıq tutulub", { ord: ordinal(entry.index + 1), seat: entry.label })
                : say("api.seats.takenSingle", "{seat} yeri artıq tutulub", { seat: entry.label });
        });
        showMessage(parts.join("; ") + ". " + say("api.seats.chooseAgain", "Zəhmət olmasa başqa yer seçin."), "warn");
    }

    function availabilitySignature(seats) {
        return seats.map(function (seat) { return seat.id + (seat.isAvailable ? "1" : "0"); }).join(",");
    }

    function requestSeats(flightId, cabin) {
        return window.AEROVA_API.get("api/flights/" + flightId + "/seats", { query: { cabinClass: cabin } }).then(function (map) {
            return ((map && map.seats) || []).filter(function (seat) {
                return seat.cabinClass === cabin;
            });
        });
    }

    /* Looks at the seat map again; true when every chosen seat is still free. Failure to reach the server does not block. */
    function recheckSeats(flightData) {
        var flightId = Number(flightData && flightData.id);
        if (!(flightId > 0) || !seatList) {
            return Promise.resolve(true);
        }

        return requestSeats(flightId, cabinClassForLayout(activeLayout)).then(function (seats) {
            if (!seats.length) {
                return true;
            }

            var changed = availabilitySignature(seats) !== availabilitySignature(seatList);
            var lost = dropTakenSeats(seats);
            seatList = seats;
            seats.forEach(function (seat) { seatIdByLabel[seat.label] = seat.id; });

            if (changed) {
                renderSeatMap(activeLayout, seats);
            }

            if (lost.length) {
                announceLost(lost);
                repaintAll();
                persistSelectedSeats(flightData);
                return false;
            }

            if (changed) {
                repaintAll();
            }
            return true;
        }).catch(function () {
            return true;
        });
    }

    function bindContinue(flightData) {
        var continueButton = document.getElementById("continue-button") ||
            document.querySelector(".continue-button");

        if (!continueButton) {
            return;
        }

        continueButton.addEventListener("click", function (event) {
            event.preventDefault();

            if (selectedSeats.length !== requiredSeats) {
                var missing = firstMissing();
                if (missing !== -1 && requiredSeats > 1) {
                    setActive(missing, false);
                }
                showMessage(getRemainingSeatsMessage(), "warn");
                return;
            }

            if (checking) {
                return;
            }

            showMessage("");
            checking = true;
            updateContinueAvailability();

            recheckSeats(flightData).then(function (stillFree) {
                checking = false;
                updateContinueAvailability();
                if (!stillFree) {
                    return;
                }

                persistSelectedSeats(flightData);

                // A round trip goes on to the return flight first; everything else goes to the passenger details.
                var saved = readSelectedFlight();
                window.location.href = window.AEROVA_JOURNEY && saved ? window.AEROVA_JOURNEY.afterSeats(saved) : "passenger-details.html";
            });
        });
    }

    function paintStatus() {
        var cabin = document.getElementById("aircraft-cabin");
        var panel = document.getElementById("seat-status");
        if (!panel) {
            return;
        }

        if (cabin) {
            cabin.hidden = !!statusSpec;
        }

        if (!statusSpec) {
            panel.hidden = true;
            panel.innerHTML = "";
            return;
        }

        var spec = statusSpec;
        panel.hidden = false;
        panel.setAttribute("role", spec.kind === "error" ? "alert" : "status");
        panel.innerHTML =
            '<h2 class="seat-status-title">' + escapeHtml(tr(spec.titleKey, spec.titleFallback)) + "</h2>" +
            '<p class="seat-status-text">' + escapeHtml(spec.text || tr(spec.textKey, spec.textFallback)) + "</p>" +
            (spec.retry ? '<button type="button" class="continue-button seat-retry">' + escapeHtml(tr("api.search.retry", "Yenidən cəhd et")) + "</button>" : "");

        var retryButton = panel.querySelector(".seat-retry");
        if (retryButton) {
            retryButton.addEventListener("click", loadSeats);
        }
    }

    function setStatus(spec) {
        statusSpec = spec;
        paintStatus();
    }

    /* The seat map of this flight and cabin from the API: ids, numbers and who is already taken. */
    function loadSeats() {
        var flightData = currentFlightData;
        var flightId = Number(flightData && flightData.id);
        var cabin = cabinClassForLayout(activeLayout);

        seatList = null;
        seatIdByLabel = {};
        slots = new Array(requiredSeats).fill(null);
        activeIndex = 0;
        repaintAll();

        if (!(flightId > 0) || Math.floor(flightId) !== flightId) {
            setStatus({ kind: "notice", titleKey: "api.seats.noFlightTitle", titleFallback: "Uçuş seçilməyib", textKey: "api.seats.noFlightText", textFallback: "Əvvəlcə uçuş seçin, sonra oturacaqlarınızı seçin." });
            return;
        }

        setStatus({ kind: "loading", titleKey: "api.seats.loadingTitle", titleFallback: "Oturacaq xəritəsi yüklənir", textKey: "api.seats.loadingText", textFallback: "Zəhmət olmasa gözləyin, oturacaqlar yüklənir." });

        requestSeats(flightId, cabin).then(function (seats) {
            if (!seats.length) {
                setStatus({ kind: "notice", titleKey: "api.seats.noSeatsTitle", titleFallback: "Göstəriləcək oturacaq yoxdur", textKey: "api.seats.noSeatsText", textFallback: "Bu uçuşda bu kabində oturacaq yoxdur." });
                return;
            }

            var stored = normalizeStoredSeats(flightData);
            seatList = seats;
            seats.forEach(function (seat) {
                seatIdByLabel[seat.label] = seat.id;
            });

            var restored = restoreSeats(stored, flightData, flightId, cabin, seats);
            slots = restored.slots;
            syncDerived();
            var firstEmpty = firstMissing();
            activeIndex = firstEmpty === -1 ? 0 : firstEmpty;

            if (stored.length && (restored.lost.length || selectedSeats.length !== stored.length)) {
                /* Drop seats that are gone or taken so later steps never see them. */
                persistSelectedSeats(flightData);
            }

            setStatus(null);
            renderSeatMap(activeLayout, seats);
            repaintAll();

            if (restored.lost.length) {
                announceLost(restored.lost);
                repaintAll();
            }
        }).catch(function (error) {
            var isApiError = window.AEROVA_API && error instanceof window.AEROVA_API.ApiError;

            if (isApiError && error.status === 404) {
                setStatus({ kind: "notice", titleKey: "api.details.notFoundTitle", titleFallback: "Bu uçuş mövcud deyil", textKey: "api.details.notFoundText", textFallback: "O, silinmiş və ya dəyişdirilmiş ola bilər. Zəhmət olmasa yenidən axtarın." });
                return;
            }

            if (!isApiError && window.console) {
                window.console.error(error);
            }

            setStatus({ kind: "error", titleKey: "api.seats.errorTitle", titleFallback: "Oturacaq xəritəsini yükləmək mümkün olmadı", text: isApiError ? error.userMessage : tr("api.errors.generic", "Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin."), retry: true });
        });
    }

    function init() {
        var flightData = readSelectedFlight();
        currentFlightData = flightData;
        activeLayout = resolveCabinLayout(flightData && flightData.cabinClass);
        requiredSeats = resolvePassengerCount(flightData);
        slots = new Array(requiredSeats).fill(null);

        populateFlightSummary(flightData, activeLayout);
        buildPanel();
        updateSelectedSeatSummary();
        paintOutboundNote();
        bindSeatInteractions(flightData);
        bindContinue(flightData);
        loadSeats();

        /* Someone else may take a seat while this tab is in the background: look again when the traveller comes back. */
        document.addEventListener("visibilitychange", function () {
            if (!document.hidden && seatList && !checking) {
                recheckSeats(currentFlightData);
            }
        });
    }

    function refreshForLanguage() {
        populateFlightSummary(currentFlightData, activeLayout);
        paintOutboundNote();
        buildPanel();
        if (seatList) {
            renderSeatMap(activeLayout, seatList);
        } else {
            paintStatus();
        }
        updateSelectedSeatSummary();
    }

    window.addEventListener("aerova:languagechange", refreshForLanguage);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
