/**
 * This is a build script for the project. It has dual purpose:
 *   For one thing it can be referenced from the Test pages
 *   For another it can can be used by node to merge all flies to one
 *   and uglify it.
 * 
 * TODO: Fix IE's dom loaded 
 */

(function(){
    var WORK_DIR = '../src/',
		
		OUT_FILE_NAME = '../dist/vivagraph',
    
		COMPLETE_BUILD = [
            "vivagraph.js",
            "version.js",
            "Utils/browserInfo.js",
            "Utils/indexOf.js",
            "Utils/getDimensions.js",
            "Utils/events.js",
            "Utils/dragndrop.js",
            "Utils/timer.js",
            "Utils/geom.js",
            "Core/graph.js",
            "Core/generator.js",
            "Core/operations.js",
            "Physics/primitives.js",
            "Physics/rungeKuttaIntegrator.js",
            "Physics/eulerIntegrator.js",
            "Physics/Forces/nbodyForce.js",
            "Physics/Forces/dragForce.js",
            "Physics/Forces/springForce.js",
            "Physics/forceSimulator.js",
            "Layout/forceDirected.js",
            "Layout/gem.js",
            "View/cssGraphics.js",
            "Svg/svg.js",
            "View/svgGraphics.js",
            "View/svgNodeFactory.js",
            "View/renderer.js",
            "Core/serializer.js"];
            
   var currentConfig = COMPLETE_BUILD;
   
   var inBrowserInclude = function(){
       var head= document.getElementsByTagName('head')[0],

           load = function(scriptPath, loadedCallback){
              var script = document.createElement('script');
              
              script.type = 'text/javascript';
              if (typeof script.onreadystatechange){

                  script.onreadystatechange = function (){
                      var loadCompleted = this.readyState == 'complete' || this.readyState == 'loaded';
                      
                      if (loadCompleted && loadCompleted ) {
                          loadedCallback();
                          // To avoid IE's potential double invokation.
                          loadedCallback = null;
                      }
                  };
              }
              
              script.onload = loadedCallback;
              script.src = scriptPath;
              head.appendChild(script);
           },
       
            recursiveLoad = function(current){
                if (current < currentConfig.length){
                    load(WORK_DIR + currentConfig[current], function(){ 
                        recursiveLoad(current + 1); 
                    });
                }
            };
            
            recursiveLoad(0);              
        },
        
        inNodeMerge = function(){
            /*global require*/
            
            var outFileName = OUT_FILE_NAME,
            
                concatFiles = function(){
                    var fs = require('fs'),
                        out = '';
                    
                    for(var i = 0; i < currentConfig.length; ++i) {
                        out += fs.readFileSync(WORK_DIR + currentConfig[i], 'utf8');
                    }
                    
                    return out;
                },
                
                uglify = function(orig_code){
                    var uglifyjs = require("uglify-js"),
						jsp = uglifyjs.parser,
						pro = uglifyjs.uglify;
                    
                    var ast = jsp.parse(orig_code); 
                    ast = pro.ast_mangle(ast); 
                    ast = pro.ast_squeeze(ast);
                    return pro.gen_code(ast); 
                },
                
                writeFileContent = function(fileName, fileContent){
                    var fs = require('fs'),
                        outFile = fs.openSync(fileName, 'w');
                    
                    fs.writeSync(outFile, fileContent);
                    fs.closeSync(outFile);                    
                };
                
           var content = concatFiles();
           writeFileContent(outFileName + '.js', content);
           
		   var uglified = uglify(content);
           writeFileContent(outFileName + '.min.js', uglified);
        };
   
   if (typeof window === 'undefined'){
      inNodeMerge(); 
   } else {
      inBrowserInclude();
   }
})();
