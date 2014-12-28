var test = require('tap').test;
var Viva = require('../dist/vivagraph.js');

test('randomIteratorReturnsAllItems', function(t) {
  var a = [1, 2, 3, 4, 5, 6],
    aCopy = a.map(function(i) {
      return i;
    }),
    shuffle = Viva.randomIterator(aCopy),
    iterated = [];
  shuffle.forEach(function(i) {
    iterated.push(i);
    t.ok(a.indexOf(i) !== -1, 'Shuffle iterator should return only items from original array. Unexpected ' + i);
  });

  t.equals(iterated.length, a.length, 'Number of iterated items does not match number of original array items');
  t.end();
});

test('lazyExtendDoesNotExtendExistingValues', function(t) {
  var options = {
    age: 42
  };

  Viva.lazyExtend(options, {
    age: 24
  });

  t.equals(options.age, 42, 'Should not touch properties when types match');
  t.end();
});

test('lazyExtendUpdatesWhenTypeDoesNotMatch', function(t) {
  var options = {
    age: '42'
  };

  Viva.lazyExtend(options, {
    age: 24
  });

  t.equals(options.age, 24, 'Should extend, because types are different');
  t.end();
});

test('lazyExtendUpdatesWhenNewProperty', function(t) {
  var options = {
    age: '42'
  };

  Viva.lazyExtend(options, {
    newProperty: 24
  });

  t.equals(options.age, '42', 'Should preserve old values');
  t.equals(options.newProperty, 24, 'Should extend, because new property');
  t.end();
});

test('lazyExtendDeepNewObjects', function(t) {
  var options = {
    age: '42'
  };

  Viva.lazyExtend(options, {
    nested: {
      name: 'deep'
    }
  });

  t.equals(options.age, '42', 'Should preserve old values');
  t.equals(options.nested.name, 'deep', 'Should extend deep properties');
  t.end();
});

test('lazyExtendDeepLogic', function(t) {
  var options = {
    age: '42',
    nested: {
      first: 'Mark',
      age: '22'
    }
  };

  Viva.lazyExtend(options, {
    nested: {
      first: '',
      last: 'Twain',
      age: 20
    }
  });

  t.equals(options.age, '42', 'Should preserve old values');
  t.equals(options.nested.first, 'Mark', 'Should preserve deep properties with same types');
  t.equals(options.nested.last, 'Twain', 'Should create new deep properties');
  t.equals(options.nested.age, 20, 'Should fix deep properties with wrong types');
  t.end();
});

test('lazyExtendCreatesNewObject', function(t) {
  var options,
    extended = Viva.lazyExtend(options, {});

  t.ok(extended, 'New object should be created');
  t.end();
});
