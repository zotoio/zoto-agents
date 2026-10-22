# Zoto Agents — Static Site

This is a plain HTML/CSS/JS static site. No Node toolchain is used to build it.

## Directory Layout

```
site/
├── index.html          Landing page (peer plugin grid)
├── 404.html            Custom 404 page
├── css/
│   ├── style.css       Shared styles + Matrix CSS tokens
│   └── prism-matrix.css  PrismJS theme override
├── js/
│   ├── main.js         Top-nav dropdown, accordion logic
│   └── matrix-rain.js  Falling-glyphs canvas animation
├── images/
│   ├── logo.svg / logo.png
│   ├── diagrams/       Architecture & workflow SVGs
│   └── mockups/        Feature illustration SVGs
├── spec-system/        Spec System documentation subtree
│   ├── index.html
│   ├── quickstart.html
│   ├── design.html
│   └── configuration.html
├── eval-system/        Eval System documentation subtree
│   ├── index.html
│   ├── quickstart.html
│   ├── design.html
│   └── configuration.html
├── cursor-top/         Cursor Top documentation subtree
│   ├── index.html
│   └── quickstart.html
├── mcp-swarm/          MCP Swarm (botz-mcp-swarm) documentation
│   └── index.html
├── crux-compress/      CRUX Compress documentation
│   └── index.html
├── sitemap.xml
└── robots.txt
```

## Local Preview

```bash
cd site/
python3 -m http.server 8080
```

Then visit <http://localhost:8080/>.

## Matrix Rain Canvas

The trailing-code background effect lives in `js/matrix-rain.js`. Key behaviours:

- **Reduced-motion guard** — if the user's OS or browser has `prefers-reduced-motion: reduce` enabled, the canvas does not animate. If the preference changes mid-session the effect toggles instantly.
- **Visibility pause** — when the tab is hidden (`document.visibilityState === 'hidden'`) the rAF loop pauses to save CPU.
- **Frame throttle** — capped at ~30 fps so mobile devices stay cool.

The canvas requires `<canvas class="matrix-rain-canvas">` in the page markup.

## Publish Path (GitHub Pages)

The site is deployed automatically by `.github/workflows/deploy-pages.yml` on every push to `main` that touches `site/**` or the workflow file. You can also run the workflow manually from the Actions tab (`workflow_dispatch`). The workflow uploads the `site/` directory as a Pages artifact and deploys it to https://zotoio.github.io/zoto-agents/.

## Smoke Test Checklist

After modifying the site, run a local preview and verify:

1. Landing page (`/`) renders with the falling-glyphs rain canvas and a five-plugin grid (spec-system, eval-system, cursor-top, botz-mcp-swarm, crux-compress).
2. All three top-nav dropdown menus (Spec System, Eval System, Cursor Top) open and close, and the MCP Swarm and CRUX Compress links work.
3. All four Spec System pages load without errors.
4. All four Eval System pages load without errors.
5. Both Cursor Top pages (Overview, Quickstart) load without errors.
   The MCP Swarm page (`/mcp-swarm/`) loads without errors.
   The CRUX Compress page (`/crux-compress/`) loads without errors.
6. The 404 page (`/nonexistent`) renders the custom layout.
7. Enable reduced-motion (browser DevTools → Rendering → Emulate CSS media `prefers-reduced-motion: reduce`) — the rain stops.
8. Browser console is clean: no 404s, no script errors.
