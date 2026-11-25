# 1.0.0-alpha.2 (not released)

* A light look. Give `background` a light color and the rest follows: dark links, names and
  rings, data colors darkened where they would be too pale, and a light tooltip, search box and
  help card. Before, a white background left links invisible and names light on light.
* `viva.setBackground(color)` changes the canvas color while the graph is on screen, and switches
  between the dark and the light look.
* `background` takes any CSS color (`'white'`, `'rgb(250, 250, 250)'`), and applies with
  `style: false` too.
* The real graphs example is light or dark as the visitor's system is, with a button that
  switches; `?theme=light` or `?theme=dark` in its address fixes the look.

# 1.0.0-alpha.1 (2026-11-22)

* `render(graph)` from a script in `<head>`, before the page has a `<body>`, now says so instead
  of failing with `Cannot read properties of null`.
* `vivagraphjs/dist/*` and `vivagraphjs/package.json` can be imported: the `exports` map hid them.

# 1.0.0-alpha.0 (2026-11-22)

On npm as `vivagraphjs@next`.

A rewrite. VivaGraph is now a small front door to
[ngraph.forcelayout](https://github.com/anvaka/ngraph.forcelayout) and its add-on modules:

* `Viva.render(graph)` draws a graph in one call: pivot start, force layout (on WebGPU for big
  graphs when the device has a real GPU), WebGL drawing, labels, hover, drag, select, tooltips,
  search and keyboard navigation. The layout stops when it has settled.
* The parts are exported for pages that put them together themselves.
* Builds: `dist/vivagraph.js` and `dist/vivagraph.min.js` (script tag, global `Viva`) and
  `dist/vivagraph.module.js` (ES module; the WebGPU runner is a second file, loaded on demand).

Breaking: nothing of the 0.x API is kept. `Viva.Graph.*`, the SVG renderer, custom node and link
elements, custom WebGL shaders and the constant layout are gone. The README has a table of what
maps to what. 0.x stays on the `0.x` branch and on npm as `vivagraphjs@0`.

# 0.12 and earlier

See [CHANGELOG on the 0.x branch](https://github.com/anvaka/VivaGraphJS/blob/0.x/CHANGELOG).
