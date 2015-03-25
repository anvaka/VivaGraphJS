# no interaction

This demo shows how to disable automatic processing of user input by VivaGraph.
For example, if you want to just render a graph, and let users scroll your page
this is the right place to start from.

[See online demo](http://anvaka.github.io/VivaGraphJS/demos/other/input-override/)

# How?

When you create a renderer you can explicitly allow or forbid vivagraph to handle
user interaction. By default VivaGraph will allows user to:

* Zoom in/zoom out using scroll event;
* Drag individual nodes with left mouse;
* Drag entire graph by dragging background canvas.

To disable all interactions use:

``` js
Viva.Graph.View.renderer(graph, {
  interactive: false
});
```

`intractive` argument can accept either boolean or string type. Boolean is a
global switch for all features. String allows you fine control over features
that you'd like to keep, and can accept any combination of the following words:

* `node` - enable node interaction
* `drag` - enable background dragging
* `scroll` - enable scrolling

If you pass a string with just one word it will automatically disable remaining
features. For example, the following code will allow node dragging, but will
forbid vivagraph from controlling scroll-zoom, and canvas dragging:

``` js
Viva.Graph.View.renderer(graph, {
  interactive: 'node'
});
```

To allow both node dragging and canvas dragging:

``` js
Viva.Graph.View.renderer(graph, {
  interactive: 'node drag' // scroll is disabled!
});
```

To allow only scroll-zoom, but disable the rest, use:

``` js
Viva.Graph.View.renderer(graph, {
  interactive: 'scroll'
});
```

Finally, to explicitly enable all interactions:

``` js
Viva.Graph.View.renderer(graph, {
  interactive: 'scroll drag node' // order of words does not matter
});
```

This is equivalent to:

``` js
Viva.Graph.View.renderer(graph, {
  interactive: true
});

// or even shorter, since renderer interactive by default:
Viva.Graph.View.renderer(graph);
```
