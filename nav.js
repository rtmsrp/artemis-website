(function () {
    var DISCORD_URL = "https://discord.gg/Bpg2kB8SYD";
    var CFX_STATUS_URL = "https://status.cfx.re/";

    var mount = document.getElementById("topNavMount");
    if (!mount) return;

    var path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    if (!path || path === "") path = "index.html";

    function isActive(href) {
        var file = href.split("/").pop().toLowerCase();
        return file === path || (file === "index.html" && (path === "" || path === "index.html"));
    }

    function linkClass(href) {
        return "topNavLink" + (isActive(href) ? " isCurrent" : "");
    }

    mount.innerHTML =
        '<ul class="topNavList">' +
            '<li class="topNavItem">' +
                '<button class="topNavTrigger" type="button" aria-expanded="false" aria-haspopup="true">' +
                    '<span>ArtemisRP</span>' +
                    '<span class="topNavCaret" aria-hidden="true">▾</span>' +
                '</button>' +
                '<div class="topNavDropdown" hidden>' +
                    '<a class="' + linkClass("vehicle-catalog.html") + '" href="vehicle-catalog.html">Vehicle Catalog</a>' +
                    '<a class="topNavLink" href="' + CFX_STATUS_URL + '" target="_blank" rel="noopener noreferrer">CFX Status</a>' +
                    '<a class="topNavLink" href="' + DISCORD_URL + '" target="_blank" rel="noopener noreferrer">Discord</a>' +
                '</div>' +
            '</li>' +
            '<li class="topNavItem">' +
                '<button class="topNavTrigger" type="button" aria-expanded="false" aria-haspopup="true">' +
                    '<span>Rules</span>' +
                    '<span class="topNavCaret" aria-hidden="true">▾</span>' +
                '</button>' +
                '<div class="topNavDropdown" hidden>' +
                    '<a class="' + linkClass("index.html") + '" href="index.html">City Laws</a>' +
                    '<a class="' + linkClass("business-sop.html") + '" href="business-sop.html">Business SOP</a>' +
                    '<a class="' + linkClass("organization-sop.html") + '" href="organization-sop.html">Organization SOP</a>' +
                '</div>' +
            '</li>' +
        '</ul>';

    var items = Array.prototype.slice.call(mount.querySelectorAll(".topNavItem"));
    var topNavToggle = document.getElementById("topNavToggle");

    function closeItem(item) {
        var trigger = item.querySelector(".topNavTrigger");
        var dropdown = item.querySelector(".topNavDropdown");
        if (!trigger || !dropdown) return;
        item.classList.remove("isOpen");
        trigger.setAttribute("aria-expanded", "false");
        dropdown.hidden = true;
    }

    function closeAll(except) {
        items.forEach(function (item) {
            if (item !== except) closeItem(item);
        });
    }

    function openItem(item) {
        var trigger = item.querySelector(".topNavTrigger");
        var dropdown = item.querySelector(".topNavDropdown");
        if (!trigger || !dropdown) return;
        closeAll(item);
        item.classList.add("isOpen");
        trigger.setAttribute("aria-expanded", "true");
        dropdown.hidden = false;
    }

    items.forEach(function (item) {
        var trigger = item.querySelector(".topNavTrigger");
        if (!trigger) return;

        trigger.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (item.classList.contains("isOpen")) closeItem(item);
            else openItem(item);
        });

        item.addEventListener("mouseenter", function () {
            if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
                openItem(item);
            }
        });

        item.addEventListener("mouseleave", function () {
            if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
                closeItem(item);
            }
        });
    });

    document.addEventListener("click", function (event) {
        if (!mount.contains(event.target)) closeAll();
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeAll();
            if (document.body.classList.contains("topNavOpen")) {
                document.body.classList.remove("topNavOpen");
                if (topNavToggle) topNavToggle.setAttribute("aria-expanded", "false");
            }
        }
    });

    if (topNavToggle) {
        topNavToggle.addEventListener("click", function () {
            var open = !document.body.classList.contains("topNavOpen");
            document.body.classList.toggle("topNavOpen", open);
            topNavToggle.setAttribute("aria-expanded", open ? "true" : "false");
            if (open) {
                document.body.classList.remove("navOpen");
                var scrim = document.getElementById("navScrim");
                if (scrim) scrim.hidden = true;
            } else {
                closeAll();
            }
        });
    }
})();
