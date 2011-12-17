/**
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva, window*/

/**
 * Simple wrapper over svg object model API, to shorten the usage syntax.
 */
Viva.Graph.svg = function(element) {
    var svgns = "http://www.w3.org/2000/svg",
        xlinkns = 'http://www.w3.org/1999/xlink',
        svgElement = element;
        
    if (typeof element === 'string') {
        svgElement = document.createElementNS(svgns, element);
    }

    if (svgElement.vivagraph_augmented) { return svgElement; }
    
    svgElement.vivagraph_augmented = true;
    
    // Augment svg element (TODO: it's not safe - what if some function already exists on the prototype?):
    
    /**
     * Gets an svg attribute from an element if value is not specified.
     * OR sets a new value to the given attribute.
     * 
     * @param name - svg attribute name;
     * @param value - value to be set;
     * 
     * @returns svg element if both name and value are specified; or value of the given attribute
     * if value parameter is missing.
     */
    svgElement.attr = function(name, value) {
        if (arguments.length === 2) {
            svgElement.setAttributeNS(null, name, value);
            return svgElement;
        } else {
            return svgElement.getAttributeNS(null, name);
        }
    };
    
    svgElement.append = function(element){
        var child = Viva.Graph.svg(element);
        svgElement.appendChild(child);
        return child;
    };
    
    svgElement.text = function(textContent){
        if (typeof textContent == 'undefined') {
            return svgElement.textContent;
        } else {
            svgElement.textContent = textContent;
        }
        
        return svgElement;
    };
    
    svgElement.link = function(target) {
        if (arguments.length === 0){
            return svgElement.getAttributeNS(xlinkns, 'xlink:href');
        }
        
        svgElement.setAttributeNS(xlinkns, 'xlink:href', target);
        return svgElement;
    };
    
    return svgElement;
};
