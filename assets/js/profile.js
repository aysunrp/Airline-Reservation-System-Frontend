(function () {
    function tr(key, fallback, vars) {
        if (typeof window.t === "function") {
            var value = window.t(key, vars);
            if (value && value !== key) return value;
        }
        return typeof vars === "object" && vars
            ? String(fallback).replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? String(vars[k]) : "{" + k + "}"; })
            : fallback;
    }

    /* Longest first, so "+971" is not read as "+9". These are the codes the phone field offers. */
    var PHONE_CODES = ["+994", "+971", "+44", "+90", "+1"];

    var profileState = null;

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function showMessage(text, isSuccess) {
        var message = document.getElementById("profile-message");
        if (!message) {
            return;
        }

        message.textContent = text || "";
        message.hidden = !text;
        message.classList.toggle("is-success", !!isSuccess);
    }

    function getSelectPlaceholderOption(select) {
        if (!select || select.tagName !== "SELECT" || !select.options.length) {
            return null;
        }

        return select.options[0];
    }

    function rememberOriginalPlaceholder(input) {
        if (!input || input.getAttribute("data-original-placeholder") !== null) {
            return;
        }

        if (input.tagName === "SELECT") {
            var option = getSelectPlaceholderOption(input);
            input.setAttribute(
                "data-original-placeholder",
                option ? option.textContent : ""
            );
            return;
        }

        input.setAttribute("data-original-placeholder", input.getAttribute("placeholder") || "");
    }

    function clearFieldError(input) {
        if (!input || !input.classList.contains("is-invalid")) {
            return;
        }

        input.classList.remove("is-invalid");

        var original = input.getAttribute("data-original-placeholder");
        if (original === null) {
            return;
        }

        if (input.tagName === "SELECT") {
            var option = getSelectPlaceholderOption(input);
            if (option) {
                option.textContent = original;
            }
            return;
        }

        if (original) {
            input.setAttribute("placeholder", original);
        } else {
            input.removeAttribute("placeholder");
        }
    }

    function markInvalid(input, message) {
        if (!input) {
            return;
        }

        rememberOriginalPlaceholder(input);
        input.classList.add("is-invalid");

        if (input.tagName === "SELECT") {
            var option = getSelectPlaceholderOption(input);
            if (option) {
                option.textContent = message || tr("profile.fieldRequired", "This field is required");
            }

            if (!String(input.value || "").trim()) {
                input.selectedIndex = 0;
            }
            return;
        }

        input.setAttribute("placeholder", message || "This field is required");

        if (!String(input.value || "").trim() && input.type !== "date") {
            input.value = "";
        }
    }

    function getTrimmedValue(id) {
        var input = document.getElementById(id);
        return input ? String(input.value || "").trim() : "";
    }

    function setFieldValue(id, value) {
        var input = document.getElementById(id);
        if (input) {
            input.value = value == null ? "" : String(value);
        }
    }

    function splitPhone(phone) {
        var text = String(phone || "").trim();
        var space = text.indexOf(" ");

        if (space > 0) {
            return { countryCode: text.slice(0, space), mobilePhone: text.slice(space + 1).trim() };
        }

        for (var i = 0; i < PHONE_CODES.length; i += 1) {
            if (text.indexOf(PHONE_CODES[i]) === 0) {
                return { countryCode: PHONE_CODES[i], mobilePhone: text.slice(PHONE_CODES[i].length) };
            }
        }

        return { countryCode: "", mobilePhone: text.replace(/^\+/, "") };
    }

    function toSavedPassenger(dto) {
        return {
            id: dto.id,
            firstName: dto.firstName,
            lastName: dto.lastName,
            relationship: dto.relationship || "",
            dateOfBirth: dto.dateOfBirth || "",
            gender: dto.gender || "",
            nationalityCode: dto.nationalityCode || "",
            documentType: dto.documentType || "",
            documentNumber: dto.documentNumber || "",
            documentIssuingCountry: dto.documentIssuingCountry || "",
            documentExpiryDate: dto.documentExpiryDate || ""
        };
    }

    /* The profile and saved passengers from the API, in the shape the form below uses. */
    function toPageProfile(profile, passengers) {
        var phone = splitPhone(profile.phone);

        return {
            title: profile.title || "",
            firstName: profile.firstName || "",
            lastName: profile.lastName || "",
            dateOfBirth: profile.dateOfBirth || "",
            nationality: profile.nationalityCode || "",
            email: profile.email || "",
            countryCode: phone.countryCode,
            mobilePhone: phone.mobilePhone,
            savedPassengers: (passengers || []).map(toSavedPassenger)
        };
    }

    function apiMessage(error) {
        var isApiError = window.AEROVA_API && error instanceof window.AEROVA_API.ApiError;
        if (!isApiError && window.console) {
            window.console.error(error);
        }
        return isApiError ? error.userMessage : tr("api.errors.generic", "Something went wrong. Please try again.");
    }

    function buildNationalityOptions() {
        var docs = window.AEROVA_TRAVEL_DOCS;
        if (!docs) {
            return;
        }

        [
            { id: "profile-nationality", placeholderKey: "travelDocs.selectNationality", placeholder: "Select nationality", required: true },
            { id: "passenger-nationality", placeholderKey: "travelDocs.selectNationality", placeholder: "Select nationality", required: false },
            { id: "passenger-issuing-country", placeholderKey: "travelDocs.selectCountry", placeholder: "Select country", required: false }
        ].forEach(function (spec) {
            var select = document.getElementById(spec.id);
            if (!select) {
                return;
            }

            var current = select.value;
            select.innerHTML = '<option value=""' + (spec.required ? " disabled" : "") + " selected>" + escapeHtml(tr(spec.placeholderKey, spec.placeholder)) + "</option>" +
                docs.countries.map(function (country) {
                    return '<option value="' + escapeHtml(country.code) + '">' + escapeHtml(tr("travelDocs.countries." + country.code, docs.countryName(country.code))) + "</option>";
                }).join("");
            select.value = current;
        });
    }

    function setProfileStatus(kind, title, text, retry) {
        var panel = document.getElementById("profile-status");
        var form = document.getElementById("profile-form");

        if (!panel) {
            return;
        }

        if (!kind) {
            panel.hidden = true;
            if (form) form.hidden = false;
            return;
        }

        document.getElementById("profile-status-title").textContent = title;
        document.getElementById("profile-status-text").textContent = text;
        panel.setAttribute("role", kind === "error" ? "alert" : "status");

        var button = document.getElementById("profile-status-retry");
        button.hidden = !retry;
        button.onclick = retry || null;

        panel.hidden = false;
        if (form) form.hidden = true;
    }

    function loadProfile() {
        setProfileStatus("loading", tr("api.profile.loadingTitle", "Loading your profile"), tr("api.profile.loadingText", "Please wait a moment."), null);

        Promise.all([window.AEROVA_API.get("api/profile"), window.AEROVA_API.get("api/profile/saved-passengers")]).then(function (results) {
            profileState = toPageProfile(results[0], results[1]);
            populateForm(profileState);
            renderSavedPassengers();
            setProfileStatus(null);
        }).catch(function (error) {
            setProfileStatus("error", tr("api.profile.errorTitle", "We could not load your profile"), apiMessage(error), loadProfile);
        });
    }

    function populateForm(profile) {
        setFieldValue("profile-title", profile.title);
        setFieldValue("profile-first-name", profile.firstName);
        setFieldValue("profile-last-name", profile.lastName);
        setFieldValue("profile-dob", profile.dateOfBirth);
        setFieldValue("profile-nationality", profile.nationality);
        setFieldValue("profile-email", profile.email);
        setFieldValue("profile-country-code", profile.countryCode);
        setFieldValue("profile-phone", profile.mobilePhone);
    }

    function renderSavedPassengers() {
        var list = document.getElementById("saved-passengers-list");
        if (!list) {
            return;
        }

        var passengers = profileState.savedPassengers || [];

        if (!passengers.length) {
            list.innerHTML = '<p class="saved-passengers-empty">' + tr("profile.noSaved", "No saved passengers yet. Add one to speed up future bookings.") + '</p>';
            return;
        }

        list.innerHTML = passengers.map(function (passenger) {
            return (
                '<article class="saved-passenger-card" data-passenger-id="' + escapeHtml(passenger.id) + '">' +
                    "<div>" +
                        '<p class="saved-passenger-name">' +
                            escapeHtml((passenger.firstName || "") + " " + (passenger.lastName || "")).trim() +
                        "</p>" +
                        '<p class="saved-passenger-meta">' +
                            escapeHtml(passenger.relationship || "Travel companion") +
                            (passenger.documentNumber ? " \u00b7 " + escapeHtml(tr("api.profile.documentSaved", "document saved")) : "") +
                        "</p>" +
                    "</div>" +
                    '<div class="saved-passenger-actions">' +
                        '<button class="passenger-card-button" type="button" data-action="edit">Edit</button>' +
                        '<button class="passenger-card-button passenger-card-button--danger" type="button" data-action="delete">Delete</button>' +
                    "</div>" +
                "</article>"
            );
        }).join("");
    }

    function validateProfileForm() {
        var fields = [
            { id: "profile-title", message: "Select a title" },
            { id: "profile-first-name", message: "Enter your first name" },
            { id: "profile-last-name", message: "Enter your last name" },
            { id: "profile-dob", message: "Enter your date of birth" },
            { id: "profile-nationality", message: "Enter your nationality" },
            { id: "profile-email", message: "Enter your email" },
            { id: "profile-country-code", message: "Select a country code" },
            { id: "profile-phone", message: "Enter your mobile phone" }
        ];

        var isValid = true;

        fields.forEach(function (field) {
            var input = document.getElementById(field.id);
            clearFieldError(input);

            if (!getTrimmedValue(field.id)) {
                markInvalid(input, field.message);
                isValid = false;
            }
        });

        var email = getTrimmedValue("profile-email");
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            markInvalid(document.getElementById("profile-email"), "Enter a valid email");
            isValid = false;
        }

        return isValid;
    }

    function collectProfileFromForm() {
        return {
            title: getTrimmedValue("profile-title"),
            firstName: getTrimmedValue("profile-first-name"),
            lastName: getTrimmedValue("profile-last-name"),
            dateOfBirth: getTrimmedValue("profile-dob"),
            nationality: getTrimmedValue("profile-nationality"),
            email: getTrimmedValue("profile-email"),
            countryCode: getTrimmedValue("profile-country-code"),
            mobilePhone: getTrimmedValue("profile-phone"),
            savedPassengers: (profileState.savedPassengers || []).slice()
        };
    }

    var FIELD_IDS = {
        title: "profile-title",
        firstName: "profile-first-name",
        lastName: "profile-last-name",
        dateOfBirth: "profile-dob",
        nationalityCode: "profile-nationality",
        email: "profile-email",
        phone: "profile-phone"
    };

    function saveProfile(event) {
        event.preventDefault();
        showMessage("");

        if (!validateProfileForm()) {
            showMessage(tr("profile.completeFields", "Please complete the highlighted fields."));
            return;
        }

        var data = collectProfileFromForm();
        var button = document.getElementById("save-profile-button");
        if (button) {
            button.disabled = true;
        }

        window.AEROVA_API.put("api/profile", {
            title: data.title,
            firstName: data.firstName,
            lastName: data.lastName,
            dateOfBirth: data.dateOfBirth,
            nationalityCode: data.nationality,
            email: data.email,
            phone: data.countryCode + " " + data.mobilePhone
        }).then(function (saved) {
            profileState = toPageProfile(saved, profileState.savedPassengers);
            populateForm(profileState);
            if (window.AerovaAuth && window.AerovaAuth.updateCurrentUser) {
                window.AerovaAuth.updateCurrentUser({ firstName: saved.firstName, lastName: saved.lastName, email: saved.email });
            }
            showMessage(tr("profile.saved", "Your profile changes have been saved."), true);
        }).catch(function (error) {
            var isApiError = window.AEROVA_API && error instanceof window.AEROVA_API.ApiError;
            if (isApiError && error.status === 400 && error.errors) {
                Object.keys(error.errors).forEach(function (name) {
                    var id = FIELD_IDS[String(name).charAt(0).toLowerCase() + String(name).slice(1)];
                    if (id) {
                        markInvalid(document.getElementById(id), String(error.errors[name][0] || ""));
                    }
                });
            }
            showMessage(apiMessage(error));
        }).then(function () {
            if (button) {
                button.disabled = false;
            }
        });
    }

    function openPassengerModal(passengerId) {
        var modal = document.getElementById("passenger-modal");
        var title = document.getElementById("passenger-modal-title");
        var editId = document.getElementById("passenger-edit-id");
        var firstName = document.getElementById("passenger-first-name");
        var lastName = document.getElementById("passenger-last-name");
        var relationship = document.getElementById("passenger-relationship");

        clearFieldError(firstName);
        clearFieldError(lastName);

        var passenger = null;
        if (passengerId) {
            passenger = profileState.savedPassengers.find(function (item) {
                return String(item.id) === String(passengerId);
            }) || null;
        }

        if (title) {
            title.textContent = passenger ? tr("profile.editPassenger", "Edit Passenger") : tr("profile.addPassenger", "Add Passenger");
        }

        if (editId) {
            editId.value = passenger ? passenger.id : "";
        }

        setFieldValue("passenger-first-name", passenger ? passenger.firstName : "");
        setFieldValue("passenger-last-name", passenger ? passenger.lastName : "");
        setFieldValue("passenger-relationship", passenger ? passenger.relationship : "");
        setFieldValue("passenger-dob", passenger ? passenger.dateOfBirth : "");
        setFieldValue("passenger-gender", passenger ? passenger.gender : "");
        setFieldValue("passenger-nationality", passenger ? passenger.nationalityCode : "");
        setFieldValue("passenger-document-type", passenger ? passenger.documentType : "");
        setFieldValue("passenger-document-number", passenger ? passenger.documentNumber : "");
        setFieldValue("passenger-issuing-country", passenger ? passenger.documentIssuingCountry : "");
        setFieldValue("passenger-document-expiry", passenger ? passenger.documentExpiryDate : "");

        if (modal) {
            modal.hidden = false;
        }

        if (firstName) {
            firstName.focus();
        }
    }

    function closePassengerModal() {
        var modal = document.getElementById("passenger-modal");
        if (modal) {
            modal.hidden = true;
        }
    }

    function validatePassengerModal() {
        var firstName = document.getElementById("passenger-first-name");
        var lastName = document.getElementById("passenger-last-name");
        var documentType = document.getElementById("passenger-document-type");
        var isValid = true;

        clearFieldError(firstName);
        clearFieldError(lastName);
        clearFieldError(documentType);

        if (!getTrimmedValue("passenger-first-name")) {
            markInvalid(firstName, "Enter first name");
            isValid = false;
        }

        if (!getTrimmedValue("passenger-last-name")) {
            markInvalid(lastName, "Enter last name");
            isValid = false;
        }

        // A document number only makes sense together with its type (the backend checks this too).
        if (getTrimmedValue("passenger-document-number") && !getTrimmedValue("passenger-document-type")) {
            markInvalid(documentType, tr("travelDocs.errors.documentType", "Select document type"));
            isValid = false;
        }

        return isValid;
    }

    function savePassengerFromModal(event) {
        event.preventDefault();

        if (!validatePassengerModal()) {
            return;
        }

        var editId = getTrimmedValue("passenger-edit-id");
        var body = {
            firstName: getTrimmedValue("passenger-first-name"),
            lastName: getTrimmedValue("passenger-last-name"),
            relationship: getTrimmedValue("passenger-relationship") || null,
            dateOfBirth: getTrimmedValue("passenger-dob") || null,
            gender: getTrimmedValue("passenger-gender") || null,
            nationalityCode: getTrimmedValue("passenger-nationality") || null,
            documentType: getTrimmedValue("passenger-document-type") || null,
            documentNumber: getTrimmedValue("passenger-document-number").toUpperCase().replace(/[\s-]/g, "") || null,
            documentIssuingCountry: getTrimmedValue("passenger-issuing-country") || null,
            documentExpiryDate: getTrimmedValue("passenger-document-expiry") || null
        };

        var request = editId
            ? window.AEROVA_API.put("api/profile/saved-passengers/" + encodeURIComponent(editId), body)
            : window.AEROVA_API.post("api/profile/saved-passengers", body);

        request.then(function (saved) {
            var passenger = toSavedPassenger(saved);

            if (editId) {
                profileState.savedPassengers = profileState.savedPassengers.map(function (item) {
                    return String(item.id) === String(editId) ? passenger : item;
                });
            } else {
                profileState.savedPassengers.push(passenger);
            }

            renderSavedPassengers();
            closePassengerModal();
            showMessage(tr("profile.passengerUpdated", "Saved passenger profile updated."), true);
        }).catch(function (error) {
            // Stay in the window so what was typed is not lost; the reason is shown at the top of the page.
            showMessage(apiMessage(error));
            var message = document.getElementById("profile-message");
            if (message && message.scrollIntoView) {
                message.scrollIntoView({ block: "nearest" });
            }
        });
    }

    function deletePassenger(passengerId) {
        window.AEROVA_API.del("api/profile/saved-passengers/" + encodeURIComponent(passengerId)).then(function () {
            profileState.savedPassengers = (profileState.savedPassengers || []).filter(function (item) {
                return String(item.id) !== String(passengerId);
            });
            renderSavedPassengers();
            showMessage(tr("profile.passengerRemoved", "Passenger removed from your saved profiles."), true);
        }).catch(function (error) {
            showMessage(apiMessage(error));
        });
    }

    function initMenuToggle() {
        var header = document.getElementById("site-header");
        if (!header) {
            return;
        }

        var toggle = header.querySelector(".menu-toggle");
        var nav = header.querySelector(".main-navigation");
        if (!toggle || !nav) {
            return;
        }

        function setMenu(open) {
            header.classList.toggle("is-menu-open", open);
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
            toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        }

        toggle.addEventListener("click", function () {
            setMenu(!header.classList.contains("is-menu-open"));
        });

        nav.addEventListener("click", function (event) {
            if (event.target.closest("a")) {
                setMenu(false);
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                setMenu(false);
                closePassengerModal();
            }
        });

        window.addEventListener("resize", function () {
            if (window.innerWidth > 1366) {
                setMenu(false);
            }
        });
    }

    function init() {
        profileState = { savedPassengers: [] };
        buildNationalityOptions();

        var form = document.getElementById("profile-form");
        if (form) {
            form.addEventListener("submit", saveProfile);
        }

        var passengerList = document.getElementById("saved-passengers-list");
        if (passengerList) {
            passengerList.addEventListener("click", function (event) {
                var button = event.target.closest("[data-action]");
                if (!button || !passengerList.contains(button)) {
                    return;
                }

                event.preventDefault();

                var card = button.closest("[data-passenger-id]");
                var passengerId = card ? card.getAttribute("data-passenger-id") : "";
                if (!passengerId) {
                    return;
                }

                if (button.getAttribute("data-action") === "edit") {
                    openPassengerModal(passengerId);
                } else if (button.getAttribute("data-action") === "delete") {
                    deletePassenger(passengerId);
                }
            });
        }

        var addButton = document.getElementById("add-passenger-button");
        if (addButton) {
            addButton.addEventListener("click", function () {
                openPassengerModal(null);
            });
        }

        var modalForm = document.getElementById("passenger-modal-form");
        if (modalForm) {
            modalForm.addEventListener("submit", savePassengerFromModal);
        }

        document.querySelectorAll("[data-close-modal]").forEach(function (element) {
            element.addEventListener("click", closePassengerModal);
        });

        document.querySelectorAll("#profile-form .field-input").forEach(function (input) {
            input.addEventListener("input", function () {
                clearFieldError(input);
            });
            input.addEventListener("change", function () {
                clearFieldError(input);
            });
        });

        initMenuToggle();
        loadProfile();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
    window.addEventListener("aerova:languagechange", function () {
        if (typeof renderSavedPassengers === 'function') { try { buildNationalityOptions(); renderSavedPassengers(); } catch (e) {} } if (window.AEROVA_I18N) window.AEROVA_I18N.applyTranslations(document);
    });
})();
