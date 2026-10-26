(function () {
    var vehicles = [];

    var grid = document.getElementById("catalogGrid");
    var empty = document.getElementById("catalogEmpty");
    var searchInput = document.getElementById("catalogSearchInput");
    var visibleCount = document.getElementById("catalogVisibleCount");
    var totalCount = document.getElementById("catalogTotalCount");
    var lightbox = document.getElementById("catalogLightbox");
    var lightboxImage = document.getElementById("catalogLightboxImage");
    var lightboxName = document.getElementById("catalogLightboxName");
    var lightboxClose = document.getElementById("catalogLightboxClose");

    function normalize(text) {
        return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
    }

    function setCounts(visible, total) {
        if (visibleCount) visibleCount.textContent = String(visible);
        if (totalCount) totalCount.textContent = String(total);
    }

    function openLightbox(vehicle) {
        if (!lightbox || !vehicle) return;
        lightboxImage.src = vehicle.image || "";
        lightboxImage.alt = vehicle.name || "";
        lightboxName.textContent = vehicle.name || "";
        lightbox.hidden = false;
        document.body.classList.add("catalogLightboxOpen");
    }

    function closeLightbox() {
        if (!lightbox) return;
        lightbox.hidden = true;
        document.body.classList.remove("catalogLightboxOpen");
        lightboxImage.removeAttribute("src");
        lightboxName.textContent = "";
    }

    function render(list) {
        if (!grid) return;

        grid.textContent = "";
        setCounts(list.length, vehicles.length);

        if (!list.length) {
            if (empty) empty.hidden = false;
            return;
        }

        if (empty) empty.hidden = true;

        var fragment = document.createDocumentFragment();

        list.forEach(function (vehicle) {
            var card = document.createElement("button");
            card.type = "button";
            card.className = "catalogCard";
            card.setAttribute("aria-label", "Preview " + vehicle.name);

            var media = document.createElement("div");
            media.className = "catalogCardMedia";

            var img = document.createElement("img");
            img.src = vehicle.image;
            img.alt = vehicle.name;
            img.loading = "lazy";
            media.appendChild(img);

            var name = document.createElement("p");
            name.className = "catalogCardName";
            name.textContent = vehicle.name;

            card.appendChild(media);
            card.appendChild(name);
            card.addEventListener("click", function () {
                openLightbox(vehicle);
            });

            fragment.appendChild(card);
        });

        grid.appendChild(fragment);
    }

    function filterVehicles(query) {
        var term = normalize(query);
        if (!term) return vehicles.slice();
        return vehicles.filter(function (vehicle) {
            return normalize(vehicle.name).indexOf(term) !== -1;
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            render(filterVehicles(searchInput.value));
        });
    }

    if (lightboxClose) {
        lightboxClose.addEventListener("click", closeLightbox);
    }

    if (lightbox) {
        lightbox.addEventListener("click", function (event) {
            if (event.target === lightbox) closeLightbox();
        });
    }

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeLightbox();
    });

    render(vehicles);
})();
