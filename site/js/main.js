/**
 * Zoto Agents — Site scripts
 * Sidebar toggle, active page highlighting, smooth scroll,
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

  function highlightActiveSidebarLink() {
    var path = window.location.pathname;
    var links = document.querySelectorAll(".sidebar-link");
    var currentFile = path.split("/").pop() || "index.html";

    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href");
      if (!href) continue;
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
