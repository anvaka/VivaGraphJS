# Render nodes as circular images

This demo shows how to implement circular images with SVG renderer. [Click here](http://anvaka.github.io/VivaGraphJS/demos/other/svg-circle-images/) to see it in action.

# How it is done?

We are using [SVG Patterns](http://www.w3.org/TR/SVG/pservers.html#Patterns) to
fill a circle with Image brush. The `graphics.node()` function reconstructs
structure similar to the following:

``` html
<svg width="100" height="100">
  <defs>
    <pattern id="imageFor_userName" patternUnits="userSpaceOnUse" height="100" width="100">
      <image x="0" y="0" height="100" width="100"
      xlink:href="https://secure.gravatar.com/avatar/1c9054d6242bffd5fd25ec652a2b79cc"></image>
    </pattern>
  </defs>
  <circle id='top' cx="50" cy="50" r="50" fill="url(#imageFor_userName)"/>
</svg>
```

See [source code](https://github.com/anvaka/VivaGraphJS/blob/9075454b4924c6a441d6d456a32ccf5c70f13f19/demos/other/svg-circle-images/index.js#L23) for exact steps.
