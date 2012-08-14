/*global Viva, console*/

var test_graphCommunity = function(test){

    return {
     
       occuranceMapCountsWords : function() {
           var map =  Viva.Graph._community.occuranceMap();
           for (var i = 0; i < 15; ++i) {
               map.add('hello');
           }
           map.add('world');
           
           var helloCount = map.getWordCount('hello'),
               worldCount = map.getWordCount('world'),
               randomWordCount = map.getWordCount('he-he');
           
           test.assertEqual(helloCount, 15, 'Hello word should be added 15 times');
           test.assertEqual(worldCount, 1, 'Only one occurance of world should be in the map');
           test.assertEqual(randomWordCount, 0, 'This word should not be in the map!');
       },
       
       occuranceMapFindsMostPopularWord : function() {
           var map = Viva.Graph._community.occuranceMap();
           
           map.add('hello'); map.add('world'); map.add('!');
           map.add('hello'); map.add('world');
           map.add('hello');
           
           var mostPopular = map.getMostPopularFair();
          
           test.assertEqual(mostPopular, 'hello', 'Unexpected most popular word');
       },
       
       occuranceMapFindsMostPopularWordWithSameRank : function() {
           var map = Viva.Graph._community.occuranceMap();
           
           for (var i = 0; i < 100; ++i) {
               if (i < 50) {
                   map.add('hello');
               } else {
                   map.add('world');
               }
           }
           
           var helloFound = false,
               worldFound = false;
           for(i = 0; i < 10; ++i){
               var word = map.getMostPopularFair();
               if (word === 'hello') { helloFound = true; }
               if (word === 'world') { worldFound = true; }
           }
           
           test.assert(helloFound && worldFound, 'Both words should appear. Well. Potentially...This is non-determenistic test');
       },
              
       occuranceMapReturnsRandomWord : function() {
           var map = Viva.Graph._community.occuranceMap(),
               dictionary = {};
               
           for (var i = 0; i < 15; ++i) {
               var word = 'hello' + i;
               map.add(word);
               dictionary[word] = 1;
           }
           
           for (i = 0; i < 15; ++i) {
               var actual = map.getRandomWord();
               test.assert(dictionary.hasOwnProperty(actual), 'The random word is not expected');
           }
       },
       
       occuranceMapEnumeratesAllWords : function() {
           var map = Viva.Graph._community.occuranceMap(),
               dictionary = {};
           
           map.add('hello'); map.add('world'); map.add('!');
           map.add('hello'); map.add('world');
           map.add('hello');
           
           var prevCount = 4;
           map.forEachUniqueWord(function(word, count) {
               test.assert(count <= prevCount, "Enumeration should go in non increasing order");
               test.assert(!dictionary.hasOwnProperty(word), "Enumeration should go through unique words only");
               
               dictionary[word] = count;
           });
           
           test.assert(dictionary.hello, 3, "Unexpected number of 'hello'");
           test.assert(dictionary.world, 2, "Unexpected number of 'world'");
           test.assert(dictionary['!'], 1, "Unexpected number of '!'");
       }
  };             
};