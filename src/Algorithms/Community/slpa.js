/*global Viva*/
Viva.Graph._community = {};

/**
 * Implementation of Speaker-listener Label Propagation Algorithm (SLPA) of
 * Jierui Xie and Boleslaw K. Szymanski. 
 * 
 * @see http://arxiv.org/pdf/1109.5720v3.pdf
 * @see https://sites.google.com/site/communitydetectionslpa/ 
 */
Viva.Graph._community.slpaAlgorithm = function(graph, T, r) {
    T = T || 100; // number of evaluation iterations. Should be at least 20. Influence memory consumption by O(n * T);
    r = r || 0.3; // community threshold on scale from 0 to 1. Value greater than 0.5 result in disjoint communities.
    
    var random = Viva.random(1331782216905),
        shuffleRandom = Viva.random('Greeting goes to you, ', 'dear reader');
    
    var calculateCommunities = function(nodeMemory, threshold) {
        var communities = [];
        nodeMemory.forEachUniqueWord(function(word, count){
            if (count > threshold) {
                communities.push({name : word, probability : count / T });
            } else {
                return true; // stop enumeration, nothing more popular after this word.
            }
        });

        return communities;
    },
    
    init = function(graph) {
        var algoNodes = [];
        graph.forEachNode(function(node) {
            var memory = Viva.Graph._community.occuranceMap(random);
            memory.add(node.id);
            
            node.slpa = { memory : memory  };
            algoNodes.push(node.id);
        });
        
        return algoNodes;
    },
    
    evaluate = function(graph, nodes) {
        var shuffle = Viva.randomIterator(nodes, shuffleRandom),
        
       /**
        * One iteration of SLPA.
        */
        processNode = function(nodeId){
            var listner = graph.getNode(nodeId),
                saidWords = Viva.Graph._community.occuranceMap(random);
            
            graph.forEachLinkedNode(nodeId, function(speakerNode){
                var word = speakerNode.slpa.memory.getRandomWord();
                saidWords.add(word);
            });
            
            // selecting the most popular label from what it observed in the current step
            var heard = saidWords.getMostPopularFair();
            listner.slpa.memory.add(heard); 
        };
        
        for (var t = 0; t < T - 1; ++t) { // -1 because one 'step' was during init phase
            shuffle.forEach(processNode);
        }
    },
    
    postProcess = function(graph) {
        var communities = {};
            
        graph.forEachNode(function(node){
            var nodeCommunities = calculateCommunities(node.slpa.memory, r * T);
            
            for (var i = 0; i < nodeCommunities.length; ++i) {
                var communityName = nodeCommunities[i].name;
                if (communities.hasOwnProperty(communityName)){
                    communities[communityName].push(node.id);
                } else {
                    communities[communityName] = [node.id];
                }
            }
            
            node.communities = nodeCommunities; // TODO: I doesn't look right to augment node's properties. No? 
            
            // Speaking of memory. Node memory created by slpa is really expensive. Release it:
            node.slpa = null;
            delete node.slpa; 
        });
        
        return communities;
    };
    
    return {
        
        /**
         * Executes SLPA algorithm. The function returns dictionary of discovered communities: 
         * {
         *     'communityName1' : [nodeId1, nodeId2, .., nodeIdN],
         *     'communityName2' : [nodeIdK1, nodeIdK2, .., nodeIdKN],
         *     ...
         * };
         *  
         * After algorithm is done each node is also augmented with new property 'communities':
         * 
         * node.communities = [ 
         *      {name: 'communityName1', probability: 0.78}, 
         *      {name: 'communityName2', probability: 0.63},
         *     ... 
         * ];
         * 
         * 'probability' is always higher than 'r' parameter and denotes level of confidence 
         * with which we think node belongs to community.
         * 
         * Runtime is O(T * m), where m is total number of edges, and T - number of algorithm iterations.
         *  
         */
        run : function() {
            var nodes = init(graph);
            
            evaluate(graph, nodes);
            
            return postProcess(graph);
        }
    };
};

/**
 * A data structure which serves as node memory during SLPA execution. The main idea is to
 * simplify operations on memory such as
 *  - add word to memory,
 *  - get random word from memory, with probablity proportional to word occurrence in the memory
 *  - get the most popular word in memory
 * 
 * TODO: currently this structure is extremely inefficient in terms of memory. I think it could be
 * optimized.
 */
Viva.Graph._community.occuranceMap = function(random){
    random = random || Viva.random();
    
    var wordsCount = {},
        allWords = [],
        dirtyPopularity = false,
        uniqueWords = [],
        
        rebuildPopularityArray = function() {
            uniqueWords.length = 0;
            for (var key in wordsCount) {
                if (wordsCount.hasOwnProperty(key)) {
                    uniqueWords.push(key);
                }
            }
            
            uniqueWords.sort(function(x, y) {
                var result = wordsCount[y] - wordsCount[x]; 
                if (result) {
                    return result;
                }

                // Not only number of occurances matters but order of keys also does.
                // for ... in implementation in different browsers results in different
                // order, and if we want to have same categories accross all browsers
                // we should order words by key names too:                
                if (x < y) { return -1; }
                if (x > y) { return 1; }
                else { return 0;}
            });
        },
        
        ensureUniqueWordsUpdated = function() {
            if (dirtyPopularity) {
                rebuildPopularityArray();
                dirtyPopularity = false;
            }
        };
        
    return {
        
        /**
         * Adds a new word to the collection of words.
         */
        add : function(word) {
            word = String(word);
            if (wordsCount.hasOwnProperty(word)) {
                wordsCount[word] += 1;
            } else {
                wordsCount[word] = 1;
            }
            
            allWords.push(word);
            dirtyPopularity = true;
        },
        
        /**
         * Gets number of occurances for a given word. If word is not present in the dictionary
         * zero is returned.
         */
        getWordCount : function(word) {
            return wordsCount[word] || 0;
        },
        
        /**
         * Gets the most popular word in the map. If multiple words are at the same position
         * random word among them is choosen.
         * 
         */
        getMostPopularFair : function() {
            if (allWords.length === 1) {
                return allWords[0]; // optimizes speed for simple case.
            }
            
            ensureUniqueWordsUpdated();
                        
            var maxCount = 0;
            
            for(var i = 1; i < uniqueWords.length; ++i) {
               if (wordsCount[uniqueWords[i - 1]] !== wordsCount[uniqueWords[i]]) {
                   break; // other words are less popular... not interested.
               } else {
                   maxCount += 1;
               }
           }
           
           maxCount += 1;  // to include upper bound. i.e. random words between [0, maxCount] (not [0, maxCount) ).
           return uniqueWords[random.next(maxCount)];
        },
        
        /**
         * Selects a random word from map with probability proportional
         * to the occurrence frequency of words.
         */
        getRandomWord : function() {
            if (allWords.length === 0) {
                throw 'The occurance map is empty. Cannot get empty word';
            }
            
            return allWords[random.next(allWords.length)];
        }, 
        
        /**
         * Enumerates all unique words in the map, and calls
         *  callback(word, occuranceCount) function on each word. Callback
         * can return true value to stop enumeration.
         * 
         * Note: enumeration is guaranteed in to run in decreasing order.
         */
        forEachUniqueWord : function(callback) {
            if (typeof callback !== 'function') {
                throw 'Function callback is expected to enumerate all words';
            }
            
            ensureUniqueWordsUpdated();
            
            for (var i = 0; i < uniqueWords.length; ++i) {
                var word = uniqueWords[i],
                    count = wordsCount[word];
                
                var stop = callback(word, count);
                if (stop) {
                    break;
                }
            }
        }
    };
};