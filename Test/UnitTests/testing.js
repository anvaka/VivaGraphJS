/**
 * @fileOverview Contains simple testing framework.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

// TODO: I have to learn more about existing unit test frameworks in JS. 
// But I'm too lazy at the moment so I wrote this simple micro framework

/*global Viva console*/

if (typeof Viva === 'undefined') { Viva = {}; }

Viva.testing = function(){
    return {
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
           this.log('info', "Running " + testName + '...');
           try{
               testFunction();
               this.log('success', 'Success');
           } catch (e){
               this.log('fail', 'FAILED: ' + e);
           }
       }
   };
};
