/**
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/**
 * Simple wrapper over svg object model API, to shorten the usage syntax.
 */
Viva.Graph.svg = function (element) {
    var svgns = "http://www.w3.org/2000/svg",
        xlinkns = "http://www.w3.org/1999/xlink",
        svgElement = element;

    if (typeof element === "string") {
        svgElement = window.document.createElementNS(svgns, element);
    }

    if (svgElement.vivagraphAugmented) {
        return svgElement;
    }

    svgElement.vivagraphAugmented = true;

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
    svgElement.attr = function (name, value) {
        if (arguments.length === 2) {
            if (value !== null) {
                svgElement.setAttributeNS(null, name, value);
            } else {
                svgElement.removeAttributeNS(null, name);
            }

            return svgElement;
        }

        return svgElement.getAttributeNS(null, name);
    };

    svgElement.append = function (element) {
        var child = Viva.Graph.svg(element);
        svgElement.appendChild(child);
        return child;
    };

    svgElement.text = function (textContent) {
        if (typeof textContent !== "undefined") {
            svgElement.textContent = textContent;
            return svgElement;
        }
        return svgElement.textContent;
    };

    svgElement.link = function (target) {
        if (arguments.length) {
            svgElement.setAttributeNS(xlinkns, "xlink:href", target);
            return svgElement;
        }

        return svgElement.getAttributeNS(xlinkns, "xlink:href");
    };

    svgElement.children = function (selector) {
        var wrappedChildren = [],
            childrenCount = svgElement.childNodes.length,
            i,
            j;

        if (selector === undefined && svgElement.hasChildNodes()) {
            for (i = 0; i < childrenCount; i++) {
                wrappedChildren.push(Viva.Graph.svg(svgElement.childNodes[i]));
            }
        } else if (typeof selector === "string") {
            var classSelector = (selector[0] === "."),
                idSelector    = (selector[0] === "#"),
                tagSelector   = !classSelector && !idSelector;

            for (i = 0; i < childrenCount; i++) {
                var el = svgElement.childNodes[i];

                // pass comments, text nodes etc.
                if (el.nodeType === 1) {
                    var classes = el.attr("class"),
                        id = el.attr("id"),
                        tagName = el.nodeName;

                    if (classSelector && classes) {
                        classes = classes.replace(/\s+/g, " ").split(" ");
                        for (j = 0; j < classes.length; j++) {
                            if (classSelector && classes[j] === selector.substr(1)) {
                                wrappedChildren.push(Viva.Graph.svg(el));
                                break;
                            }
                        }
                    } else if (idSelector && id === selector.substr(1)) {
                        wrappedChildren.push(Viva.Graph.svg(el));
                        break;
                    } else if (tagSelector && tagName === selector) {
                        wrappedChildren.push(Viva.Graph.svg(el));
                    }

                    wrappedChildren = wrappedChildren.concat(Viva.Graph.svg(el).children(selector));
                }
            }

            if (idSelector && wrappedChildren.length === 1) {
                return wrappedChildren[0];
            }
        }

        return wrappedChildren;
    };

    return svgElement;
};
