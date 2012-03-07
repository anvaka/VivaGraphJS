/**
 * @fileOverview Contains simple testing framework.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

// TODO: I have to learn more about existing unit test frameworks in JS. 
// But I'm too lazy at the moment so I wrote this simple micro framework

/*global Viva console*/

if (typeof Viva === 'undefined') { Viva = {}; }

Viva.testing = function(context){
    var isTestCategoryName = function(propertyName){
        return propertyName && propertyName.indexOf('test_') === 0;
    },
        
    getAllCategoryNamesFromContext = function(){
        var categoryNames = [];
        
        for(var key in context){
            if (context.hasOwnProperty(key) && isTestCategoryName(key)) {
                categoryNames.push(key);
            }
        }
        
        return categoryNames;
    };
    
    var framework = {
       log : function(level, message) {
           console.log(message);
           
           var out = document.getElementById('output');
           if (!out){
               out = document.createElement('div');
               out.id = 'output';
               document.body.appendChild(out);
           }
           var domRecord = document.createElement('div');
           domRecord.className = level;
           domRecord.innerText = message;
           
           if (level === 'info') {
               out.appendChild(document.createElement('br'));
           }
    
           out.appendChild(domRecord);
       },
       
       assert : function(expression, message) {
           if (!expression) {
               throw message;
           }
       },
       
       assertEqual : function(actual, expected, message) {
           if (actual !== expected){
               throw message + '. Actual: ' + actual + '; expected: ' + expected;
           }
       },
       
       assertFail : function(message){
           throw message;
       },
       
       run : function(testName, testFunction) {
           framework.log('info', "Running " + testName + '...', 3);
           try{
               testFunction();
               framework.log('success', 'Success');
           } catch (e){
               framework.log('fail', 'FAILED: ' + e);
           }
       },
       
       runAll : function(){
          var categoryNames = getAllCategoryNamesFromContext();
          framework.log('info', 'Running all tests'); 
          
          for(var i = 0; i < categoryNames.length; ++i) {
              var categoryName = categoryNames[i],
                  shortName = categoryName.match(/.+_(.+)/),
                  tests = context[categoryName](framework);
                  
              shortName = (shortName && shortName[1]) || categoryName;
               
              framework.log('info', 'Running ' + shortName + ' category');
              
              for(var testName in tests) {
                   if (tests.hasOwnProperty(testName)){
                        framework.run(testName, tests[testName]);
                   }
              }
           }
           
           framework.log('info', 'Done');
       }
   };
   
   return framework;
};
