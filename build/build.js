/**
 * This file has dual purpose:
 *   For one and primary thing it is used to build a library (merge/minify files of the library). 
 *    The files to be processed are specified in the configuration file. To build a certain configuration
 *    run this command in termnial:
 *      node build.js cfg_file_name.js
 * 
 *    The config files are javascript files with the following format:
 * 
 *        configuration = {
 *            outName : '../dist/library_name_without_js_extension',
 *            workDir : '../path/to/root/directory/with/library/source/files',
 *            files : [
 *                    "file1.js",
 *                    "file2.js",
 *                    "nested/file3.js",
 *                    ...
 *                    ];
 *        };
 *                    
 *   For another thing this script can be referenced from the test pages to include all scripts as standalone
 *    files and (arguably) simplify code navigation. To do this include the following line *inside of*
 *    the <body> tag, before any calls to library being built:
 *         <script src="../../build/build.js"></script>
 *    Note: to make this work properly one should always test library code in the body.onload handler.
 * 
 * TODO: Check whether last commit fixed IE load event.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 * (C) 2012 
 */
/*global process, window, console */

(function (ctx) {
    'use strict';
    
    var workDir,
        allFiles,
        i,
        defaultConfigName = 'cfg_build_all.js',
        
        
        inBrowserInclude = function(configName) {
           
           var head= document.getElementsByTagName('head')[0],
               alreadyLoadedScripts = document.getElementsByTagName("script"),
               currentlyExecutingFile = alreadyLoadedScripts[alreadyLoadedScripts.length - 1].src,
               basePath = currentlyExecutingFile.substring(0, currentlyExecutingFile.lastIndexOf('/') + 1), 
               oldOnload,       
               load = function(scriptPath, loadedCallback){
                  var script = document.createElement('script');
                  
                  script.type = 'text/javascript';
                  if (typeof script.onreadystatechange){
    
                      script.onreadystatechange = function (){
                          var loadCompleted = this.readyState === 'complete' || this.readyState === 'loaded';
                          
                          if (loadCompleted && loadedCallback ) {
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
                    if (current < allFiles.length){
                        load(workDir + allFiles[current], function(){ 
                            recursiveLoad(current + 1); 
                        });
                    } else if (oldOnload) {
                        oldOnload();
                    }
                },
                
                loadConfig = function(configName) {
                    load(configName, function(){
                        if (window && window.configuration) {
                            workDir = basePath + window.configuration.workDir;
                            allFiles = window.configuration.files;
                            recursiveLoad(0);
                        }
                    });
                };
            
            if (document.body && document.body.onload) {
                // postpone body.onload() call untill last script is loaded
                // it's okay, since the only reason this script could be ever executed
                // is for debugging library itself.
                oldOnload = document.body.onload;
                document.body.onload = null;
            }
            
            loadConfig(basePath + configName);
        },
            
        inNodeMerge = function(configName){
            console.log('Processing ' + configName);
            
           var vm = require("vm"),
               fs = require("fs"),
               configData = fs.readFileSync(configName),
               configContext = {},
            
                concatFiles = function(){
                    var out = '', i;
                    
                    for(i = 0; i < allFiles.length; i += 1) {
                        out += fs.readFileSync(workDir + allFiles[i], 'utf8');
                    }
                    
                    return out;
                },
                
                uglify = function(orig_code){
                    var uglifyjs = require("uglify-js"),
                        jsp = uglifyjs.parser,
                        pro = uglifyjs.uglify,
                        ast = jsp.parse(orig_code);
                         
                    ast = pro.ast_mangle(ast); 
                    ast = pro.ast_squeeze(ast);
                    return pro.gen_code(ast); 
                },
                
                writeFileContent = function(fileName, fileContent){
                    var fs = require('fs'),
                        outFile = fs.openSync(fileName, 'w');
                    
                    fs.writeSync(outFile, fileContent);
                    fs.closeSync(outFile);                    
                },
                
                content, uglified, config, contentFileName, uglifiedFileName;

                
            vm.runInNewContext(configData, configContext, configName);
            
            config = configContext.configuration;
            allFiles = config.files;
            workDir = config.workDir;
            contentFileName = config.outName + '.js';
            uglifiedFileName = config.outName + '.min.js'; 
            
            content = concatFiles();
            uglified = uglify(content);
                
            writeFileContent(contentFileName, content);
            console.log('  Saved ' + contentFileName);
            writeFileContent(uglifiedFileName, uglified);
            console.log('  Saved ' + uglifiedFileName);
        };
   
   if (typeof window === 'undefined'){
       if (process.argv.length < 3) {           
            inNodeMerge(defaultConfigName); // 
       } else {
           for (i = 2; i < process.argv.length; i += 1) {
                inNodeMerge(process.argv[i]);
           }
       }
   } else {
       inBrowserInclude(defaultConfigName);
   }
}());
