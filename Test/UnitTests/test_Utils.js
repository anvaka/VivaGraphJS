/*global Viva, console*/

var test_Utils = function(test){
    return {
        randomIteratorReturnsAllItems : function() {
            var a = [1, 2, 3, 4, 5, 6],
                aCopy = a.map(function(i) { return i; }),
                shuffle = Viva.randomIterator(aCopy),
                iterated = [];
            shuffle.forEach(function(i) {
                iterated.push(i);
                test.assert(a.indexOf(i) !== -1, 'Shuffle iterator should return only items from original array. Unexpected ' + i);
            });
            
            test.assertEqual(iterated.length, a.length, 'Number of iterated items does not match number of original array items');
        }
    };
};