(function () {
    var board = document.querySelector(".cabin-board");
    var stage = document.getElementById("cabin-detail");
    if (!board || !stage) return;

    var cards = board.querySelectorAll("[data-cabin-card]");
    var panels = stage.querySelectorAll("[data-cabin-panel]");

    function selectCabin(id) {
        var i;
        for (i = 0; i < cards.length; i++) {
            var on = cards[i].getAttribute("data-cabin-card") === id;
            cards[i].classList.toggle("is-active", on);
            var btn = cards[i].querySelector("[data-cabin-open]");
            if (btn) btn.setAttribute("aria-pressed", on ? "true" : "false");
        }
        for (i = 0; i < panels.length; i++) {
            var match = panels[i].getAttribute("data-cabin-panel") === id;
            panels[i].hidden = !match;
            panels[i].classList.remove("is-shown");
            if (match) {
                (function (panel) {
                    window.requestAnimationFrame(function () {
                        panel.classList.add("is-shown");
                    });
                })(panels[i]);
            }
        }
        stage.hidden = false;
        stage.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    board.addEventListener("click", function (event) {
        var card = event.target.closest("[data-cabin-card]");
        if (!card || !board.contains(card)) return;
        selectCabin(card.getAttribute("data-cabin-card"));
    });
})();
