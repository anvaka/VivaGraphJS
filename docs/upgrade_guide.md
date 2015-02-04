Migrating from 0.6.x to 0.7.x
-----------------------------
Main reason for breaking changes is shift from monolithic architecture to
modular design. Now VivaGraph consists of small modules from `ngraph` family.
`ngraph` modules are usually very well documented and tested.

## Layout API changes

`Viva.graph.Layout.forceDirected` is replaced with [ngraph.forcelayout](https://github.com/anvaka/ngraph.forcelayout).
This module is faster than older one, and has better test coverage.

### layout.getLinkPosition()
_v.0.6.*_
``` js
var linkPosition = layout.getLinkPosition(link);
```

_v.0.7.*_
``` js
var linkPosition = layout.getLinkPosition(link.id);
```

### layout.setNodePosition()

_v.0.6.*_
``` js
layout.setNodePosition(node, x, y);
```

_v.0.7.*_
``` js
layout.setNodePosition(node.id, x, y);
```

### layout settings
Force based layout settings can be now accessed from `layout.simulator`:

* `layout.drag()` is now known as `simulator.dragCoeff()`
* `layout.springCoeff()` -> `simulator.springCoeff()`
* `layout.springLength()` -> `simulator.springLength()`
* `layout.gravity()` -> `simulator.gravity()`
* `layout.theta()` -> `simulator.theta()`

## Generator changes

The module is replaced with [ngraph.generators](https://github.com/anvaka/ngraph.generators)
which contains all original graphs + new graphs.

_v.0.6.*_
``` js
Viva.Graph.generator().randomNoLinks(42);
```

_v.0.7.*_
``` js
Viva.Graph.generator().noLinks(42);
```

## Deprecated API

* `Viva.Graph.Point2d` is removed. Use plain {x: 42, y: 42} object instead.
* `Viva.Graph.graph.addEventListener` is replaced with `on()` method.
* `Viva.Graph.View.cssGraphcis` is deprecated
* `Viva.Graph.View.svgNodeFactory` is deprecated
* `geom.convexHull` is deprecated. Use https://github.com/anvaka/cnvx
instead.
* `Viva.Graph.community` is deprecated. Use https://github.com/anvaka/ngraph.slpa
instead.

Migrating from 0.5.x to 0.6.x
-----------------------------

Version `0.5.x` and `0.6.x` are almost identical and do not have any breaking
API changes. Primary reason for version bump was that 0.6 had changed build
system from grunt to gulp. Also v.0.6 had lots of small changes with fixed
typos/documentation.

Migrating from 0.4.x to 0.5.x
-----------------------------

Main reason for breaking changes below is that v.0.4 does not allow to render
the same graph by multiple renderers. Please feel free to email me and ask for
help, if you find this migration guide not sufficient.

## node.position

`position` attribute is moved out from the node object into layout provider.

**Why?** Having shared node `position` makes impossible rendering of the same graph by two different layouters.

_v.0.4.*_
``` js
    // each node object has "position" on it:
    graph.forEachNode(function (node) {
      var position = node.position;
      position.x += 1; // move by one pixel
    });
```

_v.0.5.*_
``` js
    // "position" is now part of layouter:
    graph.forEachNode(function (node) {
      // layout here is instance of Viva.Graph.Layout.forceDirected or Viva.Graph.Layout.constant:
      var position = layout.getNodePosition(node.id);
      position.x += 1;
    });
```

To give initial positions to nodes in  v.0.5.* simply call: `layout.setNodePosition(node, x, y)`.

## node.ui

`ui` attribute is moved out from the node/link objects into graphics provider.

**Why?** having shared `ui` attribute makes impossible rendering of the same graph by multiple renderers.

_v.0.4.*_
``` js
    // each node object has "position" on it:
    graph.forEachNode(function (node) {
      console.log(node.ui);
    });

    // each link object has "position" on it:
    graph.forEachLink(function (link) {
      console.log(link.ui);
    });
```

_v.0.5.*_
``` js
    //  "ui" is now part of graphics:
    graph.forEachNode(function (node) {
      // graphics here can be instance of Viva.Graph.View.svgGraphics or Viva.Graph.View.webglGraphics:
      console.dir(graphics.getNodeUI(node.id));
    });
    //  "ui" is now part of graphics:
    graph.forEachLink(function (link) {
      // graphics here can be instance of Viva.Graph.View.svgGraphics or Viva.Graph.View.webglGraphics:
      console.dir(graphics.getLinkUI(link.id));
    });
```

## node.isPinned

`node.isPinned` is no longer used to determine whether node is pinned or not. This responsibility is moved to layouter.

**Why?** Same reasons as above. Disabling node movement in one renderer should not affect movement of the same node in other renderers.

_v.0.4.*_
``` js
// toggle node pinning:
node.data.isPinned = !node.data.isPinned;
```

_v.0.5.*_
``` js
// toggle node pinning:
var wasPinned = layout.isNodePinned(node);
layout.pinNode(node, !wasPinned);
// layout here is instance of Viva.Graph.Layout.forceDirected or Viva.Graph.Layout.constant.
```
