# Select nodes inside area

This demo shows how to implement rectangular selection tool with webgl renderer. [Click here](http://anvaka.github.io/VivaGraphJS/demos/other/webgl-area-select/) to see it in action.

# How it is done?

First of all we create a basic div overlay on top of graph container:

``` html
<div id="graph-container"></div>
<div class="graph-overlay"></div>
```

Overlay element should have exactly the same size/position as grpah container.
In this demo we are using absolute position for `.graph-overlay` and explicitly
positioned common parent (`body`). See more details here:
[How to overlay one div over another div](http://stackoverflow.com/questions/2941189/how-to-overlay-one-div-over-another-div).

After this is done we are using vivagraph methods to track drag'n'drop actions,
and convert [client coordinates into graph coordinates](https://github.com/anvaka/VivaGraphJS/blob/8342dfb9d41fb619ec2e3a505beb508ce7743873/demos/other/webgl-area-select/index.js#L32-L40). 

Finally we are doing linear iteration over all nodes within graph and ask layout
to provide their coordinates. If those coordinates are [within bounding rectangle](https://github.com/anvaka/VivaGraphJS/blob/8342dfb9d41fb619ec2e3a505beb508ce7743873/demos/other/webgl-area-select/index.js#L58-L62),
we higlight the node.
