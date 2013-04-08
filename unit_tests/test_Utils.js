var test_Utils = function (test) {
    return {
        randomIteratorReturnsAllItems : function () {
            var a = [1, 2, 3, 4, 5, 6],
                aCopy = a.map(function (i) { return i; }),
                shuffle = Viva.randomIterator(aCopy),
                iterated = [];
            shuffle.forEach(function (i) {
                iterated.push(i);
                test.assert(a.indexOf(i) !== -1, 'Shuffle iterator should return only items from original array. Unexpected ' + i);
            });

            test.assertEqual(iterated.length, a.length, 'Number of iterated items does not match number of original array items');
        },

        lazyExtendDoesNotExtendExistingValues : function () {
            var options = { age : 42 };

            Viva.lazyExtend(options, { age : 24 });

            test.assertEqual(options.age, 42, 'Should not touch properties when types match');
        },

        lazyExtendUpdatesWhenTypeDoesNotMatch : function () {
            var options = { age : '42' };

            Viva.lazyExtend(options, { age : 24 });

            test.assertEqual(options.age, 24, 'Should extend, because types are different');
        },

        lazyExtendUpdatesWhenNewProperty : function () {
            var options = { age : '42' };

            Viva.lazyExtend(options, { newProperty : 24 });

            test.assertEqual(options.age, '42', 'Should preserve old values');
            test.assertEqual(options.newProperty, 24, 'Should extend, because new property');
        },

        lazyExtendDeepNewObjects : function () {
            var options = { age : '42' };

            Viva.lazyExtend(options, { nested : { name : 'deep'} });

            test.assertEqual(options.age, '42', 'Should preserve old values');
            test.assertEqual(options.nested.name, 'deep', 'Should extend deep properties');
        },

        lazyExtendDeepLogic : function () {
            var options = { age : '42', nested: { first : 'Mark', age : '22'}};

            Viva.lazyExtend(options, { nested : { first : '', last : 'Twain', age : 20} });

            test.assertEqual(options.age, '42', 'Should preserve old values');
            test.assertEqual(options.nested.first, 'Mark', 'Should preserve deep properties with same types');
            test.assertEqual(options.nested.last, 'Twain', 'Should create new deep properties');
            test.assertEqual(options.nested.age, 20, 'Should fix deep properties with wrong types');
        },

        lazyExtendCreatesNewObject : function () {
            var options,
                extended = Viva.lazyExtend(options, {});

            test.assert(extended, 'New object should be created');
        }
    };
};