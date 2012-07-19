/**
 * @fileOverview Defines a model objects to represents graph rendering 
 * primitives in webglGraphics. 
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/* global Viva Float32Array */

Viva.Graph.View.WebglUtils = function() { };

/**
 * Parses various color strings and returns color value used in webgl shaders.
 */

Viva.Graph.View.WebglUtils.prototype.parseColor = function(color) {
        var parsedColor = 0x009ee8ff; 
        
        if (typeof color === 'string' && color) {
            if (color.length === 4) { // #rgb
                color = color.replace(/([^#])/g, '$1$1'); // duplicate each letter except first #.
            }
            if (color.length === 9) { // #rrggbbaa 
                parsedColor = parseInt(color.substr(1), 16);
            } else if (color.length === 7) { // or #rrggbb.
                parsedColor = (parseInt(color.substr(1), 16) << 8) | 0xff;
            } else {
                throw 'Color expected in hex format with preceding "#". E.g. #00ff00. Got value: ' + color;
            }
        } else if (typeof color === 'number') {
            parsedColor = color;
        }
        
        return parsedColor;
};

Viva.Graph.View._webglUtil = new Viva.Graph.View.WebglUtils(); // reuse this instance internally.

/**
 * Defines a webgl line. This class has no rendering logic at all,
 * it's just passed to corresponding shader and the shader should
 * figure out how to render it. 
 * 
 * @see Viva.Graph.View.webglLinkShader.position
 */
Viva.Graph.View.webglLine = function(color){
    return {
        /**
         * Gets or sets color of the line. If you set this property externally
         * make sure it always come as integer of 0xRRGGBBAA format 
         */
        color : Viva.Graph.View._webglUtil.parseColor(color)
    };
};

/**
 * Can be used as a callback in the webglGraphics.node() function, to 
 * create a custom looking node.
 * 
 * @param size - size of the node in pixels.
 * @param color - color of the node in '#rrggbbaa' or '#rgb' format.  
 */
Viva.Graph.View.webglSquare = function(size, color){
    return {
        /**
         * Gets or sets size of the sqare side. 
         */
        size : typeof size === 'number' ? size : 10,
        
        /**
         * Gets or sets color of the square.  
         */
        color : Viva.Graph.View._webglUtil.parseColor(color)
    };
};

/**
 * Represents a model for image. 
 */
Viva.Graph.View.webglImage = function(size, src) {
    return {
        /**
         * Gets texture index where current image is placed.s
         */
        _texture : 0,
        
        /**
         * Gets offset in the texture where current image is placed.
         */
        _offset : 0,
        
        /**
         * Gets size of the square with the image.
         */
        size : typeof size === 'number' ? size : 32,
        
        /**
         * Source of the image. If image is comming not from your domain
         * certain origin restrictions applies.
         * See http://www.khronos.org/registry/webgl/specs/latest/#4.2 for more details.
         */
        src  : src
    };
};