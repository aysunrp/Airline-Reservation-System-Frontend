(function () {
    var USERS_KEY = "aerovaRegisteredUsers";
    var USER_KEY = "aerovaUser";
    var LOGGED_IN_KEY = "isLoggedIn";

    function readJSON(storage, key) {
        try {
            var raw = storage.getItem(key);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    function writeJSON(storage, key, value) {
        try {
            storage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            return false;
        }
    }

    function normalizeEmail(email) {
        return String(email || "").trim().toLowerCase();
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function getRegisteredUsers() {
        var users = readJSON(localStorage, USERS_KEY);
        return Array.isArray(users) ? users : [];
    }

    function saveRegisteredUsers(users) {
        writeJSON(localStorage, USERS_KEY, users);
    }

    function ensureDemoUser() {
        var users = getRegisteredUsers();
        var exists = users.some(function (user) {
            return normalizeEmail(user.email) === "leyla@aerova.com";
        });

        if (!exists) {
            users.push({
                id: "demo-user-1",
                firstName: "Leyla",
                lastName: "Mammadova",
                email: "leyla@aerova.com",
                password: "Aerova123"
            });
            saveRegisteredUsers(users);
        }
    }

    function isLoggedIn() {
        return sessionStorage.getItem(LOGGED_IN_KEY) === "true";
    }

    function getCurrentUser() {
        if (!isLoggedIn()) return null;
        return readJSON(sessionStorage, USER_KEY);
    }

    function setLoggedInUser(user) {
        var safeUser = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
        };
        writeJSON(sessionStorage, USER_KEY, safeUser);
        sessionStorage.setItem(LOGGED_IN_KEY, "true");
        try { localStorage.setItem(LOGGED_IN_KEY, "true"); } catch (error) { /* ignore */ }
        return safeUser;
    }

    function clearAuthState() {
        try { sessionStorage.removeItem(USER_KEY); } catch (error) { /* ignore */ }
        try { sessionStorage.removeItem(LOGGED_IN_KEY); } catch (error) { /* ignore */ }
        try { sessionStorage.removeItem("currentUser"); } catch (error) { /* ignore */ }
        try { localStorage.removeItem(LOGGED_IN_KEY); } catch (error) { /* ignore */ }
        try { localStorage.removeItem(USER_KEY); } catch (error) { /* ignore */ }
        try { localStorage.removeItem("currentUser"); } catch (error) { /* ignore */ }
    }

    function logout() {
        clearAuthState();
        window.location.href = "login.html";
    }

    function displayName(user) {
        if (!user) return "Profile";
        var first = String(user.firstName || "").trim();
        if (first) return first;
        return "Profile";
    }

    function findLoginButtons() {
        return Array.prototype.slice.call(document.querySelectorAll("a.login-button"));
    }

    function updateNavigation() {
        var user = getCurrentUser();
        var loggedIn = !!user;
        var headerActions = document.querySelector(".header-actions");
        var drawerNav = document.querySelector("#primary-navigation");

        findLoginButtons().forEach(function (button) {
            if (loggedIn) {
                button.href = "profile.html";
                button.textContent = displayName(user);
                button.setAttribute("data-auth-state", "profile");
                button.removeAttribute("aria-current");
                if (/profile\.html$/i.test(window.location.pathname) || window.location.href.indexOf("profile.html") !== -1) {
                    button.setAttribute("aria-current", "page");
                }
            } else {
                button.href = "login.html";
                button.textContent = "Login";
                button.setAttribute("data-auth-state", "login");
                button.removeAttribute("aria-current");
            }
        });

        if (headerActions) {
            var notifyDesktop = headerActions.querySelector(".auth-nav-notifications");
            var logoutDesktop = headerActions.querySelector(".auth-nav-logout");

            if (loggedIn) {
                if (!notifyDesktop) {
                    notifyDesktop = document.createElement("a");
                    notifyDesktop.className = "trips-link auth-nav-notifications";
                    notifyDesktop.href = "notifications.html";
                    notifyDesktop.textContent = "Notifications";
                    var profileBtn = headerActions.querySelector(".login-button:not(.login-button--drawer)");
                    if (profileBtn) headerActions.insertBefore(notifyDesktop, profileBtn);
                    else headerActions.appendChild(notifyDesktop);
                } else {
                    notifyDesktop.hidden = false;
                    notifyDesktop.href = "notifications.html";
                }
            } else {
                if (notifyDesktop) notifyDesktop.remove();
                if (logoutDesktop) logoutDesktop.remove();
            }
        }

        if (drawerNav) {
            var notifyDrawer = drawerNav.querySelector(".auth-nav-notifications-drawer");
            var logoutDrawer = drawerNav.querySelector(".auth-nav-logout-drawer");

            if (loggedIn) {
                if (!notifyDrawer) {
                    notifyDrawer = document.createElement("a");
                    notifyDrawer.className = "login-button login-button--drawer auth-nav-notifications-drawer";
                    notifyDrawer.href = "notifications.html";
                    notifyDrawer.textContent = "Notifications";
                    var drawerLogin = drawerNav.querySelector(".login-button--drawer");
                    if (drawerLogin) drawerNav.insertBefore(notifyDrawer, drawerLogin);
                    else drawerNav.appendChild(notifyDrawer);
                } else {
                    notifyDrawer.hidden = false;
                }

                if (!logoutDrawer) {
                    logoutDrawer = document.createElement("button");
                    logoutDrawer.type = "button";
                    logoutDrawer.className = "login-button login-button--drawer auth-nav-logout-drawer";
                    logoutDrawer.textContent = "Logout";
                    logoutDrawer.addEventListener("click", logout);
                    drawerNav.appendChild(logoutDrawer);
                }
            } else {
                if (notifyDrawer) notifyDrawer.remove();
                if (logoutDrawer) logoutDrawer.remove();
            }
        }

        document.querySelectorAll("[data-auth-logout]").forEach(function (el) {
            el.addEventListener("click", function (event) {
                event.preventDefault();
                logout();
            });
        });
    }

    function clearFieldError(input) {
        if (!input) return;
        var control = input.closest(".auth-control");
        var error = control ? control.querySelector(".auth-error") : null;
        input.classList.remove("is-invalid");
        input.removeAttribute("aria-invalid");
        if (control) control.classList.remove("is-invalid");
        if (error) {
            error.textContent = "";
            error.hidden = true;
        }
    }

    function setFieldError(input, message) {
        if (!input) return;
        var control = input.closest(".auth-control");
        var error = control ? control.querySelector(".auth-error") : null;
        input.classList.add("is-invalid");
        input.setAttribute("aria-invalid", "true");
        if (control) control.classList.add("is-invalid");
        if (error) {
            error.textContent = message;
            error.hidden = false;
        }
    }

    function bindClearOnInput(form) {
        form.querySelectorAll("input").forEach(function (input) {
            input.addEventListener("input", function () {
                clearFieldError(input);
            });
        });
    }

    function handleLoginForm() {
        var form = document.getElementById("login-form");
        if (!form) return;

        ensureDemoUser();
        bindClearOnInput(form);

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            var emailInput = document.getElementById("login-email");
            var passwordInput = document.getElementById("login-password");
            var email = normalizeEmail(emailInput.value);
            var password = String(passwordInput.value || "");
            var valid = true;

            clearFieldError(emailInput);
            clearFieldError(passwordInput);

            if (!email) {
                setFieldError(emailInput, "Email is required");
                valid = false;
            } else if (!isValidEmail(email)) {
                setFieldError(emailInput, "Enter a valid email");
                valid = false;
            }

            if (!password) {
                setFieldError(passwordInput, "Password is required");
                valid = false;
            } else if (password.length < 6) {
                setFieldError(passwordInput, "At least 6 characters");
                valid = false;
            }

            if (!valid) return;

            var users = getRegisteredUsers();
            var match = users.find(function (user) {
                return normalizeEmail(user.email) === email && String(user.password) === password;
            });

            if (!match) {
                setFieldError(emailInput, "Invalid email or password");
                setFieldError(passwordInput, "Invalid email or password");
                return;
            }

            setLoggedInUser(match);
            window.location.href = "index.html";
        });
    }

    function handleRegisterForm() {
        var form = document.getElementById("register-form");
        if (!form) return;

        ensureDemoUser();
        bindClearOnInput(form);

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            var firstInput = document.getElementById("register-first-name");
            var lastInput = document.getElementById("register-last-name");
            var emailInput = document.getElementById("register-email");
            var passwordInput = document.getElementById("register-password");
            var confirmInput = document.getElementById("register-confirm-password");

            var firstName = String(firstInput.value || "").trim();
            var lastName = String(lastInput.value || "").trim();
            var email = normalizeEmail(emailInput.value);
            var password = String(passwordInput.value || "");
            var confirm = String(confirmInput.value || "");
            var valid = true;

            [firstInput, lastInput, emailInput, passwordInput, confirmInput].forEach(clearFieldError);

            if (!firstName) {
                setFieldError(firstInput, "First name is required");
                valid = false;
            }

            if (!lastName) {
                setFieldError(lastInput, "Last name is required");
                valid = false;
            }

            if (!email) {
                setFieldError(emailInput, "Email is required");
                valid = false;
            } else if (!isValidEmail(email)) {
                setFieldError(emailInput, "Enter a valid email");
                valid = false;
            }

            if (!password) {
                setFieldError(passwordInput, "Password is required");
                valid = false;
            } else if (password.length < 6) {
                setFieldError(passwordInput, "At least 6 characters");
                valid = false;
            }

            if (!confirm) {
                setFieldError(confirmInput, "Confirm your password");
                valid = false;
            } else if (password && confirm !== password) {
                setFieldError(confirmInput, "Passwords do not match");
                valid = false;
            }

            if (!valid) return;

            var users = getRegisteredUsers();
            var exists = users.some(function (user) {
                return normalizeEmail(user.email) === email;
            });

            if (exists) {
                setFieldError(emailInput, "Email already registered");
                return;
            }

            users.push({
                id: "user-" + Date.now(),
                firstName: firstName,
                lastName: lastName,
                email: email,
                password: password
            });
            saveRegisteredUsers(users);

            window.location.href = "login.html";
        });
    }

    function guardAuthenticatedPages() {
        var path = window.location.pathname.toLowerCase();
        var needsAuth = path.indexOf("profile.html") !== -1 || path.indexOf("notifications.html") !== -1;
        if (needsAuth && !isLoggedIn()) {
            window.location.replace("login.html");
            return true;
        }
        return false;
    }

    function init() {
        ensureDemoUser();
        if (guardAuthenticatedPages()) return;
        updateNavigation();
        handleLoginForm();
        handleRegisterForm();
    }

    window.AerovaAuth = {
        isLoggedIn: isLoggedIn,
        getCurrentUser: getCurrentUser,
        logout: logout,
        clearAuthState: clearAuthState
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
