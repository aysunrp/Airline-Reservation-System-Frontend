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

    var STORAGE_KEY = "profileData";

    var DEFAULT_PROFILE = {
        title: "Ms",
        firstName: "Leyla",
        lastName: "Mammadova",
        dateOfBirth: "1994-04-18",
        nationality: "Azerbaijani",
        email: "leyla.mammadova@email.com",
        countryCode: "+994",
        mobilePhone: "501234567",
        preferredCabin: "Comfort",
        preferredMeal: "Halal Meal",
        baggagePreference: "+20 kg",
        savedPassengers: [
            {
                id: "passenger-1",
                firstName: "Orkhan",
                lastName: "Aliyev",
                relationship: "Spouse"
            },
            {
                id: "passenger-2",
                firstName: "Nigar",
                lastName: "Huseynova",
                relationship: "Child"
            }
        ]
    };

    var profileState = null;

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function readJSON(key) {
        try {
            var raw = sessionStorage.getItem(key);
            if (!raw) {
                return null;
            }

            var parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    function writeJSON(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            return false;
        }
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

    function loadProfile() {
        var stored = readJSON(STORAGE_KEY);
        if (!stored) {
            return JSON.parse(JSON.stringify(DEFAULT_PROFILE));
        }

        return {
            title: stored.title || "",
            firstName: stored.firstName || "",
            lastName: stored.lastName || "",
            dateOfBirth: stored.dateOfBirth || "",
            nationality: stored.nationality || "",
            email: stored.email || "",
            countryCode: stored.countryCode || "",
            mobilePhone: stored.mobilePhone || "",
            preferredCabin: stored.preferredCabin || "Economy",
            preferredMeal: stored.preferredMeal || "Standard Meal",
            baggagePreference: stored.baggagePreference || "No Extra Baggage",
            savedPassengers: Array.isArray(stored.savedPassengers)
                ? stored.savedPassengers
                : []
        };
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
        setFieldValue("profile-cabin", profile.preferredCabin);
        setFieldValue("profile-meal", profile.preferredMeal);
        setFieldValue("profile-baggage", profile.baggagePreference);
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
                        "</p>" +
                    "</div>" +
                    '<div class="saved-passenger-actions">' +
                        '<button class="passenger-card-button" type="button" data-action="edit">Edit</button>' +
                        '<button class="passenger-card-button passenger-card-button--danger" type="button" data-action="delete">Delete</button>' +
                    "</div>" +
                "</article>"
            );
        }).join("");

        list.querySelectorAll(".saved-passenger-card").forEach(function (card) {
            var passengerId = card.getAttribute("data-passenger-id");

            card.querySelectorAll("[data-action]").forEach(function (button) {
                button.addEventListener("click", function () {
                    var action = button.getAttribute("data-action");
                    if (action === "edit") {
                        openPassengerModal(passengerId);
                    } else if (action === "delete") {
                        deletePassenger(passengerId);
                    }
                });
            });
        });
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
            preferredCabin: getTrimmedValue("profile-cabin") || "Economy",
            preferredMeal: getTrimmedValue("profile-meal") || "Standard Meal",
            baggagePreference: getTrimmedValue("profile-baggage") || "No Extra Baggage",
            savedPassengers: profileState.savedPassengers.slice()
        };
    }

    function saveProfile(event) {
        event.preventDefault();
        showMessage("");

        if (!validateProfileForm()) {
            showMessage(tr("profile.completeFields", "Please complete the highlighted fields."));
            return;
        }

        profileState = collectProfileFromForm();

        if (!writeJSON(STORAGE_KEY, profileState)) {
            showMessage(tr("profile.saveFail", "Unable to save your profile right now."));
            return;
        }

        showMessage(tr("profile.saved", "Your profile changes have been saved."), true);
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
                return item.id === passengerId;
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
        var isValid = true;

        clearFieldError(firstName);
        clearFieldError(lastName);

        if (!getTrimmedValue("passenger-first-name")) {
            markInvalid(firstName, "Enter first name");
            isValid = false;
        }

        if (!getTrimmedValue("passenger-last-name")) {
            markInvalid(lastName, "Enter last name");
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
        var passenger = {
            id: editId || ("passenger-" + Date.now()),
            firstName: getTrimmedValue("passenger-first-name"),
            lastName: getTrimmedValue("passenger-last-name"),
            relationship: getTrimmedValue("passenger-relationship") || "Travel companion"
        };

        if (editId) {
            profileState.savedPassengers = profileState.savedPassengers.map(function (item) {
                return item.id === editId ? passenger : item;
            });
        } else {
            profileState.savedPassengers.push(passenger);
        }

        writeJSON(STORAGE_KEY, collectProfileFromForm());
        renderSavedPassengers();
        closePassengerModal();
        showMessage(tr("profile.passengerUpdated", "Saved passenger profile updated."), true);
    }

    function deletePassenger(passengerId) {
        profileState.savedPassengers = profileState.savedPassengers.filter(function (item) {
            return item.id !== passengerId;
        });

        writeJSON(STORAGE_KEY, collectProfileFromForm());
        renderSavedPassengers();
        showMessage(tr("profile.passengerRemoved", "Passenger removed from your saved profiles."), true);
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
            if (window.innerWidth > 1080) {
                setMenu(false);
            }
        });
    }

    function init() {
        profileState = loadProfile();
        populateForm(profileState);
        renderSavedPassengers();

        var form = document.getElementById("profile-form");
        if (form) {
            form.addEventListener("submit", saveProfile);
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
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
    window.addEventListener("aerova:languagechange", function () {
        if (typeof renderSavedPassengers === 'function') { try { renderSavedPassengers(); } catch (e) {} } if (window.AEROVA_I18N) window.AEROVA_I18N.applyTranslations(document);
    });
})();
