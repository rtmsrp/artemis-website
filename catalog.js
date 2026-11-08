(function () {
    var DEFAULT_IMAGE_FOLDER = "vehicles";
    var DEFAULT_IMAGE_EXTENSIONS = ["webp", "png", "jpg", "jpeg"];

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

    function setEmptyCopy(eyebrow, title, lead) {
        if (!empty) return;
        var eyebrowEl = empty.querySelector(".catalogEmptyEyebrow");
        var titleEl = empty.querySelector(".catalogEmptyTitle");
        var leadEl = empty.querySelector(".catalogEmptyLead");
        if (eyebrowEl) eyebrowEl.textContent = eyebrow;
        if (titleEl) titleEl.textContent = title;
        if (leadEl) leadEl.textContent = lead;
    }

    function setEmptyVisible(visible) {
        if (empty) empty.hidden = !visible;
    }

    function prettify(spawn) {
        return String(spawn || "")
            .replace(/[_-]+/g, " ")
            .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
            .replace(/\s+/g, " ")
            .trim()
            .replace(/\b[a-z]/g, function (letter) { return letter.toUpperCase(); });
    }

    function joinPath(folder, file) {
        var cleanFolder = String(folder || "").replace(/^\/+|\/+$/g, "");
        return cleanFolder ? cleanFolder + "/" + file : file;
    }

    function resolveExplicitImage(folder, image) {
        var value = String(image || "").trim();
        if (!value) return "";
        if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(value) || value.indexOf("/") !== -1) {
            return value;
        }
        return joinPath(folder, value);
    }

    function normalizeExtensions(value) {
        var list = Array.isArray(value) && value.length ? value : value ? [value] : DEFAULT_IMAGE_EXTENSIONS;
        var seen = {};

        return list.map(function (extension) {
            return String(extension || "").trim().replace(/^\./, "").toLowerCase();
        }).filter(function (extension) {
            if (!extension || seen[extension]) return false;
            seen[extension] = true;
            return true;
        });
    }

    function readVehicles(config) {
        var folder = config && typeof config.imageFolder === "string" && config.imageFolder.trim()
            ? config.imageFolder.trim()
            : DEFAULT_IMAGE_FOLDER;
        var extensions = normalizeExtensions(config && config.imageExtensions);
        var source = config && config.vehicles;
        var list = [];

        function add(item, fallbackModel) {
            if (!item || typeof item !== "object" || Array.isArray(item)) return;

            var model = String(item.model || item.spawn || fallbackModel || "").trim();
            if (!model) return;

            var label = String(item.label || item.name || "").trim() || prettify(model);

            list.push({
                model: model,
                name: label,
                folder: folder,
                extensions: extensions,
                explicitImage: resolveExplicitImage(folder, item.image),
                image: ""
            });
        }

        if (Array.isArray(source)) {
            source.forEach(function (item) {
                add(item);
            });
        } else if (source && typeof source === "object") {
            Object.keys(source).forEach(function (model) {
                var value = source[model];
                if (value && typeof value === "object" && !Array.isArray(value)) {
                    add(value, model);
                } else {
                    add({ label: value, model: model });
                }
            });
        }

        return list;
    }

    function openLightbox(vehicle, src) {
        if (!lightbox || !vehicle || !src) return;
        lightboxImage.src = src;
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

    function wireImage(img, placeholder, vehicle) {
        var candidates;

        if (vehicle.explicitImage) {
            candidates = [vehicle.explicitImage];
        } else if (vehicle.image) {
            candidates = [vehicle.image];
        } else {
            candidates = vehicle.extensions.map(function (extension) {
                return joinPath(vehicle.folder, encodeURIComponent(vehicle.model) + "." + extension);
            });
        }

        var attempt = 0;

        function showPlaceholder() {
            vehicle.image = "";
            img.removeAttribute("src");
            img.hidden = true;
            if (placeholder) placeholder.hidden = false;
        }

        function tryNext() {
            if (attempt >= candidates.length) {
                showPlaceholder();
                return;
            }
            img.src = candidates[attempt];
            attempt += 1;
        }

        img.addEventListener("load", function () {
            vehicle.image = img.currentSrc || img.src;
            img.hidden = false;
            if (placeholder) placeholder.hidden = true;
        });

        img.addEventListener("error", tryNext);

        if (candidates.length) tryNext();
        else showPlaceholder();
    }

    function render(list) {
        if (!grid) return;

        grid.textContent = "";
        setCounts(list.length, vehicles.length);

        if (!list.length) {
            if (vehicles.length) {
                setEmptyCopy("No Matches", "Nothing Found", "Try a different search term.");
            }
            setEmptyVisible(true);
            return;
        }

        setEmptyVisible(false);

        var fragment = document.createDocumentFragment();

        list.forEach(function (vehicle) {
            var card = document.createElement("button");
            card.type = "button";
            card.className = "catalogCard";
            card.setAttribute("aria-label", "Preview " + vehicle.name);

            var media = document.createElement("div");
            media.className = "catalogCardMedia";

            var img = document.createElement("img");
            img.alt = vehicle.name;
            img.loading = "lazy";
            img.decoding = "async";

            var placeholder = document.createElement("span");
            placeholder.className = "catalogCardPlaceholder";
            placeholder.textContent = vehicle.name;
            placeholder.hidden = true;

            media.appendChild(img);
            media.appendChild(placeholder);
            wireImage(img, placeholder, vehicle);

            var name = document.createElement("p");
            name.className = "catalogCardName";
            name.textContent = vehicle.name;

            card.appendChild(media);
            card.appendChild(name);
            card.addEventListener("click", function () {
                if (vehicle.image) {
                    openLightbox(vehicle, vehicle.image);
                } else if (img.complete && img.naturalWidth > 0) {
                    openLightbox(vehicle, img.currentSrc || img.src);
                }
            });

            fragment.appendChild(card);
        });

        grid.appendChild(fragment);
    }

    function filterVehicles(query) {
        var term = normalize(query);
        if (!term) return vehicles.slice();
        return vehicles.filter(function (vehicle) {
            return normalize(vehicle.name + " " + vehicle.model).indexOf(term) !== -1;
        });
    }

    function loadCatalog() {
        if (!grid) return;

        var config = window.VEHICLE_CATALOG;

        if (!config || typeof config !== "object") {
            vehicles = [];
            setCounts(0, 0);
            setEmptyCopy(
                "Configuration",
                "Catalog Unavailable",
                "vehicles.js did not load. Make sure it exists at the site root and is included before catalog.js."
            );
            setEmptyVisible(true);
            return;
        }

        vehicles = readVehicles(config);

        if (!vehicles.length) {
            setEmptyCopy(
                "Ready",
                "No Vehicles Yet",
                "The vehicle catalog is being updated. Please check back soon."
            );
            render([]);
            return;
        }

        render(vehicles);
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

    loadCatalog();
})();
