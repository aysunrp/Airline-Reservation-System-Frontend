(function () {
    "use strict";

    var api = window.AEROVA_API;
    var section = document.getElementById("hero");
    var background = section && section.querySelector(".hero-background");
    var video = section && section.querySelector(".hero-video");
    if (!api || !background || !video) {
        return;
    }

    var STATIC_HERO_IMAGE = "assets/images/hero-jet-dusk-hd.webp";
    /* The video that ships with the website: shown when the API is not running or has no hero video, so the page opens with a video on its own. */
    var LOCAL_HERO = { videoUrl: "assets/video/aerova-hero-night-flight-hd.mp4", posterUrl: "assets/video/aerova-hero-night-flight-poster.jpg" };
    var triedLocalVideo = false;
    background.classList.add("awaiting-hero-video");
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var narrow = window.matchMedia("(max-width: 768px)");

    function resolveUrl(path) {
        if (!path) {
            return "";
        }
        if (/^https?:\/\//i.test(path) || String(path).indexOf("assets/") === 0) {
            return path;
        }
        return api.url(String(path).replace(/^\/+/, ""));
    }

    function pickSource(payload) {
        if (narrow.matches && payload.mobileVideoUrl) {
            return payload.mobileVideoUrl;
        }
        return payload.videoUrl;
    }

    function introBlocksAutoplay() {
        try {
            return document.documentElement.classList.contains("is-brand-intro-pending")
                || document.documentElement.classList.contains("is-brand-intro-handoff");
        } catch (error) {
            return false;
        }
    }

    function tryPlay() {
        if (introBlocksAutoplay()) {
            return;
        }
        var playAttempt = video.play();
        if (playAttempt && typeof playAttempt.catch === "function") {
            playAttempt.catch(function () {
                background.classList.remove("is-video-ready");
            });
        }
    }

    function useFallbackOnly() {
        if (!triedLocalVideo) {
            triedLocalVideo = true;
            applyPayload(LOCAL_HERO);
            return;
        }
        background.classList.remove("has-hero-video", "is-video-ready", "awaiting-hero-video", "is-reduced-motion");
        video.hidden = true;
        video.removeAttribute("poster");
        video.removeAttribute("src");
        video.load();
        window.dispatchEvent(new CustomEvent("aerova:hero-video-ready", { detail: { fallback: true } }));
    }

    function applyPayload(payload) {
        if (!payload || !payload.videoUrl) {
            useFallbackOnly();
            return;
        }

        var src = resolveUrl(pickSource(payload));
        var poster = payload.posterUrl ? resolveUrl(payload.posterUrl) : "";
        if (!src) {
            useFallbackOnly();
            return;
        }

        background.classList.add("has-hero-video");
        background.classList.remove("awaiting-hero-video");
        if (poster) {
            video.poster = poster;
        } else {
            video.removeAttribute("poster");
        }
        video.hidden = false;

        if (reducedMotion) {
            background.classList.add("is-reduced-motion");
            background.classList.add("is-video-ready");
            video.removeAttribute("autoplay");
            video.muted = true;
            video.playsInline = true;
            video.src = src;
            video.load();
            video.pause();
            window.dispatchEvent(new CustomEvent("aerova:hero-video-ready", { detail: { src: src, reduced: true } }));
            return;
        }

        background.classList.remove("is-reduced-motion");
        video.setAttribute("autoplay", "");
        video.muted = true;
        video.playsInline = true;
        video.loop = true;

        var onReady = function () {
            background.classList.add("is-video-ready");
            window.dispatchEvent(new CustomEvent("aerova:hero-video-ready", { detail: { src: video.currentSrc || video.src } }));
            tryPlay();
        };

        var onFail = function () {
            useFallbackOnly();
        };

        video.addEventListener("loadeddata", onReady, { once: true });
        video.addEventListener("error", onFail, { once: true });
        if (video.src !== src) {
            background.classList.remove("is-video-ready");
            video.src = src;
            video.load();
        }
    }

    api.get("api/landing/hero-video", { skipAuth: true }).then(function (payload) {
        if (payload) {
            applyPayload(payload);
        } else {
            useFallbackOnly();
        }
    }).catch(function () {
        useFallbackOnly();
    });

    window.addEventListener("aerova:intro-complete", tryPlay);

    narrow.addEventListener("change", function () {
        api.get("api/landing/hero-video", { skipAuth: true, fresh: true }).then(function (payload) {
            if (payload) {
                applyPayload(payload);
            }
        }).catch(useFallbackOnly);
    });
})();
