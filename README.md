VivaGraph [![Build Status](https://travis-ci.org/anvaka/VivaGraphJS.svg)](https://travis-ci.org/anvaka/VivaGraphJS)
==================================================
**VivaGraphJS** is a free [graph drawing](http://en.wikipedia.org/wiki/Graph_drawing)
library for JavaScript. It is designed to be extensible and to support different
rendering engines and layout algorithms. At the moment it supports rendering
graphs using WebGL and SVG.

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/anvaka/VivaGraphJS?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

Enough talking. Show me the demo!
----------------------------------------------------
Some examples of library usage in the real projects:

* [Amazon Visualization](http://www.yasiv.com/amazon#/Search?q=graph%20drawing&category=Books&lang=US) Shows related products on Amazon.com, uses SVG as graph output
* [YouTube Visualization](http://www.yasiv.com/youtube#/Search?q=write%20in%20c) Shows related videos from YouTube. SVG based.
* [Facebook Visualization](http://www.yasiv.com/facebook) friendship visualization on Facebook. WebGL based.
* [Graph Viewer](http://www.yasiv.com/graphs#Bai/rw496) visualization of sparse matrices collection of the University of Florida. WebGL based.
* [Vkontakte Visualization](http://www.yasiv.com/vk) friendship visualization of the largest social network in Russia [vk.com](https://vk.com). WebGL based.

To start using the library include `vivagraph.js` script from the [dist](https://github.com/anvaka/VivaGraphJS/tree/master/dist)
folder. The following code is the minimum required to render a graph with two nodes and one edge:

```javascript
var graph = Viva.Graph.graph();
graph.addLink(1, 2);

var renderer = Viva.Graph.View.renderer(graph);
renderer.run();
```

This will produce the following layout:

![Simple graph](https://github.com/anvaka/VivaGraphJS/raw/master/packages/Images/mingraph.png)

The code above adds a link to the graph between nodes `1` and `2`. Since nodes
are not yet in the graph they will be created. It's equivalent to

```javascript
var graph = Viva.Graph.graph();
graph.addNode(1);
graph.addNode(2);
graph.addLink(1, 2);

var renderer = Viva.Graph.View.renderer(graph);
renderer.run();
```

Customization
----------------------------------------------------
VivaGraphJS is all about customization. You can easily change the appearance of
nodes and links. You can also change the layouting algorithm and medium that
displays elements of the graph. For example: The following code allows you to
use WebGL-based rendering, instead of the default SVG.

```javascript
var graph = Viva.Graph.graph();
graph.addLink(1, 2);

var graphics = Viva.Graph.View.webglGraphics();

var renderer = Viva.Graph.View.renderer(graph,
    {
        graphics : graphics
    });
renderer.run();
```

`graphics` class is responsible for rendering nodes and links on the page. And `renderer` orchestrates the process. To change nodes appearance tell `graphics` how to represent them. Here is an example of graph with six people who I follow at github:

```javascript
var graph = Viva.Graph.graph();

// Construct the graph
graph.addNode('anvaka', {url : 'https://secure.gravatar.com/avatar/91bad8ceeec43ae303790f8fe238164b'});
graph.addNode('manunt', {url : 'https://secure.gravatar.com/avatar/c81bfc2cf23958504617dd4fada3afa8'});
graph.addNode('thlorenz', {url : 'https://secure.gravatar.com/avatar/1c9054d6242bffd5fd25ec652a2b79cc'});
graph.addNode('bling', {url : 'https://secure.gravatar.com/avatar/24a5b6e62e9a486743a71e0a0a4f71af'});
graph.addNode('diyan', {url : 'https://secure.gravatar.com/avatar/01bce7702975191fdc402565bd1045a8?'});
graph.addNode('pocheptsov', {url : 'https://secure.gravatar.com/avatar/13da974fc9716b42f5d62e3c8056c718'});
graph.addNode('dimapasko', {url : 'https://secure.gravatar.com/avatar/8e587a4232502a9f1ca14e2810e3c3dd'});

graph.addLink('anvaka', 'manunt');
graph.addLink('anvaka', 'thlorenz');
graph.addLink('anvaka', 'bling');
graph.addLink('anvaka', 'diyan');
graph.addLink('anvaka', 'pocheptsov');
graph.addLink('anvaka', 'dimapasko');

// Set custom nodes appearance
var graphics = Viva.Graph.View.svgGraphics();
graphics.node(function(node) {
       // The function is called every time renderer needs a ui to display node
       return Viva.Graph.svg('image')
             .attr('width', 24)
             .attr('height', 24)
             .link(node.data.url); // node.data holds custom object passed to graph.addNode();
    })
    .placeNode(function(nodeUI, pos){
        // Shift image to let links go to the center:
        nodeUI.attr('x', pos.x - 12).attr('y', pos.y - 12);
    });

var renderer = Viva.Graph.View.renderer(graph,
    {
        graphics : graphics
    });
renderer.run();
```

The result is:

![Custom nodes](https://github.com/anvaka/VivaGraphJS/raw/master/packages/Images/customNode.png)


Tuning layout algorithm
----------------------------------------------------
Graphs vary by their nature. Some graphs have hundreds of nodes and few edges (or links), some might connect every node with every other. Tuning the physics often helps get the best layout.
Consider the following example:

```javascript
var graphGenerator = Viva.Graph.generator();
var graph = graphGenerator.grid(3, 3);
var renderer = Viva.Graph.View.renderer(graph);
renderer.run();
```

Graph generators are part of the library, which can produce classic graphs.
`grid` generator creates a grid with given number of columns and rows. But with
default parameters the rendering is pretty ugly:

![Grid 3x3 bad](https://github.com/anvaka/VivaGraphJS/raw/master/packages/Images/gridBad.png)

Let's tweak the original code:

```javascript
var graphGenerator = Viva.Graph.generator();
var graph = graphGenerator.grid(3, 3);

var layout = Viva.Graph.Layout.forceDirected(graph, {
    springLength : 10,
    springCoeff : 0.0005,
    dragCoeff : 0.02,
    gravity : -1.2
});

var renderer = Viva.Graph.View.renderer(graph, {
    layout : layout
});
renderer.run();
```

Now the result is much better:

![Grid 3x3](https://github.com/anvaka/VivaGraphJS/raw/master/packages/Images/gridGood.png)

Tuning layout algorithm is definitely one of the hardest part of using this library.
It has to be improved in future to simplify usage. Each of the force directed
algorithm parameters are described in the source code.

Design philosophy/roadmap
-------------------------

Until version 0.7.x VivaGraph was a single monolithic code base. Starting from
0.7.x the library is bundled from small npm modules into `Viva` namespace.
All these modules are part of a larger [ngraph](https://github.com/anvaka/ngraph)
family. `ngraph` modules support rendering graphs into images, 3D rendering,
integration with [gephi](https://gephi.org/), pagerank calculation and many more.

Version 0.7 is a compromise between maximum backward compatibility and ngraph
flexibility. Eventually I hope to further simplify API and provide interface
for custom builds.

Upgrade guide
-------------

Please refer the [upgrade guide](https://github.com/anvaka/VivaGraphJS/blob/master/docs/upgrade_guide.md) to see how to update older versions of the library to the latest one.

Local Build
-----------
Run the following script:
```
git clone git://github.com/anvaka/VivaGraphJS.git
cd ./VivaGraphJS
npm install
gulp release
```
The combined/minified code should be stored in ```dist``` folder.

Looking for alternatives?
-------------------------

I'm trying to put up a list of all known graph drawing libraries.
Please [find it here](http://anvaka.github.io/graph-drawing-libraries/#/all)

I need your feedback
----------------------------------------------------
Disclaimer: I wrote this library to learn JavaScript. By no means I pretend to
be an expert in the language and chosen approach to design may not be the optimal.
I would love to hear your feedback and suggestions.

Though I implemented this library from scratch, I went through many existing
libraries to pick the best (at my view) out of them. If you are evaluating libraries
for your project make sure to [check them out](http://anvaka.github.io/graph-drawing-libraries/#/all)
as well.

My goal is to create highly performant javascript library, which serves in the
field of graph drawing. To certain extent I achieved it. But I have no doubt
there is much more to improve here.
