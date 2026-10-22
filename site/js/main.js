/**
 * Zoto Agents — Site scripts
 * Sidebar toggle, mobile nav burger, active page highlighting, smooth scroll,
 * Prism.js init, and copy-to-clipboard for code blocks.
 */

(function () {
  "use strict";

  function initSidebarToggle() {
    var toggle = document.querySelector(".sidebar-toggle");
    var sidebar = document.getElementById("sidebar");
    if (!toggle || !sidebar) return;

    toggle.addEventListener("click", function () {
      var isOpen = sidebar.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", function (e) {
      if (
        sidebar.classList.contains("open") &&
        !sidebar.contains(e.target) &&
        !toggle.contains(e.target)
      ) {
        sidebar.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });

    var sidebarLinks = sidebar.querySelectorAll("a");
    for (var i = 0; i < sidebarLinks.length; i++) {
      sidebarLinks[i].addEventListener("click", function () {
        if (window.innerWidth <= 768) {
          sidebar.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
    }
  }


  /* Mobile top-nav burger: injected so every page shares one implementation. */
  function initNavBurger() {
    var navs = document.querySelectorAll(".top-nav-inner");
    for (var n = 0; n < navs.length; n++) {
      (function (inner, idx) {
        var links = inner.querySelector(".top-nav-links");
        if (!links || inner.querySelector(".nav-burger")) return;
        if (!links.id) links.id = "top-nav-links" + (idx ? "-" + idx : "");

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "nav-burger";
        btn.setAttribute("aria-controls", links.id);
        btn.setAttribute("aria-expanded", "false");
        btn.setAttribute("aria-label", "Open site menu");
        btn.innerHTML = '<span class="nav-burger-label">Menu</span><span class="nav-burger-icon" aria-hidden="true"></span>';
        inner.appendChild(btn);
        inner.classList.add("has-burger");

        // Fold the page's sidebar (if any) into the menu as a labelled section.
        var sidebarNav = document.querySelector("#sidebar .sidebar-nav");
        if (sidebarNav && !links.querySelector(".nav-menu-section")) {
          var heading = sidebarNav.querySelector(".sidebar-heading");
          var list = sidebarNav.querySelector(".sidebar-list");
          if (list) {
            var label = heading ? heading.textContent.trim() : "";
            var anchorsOnly = !list.querySelector('a:not([href^="#"])');
            if (anchorsOnly) label = label ? label + " \u2014 on this page" : "On this page";
            else if (!label) label = "In this section";
            var sec = document.createElement("li");
            sec.className = "nav-menu-section";
            var h = document.createElement("span");
            h.className = "nav-menu-heading";
            h.id = links.id + "-section";
            h.textContent = label;
            var clone = list.cloneNode(true);
            clone.className = "nav-menu-sublist";
            clone.setAttribute("aria-labelledby", h.id);
            var cl = clone.querySelectorAll("a");
            for (var c = 0; c < cl.length; c++) {
              cl[c].classList.remove("sidebar-link");
              cl[c].classList.add("nav-menu-link");
              if (cl[c].classList.contains("active")) {
                cl[c].setAttribute("aria-current", anchorsOnly ? "location" : "page");
              }
              if (anchorsOnly) {
                cl[c].addEventListener("click", function () {
                  var all = clone.querySelectorAll("a");
                  for (var k = 0; k < all.length; k++) {
                    all[k].classList.remove("active");
                    all[k].removeAttribute("aria-current");
                  }
                  this.classList.add("active");
                  this.setAttribute("aria-current", "location");
                });
              }
            }
            sec.appendChild(h);
            sec.appendChild(clone);
            var siteLabel = document.createElement("li");
            siteLabel.className = "nav-menu-section nav-menu-site";
            siteLabel.innerHTML = '<span class="nav-menu-heading">Site</span>';
            links.insertBefore(siteLabel, links.firstChild);
            links.insertBefore(sec, siteLabel);
          }
        }

        var mq = window.matchMedia("(max-width: 768px)");

        function setOpen(open) {
          inner.classList.toggle("nav-open", open);
          document.body.classList.toggle("nav-menu-open", open);
          btn.setAttribute("aria-expanded", String(open));
          btn.setAttribute("aria-label", open ? "Close site menu" : "Open site menu");
        }

        btn.addEventListener("click", function () {
          setOpen(!inner.classList.contains("nav-open"));
          if (inner.classList.contains("nav-open")) {
            var first = links.querySelector("a");
            if (first) first.focus();
          }
        });

        links.addEventListener("click", function (e) {
          if (e.target.closest && e.target.closest("a")) setOpen(false);
        });

        document.addEventListener("keydown", function (e) {
          if (e.key === "Escape" && inner.classList.contains("nav-open")) {
            setOpen(false);
            btn.focus();
          }
        });

        document.addEventListener("click", function (e) {
          if (inner.classList.contains("nav-open") && !inner.contains(e.target)) setOpen(false);
        });

        var onChange = function () { if (!mq.matches) setOpen(false); };
        if (mq.addEventListener) mq.addEventListener("change", onChange);
        else if (mq.addListener) mq.addListener(onChange);
      })(navs[n], n);
    }
  }

  function highlightActiveSidebarLink() {
    var path = window.location.pathname;
    var links = document.querySelectorAll(".sidebar-link");
    var currentFile = path.split("/").pop() || "index.html";

    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href");
      if (!href) continue;
      // In-page anchor lists: match the current hash, else keep authored state.
      if (href.charAt(0) === "#") {
        if (window.location.hash) {
          links[i].classList.toggle("active", href === window.location.hash);
        }
        continue;
      }
      var linkFile = href.split("/").pop() || "index.html";
      if (currentFile === linkFile) {
        links[i].classList.add("active");
      } else {
        links[i].classList.remove("active");
      }
    }
  }

  function initSmoothScroll() {
    var anchors = document.querySelectorAll('a[href^="#"]');
    for (var i = 0; i < anchors.length; i++) {
      anchors[i].addEventListener("click", function (e) {
        var targetId = this.getAttribute("href").slice(1);
        if (!targetId) return;
        var target = document.getElementById(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          history.pushState(null, "", "#" + targetId);
        }
      });
    }
  }

  function initPrism() {
    if (typeof Prism !== "undefined" && Prism.highlightAll) {
      Prism.highlightAll();
    }
  }

  function initCopyButtons() {
    var blocks = document.querySelectorAll("pre");
    for (var i = 0; i < blocks.length; i++) {
      (function (pre) {
        if (pre.querySelector(".copy-btn")) return;

        var btn = document.createElement("button");
        btn.className = "copy-btn";
        btn.setAttribute("aria-label", "Copy code to clipboard");
        btn.textContent = "Copy";
        pre.appendChild(btn);

        btn.addEventListener("click", function () {
          var code = pre.querySelector("code");
          var text = code ? code.textContent : pre.textContent;

          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
              showCopied(btn);
            }, function () {
              fallbackCopy(text, btn);
            });
          } else {
            fallbackCopy(text, btn);
          }
        });
      })(blocks[i]);
    }
  }

  function fallbackCopy(text, btn) {
    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      showCopied(btn);
    } catch (err) {
      btn.textContent = "Failed";
      setTimeout(function () { btn.textContent = "Copy"; }, 2000);
    }
    document.body.removeChild(textarea);
  }

  function showCopied(btn) {
    btn.textContent = "Copied!";
    btn.classList.add("copied");
    setTimeout(function () {
      btn.textContent = "Copy";
      btn.classList.remove("copied");
    }, 2000);
  }

  function init() {
    initSidebarToggle();
    highlightActiveSidebarLink();
    initNavBurger();
    initSmoothScroll();
    initPrism();
    initCopyButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
