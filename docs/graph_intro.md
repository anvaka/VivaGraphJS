Start here to begin with VivaGraph.JS.

## Creating a graph
Create a graph with no edges and no nodes:

```html
<!DOCTYPE html>
<html>
    <head>
        <title>VivaGraphs test page</title>
        <script src="../dist/vivagraph.js"></script>
        <script type='text/javascript'>
            
            function onLoad() {
                var g = Viva.Graph.graph();
            }
            
        </script>
    </head>
    <body onload="onLoad()">
        
    </body>
</html>
```

By definition, a Graph is a collection of nodes (vertices) and links (also called edges - identified pairs of nodes). In VivaGraph.JS nodes can be any object e.g. a string, a number, a function, another graph or object, and so on. 

## Growing a graph
The graph `g`can be grown in two ways. You can add one node at a time:

```javascript
g.addNode('hello'); 
g.addNode('world'); 
```

Now graph `g` contains two nodes: `hello` and `world`. You can also use `addLink()` method to grow a graph. Calling this method with nodes which are not present in the graph creates them:

```javascript     
g.addLink('space', 'bar'); // now graph 'g' has two new nodes: 'space' and 'bar'
```

If nodes already present in the graph 'addLink()' makes them connected:

```javascript 
g.addLink('hello', 'world'); // Only a link between 'hello' and 'bar' is created. No new nodes.
```

### What to use as nodes and edges?
Though VivaGraph.JS does not limit you in choosing node type, the most common and convenient choices are numbers and strings, used to identify a node, and actual node data is passed via optional second parameter of `addNode()` method:

```javascript     
g.addNode('world', 'custom data'); // Now node 'world' is associated with a string object 'custom data'
```

It's better to think of the first parameter as node identifier, and second parameter its actual content. 

> Note: if node already present in the graph `addNode()` augments data object associated with the node. 

You can also associate arbitrary object with a link using third optional parameter of `addLink()` method:

```javascript     
g.addLink(1, 2, x); // A link between nodes '1' and '2' is now associated with object 'x'
```

### Enumerating nodes and links
After you created a graph one of the most common task is to enumerate its nodes/links to perform an operation.

```javascript 
g.forEachNode(function(node){
    console.log(node.id, node.data);
});
```

The function takes callback which accepts current node. Node object holds set of internal properties used by layouting algorithms which might be changed in future. But `node.id` and `node.data` represent parameters passed to the `g.addNode(id, data)` method and they are guaranteed to persist across library releases.

To enumerate all links in the graph use `forEachLink()` method:

```javascript 
g.forEachLink(function(link) {
    console.dir(link);
});
```

To enumerate all links for a specific node use `forEachLinkedNode()` method:

```JavaScript
g.forEachLinkedNode('hello', function(linkedNode, link){
    console.log("Connected node: ", linkedNode.id, linkedNode.data); 
    console.dir(link); // link object itself
});
```

This method always enumerates both inbound and outbound links. To get a particular node object use `getNode()` method. E.g.:

```javascript 
var world = g.getNode('world'); // returns 'world' node
console.log(world.id, world.data);
```

Finally to remove a node or a link from a graph use `removeNode()` or `removeLink()` correspondingly:

```javascript
g.removeNode('space');
// Removing link is a bit harder, since method requires actual link object:
g.forEachLinkedNode('hello', function(linkedNode, link){
  g.removeLink(link); 
});
```

Stop now and play with [interactive fiddle](http://jsfiddle.net/anvaka/JA76K/2/) for this article.