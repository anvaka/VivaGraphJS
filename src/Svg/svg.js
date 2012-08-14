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
            if (value !== null) {
                svgElement.setAttributeNS(null, name, value);
            } else {
                svgElement.removeAttributeNS(null, name);
            }
            
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

	svgElement.children = function (selector) {
		var wrapped_children = [],
			children_count = svgElement.childNodes.length;

		if (selector === undefined && svgElement.hasChildNodes()) {
			for (var i = 0; i < children_count; i++) {
				wrapped_children.push(Viva.Graph.svg(svgElement.childNodes[i]));
			}
		} else if (typeof selector === 'string') {
			var class_selector = (selector[0] === '.'),
				id_selector    = (selector[0] === '#'),
				tag_selector   = !class_selector && !id_selector;

			for (var i = 0; i < children_count; i++) {
				var el = svgElement.childNodes[i];

				// pass comments, text nodes etc.
				if (el.nodeType !== 1) {
					continue;
				} 

				var	classes = el.attr('class'),
					id = el.attr('id'),
					tagName = el.nodeName;

				if (class_selector && classes) {
					classes = classes.replace(/\s+/g, ' ').split(' ');
					for (var j = 0; j < classes.length; j++) {
						if (class_selector && classes[j] === selector.substr(1)) {
							wrapped_children.push(Viva.Graph.svg(el));
							break;
						} 
					}
				}
				else if (id_selector && id === selector.substr(1)) {
					wrapped_children.push(Viva.Graph.svg(el));
					break;
				} else if (tag_selector && tagName === selector) {
					wrapped_children.push(Viva.Graph.svg(el));
				}

				wrapped_children = wrapped_children.concat(Viva.Graph.svg(el).children(selector));
			}

			if (id_selector && wrapped_children.length === 1) {
				return wrapped_children[0];
			}
		}

		return wrapped_children;
	};
    
    return svgElement;
};
