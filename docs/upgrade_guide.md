Migrating from 0.4 to 0.5
-------------------------

Main reason for breaking changes below is that v.0.4 does not allow to render the same graph by multiple renderers. Please feel free to email me and ask for help, if you find this migration guide not sufficient.

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
