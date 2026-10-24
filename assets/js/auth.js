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

    /* Older versions kept every account, with its password in plain text, in localStorage. Accounts now live in the backend. */
    function purgeLegacyAccounts() {
        try { localStorage.removeItem(USERS_KEY); } catch (error) { /* ignore */ }
        try { localStorage.removeItem(LOGGED_IN_KEY); } catch (error) { /* ignore */ }
        try { localStorage.removeItem(USER_KEY); } catch (error) { /* ignore */ }
        try { sessionStorage.removeItem(LOGGED_IN_KEY); } catch (error) { /* ignore */ }
    }

    function hasSession() {
        return !!(window.AEROVA_API && window.AEROVA_API.session.isActive());
    }



    function isLoggedIn() {
        return hasSession();
    }

    function getCurrentUser() {
        if (!hasSession()) {
            try { sessionStorage.removeItem(USER_KEY); } catch (error) { /* ignore */ }
            return null;
        }
        return readJSON(sessionStorage, USER_KEY);
    }

    /* The token is kept by the API client; here only the name shown in the header and the role are kept. */
    function setLoggedInUser(authResponse) {
        var user = authResponse.user || {};
        var safeUser = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            // False until the owner opens the link that was e-mailed; older sessions have no value (nothing is shown for them).
            emailVerified: user.emailVerified
        };

        if (!window.AEROVA_API.session.save(authResponse)) {
            return null;
        }

        writeJSON(sessionStorage, USER_KEY, safeUser);
        return safeUser;
    }

    function clearAuthState() {
        if (window.AEROVA_API) {
            window.AEROVA_API.session.clear();
        }
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

    function tr(key, fallback) {
        if (typeof window.t === "function") {
            var value = window.t(key);
            if (value && value !== key) return value;
        }
        return fallback;
    }

    function displayName(user) {
        if (!user) return tr("nav.profile", "Profile");
        var first = String(user.firstName || "").trim();
        if (first) return first;
        return tr("nav.profile", "Profile");
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
                /* Logged-in users get the account menu button instead of this link. */
                button.style.display = "none";
                button.href = "profile.html";
                button.textContent = displayName(user);
                button.setAttribute("data-auth-state", "profile");
                button.removeAttribute("data-i18n");
                button.removeAttribute("aria-current");
                if (/profile\.html$/i.test(window.location.pathname) || window.location.href.indexOf("profile.html") !== -1) {
                    button.setAttribute("aria-current", "page");
                }
            } else {
                button.style.display = "";
                button.href = "login.html";
                button.textContent = tr("nav.login", "Login");
                button.setAttribute("data-auth-state", "login");
                button.setAttribute("data-i18n", "nav.login");
                button.removeAttribute("aria-current");
            }
        });

        if (headerActions) {
            /* Notifications lives in the account menu; no standalone navbar link. */
            headerActions.querySelectorAll(".auth-nav-notifications, .auth-nav-logout").forEach(function (el) {
                el.remove();
            });

            syncDesktopAccountMenu(headerActions, loggedIn ? user : null);
        }

        if (drawerNav) {
            /* Notifications and Logout now live in the drawer account section. */
            drawerNav.querySelectorAll(".auth-nav-notifications-drawer, .auth-nav-logout-drawer").forEach(function (el) {
                el.remove();
            });
            syncDrawerAccountMenu(drawerNav, loggedIn ? user : null);
        }

        updateNotificationBadges();

        document.querySelectorAll("[data-auth-logout]").forEach(function (el) {
            el.addEventListener("click", function (event) {
                event.preventDefault();
                logout();
            });
        });
    }

    /*
     * Account menu: logged-in users get a profile button that opens My Profile,
     * My Trips, Notifications (with unread badge) and Logout. Desktop uses a
     * dropdown menu; the mobile drawer uses an inline expandable list.
     */
    var ACCOUNT_STYLE_ID = "aerova-account-menu-style";
    var ACCOUNT_ITEMS = [
        { href: "profile.html", key: "profile.title", fallback: "My Profile" },
        { href: "my-trips.html", key: "nav.myTrips", fallback: "My Trips" },
        { href: "notifications.html", key: "nav.notifications", fallback: "Notifications", badge: true },
        { logout: true, key: "nav.logout", fallback: "Logout" }
    ];
    var ADMIN_ITEM = { href: "admin.html", key: "nav.adminPanel", fallback: "Admin Panel" };
    var accountDocumentBound = false;

    /* The menu items for the signed-in user: an Admin also sees the admin panel (the backend still checks the role on every admin request). */
    function accountItems() {
        var user = getCurrentUser();
        var items = ACCOUNT_ITEMS.slice();

        if (user && user.role === "Admin") {
            items.splice(items.length - 1, 0, ADMIN_ITEM);
        }

        return items;
    }

    function currentPageName() {
        var parts = String(window.location.pathname || "").split("/");
        return (parts[parts.length - 1] || "index.html").toLowerCase();
    }

    function ensureAccountMenuStyles() {
        if (document.getElementById(ACCOUNT_STYLE_ID)) return;
        var style = document.createElement("style");
        style.id = ACCOUNT_STYLE_ID;
        style.textContent =
            ".header-actions{position:relative;}" +
            ".account-menu-button{gap:0.5em;background:transparent;font-family:inherit;cursor:pointer;}" +
            ".account-menu-caret{display:inline-block;font-size:0.8em;line-height:1;transition:transform 0.2s ease;}" +
            "[aria-expanded=\"true\"]>.account-menu-caret{transform:rotate(180deg);}" +
            ".account-menu{position:absolute;top:calc(100% + 0.65rem);right:0;z-index:1000;min-width:14rem;margin:0;padding:0.4rem;list-style:none;" +
            "background:#0b1a2c;border:1px solid rgba(198,163,106,0.45);border-radius:14px;box-shadow:0 18px 40px rgba(0,0,0,0.45);}" +
            ".account-menu[hidden],.account-drawer-list[hidden]{display:none;}" +
            ".account-menu-sep{margin-top:0.3rem;padding-top:0.3rem;border-top:1px solid rgba(246,241,231,0.12);}" +
            ".account-menu-item{display:flex;align-items:center;justify-content:space-between;gap:0.75rem;width:100%;padding:0.72rem 0.9rem;" +
            "border:0;border-radius:9px;background:transparent;color:#f6f1e7;font:inherit;font-size:0.74rem;font-weight:400;letter-spacing:0.14em;" +
            "line-height:1.3;text-align:left;text-decoration:none;text-transform:uppercase;white-space:nowrap;cursor:pointer;}" +
            ".account-menu-item:hover,.account-menu-item:focus-visible{background:rgba(198,163,106,0.16);color:#e3c78f;}" +
            ".account-menu-item:focus-visible{outline:2px solid #c6a36a;outline-offset:-2px;}" +
            ".account-menu-item[aria-current=\"page\"]{color:#e3c78f;}" +
            ".account-menu-item .aerova-notif-badge{margin-left:0;}" +
            ".account-drawer-list{display:flex;flex-direction:column;width:100%;margin:0.75rem 0 0;padding:0 0 0 0.9rem;list-style:none;" +
            "border-left:1px solid rgba(198,163,106,0.45);}" +
            ".account-drawer-list .account-menu-item{padding:0.85rem 0.5rem;border-radius:0;font-size:0.8rem;border-bottom:1px solid rgba(246,241,231,0.1);}" +
            ".account-drawer-list .account-menu-sep{margin-top:0;padding-top:0;border-top:0;}";
        (document.head || document.documentElement).appendChild(style);
    }

    function buildAccountItems(list, asMenu) {
        var page = currentPageName();
        accountItems().forEach(function (item) {
            var li = document.createElement("li");
            if (asMenu) li.setAttribute("role", "none");
            if (item.logout) li.className = "account-menu-sep";
            var el;
            if (item.logout) {
                el = document.createElement("button");
                el.type = "button";
                el.className = "account-menu-item account-menu-logout";
                el.addEventListener("click", function (event) {
                    event.preventDefault();
                    logout();
                });
            } else {
                el = document.createElement("a");
                el.className = "account-menu-item";
                el.href = item.href;
                if (item.badge) el.classList.add("auth-nav-notifications-menu");
                if (page === item.href) el.setAttribute("aria-current", "page");
            }
            if (asMenu) {
                el.setAttribute("role", "menuitem");
                el.tabIndex = -1;
            }
            var label = document.createElement("span");
            label.className = "account-menu-label";
            label.setAttribute("data-i18n", item.key);
            label.textContent = tr(item.key, item.fallback);
            el.appendChild(label);
            li.appendChild(el);
            list.appendChild(li);
        });
    }

    function refreshAccountLabels(root) {
        root.querySelectorAll(".account-menu-label[data-i18n]").forEach(function (label) {
            var key = label.getAttribute("data-i18n");
            var item = accountItems().filter(function (entry) { return entry.key === key; })[0];
            label.textContent = tr(key, item ? item.fallback : label.textContent);
        });
    }

    function setAccountButtonName(button, user) {
        var name = button.querySelector(".account-menu-name");
        if (name) name.textContent = displayName(user);
        button.setAttribute("data-account-label", displayName(user) + " – " + tr("nav.accountMenu", "Account menu"));
        button.setAttribute("aria-label", button.getAttribute("data-account-label"));
    }

    function buildAccountButton(className, id, controls) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = className;
        button.id = id;
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-controls", controls);
        var name = document.createElement("span");
        name.className = "account-menu-name";
        var caret = document.createElement("span");
        caret.className = "account-menu-caret";
        caret.setAttribute("aria-hidden", "true");
        caret.textContent = "\u25BE";
        button.appendChild(name);
        button.appendChild(caret);
        return button;
    }

    function menuItems(menu) {
        return Array.prototype.slice.call(menu.querySelectorAll("[role='menuitem']"));
    }

    function setDesktopMenuOpen(open, focusTarget) {
        var button = document.getElementById("account-menu-button");
        var menu = document.getElementById("account-menu");
        if (!button || !menu) return;
        button.setAttribute("aria-expanded", open ? "true" : "false");
        menu.hidden = !open;
        if (open) {
            var items = menuItems(menu);
            var target = focusTarget === "last" ? items[items.length - 1] : items[0];
            if (target) target.focus();
        } else if (focusTarget === "button") {
            button.focus();
        }
    }

    function closeDrawerAccount(focusToggle) {
        var toggle = document.getElementById("account-drawer-toggle");
        var list = document.getElementById("account-drawer-list");
        if (!toggle || !list) return;
        toggle.setAttribute("aria-expanded", "false");
        list.hidden = true;
        if (focusToggle) toggle.focus();
    }

    function bindAccountDocumentEvents() {
        if (accountDocumentBound) return;
        accountDocumentBound = true;
        document.addEventListener("click", function (event) {
            var button = document.getElementById("account-menu-button");
            var menu = document.getElementById("account-menu");
            if (!button || !menu || menu.hidden) return;
            if (button.contains(event.target) || menu.contains(event.target)) return;
            setDesktopMenuOpen(false);
        });
        document.addEventListener("keydown", function (event) {
            if (event.key !== "Escape" && event.key !== "Esc") return;
            var menu = document.getElementById("account-menu");
            if (menu && !menu.hidden) {
                event.preventDefault();
                setDesktopMenuOpen(false, "button");
            }
        });
        window.addEventListener("resize", function () {
            setDesktopMenuOpen(false);
        });
    }

    function syncDesktopAccountMenu(headerActions, user) {
        var button = headerActions.querySelector("#account-menu-button");
        var menu = headerActions.querySelector("#account-menu");

        if (!user) {
            if (button) button.remove();
            if (menu) menu.remove();
            return;
        }

        ensureAccountMenuStyles();
        if (!button) {
            button = buildAccountButton("login-button account-menu-button auth-nav-notifications-menu", "account-menu-button", "account-menu");
            button.setAttribute("aria-haspopup", "menu");
            menu = document.createElement("ul");
            menu.className = "account-menu";
            menu.id = "account-menu";
            menu.setAttribute("role", "menu");
            menu.setAttribute("aria-labelledby", "account-menu-button");
            menu.hidden = true;
            buildAccountItems(menu, true);

            var anchor = headerActions.querySelector(".login-button:not(.login-button--drawer):not(.account-menu-button)");
            var before = anchor ? anchor.nextSibling : headerActions.querySelector(".menu-toggle");
            headerActions.insertBefore(button, before);
            headerActions.insertBefore(menu, button.nextSibling);

            button.addEventListener("click", function () {
                setDesktopMenuOpen(button.getAttribute("aria-expanded") !== "true");
            });
            button.addEventListener("keydown", function (event) {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    setDesktopMenuOpen(true, event.key === "ArrowUp" ? "last" : "first");
                }
            });
            menu.addEventListener("keydown", function (event) {
                var items = menuItems(menu);
                var index = items.indexOf(document.activeElement);
                var next = null;
                if (event.key === "ArrowDown") next = items[(index + 1) % items.length];
                else if (event.key === "ArrowUp") next = items[(index - 1 + items.length) % items.length];
                else if (event.key === "Home") next = items[0];
                else if (event.key === "End") next = items[items.length - 1];
                else if (event.key === "Tab") setDesktopMenuOpen(false);
                if (next) {
                    event.preventDefault();
                    next.focus();
                }
            });
            bindAccountDocumentEvents();
        }
        setAccountButtonName(button, user);
        refreshAccountLabels(menu);
    }

    function syncDrawerAccountMenu(drawerNav, user) {
        var toggle = drawerNav.querySelector("#account-drawer-toggle");
        var list = drawerNav.querySelector("#account-drawer-list");

        if (!user) {
            if (toggle) toggle.remove();
            if (list) list.remove();
            return;
        }

        ensureAccountMenuStyles();
        if (!toggle) {
            toggle = buildAccountButton("login-button login-button--drawer account-drawer-toggle auth-nav-notifications-menu", "account-drawer-toggle", "account-drawer-list");
            list = document.createElement("ul");
            list.className = "account-drawer-list";
            list.id = "account-drawer-list";
            list.hidden = true;
            buildAccountItems(list, false);

            var anchor = drawerNav.querySelector(".login-button--drawer:not(.account-drawer-toggle)");
            drawerNav.insertBefore(toggle, anchor ? anchor.nextSibling : null);
            drawerNav.insertBefore(list, toggle.nextSibling);

            toggle.addEventListener("click", function () {
                var open = toggle.getAttribute("aria-expanded") !== "true";
                toggle.setAttribute("aria-expanded", open ? "true" : "false");
                list.hidden = !open;
            });
            /* Escape inside the account list collapses only the list; a second Escape closes the drawer. */
            list.addEventListener("keydown", function (event) {
                if (event.key !== "Escape" && event.key !== "Esc") return;
                event.preventDefault();
                event.stopPropagation();
                closeDrawerAccount(true);
            });
            bindAccountDocumentEvents();
        }
        setAccountButtonName(toggle, user);
        refreshAccountLabels(list);
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

    /* Shows what the API says about each field, or the message under the password when it is about the form as a whole. */
    function showApiFormError(error, fields) {
        var isApiError = window.AEROVA_API && error instanceof window.AEROVA_API.ApiError;
        var shown = false;

        if (!isApiError) {
            if (window.console) window.console.error(error);
            setFieldError(fields.fallback, tr("api.errors.generic", "Something went wrong. Please try again."));
            return;
        }

        if (error.status === 400 && error.errors && typeof error.errors === "object") {
            Object.keys(error.errors).forEach(function (name) {
                var input = fields[String(name).charAt(0).toLowerCase() + String(name).slice(1)];
                var messages = error.errors[name];
                if (input && messages && messages.length) {
                    setFieldError(input, String(messages[0]));
                    shown = true;
                }
            });
        }

        if (!shown) {
            setFieldError(error.status === 409 && fields.email ? fields.email : fields.fallback, error.status === 409 ? tr("auth.emailExists", "An account with this email already exists") : error.userMessage);
        }
    }

    /*
     * After signing in, go back to the page the visitor wanted (a page of this site only). Without one, an Admin goes to the
     * admin panel and everybody else home; a page asked for ("next") that is the admin panel is only kept for an Admin.
     */
    function pageAfterLogin(user) {
        var wanted = new URLSearchParams(window.location.search).get("next") || "";
        var isAdmin = !!user && user.role === "Admin";

        if (/^[a-z0-9-]+\.html(\?[\w=&%.-]*)?$/i.test(wanted) && (isAdmin || !/^admin\.html/i.test(wanted))) {
            return wanted;
        }

        return isAdmin ? "admin.html" : "index.html";
    }

    function handleLoginForm() {
        var form = document.getElementById("login-form");
        if (!form) return;

        bindClearOnInput(form);

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            var emailInput = document.getElementById("login-email");
            var passwordInput = document.getElementById("login-password");
            var submit = form.querySelector(".auth-submit");
            var email = normalizeEmail(emailInput.value);
            var password = String(passwordInput.value || "");
            var valid = true;

            clearFieldError(emailInput);
            clearFieldError(passwordInput);

            if (!email) {
                setFieldError(emailInput, tr("auth.emailRequired", "Email is required"));
                valid = false;
            } else if (!isValidEmail(email)) {
                setFieldError(emailInput, tr("auth.emailInvalid", "Enter a valid email address"));
                valid = false;
            }

            if (!password) {
                setFieldError(passwordInput, tr("auth.passwordRequired", "Password is required"));
                valid = false;
            } else if (password.length < 6) {
                setFieldError(passwordInput, tr("auth.passwordShort", "Password must be at least 6 characters"));
                valid = false;
            }

            if (!valid) return;

            if (submit) submit.disabled = true;

            window.AEROVA_API.post("api/auth/login", { email: email, password: password }).then(function (response) {
                var signedIn = setLoggedInUser(response);
                if (!signedIn) {
                    throw new TypeError("The sign-in response had no token.");
                }
                passwordInput.value = "";
                window.location.href = pageAfterLogin(signedIn);
            }).catch(function (error) {
                passwordInput.value = "";
                if (error && error.status === 401) {
                    setFieldError(emailInput, tr("auth.loginFailed", "Incorrect email or password"));
                    setFieldError(passwordInput, tr("auth.loginFailed", "Incorrect email or password"));
                } else if (error && error.status === 429) {
                    // Sign-in is paused for this address after repeated failures, or this network sent too many requests.
                    setFieldError(passwordInput, tr("api.account.loginLocked", "Too many failed attempts. Please wait about 15 minutes before trying again."));
                } else {
                    showApiFormError(error, { email: emailInput, password: passwordInput, fallback: passwordInput });
                }
                if (submit) submit.disabled = false;
            });
        });
    }

    function handleRegisterForm() {
        var form = document.getElementById("register-form");
        if (!form) return;

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
                setFieldError(firstInput, tr("auth.firstRequired", "First name is required"));
                valid = false;
            }

            if (!lastName) {
                setFieldError(lastInput, tr("auth.lastRequired", "Last name is required"));
                valid = false;
            }

            if (!email) {
                setFieldError(emailInput, tr("auth.emailRequired", "Email is required"));
                valid = false;
            } else if (!isValidEmail(email)) {
                setFieldError(emailInput, tr("auth.emailInvalid", "Enter a valid email address"));
                valid = false;
            }

            if (!password) {
                setFieldError(passwordInput, tr("auth.passwordRequired", "Password is required"));
                valid = false;
            } else if (password.length < 6) {
                setFieldError(passwordInput, tr("auth.passwordShort", "Password must be at least 6 characters"));
                valid = false;
            }

            if (!confirm) {
                setFieldError(confirmInput, tr("auth.confirmRequired", "Please confirm your password"));
                valid = false;
            } else if (password && confirm !== password) {
                setFieldError(confirmInput, tr("auth.passwordMismatch", "Passwords do not match"));
                valid = false;
            }

            if (!valid) return;

            var submit = form.querySelector(".auth-submit");
            if (submit) submit.disabled = true;

            window.AEROVA_API.post("api/auth/register", {
                firstName: firstName,
                lastName: lastName,
                email: email,
                password: password,
                confirmPassword: confirm,
                language: currentLanguage()
            }).then(function (response) {
                // Registering does not sign anybody in: the person confirms the address with the e-mailed link and signs in.
                passwordInput.value = "";
                confirmInput.value = "";
                window.location.href = "login.html?registered=" + (response && response.verificationEmailSent ? "sent" : "nomail");
            }).catch(function (error) {
                passwordInput.value = "";
                confirmInput.value = "";
                showApiFormError(error, { firstName: firstInput, lastName: lastInput, email: emailInput, password: passwordInput, confirmPassword: confirmInput, fallback: emailInput });
                if (submit) submit.disabled = false;
            });
        });
    }

    function currentLanguage() {
        if (window.AEROVA_I18N && typeof window.AEROVA_I18N.getLanguage === "function") {
            return window.AEROVA_I18N.getLanguage();
        }
        return document.documentElement.lang || "en";
    }

    /* A message inside the card; kind is "success", "error" or nothing. */
    function showNotice(element, text, kind) {
        if (!element) return;
        element.removeAttribute("data-i18n");
        element.textContent = text || "";
        element.className = "auth-notice" + (kind ? " auth-notice--" + kind : "");
        element.hidden = !text;
    }

    /* The same with a text from the language files: the key stays on the element, so the text follows a change of language. */
    function showNoticeKey(element, key, fallback, kind) {
        if (!element) return;
        showNotice(element, tr(key, fallback), kind);
        element.setAttribute("data-i18n", key);
    }

    /* The token of an e-mailed link. It is a secret for one use: take it out of the address bar and the history right away. */
    function takeTokenFromAddress() {
        var token = new URLSearchParams(window.location.search).get("token") || "";
        if (token && window.history && typeof window.history.replaceState === "function") {
            window.history.replaceState(null, "", window.location.pathname);
        }
        return token;
    }

    /* The login page after registering or choosing a new password. */
    function showLoginNotice() {
        var notice = document.getElementById("login-notice");
        if (!notice) return;

        var params = new URLSearchParams(window.location.search);
        var registered = params.get("registered");

        if (registered === "sent") {
            showNoticeKey(notice, "api.account.registeredSent", "Account created. We sent a confirmation link to your email address. Open it, then sign in.", "success");
        } else if (registered === "nomail") {
            showNoticeKey(notice, "api.account.registeredNoMail", "Account created. We could not send the confirmation email right now. Sign in, then ask for a new link in your profile.", "");
        } else if (params.get("reset") === "1") {
            showNoticeKey(notice, "api.account.resetDone", "Your password was changed. Sign in with your new password.", "success");
        }
    }

    function handleForgotPasswordForm() {
        var form = document.getElementById("forgot-form");
        if (!form) return;

        bindClearOnInput(form);
        var result = document.getElementById("forgot-result");

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            var emailInput = document.getElementById("forgot-email");
            var email = normalizeEmail(emailInput.value);
            clearFieldError(emailInput);
            showNotice(result, "");

            if (!email) {
                setFieldError(emailInput, tr("auth.emailRequired", "Email is required"));
                return;
            }
            if (!isValidEmail(email)) {
                setFieldError(emailInput, tr("auth.emailInvalid", "Enter a valid email address"));
                return;
            }

            var submit = form.querySelector(".auth-submit");
            if (submit) submit.disabled = true;

            window.AEROVA_API.post("api/auth/forgot-password", { email: email, language: currentLanguage() }).then(function () {
                // The same words whether or not an account exists.
                showNoticeKey(result, "api.account.forgotSent", "If an account exists for this address, we sent a link to choose a new password. It works for one hour. Check your spam folder too.", "success");
                emailInput.value = "";
            }).catch(function (error) {
                if (error && error.status === 503) {
                    showNoticeKey(result, "api.account.forgotUnavailable", "We cannot send email right now. Please try again later.", "error");
                } else {
                    showApiFormError(error, { email: emailInput, fallback: emailInput });
                }
            }).then(function () {
                if (submit) submit.disabled = false;
            });
        });
    }

    function handleResetPasswordForm() {
        var form = document.getElementById("reset-form");
        if (!form) return;

        bindClearOnInput(form);
        var result = document.getElementById("reset-result");
        var links = document.getElementById("reset-links");
        var token = takeTokenFromAddress();

        function linkProblem(key, fallback) {
            form.hidden = true;
            showNoticeKey(result, key, fallback, "error");
            if (links) links.hidden = false;
        }

        if (!token) {
            linkProblem("api.account.resetNoToken", "This link is incomplete. Ask for a new one.");
            return;
        }

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            var passwordInput = document.getElementById("reset-password");
            var confirmInput = document.getElementById("reset-confirm");
            var password = String(passwordInput.value || "");
            var confirm = String(confirmInput.value || "");
            var valid = true;

            [passwordInput, confirmInput].forEach(clearFieldError);

            if (!password) {
                setFieldError(passwordInput, tr("auth.passwordRequired", "Password is required"));
                valid = false;
            } else if (password.length < 6) {
                setFieldError(passwordInput, tr("auth.passwordShort", "Password must be at least 6 characters"));
                valid = false;
            }

            if (!confirm) {
                setFieldError(confirmInput, tr("auth.confirmRequired", "Please confirm your password"));
                valid = false;
            } else if (password && confirm !== password) {
                setFieldError(confirmInput, tr("auth.passwordMismatch", "Passwords do not match"));
                valid = false;
            }

            if (!valid) return;

            var submit = form.querySelector(".auth-submit");
            if (submit) submit.disabled = true;

            window.AEROVA_API.post("api/auth/reset-password", { token: token, newPassword: password, confirmPassword: confirm }).then(function () {
                passwordInput.value = "";
                confirmInput.value = "";
                window.location.href = "login.html?reset=1";
            }).catch(function (error) {
                passwordInput.value = "";
                confirmInput.value = "";
                if (error && error.status === 422) {
                    linkProblem("api.account.resetInvalid", "This link is invalid or has expired. Ask for a new one.");
                } else {
                    showApiFormError(error, { newPassword: passwordInput, confirmPassword: confirmInput, fallback: passwordInput });
                }
                if (submit) submit.disabled = false;
            });
        });
    }

    /* Asks for a new verification e-mail for the signed-in account; done(kind) gets "sent", "already", "wait", "unavailable", "signin" or "error". */
    function requestNewVerificationLink(done) {
        window.AEROVA_API.post("api/auth/resend-verification", { language: currentLanguage() }).then(function () {
            done("sent");
        }).catch(function (error) {
            var status = error && error.status;
            if (status === 409) {
                markEmailVerified();
                done("already");
            } else if (status === 429) {
                done("wait");
            } else if (status === 503) {
                done("unavailable");
            } else if (status === 401) {
                done("signin");
            } else {
                done("error");
            }
        });
    }

    function resendMessage(kind) {
        var texts = {
            sent: ["api.account.verifyResent", "We sent a new link. Check your inbox and spam folder."],
            already: ["api.account.verifyAlready", "Your email address is already confirmed."],
            wait: ["api.account.verifyWait", "Please wait a minute before asking for another link."],
            unavailable: ["api.account.verifyUnavailable", "We cannot send email right now. Please try again later."],
            signin: ["api.account.verifySignInFirst", "Sign in to get a new link."],
            error: ["api.errors.generic", "Something went wrong. Please try again."]
        };
        var pair = texts[kind] || texts.error;
        return tr(pair[0], pair[1]);
    }

    /* The page of the link in the e-mail: confirms the address right away. */
    function handleVerifyEmailPage() {
        var message = document.getElementById("verify-message");
        var resend = document.getElementById("verify-resend");
        if (!message || !resend) return;

        var token = takeTokenFromAddress();

        function failed() {
            showNoticeKey(message, "api.account.verifyInvalid", "This link is invalid or has expired.", "error");
            resend.hidden = !isLoggedIn();
        }

        resend.addEventListener("click", function () {
            resend.disabled = true;
            requestNewVerificationLink(function (kind) {
                showNotice(message, resendMessage(kind), kind === "sent" || kind === "already" ? "success" : "error");
                resend.disabled = false;
            });
        });

        if (!token) {
            failed();
            return;
        }

        window.AEROVA_API.post("api/auth/verify-email", { token: token }).then(function () {
            markEmailVerified();
            showNoticeKey(message, "api.account.verifyDone", "Your email address is confirmed. Thank you!", "success");
        }).catch(function (error) {
            if (error && error.status === 422) {
                failed();
            } else {
                showNotice(message, error && error.userMessage ? error.userMessage : tr("api.errors.generic", "Something went wrong. Please try again."), "error");
            }
        });
    }

    /* Remembers in this tab that the signed-in address is confirmed (what the profile banner reads). */
    function markEmailVerified() {
        var user = getCurrentUser();
        if (!user) return;
        user.emailVerified = true;
        writeJSON(sessionStorage, USER_KEY, user);
    }

    /* The profile page: a reminder with a button while the address is not confirmed. */
    function handleVerifyBanner() {
        var banner = document.getElementById("email-verify-banner");
        if (!banner) return;

        function paint(extra) {
            var user = getCurrentUser();
            if (!user || user.emailVerified !== false) {
                banner.hidden = true;
                return;
            }

            banner.innerHTML = "";
            var text = document.createElement("p");
            text.className = "verify-banner-text";
            text.textContent = extra || tr("api.account.bannerText", "Your email address is not confirmed yet. Confirm it to book flights.");
            var button = document.createElement("button");
            button.type = "button";
            button.className = "verify-banner-button";
            button.textContent = tr("api.account.bannerButton", "Resend link");
            button.addEventListener("click", function () {
                button.disabled = true;
                requestNewVerificationLink(function (kind) {
                    if (kind === "already") {
                        paint();
                        return;
                    }
                    paint(resendMessage(kind));
                });
            });
            banner.appendChild(text);
            banner.appendChild(button);
            banner.hidden = false;
        }

        paint();
        window.addEventListener("aerova:languagechange", function () { paint(); });
    }


    /* Unread badge for the Notifications nav links; the number comes from GET api/notifications/unread-count. */
    var BADGE_STYLE_ID = "aerova-notif-badge-style";

    /* Number of unread notifications as last reported by the API (0 when signed out). */
    var unreadCount = 0;

    function getUnreadNotificationCount() {
        return unreadCount;
    }

    function ensureBadgeStyles() {
        if (document.getElementById(BADGE_STYLE_ID)) return;
        var style = document.createElement("style");
        style.id = BADGE_STYLE_ID;
        style.textContent =
            ".aerova-notif-badge{display:inline-flex;align-items:center;justify-content:center;min-width:1.35em;height:1.35em;" +
            "margin-left:0.45em;padding:0 0.38em;border-radius:999px;background:#c6a36a;color:#07111d;" +
            "box-shadow:0 0 0 1px rgba(246,241,231,0.35);font-size:0.68rem;font-weight:600;line-height:1;" +
            "letter-spacing:0;text-transform:none;vertical-align:0.12em;}" +
            ".aerova-notif-badge[hidden]{display:none;}";
        (document.head || document.documentElement).appendChild(style);
    }

    function paintNotificationBadges() {
        var links = document.querySelectorAll(".auth-nav-notifications-menu");
        if (!links.length) return;
        ensureBadgeStyles();
        var count = isLoggedIn() ? unreadCount : 0;
        var label = count + " " + tr("common.unread", "Unread");

        links.forEach(function (link) {
            var badge = link.querySelector(".aerova-notif-badge");
            if (!badge) {
                badge = document.createElement("span");
                badge.className = "aerova-notif-badge";
                var caret = link.querySelector(".account-menu-caret");
                if (caret) link.insertBefore(badge, caret);
                else link.appendChild(badge);
            }
            badge.textContent = count > 99 ? "99+" : String(count);
            badge.hidden = count <= 0;
            badge.setAttribute("aria-label", label);
            badge.title = label;
            if (link.hasAttribute("data-account-label")) {
                link.setAttribute("aria-label", link.getAttribute("data-account-label") + (count > 0 ? ", " + label : ""));
            }
        });
    }

    function updateNotificationBadges() {
        if (!isLoggedIn()) {
            unreadCount = 0;
            paintNotificationBadges();
            return;
        }

        paintNotificationBadges();
        window.AEROVA_API.get("api/notifications/unread-count").then(function (count) {
            unreadCount = Number(count) || 0;
            paintNotificationBadges();
        }, function () {
            // Keep the last known number; the badge is a convenience, not something to interrupt the visitor for.
        });
    }

    function guardAuthenticatedPages() {
        var path = window.location.pathname.toLowerCase();
        var protectedPages = [
            "my-trips.html",
            "profile.html",
            "notifications.html",
            "booking-details.html"
        ];
        var needsAuth = protectedPages.some(function (page) {
            return path.indexOf(page) !== -1;
        });

        // Manage Booking works for anyone who knows the reference and a passenger's last name.
        if (needsAuth && path.indexOf("booking-details.html") !== -1 && /[?&]source=manage(&|$)/i.test(window.location.search)) {
            needsAuth = false;
        }

        if (needsAuth && !isLoggedIn()) {
            window.location.replace("login.html?next=" + encodeURIComponent(currentPageName()));
            return true;
        }

        return false;
    }

    function init() {
        purgeLegacyAccounts();
        if (guardAuthenticatedPages()) return;
        updateNavigation();
        handleLoginForm();
        handleRegisterForm();
        showLoginNotice();
        handleForgotPasswordForm();
        handleResetPasswordForm();
        handleVerifyEmailPage();
        handleVerifyBanner();
        window.addEventListener("aerova:languagechange", function () {
            updateNavigation();
            showLoginNotice();
        });
        // The API rejected the token (it ran out): forget it and send the visitor to sign in again.
        window.addEventListener("aerova:session-expired", function () {
            clearAuthState();
            updateNavigation();
            if (guardAuthenticatedPages()) return;
        });
        window.addEventListener("aerova:notificationschange", updateNotificationBadges);
        window.addEventListener("pageshow", updateNotificationBadges);
        window.addEventListener("storage", function (event) {
            if (!event.key) {
                updateNotificationBadges();
            }
        });
    }

    /* After the profile changed: keep the name shown in the header in step with it. */
    function updateCurrentUser(changes) {
        var user = getCurrentUser();
        if (!user) return;
        ["firstName", "lastName", "email"].forEach(function (key) {
            if (changes && changes[key]) user[key] = changes[key];
        });
        writeJSON(sessionStorage, USER_KEY, user);
        updateNavigation();
    }

    window.AerovaAuth = {
        updateCurrentUser: updateCurrentUser,
        isLoggedIn: isLoggedIn,
        getCurrentUser: getCurrentUser,
        logout: logout,
        clearAuthState: clearAuthState,
        updateNotificationBadges: updateNotificationBadges,
        getUnreadNotificationCount: getUnreadNotificationCount
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
