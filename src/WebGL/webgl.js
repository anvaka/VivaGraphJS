/*global Viva Float32Array*/

Viva.Graph.webgl = function(gl) {
    var createShader = function(shaderText, type) {
            var shader = gl.createShader(type);
            gl.shaderSource(shader, shaderText);
            gl.compileShader(shader);
            
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                var msg = gl.getShaderInfoLog(shader);
                alert(msg);
                throw msg;
            }
            
            return shader;
    };
    
    return {
        createProgram : function(vertexShaderSrc, fragmentShaderSrc) {
            var program = gl.createProgram(),
                vs = createShader(vertexShaderSrc, gl.VERTEX_SHADER),
                fs = createShader(fragmentShaderSrc, gl.FRAGMENT_SHADER);
                
            gl.attachShader(program, vs);
            gl.attachShader(program, fs);
            gl.linkProgram(program);
            
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)){
                var msg = gl.getShaderInfoLog(program);
                alert(msg);
                throw msg;
            }
            
            return program;
        },
        
        extendArray : function(buffer, itemsInBuffer, elementsPerItem) {
            if ((itemsInBuffer  + 1)* elementsPerItem > buffer.length) {
                // Every time we run out of space create new array twice bigger.
                // TODO: it seems buffer size is limited. Consider using multiple arrays for huge graphs
                var extendedArray = new Float32Array(buffer.length * elementsPerItem * 2);
                extendedArray.set(buffer);
                
                return extendedArray;
            }
            
            return buffer;
        },
        
        copyArrayPart : function(array, to, from, elementsCount) {
            for(var i = 0; i < elementsCount; ++i) {
                array[to + i] = array[from + i];
            }
        },
        
        swapArrayPart : function(array, from, to, elementsCount) {
            for(var i = 0; i < elementsCount; ++i) {
                var tmp = array[from + i];
                array[from + i] = array[to + i];
                array[to + i] = tmp;
            }
        },
        
        getLocations : function(program, uniformOrAttributeNames) {
            var foundLocations = {};
            for(var i = 0; i < uniformOrAttributeNames.length; ++i) {
                var name = uniformOrAttributeNames[i],
                    location = -1;
                if (name.indexOf('a_') === 0) {
                    location = gl.getAttribLocation(program, name);
                    if(location === -1) {
                        throw "Program doesn't have required attribute: " + name;
                    }
                    
                    foundLocations[name.slice(2)] = location;
                } else if (name.indexOf('u_') === 0) {
                    location = gl.getUniformLocation(program, name);
                    if(location === null) {
                        throw "Program doesn't have required uniform: " + name;
                    }

                    foundLocations[name.slice(2)] = location;
                } else {
                    throw "Couldn't figure out your intent. All uniforms should start with 'u_' prefix, and attributes with 'a_'";
                }
            }
            
            return foundLocations;
        },
        
        context : gl
    };
};
