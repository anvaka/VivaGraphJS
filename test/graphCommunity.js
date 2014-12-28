var test = require('tap').test;
var Viva = require('../dist/vivagraph.js');

test('occuranceMapCountsWords', function(t) {
  var map = Viva.Graph._community.occuranceMap();
  for (var i = 0; i < 15; ++i) {
    map.add('hello');
  }
  map.add('world');

  var helloCount = map.getWordCount('hello'),
    worldCount = map.getWordCount('world'),
    randomWordCount = map.getWordCount('he-he');

  t.equals(helloCount, 15, 'Hello word should be added 15 times');
  t.equals(worldCount, 1, 'Only one occurance of world should be in the map');
  t.equals(randomWordCount, 0, 'This word should not be in the map!');
  t.end();
});

test('occuranceMapFindsMostPopularWord', function(t) {
  var map = Viva.Graph._community.occuranceMap();

  map.add('hello');
  map.add('world');
  map.add('!');
  map.add('hello');
  map.add('world');
  map.add('hello');

  var mostPopular = map.getMostPopularFair();

  t.equals(mostPopular, 'hello', 'Unexpected most popular word');
  t.end();
});

test('occuranceMapFindsMostPopularWordWithSameRank', function(t) {
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
  for (i = 0; i < 10; ++i) {
    var word = map.getMostPopularFair();
    if (word === 'hello') {
      helloFound = true;
    }
    if (word === 'world') {
      worldFound = true;
    }
  }

  t.ok(helloFound && worldFound, 'Both words should appear. Well. Potentially...This is non-determenistic test');
  t.end();
});

test('occuranceMapReturnsRandomWord', function(t) {
  var map = Viva.Graph._community.occuranceMap(),
    dictionary = {};

  for (var i = 0; i < 15; ++i) {
    var word = 'hello' + i;
    map.add(word);
    dictionary[word] = 1;
  }

  for (i = 0; i < 15; ++i) {
    var actual = map.getRandomWord();
    t.ok(dictionary.hasOwnProperty(actual), 'The random word is not expected');
  }
  t.end();
});

test('occuranceMapEnumeratesAllWords', function(t) {
  var map = Viva.Graph._community.occuranceMap(),
    dictionary = {};

  map.add('hello');
  map.add('world');
  map.add('!');
  map.add('hello');
  map.add('world');
  map.add('hello');

  var prevCount = 4;
  map.forEachUniqueWord(function(word, count) {
    t.ok(count <= prevCount, "Enumeration should go in non increasing order");
    t.ok(!dictionary.hasOwnProperty(word), "Enumeration should go through unique words only");

    dictionary[word] = count;
  });

  t.equals(dictionary.hello, 3, "Unexpected number of 'hello'");
  t.equals(dictionary.world, 2, "Unexpected number of 'world'");
  t.equals(dictionary['!'], 1, "Unexpected number of '!'");
  t.end();
});
