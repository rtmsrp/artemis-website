(function () {
    var sections = Array.prototype.slice.call(document.querySelectorAll(".ruleSection"));
    var navList = document.getElementById("navList");
    var navCard = document.querySelector(".navCard");
    var navCount = document.getElementById("navCount");
    var menuToggle = document.getElementById("menuToggle");
    var navScrim = document.getElementById("navScrim");
    var sideNav = document.getElementById("sideNav");

    var searchTrigger = document.getElementById("searchTrigger");
    var searchOverlay = document.getElementById("searchOverlay");
    var searchModalInput = document.getElementById("searchModalInput");
    var searchResults = document.getElementById("searchResults");
    var searchEmpty = document.getElementById("searchEmpty");
    var searchCount = document.getElementById("searchCount");

    var sectionIndex = [];
    var results = [];
    var current = -1;
    var lastFocused = null;
    var activeId = null;

    function normalize(text) {
        return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
    }

    function buildNav() {
        sections.forEach(function (section) {
            var id = section.id;
            var title = section.getAttribute("data-title") || id;
            var item = document.createElement("li");
            var link = document.createElement("a");
            link.className = "navLink";
            link.href = "#" + id;
            link.textContent = title;
            link.dataset.target = id;
            item.appendChild(link);
            navList.appendChild(item);
        });

        if (navCount) navCount.textContent = sections.length;
    }

    function setOpen(section, open) {
        section.classList.toggle("open", open);
    }

    function closeNav() {
        document.body.classList.remove("navOpen");
        if (navScrim) navScrim.hidden = true;
    }

    function openNav() {
        document.body.classList.add("navOpen");
        if (navScrim) navScrim.hidden = false;
    }

    function collapse(text) {
        return String(text || "").replace(/\s+/g, " ").trim();
    }

    function buildSearchIndex() {
        sectionIndex = sections.map(function (section, order) {
            var title = section.getAttribute("data-title") || section.id;
            var chunks = [];
            var nodes = section.querySelectorAll(".ruleBody p, .ruleBody li, .ruleBody h3, .ruleBody tr");

            Array.prototype.forEach.call(nodes, function (el) {
                var text = el.tagName === "TR"
                    ? collapse(Array.prototype.map.call(el.children, function (cell) { return cell.textContent; }).join(" · "))
                    : collapse(el.textContent);
                if (!text) return;
                chunks.push({ el: el, text: text, lower: normalize(text) });
            });

            var searchText = normalize(title + " " + chunks.map(function (chunk) { return chunk.text; }).join(" "));

            return {
                section: section,
                title: title,
                titleLower: normalize(title),
                chunks: chunks,
                searchText: searchText,
                order: order
            };
        });
    }

    function escapeRegExp(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function makeSnippet(text, terms, maxLength) {
        var max = maxLength || 130;
        if (text.length <= max) return text;

        var lower = text.toLowerCase();
        var index = -1;
        terms.forEach(function (term) {
            var at = lower.indexOf(term);
            if (at !== -1 && (index === -1 || at < index)) index = at;
        });

        if (index === -1) {
            var cut = text.slice(0, max);
            var lastSpace = cut.lastIndexOf(" ");
            if (lastSpace > 0) cut = cut.slice(0, lastSpace);
            return cut.trim() + "…";
        }

        var start = Math.max(0, index - 40);
        if (start > 0) {
            var leadingSpace = text.indexOf(" ", start);
            if (leadingSpace !== -1 && leadingSpace < index) start = leadingSpace + 1;
        }

        var end = Math.min(text.length, Math.max(index + max, start + max));
        if (end < text.length) {
            var trailingSpace = text.lastIndexOf(" ", end);
            if (trailingSpace > index) end = trailingSpace;
        }

        return (start > 0 ? "… " : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
    }

    function appendHighlighted(container, text, terms) {
        if (!terms.length) {
            container.textContent = text;
            return;
        }

        var pattern = new RegExp("(" + terms.map(escapeRegExp).join("|") + ")", "gi");
        var parts = text.split(pattern);
        var lowered = terms.map(function (term) { return term.toLowerCase(); });

        parts.forEach(function (part) {
            if (!part) return;
            if (lowered.indexOf(part.toLowerCase()) !== -1) {
                var mark = document.createElement("mark");
                mark.textContent = part;
                container.appendChild(mark);
            } else {
                container.appendChild(document.createTextNode(part));
            }
        });
    }

    function searchSections(terms) {
        var phrase = terms.join(" ");
        var matches = [];

        sectionIndex.forEach(function (entry) {
            var containsAll = terms.every(function (term) {
                return entry.searchText.indexOf(term) !== -1;
            });
            if (!containsAll) return;

            var score = 0;
            var titleHits = 0;

            terms.forEach(function (term) {
                if (entry.titleLower.indexOf(term) !== -1) {
                    titleHits += 1;
                    score += 14;
                }
            });

            if (titleHits) {
                score += 10;
                if (entry.titleLower.indexOf(phrase) !== -1) score += 24;
                if (entry.titleLower.indexOf(phrase) === 0) score += 18;
            }

            var best = null;

            entry.chunks.forEach(function (chunk) {
                var hits = 0;
                terms.forEach(function (term) {
                    if (chunk.lower.indexOf(term) !== -1) hits += 1;
                });
                if (!hits) return;

                var chunkScore = hits * 5;
                if (chunk.lower.indexOf(phrase) !== -1) chunkScore += 8;
                if (chunk.el.tagName === "H3") chunkScore += 4;

                score += hits;

                if (!best || chunkScore > best.score) {
                    best = { chunk: chunk, score: chunkScore };
                }
            });

            var titleMatchedAll = titleHits === terms.length;
            var chunk = titleMatchedAll ? entry.chunks[0] || null : best ? best.chunk : entry.chunks[0] || null;
            var tag = "Section";

            if (!titleMatchedAll && best) {
                tag = best.chunk.el.tagName === "H3" ? "Subsection"
                    : best.chunk.el.tagName === "TR" ? "Table"
                    : "Detail";
            }

            matches.push({
                entry: entry,
                chunk: chunk,
                tag: tag,
                score: score,
                order: entry.order
            });
        });

        matches.sort(function (a, b) {
            return b.score - a.score || a.order - b.order;
        });

        return matches;
    }

    function setSelected(index, scrollIntoView) {
        if (!results.length) {
            current = -1;
            return;
        }

        current = (index + results.length) % results.length;

        Array.prototype.forEach.call(searchResults.children, function (item, i) {
            var selected = i === current;
            item.setAttribute("aria-selected", selected ? "true" : "false");
            if (selected) {
                searchModalInput.setAttribute("aria-activedescendant", item.id);
                if (scrollIntoView) item.scrollIntoView({ block: "nearest" });
            }
        });
    }

    function renderResults(query) {
        var normalized = normalize(query);
        var terms = normalized ? Array.from(new Set(normalized.split(" "))) : [];

        results = terms.length
            ? searchSections(terms)
            : sectionIndex.map(function (entry) {
                return {
                    entry: entry,
                    chunk: entry.chunks[0] || null,
                    tag: "Section",
                    score: 0,
                    order: entry.order
                };
            });

        searchResults.textContent = "";

        var fragment = document.createDocumentFragment();

        results.forEach(function (result, index) {
            var item = document.createElement("li");
            item.className = "searchResult";
            item.id = "searchResult-" + index;
            item.dataset.index = String(index);
            item.setAttribute("role", "option");
            item.setAttribute("aria-selected", "false");

            var top = document.createElement("span");
            top.className = "searchResultTop";

            var title = document.createElement("span");
            title.className = "searchResultTitle";
            appendHighlighted(title, result.entry.title, terms);

            var tag = document.createElement("span");
            tag.className = "searchResultTag";
            tag.textContent = result.tag;

            top.appendChild(title);
            top.appendChild(tag);

            var snippet = document.createElement("span");
            snippet.className = "searchResultSnippet";
            appendHighlighted(
                snippet,
                result.chunk ? makeSnippet(result.chunk.text, terms) : "Open this section",
                terms
            );

            item.appendChild(top);
            item.appendChild(snippet);
            fragment.appendChild(item);
        });

        searchResults.appendChild(fragment);
        searchResults.scrollTop = 0;

        searchCount.textContent = results.length + (results.length === 1 ? " section" : " sections");
        searchEmpty.hidden = results.length !== 0;

        if (results.length) {
            setSelected(0, false);
        } else {
            current = -1;
            searchModalInput.removeAttribute("aria-activedescendant");
        }
    }

    function openSearch() {
        if (!searchOverlay || !searchOverlay.hidden) return;

        lastFocused = document.activeElement;
        closeNav();
        searchOverlay.hidden = false;
        document.body.classList.add("searchOpen");

        searchModalInput.value = "";
        renderResults("");

        window.setTimeout(function () {
            searchModalInput.focus();
        }, 0);
    }

    function closeSearch(restoreFocus) {
        if (!searchOverlay || searchOverlay.hidden) return;

        searchOverlay.hidden = true;
        document.body.classList.remove("searchOpen");
        searchModalInput.removeAttribute("aria-activedescendant");
        results = [];
        current = -1;

        if (restoreFocus !== false && lastFocused && typeof lastFocused.focus === "function") {
            lastFocused.focus();
        }
        lastFocused = null;
    }

    function isSearchOpen() {
        return !!searchOverlay && !searchOverlay.hidden;
    }

    function flashElement(element) {
        element.classList.remove("searchFlash");
        void element.offsetWidth;
        element.classList.add("searchFlash");

        window.setTimeout(function () {
            element.classList.remove("searchFlash");
        }, 1800);
    }

    function scrollToTarget(target, section) {
        if (!target) return;

        requestAnimationFrame(function () {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            flashElement(target);

            if (section) {
                if (history.replaceState) {
                    history.replaceState(null, "", "#" + section.id);
                }
                setActive(section.id);
            }
        });
    }

    function jumpTo(result) {
        if (!result) return;

        var section = result.entry.section;
        var target = result.tag !== "Section" && result.chunk ? result.chunk.el : section;

        if (target && (target.tagName === "TD" || target.tagName === "TH")) {
            target = target.closest("tr");
        }

        closeSearch(false);
        setOpen(section, true);
        scrollToTarget(target, section);
    }

    sections.forEach(function (section) {
        var header = section.querySelector(".ruleHeader");
        if (!header) return;
        header.addEventListener("click", function () {
            var willOpen = !section.classList.contains("open");
            setOpen(section, willOpen);
        });
    });

    buildNav();
    buildSearchIndex();

    navList.addEventListener("click", function (event) {
        var link = event.target.closest(".navLink");
        if (!link) return;

        event.preventDefault();

        var target = document.getElementById(link.dataset.target);
        if (!target) return;

        setOpen(target, true);
        closeNav();
        scrollToTarget(target, target);
    });

    if (menuToggle) {
        menuToggle.addEventListener("click", function () {
            if (document.body.classList.contains("navOpen")) closeNav();
            else openNav();
        });
    }

    if (navScrim) {
        navScrim.addEventListener("click", closeNav);
        navScrim.hidden = true;
    }

    if (searchTrigger) {
        searchTrigger.addEventListener("click", openSearch);

        var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
        if (isMac) {
            var modifier = searchTrigger.querySelector(".searchKbdMod");
            if (modifier) modifier.textContent = "⌘";
        }
    }

    if (searchOverlay) {
        searchOverlay.addEventListener("click", function (event) {
            if (event.target === searchOverlay) closeSearch();
        });
    }

    if (searchModalInput) {
        searchModalInput.addEventListener("input", function () {
            renderResults(searchModalInput.value);
        });
    }

    if (searchResults) {
        searchResults.addEventListener("click", function (event) {
            var item = event.target.closest(".searchResult");
            if (!item) return;
            jumpTo(results[Number(item.dataset.index)]);
        });

        searchResults.addEventListener("mouseover", function (event) {
            var item = event.target.closest(".searchResult");
            if (!item) return;
            var index = Number(item.dataset.index);
            if (index !== current) setSelected(index, false);
        });
    }

    var links = Array.prototype.slice.call(navList.querySelectorAll(".navLink"));

    function setActive(id) {
        if (!id || id === activeId) return;
        activeId = id;

        var activeLink = null;

        links.forEach(function (link) {
            var isActive = link.dataset.target === id;
            link.classList.toggle("active", isActive);
            if (isActive) activeLink = link;
        });

        if (!activeLink || !navCard) return;

        var cardRect = navCard.getBoundingClientRect();
        var linkRect = activeLink.getBoundingClientRect();

        if (linkRect.top < cardRect.top + 8) {
            navCard.scrollTop -= cardRect.top + 8 - linkRect.top;
        } else if (linkRect.bottom > cardRect.bottom - 8) {
            navCard.scrollTop += linkRect.bottom - cardRect.bottom + 8;
        }
    }

    function onScroll() {
        if (isSearchOpen()) return;

        var offset = 120;
        var active = sections[0] && sections[0].id;

        sections.forEach(function (section) {
            var top = section.getBoundingClientRect().top;
            if (top - offset <= 0) active = section.id;
        });

        var doc = document.documentElement;
        if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4 && sections.length) {
            active = sections[sections.length - 1].id;
        }

        if (active) setActive(active);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (location.hash) {
        var hashed = document.getElementById(location.hash.slice(1));
        if (hashed && hashed.classList.contains("ruleSection")) {
            setOpen(hashed, true);
            setActive(hashed.id);
        }
    }

    document.addEventListener("keydown", function (event) {
        if (isSearchOpen()) {
            if (event.key === "Escape") {
                event.preventDefault();
                closeSearch();
            } else if (event.key === "ArrowDown") {
                event.preventDefault();
                setSelected(current + 1, true);
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setSelected(current - 1, true);
            } else if (event.key === "Enter") {
                if (results[current]) {
                    event.preventDefault();
                    jumpTo(results[current]);
                }
            }
            return;
        }

        if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "k") {
            event.preventDefault();
            openSearch();
            return;
        }

        if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
            var tag = (event.target.tagName || "").toLowerCase();
            if (tag !== "input" && tag !== "textarea" && !event.target.isContentEditable) {
                event.preventDefault();
                openSearch();
            }
            return;
        }

        if (event.key === "Escape") closeNav();
    });
})();
