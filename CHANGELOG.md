# 1.0.0 (not released)

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
