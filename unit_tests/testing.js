/**
 * @fileOverview Contains simple testing framework.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

// TODO: I have to learn more about existing unit test frameworks in JS. 
// But I'm too lazy at the moment so I wrote this simple micro framework

/*global Viva, console */

var Viva = Viva || {};

Viva.testing = function(context){
    'use strict';
    
    var isTestCategoryName = function(propertyName){
        return propertyName && propertyName.indexOf('test_') === 0;
    },
        
    getAllCategoryNamesFromContext = function(){
        var categoryNames = [],
            key;
        
        for(key in context){
            if (context.hasOwnProperty(key) && isTestCategoryName(key)) {
                categoryNames.push(key);
            }
        }
        
        return categoryNames;
    },
    
    framework = {
       log : function(level, message) {
           console.log(message);
           
           var out = document.getElementById('output'),
               domRecord;
               
           if (!out){
               out = document.createElement('div');
               out.id = 'output';
               document.body.appendChild(out);
           }
           
           domRecord = document.createElement('div');
           domRecord.className = level;
           domRecord.innerHTML = message;
           
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
           framework.log('info', " * " + testName + '...', 3);
           try{
               testFunction();
               framework.log('success', 'Success');
           } catch (e){
               framework.log('fail', 'FAILED: ' + e);
           }
       },
       
       runAll : function(){
          var categoryNames = getAllCategoryNamesFromContext(),
              i, categoryName, shortName, tests, testName;
          framework.log('info', 'Running all tests'); 
          
          for(i = 0; i < categoryNames.length; i += 1) {
              categoryName = categoryNames[i];
              shortName = categoryName.match(/.+_(.+)/);
              tests = context[categoryName](framework);
                  
              shortName = (shortName && shortName[1]) || categoryName;
               
              framework.log('info', 'Running ' + shortName + ' category');
              
              for(testName in tests) {
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
