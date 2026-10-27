(function () {
    var USERS_KEY = "aerovaRegisteredUsers";
    var USER_KEY = "aerovaUser";
    var LOGGED_IN_KEY = "isLoggedIn";
    var PENDING_EMAIL_KEY = "aerovaPendingEmail";

    /* The three roles, written once: every other script asks the helpers below instead of comparing words. */
    var ROLES = { user: "User", admin: "Admin", superAdmin: "SuperAdmin" };

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

    /* The stored role only decides what is offered (menus, which page to open); the API decides what is allowed. */
    function canUseAdminPanel(user) {
        var current = user || getCurrentUser();
        return !!current && (current.role === ROLES.admin || current.role === ROLES.superAdmin);
    }

    function isSuperAdmin(user) {
        var current = user || getCurrentUser();
        return !!current && current.role === ROLES.superAdmin;
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

    function tr(key, fallback, vars) {
        if (typeof window.t === "function") {
            var value = window.t(key, vars);
            if (value && value !== key) return value;
        }
        var text = fallback;
        if (vars && typeof text === "string") {
            Object.keys(vars).forEach(function (name) {
                text = text.split("{" + name + "}").join(String(vars[name]));
            });
        }
        return text;
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

        if (canUseAdminPanel(user)) {
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
        input.removeAttribute("aria-describedby");
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
            error.setAttribute("role", "alert");
            if (!error.id && input.id) error.id = input.id + "-error";
            if (error.id) input.setAttribute("aria-describedby", error.id);
        }
    }

    /* The submit button while a request is on its way: a spinner replaces the label, and it cannot be pressed twice. */
    function setBusy(button, busy) {
        if (!button) return;
        button.disabled = !!busy;
        button.classList.toggle("is-loading", !!busy);
        if (busy) {
            button.setAttribute("aria-busy", "true");
        } else {
            button.removeAttribute("aria-busy");
        }
    }

    var EYE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    var EYE_OFF_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 6A10.8 10.8 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.2 4M6.6 7.6A16.6 16.6 0 0 0 2 12s3.6 6.5 10 6.5c1.6 0 3-.4 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

    /* A show/hide button inside every password field of the sign-in pages. */
    function enhancePasswordFields() {
        document.querySelectorAll(".auth-card .auth-control").forEach(function (control) {
            var input = control.querySelector("input[type='password']");
            if (!input || control.querySelector(".auth-reveal")) return;

            var row = document.createElement("div");
            row.className = "auth-input-row";
            control.insertBefore(row, input);
            row.appendChild(input);

            var button = document.createElement("button");
            button.type = "button";
            button.className = "auth-reveal";
            row.appendChild(button);

            function paint() {
                var shown = input.type === "text";
                button.innerHTML = shown ? EYE_OFF_ICON : EYE_ICON;
                button.setAttribute("aria-pressed", shown ? "true" : "false");
                button.setAttribute("aria-label", shown ? tr("auth.hidePassword", "Hide password") : tr("auth.showPassword", "Show password"));
            }

            button.addEventListener("click", function () {
                input.type = input.type === "password" ? "text" : "password";
                paint();
            });
            window.addEventListener("aerova:languagechange", paint);
            paint();
        });
    }

    /* The two checks under the password fields of the register page turn gold as they are met. */
    function handleRegisterRules() {
        var list = document.getElementById("register-rules");
        var password = document.getElementById("register-password");
        var confirm = document.getElementById("register-confirm-password");
        if (!list || !password || !confirm) return;

        function mark(rule, met) {
            var item = list.querySelector('[data-rule="' + rule + '"]');
            if (item) item.classList.toggle("is-met", met);
        }

        function paint() {
            mark("length", password.value.length >= 6);
            mark("match", password.value.length > 0 && password.value === confirm.value);
        }

        password.addEventListener("input", paint);
        confirm.addEventListener("input", paint);
        paint();
    }

    /* "ay***@example.com": enough to recognise the address, not enough to hand it to anybody looking over a shoulder. */
    function maskEmail(email) {
        var at = String(email || "").indexOf("@");
        if (at < 1) return "";
        var keep = at > 3 ? 2 : 1;
        return email.slice(0, keep) + "***" + email.slice(at);
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
        var isAdmin = canUseAdminPanel(user);

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

            setBusy(submit, true);

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
                setBusy(submit, false);
            });
        });
    }

    function handleRegisterForm() {
        var form = document.getElementById("register-form");
        if (!form) return;

        bindClearOnInput(form);
        handleRegisterRules();

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
            setBusy(submit, true);

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
                try {
                    window.sessionStorage.setItem(PENDING_EMAIL_KEY, maskEmail(email));
                } catch (storageError) { /* the page then says "your email address" instead of the masked one */ }
                window.location.href = "check-email.html?status=" + (response && response.verificationEmailSent ? "sent" : "nomail");
            }).catch(function (error) {
                passwordInput.value = "";
                confirmInput.value = "";
                showApiFormError(error, { firstName: firstInput, lastName: lastInput, email: emailInput, password: passwordInput, confirmPassword: confirmInput, fallback: emailInput });
                setBusy(submit, false);
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
        } else if (params.get("verified") === "1") {
            showNoticeKey(notice, "api.account.verifiedLogin", "Your email is confirmed. You can now sign in.", "success");
        } else if (params.get("reset") === "1") {
            showNoticeKey(notice, "api.account.resetDone", "Your password was changed. Sign in with your new password.", "success");
        } else if (params.get("needed") === "booking") {
            showNoticeKey(notice, "api.account.signInToBook", "Sign in to continue your booking. The flight and seats you chose are kept.", "");
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
            setBusy(submit, true);

            window.AEROVA_API.post("api/auth/forgot-password", { email: email, language: currentLanguage() }).then(function () {
                // The same step whether or not an account exists: the code page says "if an account exists".
                try { sessionStorage.setItem(RESET_EMAIL_KEY, email); } catch (error) { /* ignore */ }
                window.location.href = "verify-reset-code.html";
            }).catch(function (error) {
                if (error && error.status === 503) {
                    showNoticeKey(result, "api.account.forgotUnavailable", "We cannot send email right now. Please try again later.", "error");
                } else {
                    showApiFormError(error, { email: emailInput, fallback: emailInput });
                }
            }).then(function () {
                setBusy(submit, false);
            });
        });
    }

    /* The ticket a correct code is traded for lives in this tab only; an older reset link still carries its token in the address. */
    var RESET_EMAIL_KEY = "aerovaResetEmail";
    var RESET_TICKET_KEY = "aerovaResetTicket";

    function takeResetTicket() {
        var ticket = "";
        try { ticket = sessionStorage.getItem(RESET_TICKET_KEY) || ""; } catch (error) { /* ignore */ }
        return ticket || takeTokenFromAddress();
    }

    function forgetResetTicket() {
        try { sessionStorage.removeItem(RESET_TICKET_KEY); } catch (error) { /* ignore */ }
    }

    /* Step two of "Forgot your password": six boxes for the code that was e-mailed, then the new password. */
    function handleVerifyResetCodePage() {
        var form = document.getElementById("code-form");
        if (!form) return;

        var email = "";
        try { email = sessionStorage.getItem(RESET_EMAIL_KEY) || ""; } catch (error) { /* ignore */ }
        if (!email) {
            window.location.replace("forgot-password.html");
            return;
        }

        var boxes = Array.prototype.slice.call(form.querySelectorAll(".code-box"));
        var result = document.getElementById("code-result");
        var errorLine = document.getElementById("code-error");
        var subtitle = document.getElementById("code-subtitle");
        var submit = form.querySelector(".auth-submit");
        var resend = document.getElementById("code-resend");
        var cooldown = 0;
        var timer = null;

        function paintSubtitle() {
            subtitle.textContent = tr("api.account.codeSubtitle", "If an account exists for {email}, we sent a 6-digit code. It works for 10 minutes. Check your spam folder too.", { email: email });
        }

        function showError(text) {
            errorLine.textContent = text || "";
            errorLine.hidden = !text;
            boxes.forEach(function (box) {
                box.classList.toggle("is-invalid", !!text);
                box.setAttribute("aria-invalid", text ? "true" : "false");
            });
        }

        function readCode() {
            return boxes.map(function (box) { return box.value; }).join("");
        }

        function clearBoxes() {
            boxes.forEach(function (box) { box.value = ""; });
            boxes[0].focus();
        }

        function paintResend() {
            resend.disabled = cooldown > 0;
            resend.textContent = cooldown > 0
                ? tr("api.account.codeResendIn", "New code in {seconds} s", { seconds: cooldown })
                : tr("api.account.codeResend", "Send a new code");
        }

        function startCooldown(seconds) {
            cooldown = seconds;
            paintResend();
            window.clearInterval(timer);
            timer = window.setInterval(function () {
                cooldown -= 1;
                if (cooldown <= 0) {
                    cooldown = 0;
                    window.clearInterval(timer);
                }
                paintResend();
            }, 1000);
        }

        function fillFrom(startIndex, text) {
            var digits = String(text || "").replace(/\D/g, "");
            for (var i = 0; i < digits.length && startIndex + i < boxes.length; i += 1) {
                boxes[startIndex + i].value = digits.charAt(i);
            }
            var next = Math.min(startIndex + digits.length, boxes.length - 1);
            boxes[next].focus();
        }

        function paintLabels() {
            boxes.forEach(function (box, index) {
                box.setAttribute("aria-label", tr("api.account.codeDigit", "Digit {n} of 6", { n: index + 1 }));
            });
        }

        boxes.forEach(function (box, index) {
            box.addEventListener("input", function () {
                showError("");
                var digits = box.value.replace(/\D/g, "");
                box.value = "";
                if (digits) fillFrom(index, digits);
            });

            box.addEventListener("keydown", function (event) {
                if (event.key === "Backspace" && !box.value && index > 0) {
                    boxes[index - 1].value = "";
                    boxes[index - 1].focus();
                    event.preventDefault();
                } else if (event.key === "ArrowLeft" && index > 0) {
                    boxes[index - 1].focus();
                    event.preventDefault();
                } else if (event.key === "ArrowRight" && index < boxes.length - 1) {
                    boxes[index + 1].focus();
                    event.preventDefault();
                }
            });

            box.addEventListener("paste", function (event) {
                var text = (event.clipboardData || window.clipboardData).getData("text");
                event.preventDefault();
                showError("");
                fillFrom(0, text);
            });
        });

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            showNotice(result, "");

            var code = readCode();
            if (!/^\d{6}$/.test(code)) {
                showError(tr("api.account.codeIncomplete", "Enter all six digits."));
                (boxes.filter(function (box) { return !box.value; })[0] || boxes[0]).focus();
                return;
            }

            showError("");
            setBusy(submit, true);

            window.AEROVA_API.post("api/auth/verify-reset-code", { email: email, code: code }).then(function (answer) {
                try {
                    sessionStorage.setItem(RESET_TICKET_KEY, answer.ticket);
                    sessionStorage.removeItem(RESET_EMAIL_KEY);
                } catch (error) { /* ignore */ }
                window.location.href = "reset-password.html";
            }).catch(function (error) {
                var status = error && error.status;
                if (status === 429) {
                    showError(tr("api.account.codeTooMany", "Too many attempts. Please wait a minute and try again."));
                } else if (status === 422) {
                    showError(tr("api.account.codeInvalid", "That code is not correct or has expired. Check it or ask for a new one."));
                    clearBoxes();
                } else if (status === 400) {
                    showError(tr("api.account.codeIncomplete", "Enter all six digits."));
                } else {
                    showNotice(result, (error && error.userMessage) || tr("api.errors.generic", "Something went wrong. Please try again."), "error");
                }
                setBusy(submit, false);
            });
        });

        resend.addEventListener("click", function () {
            if (cooldown > 0) return;
            showNotice(result, "");
            showError("");
            startCooldown(60);

            window.AEROVA_API.post("api/auth/forgot-password", { email: email, language: currentLanguage() }).then(function () {
                // The same words whether or not an account exists.
                showNoticeKey(result, "api.account.codeResent", "If an account exists for this address, a new code is on its way. The old one no longer works.", "success");
                clearBoxes();
            }).catch(function (error) {
                if (error && error.status === 503) {
                    showNoticeKey(result, "api.account.forgotUnavailable", "We cannot send email right now. Please try again later.", "error");
                } else {
                    showNotice(result, (error && error.userMessage) || tr("api.errors.generic", "Something went wrong. Please try again."), "error");
                }
            });
        });

        paintSubtitle();
        paintLabels();
        startCooldown(60);
        window.addEventListener("aerova:languagechange", function () { paintSubtitle(); paintResend(); paintLabels(); });
        boxes[0].focus();
    }

    /*
     * The confirmed state is kept in this tab at sign-in. A link opened in another tab or on another device changes it on the server
     * only, so while this tab still says "not confirmed" the server is asked once per page. The server stays the judge at booking.
     */
    function refreshVerification() {
        var user = getCurrentUser();
        if (!user || user.emailVerified !== false || !isLoggedIn()) return;

        window.AEROVA_API.get("api/profile").then(function (profile) {
            if (profile && typeof profile.emailVerified === "boolean") {
                updateCurrentUser({ emailVerified: profile.emailVerified });
            }
        }).catch(function () {
            // The stored state stays; nothing is shown for a failed refresh.
        });
    }

    function handleResetPasswordForm() {
        var form = document.getElementById("reset-form");
        if (!form) return;

        bindClearOnInput(form);
        var result = document.getElementById("reset-result");
        var links = document.getElementById("reset-links");
        var token = takeResetTicket();

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
            setBusy(submit, true);

            window.AEROVA_API.post("api/auth/reset-password", { token: token, newPassword: password, confirmPassword: confirm }).then(function () {
                passwordInput.value = "";
                confirmInput.value = "";
                forgetResetTicket();
                window.location.href = "login.html?reset=1";
            }).catch(function (error) {
                passwordInput.value = "";
                confirmInput.value = "";
                if (error && error.status === 422) {
                    forgetResetTicket();
                    linkProblem("api.account.resetInvalid", "This step has expired or was already used. Ask for a new code.");
                } else {
                    showApiFormError(error, { newPassword: passwordInput, confirmPassword: confirmInput, fallback: passwordInput });
                }
                setBusy(submit, false);
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

    function setKeyedText(element, key, fallback) {
        element.textContent = tr(key, fallback);
        element.setAttribute("data-i18n", key);
    }

    /* The page of the link in the e-mail: confirms the address right away and shows how it went. */
    function handleVerifyEmailPage() {
        var status = document.getElementById("verify-status");
        var title = document.getElementById("verify-title");
        var message = document.getElementById("verify-message");
        var redirect = document.getElementById("verify-redirect");
        var feedback = document.getElementById("verify-feedback");
        var signIn = document.getElementById("verify-login");
        var resend = document.getElementById("verify-resend");
        if (!status || !title || !message || !resend || !signIn) return;

        var token = takeTokenFromAddress();

        function show(state, titleKey, titleFallback, textKey, textFallback) {
            status.setAttribute("data-state", state);
            status.removeAttribute("aria-busy");
            setKeyedText(title, titleKey, titleFallback);
            setKeyedText(message, textKey, textFallback);
            signIn.hidden = false;
        }

        function failed(textKey, textFallback, titleKey, titleFallback) {
            show("error", titleKey || "api.account.verifyFailedTitle", titleFallback || "This link will not work", textKey, textFallback);
            if (isLoggedIn()) {
                resend.hidden = false;
            } else {
                showNoticeKey(feedback, "api.account.verifySignInFirst", "Sign in to get a new link.", "");
            }
        }

        resend.addEventListener("click", function () {
            resend.disabled = true;
            requestNewVerificationLink(function (kind) {
                showNotice(feedback, resendMessage(kind), kind === "sent" || kind === "already" ? "success" : "error");
                resend.disabled = false;
            });
        });

        if (!token) {
            failed("api.account.verifyInvalid", "This link is invalid or has expired.");
            return;
        }

        /*
         * Tells the other tabs of this browser (a booking may be waiting in one) that the address is confirmed. The message holds
         * no token or id. A tab that answers carries the booking on, so this one must not send the person to the sign-in page.
         */
        function askOtherTabs(done) {
            var channel = null;
            var finished = false;
            function finish(answered) {
                if (finished) return;
                finished = true;
                try { channel.close(); } catch (closeError) { /* ignore */ }
                done(answered);
            }
            if (!window.BroadcastChannel) { done(false); return; }
            try {
                channel = new window.BroadcastChannel("aerova-email");
            } catch (channelError) { done(false); return; }
            channel.onmessage = function (event) {
                if (event && event.data && event.data.type === "ack") finish(true);
            };
            channel.postMessage({ type: "email-verified" });
            window.setTimeout(function () { finish(false); }, 1200);
        }

        function leaveAfterConfirming() {
            var booking = false;
            try { booking = !!window.sessionStorage.getItem("bookingData"); } catch (storageError) { booking = false; }

            // A mail link usually opens in a new tab with no sign-in of its own; a tab that is signed in keeps its session and its booking.
            if (isLoggedIn()) {
                askOtherTabs(function () {});
                setKeyedText(redirect, "api.account.verifyContinue", "Taking you back to your booking...");
                redirect.hidden = false;
                window.setTimeout(function () {
                    window.location.href = booking ? "payment.html" : "profile.html";
                }, 1500);
                return;
            }

            signIn.setAttribute("href", "login.html?verified=1");
            askOtherTabs(function (answered) {
                if (answered) {
                    setKeyedText(message, "api.account.verifyBookingWaits", "Your booking is waiting in the other AEROVA tab and continues there by itself. You can close this tab.");
                    return;
                }
                redirect.hidden = false;
                // Long enough to read the result; the button is there for anybody who does not want to wait.
                window.setTimeout(function () {
                    window.location.href = "login.html?verified=1";
                }, 2200);
            });
        }

        window.AEROVA_API.post("api/auth/verify-email", { token: token }).then(function () {
            markEmailVerified();
            show("success", "api.account.verifyDoneTitle", "Email confirmed!", "api.account.verifyDoneText", "Your account is ready. You can now sign in securely.");
            leaveAfterConfirming();
        }).catch(function (error) {
            var reason = error && error.status === 422 ? error.code : "";
            if (reason === "link_expired") {
                failed("api.account.verifyExpiredText", "Confirmation links work for 24 hours. Sign in and ask for a new one.", "api.account.verifyExpiredTitle", "This link has expired");
            } else if (reason === "link_confirmed") {
                // Opened twice, or a mail program opened it first: the address is confirmed, nothing is wrong.
                markEmailVerified();
                show("success", "api.account.verifyConfirmedTitle", "Already confirmed", "api.account.verifyConfirmedText", "Your email address was confirmed with this link. You can sign in.");
                askOtherTabs(function () {});
            } else if (reason === "link_used") {
                failed("api.account.verifyUsedText", "Ask for a new link, or sign in if your address is confirmed.", "api.account.verifyUsedTitle", "This link was already used");
            } else if (error && error.status === 422) {
                failed("api.account.verifyInvalid", "This link is invalid or has expired.");
            } else {
                show("error", "api.account.verifyFailedTitle", "This link will not work", "api.errors.generic", "Something went wrong. Please try again.");
                if (error && error.userMessage) message.textContent = error.userMessage;
            }
        });
    }

    /* The page after registering: tells the person to look for the e-mail, with the address partly hidden. */
    function handleCheckEmailPage() {
        var status = document.getElementById("check-status");
        var title = document.getElementById("check-title");
        var text = document.getElementById("check-text");
        if (!status || !title || !text) return;

        var noMail = new URLSearchParams(window.location.search).get("status") === "nomail";
        var masked = "";
        try {
            masked = window.sessionStorage.getItem(PENDING_EMAIL_KEY) || "";
        } catch (storageError) { masked = ""; }

        function paint() {
            status.setAttribute("data-state", noMail ? "success" : "mail");
            if (noMail) {
                title.textContent = tr("api.account.checkNoMailTitle", "Your account is ready");
                text.textContent = tr("api.account.checkNoMailText", "We could not send the confirmation email right now. Sign in and press \"Resend link\" in your profile.");
            } else {
                title.textContent = tr("api.account.checkTitle", "Check your email");
                text.textContent = masked
                    ? tr("api.account.checkText", "We sent a confirmation link to {email}. Open it to activate your account.").replace("{email}", masked)
                    : tr("api.account.checkTextNoAddress", "We sent you a confirmation link. Open it to activate your account.");
            }
            status.querySelectorAll("[data-sent-only]").forEach(function (item) {
                item.hidden = noMail;
            });
        }

        paint();
        window.addEventListener("aerova:languagechange", paint);
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
        window.addEventListener("aerova:userchange", function () { paint(); });
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
        // A booking can only be made while signed in (the server refuses guests), so the pages from choosing seats to paying ask first.
        var bookingPages = [
            "seat-selection.html",
            "passenger-details.html",
            "baggage-selection.html",
            "meal-selection.html",
            "payment.html"
        ];
        var protectedPages = [
            "my-trips.html",
            "profile.html",
            "notifications.html",
            "booking-details.html"
        ].concat(bookingPages);
        var needsAuth = protectedPages.some(function (page) {
            return path.indexOf(page) !== -1;
        });
        var inBookingFlow = bookingPages.some(function (page) {
            return path.indexOf(page) !== -1;
        });

        // Manage Booking works for anyone who knows the reference and a passenger's last name.
        if (needsAuth && path.indexOf("booking-details.html") !== -1 && /[?&]source=manage(&|$)/i.test(window.location.search)) {
            needsAuth = false;
        }

        if (needsAuth && !isLoggedIn()) {
            window.location.replace("login.html?next=" + encodeURIComponent(currentPageName()) + (inBookingFlow ? "&needed=booking" : ""));
            return true;
        }

        return false;
    }

    function init() {
        purgeLegacyAccounts();
        if (guardAuthenticatedPages()) return;
        updateNavigation();
        enhancePasswordFields();
        handleLoginForm();
        handleRegisterForm();
        showLoginNotice();
        handleForgotPasswordForm();
        handleVerifyResetCodePage();
        handleResetPasswordForm();
        handleVerifyEmailPage();
        refreshVerification();
        handleCheckEmailPage();
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
        if (changes && typeof changes.emailVerified === "boolean") user.emailVerified = changes.emailVerified;
        writeJSON(sessionStorage, USER_KEY, user);
        updateNavigation();
        try { window.dispatchEvent(new CustomEvent("aerova:userchange")); } catch (error) { /* older browsers: the next page load shows it */ }
    }

    window.AerovaAuth = {
        roles: ROLES,
        canUseAdminPanel: canUseAdminPanel,
        isSuperAdmin: isSuperAdmin,
        refreshVerification: refreshVerification,
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
