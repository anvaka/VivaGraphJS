VivaGraphJS - JavaScript Graph Drawing Library
==================================================
**VivaGraphJS** is a free [graph drawing](http://en.wikipedia.org/wiki/Graph_drawing) library for JavaScript.
It is designed to be extensible and support different rendering engines and layout algorithms. At the moment
it supports rendering graphs using either SVG or CSS formats. Layout algorithms currently implemented are:

* [Force Directed](http://en.wikipedia.org/wiki/Force-based_algorithms_\(graph_drawing\)) - based on Barnes-Hut
simulation and optimized for JavaScript language this algorithm gives N * lg(N) performance per iteration. 
* [ ![PDF download](https://github.com/anvaka/VivaGraphJS/raw/master/packages/Images/pdf-icon.gif) GEM](http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.113.9565&rep=rep1&type=pdf) - Graph Embedder
algorithm created by Arne Frick, Andreas Ludwig and Heiko Mehldau. Estimated compleixity of this algorithm
is O(|V|^3) - though I must have made a mistake somewhere, because force directed algorithm almost
always produces better results faster. This algorithm is included to demonstrate how
one can implement a new layout algorithm.

Library provides API which tracks graph changes and reflect changes on the rendering surface
accordingly.


Enough talking. Show me the demo!
----------------------------------------------------
The following code is the minimum required to render a graph with two nodes and one edge:

```javascript
var graph = Viva.Graph.graph();
graph.addLink(1, 2);

var renderer = Viva.Graph.View.renderer(graph);
renderer.run();
```

This will produce the following layout:

![Simple graph](https://github.com/anvaka/VivaGraphJS/raw/master/packages/Images/mingraph.png)

The code above adds a link to the graph between nodes `1` and `2`. Since nodes are not in the graph
yet they will be created. It's equivalent to 

```javascript
var graph = Viva.Graph.graph();
graph.addNode(1);
graph.addNode(2);
graph.addLink(1, 2);

var renderer = Viva.Graph.View.renderer(graph);
renderer.run();
```
