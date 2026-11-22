/*! VivaGraph 1.0.0-alpha.1 | BSD-3-Clause | https://github.com/anvaka/VivaGraphJS */
function eventify(subject) {
  validateSubject$1(subject);

  const eventsStorage = createEventsStorage$1(subject);
  subject.on = eventsStorage.on;
  subject.off = eventsStorage.off;
  subject.fire = eventsStorage.fire;
  return subject;
}

function createEventsStorage$1(subject) {
  // Store all event listeners to this hash. Key is event name, value is array
  // of callback records.
  //
  // A callback record consists of callback function and its optional context:
  // { 'eventName' => [{callback: function, ctx: object}] }
  let registeredEvents = Object.create(null);

  return {
    on: function (eventName, callback, ctx) {
      if (typeof callback !== 'function') {
        throw new Error('callback is expected to be a function');
      }
      let handlers = registeredEvents[eventName];
      if (!handlers) {
        handlers = registeredEvents[eventName] = [];
      }
      handlers.push({ callback: callback, ctx: ctx });

      return subject;
    },

    off: function (eventName, callback) {
      const wantToRemoveAll = (typeof eventName === 'undefined');
      if (wantToRemoveAll) {
        // Killing old events storage should be enough in this case:
        registeredEvents = Object.create(null);
        return subject;
      }

      if (registeredEvents[eventName]) {
        const deleteAllCallbacksForEvent = (typeof callback !== 'function');
        if (deleteAllCallbacksForEvent) {
          delete registeredEvents[eventName];
        } else {
          const callbacks = registeredEvents[eventName];
          for (let i = 0; i < callbacks.length; ++i) {
            if (callbacks[i].callback === callback) {
              callbacks.splice(i, 1);
            }
          }
        }
      }

      return subject;
    },

    fire: function (eventName) {
      const callbacks = registeredEvents[eventName];
      if (!callbacks) {
        return subject;
      }

      let fireArguments;
      if (arguments.length > 1) {
        // copy all args after eventName
        fireArguments = Array.prototype.slice.call(arguments, 1);
      }
      for (let i = 0; i < callbacks.length; ++i) {
        const callbackInfo = callbacks[i];
        callbackInfo.callback.apply(callbackInfo.ctx, fireArguments);
      }

      return subject;
    }
  };
}

function validateSubject$1(subject) {
  if (!subject) {
    throw new Error('Eventify cannot use falsy object as events subject');
  }
  const reservedWords = ['on', 'fire', 'off'];
  for (let i = 0; i < reservedWords.length; ++i) {
    if (subject.hasOwnProperty(reservedWords[i])) {
      throw new Error("Subject cannot be eventified, since it already has property '" + reservedWords[i] + "'");
    }
  }
}

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var ngraph_forcelayout = {exports: {}};

var generateCreateBody = {exports: {}};

var getVariableName;
var hasRequiredGetVariableName;

function requireGetVariableName () {
	if (hasRequiredGetVariableName) return getVariableName;
	hasRequiredGetVariableName = 1;
	getVariableName = function getVariableName(index) {
	  if (index === 0) return 'x';
	  if (index === 1) return 'y';
	  if (index === 2) return 'z';
	  return 'c' + (index + 1);
	};
	return getVariableName;
}

var createPatternBuilder;
var hasRequiredCreatePatternBuilder;

function requireCreatePatternBuilder () {
	if (hasRequiredCreatePatternBuilder) return createPatternBuilder;
	hasRequiredCreatePatternBuilder = 1;
	const getVariableName = requireGetVariableName();

	/**
	 * Repeats a template once per axis. In the template `{var}` is the axis name (x, y, z, c4...),
	 * `{k}` is the axis index, and `{+k}` is ` + k` (empty for the first axis), which addresses
	 * flat arrays: `pos[offset{+k}]` gives `pos[offset]`, `pos[offset + 1]`...
	 */
	createPatternBuilder = function createPatternBuilder(dimension) {

	  return pattern;
	  
	  function pattern(template, config) {
	    let indent = (config && config.indent) || 0;
	    let join = (config && config.join !== undefined) ? config.join : '\n';
	    let indentString = Array(indent + 1).join(' ');
	    let buffer = [];
	    for (let i = 0; i < dimension; ++i) {
	      let variableName = getVariableName(i);
	      let prefix = (i === 0) ? '' : indentString;
	      buffer.push(prefix + template
	        .replace(/{var}/g, variableName)
	        .replace(/{k}/g, String(i))
	        .replace(/{\+k}/g, i === 0 ? '' : ' + ' + i));
	    }
	    return buffer.join(join);
	  }
	};
	return createPatternBuilder;
}

var createBodyStore = {exports: {}};

var initColumnStore_1;
var hasRequiredInitColumnStore;

function requireInitColumnStore () {
	if (hasRequiredInitColumnStore) return initColumnStore_1;
	hasRequiredInitColumnStore = 1;
	initColumnStore_1 = initColumnStore;

	function Versions() {}
	Versions.prototype = Object.create(null);

	// Columns that setters of bodies and springs write. A setter raises its column's flag on this
	// object, which has the same shape in every store, so setters stay as fast with many layouts in
	// one process as with one; reading `versions` turns raised flags into new versions.
	function HostWrites() {
	  this.any = false;
	  this.pos = false;
	  this.velocity = false;
	  this.mass = false;
	  this.pinned = false;
	  this.length = false;
	  this.coefficient = false;
	}
	var SETTER_COLUMNS = ['pos', 'velocity', 'mass', 'pinned', 'length', 'coefficient'];

	// Where a store keeps its versions. Every store reads them through the same getter, so that
	// stores keep one shape however many there are: code that all layouts share reads them
	var VERSIONS = typeof Symbol === 'function' ? Symbol('versions') : '$versions';

	// `store.versions`: columns that setters wrote since the last read get new versions first
	function readVersions() {
	  var writes = this.writes, versions = this[VERSIONS];
	  if (!writes.any) return versions;
	  writes.any = false;
	  for (var i = 0; i < SETTER_COLUMNS.length; ++i) {
	    var name = SETTER_COLUMNS[i];
	    if (!writes[name]) continue;
	    writes[name] = false;
	    versions[name] = ++this.versionClock;
	  }
	  return versions;
	}

	var TYPE_NAMES = {
	  Float64Array: 'f64', Float32Array: 'f32', Int32Array: 'i32', Uint32Array: 'u32',
	  Int16Array: 'i16', Uint16Array: 'u16', Int8Array: 'i8', Uint8Array: 'u8', Uint8ClampedArray: 'u8'
	};

	/**
	 * Turns `store` into a table of numbers kept in flat typed arrays, one array per column.
	 * Row `i` of a column with `size` numbers per row is `array[i * size + k]`, `k < size`.
	 * Rows keep the order they were added in; removing one shifts the later rows down, so the
	 * order (and every result computed from it) never depends on what was removed.
	 *
	 * `store` is expected to declare the fields below (and its built in columns) up front, so
	 * that its shape stays fixed.
	 *
	 * Every column has a version, `store.versions[name]`: a number that grows whenever the column
	 * changes in a way an engine with its own copy of the numbers should know about. Writes to the
	 * arrays cannot be seen, so code that writes a column calls `store.changed(name)`; defining the
	 * column, setters of bodies and springs, and graph edits do it themselves. `columnsVersion`
	 * grows when a column is defined or removed.
	 */
	function initColumnStore(store, capacity) {
	  var columns = [];
	  // Columns whose initial value is not 0: a row never used before needs only these filled
	  var withInitial = [];
	  // Rows past this one still hold zeros from the allocation
	  var highestUsed = 0;
	  var builtInCount = 0;

	  store.n = 0;
	  store.capacity = 0;
	  store.add = add;
	  store.removeRows = removeRows;
	  store.define = define;
	  store.has = has;
	  store.get = get;
	  store.remove = removeColumn;
	  store.names = names;
	  store.sizeOf = sizeOf;
	  store.copyTo = copyTo;
	  store.typeOf = typeOf;
	  // Versions of all columns come from one clock, so a column defined again never gets back an
	  // old one. `versions` has no prototype chain and stays in fast mode (columns are never deleted
	  // from it)
	  var versions = store[VERSIONS] = new Versions();
	  store.writes = new HostWrites();
	  store.versionClock = 0;
	  Object.defineProperty(store, 'versions', { get: readVersions, enumerable: true });
	  store.columnsVersion = 0;
	  store.changed = changed;
	  store.lockBuiltIns = function () { builtInCount = columns.length; };
	  store.reserve = function (size) { if (size > store.capacity) resize(size); };
	  // Called after the arrays were replaced by bigger ones:
	  store.onResize = null;

	  if (capacity) resize(capacity);
	  return store;

	  /**
	   * Adds a column with `size` numbers per row (1 by default). New rows get `initial` (0 by
	   * default) in every slot.
	   */
	  function define(name, ArrayType, size, initial) {
	    if (has(name)) throw new Error('Column ' + name + ' is already defined');
	    var column = {
	      name: name,
	      ArrayType: ArrayType || Float64Array,
	      size: size || 1,
	      initial: initial || 0,
	      array: null
	    };
	    column.array = new column.ArrayType(store.capacity * column.size);
	    if (column.initial) column.array.fill(column.initial);
	    columns.push(column);
	    if (column.initial !== 0) withInitial.push(column);
	    store[name] = column.array;
	    store.columnsVersion += 1;
	    changed(name);
	    return column.array;
	  }

	  /**
	   * Marks column `name` as changed (every column, without a name).
	   */
	  function changed(name) {
	    if (name !== undefined) {
	      versions[name] = ++store.versionClock;
	      return;
	    }
	    for (var i = 0; i < columns.length; ++i) versions[columns[i].name] = ++store.versionClock;
	  }


	  function has(name) {
	    return columns.some(function (c) { return c.name === name; });
	  }

	  function get(name) {
	    for (var i = 0; i < columns.length; ++i) if (columns[i].name === name) return columns[i].array;
	  }

	  function removeColumn(name) {
	    for (var i = builtInCount; i < columns.length; ++i) {
	      if (columns[i].name === name) {
	        var at = withInitial.indexOf(columns[i]);
	        if (at >= 0) withInitial.splice(at, 1);
	        columns.splice(i, 1);
	        store[name] = undefined;
	        changed(name);
	        store.columnsVersion += 1;
	        return true;
	      }
	    }
	    return false;
	  }

	  function names() {
	    return columns.map(function (c) { return c.name; });
	  }

	  /**
	   * Kind of numbers of column `name`: 'f64', 'f32', 'i32', 'u32', 'i16', 'u16', 'i8' or 'u8'
	   * (undefined when there is no such column).
	   */
	  function typeOf(name) {
	    for (var i = 0; i < columns.length; ++i) {
	      if (columns[i].name === name) return TYPE_NAMES[columns[i].ArrayType.name] || columns[i].ArrayType.name;
	    }
	  }

	  /**
	   * Numbers per row of column `name` (undefined when there is no such column).
	   */
	  function sizeOf(name) {
	    for (var i = 0; i < columns.length; ++i) if (columns[i].name === name) return columns[i].size;
	  }

	  /**
	   * Adds a row and returns its index. Its slots hold each column's initial value.
	   */
	  function add() {
	    if (store.n === store.capacity) resize(Math.max(16, store.capacity * 2));
	    var index = store.n++;
	    var used = index < highestUsed;
	    if (!used) highestUsed = index + 1;
	    var fill = used ? columns : withInitial;
	    for (var i = 0; i < fill.length; ++i) {
	      var column = fill[i];
	      var size = column.size, array = column.array, start = index * size;
	      for (var k = 0; k < size; ++k) array[start + k] = column.initial;
	    }
	    return index;
	  }

	  /**
	   * Removes the rows listed in `rows` (sorted, no repeats). The rows after them move down,
	   * keeping their order.
	   */
	  function removeRows(rows) {
	    var count = rows.length;
	    if (count === 0) return;
	    var n = store.n;
	    for (var i = 0; i < columns.length; ++i) {
	      var column = columns[i];
	      var size = column.size, array = column.array;
	      var write = rows[0];
	      for (var h = 0; h < count; ++h) {
	        var start = rows[h] + 1, end = h + 1 < count ? rows[h + 1] : n;
	        if (end > start) {
	          array.copyWithin(write * size, start * size, end * size);
	          write += end - start;
	        }
	      }
	    }
	    store.n = n - count;
	  }

	  /**
	   * Copies row `index` to row `otherIndex` of `other`, for every column both stores have.
	   */
	  function copyTo(index, other, otherIndex) {
	    for (var i = 0; i < columns.length; ++i) {
	      var column = columns[i];
	      var target = other.get(column.name);
	      if (!target) continue;
	      var size = column.size;
	      for (var k = 0; k < size; ++k) target[otherIndex * size + k] = column.array[index * size + k];
	    }
	  }

	  function resize(newCapacity) {
	    for (var i = 0; i < columns.length; ++i) {
	      var column = columns[i];
	      var bigger = new column.ArrayType(newCapacity * column.size);
	      bigger.set(column.array.subarray(0, Math.min(column.array.length, store.n * column.size)));
	      if (column.initial) bigger.fill(column.initial, store.n * column.size);
	      column.array = bigger;
	      store[column.name] = bigger;
	    }
	    store.capacity = newCapacity;
	    if (store.onResize) store.onResize();
	  }
	}
	return initColumnStore_1;
}

var hasRequiredCreateBodyStore;

function requireCreateBodyStore () {
	if (hasRequiredCreateBodyStore) return createBodyStore.exports;
	hasRequiredCreateBodyStore = 1;
	createBodyStore.exports = createBodyStore$1;
	createBodyStore.exports.createSingleBodyStore = createSingleBodyStore;
	createBodyStore.exports.copyBody = copyBody;
	createBodyStore.exports.builtInColumns = builtInColumns;

	var initColumnStore = requireInitColumnStore();

	/**
	 * Columns every body has: [name, array type, numbers per body, initial value].
	 */
	function builtInColumns(dimensions) {
	  return [
	    ['pos', Float64Array, dimensions],
	    ['velocity', Float64Array, dimensions],
	    ['force', Float64Array, dimensions],
	    ['mass', Float64Array, 1, 1],
	    ['pinned', Uint8Array, 1],
	    ['springCount', Float64Array, 1],
	    ['springLength', Float64Array, 1],
	    // number of springs attached to the body
	    ['degree', Float64Array, 1]
	  ];
	}

	/**
	 * Numbers of bodies, in flat typed arrays (see initColumnStore.js). Body `i` owns row `i`, and
	 * axis `k` of its position is `pos[i * D + k]`. More columns can be added with `define()`.
	 */
	function createBodyStore$1(dimensions, capacity) {
	  var store = {
	    D: dimensions,
	    n: 0,
	    capacity: 0,

	    pos: null,
	    velocity: null,
	    force: null,
	    mass: null,
	    pinned: null,
	    springCount: null,
	    springLength: null,
	    degree: null,

	    add: null, removeRows: null, define: null, has: null, get: null, remove: null,
	    names: null, sizeOf: null, copyTo: null, lockBuiltIns: null, reserve: null, onResize: null,
	    typeOf: null, versionClock: 0, writes: null, columnsVersion: 0, changed: null
	  };
	  initColumnStore(store);
	  builtInColumns(dimensions).forEach(function (column) {
	    store.define(column[0], column[1], column[2], column[3]);
	  });
	  store.lockBuiltIns();

	  if (capacity) store.reserve(capacity);
	  return store;
	}

	/**
	 * The numbers of one body that is not in a simulator: the built in columns, without the
	 * machinery to add or remove rows.
	 */
	function createSingleBodyStore(dimensions) {
	  var store = { D: dimensions, n: 1 };
	  builtInColumns(dimensions).forEach(function (column) {
	    var values = new column[1](column[2]);
	    if (column[3]) values.fill(column[3]);
	    store[column[0]] = values;
	  });
	  return store;
	}

	/**
	 * Copies the built in columns of body `row` to body `otherRow` of `other`. Columns added with
	 * `define()` are not copied. They are written out, as this runs for every added or removed
	 * body; test/bodyStore.js checks that none is missing.
	 */
	function copyBody(store, row, other, otherRow) {
	  var D = store.D;
	  for (var k = 0; k < D; ++k) {
	    other.pos[otherRow * D + k] = store.pos[row * D + k];
	    other.velocity[otherRow * D + k] = store.velocity[row * D + k];
	    other.force[otherRow * D + k] = store.force[row * D + k];
	  }
	  other.mass[otherRow] = store.mass[row];
	  other.pinned[otherRow] = store.pinned[row];
	  other.springCount[otherRow] = store.springCount[row];
	  other.springLength[otherRow] = store.springLength[row];
	  other.degree[otherRow] = store.degree[row];
	}
	return createBodyStore.exports;
}

var hasRequiredGenerateCreateBody;

function requireGenerateCreateBody () {
	if (hasRequiredGenerateCreateBody) return generateCreateBody.exports;
	hasRequiredGenerateCreateBody = 1;
	const createPatternBuilder = requireCreatePatternBuilder();
	const getVariableName = requireGetVariableName();
	const createSingleBodyStore = requireCreateBodyStore().createSingleBodyStore;

	generateCreateBody.exports = generateCreateBodyFunction;
	generateCreateBody.exports.generateCreateBodyFunctionBody = generateCreateBodyFunctionBody;

	// InlineTransform: getVectorCode
	generateCreateBody.exports.getVectorCode = getVectorCode;
	// InlineTransform: getBodyCode
	generateCreateBody.exports.getBodyCode = getBodyCode;
	// InlineTransformExport: module.exports = function() { return Body; }

	/**
	 * A body is a view of one slot in a body store (see createBodyStore.js): `body.pos.x` reads
	 * and writes `store.pos[index * dimension]`. A body made with `new Body(x, y)` gets a store of
	 * its own; a simulator moves it into its store when the body is added.
	 */
	function generateCreateBodyFunction(dimension, debugSetters) {
	  let code = generateCreateBodyFunctionBody(dimension, debugSetters);
	  let {Body} = (new Function('createSingleBodyStore', code))(createSingleBodyStore);
	  return Body;
	}

	function generateCreateBodyFunctionBody(dimension, debugSetters) {
	  let code = `
${getVectorCode(dimension, debugSetters)}
${getBodyCode(dimension, debugSetters)}
return {Body: Body, Vector: Vector};
`;
	  return code;
	}

	function getBodyCode(dimension, debugSetters) {
	  let pattern = createPatternBuilder(dimension);
	  let variableList = pattern('{var}', {join: ', '});
	  let axes = [];
	  for (let k = 0; k < dimension; ++k) axes.push(k);
	  let each = (template, join) => axes.map(template).join(join === undefined ? '\n' : join);

	  return `
${getViewCode('PositionView', 'pos', dimension, debugSetters)}
${getViewCode('ForceView', 'force', dimension, debugSetters)}
${getViewCode('VelocityView', 'velocity', dimension, debugSetters)}

function Body(${variableList}, store, index) {
  if (store === undefined) {
    // Not in a simulator yet: keep the numbers in a store of its own
    store = createSingleBodyStore(${dimension});
    index = 0;
    if (typeof ${getVariableName(0)} === 'object') {
      let v = ${getVariableName(0)};
      ${pattern('if (!Number.isFinite(v.{var})) throw new Error("Expected value is not a finite number at Vector constructor ({var})");', {indent: 6})}
      ${each(k => `store.pos[${k}] = v.${getVariableName(k)};`, '\n      ')}
    } else {
      ${each(k => `store.pos[${k}] = typeof ${getVariableName(k)} === "number" ? ${getVariableName(k)} : 0;`, '\n      ')}
    }
  }
  this.store = store;
  this.index = index;
  // the store's flags for writes from outside the simulator (see initColumnStore.js)
  this.writes = store.writes || null;
  this.pos = new PositionView(store, index * ${dimension});
  this.force = new ForceView(store, index * ${dimension});
  this.velocity = new VelocityView(store, index * ${dimension});
}

/**
 * Makes a body for slot \`index\` of \`store\`, keeping the numbers that are already there.
 */
Body.inStore = function (store, index) {
  return new Body(${axes.map(() => 'undefined').join(', ')}, store, index);
};

Object.defineProperties(Body.prototype, {
  mass: {
    get: function () { return this.store.mass[this.index]; },
    set: function (value) {
      this.store.mass[this.index] = value;
      ${markChanged('this', 'mass')}
    },
    enumerable: true
  },
  isPinned: {
    get: function () { return this.store.pinned[this.index] === 1; },
    set: function (value) {
      this.store.pinned[this.index] = value ? 1 : 0;
      ${markChanged('this', 'pinned')}
    },
    enumerable: true
  },
  springCount: {
    get: function () { return this.store.springCount[this.index]; },
    set: function (value) { this.store.springCount[this.index] = value; },
    enumerable: true
  },
  springLength: {
    get: function () { return this.store.springLength[this.index]; },
    set: function (value) { this.store.springLength[this.index] = value; },
    enumerable: true
  },
  degree: {
    get: function () { return this.store.degree[this.index]; },
    enumerable: true
  }
});

/**
 * Points this body (and its vectors) to slot \`index\` of \`store\`. The numbers are not copied.
 */
Body.prototype.moveTo = function (store, index) {
  var offset = index * ${dimension};
  this.store = store;
  this.index = index;
  this.writes = this.pos.writes = this.force.writes = this.velocity.writes = store.writes || null;
  this.pos.store = this.force.store = this.velocity.store = store;
  this.pos.offset = this.force.offset = this.velocity.offset = offset;
  this.pos.array = store.pos;
  this.force.array = store.force;
  this.velocity.array = store.velocity;
};

Body.prototype.reset = function() {
  var force = this.store.force, offset = this.index * ${dimension};
  ${each(k => `force[offset${k ? ' + ' + k : ''}] = 0;`, ' ')}
  this.store.springCount[this.index] = 0;
  this.store.springLength[this.index] = 0;
};

Body.prototype.setPosition = function (${variableList}) {
  var pos = this.store.pos, offset = this.index * ${dimension};
  ${each(k => `pos[offset${k ? ' + ' + k : ''}] = ${getVariableName(k)} || 0;`, '\n  ')}
  ${markChanged('this', 'pos')}
};

Body.prototype.toJSON = function () {
  return {
    isPinned: this.isPinned,
    pos: this.pos.toJSON(),
    force: this.force.toJSON(),
    velocity: this.velocity.toJSON(),
    mass: this.mass,
    springCount: this.springCount,
    springLength: this.springLength
  };
};
// console.log() in node shows the numbers, not the store behind them
Body.prototype[Symbol.for('nodejs.util.inspect.custom')] = Body.prototype.toJSON;`;
	}

	// Positions and velocities written from outside the simulator (dragging a node, say) mark their
	// column, so engines with their own copy of the numbers see the write. Forces are cleared every step.
	function markChanged(holder, column) {
	  return `var writes = ${holder}.writes; if (writes !== null) { writes.${column} = true; writes.any = true; }`;
	}

	function getViewCode(className, column, dimension, debugSetters) {
	  let axes = [];
	  for (let k = 0; k < dimension; ++k) axes.push(k);
	  let at = k => `this.offset${k ? ' + ' + k : ''}`;
	  let check = name => debugSetters ? `if (!Number.isFinite(value)) throw new Error('Cannot set non-numbers to ${name}'); ` : '';
	  let mark = column === 'force' ? '' : ' ' + markChanged('this', column);
	  return `
function ${className}(store, offset) {
  this.store = store;
  this.offset = offset;
  // The store's current array; Body.moveTo() updates it when the store grows
  this.array = store.${column};
  this.writes = store.writes || null;
}
Object.defineProperties(${className}.prototype, {
${axes.map(k => `  ${getVariableName(k)}: {
    get: function () { return this.array[${at(k)}]; },
    set: function (value) { ${check(getVariableName(k))}this.array[${at(k)}] = value;${mark} },
    enumerable: true
  }`).join(',\n')}
});
${className}.prototype.reset = function () {
  var array = this.array;
  ${axes.map(k => `array[${at(k)}] = 0;`).join(' ')}${mark ? '\n ' + mark : ''}
};
${className}.prototype.toJSON = function () {
  return { ${axes.map(k => `${getVariableName(k)}: this.array[${at(k)}]`).join(', ')} };
};
${className}.prototype[Symbol.for('nodejs.util.inspect.custom')] = ${className}.prototype.toJSON;`;
	}

	function getVectorCode(dimension, debugSetters) {
	  let pattern = createPatternBuilder(dimension);
	  let setters = '';
	  if (debugSetters) {
	    setters = `${pattern("\n\
	   var v{var};\n\
	Object.defineProperty(this, '{var}', {\n\
	  set: function(v) { \n\
	    if (!Number.isFinite(v)) throw new Error('Cannot set non-numbers to {var}');\n\
	    v{var} = v; \n\
	  },\n\
	  get: function() { return v{var}; }\n\
	});")}`;
	  }

	  let variableList = pattern('{var}', {join: ', '});
	  return `function Vector(${variableList}) {
  ${setters}
    if (typeof arguments[0] === 'object') {
      // could be another vector
      let v = arguments[0];
      ${pattern('if (!Number.isFinite(v.{var})) throw new Error("Expected value is not a finite number at Vector constructor ({var})");', {indent: 4})}
      ${pattern('this.{var} = v.{var};', {indent: 4})}
    } else {
      ${pattern('this.{var} = typeof {var} === "number" ? {var} : 0;', {indent: 4})}
    }
  }

  Vector.prototype.reset = function () {
    ${pattern('this.{var} = ', {join: ''})}0;
  };`;
	}
	return generateCreateBody.exports;
}

var generateQuadTree = {exports: {}};

var hasRequiredGenerateQuadTree;

function requireGenerateQuadTree () {
	if (hasRequiredGenerateQuadTree) return generateQuadTree.exports;
	hasRequiredGenerateQuadTree = 1;
	const createPatternBuilder = requireCreatePatternBuilder();
	const getVariableName = requireGetVariableName();

	generateQuadTree.exports = generateQuadTreeFunction;
	generateQuadTree.exports.generateQuadTreeFunctionBody = generateQuadTreeFunctionBody;

	// These exports are for InlineTransform tool.
	// InlineTransform: getInsertStackCode
	generateQuadTree.exports.getInsertStackCode = getInsertStackCode;
	// InlineTransform: getQuadNodeCode
	generateQuadTree.exports.getQuadNodeCode = getQuadNodeCode;
	// InlineTransform: isSamePosition
	generateQuadTree.exports.isSamePosition = isSamePosition;
	// InlineTransform: getChildBodyCode
	generateQuadTree.exports.getChildBodyCode = getChildBodyCode;
	// InlineTransform: setChildBodyCode
	generateQuadTree.exports.setChildBodyCode = setChildBodyCode;

	/**
	 * `law` is a repulsion law (see repulsionLaw.js). Without one, bodies push as 1/r^2.
	 *
	 * `law` can also be an array of K laws, one per charge. Then every cell keeps K charge sums and
	 * one walk adds all K pushes: `gravity * sum_c charge_c(j) * sensitivity_c(i) * F_c(r)`. The tree
	 * takes the laws as an array, and `insertBodies(store, charges, sensitivities)` takes arrays of
	 * columns (a missing sensitivity is that charge). `options.centroid`, for every charge or as an
	 * array with a rule per charge:
	 *  - 'own' (default): the charge acts from its own centre, so it may not be negative;
	 *  - 'shared': it acts from the first charge's centre, which saves a distance per cell. Such a
	 *    charge may be signed. The first charge must not be negative.
	 * Cells open by their distance to the first charge's centre (or to their middle, when they hold
	 * none of it). One law in an array generates the same code as the law alone.
	 */
	function generateQuadTreeFunction(dimension, law, options) {
	  let code = generateQuadTreeFunctionBody(dimension, law, options);
	  return (new Function(code))();
	}

	function generateQuadTreeFunctionBody(dimension, law, options) {
	  let pattern = createPatternBuilder(dimension);
	  let quadCount = Math.pow(2, dimension);
	  let axes = [];
	  for (let k = 0; k < dimension; ++k) axes.push(k);
	  let each = (template, join) => axes.map(template).join(join === undefined ? '\n' : join);
	  let charges = Array.isArray(law) && law.length > 1 ? createCharges(dimension, law, options) : singleCharge(law);
	  if (charges.count === 1) law = charges.laws[0];
	  let customLaw = law && !law.isDefault;
	  let hasRange = customLaw && law.hasRange;
	  // The push of a body or a cell with `charge`. The 1/r^2 code stays as it always was.
	  let push = (charge, indent) => charges.count > 1 ? charges.push(charge === 'node.mass', indent) : customLaw ?
	    `${law.emit(dimension, 'r', 'k1')}\n${indent}v = gravity * ${charge} * sourceMass * k1;` :
	    `v = gravity * ${charge} * sourceMass / (r * r * r);`;
	  // Skips a cell whose nearest point is out of the law's range
	  let skipCellOutOfRange = indent => charges.count > 1 ? charges.skipCell(indent) : charges.anyRange ? `var boxDistance2 = 0, edge;
${indent}${each(k => `edge = node.min_${getVariableName(k)} - s${getVariableName(k)}; if (edge > 0) boxDistance2 += edge * edge; else { edge = s${getVariableName(k)} - node.max_${getVariableName(k)}; if (edge > 0) boxDistance2 += edge * edge; }`, '\n' + indent)}
${indent}if (boxDistance2 > lawRange2) continue;
${indent}` : '';

	  let code = `
${getInsertStackCode()}
${getQuadNodeCode(dimension, charges)}
${isSamePosition(dimension)}
${getChildBodyCode(dimension)}
${setChildBodyCode(dimension)}

/**
 * Barnes-Hut tree over a body store (see createBodyStore.js). Bodies are body indexes.
 */
function createQuadTree(options, random, law) {
  options = options || {};
${charges.count > 1 ? charges.lawValues() : `  // Values of the law's parameters, refreshed by the simulator every step:
  var lawValues = law ? law.values : null;
  var lawFunctions = law ? law.functions : null;`}
  options.gravity = typeof options.gravity === 'number' ? options.gravity : -1;
  options.theta = typeof options.theta === 'number' ? options.theta : 0.8;

  var gravity = options.gravity;
  var updateQueue = [];
  var insertStack = new InsertStack();
  var theta = options.theta;

  var nodesCache = [];
  var currentInCache = 0;
  var root = newNode();

  // Arrays of the store from the last insertBodies() call (\`sensitivity\`: how strongly
  // bodies feel the push):
  var pos, mass, sensitivity, force${charges.columns()};

  return {
    insertBodies: insertBodies,

    /**
     * Gets root node if it is present
     */
    getRoot: function() {
      return root;
    },

    updateBodyForce: update,

    options: function(newOptions) {
      if (newOptions) {
        if (typeof newOptions.gravity === 'number') {
          gravity = newOptions.gravity;
        }
        if (typeof newOptions.theta === 'number') {
          theta = newOptions.theta;
        }

        return this;
      }

      return {
        gravity: gravity,
        theta: theta
      };
    }
  };

  function newNode() {
    // To avoid pressure on GC we reuse nodes.
    var node = nodesCache[currentInCache];
    if (node) {
${assignQuads('      node.')}
      node.body = -1;
      node.mass = ${pattern('node.mass_{var} = ', {join: ''})}${charges.resetNode()}0;
      ${pattern('node.min_{var} = node.max_{var} = ', {join: ''})}0;
    } else {
      node = new QuadNode();
      nodesCache[currentInCache] = node;
    }

    ++currentInCache;
    return node;
  }

  function update(sourceBody) {
    var queue = updateQueue;
    var v;
    ${pattern('var d{var};', {indent: 4})}
    var r; 
    ${pattern('var f{var} = 0;', {indent: 4})}
    var queueLength = 1;
    var shiftIdx = 0;
    var pushIdx = 1;
    var sourceOffset = sourceBody * ${dimension};
    ${each(k => `var s${getVariableName(k)} = pos[sourceOffset${k ? ' + ' + k : ''}];`, '\n    ')}
    var sourceMass = sensitivity[sourceBody];${charges.sources('    ')}
    ${charges.count > 1 ? charges.prologue('    ') : customLaw ? 'var k1; ' + law.prologue('lawValues') : ''}

    queue[0] = root;

    while (queueLength) {
      var node = queue[shiftIdx];
      var body = node.body;

      queueLength -= 1;
      shiftIdx += 1;
      var differentBody = (body !== sourceBody);
      if (body >= 0 && differentBody) {
        // If the current node is a leaf node (and it is not source body),
        // calculate the force exerted by the current node on body, and add this
        // amount to body's net force.
        var bodyOffset = body * ${dimension};
        ${each(k => `d${getVariableName(k)} = pos[bodyOffset${k ? ' + ' + k : ''}] - s${getVariableName(k)};`, '\n        ')}
        r = Math.sqrt(${pattern('d{var} * d{var}', {join: ' + '})});

        if (r === 0) {
          // Poor man's protection against zero distance.
          ${pattern('d{var} = (random.nextDouble() - 0.5) / 50;', {indent: 10})}
          r = Math.sqrt(${pattern('d{var} * d{var}', {join: ' + '})});
        }

        ${hasRange && charges.count === 1 ? 'if (r > lawRange) continue;' : ''}
        // This is standard gravitation force calculation but we divide
        // by r^3 to save two operations when normalizing force vector.
        ${push('mass[body]', '        ')}
        ${pattern('f{var} += v * d{var};', {indent: 8})}
      } else if (differentBody) {
        // Otherwise, calculate the ratio s / r,  where s is the width of the region
        // represented by the internal node, and r is the distance between the body
        // and the node's center-of-mass
        ${skipCellOutOfRange('        ')}${charges.count > 1 ? charges.openCell('        ') : `${pattern('d{var} = node.mass_{var} / node.mass - s{var};', {indent: 8})}
        r = Math.sqrt(${pattern('d{var} * d{var}', {join: ' + '})});

        if (r === 0) {
          // Sorry about code duplication. I don't want to create many functions
          // right away. Just want to see performance first.
          ${pattern('d{var} = (random.nextDouble() - 0.5) / 50;', {indent: 10})}
          r = Math.sqrt(${pattern('d{var} * d{var}', {join: ' + '})});
        }
        // If s / r < θ, treat this internal node as a single body, and calculate the
        // force it exerts on sourceBody, and add this amount to sourceBody's net force.
        if ((node.max_${getVariableName(0)} - node.min_${getVariableName(0)}) / r < theta) {`}
          // in the if statement above we consider node's width only
          // because the region was made into square during tree creation.
          // Thus there is no difference between using width or height.
          ${push('node.mass', '          ')}
          ${pattern('f{var} += v * d{var};', {indent: 10})}
        } else {
          // Otherwise, run the procedure recursively on each of the current node's children.

          // I intentionally unfolded this loop, to save several CPU cycles.
${runRecursiveOnChildren()}
        }
      }
    }

    ${each(k => `force[sourceOffset${k ? ' + ' + k : ''}] += f${getVariableName(k)};`, '\n    ')}
  }

${charges.count > 1 ? charges.insertBodies() : `  // \`charge\` is the column of charges (masses by default), \`bodySensitivity\` how strongly
  // bodies feel the push (the charges by default). Bodies without charge push nobody, so they
  // are left out of the tree.
  function insertBodies(store, charge, bodySensitivity) {
    pos = store.pos;
    mass = charge || store.mass;
    sensitivity = bodySensitivity || mass;`}
    force = store.force;
    ${pattern('var {var}min = Number.MAX_VALUE;', {indent: 4})}
    ${pattern('var {var}max = -Number.MAX_VALUE;', {indent: 4})}
    var i = store.n;

    // To reduce quad tree depth we are looking for exact bounding box of all particles.
    while (i--) {
      if (${charges.noCharge('i')}) continue;
      var offset = i * ${dimension};
      ${each(k => `var ${getVariableName(k)} = pos[offset${k ? ' + ' + k : ''}];`, '\n      ')}
      ${pattern('if ({var} < {var}min) {var}min = {var};', {indent: 6})}
      ${pattern('if ({var} > {var}max) {var}max = {var};', {indent: 6})}
    }

    // Makes the bounds square.
    var maxSideLength = -Infinity;
    ${pattern('if ({var}max - {var}min > maxSideLength) maxSideLength = {var}max - {var}min ;', {indent: 4})}

    currentInCache = 0;
    root = newNode();
    ${pattern('root.min_{var} = {var}min;', {indent: 4})}
    ${pattern('root.max_{var} = {var}min + maxSideLength;', {indent: 4})}

    i = store.n;
    var rootTaken = false;
    while (i--) {
      if (${charges.noCharge('i')}) continue;
      if (rootTaken) {
        insert(i, root);
      } else {
        root.body = i;
        rootTaken = true;
      }
    }${charges.centres('    ')}
  }

  function insert(newBody) {
    insertStack.reset();
    insertStack.push(root, newBody);

    while (!insertStack.isEmpty()) {
      var stackItem = insertStack.pop();
      var node = stackItem.node;
      var body = stackItem.body;

      if (node.body < 0) {
        // This is internal node. Update the total mass of the node and center-of-mass.
        var bodyOffset = body * ${dimension};
        ${each(k => `var ${getVariableName(k)} = pos[bodyOffset${k ? ' + ' + k : ''}];`, '\n        ')}
        var bodyMass = mass[body];
        node.mass += bodyMass;
        ${pattern('node.mass_{var} += bodyMass * {var};', {indent: 8})}${charges.addToNode('        ')}

        // Recursively insert the body in the appropriate quadrant.
        // But first find the appropriate quadrant.
        var quadIdx = 0; // Assume we are in the 0's quad.
        ${pattern('var min_{var} = node.min_{var};', {indent: 8})}
        ${pattern('var max_{var} = (min_{var} + node.max_{var}) / 2;', {indent: 8})}

${assignInsertionQuadIndex(8)}

        var child = getChild(node, quadIdx);

        if (!child) {
          // The node is internal but this quadrant is not taken. Add
          // subnode to it.
          child = newNode();
          ${pattern('child.min_{var} = min_{var};', {indent: 10})}
          ${pattern('child.max_{var} = max_{var};', {indent: 10})}
          child.body = body;

          setChild(node, quadIdx, child);
        } else {
          // continue searching in this quadrant.
          insertStack.push(child, body);
        }
      } else {
        // We are trying to add to the leaf node.
        // We have to convert current leaf into internal node
        // and continue adding two nodes.
        var oldBody = node.body;
        node.body = -1; // internal nodes do not cary bodies

        if (isSamePosition(pos, oldBody, body)) {
          // Prevent infinite subdivision by bumping one node
          // anywhere in this quadrant
          var retriesCount = 3;
          do {
            var offset = random.nextDouble();
            ${pattern('var d{var} = (node.max_{var} - node.min_{var}) * offset;', {indent: 12})}

            ${each(k => `pos[oldBody * ${dimension}${k ? ' + ' + k : ''}] = node.min_${getVariableName(k)} + d${getVariableName(k)};`, '\n            ')}
            retriesCount -= 1;
            // Make sure we don't bump it out of the box. If we do, next iteration should fix it
          } while (retriesCount > 0 && isSamePosition(pos, oldBody, body));

          if (retriesCount === 0 && isSamePosition(pos, oldBody, body)) {
            // This is very bad, we ran out of precision.
            // if we do not return from the method we'll get into
            // infinite loop here. So we sacrifice correctness of layout, and keep the app running
            // Next layout iteration should get larger bounding box in the first step and fix this
            return;
          }
        }
        // Next iteration should subdivide node further.
        insertStack.push(node, oldBody);
        insertStack.push(node, body);
      }
    }
  }
}
return createQuadTree;

`;
	  return code;


	  function assignInsertionQuadIndex(indentCount) {
	    let insertionCode = [];
	    let indent = Array(indentCount + 1).join(' ');
	    for (let i = 0; i < dimension; ++i) {
	      insertionCode.push(indent + `if (${getVariableName(i)} > max_${getVariableName(i)}) {`);
	      insertionCode.push(indent + `  quadIdx = quadIdx + ${Math.pow(2, i)};`);
	      insertionCode.push(indent + `  min_${getVariableName(i)} = max_${getVariableName(i)};`);
	      insertionCode.push(indent + `  max_${getVariableName(i)} = node.max_${getVariableName(i)};`);
	      insertionCode.push(indent + `}`);
	    }
	    return insertionCode.join('\n');
	    // if (x > max_x) { // somewhere in the eastern part.
	    //   quadIdx = quadIdx + 1;
	    //   left = right;
	    //   right = node.right;
	    // }
	  }

	  function runRecursiveOnChildren() {
	    let indent = Array(11).join(' ');
	    let recursiveCode = [];
	    for (let i = 0; i < quadCount; ++i) {
	      recursiveCode.push(indent + `if (node.quad${i}) {`);
	      recursiveCode.push(indent + `  queue[pushIdx] = node.quad${i};`);
	      recursiveCode.push(indent + `  queueLength += 1;`);
	      recursiveCode.push(indent + `  pushIdx += 1;`);
	      recursiveCode.push(indent + `}`);
	    }
	    return recursiveCode.join('\n');
	    // if (node.quad0) {
	    //   queue[pushIdx] = node.quad0;
	    //   queueLength += 1;
	    //   pushIdx += 1;
	    // }
	  }

	  function assignQuads(indent) {
	    // this.quad0 = null;
	    // this.quad1 = null;
	    // this.quad2 = null;
	    // this.quad3 = null;
	    let quads = [];
	    for (let i = 0; i < quadCount; ++i) {
	      quads.push(`${indent}quad${i} = null;`);
	    }
	    return quads.join('\n');
	  }
	}

	/**
	 * The charges of a tree with one charge: what createCharges gives for one law, without loading
	 * and compiling its code (most layouts make only this tree)
	 */
	function singleCharge(law) {
	  let laws = Array.isArray(law) ? law : [law];
	  let none = () => '';
	  return {
	    count: 1,
	    laws: laws,
	    anyRange: !!laws[0] && !laws[0].isDefault && !!laws[0].hasRange,
	    columns: none,
	    resetNode: none,
	    nodeFields: none,
	    sources: none,
	    centres: none,
	    addToNode: none,
	    noCharge: i => `mass[${i}] === 0`
	  };
	}

	/**
	 * Code for the charges of a tree: one law per charge (see generateQuadTreeFunction). With one
	 * charge every piece is empty, and the tree is today's. Charge 0 keeps the names of the single
	 * charge tree (`mass`, `sensitivity`, `node.mass`, `k1`, `lawRange`); charge c is `charge<c>`,
	 * `sensitivity<c>`, `node.charge<c>`, `k1c<c>`, `law<c>Range`.
	 */
	function createCharges(dimension, law, options) {
	  let pattern = createPatternBuilder(dimension);
	  let laws = Array.isArray(law) ? law : [law];
	  let count = laws.length;
	  // The centre rule, for all charges or per charge (charge 0's own centre is the cell's)
	  let centroid = options && options.centroid;
	  (Array.isArray(centroid) ? centroid : [centroid]).forEach(rule => {
	    if (count > 1 && rule !== undefined && rule !== 'own' && rule !== 'shared') {
	      throw new Error('Unknown centroid: ' + rule + '. Expected `own` or `shared`');
	    }
	  });
	  let shared = c => c > 0 && (Array.isArray(centroid) ? centroid[c] : centroid) === 'shared';
	  let custom = c => !!laws[c] && !laws[c].isDefault;
	  let ranged = c => custom(c) && laws[c].hasRange;
	  let others = [];
	  for (let c = 1; c < count; ++c) others.push(c);
	  let all = [0].concat(others);
	  let own = others.filter(c => !shared(c));

	  // Charges whose laws are the same code with the same numbers share one evaluation of the law
	  let groups = [];
	  all.forEach(c => {
	    let group = groups.find(g => custom(c) ? g.law === laws[c] : !g.custom);
	    if (!group) groups.push(group = { law: laws[c], custom: custom(c), first: c, charges: [] });
	    group.charges.push(c);
	  });

	  let column = c => c ? 'charge' + c : 'mass';
	  let source = c => c ? 'sourceMass' + c : 'sourceMass';
	  let nodeCharge = c => c ? 'node.charge' + c : 'node.mass';
	  let k = c => c ? 'k1c' + c : 'k1';
	  // A law's local names (law_L, lawH0, lawRange, lawValues...) for charge c. Charges with one law
	  // read its numbers under the name of the first of them.
	  let first = c => groups.find(g => g.charges.indexOf(c) >= 0).first;
	  let names = (code, c) => first(c) ? code.replace(/\blaw(?=_|H\d|Range|Values|Functions)/g, 'law' + first(c)) : code;

	  return {
	    count: count,
	    laws: laws,
	    anyRange: all.some(ranged),

	    lawValues: function () {
	      let lines = groups.filter(g => g.custom).map(g =>
	        names(`  var lawValues = law[${g.first}].values, lawFunctions = law[${g.first}].functions;`, g.first));
	      if (lines.length) lines.unshift('  // Values of the laws\' parameters (a law per charge), refreshed by the simulator every step:');
	      return lines.join('\n');
	    },

	    columns: () => others.map(c => `, ${column(c)}, sensitivity${c}`).join(''),

	    resetNode: () => others.map(c => shared(c) ? `${nodeCharge(c)} = ` :
	      `${nodeCharge(c)} = ` + pattern(`${nodeCharge(c)}_{var} = `, {join: ''})).join(''),

	    nodeFields: function (indent) {
	      if (count === 1) return '';
	      let centres = !own.length ? '' : own.length === others.length ? ', and their centres as for the first one' :
	        ', and the centres of those with their own';
	      return `\n\n${indent}// Sums of the other charges${centres}\n${indent}` +
	        others.map(c => `this.charge${c} = 0;` + (shared(c) ? '' : `\n${indent}` + pattern(`this.charge${c}_{var} = 0;`, {indent: indent.length}))).join(`\n${indent}`);
	    },

	    sources: function (indent) {
	      let lines = others.map(c => `var ${source(c)} = sensitivity${c}[sourceBody];`);
	      if (count > 1) lines.push('var theta2 = theta * theta, r2, w;');
	      if (own.length) lines.push(pattern('var e{var};', {indent: indent.length}), 'var er;');
	      return lines.map(line => '\n' + indent + line).join('');
	    },

	    prologue: indent => groups.filter(g => g.custom)
	      .map(g => `var weight${g.first}, ${g.charges.map(k).join(', ')}; ` + names(g.law.prologue('lawValues'), g.first)).join('\n' + indent),

	    noCharge: i => all.map(c => `${column(c)}[${i}] === 0`).join(' && '),

	    addToNode: indent => others.map(c => '\n' + indent + (shared(c) ? `${nodeCharge(c)} += ${column(c)}[body];` :
	      `var bodyCharge${c} = ${column(c)}[body];\n${indent}${nodeCharge(c)} += bodyCharge${c};\n${indent}` +
	      pattern(`${nodeCharge(c)}_{var} += bodyCharge${c} * {var};`, {indent: indent.length}))).join(''),

	    insertBodies: () => (all.some(ranged) ? `  // Squared distance from a point to the nearest point of a cell
  function boxDistance(node, ${pattern('s{var}', {join: ', '})}) {
    var boxDistance2 = 0, edge;
    ${pattern('edge = node.min_{var} - s{var}; if (edge > 0) boxDistance2 += edge * edge; else { edge = s{var} - node.max_{var}; if (edge > 0) boxDistance2 += edge * edge; }', {indent: 4})}
    return boxDistance2;
  }

` : '') + `  // \`charges\` are the K columns of charges, \`sensitivities\` how strongly bodies feel each
  // of them (that charge when missing). Bodies without any charge push nobody, so they are left
  // out of the tree.
  function insertBodies(store, charges, sensitivities) {
    pos = store.pos;
    sensitivities = sensitivities || [];
    mass = charges[0];
    sensitivity = sensitivities[0] || mass;
${others.map(c => `    ${column(c)} = charges[${c}];\n    sensitivity${c} = sensitivities[${c}] || ${column(c)};`).join('\n')}`,

	    // A cell is skipped when no charge can push from it: out of every law's range, and no charge
	    // without range that the body feels and the cell has. With shared centres charges after the
	    // first may be signed: a cell sum of 0 then says nothing about the cell's children. The box
	    // distance is measured only when it can decide something (see inRange).
	    skipCell: function (indent) {
	      if (!all.some(ranged)) return '';
	      let near = all.filter(ranged).map(c => `boxDistance2 <= ${names('lawRange2', c)}`)
	        .filter((test, at, list) => list.indexOf(test) === at).join(' || ');
	      let unranged = all.filter(c => !ranged(c)).map(c => `${source(c)} !== 0` + (shared(c) ? '' : ` && ${nodeCharge(c)} !== 0`));
	      if (!unranged.length) return `var boxDistance2 = boxDistance(node, ${pattern('s{var}', {join: ', '})});
${indent}if (!(${near})) continue;
${indent}`;
	      return `var boxDistance2 = -1;
${indent}if (!(${unranged.join(' || ')})) {
${indent}  boxDistance2 = boxDistance(node, ${pattern('s{var}', {join: ', '})});
${indent}  if (!(${near})) continue;
${indent}}
${indent}`;
	    },

	    // Cells hold centres here (see centres), and the opening test is squared, so cells that
	    // open need no square root
	    openCell: indent => `${pattern('d{var} = node.mass_{var} - s{var};', {indent: indent.length})}
${indent}r2 = ${pattern('d{var} * d{var}', {join: ' + '})};

${indent}if (r2 === 0) {
${indent}  // Poor man's protection against zero distance.
${indent}  ${pattern('d{var} = (random.nextDouble() - 0.5) / 50;', {indent: indent.length + 2})}
${indent}  r2 = ${pattern('d{var} * d{var}', {join: ' + '})};
${indent}}
${indent}// If s / r < θ, treat this internal node as a single body, and calculate the
${indent}// force it exerts on sourceBody, and add this amount to sourceBody's net force.
${indent}w = node.max_${getVariableName(0)} - node.min_${getVariableName(0)};
${indent}if (w * w < theta2 * r2) {
${indent}  r = Math.sqrt(r2);`,

	    // Cells sum charges while bodies go in. Walks visit a cell many times, so its sums turn into
	    // centres once, here
	    centres: indent => count === 1 ? '' : `
${indent}for (i = 0; i < currentInCache; ++i) {
${indent}  var cell = nodesCache[i];
${indent}  if (cell.body >= 0) continue;
${indent}  if (cell.mass !== 0) {
${indent}    ${pattern('cell.mass_{var} /= cell.mass;', {indent: indent.length + 4})}
${indent}  } else {
${indent}    // None of the first charge here: the cell's middle stands in for its centre
${indent}    ${pattern('cell.mass_{var} = (cell.min_{var} + cell.max_{var}) / 2;', {indent: indent.length + 4})}
${indent}  }${own.map(c => `
${indent}  if (cell.charge${c} !== 0) {
${indent}    ${pattern(`cell.charge${c}_{var} /= cell.charge${c};`, {indent: indent.length + 4})}
${indent}  }`).join('')}
${indent}}`,

	    // Sets v to the push of a body (at distance r) or a cell, gravity included. In a cell, charges
	    // with their own centres push from them first, straight into f.
	    push: function (isCell, indent) {
	      if (!isCell) return sumPush(groups, c => `${column(c)}[body]`, c => `r <= ${names('lawRange', c)}`).join('\n' + indent);
	      let lines = [];
	      own.forEach(c => { lines = lines.concat(ownCellPush(c)); });
	      let fromCenter = groups.map(g => ({ law: g.law, custom: g.custom, first: g.first, charges: g.charges.filter(c => c === 0 || shared(c)) }))
	        .filter(g => g.charges.length);
	      return lines.concat(sumPush(fromCenter, nodeCharge, cellInRange)).join('\n' + indent);
	    }
	  };

	  // Out of the skip test the box distance may be unmeasured (-1)
	  function cellInRange(c) {
	    let lazy = all.some(a => !ranged(a));
	    return (lazy ? `(boxDistance2 < 0 ? (boxDistance2 = boxDistance(node, ${pattern('s{var}', {join: ', '})})) : boxDistance2)` : 'boxDistance2') +
	      ` <= ${names('lawRange2', c)}`;
	  }

	  // The law of charge c sets k<c>
	  function lawCode(c, r) {
	    return names(laws[c].emit(dimension, r, k(c)), c);
	  }

	  // v = gravity * sum over charges of charge * sensitivity * F(r) / r, a law at a time
	  function sumPush(list, charge, inRange) {
	    let sum = g => g.charges.map(c => `${charge(c)} * ${source(c)}`).join(' + ');
	    let stock = list.filter(g => !g.custom);
	    let lawGroups = list.filter(g => g.custom);
	    if (lawGroups.length === 0) return [`v = gravity * (${sum(stock[0])}) / (r * r * r);`];
	    let lines = [stock.length ? `v = (${sum(stock[0])}) / (r * r * r);` : 'v = 0;'];
	    lawGroups.forEach(g => {
	      // The law is skipped where its charges weigh nothing (the push is weight * law, so this is
	      // exact) and out of its range
	      let weight = 'weight' + g.first;
	      let test = [`${weight} !== 0`];
	      if (ranged(g.first)) test.push(inRange(g.first));
	      lines.push(`${weight} = ${sum(g)};`, `if (${test.join(' && ')}) {`, '  ' + lawCode(g.first, 'r'), `  v += ${weight} * ${k(g.first)};`, '}');
	    });
	    lines.push('v *= gravity;');
	    return lines;
	  }

	  // The push of charge c from its own centre in the cell
	  function ownCellPush(c) {
	    let test = [`${source(c)} !== 0`, `${nodeCharge(c)} !== 0`];
	    if (ranged(c)) test.push(cellInRange(c));
	    let lines = [`if (${test.join(' && ')}) {`];
	    // Often the same point as the cell's centre (a cell of bodies that all carry both charges in
	    // proportion): then the distance is known
	    lines.push(`  if (${pattern(`${nodeCharge(c)}_{var} === node.mass_{var}`, {join: ' && '})}) {`);
	    lines.push(`    ${pattern('e{var} = d{var}; ', {join: ''})}er = r;`);
	    lines.push('  } else {');
	    for (let a = 0; a < dimension; ++a) {
	      let x = getVariableName(a);
	      lines.push(`    e${x} = ${nodeCharge(c)}_${x} - s${x};`);
	    }
	    lines.push(`    er = Math.sqrt(${pattern('e{var} * e{var}', {join: ' + '})});`);
	    lines.push(`    // On the source: push along the cell's centre instead`);
	    lines.push(`    if (er === 0) { ${pattern('e{var} = d{var}; ', {join: ''})}er = r; }`);
	    lines.push('  }');
	    if (custom(c)) lines.push('  ' + lawCode(c, 'er'), `  v = gravity * ${nodeCharge(c)} * ${source(c)} * ${k(c)};`);
	    else lines.push(`  v = gravity * ${nodeCharge(c)} * ${source(c)} / (er * er * er);`);
	    lines.push(`  ${pattern('f{var} += v * e{var};', {join: ' '})}`);
	    lines.push('}');
	    return lines;
	  }
	}

	function isSamePosition(dimension) {
	  let pattern = createPatternBuilder(dimension);
	  let axes = [];
	  for (let k = 0; k < dimension; ++k) axes.push(k);
	  return `
  function isSamePosition(pos, body1, body2) {
    var offset1 = body1 * ${dimension}, offset2 = body2 * ${dimension};
    ${axes.map(k => `var d${getVariableName(k)} = Math.abs(pos[offset1${k ? ' + ' + k : ''}] - pos[offset2${k ? ' + ' + k : ''}]);`).join('\n    ')}
  
    return ${pattern('d{var} < 1e-8', {join: ' && '})};
  }  
`;
	}

	function setChildBodyCode(dimension) {
	  var quadCount = Math.pow(2, dimension);
	  return `
function setChild(node, idx, child) {
  ${setChildBody()}
}`;
	  function setChildBody() {
	    let childBody = [];
	    for (let i = 0; i < quadCount; ++i) {
	      let prefix = (i === 0) ? '  ' : '  else ';
	      childBody.push(`${prefix}if (idx === ${i}) node.quad${i} = child;`);
	    }

	    return childBody.join('\n');
	    // if (idx === 0) node.quad0 = child;
	    // else if (idx === 1) node.quad1 = child;
	    // else if (idx === 2) node.quad2 = child;
	    // else if (idx === 3) node.quad3 = child;
	  }
	}

	function getChildBodyCode(dimension) {
	  return `function getChild(node, idx) {
${getChildBody()}
  return null;
}`;

	  function getChildBody() {
	    let childBody = [];
	    let quadCount = Math.pow(2, dimension);
	    for (let i = 0; i < quadCount; ++i) {
	      childBody.push(`  if (idx === ${i}) return node.quad${i};`);
	    }

	    return childBody.join('\n');
	    // if (idx === 0) return node.quad0;
	    // if (idx === 1) return node.quad1;
	    // if (idx === 2) return node.quad2;
	    // if (idx === 3) return node.quad3;
	  }
	}

	function getQuadNodeCode(dimension, charges) {
	  let pattern = createPatternBuilder(dimension);
	  let quadCount = Math.pow(2, dimension);
	  var quadNodeCode = `
function QuadNode() {
  // index of the body stored inside this node, or -1. In quad tree only leaf nodes
  // (by construction) contain bodies:
  this.body = -1;

  // Child nodes are stored in quads. Each quad is presented by number:
  // 0 | 1
  // -----
  // 2 | 3
${assignQuads('  this.')}

  // Total mass of current node
  this.mass = 0;

  // Center of mass coordinates
  ${pattern('this.mass_{var} = 0;', {indent: 2})}${charges ? charges.nodeFields('  ') : ''}

  // bounding box coordinates
  ${pattern('this.min_{var} = 0;', {indent: 2})}
  ${pattern('this.max_{var} = 0;', {indent: 2})}
}
`;
	  return quadNodeCode;

	  function assignQuads(indent) {
	    // this.quad0 = null;
	    // this.quad1 = null;
	    // this.quad2 = null;
	    // this.quad3 = null;
	    let quads = [];
	    for (let i = 0; i < quadCount; ++i) {
	      quads.push(`${indent}quad${i} = null;`);
	    }
	    return quads.join('\n');
	  }
	}

	function getInsertStackCode() {
	  return `
/**
 * Our implementation of QuadTree is non-recursive to avoid GC hit
 * This data structure represent stack of elements
 * which we are trying to insert into quad tree.
 */
function InsertStack () {
    this.stack = [];
    this.popIdx = 0;
}

InsertStack.prototype = {
    isEmpty: function() {
        return this.popIdx === 0;
    },
    push: function (node, body) {
        var item = this.stack[this.popIdx];
        if (!item) {
            // we are trying to avoid memory pressure: create new element
            // only when absolutely necessary
            this.stack[this.popIdx] = new InsertStackElement(node, body);
        } else {
            item.node = node;
            item.body = body;
        }
        ++this.popIdx;
    },
    pop: function () {
        if (this.popIdx > 0) {
            return this.stack[--this.popIdx];
        }
    },
    reset: function () {
        this.popIdx = 0;
    }
};

function InsertStackElement(node, body) {
    this.node = node; // QuadTree node
    this.body = body; // index of the body which needs to be inserted to node
}
`;
	}
	return generateQuadTree.exports;
}

var generateBounds = {exports: {}};

var hasRequiredGenerateBounds;

function requireGenerateBounds () {
	if (hasRequiredGenerateBounds) return generateBounds.exports;
	hasRequiredGenerateBounds = 1;
	generateBounds.exports = generateBoundsFunction;
	generateBounds.exports.generateFunctionBody = generateBoundsFunctionBody;

	const createPatternBuilder = requireCreatePatternBuilder();

	function generateBoundsFunction(dimension) {
	  let code = generateBoundsFunctionBody(dimension);
	  return new Function('store', 'settings', 'random', code);
	}

	function generateBoundsFunctionBody(dimension) {
	  let pattern = createPatternBuilder(dimension);

	  let code = `
  var boundingBox = {
    ${pattern('min_{var}: 0, max_{var}: 0,', {indent: 4})}
  };

  return {
    box: boundingBox,

    update: updateBoundingBox,

    reset: resetBoundingBox,

    getBestNewPosition: function (neighbors) {
      var ${pattern('base_{var} = 0', {join: ', '})};

      if (neighbors.length) {
        var pos = store.pos;
        for (var i = 0; i < neighbors.length; ++i) {
          var offset = neighbors[i].index * ${dimension};
          ${pattern('base_{var} += pos[offset{+k}];', {indent: 10})}
        }

        ${pattern('base_{var} /= neighbors.length;', {indent: 8})}
      } else {
        ${pattern('base_{var} = (boundingBox.min_{var} + boundingBox.max_{var}) / 2;', {indent: 8})}
      }

      var springLength = settings.springLength;
      return {
        ${pattern('{var}: base_{var} + (random.nextDouble() - 0.5) * springLength,', {indent: 8})}
      };
    }
  };

  function updateBoundingBox() {
    var i = store.n;
    if (i === 0) return; // No bodies - no borders.
    var pos = store.pos;

    ${pattern('var max_{var} = -Infinity;', {indent: 4})}
    ${pattern('var min_{var} = Infinity;', {indent: 4})}

    while(i--) {
      // this is O(n), it could be done faster with quadtree, if we check the root node bounds
      var offset = i * ${dimension};
      ${pattern('var {var} = pos[offset{+k}];', {indent: 6})}
      ${pattern('if ({var} < min_{var}) min_{var} = {var};', {indent: 6})}
      ${pattern('if ({var} > max_{var}) max_{var} = {var};', {indent: 6})}
    }

    ${pattern('boundingBox.min_{var} = min_{var};', {indent: 4})}
    ${pattern('boundingBox.max_{var} = max_{var};', {indent: 4})}
  }

  function resetBoundingBox() {
    ${pattern('boundingBox.min_{var} = boundingBox.max_{var} = 0;', {indent: 4})}
  }
`;
	  return code;
	}
	return generateBounds.exports;
}

var generateCreateDragForce = {exports: {}};

var hasRequiredGenerateCreateDragForce;

function requireGenerateCreateDragForce () {
	if (hasRequiredGenerateCreateDragForce) return generateCreateDragForce.exports;
	hasRequiredGenerateCreateDragForce = 1;
	const createPatternBuilder = requireCreatePatternBuilder();

	generateCreateDragForce.exports = generateCreateDragForceFunction;
	generateCreateDragForce.exports.generateCreateDragForceFunctionBody = generateCreateDragForceFunctionBody;

	function generateCreateDragForceFunction(dimension) {
	  let code = generateCreateDragForceFunctionBody(dimension);
	  return new Function('options', code);
	}

	function generateCreateDragForceFunctionBody(dimension) {
	  let pattern = createPatternBuilder(dimension);
	  let code = `
  if (!Number.isFinite(options.dragCoefficient)) throw new Error('dragCoefficient is not a finite number');

  return {
    /**
     * Slows down every body of the store that is not pinned.
     */
    update: function(store) {
      var force = store.force, velocity = store.velocity, pinned = store.pinned;
      var dragCoefficient = options.dragCoefficient;
      for (var i = 0, n = store.n; i < n; ++i) {
        if (pinned[i]) continue;
        var offset = i * ${dimension};
        ${pattern('force[offset{+k}] -= dragCoefficient * velocity[offset{+k}];', {indent: 8})}
      }
    }
  };
`;
	  return code;
	}
	return generateCreateDragForce.exports;
}

var generateCreateSpringForce = {exports: {}};

var hasRequiredGenerateCreateSpringForce;

function requireGenerateCreateSpringForce () {
	if (hasRequiredGenerateCreateSpringForce) return generateCreateSpringForce.exports;
	hasRequiredGenerateCreateSpringForce = 1;
	const createPatternBuilder = requireCreatePatternBuilder();

	generateCreateSpringForce.exports = generateCreateSpringForceFunction;
	generateCreateSpringForce.exports.generateCreateSpringForceFunctionBody = generateCreateSpringForceFunctionBody;

	function generateCreateSpringForceFunction(dimension) {
	  let code = generateCreateSpringForceFunctionBody(dimension);
	  return new Function('options', 'random', code);
	}

	function generateCreateSpringForceFunctionBody(dimension) {
	  let pattern = createPatternBuilder(dimension);
	  let applyForce = (indent, withStats) => `var d = r - length;
${indent}var coefficient = ((springCoefficient[i] > 0) ? springCoefficient[i] : options.springCoefficient) * d / r;

${indent}${pattern('force[offset1{+k}] += coefficient * d{var};', {indent: indent.length})}
${indent}${pattern('force[offset2{+k}] -= coefficient * d{var};', {indent: indent.length})}` + (withStats ? `
${indent}springCount[body1] += 1;
${indent}springLength[body1] += r;
${indent}springCount[body2] += 1;
${indent}springLength[body2] += r;` : '');
	  let readSpring = indent => `var body1 = from[i];
${indent}var body2 = to[i];
${indent}var offset1 = body1 * ${dimension};
${indent}var offset2 = body2 * ${dimension};
${indent}var length = restLength[i] < 0 ? options.springLength : restLength[i];`;
	  let readArrays = indent => `var from = springs.from, to = springs.to, restLength = springs.length, springCoefficient = springs.coefficient;
${indent}var pos = store.pos, force = store.force;
${indent}var springCount = store.springCount, springLength = store.springLength;`;
	  let updateUntilZeroLength = (name, withStats) => `
  function ${name}(springs, store, i) {
    ${readArrays('    ')}
    while (i--) {
      ${readSpring('      ')}
      ${pattern('var d{var} = pos[offset2{+k}] - pos[offset1{+k}];', {indent: 6})}
      var r = Math.sqrt(${pattern('d{var} * d{var}', {join: ' + '})});
      if (r === 0) return i;

      ${applyForce('      ', withStats)}
    }
    return -1;
  }`;

	  let code = `
  if (!Number.isFinite(options.springCoefficient)) throw new Error('Spring coefficient is not a number');
  if (!Number.isFinite(options.springLength)) throw new Error('Spring length is not a number');

  return {
    /**
     * Updates forces of all springs in \`springs\` (a spring store), last spring first.
     * Spring ends are bodies of \`store\`. With \`withStats\` it also counts springs and sums
     * their lengths per body (\`store.springCount\`, \`store.springLength\`), which the adaptive
     * time step needs.
     */
    update: function (springs, store, withStats) {
      var i = springs.n;
      var update = withStats ? updateWithStatsUntilZeroLength : updateUntilZeroLength;
      while ((i = update(springs, store, i)) >= 0) {
        updateZeroLength(springs, store, i, withStats);
      }
    }
  };

  // These update springs i - 1, i - 2, ... 0 and return -1, or stop at the first spring whose
  // ends are at the same point and return its index. The loop has no function calls, which
  // lets it keep the arrays in registers.
${updateUntilZeroLength('updateUntilZeroLength', false)}
${updateUntilZeroLength('updateWithStatsUntilZeroLength', true)}

  // Ends at the same point: push them apart in a random direction.
  function updateZeroLength(springs, store, i, withStats) {
    ${readArrays('    ')}
    ${readSpring('    ')}
    ${pattern('var d{var} = (random.nextDouble() - 0.5) / 50;', {indent: 4})}
    var r = Math.sqrt(${pattern('d{var} * d{var}', {join: ' + '})});

    ${applyForce('    ', false)}
    if (withStats) {
      springCount[body1] += 1;
      springLength[body1] += r;
      springCount[body2] += 1;
      springLength[body2] += r;
    }
  }
`;
	  return code;
	}
	return generateCreateSpringForce.exports;
}

var generateIntegrator = {exports: {}};

var hasRequiredGenerateIntegrator;

function requireGenerateIntegrator () {
	if (hasRequiredGenerateIntegrator) return generateIntegrator.exports;
	hasRequiredGenerateIntegrator = 1;
	const createPatternBuilder = requireCreatePatternBuilder();

	generateIntegrator.exports = generateIntegratorFunction;
	generateIntegrator.exports.generateIntegratorFunctionBody = generateIntegratorFunctionBody;
	generateIntegrator.exports.inertiaColumn = inertiaColumn;

	/**
	 * Moves bodies: v += dt * force / inertia, then pos += dt * v. `inertia` names the body column
	 * forces are divided by (the mass by default).
	 */
	function generateIntegratorFunction(dimension, inertia) {
	  let code = generateIntegratorFunctionBody(dimension, inertia);
	  return new Function('store', 'timeStep', 'adaptiveTimeStepWeight', 'maxVelocity', code);
	}

	function generateIntegratorFunctionBody(dimension, inertia) {
	  let pattern = createPatternBuilder(dimension);
	  let code = `
  var length = store.n;
  if (length === 0) return 0;
  var pos = store.pos, velocity = store.velocity, force = store.force, mass = ${inertiaColumn(inertia)};
  var pinned = store.pinned, springCount = store.springCount, springLength = store.springLength;

  ${pattern('var d{var} = 0, t{var} = 0;', {indent: 2})}
  var maxV = maxVelocity > 0 ? maxVelocity : 1;

  for (var i = 0; i < length; ++i) {
    if (pinned[i]) continue;

    var dt = timeStep;
    if (adaptiveTimeStepWeight && springCount[i]) {
      dt = (adaptiveTimeStepWeight * springLength[i]/springCount[i]);
    }

    var coeff = dt / mass[i];
    var offset = i * ${dimension};

    ${pattern('velocity[offset{+k}] += coeff * force[offset{+k}];', {indent: 4})}
    ${pattern('var v{var} = velocity[offset{+k}];', {indent: 4})}
    var v = Math.sqrt(${pattern('v{var} * v{var}', {join: ' + '})});

    if (v > maxV) {
      // We normalize it so that we move within timeStep range.
      // for the case when v <= maxV - we let velocity to fade out.
      ${pattern('velocity[offset{+k}] = maxV * v{var} / v;', {indent: 6})}
    }

    ${pattern('d{var} = dt * velocity[offset{+k}];', {indent: 4})}

    ${pattern('pos[offset{+k}] += d{var};', {indent: 4})}

    ${pattern('t{var} += Math.abs(d{var});', {indent: 4})}
  }

  return (${pattern('t{var} * t{var}', {join: ' + '})})/length;
`;
	  return code;
	}

	// The default reads the mass as it always did, so its code stays the same
	function inertiaColumn(inertia) {
	  return !inertia || inertia === 'mass' ? 'store.mass' : 'store[' + JSON.stringify(inertia) + ']';
	}
	return generateIntegrator.exports;
}

var generateClearForces = {exports: {}};

var hasRequiredGenerateClearForces;

function requireGenerateClearForces () {
	if (hasRequiredGenerateClearForces) return generateClearForces.exports;
	hasRequiredGenerateClearForces = 1;
	const createPatternBuilder = requireCreatePatternBuilder();

	generateClearForces.exports = generateClearForcesFunction;
	generateClearForces.exports.generateClearForcesFunctionBody = generateClearForcesFunctionBody;

	function generateClearForcesFunction(dimension) {
	  let code = generateClearForcesFunctionBody(dimension);
	  return new Function('store', code);
	}

	/**
	 * Zeroes the force and spring counters of every body that is not pinned.
	 */
	function generateClearForcesFunctionBody(dimension) {
	  let pattern = createPatternBuilder(dimension);
	  return `
  var force = store.force, pinned = store.pinned;
  var springCount = store.springCount, springLength = store.springLength;
  for (var i = 0, n = store.n; i < n; ++i) {
    if (pinned[i]) continue;
    var offset = i * ${dimension};
    ${pattern('force[offset{+k}] = 0;', {join: ' '})}
    springCount[i] = 0;
    springLength[i] = 0;
  }
`;
	}
	return generateClearForces.exports;
}

var createSpringStore_1;
var hasRequiredCreateSpringStore;

function requireCreateSpringStore () {
	if (hasRequiredCreateSpringStore) return createSpringStore_1;
	hasRequiredCreateSpringStore = 1;
	createSpringStore_1 = createSpringStore;

	var initColumnStore = requireInitColumnStore();

	/**
	 * Numbers of springs, in flat typed arrays (see initColumnStore.js). Spring `i` connects bodies
	 * `from[i]` and `to[i]`; `length[i] < 0` and `coefficient[i] <= 0` mean "use the simulator's
	 * setting".
	 */
	function createSpringStore(capacity) {
	  var store = {
	    n: 0,
	    capacity: 0,

	    from: null,
	    to: null,
	    length: null,
	    coefficient: null,

	    add: null, removeRows: null, define: null, has: null, get: null, remove: null,
	    names: null, sizeOf: null, copyTo: null, lockBuiltIns: null, reserve: null, onResize: null,
	    typeOf: null, versionClock: 0, writes: null, columnsVersion: 0, changed: null
	  };
	  initColumnStore(store);

	  store.define('from', Int32Array, 1);
	  store.define('to', Int32Array, 1);
	  store.define('length', Float64Array, 1, -1);
	  store.define('coefficient', Float64Array, 1, -1);
	  store.lockBuiltIns();

	  if (capacity) store.reserve(capacity);
	  return store;
	}
	return createSpringStore_1;
}

var repulsionLaw = {exports: {}};

var parsedLaw = {exports: {}};

var formula = {};

/**
 * The formula language. Ideas describe their physics as small formulas, and the simulator
 * compiles them into its own loops: the repulsion law into the trees (repulsionLaw.js), and
 * formulas over bodies, links and close pairs into stages (formulaStages.js). A formula is plain
 * arithmetic with no loops and no calls into JavaScript, so other engines (such as a GPU one) can
 * compile the same text.
 *
 * A formula is one or more statements separated by `;`:
 *
 *   w = c * (1 / mass_i + 1 / mass_j);   a named value
 *   stiff_i += w;                        adds into a column
 *   push = w * (1 - r / h)               an output of the stage
 *
 * The last statement may be a bare expression instead: the value of a sum or of a law. `//`
 * starts a comment that runs to the end of the line.
 *
 * Expressions know numbers, names, `+ - * / ^` (also `**`), comparisons `< <= > >= == !=`,
 * `&& || !`, `c ? a : b` (also written `select(c, a, b)`; both sides may be computed), and the
 * functions exp, log, sqrt, abs, sign, floor, ceil, round, tanh, sin, cos, min, max, pow,
 * clamp(x, lo, hi), and for vectors dot(a, b), length(a) and axis(k) (the unit vector along axis
 * k, a whole number written in the formula). A comparison is a condition, not a number: write
 * `select(a < b, 1, 0)` to count it.
 *
 * Vectors have D numbers: positions, velocities, forces, and sums of them. They add and subtract,
 * multiply or divide by numbers, and pick with `?:`.
 *
 * Every formula can read `D` (number of dimensions), `pi`, and the values of BUILT_IN_VALUES.
 *
 * The same text compiles to any language through a printer (see JS below): the compiler decides
 * what an expression means, the printer only spells it.
 */

var hasRequiredFormula;

function requireFormula () {
	if (hasRequiredFormula) return formula;
	hasRequiredFormula = 1;
	formula.parse = parse;
	formula.parseProgram = parseProgram;
	formula.children = children;
	formula.compile = compile;
	formula.createTable = createTable;
	formula.numberLiteral = numberLiteral;
	formula.isCondition = isCondition;

	/**
	 * Functions every formula knows. For each:
	 *  - `args`: what each argument is: 'num' a number, 'vec' a vector, 'bool' a condition, 'any' a
	 *    number or a vector, 'const' a number known when the formula is compiled;
	 *  - `result`: 'num', 'vec', or 'arg' (the type of the second argument, for select);
	 *  - `domain`: where it is defined. Arguments outside it give what JS gives on the CPU, and
	 *    other engines may differ there;
	 *  - `derivative(printer, args, value)`: code for the derivative with respect to r, from the
	 *    arguments' codes `{v, d}` (d is null when an argument does not depend on r) and the code of
	 *    the value; null: 0 almost everywhere. Laws need it; select and pow are differentiated by the
	 *    law compiler itself;
	 *  - `js`: the JS function that computes it.
	 * Printers of other languages print every name of this table their own way, or refuse it by
	 * name. `round` and `clamp` are rewritten when parsed (into floor(x + 0.5), so that every engine
	 * rounds halves up, and min(max(x, lo), hi)), so no printer sees them.
	 */
	var BUILTINS = {
	  exp: ofNumber('all', 'Math.exp', function (p, a, v) { return v + ' * ' + a[0].d; }),
	  log: ofNumber('x > 0', 'Math.log', function (p, a) { return a[0].d + ' / ' + a[0].v; }),
	  sqrt: ofNumber('x >= 0', 'Math.sqrt', function (p, a, v) { return a[0].d + ' / (' + p.number(2) + ' * ' + v + ')'; }),
	  abs: ofNumber('all', 'Math.abs', function (p, a) { return p.choose(a[0].v + ' < ' + p.number(0), '-' + a[0].d, a[0].d); }),
	  sign: ofNumber('all', 'Math.sign', null),
	  floor: ofNumber('all', 'Math.floor', null),
	  ceil: ofNumber('all', 'Math.ceil', null),
	  tanh: ofNumber('all', 'Math.tanh', function (p, a, v) { return '(' + p.number(1) + ' - ' + v + ' * ' + v + ') * ' + a[0].d; }),
	  sin: ofNumber('all', 'Math.sin', function (p, a) { return p.call('cos', [a[0].v]) + ' * ' + a[0].d; }),
	  cos: ofNumber('all', 'Math.cos', function (p, a) { return '-' + p.call('sin', [a[0].v]) + ' * ' + a[0].d; }),
	  min: pick('min', ' <= '),
	  max: pick('max', ' >= '),
	  pow: { args: ['num', 'num'], result: 'num', domain: 'x > 0, or y a whole number', derivative: null, js: 'Math.pow' },
	  select: { args: ['bool', 'any', 'any'], result: 'arg', domain: 'all', derivative: null, js: null },
	  dot: { args: ['vec', 'vec'], result: 'num', domain: 'all', derivative: null, js: null },
	  length: { args: ['vec'], result: 'num', domain: 'all', derivative: null, js: null },
	  // the unit vector along axis k (0 is the first axis): constant components, 1 on axis k
	  axis: { args: ['const'], result: 'vec', domain: '0 <= k < D, whole', derivative: null, js: null }
	};

	function ofNumber(domain, js, derivative) {
	  return { args: ['num'], result: 'num', domain: domain, derivative: derivative, js: js };
	}

	// The derivative of min and max is the one of the argument they pick
	function pick(name, picksFirst) {
	  return {
	    args: ['num', 'num'], result: 'num', domain: 'all', js: 'Math.' + name,
	    derivative: function (p, a) {
	      return p.choose(a[0].v + picksFirst + a[1].v, a[0].d === null ? p.number(0) : a[0].d, a[1].d === null ? p.number(0) : a[1].d);
	    }
	  };
	}

	/**
	 * Number of arguments of every function, by name.
	 */
	var FUNCTIONS = {};
	Object.keys(BUILTINS).forEach(function (name) { FUNCTIONS[name] = BUILTINS[name].args.length; });

	/**
	 * Prints JS. A printer spells what the compilers decided; another language gets another object
	 * with the same methods:
	 *  - number(value): a literal;
	 *  - call(name, argumentCodes): a function of BUILTINS (pow included);
	 *  - choose(condition, yes, no): a choice between two values;
	 *  - operator(op): a comparison or && ||, as written in formulas (== != < <= > >= && ||);
	 *  - declare(name, code, kind): a statement that declares a variable. `kind` is 'temp' for
	 *    values the compiler names (never assigned again) and 'local' for named values of the
	 *    formula (assigned again by `+=` and the like);
	 *  - result(name, code): a statement that gives an output variable its value (the law's k1, k2;
	 *    JS declares them before);
	 *  - assign(target, op, code): `target op code` as a statement, op one of = += -= *= /=;
	 *  - local(name): the variable for a named value of the formula, so that user names never
	 *    collide with the language's own words;
	 *  - temp(index): the variable for the compiler's index-th temporary.
	 */
	var JS = {
	  name: 'js',
	  number: numberLiteral,
	  call: function (name, args) { return BUILTINS[name].js + '(' + args.join(', ') + ')'; },
	  choose: function (condition, yes, no) { return '(' + condition + ' ? ' + yes + ' : ' + no + ')'; },
	  operator: function (op) { return op === '==' ? '===' : op === '!=' ? '!==' : op; },
	  declare: function (name, code) { return 'var ' + name + ' = ' + code + ';'; },
	  result: function (name, code) { return name + ' = ' + code + ';'; },
	  assign: function (target, op, code) { return target + ' ' + op + ' ' + code + ';'; },
	  local: function (name) { return '$v_' + name; },
	  temp: function (index) { return '$t' + index; }
	};

	formula.BUILTINS = BUILTINS;
	formula.JS = JS;

	// Where the read-only view of a step context's settings keeps the live settings (the same key as
	// createPhysicsSimulator.js's)
	var SETTINGS = typeof Symbol === 'function' ? Symbol.for('ngraph.forcelayout.settings') : '$settings';

	/**
	 * The live settings behind a step context. The library reads them, not the context's view: the
	 * view's getters are shared by all setting names, and a read through them costs several times a
	 * plain property read, on every step. A context without a view (a test's) gives its settings.
	 */
	function liveSettings(context) {
	  var settings = context.settings;
	  return settings[SETTINGS] || settings;
	}

	/**
	 * Names every formula can read. They change at most once per step, and are read from the step
	 * context (see simulator.stepContext()).
	 */
	var BUILT_IN_VALUES = {
	  // number of bodies
	  n: function (context) { return context.store.n; },
	  // number of steps done so far
	  step: function (context) { return context.iteration(); },
	  dt: function (context) { return liveSettings(context).timeStep; },
	  // the spring length, never below a small positive number (see simulator.unit())
	  unit: function (context) { return context.unit(); },
	  springLength: setting('springLength'),
	  springCoefficient: setting('springCoefficient'),
	  gravity: setting('gravity'),
	  dragCoefficient: setting('dragCoefficient'),
	  theta: setting('theta'),
	  timeStep: setting('timeStep'),
	  maxVelocity: setting('maxVelocity')
	};

	formula.FUNCTIONS = FUNCTIONS;
	formula.BUILT_IN_VALUES = BUILT_IN_VALUES;
	formula.SETTINGS = SETTINGS;
	formula.liveSettings = liveSettings;

	function setting(name) {
	  return function (context) { return liveSettings(context)[name]; };
	}

	var COMPARISONS = { '<': true, '<=': true, '>': true, '>=': true, '==': true, '!=': true };
	var ASSIGNMENTS = { '=': true, '+=': true, '-=': true, '*=': true, '/=': true };

	// ---------------------------------------------------------------------------------------
	// Parsing
	// ---------------------------------------------------------------------------------------

	var TOKEN = /(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)|([A-Za-z_]\w*)|(\*\*|===|!==|<=|>=|==|!=|&&|\|\||\+=|-=|\*=|\/=|[-+*/^(),;?:[\]<>!=])/y;
	var SPACE = /(?:\s+|\/\/[^\n]*)*/y;

	function tokenize(text) {
	  var tokens = [];
	  var at = 0;
	  while (true) {
	    SPACE.lastIndex = at;
	    SPACE.exec(text);
	    at = SPACE.lastIndex;
	    if (at >= text.length) break;
	    TOKEN.lastIndex = at;
	    var match = TOKEN.exec(text);
	    if (!match) throw new Error('Cannot read formula at "' + text.slice(at) + '"');
	    if (match[1] !== undefined) tokens.push({ type: 'num', value: Number(match[1]) });
	    else if (match[2] !== undefined) tokens.push({ type: 'id', value: match[2] });
	    else tokens.push({ type: 'op', value: OPERATOR_ALIASES[match[3]] || match[3] });
	    at = TOKEN.lastIndex;
	  }
	  return tokens;
	}

	var OPERATOR_ALIASES = { '**': '^', '===': '==', '!==': '!=' };

	/**
	 * Parses one expression into a tree of nodes:
	 *  - {type: 'num', value}, {type: 'var', name};
	 *  - {type: 'neg', a}, {type: 'not', a};
	 *  - {type: 'bin', op, a, b}, where op is one of + - * / ^, a comparison, && or ||;
	 *  - {type: 'call', name, args}; `c ? a : b` is a call of select;
	 *  - {type: 'index', name, a}: `name[a]`.
	 */
	function parse(text) {
	  var statements = parseProgram(text);
	  if (statements.length !== 1 || statements[0].target !== null) throw new Error('Expected one expression: ' + text);
	  return statements[0].expr;
	}

	/**
	 * Parses a formula into statements {target, op, expr}. `target` is null for a bare expression;
	 * `op` is one of = += -= *= /=.
	 */
	function parseProgram(text) {
	  if (typeof text !== 'string') throw new Error('A formula should be a string');
	  var tokens = tokenize(text);
	  var at = 0;
	  var statements = [];
	  while (at < tokens.length) {
	    if (peek(';')) { at++; continue; }
	    var statement;
	    var next = tokens[at + 1];
	    if (tokens[at].type === 'id' && next && next.type === 'op' && ASSIGNMENTS[next.value]) {
	      statement = { target: tokens[at].value, op: next.value, expr: null };
	      at += 2;
	      statement.expr = expression();
	    } else {
	      statement = { target: null, op: null, expr: expression() };
	    }
	    statements.push(statement);
	    if (at < tokens.length) expect(';');
	  }
	  if (statements.length === 0) throw new Error('Formula is empty');
	  return statements;

	  function peek(value) { return at < tokens.length && tokens[at].type === 'op' && tokens[at].value === value; }
	  function peekOperator() { return at < tokens.length && tokens[at].type === 'op' ? tokens[at].value : null; }
	  function expect(value) {
	    if (!peek(value)) {
	      var found = at < tokens.length ? '"' + tokens[at].value + '"' : 'the end';
	      throw new Error('Expected "' + value + '" but found ' + found + ' in formula ' + text);
	    }
	    at++;
	  }
	  function expression() {
	    var condition = or();
	    if (!peek('?')) return condition;
	    at++;
	    var yes = expression();
	    expect(':');
	    var no = expression();
	    return { type: 'call', name: 'select', args: [condition, yes, no] };
	  }
	  function or() {
	    var node = and();
	    while (peek('||')) { at++; node = { type: 'bin', op: '||', a: node, b: and() }; }
	    return node;
	  }
	  function and() {
	    var node = comparison();
	    while (peek('&&')) { at++; node = { type: 'bin', op: '&&', a: node, b: comparison() }; }
	    return node;
	  }
	  function comparison() {
	    var node = sum();
	    if (COMPARISONS[peekOperator()]) {
	      var op = tokens[at++].value;
	      node = { type: 'bin', op: op, a: node, b: sum() };
	      if (COMPARISONS[peekOperator()]) throw new Error('Comparisons cannot be chained (use &&) in formula ' + text);
	    }
	    return node;
	  }
	  function sum() {
	    var node = term();
	    while (peek('+') || peek('-')) {
	      var op = tokens[at++].value;
	      node = { type: 'bin', op: op, a: node, b: term() };
	    }
	    return node;
	  }
	  function term() {
	    var node = unary();
	    while (peek('*') || peek('/')) {
	      var op = tokens[at++].value;
	      node = { type: 'bin', op: op, a: node, b: unary() };
	    }
	    return node;
	  }
	  function unary() {
	    if (peek('-')) { at++; return { type: 'neg', a: unary() }; }
	    if (peek('+')) { at++; return unary(); }
	    if (peek('!')) { at++; return { type: 'not', a: unary() }; }
	    return power();
	  }
	  function power() {
	    var base = primary();
	    if (peek('^')) { at++; return { type: 'bin', op: '^', a: base, b: unary() }; }
	    return base;
	  }
	  function primary() {
	    var token = tokens[at++];
	    if (!token) throw new Error('Formula ends too early: ' + text);
	    if (token.type === 'num') return { type: 'num', value: token.value };
	    if (token.type === 'id') {
	      if (peek('(')) {
	        at++;
	        var args = [];
	        if (!peek(')')) {
	          args.push(expression());
	          while (peek(',')) { at++; args.push(expression()); }
	        }
	        expect(')');
	        return rewrite({ type: 'call', name: token.value, args: args });
	      }
	      if (peek('[')) {
	        at++;
	        var index = expression();
	        expect(']');
	        return { type: 'index', name: token.value, a: index };
	      }
	      return { type: 'var', name: token.value };
	    }
	    if (token.value === '(') {
	      var inner = expression();
	      expect(')');
	      return inner;
	    }
	    throw new Error('Unexpected "' + token.value + '" in formula ' + text);
	  }
	}

	function rewrite(node) {
	  var args = node.args;
	  if (node.name === 'round' && args.length === 1) {
	    return { type: 'call', name: 'floor', args: [{ type: 'bin', op: '+', a: args[0], b: { type: 'num', value: 0.5 } }] };
	  }
	  if (node.name === 'clamp' && args.length === 3) {
	    return { type: 'call', name: 'min', args: [{ type: 'call', name: 'max', args: [args[0], args[1]] }, args[2]] };
	  }
	  return node;
	}

	function children(node) {
	  if (node.args) return node.args;
	  var list = [];
	  if (node.a) list.push(node.a);
	  if (node.b) list.push(node.b);
	  return list;
	}

	/**
	 * True for nodes whose value is a condition (true or false), not a number.
	 */
	function isCondition(node) {
	  if (node.type === 'not') return true;
	  return node.type === 'bin' && (COMPARISONS[node.op] || node.op === '&&' || node.op === '||') === true;
	}

	function numberLiteral(value) {
	  var text = String(value);
	  return value < 0 ? '(' + text + ')' : text;
	}

	// ---------------------------------------------------------------------------------------
	// Lookup tables
	// ---------------------------------------------------------------------------------------

	/**
	 * A function sampled at evenly spaced points: `{from, to, values}` (values[0] at `from`, the
	 * last one at `to`). Between samples it is interpolated linearly; outside it keeps the value of
	 * the nearest end. Its derivative is the slope of the segment (0 outside), which is what the
	 * trees need from a law.
	 */
	function createTable(name, spec) {
	  if (!spec || !(spec.values && spec.values.length >= 2)) throw new Error('Table ' + name + ' needs at least two values');
	  if (!(Number.isFinite(spec.from) && Number.isFinite(spec.to) && spec.to > spec.from)) {
	    throw new Error('Table ' + name + ' needs finite `from` < `to`');
	  }
	  var values = Float64Array.from(spec.values);
	  var last = values.length - 1;
	  var from = spec.from;
	  var scale = last / (spec.to - spec.from);
	  return {
	    from: from,
	    to: spec.to,
	    values: values,
	    value: function (x) {
	      var q = (x - from) * scale;
	      if (!(q > 0)) return values[0];
	      if (q >= last) return values[last];
	      var i = q | 0;
	      return values[i] + (values[i + 1] - values[i]) * (q - i);
	    },
	    derivative: function (x) {
	      var q = (x - from) * scale;
	      if (!(q > 0) || q >= last) return 0;
	      var i = q | 0;
	      return (values[i + 1] - values[i]) * scale;
	    }
	  };
	}

	// ---------------------------------------------------------------------------------------
	// Code for formulas of stages
	// ---------------------------------------------------------------------------------------

	/**
	 * Compiles a formula into lines of code, printed by `printer` (JS by default). `scope` tells
	 * what names mean:
	 *
	 *  - `scope.D`: number of dimensions;
	 *  - `scope.condition`: true when the closing bare expression is a condition (a stage's `when`);
	 *  - `scope.name(name, assigned)` returns undefined for an unknown name, or a description
	 *    (`assigned` is true when the formula assigns to the name rather than reads it):
	 *      {type: 'num', code} or {type: 'vec', codes} - a value the formula can read;
	 *      add `write(op, value)` returning lines, and `ops` (allowed operators), when the formula
	 *      can assign to it;
	 *      {index(code)} - a name read as `name[index]`, returning a value;
	 *      {call(argumentCodes)} - a function of one number (a table), returning code.
	 *
	 * Names the formula assigns that the scope does not know are named values (local variables).
	 * Returns {lines, result}: `result` is the value of a closing bare expression, if any.
	 */
	function compile(text, scope, printer) {
	  printer = printer || JS;
	  var statements = parseProgram(text);
	  var D = scope.D;
	  var lines = [];
	  var locals = Object.create(null);
	  var temp = 0;
	  var result = null;

	  statements.forEach(function (statement, at) {
	    if (statement.target === null) {
	      if (at !== statements.length - 1) throw new Error('Only the last statement of a formula can be a bare expression: ' + text);
	      result = scope.condition ? { type: 'bool', code: condition(statement.expr) } : number(statement.expr, true);
	      return;
	    }
	    var name = statement.target;
	    var op = statement.op;
	    // A named value can hold a condition; anything else takes numbers or vectors
	    var value = evaluate(statement.expr);
	    var local = locals[name];
	    if (value.type === 'bool' && (op !== '=' || local || scope.name(name, true))) {
	      throw new Error('A condition is used as a number in formula ' + text + ' (use select(condition, 1, 0) to count it)');
	    }
	    if (local) {
	      value = scaling(local, op, value);
	      sameType(local, value, name);
	      assign(local.codes || [local.code], op, value);
	      return;
	    }
	    var known = scope.name(name, true);
	    if (known) {
	      if (!known.write) throw new Error(name + ' cannot be assigned in formula ' + text);
	      if (known.ops && known.ops.indexOf(op) < 0) {
	        throw new Error(name + ' can only be changed with ' + known.ops.join(' or ') + ' in formula ' + text);
	      }
	      value = scaling(known, op, value);
	      sameType(known, value, name);
	      known.write(op, value).forEach(function (line) { lines.push(line); });
	      return;
	    }
	    if (op !== '=') throw new Error(name + ' is used with ' + op + ' before it has a value, in formula ' + text);
	    if (name === 'D' || name === 'pi') throw new Error(name + ' cannot be assigned in formula ' + text);
	    local = { type: value.type, reads: 0 };
	    if (value.type === 'vec') {
	      local.codes = value.codes.map(function (code, k) {
	        var variable = printer.local(name) + '_' + k;
	        lines.push(printer.declare(variable, code, 'local'));
	        return variable;
	      });
	    } else {
	      local.code = printer.local(name);
	      lines.push(printer.declare(local.code, value.code, 'local'));
	    }
	    locals[name] = local;
	  });

	  Object.keys(locals).forEach(function (name) {
	    if (locals[name].reads === 0) throw new Error(name + ' is computed but never used in formula ' + text);
	  });
	  return { lines: lines, result: result };

	  function assign(targets, op, value) {
	    var codes = value.codes || [value.code];
	    targets.forEach(function (target, k) { lines.push(printer.assign(target, op, codes[k])); });
	  }

	  // `vector *= number` and `vector /= number` scale every component
	  function scaling(target, op, value) {
	    if (target.type !== 'vec' || value.type !== 'num' || (op !== '*=' && op !== '/=')) return value;
	    var factor = save(value.code);
	    return each(function () { return factor; });
	  }

	  function sameType(target, value, name) {
	    if (target.type !== value.type) {
	      throw new Error(name + ' is a ' + typeName(target.type) + ' but gets a ' + typeName(value.type) + ' in formula ' + text);
	    }
	  }

	  function save(code) {
	    if (/^[\w$]+$/.test(code) || /^\(-?[\d.e+-]+\)$/.test(code)) return code;
	    var variable = printer.temp(temp++);
	    lines.push(printer.declare(variable, code, 'temp'));
	    return variable;
	  }

	  // A number or a vector (not a condition)
	  function number(node, allowVector) {
	    var value = evaluate(node);
	    if (value.type === 'bool') {
	      throw new Error('A condition is used as a number in formula ' + text + ' (use select(condition, 1, 0) to count it)');
	    }
	    if (!allowVector && value.type === 'vec') throw new Error('A vector is used as a number in formula ' + text);
	    return value;
	  }

	  function condition(node) {
	    var value = evaluate(node);
	    if (value.type !== 'bool') throw new Error('Expected a condition (such as a < b) in formula ' + text);
	    return value.code;
	  }

	  function scalar(code) { return { type: 'num', code: code }; }
	  function vector(codes) { return { type: 'vec', codes: codes }; }
	  function each(fn) {
	    var codes = [];
	    for (var k = 0; k < D; ++k) codes.push(fn(k));
	    return vector(codes);
	  }
	  // Components that are read more than once are computed once
	  function saved(value) {
	    return value.type === 'vec' ? vector(value.codes.map(save)) : scalar(save(value.code));
	  }

	  function evaluate(node) {
	    switch (node.type) {
	      case 'num': return scalar(printer.number(node.value));
	      case 'var': return read(node.name);
	      case 'index': return index(node);
	      case 'neg':
	        var a = number(node.a, true);
	        if (a.type === 'vec') return vector(a.codes.map(function (code) { return '(-' + code + ')'; }));
	        return scalar('(-' + a.code + ')');
	      case 'not': return { type: 'bool', code: '!' + condition(node.a) };
	      case 'bin': return binary(node);
	      case 'call': return call(node);
	    }
	    throw new Error('Unknown formula node ' + node.type);
	  }

	  function read(name) {
	    var local = locals[name];
	    if (local) {
	      local.reads += 1;
	      if (local.type === 'bool') return { type: 'bool', code: local.code };
	      return local.type === 'vec' ? vector(local.codes) : scalar(local.code);
	    }
	    if (name === 'D') return scalar(printer.number(D));
	    if (name === 'pi') return scalar(printer.number(Math.PI));
	    var known = scope.name(name);
	    if (!known || known.call || known.index) {
	      throw new Error((known ? name + ' cannot be read as a value' : 'Unknown name ' + name) + ' in formula ' + text);
	    }
	    return known.type === 'vec' ? vector(known.codes) : scalar(known.code);
	  }

	  function index(node) {
	    var known = scope.name(node.name);
	    if (!known || !known.index) throw new Error(node.name + ' cannot be indexed in formula ' + text);
	    return known.index(save(number(node.a).code));
	  }

	  function binary(node) {
	    var op = node.op;
	    if (op === '&&' || op === '||') return { type: 'bool', code: '(' + condition(node.a) + ' ' + printer.operator(op) + ' ' + condition(node.b) + ')' };
	    if (COMPARISONS[op]) {
	      return { type: 'bool', code: '(' + number(node.a).code + ' ' + printer.operator(op) + ' ' + number(node.b).code + ')' };
	    }
	    if (op === '^') return power(number(node.a), node.b);
	    var a = number(node.a, true), b = number(node.b, true);
	    if (op === '+' || op === '-') {
	      if (a.type !== b.type) throw new Error('Cannot ' + (op === '+' ? 'add' : 'subtract') + ' a vector and a number in formula ' + text);
	      if (a.type === 'vec') return each(function (k) { return '(' + a.codes[k] + ' ' + op + ' ' + b.codes[k] + ')'; });
	      return scalar('(' + a.code + ' ' + op + ' ' + b.code + ')');
	    }
	    if (a.type === 'vec' && b.type === 'vec') throw new Error('Vectors cannot be multiplied or divided (use dot()) in formula ' + text);
	    if (a.type === 'vec' || b.type === 'vec') {
	      if (op === '/' && b.type === 'vec') throw new Error('Cannot divide by a vector in formula ' + text);
	      var v = a.type === 'vec' ? a : b;
	      var s = save(a.type === 'vec' ? b.code : a.code);
	      return each(function (k) { return '(' + v.codes[k] + ' ' + op + ' ' + s + ')'; });
	    }
	    return scalar('(' + a.code + ' ' + op + ' ' + b.code + ')');
	  }

	  function power(base, exponentNode) {
	    var exponent = exponentNode.type === 'num' ? exponentNode.value :
	      exponentNode.type === 'neg' && exponentNode.a.type === 'num' ? -exponentNode.a.value : NaN;
	    if (Number.isInteger(exponent) && exponent >= -4 && exponent <= 4) {
	      if (exponent === 0) return scalar(printer.number(1));
	      var b = save(base.code);
	      var product = [];
	      for (var i = 0; i < Math.abs(exponent); ++i) product.push(b);
	      return scalar(exponent > 0 ? '(' + product.join(' * ') + ')' : '(' + printer.number(1) + ' / (' + product.join(' * ') + '))');
	    }
	    return scalar(printer.call('pow', [base.code, number(exponentNode).code]));
	  }

	  function call(node) {
	    var name = node.name;
	    var args = node.args;
	    var arity = FUNCTIONS[name];
	    if (arity === undefined) {
	      var known = scope.name(name);
	      if (!known || !known.call) throw new Error('Unknown function ' + name + ' in formula ' + text);
	      if (args.length !== 1) throw new Error(name + '() expects 1 argument in formula ' + text);
	      return scalar(known.call([number(args[0]).code]));
	    }
	    if (args.length !== arity) throw new Error(name + '() expects ' + arity + ' argument(s) in formula ' + text);
	    if (name === 'select') {
	      var test = save(condition(args[0]));
	      var yes = number(args[1], true), no = number(args[2], true);
	      if (yes.type !== no.type) throw new Error('Both sides of a choice should be numbers, or both vectors, in formula ' + text);
	      if (yes.type === 'vec') return each(function (k) { return printer.choose(test, yes.codes[k], no.codes[k]); });
	      return scalar(printer.choose(test, yes.code, no.code));
	    }
	    if (name === 'dot' || name === 'length') {
	      var u = saved(number(args[0], true));
	      var w = name === 'dot' ? saved(number(args[1], true)) : u;
	      if (u.type !== 'vec' || w.type !== 'vec') throw new Error(name + '() expects vectors in formula ' + text);
	      var terms = u.codes.map(function (code, k) { return code + ' * ' + w.codes[k]; }).join(' + ');
	      return scalar(name === 'dot' ? '(' + terms + ')' : printer.call('sqrt', [terms]));
	    }
	    if (name === 'axis') {
	      var axis = constantNumber(args[0]);
	      if (!(Number.isInteger(axis) && axis >= 0 && axis < D)) {
	        throw new Error('axis() takes a whole number from 0 to ' + (D - 1) + ' in formula ' + text);
	      }
	      return each(function (k) { return printer.number(k === axis ? 1 : 0); });
	    }
	    return scalar(printer.call(name, args.map(function (arg) { return number(arg).code; })));
	  }

	  // A number written in the formula (or D), known when it is compiled
	  function constantNumber(node) {
	    if (node.type === 'num') return node.value;
	    if (node.type === 'var' && node.name === 'D' && !locals.D) return D;
	    if (node.type === 'neg') return -constantNumber(node.a);
	    if (node.type === 'bin' && (node.op === '+' || node.op === '-')) {
	      var a = constantNumber(node.a), b = constantNumber(node.b);
	      return node.op === '+' ? a + b : a - b;
	    }
	    return NaN;
	  }
	}

	function typeName(type) {
	  return type === 'vec' ? 'vector' : 'number';
	}
	return formula;
}

var hasRequiredParsedLaw;

function requireParsedLaw () {
	if (hasRequiredParsedLaw) return parsedLaw.exports;
	hasRequiredParsedLaw = 1;
	// The code of repulsion laws other than the stock 1/r^2 (see repulsionLaw.js, which loads this
	// file with the first such law): parsing, checks, the derivative, hoisted parts and printing.
	var DEFAULT_KEY = requireRepulsionLaw().DEFAULT_KEY;
	var formula = null;
	var BUILT_IN_VALUES = null;
	var BUILT_IN_FUNCTIONS = null;
	// The JS printer of formula.js
	var JS = null;

	parsedLaw.exports = createParsedLaw;
	parsedLaw.exports.parse = function (text) { return loadFormula().parse(text); };

	function loadFormula() {
	  if (formula) return formula;
	  formula = requireFormula();
	  BUILT_IN_VALUES = formula.BUILT_IN_VALUES;
	  // Formula functions of numbers (vectors have no place in a law, and select is written ?:)
	  BUILT_IN_FUNCTIONS = {};
	  Object.keys(formula.BUILTINS).forEach(function (name) {
	    var builtIn = formula.BUILTINS[name];
	    var numbers = builtIn.result === 'num' && builtIn.args.every(function (arg) { return arg === 'num'; });
	    if (numbers) BUILT_IN_FUNCTIONS[name] = builtIn.args.length;
	  });
	  JS = formula.JS;
	  return formula;
	}

	function createParsedLaw(spec) {
	  loadFormula();

	  var params = spec.params || {};
	  var paramNames = Object.keys(params);
	  var known = { r: true, D: true, pi: true };
	  paramNames.forEach(function (name) {
	    if (!/^[A-Za-z_]\w*$/.test(name) || known[name]) throw new Error('Bad law parameter name: ' + name);
	    known[name] = true;
	  });
	  var tableNames = Object.keys(spec.tables || {});
	  var functions = lawFunctions(spec.functions || {}, spec.tables || {});

	  var forceTree = lawTree(spec.force, known);
	  if (check(forceTree, known, functions) !== 'num') throw new Error('A law should give a number, not a condition: ' + spec.force);
	  var rangeTree = typeof spec.range === 'string' ? lawTree(spec.range, known) : null;
	  if (rangeTree) {
	    if (check(rangeTree, known, functions) !== 'num') throw new Error('Law range should be a number: ' + spec.range);
	    if (uses(rangeTree, 'r')) throw new Error('Law range cannot depend on r');
	  }
	  // Names every formula knows (dt, unit, ...) are read every step, as parameters are
	  var builtInNames = [];
	  [forceTree, rangeTree].forEach(function (tree) {
	    if (tree) collectNames(tree, function (name) {
	      if (!known[name] && BUILT_IN_VALUES[name] && builtInNames.indexOf(name) < 0) builtInNames.push(name);
	    });
	  });
	  var userParamCount = paramNames.length;
	  paramNames = paramNames.concat(builtInNames);

	  var rangeIsFunction = typeof spec.range === 'function';
	  var rangeIsNumber = typeof spec.range === 'number';
	  var hasRange = rangeTree !== null || rangeIsFunction || rangeIsNumber;
	  var isDefault = !hasRange && paramNames.length === 0 && compact(spec.force) === DEFAULT_KEY;

	  // Parts of the law that do not depend on r are computed once per step, not once per pair:
	  var hoisted = [];
	  hoistConstants(forceTree, hoisted);
	  var hoistedKeys = hoisted.map(function (h) { return h.key; });

	  // Values that the generated code reads at the start of every tree walk. Parameters go by
	  // their names; the range and hoisted parts start with $, which a parameter name cannot.
	  var values = { $range: Infinity };
	  paramNames.concat(hoistedKeys).forEach(function (name) { values[name] = 0; });
	  // The default law runs the stock code, which needs none of these (and no new Function()):
	  var evaluateRange = rangeTree ? new Function('values', 'functions', 'D', paramPrologue(paramNames, 'values') + 'return ' + toJS(rangeTree) + ';') : null;
	  var evaluateHoisted = hoisted.length && !isDefault ? new Function('values', 'functions', 'D', paramPrologue(paramNames, 'values') +
	    hoisted.map(function (h) { return 'values.' + h.key + ' = ' + h.code + ';'; }).join(' ')) : null;

	  var law = {
	    /**
	     * Same key, same generated code.
	     */
	    key: compact(spec.force) + '|' + paramNames.join(',') + '|' + (hasRange ? 'range' : '') + '|' + Object.keys(functions).join(','),
	    tableNames: tableNames,
	    isDefault: isDefault,
	    hasRange: hasRange,
	    paramNames: paramNames,
	    functions: functions,
	    /**
	     * The numbers of the coming step (after `update`): parameters by name, the parts computed
	     * once per step as `$h<n>` (read as `lawH<n>` by the code `emit` prints) and the range as
	     * `$range`. Engines that keep their own copy of the numbers read them here.
	     */
	    values: values,
	    spec: spec,

	    /**
	     * Reads parameter values (and the range) for the coming step, from the step context (see
	     * simulator.stepContext()).
	     */
	    update: function (context) {
	      for (var i = 0; i < paramNames.length; ++i) {
	        var name = paramNames[i];
	        var value = i < userParamCount ? params[name] : BUILT_IN_VALUES[name];
	        values[name] = typeof value === 'function' ? value(context) : value;
	      }
	      var dimensions = formula.liveSettings(context).dimensions;
	      if (rangeIsNumber) values.$range = spec.range;
	      else if (rangeIsFunction) values.$range = spec.range(context);
	      else if (evaluateRange) values.$range = evaluateRange(values, functions, dimensions);
	      if (evaluateHoisted) evaluateHoisted(values, functions, dimensions);
	    },

	    /**
	     * The law as plain data: its expression, parameters ({name, kind: 'number', value},
	     * {name, kind: 'host'} for functions), the built in values it reads, range, tables and the
	     * names of JS functions.
	     */
	    describe: function () {
	      return {
	        force: spec.force,
	        params: paramNames.slice(0, userParamCount).map(function (name) {
	          var described = describeValue(params[name]);
	          described.name = name;
	          return described;
	        }),
	        builtIns: builtInNames.slice(),
	        range: spec.range === undefined ? null : describeValue(spec.range),
	        tables: tableNames.map(function (name) {
	          var table = spec.tables[name];
	          return { name: name, from: table.from, to: table.to, values: Float64Array.from(table.values) };
	        }),
	        functions: Object.keys(spec.functions || {}),
	        isDefault: isDefault,
	        key: law.key
	      };
	    },

	    /**
	     * Code that declares the parameters as local variables, read from `valuesName`.
	     */
	    prologue: function (valuesName) {
	      return paramPrologue(paramNames, valuesName) +
	        hoisted.map(function (h) { return ' var ' + h.variable + ' = ' + valuesName + '.' + h.key + ';'; }).join('') +
	        (hasRange ? ' var lawRange = ' + valuesName + '.$range, lawRange2 = lawRange * lawRange;' : '');
	    },

	    /**
	     * Code that sets `k1Name` to F(r) / r (and `k2Name`, when given, to (F(r)/r - F'(r)) / r^2),
	     * where `rName` holds the distance and the parameters are in local variables (`law_<name>`,
	     * and `lawH<n>` for the parts computed once per step). `printer` spells the code (see
	     * formula.js; JS when left out: `emit(dimension, rName, k1Name, k2Name)`).
	     */
	    emit: function (printer, dimension, rName, k1Name, k2Name) {
	      if (typeof printer === 'number') return emitKernel(forceTree, printer, dimension, rName, k1Name, JS);
	      return emitKernel(forceTree, dimension, rName, k1Name, k2Name, printer);
	    }
	  };
	  return law;
	}

	/**
	 * Marks the parts of the expression that do not depend on r, so they are computed once per
	 * step: every largest such part that is more than a name or a number, and every divisor (whose
	 * reciprocal is computed, so the division becomes a multiplication). Names depend on the
	 * expression only, so all laws with the same expression share the generated code. A hoisted
	 * part is `lawH<n>` in the generated code (parameters are `law_<name>`) and `$h<n>` in values.
	 */
	function hoistConstants(tree, hoisted) {
	  // Named values make the tree a graph: a shared part is looked at (and hoisted) once
	  var seen = new Map();
	  var dependsOnR = visit(tree);
	  if (!dependsOnR) mark(tree);
	  return hoisted;

	  function visit(node) {
	    if (seen.has(node)) return seen.get(node);
	    var parts = children(node);
	    var childDepends = parts.map(visit);
	    var depends = node.type === 'var' ? node.name === 'r' : childDepends.some(Boolean);
	    if (depends) {
	      parts.forEach(function (child, i) { if (!childDepends[i]) mark(child); });
	      if (node.type === 'bin' && node.op === '/' && !childDepends[1] && !node.reciprocal) {
	        node.reciprocal = hoist('1 / ' + toJS(node.b));
	      }
	    }
	    seen.set(node, depends);
	    return depends;
	  }

	  function mark(node) {
	    if (node.type === 'num' || node.type === 'var' || node.hoisted) return;
	    // A condition is not a number, so it cannot be one of the law's values; its parts can
	    if (formula.isCondition(node)) children(node).forEach(mark);
	    else node.hoisted = hoist(toJS(node));
	  }

	  function hoist(code) {
	    var n = hoisted.length;
	    hoisted.push({ variable: 'lawH' + n, key: '$h' + n, code: code });
	    return 'lawH' + n;
	  }
	}

	// A number, an expression, or a function (called by engines with the step context)
	function describeValue(spec) {
	  if (typeof spec === 'number') return { kind: 'number', value: spec };
	  if (typeof spec === 'string') return { kind: 'expression', text: spec };
	  return { kind: 'host' };
	}

	function paramPrologue(paramNames, valuesName) {
	  return paramNames.map(function (name) { return 'var law_' + name + ' = ' + valuesName + '.' + name + ';'; }).join(' ');
	}

	function compact(text) {
	  return text.replace(/\s+/g, '');
	}


	/**
	 * Parses a law: an expression of r, optionally after named values (`'u = r / L; exp(-u) / r^2'`).
	 * A named value becomes a part of the tree that every use shares.
	 */
	function lawTree(text, known) {
	  var statements = formula.parseProgram(text);
	  var named = Object.create(null);
	  var used = Object.create(null);
	  var tree = null;
	  statements.forEach(function (statement, at) {
	    if (statement.target === null) {
	      if (at !== statements.length - 1) throw new Error('Only the last part of a law can be its expression: ' + text);
	      tree = substitute(statement.expr);
	      return;
	    }
	    var name = statement.target;
	    if (statement.op !== '=') throw new Error('Law values are set with =, not ' + statement.op + ': ' + text);
	    if (named[name] || known[name] || BUILT_IN_VALUES[name]) throw new Error(name + ' already has a meaning in law ' + text);
	    named[name] = substitute(statement.expr);
	  });
	  if (!tree) throw new Error('A law should end with the expression of F(r): ' + text);
	  Object.keys(named).forEach(function (name) {
	    if (!used[name]) throw new Error(name + ' is computed but never used in law ' + text);
	  });
	  return tree;

	  function substitute(node) {
	    if (node.type === 'var' && named[node.name]) {
	      used[node.name] = true;
	      return named[node.name];
	    }
	    var copy = {};
	    Object.keys(node).forEach(function (key) { copy[key] = node[key]; });
	    if (node.args) copy.args = node.args.map(substitute);
	    if (node.a) copy.a = substitute(node.a);
	    if (node.b) copy.b = substitute(node.b);
	    return copy;
	  }
	}

	/**
	 * Custom functions and lookup tables, as {name: {value, derivative}}.
	 */
	function lawFunctions(functions, tables) {
	  var all = {};
	  Object.keys(functions).forEach(function (name) { all[name] = functions[name]; });
	  Object.keys(tables).forEach(function (name) {
	    if (all[name]) throw new Error(name + ' is both a function and a table');
	    var table = formula.createTable(name, tables[name]);
	    all[name] = { value: table.value, derivative: table.derivative };
	  });
	  return all;
	}

	/**
	 * Checks names, functions and types. Returns 'num' or 'bool' (a condition).
	 */
	function check(node, known, functions) {
	  switch (node.type) {
	    case 'num': return 'num';
	    case 'var':
	      if (!known[node.name] && !BUILT_IN_VALUES[node.name]) throw new Error('Unknown name in law expression: ' + node.name);
	      return 'num';
	    case 'index': throw new Error('Laws cannot read ' + node.name + '[...]');
	    case 'neg': return expect(node.a, 'num');
	    case 'not':
	      expect(node.a, 'bool');
	      return 'bool';
	    case 'bin':
	      if (node.op === '&&' || node.op === '||') {
	        expect(node.a, 'bool');
	        expect(node.b, 'bool');
	        return 'bool';
	      }
	      expect(node.a, 'num');
	      expect(node.b, 'num');
	      return formula.isCondition(node) ? 'bool' : 'num';
	    case 'call':
	      if (node.name === 'select') {
	        if (node.args.length !== 3) throw new Error('select() expects 3 arguments');
	        expect(node.args[0], 'bool');
	        expect(node.args[1], 'num');
	        return expect(node.args[2], 'num');
	      }
	      var arity = BUILT_IN_FUNCTIONS[node.name];
	      if (arity === undefined) {
	        if (formula.FUNCTIONS[node.name]) throw new Error('Laws work on numbers; ' + node.name + '() is for vectors');
	        var custom = functions[node.name];
	        if (!custom || typeof custom.value !== 'function') throw new Error('Unknown function in law expression: ' + node.name);
	        arity = 1;
	      }
	      if (node.args.length !== arity) throw new Error(node.name + '() expects ' + arity + ' argument(s)');
	      node.args.forEach(function (arg) { expect(arg, 'num'); });
	      return 'num';
	  }
	  throw new Error('Unknown law node ' + node.type);

	  function expect(child, type) {
	    var actual = check(child, known, functions);
	    if (actual !== type) {
	      throw new Error(type === 'num' ? 'A condition is used as a number in a law (use select(condition, 1, 0))' :
	        'Expected a condition (such as a < b) in a law');
	    }
	    return actual;
	  }
	}

	function uses(node, name) {
	  if (node.type === 'var') return node.name === name;
	  return children(node).some(function (child) { return uses(child, name); });
	}

	function collectNames(node, fn) {
	  if (node.type === 'var') fn(node.name);
	  children(node).forEach(function (child) { collectNames(child, fn); });
	}

	// Plain JS for an expression without derivatives (used for the range); `D` stays a variable
	function toJS(node) {
	  switch (node.type) {
	    case 'num': return numberLiteral(node.value);
	    case 'var':
	      if (node.name === 'pi') return numberLiteral(Math.PI);
	      return node.name === 'D' ? 'D' : 'law_' + node.name;
	    case 'neg': return '(-' + toJS(node.a) + ')';
	    case 'not': return '(!' + toJS(node.a) + ')';
	    case 'bin':
	      if (node.op === '^') return JS.call('pow', [toJS(node.a), toJS(node.b)]);
	      return '(' + toJS(node.a) + ' ' + JS.operator(node.op) + ' ' + toJS(node.b) + ')';
	    case 'call':
	      var args = node.args.map(toJS);
	      if (node.name === 'select') return JS.choose(args[0], args[1], args[2]);
	      if (BUILT_IN_FUNCTIONS[node.name]) return JS.call(node.name, args);
	      return 'functions.' + node.name + '.value(' + args.join(', ') + ')';
	  }
	}

	/**
	 * Value of an expression made of numbers and D only (NaN for anything else).
	 */
	function fold(node, dimension) {
	  switch (node.type) {
	    case 'num': return node.value;
	    case 'var': return node.name === 'D' ? dimension : node.name === 'pi' ? Math.PI : NaN;
	    case 'neg': return -fold(node.a, dimension);
	    case 'bin':
	      var a = fold(node.a, dimension), b = fold(node.b, dimension);
	      if (node.op === '+') return a + b;
	      if (node.op === '-') return a - b;
	      if (node.op === '*') return a * b;
	      if (node.op === '/') return a / b;
	      if (node.op === '^') return Math.pow(a, b);
	  }
	  return NaN;
	}

	function children(node) {
	  return formula.children(node);
	}

	function numberLiteral(value) {
	  var text = String(value);
	  return value < 0 ? '(' + text + ')' : text;
	}

	// ---------------------------------------------------------------------------------------
	// Code for F(r)/r and (F(r)/r - F'(r))/r^2
	// ---------------------------------------------------------------------------------------

	// Drops temporaries that nothing reads, e.g. a / b when F / r is computed as a / (b * r), or
	// derivatives that only k2 would need. `declared[i]` names the temporary that line i declares.
	function dropUnused(lines, declared) {
	  var kept = [], read = '';
	  for (var i = lines.length - 1; i >= 0; --i) {
	    if (declared[i] && !new RegExp('\\b' + declared[i] + '\\b').test(read)) continue;
	    kept.unshift(lines[i]);
	    read += ' ' + lines[i];
	  }
	  return kept;
	}

	/**
	 * Forward mode differentiation: every node becomes a value and a derivative with respect to r.
	 * Each is either a constant number, or code in a temporary variable. A derivative of `null`
	 * means 0 (the node does not depend on r).
	 */
	function emitKernel(tree, dimension, rName, k1Name, k2Name, printer) {
	  var lines = [], declared = [];
	  var temp = 0;
	  var prefix = k1Name + '_';
	  // Parts shared by named values are written once
	  var done = new Map();

	  var force = visit(tree, k2Name !== undefined);
	  if (force.dividend !== undefined) {
	    // F = a / b: one division for F / r
	    push(printer.result(k1Name, force.dividend + ' / (' + force.divisor + ' * ' + rName + ')'));
	  } else {
	    push(printer.result(k1Name, force.v + ' / ' + rName));
	  }
	  if (k2Name !== undefined) {
	    var derivative = force.d === null ? printer.number(0) : force.d;
	    push(printer.result(k2Name, '(' + k1Name + ' - ' + derivative + ') / (' + rName + ' * ' + rName + ')'));
	  }
	  return dropUnused(lines, declared).join(' ');

	  function push(line, name) {
	    lines.push(line);
	    declared.push(name || null);
	  }
	  function save(code) {
	    if (/^[\w.]+$/.test(code)) return code;
	    var name = prefix + (temp++);
	    push(printer.declare(name, code, 'temp'), name);
	    return name;
	  }
	  function constant(node) { return node.d === null; }

	  // Returns {v: code, d: code or null}
	  function visit(node, needDerivative) {
	    var result = done.get(node);
	    if (!result) {
	      result = visitOnce(node, needDerivative);
	      done.set(node, result);
	    }
	    return result;
	  }

	  function visitOnce(node, needDerivative) {
	    if (node.hoisted) {
	      // Numbers and D only: known right now
	      var known = fold(node, dimension);
	      return { v: Number.isFinite(known) ? printer.number(known) : node.hoisted, d: null };
	    }
	    switch (node.type) {
	      case 'num': return { v: printer.number(node.value), d: null };
	      case 'var':
	        if (node.name === 'r') return { v: rName, d: printer.number(1) };
	        if (node.name === 'D') return { v: printer.number(dimension), d: null };
	        if (node.name === 'pi') return { v: printer.number(Math.PI), d: null };
	        return { v: 'law_' + node.name, d: null };
	      case 'neg':
	        var arg = visit(node.a, needDerivative);
	        return { v: save('-' + arg.v), d: arg.d === null ? null : save('-' + arg.d) };
	      case 'not':
	        // conditions have no derivative
	        return { v: save('!' + visit(node.a, needDerivative).v), d: null };
	      case 'bin': return binary(node, needDerivative);
	      case 'call': return call(node, needDerivative);
	    }
	  }

	  function binary(node, needDerivative) {
	    if (node.op === '^') return power(visit(node.a, needDerivative), node.b, needDerivative);
	    var a = visit(node.a, needDerivative), b = visit(node.b, needDerivative);
	    if (formula.isCondition(node)) return { v: save(a.v + ' ' + printer.operator(node.op) + ' ' + b.v), d: null };
	    if (node.reciprocal) {
	      // a / b with b fixed for the step: multiply by 1 / b
	      var reciprocal = node.reciprocal;
	      var product = save(a.v + ' * ' + reciprocal);
	      return { v: product, d: needDerivative && !constant(a) ? save(a.d + ' * ' + reciprocal) : null };
	    }
	    var v = save(a.v + ' ' + node.op + ' ' + b.v);
	    var result = node.op === '/' ? { v: v, d: null, dividend: a.v, divisor: b.v } : { v: v, d: null };
	    if (!needDerivative || (constant(a) && constant(b))) return result;
	    var d;
	    if (node.op === '+' || node.op === '-') {
	      if (constant(a)) d = node.op === '+' ? b.d : '-' + b.d;
	      else if (constant(b)) d = a.d;
	      else d = a.d + ' ' + node.op + ' ' + b.d;
	    } else if (node.op === '*') {
	      if (constant(a)) d = a.v + ' * ' + b.d;
	      else if (constant(b)) d = a.d + ' * ' + b.v;
	      else d = a.d + ' * ' + b.v + ' + ' + a.v + ' * ' + b.d;
	    } else {
	      // (a / b)' = a'/b - (a/b) * b'/b
	      if (constant(b)) d = a.d + ' / ' + b.v;
	      else if (constant(a)) d = '-' + v + ' * ' + b.d + ' / ' + b.v;
	      else d = '(' + a.d + ' - ' + v + ' * ' + b.d + ') / ' + b.v;
	    }
	    result.d = save(d);
	    return result;
	  }

	  function power(base, exponentNode, needDerivative) {
	    var exponent = visit(exponentNode, needDerivative);
	    var v, d = null;
	    if (constant(exponent)) {
	      var n = fold(exponentNode, dimension);
	      if (Number.isInteger(n) && n >= -4 && n <= 4) {
	        v = save(integerPower(base.v, n));
	      } else {
	        v = save(printer.call('pow', [base.v, exponent.v]));
	      }
	      if (needDerivative && !constant(base)) {
	        // (b^n)' = n * b^n / b * b'
	        d = save(exponent.v + ' * ' + v + ' / ' + base.v + ' * ' + base.d);
	      }
	      return { v: v, d: d };
	    }
	    v = save(printer.call('pow', [base.v, exponent.v]));
	    if (needDerivative) {
	      // (b^e)' = b^e * (e' * log(b) + e * b' / b)
	      var parts = [exponent.d + ' * ' + printer.call('log', [base.v])];
	      if (!constant(base)) parts.push(exponent.v + ' * ' + base.d + ' / ' + base.v);
	      d = save(v + ' * (' + parts.join(' + ') + ')');
	    }
	    return { v: v, d: d };
	  }

	  function integerPower(base, n) {
	    if (n === 0) return printer.number(1);
	    var product = [];
	    for (var i = 0; i < Math.abs(n); ++i) product.push(base);
	    var text = product.join(' * ');
	    return n > 0 ? '(' + text + ')' : printer.number(1) + ' / (' + text + ')';
	  }

	  function call(node, needDerivative) {
	    var args = node.args.map(function (arg) { return visit(arg, needDerivative); });
	    var a = args[0], b = args[1];
	    var v, d = null;
	    var allConstant = args.every(constant);
	    if (node.name === 'select') {
	      v = save(printer.choose(a.v, b.v, args[2].v));
	      if (needDerivative && !(constant(b) && constant(args[2]))) {
	        d = save(printer.choose(a.v, constant(b) ? printer.number(0) : b.d, constant(args[2]) ? printer.number(0) : args[2].d));
	      }
	      return { v: v, d: d };
	    }
	    if (node.name === 'pow') return power(a, node.args[1], needDerivative);
	    var builtIn = BUILT_IN_FUNCTIONS[node.name] ? formula.BUILTINS[node.name] : null;
	    if (builtIn) {
	      v = save(printer.call(node.name, args.map(function (arg) { return arg.v; })));
	      // functions without a derivative are steps: 0 almost everywhere
	      if (needDerivative && !allConstant && builtIn.derivative) d = save(builtIn.derivative(printer, args, v));
	      return { v: v, d: d };
	    }
	    v = save('lawFunctions.' + node.name + '.value(' + a.v + ')');
	    if (needDerivative && !allConstant) {
	      var custom = 'lawFunctions.' + node.name + '.derivative';
	      d = save('(' + custom + ' ? ' + custom + '(' + a.v + ') : 0) * ' + a.d);
	    }
	    return { v: v, d: d };
	  }
	}
	return parsedLaw.exports;
}

/**
 * A repulsion law says how hard two unit charges push each other at distance `r`: F(r).
 * Bodies `i` and `j` then push each other with `gravity * charge_i * charge_j * F(r)`.
 *
 * Laws are written as small expressions, e.g. `'exp(-r / L) / r^2'`, with named parameters
 * (`L`) whose values are read once per step. The expression is compiled into the tree code,
 * so a law costs about as much as the arithmetic it asks for. The trees need two numbers from
 * a law, and both are generated from the expression:
 *
 *  - F(r) / r, which multiplies the vector between two bodies (or a body and a cell);
 *  - (F(r) / r - F'(r)) / r^2, the dual tree's field gradient. F' is derived here.
 *
 * A law is written in the formula language (see formula.js): numbers, `r`, the law's parameters,
 * the names every formula knows (`D`, `dt`, `unit`, ...), comparisons and `?:`, named values
 * (`'u = r / L; exp(-u) / r^2'`), and the functions of formula.js except the vector ones.
 * Lookup tables are passed in as `tables: { name: { from, to, values } }`; on the CPU, other
 * functions can be passed in as `functions: { name: { value: fn, derivative: fn } }`.
 */

var hasRequiredRepulsionLaw;

function requireRepulsionLaw () {
	if (hasRequiredRepulsionLaw) return repulsionLaw.exports;
	hasRequiredRepulsionLaw = 1;
	(function (module) {
		// Laws other than 1/r^2 are parsed and compiled by parsedLaw.js, which this file loads with the
		// first of them: default layouts never load the formula language or run its parser
		var createParsedLaw = null;

		module.exports = createRepulsionLaw;
		module.exports.parse = function (text) { return parsedLaws().parse(text); };
		module.exports.presets = {
		  /**
		   * The default: 1/r^2, as charges push in 3D.
		   */
		  inverseSquare: function () {
		    return { force: 'r^-2', isInverseSquare: true };
		  },
		  /**
		   * 1/r^p. With p = D - 1 this is how charges push in D dimensions (1/r in 2D).
		   */
		  power: function (p) {
		    return { force: 'r^-p', params: { p: p } };
		  },
		  /**
		   * 1/r^2 that fades out exponentially past `length`.
		   */
		  fading: function (length) {
		    return { force: 'exp(-r / L) / r^2', params: { L: length } };
		  }
		};

		var DEFAULT_KEY = 'r^-2';
		module.exports.DEFAULT_KEY = DEFAULT_KEY;

		/**
		 * Turns a law description into a compiled law. `spec` is a string (the force expression) or
		 * an object:
		 *  - `force`: the expression for F(r);
		 *  - `params`: { name: number or function(context) returning a number }, read every step with
		 *    the step context (see simulator.stepContext());
		 *  - `range`: a number, an expression of the parameters, or a function(context). Pairs and
		 *    tree cells farther apart than this are skipped;
		 *  - `tables`: lookup tables the expression can call, { name: {from, to, values} } (see
		 *    formula.createTable);
		 *  - `functions`: extra JS functions the expression can call (CPU only).
		 */
		function createRepulsionLaw(spec) {
		  if (!spec) spec = module.exports.presets.inverseSquare();
		  if (typeof spec === 'string') spec = { force: spec };
		  if (typeof spec.force !== 'string') throw new Error('A repulsion law needs a `force` expression of r');
		  if (isPlainDefault(spec)) return createDefaultLaw(spec);
		  return parsedLaws()(spec);
		}

		function parsedLaws() {
		  if (!createParsedLaw) createParsedLaw = requireParsedLaw();
		  return createParsedLaw;
		}

		function isPlainDefault(spec) {
		  return spec.force.replace(/\s+/g, '') === DEFAULT_KEY && spec.range === undefined &&
		    isEmpty(spec.params) && isEmpty(spec.tables) && isEmpty(spec.functions);
		}

		function isEmpty(object) {
		  return !object || Object.keys(object).length === 0;
		}

		/**
		 * 1/r^2 without parameters: the trees run their stock code, so nothing is parsed until something
		 * asks for the law's code (a GPU engine, say).
		 */
		function createDefaultLaw(spec) {
		  var parsed = null;
		  function full() {
		    if (!parsed) parsed = parsedLaws()(spec);
		    return parsed;
		  }
		  return {
		    key: DEFAULT_KEY + '|||',
		    tableNames: [],
		    isDefault: true,
		    hasRange: false,
		    paramNames: [],
		    functions: {},
		    spec: spec,
		    get values() { return full().values; },
		    // nothing to read: no parameters, no range
		    update: function () {},
		    describe: function () {
		      return { force: spec.force, params: [], builtIns: [], range: null, tables: [], functions: [], isDefault: true, key: DEFAULT_KEY + '|||' };
		    },
		    prologue: function (valuesName) { return full().prologue(valuesName); },
		    emit: function (printer, dimension, rName, k1Name, k2Name) { return full().emit(printer, dimension, rName, k1Name, k2Name); }
		  };
		} 
	} (repulsionLaw));
	return repulsionLaw.exports;
}

var spring;
var hasRequiredSpring;

function requireSpring () {
	if (hasRequiredSpring) return spring;
	hasRequiredSpring = 1;
	spring = Spring;

	/**
	 * Represents a physical spring. Spring connects two bodies, has rest length
	 * stiffness coefficient and optional weight.
	 *
	 * A spring of a simulator keeps its numbers in row `index` of the simulator's spring store.
	 * Any other spring (made with `new Spring()`, or removed from its simulator) keeps them in
	 * its own fields.
	 */
	function Spring(fromBody, toBody, length, springCoefficient, store, index) {
	  this.from = fromBody;
	  this.to = toBody;
	  this.store = store || null;
	  this.index = store ? index : -1;
	  // the store's flags for writes from outside the simulator (see initColumnStore.js)
	  this.writes = store && store.writes || null;
	  this.ownLength = length;
	  this.ownCoefficient = springCoefficient;
	}

	Object.defineProperties(Spring.prototype, {
	  length: {
	    get: function () { return this.store !== null ? this.store.length[this.index] : this.ownLength; },
	    set: function (value) {
	      if (this.store === null) {
	        this.ownLength = value;
	        return;
	      }
	      this.store.length[this.index] = value;
	      // engines with their own copy of the numbers see that the column changed
	      var writes = this.writes;
	      if (writes !== null) { writes.length = true; writes.any = true; }
	    },
	    enumerable: true
	  },
	  coefficient: {
	    get: function () { return this.store !== null ? this.store.coefficient[this.index] : this.ownCoefficient; },
	    set: function (value) {
	      if (this.store === null) {
	        this.ownCoefficient = value;
	        return;
	      }
	      this.store.coefficient[this.index] = value;
	      var writes = this.writes;
	      if (writes !== null) { writes.coefficient = true; writes.any = true; }
	    },
	    enumerable: true
	  }
	});

	/**
	 * Points this spring to row `index` of `store`. The numbers are not copied.
	 */
	Spring.prototype.moveTo = function (store, index) {
	  this.store = store;
	  this.index = index;
	  this.writes = store.writes || null;
	};

	/**
	 * Takes the numbers out of the store, into the spring's own fields.
	 */
	Spring.prototype.detach = function () {
	  if (this.store === null) return;
	  this.ownLength = this.store.length[this.index];
	  this.ownCoefficient = this.store.coefficient[this.index];
	  this.store = null;
	  this.index = -1;
	  this.writes = null;
	};

	Spring.prototype.toJSON = function () {
	  return { from: this.from, to: this.to, length: this.length, coefficient: this.coefficient };
	};
	return spring;
}

var ngraph_merge;
var hasRequiredNgraph_merge;

function requireNgraph_merge () {
	if (hasRequiredNgraph_merge) return ngraph_merge;
	hasRequiredNgraph_merge = 1;
	ngraph_merge = merge;

	/**
	 * Augments `target` with properties in `options`. Does not override
	 * target's properties if they are defined and matches expected type in 
	 * options
	 *
	 * @returns {Object} merged object
	 */
	function merge(target, options) {
	  var key;
	  if (!target) { target = {}; }
	  if (options) {
	    for (key in options) {
	      if (options.hasOwnProperty(key)) {
	        var targetHasIt = target.hasOwnProperty(key),
	            optionsValueType = typeof options[key],
	            shouldReplace = !targetHasIt || (typeof target[key] !== optionsValueType);

	        if (shouldReplace) {
	          target[key] = options[key];
	        } else if (optionsValueType === 'object') {
	          // go deep, don't care about loops here, we are simple API!:
	          target[key] = merge(target[key], options[key]);
	        }
	      }
	    }
	  }

	  return target;
	}
	return ngraph_merge;
}

var ngraph_events$1;
var hasRequiredNgraph_events;

function requireNgraph_events () {
	if (hasRequiredNgraph_events) return ngraph_events$1;
	hasRequiredNgraph_events = 1;
function c(e){s(e);const t=a(e);return e.on=t.on,e.off=t.off,e.fire=t.fire,e}function a(e){let t=Object.create(null);return {on:function(n,r,f){if(typeof r!="function")throw new Error("callback is expected to be a function");let o=t[n];return o||(o=t[n]=[]),o.push({callback:r,ctx:f}),e},off:function(n,r){if(typeof n>"u")return t=Object.create(null),e;if(t[n])if(typeof r!="function")delete t[n];else {const l=t[n];for(let i=0;i<l.length;++i)l[i].callback===r&&l.splice(i,1);}return e},fire:function(n){const r=t[n];if(!r)return e;let f;arguments.length>1&&(f=Array.prototype.slice.call(arguments,1));for(let o=0;o<r.length;++o){const l=r[o];l.callback.apply(l.ctx,f);}return e}}}function s(e){if(!e)throw new Error("Eventify cannot use falsy object as events subject");const t=["on","fire","off"];for(let n=0;n<t.length;++n)if(e.hasOwnProperty(t[n]))throw new Error("Subject cannot be eventified, since it already has property '"+t[n]+"'")}ngraph_events$1=c;
	
	return ngraph_events$1;
}

var ngraph_random = {exports: {}};

var hasRequiredNgraph_random;

function requireNgraph_random () {
	if (hasRequiredNgraph_random) return ngraph_random.exports;
	hasRequiredNgraph_random = 1;
	ngraph_random.exports = random;

	ngraph_random.exports.random = random,
	ngraph_random.exports.randomIterator = randomIterator;

	/**
	 * Creates seeded PRNG with two methods:
	 *   next() and nextDouble()
	 */
	function random(inputSeed) {
	  var seed = typeof inputSeed === 'number' ? inputSeed : (+new Date());
	  return new Generator(seed)
	}

	function Generator(seed) {
	  this.seed = seed;
	}

	/**
	  * Generates random integer number in the range from 0 (inclusive) to maxValue (exclusive)
	  *
	  * @param maxValue Number REQUIRED. Omitting this number will result in NaN values from PRNG.
	  */
	Generator.prototype.next = next;

	/**
	  * Generates random double number in the range from 0 (inclusive) to 1 (exclusive)
	  * This function is the same as Math.random() (except that it could be seeded)
	  */
	Generator.prototype.nextDouble = nextDouble;

	/**
	 * Returns a random real number from uniform distribution in [0, 1)
	 */
	Generator.prototype.uniform = nextDouble;

	/**
	 * Returns a random real number from a Gaussian distribution
	 * with 0 as a mean, and 1 as standard deviation u ~ N(0,1)
	 */
	Generator.prototype.gaussian = gaussian;

	/**
	 * Returns a floating-point, pseudo-random number that's greater than 
	 * or equal to 0 and less than 1, with approximately uniform distribution over that range
	 * 
	 * Note: This method is the same as nextDouble(), but is here for
	 * compatibility with similar Math.random()
	 */
	Generator.prototype.random = nextDouble;

	function gaussian() {
	  // use the polar form of the Box-Muller transform
	  // based on https://introcs.cs.princeton.edu/java/23recursion/StdRandom.java
	  var r, x, y;
	  do {
	    x = this.nextDouble() * 2 - 1;
	    y = this.nextDouble() * 2 - 1;
	    r = x * x + y * y;
	  } while (r >= 1 || r === 0);

	  return x * Math.sqrt(-2 * Math.log(r)/r);
	}

	/**
	 * See https://twitter.com/anvaka/status/1296182534150135808
	 */
	Generator.prototype.levy = levy;

	function levy() {
	  var beta = 3 / 2;
	  var sigma = Math.pow(
	      gamma( 1 + beta ) * Math.sin(Math.PI * beta / 2) / 
	        (gamma((1 + beta) / 2) * beta * Math.pow(2, (beta - 1) / 2)),
	      1/beta
	  );
	  return this.gaussian() * sigma / Math.pow(Math.abs(this.gaussian()), 1/beta);
	}

	// gamma function approximation
	function gamma(z) {
	  return Math.sqrt(2 * Math.PI / z) * Math.pow((1 / Math.E) * (z + 1 / (12 * z - 1 / (10 * z))), z);
	}

	function nextDouble() {
	  var seed = this.seed;
	  // Robert Jenkins' 32 bit integer hash function.
	  seed = ((seed + 0x7ed55d16) + (seed << 12)) & 0xffffffff;
	  seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffffffff;
	  seed = ((seed + 0x165667b1) + (seed << 5)) & 0xffffffff;
	  seed = ((seed + 0xd3a2646c) ^ (seed << 9)) & 0xffffffff;
	  seed = ((seed + 0xfd7046c5) + (seed << 3)) & 0xffffffff;
	  seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffffffff;
	  this.seed = seed;
	  return (seed & 0xfffffff) / 0x10000000;
	}

	function next(maxValue) {
	  return Math.floor(this.nextDouble() * maxValue);
	}

	/*
	 * Creates iterator over array, which returns items of array in random order
	 * Time complexity is guaranteed to be O(n);
	 */
	function randomIterator(array, customRandom) {
	  var localRandom = customRandom || random();
	  if (typeof localRandom.next !== 'function') {
	    throw new Error('customRandom does not match expected API: next() function is missing');
	  }

	  return {
	    /**
	     * Visits every single element of a collection once, in a random order.
	     * Note: collection is modified in place.
	     */
	    forEach: forEach,

	    /**
	     * Shuffles array randomly, in place.
	     */
	    shuffle: shuffle
	  };

	  function shuffle() {
	    var i, j, t;
	    for (i = array.length - 1; i > 0; --i) {
	      j = localRandom.next(i + 1); // i inclusive
	      t = array[j];
	      array[j] = array[i];
	      array[i] = t;
	    }

	    return array;
	  }

	  function forEach(callback) {
	    var i, j, t;
	    for (i = array.length - 1; i > 0; --i) {
	      j = localRandom.next(i + 1); // i inclusive
	      t = array[j];
	      array[j] = array[i];
	      array[i] = t;

	      callback(t);
	    }

	    if (array.length) {
	      callback(array[0]);
	    }
	  }
	}
	return ngraph_random.exports;
}

var createNeighborGrid_1;
var hasRequiredCreateNeighborGrid;

function requireCreateNeighborGrid () {
	if (hasRequiredCreateNeighborGrid) return createNeighborGrid_1;
	hasRequiredCreateNeighborGrid = 1;
	createNeighborGrid_1 = createNeighborGrid;

	// All 3^D offsets from a cell to its neighbors (and itself)
	function neighborOffsets(D) {
	  var count = Math.pow(3, D);
	  var offsets = new Int32Array(count * D);
	  for (var o = 0; o < count; ++o) {
	    var rest = o;
	    for (var k = 0; k < D; ++k) {
	      offsets[o * D + k] = (rest % 3) - 1;
	      rest = (rest / 3) | 0;
	    }
	  }
	  return offsets;
	}

	/**
	 * A uniform grid over the bodies of a store, in any number of dimensions, for finding bodies
	 * closer than some radius. Cells are hashed into a table, so empty space costs nothing.
	 *
	 * Build it with cells at least as large as the radius you will ask for: a query looks at the
	 * 3^D cells around a body (9 in 2D, 27 in 3D).
	 */
	function createNeighborGrid(dimensions) {
	  var D = dimensions;
	  var cellSize = 1;
	  var n = 0;
	  var pos = null;
	  var store = null;
	  // Cell coordinates of every body, and the table bucket of its cell:
	  var cells = new Int32Array(0), bucketOf = new Int32Array(0);
	  // Bodies sorted by bucket; bucket b holds sorted[bucketStart[b] .. bucketStart[b + 1] - 1]
	  var sorted = new Int32Array(0), bucketStart = new Int32Array(1);
	  var tableMask = 0;
	  var next = new Int32Array(0);
	  var neighborCell = new Int32Array(D);

	  var offsetCount = Math.pow(3, D);
	  var offsets = neighborOffsets(D);

	  var api = {
	    /**
	     * Sorts the bodies of `bodyStore` into cells of `size`.
	     */
	    build: build,

	    /**
	     * Calls `fn(i, j, r)` once for every pair of bodies closer than `radius`, with i < j.
	     * Bodies at the same point are a pair too, with r = 0.
	     */
	    forEachPair: forEachPair,

	    /**
	     * Calls `fn(j, r)` for every body `j` closer than `radius` to body `i`.
	     */
	    forEachNeighbor: forEachNeighbor,

	    /**
	     * For every pair closer than `radius`: `s = rule(i, j, r, store)` adds `s * (pos_i - pos_j)`
	     * to the force of `i` and the opposite to `j`. When not `symmetric`, the rule is asked for
	     * (i, j) and (j, i), and each answer moves only the first body. At r = 0 the force is `s`
	     * along an axis picked from i and j, and a non-finite `s` is skipped.
	     */
	    applyPairRule: applyPairRule,

	    cellSize: function () { return cellSize; },

	    /**
	     * The grid's arrays after build(), for generated loops over pairs (see formulaStages.js):
	     * bodies sorted by bucket, where each bucket starts, cell coordinates of every body, and the
	     * 3^D offsets to neighbor cells. Cells hash into buckets as in `hash()` below.
	     */
	    internals: function () {
	      return {
	        n: n, cells: cells, bucketStart: bucketStart, sorted: sorted, tableMask: tableMask,
	        offsets: offsets, offsetCount: offsetCount
	      };
	    }
	  };
	  return api;

	  function build(bodyStore, size) {
	    if (!(size > 0)) throw new Error('Grid cells need a positive size');
	    store = bodyStore;
	    pos = bodyStore.pos;
	    n = bodyStore.n;
	    cellSize = size;
	    if (cells.length < n * D) {
	      cells = new Int32Array(n * D);
	      bucketOf = new Int32Array(n);
	      sorted = new Int32Array(n);
	    }
	    var tableSize = 1;
	    while (tableSize < 2 * n) tableSize *= 2;
	    if (bucketStart.length !== tableSize + 1) bucketStart = new Int32Array(tableSize + 1);
	    else bucketStart.fill(0);
	    tableMask = tableSize - 1;

	    for (var i = 0; i < n; ++i) {
	      for (var k = 0; k < D; ++k) cells[i * D + k] = Math.floor(pos[i * D + k] / size);
	      var bucket = hash(cells, i * D);
	      bucketOf[i] = bucket;
	      bucketStart[bucket + 1] += 1;
	    }
	    for (var b = 0; b < tableSize; ++b) bucketStart[b + 1] += bucketStart[b];
	    // counting sort: `next` is the next free slot of each bucket
	    if (next.length !== tableSize) next = new Int32Array(tableSize);
	    next.set(bucketStart.subarray(0, tableSize));
	    for (i = 0; i < n; ++i) sorted[next[bucketOf[i]]++] = i;
	    return api;
	  }

	  function hash(coordinates, offset) {
	    var h = 0x165667b1;
	    for (var k = 0; k < D; ++k) {
	      h = Math.imul(h ^ coordinates[offset + k], 0x27d4eb2d);
	      h ^= h >>> 15;
	    }
	    return h & tableMask;
	  }

	  function sameCell(j) {
	    for (var k = 0; k < D; ++k) if (cells[j * D + k] !== neighborCell[k]) return false;
	    return true;
	  }

	  function distance(i, j) {
	    var r2 = 0;
	    for (var k = 0; k < D; ++k) {
	      var d = pos[i * D + k] - pos[j * D + k];
	      r2 += d * d;
	    }
	    return Math.sqrt(r2);
	  }

	  // Bucket of the o-th neighbor cell of body i (the cell itself is in `neighborCell`)
	  function neighborBucket(i, o) {
	    for (var k = 0; k < D; ++k) neighborCell[k] = cells[i * D + k] + offsets[o * D + k];
	    return hash(neighborCell, 0);
	  }

	  function forEachNeighbor(i, radius, fn) {
	    for (var o = 0; o < offsetCount; ++o) {
	      var bucket = neighborBucket(i, o);
	      for (var s = bucketStart[bucket], end = bucketStart[bucket + 1]; s < end; ++s) {
	        var j = sorted[s];
	        // a bucket can hold bodies of other cells too
	        if (j === i || !sameCell(j)) continue;
	        var r = distance(i, j);
	        if (r < radius) fn(j, r);
	      }
	    }
	  }

	  function forEachPair(radius, fn) {
	    for (var i = 0; i < n; ++i) {
	      for (var o = 0; o < offsetCount; ++o) {
	        var bucket = neighborBucket(i, o);
	        for (var s = bucketStart[bucket], end = bucketStart[bucket + 1]; s < end; ++s) {
	          var j = sorted[s];
	          // each pair once; a bucket can hold bodies of other cells too
	          if (j <= i || !sameCell(j)) continue;
	          var r = distance(i, j);
	          if (r < radius) fn(i, j, r);
	        }
	      }
	    }
	  }

	  function applyPairRule(radius, rule, symmetric) {
	    var force = store.force;
	    forEachPair(radius, function (i, j, r) {
	      var s = rule(i, j, r, store);
	      var t = symmetric ? s : rule(j, i, r, store);
	      if (!s && !t) return;
	      if (r === 0) {
	        // Same spot: push by s and t along an axis picked from i < j, as the dual tree does
	        var axis = (((i * 2654435761) ^ (j * 40503)) >>> 0) % D;
	        if (Number.isFinite(s)) force[i * D + axis] -= s;
	        if (Number.isFinite(t)) force[j * D + axis] += t;
	        return;
	      }
	      for (var k = 0; k < D; ++k) {
	        var d = pos[i * D + k] - pos[j * D + k];
	        force[i * D + k] += s * d;
	        force[j * D + k] -= t * d;
	      }
	    });
	  }
	}
	return createNeighborGrid_1;
}

var generateDualTree = {exports: {}};

var hasRequiredGenerateDualTree;

function requireGenerateDualTree () {
	if (hasRequiredGenerateDualTree) return generateDualTree.exports;
	hasRequiredGenerateDualTree = 1;
	generateDualTree.exports = generateDualTreeFunction;
	// InlineTransformBody: generateDualTreeFunctionBody
	generateDualTree.exports.generateDualTreeFunctionBody = generateDualTreeFunctionBody;

	/**
	 * Dual tree traversal for the n-body force (an alternative to the Barnes-Hut quad tree).
	 *
	 * Instead of walking the tree once per body, it walks pairs of cells. When two cells are
	 * far enough from each other, they exchange their field once (both ways), and remember it
	 * as a field plus its gradient (a first order "local expansion") at the cell's center of
	 * mass. When two leaves are close, their bodies interact directly (again, both ways). One
	 * final pass pushes the local expansions down the tree to the bodies.
	 *
	 * The tree is 2^dimension-ary, with up to LEAF_SIZE bodies per leaf. Nodes are stored in
	 * flat typed arrays in preorder, and children are found through skip links (first child is
	 * `node + 1`, next sibling is `skip[child]`), so any dimension works without allocating
	 * 2^dimension child slots. Bodies are kept in tree order between steps, which makes the
	 * next partitioning cheap.
	 */
	function generateDualTreeFunction(dimension, law) {
	  let code = generateDualTreeFunctionBody(dimension, law);
	  return (new Function(code))();
	}

	/**
	 * `law` is a repulsion law (see repulsionLaw.js). Without one, bodies push as 1/r^2.
	 */
	function generateDualTreeFunctionBody(dimension, law) {
	  let customLaw = law && !law.isDefault;
	  let hasRange = customLaw && law.hasRange;
	  let axes = [];
	  for (let k = 0; k < dimension; ++k) axes.push(k);
	  // Repeats `template(k)` for every axis k. The axis index lets us address flat arrays.
	  let each = (template, join) => axes.map(template).join(join === undefined ? '\n' : join);

	  // Symmetric gradient (Jacobian) of the field is stored as its upper triangle:
	  let pairs = [];
	  for (let a = 0; a < dimension; ++a) {
	    for (let b = a; b < dimension; ++b) pairs.push([a, b]);
	  }
	  let pairIndex = (a, b) => pairs.findIndex(([p, q]) => (p === a && q === b) || (p === b && q === a));
	  // (J * h)[k], where J is read from `j{e}` variables
	  let jacobianTimes = (k, h) => axes.map(m => `j${pairIndex(k, m)} * ${h}${m}`).join(' + ');

	  // Some dimensions get more accurate approximation from the same theta than the quad tree.
	  // These scales make `theta` give about the same accuracy as the quad tree, while being faster.
	  let thetaScale = dimension === 2 ? 0.875 : 1;

	  let code = `
var D = ${dimension};
var JN = ${pairs.length};
var LEAF_SIZE = 16;
var MAX_DEPTH = 60;
var THETA_SCALE = ${thetaScale};

return function createDualTree(settings, law) {
  // Values of the law's parameters, refreshed by the simulator every step:
  var lawValues = law ? law.values : null;
  var lawFunctions = law ? law.functions : null;
  var n = 0;
  // Body index of the k-th body in tree order, and the other way around:
  var order, rank;
  // Positions, masses and fields of bodies in tree order:
  var pos, mass, field;
  // Tree topology (grows as needed):
  var nodeCapacity = 0, nodeCount = 0;
  var nodeStart, nodeEnd, nodeSkip;
  // Per node data:
  var dataCapacity = 0;
  var nodeMass, nodeCenter, nodeRadius, localField, localJacobian;

  var cellMin = [], cellSide = new Float64Array(MAX_DEPTH + 2);
  for (var depth = 0; depth < MAX_DEPTH + 2; ++depth) cellMin.push(new Float64Array(D));

  var stack = new Int32Array(1 << 12);

  return {
    computeForces: computeForces
  };

  // Adds the push to the force of every body that is not pinned. \`charge\` is the column of
  // charges (masses by default): how hard bodies push. \`sensitivity\` is how strongly they
  // feel the push (the charge by default).
  function computeForces(store, charge, sensitivity) {
    if (store.n === 0) return;
    charge = charge || store.mass;
    sensitivity = sensitivity || charge;
    buildTree(store, charge);
    walk(settings.theta * THETA_SCALE);
    pushDown();

    var gravity = settings.gravity;
    var force = store.force, pinned = store.pinned;
    for (var i = 0; i < n; ++i) {
      if (pinned[i]) continue;
      var k = rank[i];
      var g = gravity * sensitivity[i];
      ${each(k => `force[i * D + ${k}] += g * field[k * D + ${k}];`, '\n      ')}
    }
  }

  function ensureBodies(count) {
    if (count === n && order) return;
    n = count;
    order = new Int32Array(n);
    rank = new Int32Array(n);
    for (var i = 0; i < n; ++i) order[i] = i;
    pos = new Float64Array(n * D);
    mass = new Float64Array(n);
    field = new Float64Array(n * D);
  }

  function newNode(start, end) {
    if (nodeCount === nodeCapacity) {
      nodeCapacity = Math.max(1024, nodeCapacity * 2);
      nodeStart = grow(Int32Array, nodeStart, nodeCapacity);
      nodeEnd = grow(Int32Array, nodeEnd, nodeCapacity);
      nodeSkip = grow(Int32Array, nodeSkip, nodeCapacity);
    }
    var node = nodeCount++;
    nodeStart[node] = start;
    nodeEnd[node] = end;
    return node;
  }

  function ensureNodeData() {
    if (nodeCount <= dataCapacity) return;
    dataCapacity = nodeCapacity;
    nodeMass = new Float64Array(dataCapacity);
    nodeCenter = new Float64Array(dataCapacity * D);
    nodeRadius = new Float64Array(dataCapacity);
    localField = new Float64Array(dataCapacity * D);
    localJacobian = new Float64Array(dataCapacity * JN);
  }

  function buildTree(store, bodyMass) {
    ensureBodies(store.n);

    ${each(k => `var min${k} = Infinity, max${k} = -Infinity;`, '\n    ')}
    // Bodies are read in their own order (it is cheaper to jump in the tree order arrays):
    var bodyPos = store.pos;
    for (var i = 0; i < n; ++i) rank[order[i]] = i;
    for (var i = 0; i < n; ++i) {
      var k = rank[i];
      mass[k] = bodyMass[i];
      ${each(k => `var p${k} = bodyPos[i * D + ${k}]; pos[k * D + ${k}] = p${k};`, '\n      ')}
      ${each(k => `if (p${k} < min${k}) min${k} = p${k}; if (p${k} > max${k}) max${k} = p${k};`, '\n      ')}
    }

    var side = 0;
    ${each(k => `if (max${k} - min${k} > side) side = max${k} - min${k};`, '\n    ')}
    ${each(k => `cellMin[0][${k}] = min${k};`, ' ')}
    cellSide[0] = side * (1 + 1e-9) + 1e-9;
    nodeCount = 0;
    buildNode(0, n, 0);
    for (var i = 0; i < n; ++i) rank[order[i]] = i;
    ensureNodeData();

    // Children come after parents, so we can aggregate bottom up in reverse order:
    for (var node = nodeCount - 1; node >= 0; --node) {
      var m = 0, r = 0;
      ${each(k => `var s${k} = 0;`, ' ')}
      if (nodeSkip[node] === node + 1) {
        // Leaf: center of mass of its bodies, radius is the farthest body.
        var start = nodeStart[node], end = nodeEnd[node];
        for (var k = start; k < end; ++k) {
          var w = mass[k];
          m += w;
          ${each(k => `s${k} += w * pos[k * D + ${k}];`, ' ')}
        }
        var weight = m;
        if (m === 0) {
          // No charge here (it pushes nobody): the plain middle of its bodies
          ${each(k => `s${k} = 0;`, ' ')}
          for (var k = start; k < end; ++k) { ${each(k => `s${k} += pos[k * D + ${k}];`, ' ')} }
          weight = end - start;
        }
        ${each(k => `var c${k} = s${k} / weight;`, ' ')}
        var r2 = 0;
        for (var k = start; k < end; ++k) {
          ${each(k => `var h${k} = pos[k * D + ${k}] - c${k};`, ' ')}
          var q2 = ${each(k => `h${k} * h${k}`, ' + ')};
          if (q2 > r2) r2 = q2;
        }
        r = Math.sqrt(r2);
      } else {
        // Internal node: aggregate children, radius bounds every child's sphere.
        var skip = nodeSkip[node];
        for (var c = node + 1; c < skip; c = nodeSkip[c]) {
          var w = nodeMass[c];
          m += w;
          ${each(k => `s${k} += w * nodeCenter[c * D + ${k}];`, ' ')}
        }
        var weight = m;
        if (m === 0) {
          ${each(k => `s${k} = 0;`, ' ')}
          weight = 0;
          for (var c = node + 1; c < skip; c = nodeSkip[c]) {
            var count = nodeEnd[c] - nodeStart[c];
            weight += count;
            ${each(k => `s${k} += count * nodeCenter[c * D + ${k}];`, ' ')}
          }
        }
        ${each(k => `var c${k} = s${k} / weight;`, ' ')}
        for (var c = node + 1; c < skip; c = nodeSkip[c]) {
          ${each(k => `var h${k} = nodeCenter[c * D + ${k}] - c${k};`, ' ')}
          var q = Math.sqrt(${each(k => `h${k} * h${k}`, ' + ')}) + nodeRadius[c];
          if (q > r) r = q;
        }
      }
      nodeMass[node] = m;
      nodeRadius[node] = r;
      ${each(k => `nodeCenter[node * D + ${k}] = c${k}; localField[node * D + ${k}] = 0;`, '\n      ')}
      for (var t = 0; t < JN; ++t) localJacobian[node * JN + t] = 0;
    }
    for (var k = 0; k < n * D; ++k) field[k] = 0;
  }

  function buildNode(start, end, depth) {
    var node = newNode(start, end);
    if (end - start > LEAF_SIZE && depth < MAX_DEPTH) splitAxis(start, end, D - 1, 0, depth);
    nodeSkip[node] = nodeCount;
  }

  // Splits bodies of a cell one axis at a time; each non empty orthant becomes a child.
  function splitAxis(start, end, axis, bits, depth) {
    if (axis < 0) {
      var parentMin = cellMin[depth], childMin = cellMin[depth + 1], half = cellSide[depth] / 2;
      ${each(k => `childMin[${k}] = parentMin[${k}] + ((bits >> ${k}) & 1) * half;`, '\n      ')}
      cellSide[depth + 1] = half;
      buildNode(start, end, depth + 1);
      return;
    }
    var mid = partition(start, end, axis, cellMin[depth][axis] + cellSide[depth] / 2);
    if (start < mid) splitAxis(start, mid, axis - 1, bits, depth);
    if (mid < end) splitAxis(mid, end, axis - 1, bits | (1 << axis), depth);
  }

  // Bodies that are already on the correct side cost no swaps, so keeping the
  // order from the previous step makes this cheap.
  function partition(start, end, axis, pivot) {
    var i = start, j = end - 1;
    while (true) {
      while (i <= j && pos[i * D + axis] < pivot) i++;
      while (i <= j && pos[j * D + axis] >= pivot) j--;
      if (i >= j) return i;
      var t = order[i]; order[i] = order[j]; order[j] = t;
      t = mass[i]; mass[i] = mass[j]; mass[j] = t;
      var a = i * D, b = j * D;
      ${each(k => `t = pos[a + ${k}]; pos[a + ${k}] = pos[b + ${k}]; pos[b + ${k}] = t;`, '\n      ')}
      i++; j--;
    }
  }

  function push(a, b, top) {
    if (top + 2 > stack.length) stack = grow(Int32Array, stack, stack.length * 2);
    stack[top] = a;
    stack[top + 1] = b;
    return top + 2;
  }

  function walk(theta) {
    var theta2 = theta * theta;
    ${customLaw ? 'var r, k1, k2; ' + law.prologue('lawValues') : ''}
    var top = push(0, 0, 0);
    while (top) {
      top -= 2;
      var a = stack[top], b = stack[top + 1];
      var skipA = nodeSkip[a];
      if (a === b) {
        // A cell with itself: all pairs of its children, and each child with itself.
        if (skipA === a + 1) {
          direct(nodeStart[a], nodeEnd[a], 0, nodeEnd[a], true);
          continue;
        }
        for (var c = a + 1; c < skipA; c = nodeSkip[c]) {
          top = push(c, c, top);
          for (var u = nodeSkip[c]; u < skipA; u = nodeSkip[u]) top = push(c, u, top);
        }
        continue;
      }

      ${each(k => `var d${k} = nodeCenter[b * D + ${k}] - nodeCenter[a * D + ${k}];`, ' ')}
      var r2 = ${each(k => `d${k} * d${k}`, ' + ')};
      var radiusA = nodeRadius[a], radiusB = nodeRadius[b], radii = radiusA + radiusB;
      ${hasRange ? `r = Math.sqrt(r2);
      // All pairs of these two cells are out of the law's range:
      if (r - radii > lawRange) continue;` : ''}
      if (radii * radii < theta2 * r2) {
        // Far enough: exchange fields of the two cells, both ways.
        ${customLaw ? `${hasRange ? '' : 'r = Math.sqrt(r2);'}
        ${law.emit(dimension, 'r', 'k1', 'k2')}
        var inv3 = k1, inv5 = k2;` : 'var inv2 = 1 / r2, inv3 = Math.sqrt(inv2) * inv2, inv5 = 3 * inv3 * inv2;'}
        var massA = nodeMass[a], massB = nodeMass[b];
        var fieldA = a * D, fieldB = b * D, jacobianA = a * JN, jacobianB = b * JN;
        ${each(k => `var k${k} = d${k} * inv3; localField[fieldA + ${k}] += massB * k${k}; localField[fieldB + ${k}] -= massA * k${k};`, '\n        ')}
        ${pairs.map(([p, q], e) => `var j${e} = d${p} * d${q} * inv5${p === q ? ' - inv3' : ''}; localJacobian[jacobianA + ${e}] += massB * j${e}; localJacobian[jacobianB + ${e}] += massA * j${e};`).join('\n        ')}
        continue;
      }

      var skipB = nodeSkip[b], isLeafA = skipA === a + 1, isLeafB = skipB === b + 1;
      if (isLeafA && isLeafB) {
        direct(nodeStart[a], nodeEnd[a], nodeStart[b], nodeEnd[b], false);
        continue;
      }
      // Too close: open the bigger cell.
      if (!isLeafA && (isLeafB || radiusA >= radiusB)) {
        for (var c = a + 1; c < skipA; c = nodeSkip[c]) top = push(c, b, top);
      } else {
        for (var c = b + 1; c < skipB; c = nodeSkip[c]) top = push(a, c, top);
      }
    }
  }

  // Exact interaction of bodies [startA, endA) with bodies [startB, endB), both ways.
  function direct(startA, endA, startB, endB, sameCell) {
    ${customLaw ? 'var r, k1; ' + law.prologue('lawValues') : ''}
    for (var i = startA; i < endA; ++i) {
      ${each(k => `var x${k} = pos[i * D + ${k}];`, ' ')}
      var massI = mass[i];
      ${each(k => `var a${k} = 0;`, ' ')}
      for (var j = sameCell ? i + 1 : startB; j < endB; ++j) {
        ${each(k => `var d${k} = pos[j * D + ${k}] - x${k};`, ' ')}
        var r2 = ${each(k => `d${k} * d${k}`, ' + ')};
        if (r2 === 0) {
          // Two bodies at the same position: push them apart as if they were a unit
          // distance apart, along an axis picked from their ids (deterministic and bounded).
          var lo = order[i] < order[j] ? order[i] : order[j];
          var hi = order[i] < order[j] ? order[j] : order[i];
          var axis = (((lo * 2654435761) ^ (hi * 40503)) >>> 0) % D;
          var sign = order[i] < order[j] ? 1 : -1;
          ${each(k => `d${k} = axis === ${k} ? sign : 0;`, ' ')}
          r2 = 1;
        }
        ${customLaw ? `r = Math.sqrt(r2);
        ${hasRange ? 'if (r > lawRange) continue;' : ''}
        ${law.emit(dimension, 'r', 'k1')}
        var inv3 = k1;` : 'var inv3 = 1 / (r2 * Math.sqrt(r2));'}
        var massJ = mass[j] * inv3, massII = massI * inv3;
        ${each(k => `a${k} += massJ * d${k}; field[j * D + ${k}] -= massII * d${k};`, '\n        ')}
      }
      ${each(k => `field[i * D + ${k}] += a${k};`, ' ')}
    }
  }

  // Pushes local expansions from parents to children, and from leaves to bodies.
  function pushDown() {
    for (var node = 0; node < nodeCount; ++node) {
      var offset = node * D, jacobian = node * JN, skip = nodeSkip[node];
      ${each(k => `var c${k} = nodeCenter[offset + ${k}], g${k} = localField[offset + ${k}];`, ' ')}
      ${pairs.map((_, e) => `var j${e} = localJacobian[jacobian + ${e}];`).join(' ')}
      if (skip === node + 1) {
        for (var k = nodeStart[node], end = nodeEnd[node]; k < end; ++k) {
          ${each(k => `var h${k} = pos[k * D + ${k}] - c${k};`, ' ')}
          ${each(k => `field[k * D + ${k}] += g${k} + ${jacobianTimes(k, 'h')};`, '\n          ')}
        }
        continue;
      }
      for (var c = node + 1; c < skip; c = nodeSkip[c]) {
        var childOffset = c * D, childJacobian = c * JN;
        ${each(k => `var h${k} = nodeCenter[childOffset + ${k}] - c${k};`, ' ')}
        ${each(k => `localField[childOffset + ${k}] += g${k} + ${jacobianTimes(k, 'h')};`, '\n        ')}
        ${pairs.map((_, e) => `localJacobian[childJacobian + ${e}] += j${e};`).join(' ')}
      }
    }
  }
};

function grow(ArrayType, array, size) {
  var bigger = new ArrayType(size);
  if (array) bigger.set(array.subarray(0, Math.min(array.length, size)));
  return bigger;
}
`;
	  return code;
	}
	return generateDualTree.exports;
}

var generateFireIntegrator = {exports: {}};

var hasRequiredGenerateFireIntegrator;

function requireGenerateFireIntegrator () {
	if (hasRequiredGenerateFireIntegrator) return generateFireIntegrator.exports;
	hasRequiredGenerateFireIntegrator = 1;
	const createPatternBuilder = requireCreatePatternBuilder();
	const inertiaColumn = requireGenerateIntegrator().inertiaColumn;

	generateFireIntegrator.exports = generateFireIntegratorFunction;
	generateFireIntegrator.exports.generateFireIntegratorFunctionBody = generateFireIntegratorFunctionBody;

	/**
	 * FIRE (Fast Inertial Relaxation Engine, Bitzek et al. 2006) integrator.
	 *
	 * Instead of a constant drag, the whole system keeps its momentum while it moves
	 * "downhill" (total power F.v > 0), and velocities are steered towards forces. As soon
	 * as the system goes uphill, all velocities are zeroed and the system starts again from
	 * rest. Drag is not applied in this mode.
	 *
	 * Returns a factory: each simulator needs its own integrator, since FIRE keeps state. Forces
	 * are divided by the body column `inertia` (the mass by default).
	 */
	function generateFireIntegratorFunction(dimension, inertia) {
	  let code = generateFireIntegratorFunctionBody(dimension, inertia);
	  return new Function(code);
	}

	function generateFireIntegratorFunctionBody(dimension, inertia) {
	  let pattern = createPatternBuilder(dimension);
	  let code = `
  var ALPHA_START = 0.1;
  var ALPHA_DECAY = 0.99;
  var MIN_POSITIVE_STEPS = 5;

  var alpha = ALPHA_START;
  var positiveSteps = 0;

  return function integrate(store, timeStep, adaptiveTimeStepWeight, maxVelocity) {
    var length = store.n;
    if (length === 0) return 0;
    var pos = store.pos, velocity = store.velocity, force = store.force, mass = ${inertiaColumn(inertia)};
    var pinned = store.pinned, springCount = store.springCount, springLength = store.springLength;

    var i, offset;
    var power = 0, velocityNorm = 0, forceNorm = 0;
    for (i = 0; i < length; ++i) {
      if (pinned[i]) continue;
      offset = i * ${dimension};
      ${pattern('var f{var} = force[offset{+k}], v{var} = velocity[offset{+k}];', {indent: 6})}
      power += ${pattern('f{var} * v{var}', {join: ' + '})};
      velocityNorm += ${pattern('v{var} * v{var}', {join: ' + '})};
      forceNorm += ${pattern('f{var} * f{var}', {join: ' + '})};
    }

    if (power > 0) {
      // Going downhill: steer velocities towards forces, and trust momentum more over time.
      var keep = 1 - alpha;
      var mix = forceNorm > 0 ? alpha * Math.sqrt(velocityNorm / forceNorm) : 0;
      for (i = 0; i < length; ++i) {
        if (pinned[i]) continue;
        offset = i * ${dimension};
        ${pattern('velocity[offset{+k}] = keep * velocity[offset{+k}] + mix * force[offset{+k}];', {indent: 8})}
      }
      positiveSteps += 1;
      if (positiveSteps > MIN_POSITIVE_STEPS) alpha *= ALPHA_DECAY;
    } else {
      // Going uphill (we overshot): stop everything and start from rest.
      for (i = 0; i < length; ++i) {
        if (pinned[i]) continue;
        offset = i * ${dimension};
        ${pattern('velocity[offset{+k}] = 0;', {indent: 8})}
      }
      positiveSteps = 0;
      alpha = ALPHA_START;
    }

    ${pattern('var d{var} = 0, t{var} = 0;', {indent: 4})}
    var maxV = maxVelocity > 0 ? maxVelocity : 1;

    for (i = 0; i < length; ++i) {
      if (pinned[i]) continue;

      var dt = timeStep;
      if (adaptiveTimeStepWeight && springCount[i]) {
        dt = (adaptiveTimeStepWeight * springLength[i]/springCount[i]);
      }

      var coeff = dt / mass[i];
      offset = i * ${dimension};

      ${pattern('velocity[offset{+k}] += coeff * force[offset{+k}];', {indent: 6})}
      ${pattern('var u{var} = velocity[offset{+k}];', {indent: 6})}
      var v = Math.sqrt(${pattern('u{var} * u{var}', {join: ' + '})});

      if (v > maxV) {
        ${pattern('velocity[offset{+k}] = maxV * u{var} / v;', {indent: 8})}
      }

      ${pattern('d{var} = dt * velocity[offset{+k}];', {indent: 6})}

      ${pattern('pos[offset{+k}] += d{var};', {indent: 6})}

      ${pattern('t{var} += Math.abs(d{var});', {indent: 6})}
    }

    return (${pattern('t{var} * t{var}', {join: ' + '})})/length;
  };
`;
	  return code;
	}
	return generateFireIntegrator.exports;
}

var formulaStages = {};

/**
 * Stages written as formulas (see formula.js). The simulator owns the loops; a formula says what
 * happens to one body, one link, or one pair of close bodies:
 *
 *  - node: runs for every body. It reads the body's columns by name (`mass`, `pos`, `force`,
 *    ...) and assigns to them;
 *  - link: runs for every link (spring). It reads the distance `r`, the link's `length` and
 *    `coefficient` (with the simulator's settings filled in), the link's own columns, and the
 *    columns of its two bodies as `name_i` (the `from` body) and `name_j` (the `to` body). It
 *    sets `pull`, the force that pulls the two bodies together (negative pushes them apart);
 *  - pair: runs for every pair of bodies closer than a radius. It reads `r` and `name_i`,
 *    `name_j`, and sets `push`, the force that pushes the two apart;
 *  - sum: adds up a formula over bodies or links (or takes its min or max), for all of them or
 *    per group, so that later formulas can read the result by name (`total`, or `total[group]`
 *    for a sum per group).
 *
 * What a write means depends on its operator, the same way on every engine: `x = v` replaces
 * the value, `x += v` and `x -= v` add onto the value `x` has when the stage starts. Link and pair
 * formulas add into body columns as `name_i += ...`; a stage's `startAtZero: ['name']` sets such
 * columns to 0 first, so they hold what this pass added up. Formulas never move bodies (`pos` is
 * read only), and a link or pair formula cannot read a column it adds into, as it would see a
 * partial sum.
 *
 * Every formula can read its `params` (numbers, or functions of the step context read once per
 * step), its lookup `tables`, the sums added before it, and the names every formula knows (see
 * formula.js). With `when` (an expression of `step`, the params and the settings) the stage runs
 * only on the steps where it holds. Each stage is compiled into one function with the formula
 * inside its loop, so it costs what the formula's arithmetic costs.
 *
 * A stage also describes itself as plain data (see simulator.program()): what it reads and
 * writes, how, its params and options.
 */

var hasRequiredFormulaStages;

function requireFormulaStages () {
	if (hasRequiredFormulaStages) return formulaStages;
	hasRequiredFormulaStages = 1;
	var formula = requireFormula();
	var BUILT_IN_VALUES = formula.BUILT_IN_VALUES;

	formulaStages.node = createNodeStage;
	formulaStages.link = createLinkStage;
	formulaStages.pair = createPairStage;
	formulaStages.sum = createSumStage;
	formulaStages.gate = createGate;
	formulaStages.describeValue = describeValue;

	// Generated code is shared by stages with the same code
	var codeCache = Object.create(null);

	// Columns of a spring store that link formulas see through `length` and `coefficient`, or not
	var LINK_BUILT_INS = { from: true, to: true, length: true, coefficient: true };
	// Body columns that formulas do not see: counters of the adaptive time step (`springLength` in a
	// formula is the setting; `degree` counts springs)
	var HIDDEN_BODY_COLUMNS = { springCount: true, springLength: true };
	// Columns that `startAtZero` never zeroes: the state of bodies
	var STATE_COLUMNS = { pos: true, velocity: true, force: true };
	var WRITE_MODES = { '=': 'set', '+=': 'add', '-=': 'add', '*=': 'scale', '/=': 'scale' };
	// A line of generated code that stands for the stage's prologue (its params, columns, sums and
	// tables), for stages whose loops are functions of their own. Such code makes its functions once
	// and returns the stage's run.
	var PROLOGUE = '$prologue$';

	/**
	 * Formula for every body. Returns {run, describe, values}.
	 */
	function createNodeStage(simulator, name, options) {
	  var context = createContext(simulator, name, options);
	  var scope = context.scope(bodyNames(context, '$i', '$o', 'any'));
	  var compiled = compileFormula(options.formula, scope, name);
	  var lines = context.prologue();
	  lines.push('var $n = $store.n;');
	  lines.push('for (var $i = 0; $i < $n; ++$i) {');
	  lines.push('  var $o = $i * ' + context.D + ';');
	  indent(compiled.lines, lines);
	  lines.push('}');
	  return context.stage(lines, 'node', 'nodes');
	}

	/**
	 * Formula for every link. With `options.replace === 'springs'` it takes the place of the stock
	 * springs: it then also keeps the counters of the adaptive time step.
	 */
	function createLinkStage(simulator, name, options) {
	  var context = createContext(simulator, name, options);
	  var D = context.D;
	  var accumulated = [];
	  var names = linkNames(context, accumulated);
	  var setsPull = false, readsDistance = false;
	  names.r.onRead = function () { readsDistance = true; };
	  var writePull = assignment('$pull');
	  names.pull = { type: 'num', code: '$pull', write: function (op, value) { setsPull = true; return writePull(op, value); } };
	  var compiled = compileFormula(options.formula, context.scope(names), name);
	  context.checkAccumulators(accumulated);
	  var startAtZero = context.startAtZero(accumulated);
	  var withStats = options.replace === 'springs';
	  // In place of the springs it keeps their counters, which need the distance too
	  var pulls = setsPull || withStats;
	  if (pulls || readsDistance) readEnds(context, 'pos');

	  var lines;
	  if (pulls) {
	    lines = [];
	    pullingLinks(lines, compiled.lines, D, withStats, startAtZero.map(function (column) { return zeroColumn(context, column); }));
	    context.wrote({ space: 'nodes', column: 'force', mode: 'add', via: 'pull' });
	  } else {
	    // No pull: no force to add, and r only when the formula reads it (0 for ends on one spot)
	    lines = context.prologue();
	    zeroColumns(context, startAtZero, lines);
	    lines.push('var $from = $springs.from, $to = $springs.to, $restLength = $springs.length, $springCoefficient = $springs.coefficient;');
	    if (readsDistance) lines.push('var $pos = $store.pos;');
	    lines.push('var $defaultLength = $values.$springLength, $defaultCoefficient = $values.$springCoefficient;');
	    lines.push('for (var $s = $springs.n - 1; $s >= 0; --$s) {');
	    lines.push('  var $i = $from[$s], $j = $to[$s];');
	    lines.push('  var $oi = $i * ' + D + ', $oj = $j * ' + D + ';');
	    lines.push('  var $length = $restLength[$s] < 0 ? $defaultLength : $restLength[$s];');
	    if (readsDistance) {
	      lines.push('  ' + each(D, function (k) { return 'var $d' + k + ' = $pos[$oj + ' + k + '] - $pos[$oi + ' + k + '];'; }));
	      lines.push('  var $r = Math.sqrt(' + each(D, function (k) { return '$d' + k + ' * $d' + k; }, ' + ') + ');');
	    }
	    lines.push('  var $coefficient = $springCoefficient[$s] > 0 ? $springCoefficient[$s] : $defaultCoefficient;');
	    indent(compiled.lines, lines);
	    lines.push('}');
	  }
	  return context.stage(lines, 'link', 'links', {
	    replace: options.replace === undefined ? null : options.replace,
	    counters: false,
	    startAtZero: startAtZero
	  }, function (info) {
	    // In place of the stock springs it keeps their counters while the adaptive time step is on
	    if (!withStats || simulator.settings.adaptiveTimeStepWeight === 0) return;
	    info.args.counters = true;
	    info.writes.push({ space: 'nodes', column: 'springCount', mode: 'add' }, { space: 'nodes', column: 'springLength', mode: 'add' });
	  });
	}

	// The loop of a link stage that pulls. It has the same order and the same arithmetic as the stock
	// springs, so that the formula of the stock springs gives the same numbers, and like them it has
	// no calls: a link whose ends are on the same spot ends the loop, $sameSpot pulls it along a
	// random direction, and the loop goes on from the next link. The counters of the adaptive time
	// step have a loop of their own. The code makes these functions once and returns the stage's run
	// (see PROLOGUE).
	function pullingLinks(lines, formulaLines, D, withStats, zeroLines) {
	  var arrays = [
	    PROLOGUE,
	    'var $from = $springs.from, $to = $springs.to, $restLength = $springs.length, $springCoefficient = $springs.coefficient;',
	    'var $pos = $store.pos, $force = $store.force;',
	    'var $defaultLength = $values.$springLength, $defaultCoefficient = $values.$springCoefficient;'
	  ];
	  if (withStats) arrays.push('var $springCount = $store.springCount, $springLength = $store.springLength;');
	  var link = [
	    'var $i = $from[$s], $j = $to[$s];',
	    'var $oi = $i * ' + D + ', $oj = $j * ' + D + ';',
	    'var $length = $restLength[$s] < 0 ? $defaultLength : $restLength[$s];'
	  ];
	  var pull = ['var $coefficient = $springCoefficient[$s] > 0 ? $springCoefficient[$s] : $defaultCoefficient;', 'var $pull = 0;']
	    .concat(formulaLines)
	    .concat([
	      'var $k = $pull / $r;',
	      each(D, function (k) { return '$force[$oi + ' + k + '] += $k * $d' + k + ';'; }),
	      each(D, function (k) { return '$force[$oj + ' + k + '] -= $k * $d' + k + ';'; })
	    ]);
	  var counters = '$springCount[$i] += 1; $springLength[$i] += $r; $springCount[$j] += 1; $springLength[$j] += $r;';
	  var args = '$s, $store, $springs, $values, $sums, $tables';
	  var loop = function (functionName, stats) {
	    lines.push('function ' + functionName + '(' + args + ') {');
	    indent(arrays, lines);
	    lines.push('  while ($s--) {');
	    indent(link, lines, '    ');
	    lines.push('    ' + each(D, function (k) { return 'var $d' + k + ' = $pos[$oj + ' + k + '] - $pos[$oi + ' + k + '];'; }));
	    lines.push('    var $r = Math.sqrt(' + each(D, function (k) { return '$d' + k + ' * $d' + k; }, ' + ') + ');');
	    lines.push('    if ($r === 0) return $s;');
	    indent(pull, lines, '    ');
	    if (stats) lines.push('    ' + counters);
	    lines.push('  }');
	    lines.push('  return -1;');
	    lines.push('}');
	  };
	  loop('$links', false);
	  if (withStats) loop('$linksWithCounters', true);
	  lines.push('// ends on the same spot: pull along a random direction');
	  lines.push('function $sameSpot(' + args + ', $random) {');
	  indent(arrays, lines);
	  indent(link, lines);
	  lines.push('  ' + each(D, function (k) { return 'var $d' + k + ' = ($random.nextDouble() - 0.5) / 50;'; }));
	  lines.push('  var $r = Math.sqrt(' + each(D, function (k) { return '$d' + k + ' * $d' + k; }, ' + ') + ');');
	  indent(pull, lines);
	  if (withStats) lines.push('  if ($values.$stats) { ' + counters + ' }');
	  lines.push('}');
	  lines.push('return function ($store, $springs, $values, $sums, $tables, $random) {');
	  indent(zeroLines, lines);
	  lines.push('  var $loop = ' + (withStats ? '$values.$stats ? $linksWithCounters : $links' : '$links') + ';');
	  lines.push('  for (var $s = $springs.n; ($s = $loop(' + args + ')) >= 0;) $sameSpot(' + args + ', $random);');
	  lines.push('};');
	}

	/**
	 * Formula for every pair of bodies closer than `options.radius` (a number, an expression of the
	 * params, or a function of the step context; 0 or less skips the pass). With `options.symmetric`
	 * (the default) it runs once per pair, i being the lower row, and both bodies get the push.
	 * Otherwise it runs for (i, j) and for (j, i), and each run pushes only body i (and can only add
	 * into `name_i`).
	 *
	 * Bodies on the same spot (r = 0) have no direction to push along: such a pair pushes nothing
	 * and adds nothing up.
	 */
	function createPairStage(simulator, name, options) {
	  if (options.radius === undefined) throw new Error('Pair formula ' + name + ' needs a radius');
	  var context = createContext(simulator, name, options);
	  var D = context.D;
	  var symmetric = options.symmetric !== false;
	  var accumulated = [];
	  var forward = pairNames(context, accumulated, symmetric, false);
	  var compiled = compileFormula(options.formula, context.scope(forward), name);
	  var backward = null;
	  if (!symmetric) {
	    // The same formula with the roles of i and j swapped
	    backward = compileFormula(options.formula, context.scope(pairNames(context, [], false, true), true), name);
	  }
	  context.checkAccumulators(accumulated);
	  var startAtZero = context.startAtZero(accumulated);
	  readEnds(context, 'pos');
	  var radius = context.global(options.radius, 'radius');

	  var lines = context.prologue();
	  lines.push('var $radius = $values.$radius;');
	  // Most candidates are farther than the radius: a test of the squared distance spares them the
	  // root. Its small margin makes it drop only pairs the exact test drops, so it changes nothing;
	  // near underflow the margin would not hold, and there is no such test
	  lines.push('var $reach2 = $radius * $radius * (1 + 1e-12);');
	  lines.push('if (!($reach2 > 1e-290)) $reach2 = Infinity;');
	  zeroColumns(context, startAtZero, lines);
	  lines.push('if (!($radius > 0)) return;');
	  lines.push('var $grid = $simulator.neighbors($radius).internals();');
	  lines.push('var $n = $grid.n, $cells = $grid.cells, $bucketStart = $grid.bucketStart, $sorted = $grid.sorted;');
	  lines.push('var $tableMask = $grid.tableMask, $offsets = $grid.offsets, $offsetCount = $grid.offsetCount;');
	  lines.push('var $pos = $store.pos, $force = $store.force;');
	  // Walks pairs as the grid's forEachPair does: each pair once, i < j
	  lines.push('for (var $i = 0; $i < $n; ++$i) {');
	  lines.push('  var $oi = $i * ' + D + ';');
	  lines.push('  ' + each(D, function (k) { return 'var $c' + k + ' = $cells[$oi + ' + k + '];'; }));
	  lines.push('  ' + each(D, function (k) { return 'var $x' + k + ' = $pos[$oi + ' + k + '];'; }));
	  lines.push('  for (var $cell = 0; $cell < $offsetCount; ++$cell) {');
	  lines.push('    ' + each(D, function (k) { return 'var $m' + k + ' = $c' + k + ' + $offsets[$cell * ' + D + ' + ' + k + '];'; }));
	  lines.push('    var $hash = 0x165667b1;');
	  for (var axis = 0; axis < D; ++axis) lines.push('    $hash = Math.imul($hash ^ $m' + axis + ', 0x27d4eb2d); $hash ^= $hash >>> 15;');
	  lines.push('    var $bucket = $hash & $tableMask;');
	  lines.push('    for (var $at = $bucketStart[$bucket], $end = $bucketStart[$bucket + 1]; $at < $end; ++$at) {');
	  lines.push('      var $j = $sorted[$at];');
	  lines.push('      if ($j <= $i) continue;');
	  lines.push('      var $oj = $j * ' + D + ';');
	  lines.push('      // a bucket can hold bodies of other cells too');
	  lines.push('      if (' + each(D, function (k) { return '$cells[$oj + ' + k + '] !== $m' + k; }, ' || ') + ') continue;');
	  lines.push('      ' + each(D, function (k) { return 'var $d' + k + ' = $x' + k + ' - $pos[$oj + ' + k + '];'; }));
	  lines.push('      var $r2 = ' + each(D, function (k) { return '$d' + k + ' * $d' + k; }, ' + ') + ';');
	  lines.push('      if (!($r2 <= $reach2)) continue;');
	  lines.push('      var $r = Math.sqrt($r2);');
	  lines.push('      // bodies on the same spot have no direction to push along');
	  lines.push('      if (!($r < $radius) || $r === 0) continue;');
	  lines.push('      var $push = 0;');
	  lines.push('      {');
	  indent(compiled.lines, lines, '        ');
	  lines.push('      }');
	  lines.push('      var $pushI = $push;');
	  if (backward) {
	    lines.push('      $push = 0;');
	    lines.push('      {');
	    indent(backward.lines, lines, '        ');
	    lines.push('      }');
	  }
	  lines.push('      var $pushJ = $push;');
	  lines.push('      if (!$pushI && !$pushJ) continue;');
	  lines.push(symmetric ? '      var $si = $pushI / $r, $sj = $si;' : '      var $si = $pushI / $r, $sj = $pushJ / $r;');
	  lines.push('      ' + each(D, function (k) { return '$force[$oi + ' + k + '] += $si * $d' + k + ';'; }));
	  lines.push('      ' + each(D, function (k) { return '$force[$oj + ' + k + '] -= $sj * $d' + k + ';'; }));
	  lines.push('    }');
	  lines.push('  }');
	  lines.push('}');
	  context.wrote({ space: 'nodes', column: 'force', mode: 'add', via: 'push' });
	  return context.stage(lines, 'pair', 'pairs', {
	    radius: describeValue(radius),
	    symmetric: symmetric,
	    startAtZero: startAtZero
	  });
	}

	/**
	 * A sum over bodies (or links, with `options.over === 'links'`) of the formula's value, a number
	 * or a vector. `options.reduce` is 'sum' (the default), 'min' or 'max'. With `options.group`
	 * (the name of a body or link column) there is one result per group id 0, 1, 2, ...; rows whose
	 * group is negative are left out. Later formulas read the result as `name`, or `name[group]`
	 * (0 for a group that has no rows). A sum gated off by `when` keeps its last result.
	 *
	 * Returns {run, describe, values, result}: `result` holds `value` (an array of 1 or D numbers),
	 * and with groups `groups` (count * width numbers) and `count`.
	 */
	function createSumStage(simulator, name, options) {
	  var context = createContext(simulator, name, options);
	  var D = context.D;
	  var overLinks = options.over === 'links';
	  if (options.over !== undefined && options.over !== 'nodes' && !overLinks) throw new Error('Sum ' + name + ' should be over nodes or links');
	  var reduce = options.reduce || 'sum';
	  if (reduce !== 'sum' && reduce !== 'min' && reduce !== 'max') throw new Error('Sum ' + name + ': reduce should be sum, min or max');
	  var names = overLinks ? linkNames(context, null) : bodyNames(context, '$i', '$o', null);
	  var compiled = compileFormula(options.formula, context.scope(names), name);
	  if (overLinks) readEnds(context, 'pos');
	  var value = compiled.result;
	  if (!value) throw new Error('Sum ' + name + ' should end with the expression to add up');
	  var width = value.type === 'vec' ? D : 1;
	  var codes = value.codes || [value.code];
	  var start = reduce === 'sum' ? '0' : reduce === 'min' ? 'Infinity' : '-Infinity';
	  var group = options.group;
	  if (group !== undefined) {
	    var groupStore = overLinks ? simulator.springStore : simulator.store;
	    if (!groupStore.has(group)) throw new Error('Sum ' + name + ': no ' + (overLinks ? 'link' : 'body') + ' column named ' + group);
	    context.read({ space: overLinks ? 'links' : 'nodes', column: group, rows: 'own' });
	  }
	  var result = { width: width, grouped: group !== undefined, value: new Float64Array(width), groups: new Float64Array(0), count: 0 };
	  result.value.fill(+start);

	  var lines = context.prologue();
	  lines.push('var $result = $sums[' + JSON.stringify(name) + '];');
	  if (overLinks) {
	    lines.push('var $from = $springs.from, $to = $springs.to, $restLength = $springs.length, $springCoefficient = $springs.coefficient;');
	    lines.push('var $pos = $store.pos;');
	    lines.push('var $defaultLength = $values.$springLength, $defaultCoefficient = $values.$springCoefficient;');
	  }
	  var rows = overLinks ? '$springs.n' : '$store.n';
	  var row = overLinks ? '$s' : '$i';
	  var pad = '  ';
	  if (group !== undefined) {
	    // Groups are counted in the pass that adds up, starting from the last step's count (groups
	    // are host data and rarely change). A group id at or past it counts them all, then adds up
	    // again.
	    lines.push('var $group = ' + (overLinks ? '$springs' : '$store') + '[' + JSON.stringify(group) + '];');
	    lines.push('var $count = $result.count, $max = -1, ' + row + ';');
	    lines.push('for (;;) {');
	    lines.push('  var $acc = $result.resize($count);');
	    lines.push('  $max = -1;');
	    pad = '    ';
	  } else {
	    for (var slot = 0; slot < width; ++slot) lines.push('var $acc' + slot + ' = ' + start + ';');
	  }
	  var loop = [];
	  loop.push('for (' + row + ' = 0; ' + row + ' < ' + rows + '; ++' + row + ') {');
	  if (group !== undefined) {
	    loop.push('  var $g = $group[' + row + '];');
	    loop.push('  if (!($g >= 0)) continue;');
	    loop.push('  $g = Math.floor($g);');
	    loop.push('  if ($g >= $count) break;');
	    loop.push('  if ($g > $max) $max = $g;');
	    if (width > 1) loop.push('  $g *= ' + width + ';');
	  }
	  if (overLinks) {
	    loop.push('  var $i = $from[$s], $j = $to[$s];');
	    loop.push('  var $oi = $i * ' + D + ', $oj = $j * ' + D + ';');
	    loop.push('  var $length = $restLength[$s] < 0 ? $defaultLength : $restLength[$s];');
	    loop.push('  var $coefficient = $springCoefficient[$s] > 0 ? $springCoefficient[$s] : $defaultCoefficient;');
	    loop.push('  var $r = Math.sqrt(' + each(D, function (k) { return '($pos[$oj + ' + k + '] - $pos[$oi + ' + k + ']) * ($pos[$oj + ' + k + '] - $pos[$oi + ' + k + '])'; }, ' + ') + ');');
	  } else {
	    loop.push('  var $o = $i * ' + D + ';');
	  }
	  indent(compiled.lines, loop);
	  codes.forEach(function (code, k) {
	    var target = group !== undefined ? '$acc[$g + ' + k + ']' : '$acc' + k;
	    loop.push('  ' + target + ' = ' + (reduce === 'sum' ? target + ' + ' + code : 'Math.' + reduce + '(' + target + ', ' + code + ')') + ';');
	  });
	  loop.push('}');
	  if (group === undefined) {
	    loop[0] = loop[0].replace('for (', 'for (var ');
	    loop.forEach(function (line) { lines.push(line); });
	    for (slot = 0; slot < width; ++slot) lines.push('$result.value[' + slot + '] = $acc' + slot + ';');
	  } else {
	    indent(loop, lines, pad.slice(2));
	    lines.push('  if (' + row + ' === ' + rows + ') break;');
	    lines.push('  $count = 0;');
	    lines.push('  for (' + row + ' = 0; ' + row + ' < ' + rows + '; ++' + row + ') if ($group[' + row + '] >= $count) $count = Math.floor($group[' + row + ']) + 1;');
	    lines.push('}');
	    lines.push('$result.count = $max + 1;');
	  }
	  result.resize = function (count) {
	    if (result.groups.length < count * width) result.groups = new Float64Array(Math.max(count, 2 * result.count) * width);
	    result.count = count;
	    result.groups.fill(+start, 0, count * width);
	    return result.groups;
	  };
	  var stage = context.stage(lines, 'sum', overLinks ? 'links' : 'nodes', {
	    over: overLinks ? 'links' : 'nodes', reduce: reduce, group: group === undefined ? null : group, width: width
	  });
	  stage.result = result;
	  return stage;
	}

	/**
	 * A `when` for any stage: an expression of `step`, the settings and `params` (an object of
	 * numbers and functions of the step context), or a function of the step context. Returns
	 * {test(context), describe()}.
	 */
	function createGate(simulator, name, when, params) {
	  if (typeof when === 'function') {
	    return {
	      test: when,
	      describe: function () { return { kind: 'host' }; }
	    };
	  }
	  var context = createContext(simulator, name, { formula: '', params: params });
	  var gate = context.when(when);
	  return {
	    test: function (forStep) { return gate.test(forStep); },
	    describe: function () { return { kind: 'expression', text: when }; }
	  };
	}

	// A `when` that reads only built in values (step, settings) gives every stage that has it the same
	// answer: each distinct one is tested once per step of a simulator, and its stages share the
	// answer. Tests for other step contexts (engines asking about steps they queue) are not kept.
	var sharedGates = new WeakMap();
	function sharedGate(simulator, text, builtIns, holds) {
	  var gates = sharedGates.get(simulator);
	  if (!gates) sharedGates.set(simulator, gates = Object.create(null));
	  if (gates[text]) return gates[text];
	  var values = {}, lastContext = null, lastStep = -1, lastAnswer = false;
	  var gate = gates[text] = {
	    params: [],
	    builtIns: builtIns,
	    test: function (forStep, target) {
	      var step = forStep.iteration();
	      if (target === undefined && forStep === lastContext && step === lastStep) return lastAnswer;
	      var into = target || values;
	      for (var i = 0; i < builtIns.length; ++i) into['$' + builtIns[i]] = BUILT_IN_VALUES[builtIns[i]](forStep);
	      var answer = holds(into);
	      if (target === undefined) {
	        lastContext = forStep;
	        lastStep = step;
	        lastAnswer = answer;
	      }
	      return answer;
	    }
	  };
	  return gate;
	}

	// ---------------------------------------------------------------------------------------
	// What names mean
	// ---------------------------------------------------------------------------------------

	/**
	 * Columns of the body in row `row` (offset `offset` for vectors). `writes` is 'any' for node
	 * formulas (they assign to their own body), or null (read only).
	 */
	function bodyNames(context, row, offset, writes) {
	  var names = Object.create(null);
	  context.store.names().forEach(function (column) {
	    if (HIDDEN_BODY_COLUMNS[column]) return;
	    var described = bodyColumn(context, column, row, offset, writes ? null : [], null);
	    if (described) names[column] = described;
	  });
	  return names;
	}

	// `end` is null for the body's own row (node formulas), or 'i' or 'j' (link and pair formulas)
	function bodyColumn(context, column, row, offset, ops, end) {
	  var size = columnSize(context.store, column);
	  var array = '$c_' + column;
	  var target;
	  var described;
	  if (size === 1) {
	    target = array + '[' + row + ']';
	    described = { type: 'num', code: target };
	  } else if (size === context.D) {
	    target = [];
	    for (var k = 0; k < size; ++k) target.push(array + '[' + offset + ' + ' + k + ']');
	    described = { type: 'vec', codes: target };
	  } else {
	    return null;
	  }
	  described.write = ops && ops.length === 0 ? null : recordedAssignment(context, target, { space: 'nodes', column: column, end: end });
	  if (ops) described.ops = ops;
	  // marked as used when the formula names it
	  described.column = column;
	  described.end = end;
	  return described;
	}

	// Names of link formulas (and sums over links). `accumulated` collects the body columns that the
	// formula adds into (null: read only).
	function linkNames(context, accumulated) {
	  var names = Object.create(null);
	  names.r = { type: 'num', code: '$r' };
	  names.length = { type: 'num', code: '$length', builtInColumn: 'length' };
	  names.coefficient = { type: 'num', code: '$coefficient', builtInColumn: 'coefficient' };
	  if (accumulated) {
	    // A link formula sets its link's own spring with =; negative lengths and coefficients <= 0
	    // still mean the settings
	    names.length.ops = names.coefficient.ops = ['='];
	    names.length.write = ownSpring(context, 'length', '$restLength', '$length', '$restLength[$s] < 0 ? $defaultLength : $restLength[$s]');
	    names.coefficient.write = ownSpring(context, 'coefficient', '$springCoefficient', '$coefficient',
	      '$springCoefficient[$s] > 0 ? $springCoefficient[$s] : $defaultCoefficient');
	  }
	  context.springStore.names().forEach(function (column) {
	    if (LINK_BUILT_INS[column]) return;
	    if (names[column]) throw new Error('Link column ' + column + ' has the name of a value link formulas know');
	    var array = '$l_' + column;
	    names[column] = {
	      type: 'num', code: array + '[$s]', linkColumn: column,
	      write: accumulated ? recordedAssignment(context, array + '[$s]', { space: 'links', column: column, end: null }) : null
	    };
	  });
	  addEnds(context, names, accumulated, true, false);
	  return names;
	}

	function pairNames(context, accumulated, symmetric, swapped) {
	  var names = Object.create(null);
	  names.r = { type: 'num', code: '$r' };
	  names.push = { type: 'num', code: '$push', write: assignment('$push') };
	  addEnds(context, names, accumulated, symmetric, swapped);
	  return names;
	}

	// `name_i` and `name_j` for every body column. Formulas can add into them, and both ends only
	// when `bothEnds`.
	function addEnds(context, names, accumulated, bothEnds, swapped) {
	  var ends = swapped ? [['_i', '$j', '$oj'], ['_j', '$i', '$oi']] : [['_i', '$i', '$oi'], ['_j', '$j', '$oj']];
	  context.store.names().forEach(function (column) {
	    if (HIDDEN_BODY_COLUMNS[column]) return;
	    ends.forEach(function (end) {
	      var canAdd = accumulated && (end[0] === '_i' || bothEnds);
	      var described = bodyColumn(context, column, end[1], end[2], canAdd ? ['+=', '-='] : [], end[0].slice(1));
	      if (!described) return;
	      if (canAdd) {
	        var write = described.write;
	        described.write = function (op, value) {
	          if (accumulated.indexOf(column) < 0) accumulated.push(column);
	          return write(op, value);
	        };
	      }
	      names[column + end[0]] = described;
	    });
	  });
	}

	function assignment(target) {
	  var targets = Array.isArray(target) ? target : [target];
	  return function (op, value) {
	    var codes = value.codes || [value.code];
	    return targets.map(function (code, k) { return code + ' ' + op + ' ' + codes[k] + ';'; });
	  };
	}

	// An assignment to a column, recorded for the stage's description. Formulas never move bodies.
	function recordedAssignment(context, target, write) {
	  var lines = assignment(target);
	  return function (op, value) {
	    if (write.space === 'nodes' && write.column === 'pos') {
	      throw new Error('pos is read only in formulas: only integrate and host steps move bodies');
	    }
	    context.wrote({ space: write.space, column: write.column, mode: WRITE_MODES[op], op: op, end: write.end });
	    return lines(op, value);
	  };
	}

	// Writes a link's own spring setting, and what the rest of the formula reads as it
	function ownSpring(context, column, array, local, fallback) {
	  return function (op, value) {
	    context.wrote({ space: 'links', column: column, mode: WRITE_MODES[op], op: op });
	    return [array + '[$s] = ' + value.code + ';', local + ' = ' + fallback + ';'];
	  };
	}

	// Every link and pair stage reads the positions of both ends, for r
	function readEnds(context, column) {
	  context.read({ space: 'nodes', column: column, rows: 'other', end: 'i' });
	  context.read({ space: 'nodes', column: column, rows: 'other', end: 'j' });
	}

	function columnSize(store, column) {
	  return store.sizeOf(column);
	}

	// Columns listed in a stage's `startAtZero` start each pass at 0
	function zeroColumns(context, columns, lines) {
	  columns.forEach(function (column) { lines.push(zeroColumn(context, column)); });
	}

	function zeroColumn(context, column) {
	  return '$store[' + JSON.stringify(column) + '].fill(0, 0, $store.n * ' + columnSize(context.store, column) + ');';
	}

	/**
	 * A value of a stage as plain data: {kind: 'number', value}, {kind: 'expression', text}, or
	 * {kind: 'host'} for a function (it has no body here; engines call it with the step context).
	 */
	function describeValue(spec) {
	  if (typeof spec === 'number') return { kind: 'number', value: spec };
	  if (typeof spec === 'string') return { kind: 'expression', text: spec };
	  return { kind: 'host' };
	}

	// ---------------------------------------------------------------------------------------
	// What every formula stage shares
	// ---------------------------------------------------------------------------------------

	function createContext(simulator, name, options) {
	  if (!options || typeof options.formula !== 'string') throw new Error('Formula stage ' + name + ' needs a `formula` string');
	  var store = simulator.store;
	  var D = store.D;
	  // Parameter functions get the step context, never the simulator: other engines call them
	  // for steps they queue
	  var stepContext = simulator.stepContext();
	  var params = options.params || {};
	  var paramNames = Object.keys(params);
	  var tables = {};
	  Object.keys(options.tables || {}).forEach(function (table) {
	    tables[table] = formula.createTable(table, options.tables[table]);
	  });
	  var sums = simulator.sums();
	  paramNames.forEach(function (param) {
	    if (!/^[A-Za-z_]\w*$/.test(param)) throw new Error('Bad parameter name ' + param + ' in ' + name);
	    if (store.has(param) || tables[param] || sums[param] || BUILT_IN_VALUES[param] || param === 'D' || param === 'pi') {
	      throw new Error('Parameter ' + param + ' of ' + name + ' has the name of a column, table, sum or built in value');
	    }
	  });

	  var prologue = [];
	  var usedParams = Object.create(null), usedBuiltIns = [], usedSums = Object.create(null);
	  var usedColumns = Object.create(null), usedLinkColumns = Object.create(null);
	  var globals = [];
	  var values = {};
	  var gate = null;
	  var reads = [], writes = [];
	  var context = {
	    D: D,
	    store: store,
	    springStore: simulator.springStore,
	    // `swapped`: the scope of a one-sided pair formula with i and j swapped, which reads the same
	    // columns as the formula itself
	    scope: function (names, swapped) {
	      return { D: D, name: function (key, assigned) { return resolve(names, key, assigned || swapped); } };
	    },
	    // A value of the stage read once per step, as `$values.$<key>`: a number, a function of the
	    // step context, or an expression of the params and built in values
	    global: function (spec, key) {
	      if (typeof spec === 'number' || typeof spec === 'function') {
	        globals.push({ key: key, read: spec });
	        return spec;
	      }
	      if (typeof spec !== 'string') throw new Error(key + ' of ' + name + ' should be a number, a function or an expression');
	      var compiled = compileFormula(spec, { D: D, name: globalName }, name);
	      if (!compiled.result || compiled.result.type !== 'num') throw new Error(key + ' of ' + name + ' should be an expression giving a number');
	      var code = compiled.lines.join('\n') + '\nreturn ' + compiled.result.code + ';';
	      globals.push({ key: key, read: new Function('$values', code), compiled: true });
	      return spec;
	    },
	    // A condition of the params and built in values, as a function of the values
	    // A `when` condition of the params and built in values. Its test(step context, target)
	    // reads only the params and built in values the condition names, into target, so a gated off
	    // stage reads nothing else.
	    when: function (spec) {
	      if (typeof spec !== 'string') throw new Error('when of ' + name + ' should be an expression or a function of the step context');
	      var gateParams = [], gateBuiltIns = [];
	      var compiled = compileFormula(spec, { D: D, condition: true, name: function (key) {
	        if (Object.prototype.hasOwnProperty.call(params, key)) {
	          if (gateParams.indexOf(key) < 0) gateParams.push(key);
	          return { type: 'num', code: '$values[' + JSON.stringify(key) + ']' };
	        }
	        if (BUILT_IN_VALUES[key]) {
	          if (gateBuiltIns.indexOf(key) < 0) gateBuiltIns.push(key);
	          return { type: 'num', code: '$values.$' + key };
	        }
	      } }, name);
	      if (!compiled.result) throw new Error('when of ' + name + ' should end with a condition, such as step > 100');
	      var holds = new Function('$values', compiled.lines.join('\n') + '\nreturn ' + compiled.result.code + ';');
	      if (gateParams.length === 0) return sharedGate(simulator, spec, gateBuiltIns, holds);
	      var own = {};
	      return {
	        params: gateParams,
	        builtIns: gateBuiltIns,
	        test: function (forStep, target) {
	          target = target || own;
	          for (var i = 0; i < gateParams.length; ++i) {
	            var param = params[gateParams[i]];
	            target[gateParams[i]] = typeof param === 'function' ? param(forStep) : param;
	          }
	          for (i = 0; i < gateBuiltIns.length; ++i) target['$' + gateBuiltIns[i]] = BUILT_IN_VALUES[gateBuiltIns[i]](forStep);
	          return holds(target);
	        }
	      };
	    },
	    read: function (entry) { addOnce(reads, entry); },
	    wrote: function (entry) { addOnce(writes, entry); },
	    // A link or pair formula sees a partial sum of what it adds into on the CPU and the value at
	    // the stage's start elsewhere, so it cannot read it. `pull` and `push` add into `force`.
	    checkAccumulators: function (accumulated) {
	      reads.forEach(function (entry) {
	        if (entry.space !== 'nodes') return;
	        if (entry.column === 'force' || accumulated.indexOf(entry.column) >= 0) {
	          throw new Error(name + ' reads ' + entry.column + '_' + entry.end + ', which it adds into; a link or pair formula ' +
	            'sees no partial sums (read it in a later stage)');
	        }
	      });
	    },
	    startAtZero: function (accumulated) {
	      var columns = options.startAtZero || [];
	      if (!Array.isArray(columns)) throw new Error('startAtZero of ' + name + ' should be a list of column names');
	      columns.forEach(function (column) {
	        if (STATE_COLUMNS[column]) throw new Error('startAtZero of ' + name + ' cannot zero ' + column + ': it holds the state of bodies');
	        if (accumulated.indexOf(column) < 0) throw new Error('startAtZero of ' + name + ' names ' + column + ', which the formula does not add into');
	      });
	      writes.forEach(function (entry) {
	        if (entry.mode === 'add' && entry.space === 'nodes' && columns.indexOf(entry.column) >= 0) entry.startAtZero = true;
	      });
	      return columns.slice();
	    },
	    prologue: function () {
	      // Filled in by stage(), after the formulas named what they use
	      return prologue;
	    },
	    // `describeNow(info)` adds what depends on the settings at the time of describe()
	    stage: function (body, shape, space, args, describeNow) {
	      // A gated stage tests its gate first, and on its off steps reads nothing else
	      var hostGate = typeof options.when === 'function' ? options.when : null;
	      if (options.when !== undefined && !hostGate) gate = context.when(options.when);
	      var gateParams = gate ? gate.params : [];
	      var otherParams = paramNames.filter(function (param) { return gateParams.indexOf(param) < 0; });
	      var builtIns = usedBuiltIns.concat((gate ? gate.builtIns : []).filter(function (b) { return usedBuiltIns.indexOf(b) < 0; }));
	      var head = valueLines();
	      Object.keys(usedColumns).forEach(function (column) {
	        head.push('var $c_' + column + ' = $store[' + JSON.stringify(column) + '];');
	        head.push('if (!$c_' + column + ') throw new Error(' + JSON.stringify(name + ' reads the body column ' + column + ', which is gone') + ');');
	      });
	      Object.keys(usedLinkColumns).forEach(function (column) {
	        head.push('var $l_' + column + ' = $springs[' + JSON.stringify(column) + '];');
	        head.push('if (!$l_' + column + ') throw new Error(' + JSON.stringify(name + ' reads the link column ' + column + ', which is gone') + ');');
	      });
	      Object.keys(tables).forEach(function (table) {
	        head.push('var $T_' + table + ' = $tables[' + JSON.stringify(table) + '];');
	      });
	      // The prologue goes where the stage marked it, or first
	      var marked = body.some(function (line) { return line.indexOf(PROLOGUE) >= 0; });
	      var code;
	      if (marked) {
	        var expanded = [];
	        body.forEach(function (line) {
	          var at = line.indexOf(PROLOGUE);
	          if (at < 0) expanded.push(line);
	          else head.forEach(function (headLine) { expanded.push(line.slice(0, at) + headLine); });
	        });
	        code = expanded.join('\n');
	      } else {
	        prologue.unshift.apply(prologue, head);
	        code = body.join('\n');
	      }
	      var run = codeCache[code];
	      if (!run) {
	        run = codeCache[code] = marked ? new Function(code)() :
	          new Function('$store', '$springs', '$values', '$sums', '$tables', '$random', '$simulator', code);
	      }
	      var whenDescription = hostGate ? { kind: 'host' } : gate ? { kind: 'expression', text: options.when } : null;
	      // A gate of its own params reads them into the stage's values; a shared one keeps its answer
	      var holds = hostGate ? hostGate : gate ? (gate.params.length ? function (forStep) { return gate.test(forStep, values); } :
	        function (forStep) { return gate.test(forStep); }) : null;
	      return {
	        run: function (bodyStore, sim) {
	          if (holds !== null && !holds(stepContext)) return;
	          readValues(stepContext, values, otherParams);
	          run(bodyStore, sim.springStore, values, sim.sums(), tables, sim.random, sim);
	        },
	        // What the stage would read this step, for engines that queue steps: the params and
	        // `radius` as numbers, and whether `when` holds
	        values: function (otherContext) {
	          var own = {};
	          var on = hostGate ? !!hostGate(otherContext) : gate ? !!gate.test(otherContext, own) : true;
	          readValues(otherContext, own, otherParams);
	          var out = { params: {}, when: on, builtIns: {} };
	          paramNames.forEach(function (param) { out.params[param] = own[param]; });
	          builtIns.forEach(function (builtIn) { out.builtIns[builtIn] = own['$' + builtIn]; });
	          if (own.$radius !== undefined) out.radius = own.$radius;
	          return out;
	        },
	        describe: function () {
	          var info = {
	            shape: shape,
	            builtIn: null,
	            space: space,
	            when: whenDescription,
	            formula: options.formula,
	            reads: reads.map(copy),
	            writes: writes.map(copy),
	            params: paramNames.map(function (param) {
	              var described = describeValue(params[param]);
	              described.name = param;
	              return described;
	            }),
	            builtIns: builtIns.slice(),
	            tables: Object.keys(tables).map(function (table) {
	              return { name: table, from: tables[table].from, to: tables[table].to, values: tables[table].values };
	            }),
	            sums: Object.keys(usedSums),
	            args: Object.assign({}, args),
	            code: code
	          };
	          if (describeNow) describeNow(info);
	          return info;
	        }
	      };
	    }
	  };
	  return context;

	  function valueLines() {
	    var lines = [];
	    Object.keys(usedParams).forEach(function (param) { lines.push('var $p_' + param + ' = $values[' + JSON.stringify(param) + '];'); });
	    usedBuiltIns.forEach(function (builtIn) { lines.push('var $b_' + builtIn + ' = $values.$' + builtIn + ';'); });
	    Object.keys(usedSums).forEach(function (sum) {
	      lines.push('var $sum_' + sum + ' = $sums[' + JSON.stringify(sum) + '];');
	      lines.push('if (!$sum_' + sum + ') throw new Error(' + JSON.stringify(name + ' reads the sum ' + sum + ', which is gone') + ');');
	      if (sums[sum].grouped) lines.push('var $g_' + sum + ' = $sum_' + sum + '.groups, $gn_' + sum + ' = $sum_' + sum + '.count;');
	      else lines.push('var $s_' + sum + ' = $sum_' + sum + '.value;');
	    });
	    return lines;
	  }

	  // Names of values read once per step: params and built in values
	  function globalName(key) {
	    if (Object.prototype.hasOwnProperty.call(params, key)) return { type: 'num', code: '$values[' + JSON.stringify(key) + ']' };
	    if (BUILT_IN_VALUES[key]) {
	      if (usedBuiltIns.indexOf(key) < 0) usedBuiltIns.push(key);
	      return { type: 'num', code: '$values.$' + key };
	    }
	  }

	  function resolve(names, key, assigned) {
	    var named = names[key];
	    if (named && (BUILT_IN_VALUES[key] || key === 'D' || key === 'pi')) {
	      throw new Error(name + ': ' + key + ' is both a column and a built in value; give the column another name');
	    }
	    if (named) {
	      if (!assigned && named.onRead) named.onRead();
	      if (named.column) {
	        usedColumns[named.column] = true;
	        if (!assigned) context.read({ space: 'nodes', column: named.column, rows: named.end ? 'other' : 'own', end: named.end });
	      }
	      if (named.linkColumn) {
	        usedLinkColumns[named.linkColumn] = true;
	        if (!assigned) context.read({ space: 'links', column: named.linkColumn, rows: 'own' });
	      }
	      if (named.builtInColumn && !assigned) context.read({ space: 'links', column: named.builtInColumn, rows: 'own' });
	      return named;
	    }
	    if (Object.prototype.hasOwnProperty.call(params, key)) {
	      usedParams[key] = true;
	      return { type: 'num', code: '$p_' + key };
	    }
	    if (tables[key]) return { call: function (args) { return '$T_' + key + '.value(' + args[0] + ')'; } };
	    var sum = sums[key];
	    if (sum) {
	      usedSums[key] = true;
	      var width = sum.width;
	      if (sum.grouped) {
	        return {
	          index: function (indexCode) {
	            var read = function (k) {
	              return '(' + indexCode + ' >= 0 && ' + indexCode + ' < $gn_' + key + ' ? $g_' + key + '[Math.floor(' + indexCode + ') * ' + width + ' + ' + k + '] : 0)';
	            };
	            if (width === 1) return { type: 'num', code: read(0) };
	            var codes = [];
	            for (var k = 0; k < width; ++k) codes.push(read(k));
	            return { type: 'vec', codes: codes };
	          }
	        };
	      }
	      if (width === 1) return { type: 'num', code: '$s_' + key + '[0]' };
	      var vector = [];
	      for (var c = 0; c < width; ++c) vector.push('$s_' + key + '[' + c + ']');
	      return { type: 'vec', codes: vector };
	    }
	    if (BUILT_IN_VALUES[key]) {
	      if (usedBuiltIns.indexOf(key) < 0) usedBuiltIns.push(key);
	      return { type: 'num', code: '$b_' + key };
	    }
	  }

	  // Reads the numbers of the step of `forStep` (a step context) into `target`: the params
	  // `names` (all by default), built in values, settings and globals
	  function readValues(forStep, target, names) {
	    names = names || paramNames;
	    for (var i = 0; i < names.length; ++i) {
	      var param = params[names[i]];
	      target[names[i]] = typeof param === 'function' ? param(forStep) : param;
	    }
	    for (i = 0; i < usedBuiltIns.length; ++i) target['$' + usedBuiltIns[i]] = BUILT_IN_VALUES[usedBuiltIns[i]](forStep);
	    var settings = formula.liveSettings(forStep);
	    target.$springLength = settings.springLength;
	    target.$springCoefficient = settings.springCoefficient;
	    target.$stats = settings.adaptiveTimeStepWeight !== 0;
	    for (i = 0; i < globals.length; ++i) {
	      var global = globals[i];
	      target['$' + global.key] = typeof global.read === 'number' ? global.read :
	        global.compiled ? global.read(target) : global.read(forStep);
	    }
	  }
	}

	function addOnce(list, entry) {
	  var key = JSON.stringify(entry);
	  for (var i = 0; i < list.length; ++i) if (JSON.stringify(list[i]) === key) return;
	  list.push(entry);
	}

	function copy(entry) {
	  var out = {};
	  Object.keys(entry).forEach(function (key) { if (entry[key] !== null && entry[key] !== undefined) out[key] = entry[key]; });
	  return out;
	}

	function compileFormula(text, scope, name) {
	  try {
	    return formula.compile(text, scope);
	  } catch (e) {
	    e.message = name + ': ' + e.message;
	    throw e;
	  }
	}

	function indent(source, target, prefix) {
	  prefix = prefix || '  ';
	  source.forEach(function (line) { target.push(prefix + line); });
	}

	function each(D, fn, join) {
	  var parts = [];
	  for (var k = 0; k < D; ++k) parts.push(fn(k));
	  return parts.join(join === undefined ? ' ' : join);
	}
	return formulaStages;
}

var describeProgram = {};

/**
 * The step as plain data (simulator.program()), and what an engine can run of it
 * (simulator.plan()). createPhysicsSimulator.js loads this file with the first description it
 * makes, so layouts that are only stepped never load it.
 */

var hasRequiredDescribeProgram;

function requireDescribeProgram () {
	if (hasRequiredDescribeProgram) return describeProgram;
	hasRequiredDescribeProgram = 1;
	describeProgram.clear = describeClear;
	describeProgram.drag = describeDrag;
	describeProgram.springs = describeSprings;
	describeProgram.integrate = describeIntegrate;
	describeProgram.tree = describeTree;
	describeProgram.stage = describeStage;
	describeProgram.builtInValues = builtInValues;
	describeProgram.program = buildProgram;
	describeProgram.plan = plan;

	function describeClear() {
	  return {
	    shape: 'node', builtIn: 'clear', space: 'nodes',
	    reads: [ownRow('pinned')],
	    writes: [set('force'), set('springCount'), set('springLength')],
	    formula: 'force = pinned != 0 ? force : 0 * force'
	  };
	}

	function describeDrag(settings) {
	  return {
	    shape: 'node', builtIn: 'drag', space: 'nodes',
	    reads: [ownRow('pinned'), ownRow('velocity')],
	    writes: [add('force')],
	    formula: 'force -= pinned == 0 ? dragCoefficient * velocity : 0 * velocity',
	    builtIns: ['dragCoefficient'],
	    // FIRE removes energy its own way
	    args: { skipped: settings.integrator === 'fire' }
	  };
	}

	function describeSprings(settings) {
	  var counters = settings.adaptiveTimeStepWeight !== 0;
	  var writes = [add('force')];
	  writes[0].via = 'pull';
	  if (counters) writes.push(add('springCount'), add('springLength'));
	  return {
	    shape: 'link', builtIn: 'springs', space: 'links',
	    reads: [otherRows('pos', 'i'), otherRows('pos', 'j'), { space: 'links', column: 'length', rows: 'own' }, { space: 'links', column: 'coefficient', rows: 'own' }],
	    writes: writes,
	    formula: 'pull = coefficient * (r - length)',
	    builtIns: ['springLength', 'springCoefficient'],
	    args: { counters: counters }
	  };
	}

	function describeIntegrate(settings) {
	  var adaptive = settings.adaptiveTimeStepWeight !== 0;
	  var reads = [ownRow('pinned'), ownRow('force'), ownRow('velocity'), ownRow('pos'), ownRow(settings.inertia)];
	  if (adaptive) reads.push(ownRow('springCount'), ownRow('springLength'));
	  return {
	    shape: 'integrate', builtIn: 'integrate', space: 'nodes',
	    reads: reads,
	    writes: [set('velocity'), set('pos')],
	    builtIns: ['timeStep', 'maxVelocity'],
	    args: {
	      integrator: settings.integrator, inertia: settings.inertia, maxVelocity: settings.maxVelocity,
	      adaptiveTimeStepWeight: settings.adaptiveTimeStepWeight
	    }
	  };
	}

	// A tree stage: `member` is its charge in a walk (see the simulator's walk groups), `walk` the
	// walk it is part of
	function describeTree(builtIn, treeLaw, member, settings, walk) {
	  var charge = member.charge(), sensitivity = member.sensitivity();
	  // every body is pushed from its own position by the others
	  var reads = [ownRow('pos'), otherRows('pos', null), otherRows(charge, null), ownRow(sensitivity), ownRow('pinned')];
	  return {
	    shape: 'tree', builtIn: builtIn, space: 'tree',
	    reads: reads,
	    writes: [add('force')],
	    builtIns: ['gravity', 'theta'],
	    args: {
	      channels: [{ law: treeLaw.describe(), charge: charge, sensitivity: sensitivity, centroid: member.centroid }],
	      theta: settings.theta, nbody: settings.nbody,
	      walk: walk
	    }
	  };
	}

	function ownRow(column) { return { space: 'nodes', column: column, rows: 'own' }; }
	function otherRows(column, end) {
	  var entry = { space: 'nodes', column: column, rows: 'other' };
	  if (end) entry.end = end;
	  return entry;
	}
	function set(column) { return { space: 'nodes', column: column, mode: 'set' }; }
	function add(column) { return { space: 'nodes', column: column, mode: 'add' }; }

	// Built in values a stage reads, as formulas see them (unit with its floor, step, ...). The
	// names are kept per stage, so a description is built once
	function builtInValues(stage, context) {
	  if (!stage.builtInNames) stage.builtInNames = describeStage(stage).builtIns;
	  var out = {};
	  if (stage.builtInNames.length === 0) return out;
	  var BUILT_IN_VALUES = requireFormula().BUILT_IN_VALUES;
	  stage.builtInNames.forEach(function (name) { out[name] = BUILT_IN_VALUES[name](context); });
	  return out;
	}

	function describeStage(stage) {
	  var described = stage.describe ? stage.describe() : { shape: 'js' };
	  var entry = {
	    name: stage.name,
	    shape: described.shape,
	    builtIn: described.builtIn || null,
	    when: stage.gate ? stage.gate.describe() : described.when || null,
	    space: described.space || (described.shape === 'js' || described.shape === 'pair rules' ? 'none' : described.shape),
	    reads: described.reads || [],
	    writes: described.writes || [],
	    formula: described.formula || null,
	    params: described.params || [],
	    builtIns: described.builtIns || [],
	    tables: described.tables || [],
	    sums: described.sums || [],
	    args: described.args || {}
	  };
	  // Add-on stages describe more of their own
	  Object.keys(described).forEach(function (key) {
	    if (!(key in entry) && key !== 'code') entry[key] = described[key];
	  });
	  return entry;
	}

	// `simulator` is what the simulator knows: {version, dimensions, nodes, links, settings, store,
	// springStore, stages, listenerCounts}
	function buildProgram(simulator) {
	  var described = simulator.stages.map(describeStage);
	  var dimensions = simulator.dimensions;
	  var program = {
	    version: simulator.version,
	    dims: dimensions,
	    spaces: { nodes: simulator.nodes, links: simulator.links },
	    settings: {},
	    columns: {
	      nodes: describeColumns(simulator.store, 'nodes', described, dimensions),
	      links: describeColumns(simulator.springStore, 'links', described, dimensions)
	    },
	    tables: [],
	    sums: [],
	    stages: described,
	    hostSteps: [],
	    listeners: {}
	  };
	  var settings = simulator.settings;
	  Object.keys(settings).forEach(function (key) {
	    var value = settings[key];
	    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') program.settings[key] = value;
	  });
	  described.forEach(function (stage) {
	    stage.tables.forEach(function (table) {
	      program.tables.push({ stage: stage.name, name: table.name, from: table.from, to: table.to, values: table.values });
	    });
	    if (stage.shape === 'sum') {
	      program.sums.push({
	        name: stage.name, over: stage.args.over, group: stage.args.group, reduce: stage.args.reduce, width: stage.args.width,
	        when: stage.when
	      });
	    }
	    if (stage.shape === 'host') program.hostSteps.push({ name: stage.name, when: stage.when, reads: stage.reads, writes: stage.writes });
	  });
	  var listenerCounts = simulator.listenerCounts;
	  Object.keys(listenerCounts).forEach(function (event) {
	    if (listenerCounts[event].length) program.listeners[event] = listenerCounts[event].length;
	  });
	  return program;
	}

	function describeColumns(columnStore, space, described, dimensions) {
	  return columnStore.names().map(function (name) {
	    var size = columnStore.sizeOf(name);
	    var writers = [], fromStage = null, fromEngine = false;
	    described.forEach(function (stage) {
	      var writes = stage.writes.some(function (write) { return write.space === space && write.column === name; });
	      if (!writes) return;
	      writers.push(stage.name);
	      if (stage.builtIn) fromEngine = true;
	      else if (stage.shape !== 'host' && fromStage === null) fromStage = stage.name;
	    });
	    var column = {
	      name: name,
	      width: size === 1 ? 1 : size === dimensions ? 'D' : size,
	      type: columnStore.typeOf(name),
	      writer: fromEngine ? 'engine' : fromStage !== null ? 'stage:' + fromStage : 'host',
	      writers: writers
	    };
	    // counters of the adaptive time step, which formulas do not see
	    if (space === 'nodes' && (name === 'springCount' || name === 'springLength')) column.hidden = true;
	    return column;
	  });
	}

	// See simulator.plan(): `program` is the simulator's program(), `simulator` its public API
	function plan(program, backend, simulator) {
	  var reasons = [], warnings = programWarnings(program);
	  if (!backend) warnings = warnings.concat(cpuWarnings(program));
	  if (backend && backend.checkProgram) {
	    var whole = backend.checkProgram(program, simulator) || [];
	    if (Array.isArray(whole)) whole = { reasons: whole };
	    reasons = reasons.concat(whole.reasons || []);
	    warnings = warnings.concat(whole.warnings || []);
	  }
	  var planned = program.stages.map(function (stage) {
	    var verdict = backend ? backend.check(stage, program, simulator) : { runs: true, how: cpuHow(stage) };
	    var entry = { stage: stage.name, shape: stage.shape, runs: verdict.runs };
	    if (verdict.runs) entry.how = verdict.how;
	    else entry.reason = verdict.reason;
	    if (stage.shape === 'host') entry.cost = hostCost(stage, program);
	    (verdict.warnings || []).forEach(function (warning) { warnings.push(stage.name + ': ' + warning); });
	    return entry;
	  });
	  planned.forEach(function (entry) { if (!entry.runs) reasons.push(entry.stage + ': ' + entry.reason); });
	  return { backend: backend ? backend.name : 'cpu', runs: reasons.length === 0, reasons: reasons, warnings: warnings, stages: planned };
	}

	// Warnings for any engine: columns that only grow, host steps that run every step
	function programWarnings(program) {
	  var warnings = [];
	  program.stages.forEach(function (stage, at) {
	    if (stage.shape === 'host' && !stage.when) warnings.push(stage.name + ': a host step without `when` runs on the host every step');
	    if ((stage.shape !== 'link' && stage.shape !== 'pair') || stage.builtIn || stage.when) return;
	    stage.writes.forEach(function (write) {
	      if (write.mode !== 'add' || write.startAtZero || write.space !== 'nodes' || write.via) return;
	      var reset = program.stages.some(function (other, otherAt) {
	        return otherAt !== at && other.writes.some(function (w) {
	          return w.space === 'nodes' && w.column === write.column && (w.mode === 'set' || w.mode === 'host' || w.startAtZero);
	        });
	      });
	      var message = write.column + ' only grows: ' + stage.name + ' adds into it every step and nothing sets it; list it in startAtZero';
	      if (!reset && warnings.indexOf(message) < 0) warnings.push(message);
	    });
	  });
	  return warnings;
	}

	// nbody picks the tree of a pass alone; passes walked together walk one quad tree, so a step
	// with them costs several times a stock dual tree step
	function cpuWarnings(program) {
	  if (program.settings.nbody !== 'dualtree') return [];
	  return program.stages.filter(function (stage) {
	    var walk = stage.args && stage.args.walk;
	    return walk && walk.index === 0 && walk.charges > 1;
	  }).map(function (stage) {
	    return "nbody 'dualtree' does not apply to tree passes walked together (" + stage.args.walk.stages.join(', ') + '): they walk one quad tree';
	  });
	}

	// What a host step costs an engine with its own copy of the numbers
	function hostCost(stage, program) {
	  var numbers = 0, names = [];
	  stage.reads.forEach(function (read) {
	    var columns = program.columns[read.space] || [];
	    for (var i = 0; i < columns.length; ++i) {
	      if (columns[i].name !== read.column) continue;
	      numbers += columns[i].width === 'D' ? program.dims : columns[i].width;
	      names.push(read.column);
	    }
	  });
	  var reads = names.length ? 'reads ' + names.join(', ') + ' (' + numbers + '·n numbers)' : 'reads nothing';
	  var writes = stage.writes.length ? 'writes ' + stage.writes.map(function (w) { return w.column; }).join(', ') : 'writes nothing';
	  return (stage.when ? 'on the steps where `when` holds: ' : 'every step: ') + reads + ', ' + writes;
	}

	// How the CPU runs each kind of stage, for plan()
	var CPU_HOW = {
	  'built in': 'built in',
	  tree: 'tree walk with the law compiled in',
	  node: 'generated loop over bodies', link: 'generated loop over links', sum: 'generated loop',
	  pair: 'generated loop over grid neighbors', 'pair rules': 'grid neighbors, a call per pair',
	  host: 'JavaScript function, inline', js: 'JavaScript function'
	};

	// An add-on stage may say how it runs in its description
	function cpuHow(stage) {
	  var walk = stage.args && stage.args.walk;
	  if (walk && walk.charges > 1) {
	    return walk.index === 0 ? 'one quad tree walk with ' + walk.charges + ' charges: ' + walk.stages.join(', ') :
	      'in the walk of ' + walk.stages[0];
	  }
	  if (stage.builtIn) return CPU_HOW['built in'];
	  if (typeof stage.how === 'string') return stage.how;
	  return CPU_HOW[stage.shape] || 'add-on stage (' + stage.shape + ')';
	}
	return describeProgram;
}

/**
 * Manages a simulation of physical forces acting on bodies and springs.
 *
 * Numbers of all bodies live in flat typed arrays (`simulator.store`, see createBodyStore.js):
 * axis `k` of body `i` is `pos[i * D + k]`. `simulator.bodies[i]` is a view of row `i`.
 *
 * Every step runs a list of named stages. The built in ones are:
 *
 *   clear      - zero the forces of bodies that are not pinned;
 *   repulsion  - every pair of bodies pushes apart (Barnes-Hut quad tree or dual tree), by the
 *                repulsion law (see repulsionLaw.js);
 *   drag       - slow bodies down (skipped by the FIRE integrator);
 *   springs    - links pull or push their ends towards the spring length;
 *   integrate  - move bodies.
 *
 * Stages added with `addStage()` go before `integrate` unless told otherwise. Stages can also be
 * written as formulas (see formulaStages.js): the simulator then owns the loop, and other engines
 * can run the same formula. `program()` describes the whole step as plain data, and `plan()`
 * tells which stages an engine can run.
 *
 * Functions that give a stage its numbers (params of formulas and laws, radii) are called once
 * per step with a step context (see stepContext()), never with the simulator, so that an engine
 * that queues steps can call them for each queued step.
 */

var createPhysicsSimulator_1;
var hasRequiredCreatePhysicsSimulator;

function requireCreatePhysicsSimulator () {
	if (hasRequiredCreatePhysicsSimulator) return createPhysicsSimulator_1;
	hasRequiredCreatePhysicsSimulator = 1;
	createPhysicsSimulator_1 = createPhysicsSimulator;

	var generateCreateBodyFunction = requireGenerateCreateBody();
	var generateQuadTreeFunction = requireGenerateQuadTree();
	var generateBoundsFunction = requireGenerateBounds();
	var generateCreateDragForceFunction = requireGenerateCreateDragForce();
	var generateCreateSpringForceFunction = requireGenerateCreateSpringForce();
	var generateIntegratorFunction = requireGenerateIntegrator();
	var generateClearForcesFunction = requireGenerateClearForces();
	var createBodyStore = requireCreateBodyStore();
	var createSpringStore = requireCreateSpringStore();
	var createRepulsionLaw = requireRepulsionLaw();
	// Loaded when first used, so layouts that don't use them don't load them: formula stages, the
	// dual tree, FIRE, the neighbour grid, and the step's description (program(), plan())
	var formulaStages, describer;
	var Spring = requireSpring();
	var copyBody = createBodyStore.copyBody;
	var getVariableName = requireGetVariableName();

	var dimensionalCache = {};
	// Trees are generated for every dimension and law:
	var treeCache = {};
	// Trees that walk several charges at once, by dimension, laws and centre rules (see walkTree())
	var walkTreeCache = {};

	// The length unit never goes below this, so ideas can divide by it
	var MIN_UNIT = 1e-3;

	function createPhysicsSimulator(settings) {
	  var merge = requireNgraph_merge();
	  var eventify = requireNgraph_events();
	  if (settings) {
	    // Check for names from older versions of the layout
	    if (settings.springCoeff !== undefined) throw new Error('springCoeff was renamed to springCoefficient');
	    if (settings.dragCoeff !== undefined) throw new Error('dragCoeff was renamed to dragCoefficient');
	  }

	  settings = merge(settings, {
	      /**
	       * Ideal length for links (springs in physical model).
	       */
	      springLength: 10,

	      /**
	       * Hook's law coefficient. 1 - solid spring.
	       */
	      springCoefficient: 0.8,

	      /**
	       * Coulomb's law coefficient. It's used to repel nodes thus should be negative
	       * if you make it positive nodes start attract each other :).
	       */
	      gravity: -12,

	      /**
	       * Theta coefficient from Barnes Hut simulation. Ranged between (0, 1).
	       * The closer it's to 1 the more nodes algorithm will have to go through.
	       * Setting it to one makes Barnes Hut simulation no different from
	       * brute-force forces calculation (each node is considered).
	       */
	      theta: 0.8,

	      /**
	       * Drag force coefficient. Used to slow down system, thus should be less than 1.
	       * The closer it is to 0 the less tight system will be.
	       */
	      dragCoefficient: 0.9,

	      /**
	       * Default time step (dt) for forces integration
	       */
	      timeStep : 0.5,

	      /**
	       * Maximum speed of a body. Each step moves a body by at most `timeStep * maxVelocity`.
	       * Before v3.4 the limit was fixed at 1; 4 lets graphs unfold faster at no cost per step.
	       */
	      maxVelocity: 4,

	      /**
	       * How velocities and positions are updated from forces:
	       *  'euler' - classic integration, slowed down by drag force;
	       *  'fire' - Fast Inertial Relaxation Engine. Ignores `dragCoefficient`: keeps momentum
	       *  while the system moves "downhill" and stops it when it overshoots. Usually reaches
	       *  a good layout in fewer steps, especially on trees and grids.
	       */
	      integrator: 'euler',

	      /**
	       * How repulsion between bodies is computed:
	       *  'quadtree' - Barnes-Hut, each body walks the tree;
	       *  'dualtree' - pairs of tree cells interact with each other. Several times faster
	       *  for large graphs, with about the same accuracy for the same `theta`.
	       */
	      nbody: 'quadtree',

	      /**
	       * Name of the body column with charges (how hard bodies push each other). The mass
	       * (how slowly a body speeds up) is used by default.
	       */
	      repulsionCharge: 'mass',

	      /**
	       * Name of the body column with how strongly bodies feel the push of others. Empty means
	       * the charge. A body with charge 0 and some sensitivity is pushed but pushes nobody,
	       * and the quad tree leaves it out.
	       */
	      repulsionSensitivity: '',

	      /**
	       * Name of the body column that forces are divided by when bodies move (how slowly they
	       * speed up). The mass by default; see `simulator.inertia(name)`.
	       */
	      inertia: 'mass',

	      /**
	       * Adaptive time step uses average spring length to compute actual time step:
	       * See: https://twitter.com/anvaka/status/1293067160755957760
	       */
	      adaptiveTimeStepWeight: 0,

	      /**
	       * This parameter defines number of dimensions of the space where simulation
	       * is performed.
	       */
	      dimensions: 2,

	      /**
	       * In debug mode more checks are performed, this will help you catch errors
	       * quickly, however for production build it is recommended to turn off this flag
	       * to speed up computation.
	       */
	      debug: false
	  });

	  // How hard two unit charges push each other at distance r: a string like 'exp(-r / L) / r^2',
	  // or an object (see repulsionLaw.js). Empty means 1/r^2. (Not merged with defaults above, as
	  // merging would turn an empty law into {}.)
	  if (settings.repulsionLaw === undefined) settings.repulsionLaw = null;

	  if (settings.integrator !== 'euler' && settings.integrator !== 'fire') {
	    throw new Error('Unknown integrator: ' + settings.integrator + '. Expected `euler` or `fire`');
	  }
	  if (settings.nbody !== 'quadtree' && settings.nbody !== 'dualtree') {
	    throw new Error('Unknown nbody: ' + settings.nbody + '. Expected `quadtree` or `dualtree`');
	  }

	  var dimensions = settings.dimensions;
	  var factory = dimensionalCache[dimensions];
	  if (!factory) {
	    factory = {
	      Body: generateCreateBodyFunction(dimensions, settings.debug),
	      createBounds: generateBoundsFunction(dimensions),
	      createDragForce: generateCreateDragForceFunction(dimensions),
	      createSpringForce: generateCreateSpringForceFunction(dimensions),
	      integrate: generateIntegratorFunction(dimensions),
	      createFireIntegrator: null, // made with the first FIRE layout
	      clearForces: generateClearForcesFunction(dimensions),
	    };
	    dimensionalCache[dimensions] = factory;
	  }

	  var Body = factory.Body;
	  var fireIntegrate; // created on demand, since FIRE keeps state between steps

	  var random = requireNgraph_random().random(42);
	  var store = createBodyStore(dimensions);
	  var bodies = []; // Bodies in this simulation.
	  store.onResize = function () {
	    for (var i = 0; i < bodies.length; ++i) bodies[i].moveTo(store, bodies[i].index);
	  };
	  var springs = []; // Springs in this simulation.
	  var springStore = createSpringStore(); // and their numbers
	  // Removed bodies and springs leave their rows in the stores until the next step, when
	  // compact() drops all of them at once. `bodies` and `springs` are always up to date, and
	  // stay sorted by row.
	  var removedBodyRows = [], removedSpringRows = [];
	  // Bodies removed since the last compact() keep their numbers here (one store for all of
	  // them is much cheaper than one store each):
	  var removedStore = null, removedBodies = [];
	  // Set when bodies or springs were added or removed; the next step fires 'topology'
	  var topologyChanged = false;

	  var law = createRepulsionLaw(settings.repulsionLaw);
	  var quadTree, dualTree; // created on demand, for the current law
	  var bounds = factory.createBounds(store, settings, random);
	  var springForce = factory.createSpringForce(settings, random);
	  var dragForce = factory.createDragForce(settings);
	  var neighborGrid; // created on demand
	  var pairRules = [];
	  // Results of sums, by name (see addSum)
	  var sums = Object.create(null);

	  var totalMovement = 0; // how much movement we made on last step
	  var iterationNumber = 0;
	  // Grows when the structure of a step changes (see program())
	  var structureVersion = 0;
	  // FIRE keeps state; it is made again when the inertia column changes
	  var fireInertia = null;
	  // Listeners of the simulator's events, and of other sources (see watchListeners())
	  var listenerCounts = Object.create(null);
	  var stepContext = createStepContext(function () { return iterationNumber; });
	  // Tree stages next to each other walk one tree (see findWalkGroups()); found again when the
	  // structure of a step changes
	  var treeMembers = [];
	  var walkVersion = -1;

	  var stages = [];
	  addStage('clear', clearStage, null, describeBuiltIn('clear'));
	  var repulsion = addStage('repulsion', repulsionStage, null, function () {
	    return describeTree('repulsion', law, repulsion.tree);
	  });
	  repulsion.law = function () { return law; };
	  repulsion.tree = treeMember('repulsion', repulsionStage, function () { return settings.repulsionCharge; },
	    function () { return settings.repulsionSensitivity || settings.repulsionCharge; }, repulsion.law, 'own');
	  addStage('drag', dragStage, null, describeBuiltIn('drag'));
	  addStage('springs', springStage, null, describeBuiltIn('springs'));
	  addStage('integrate', integrateStage, null, describeBuiltIn('integrate'));

	  var publicApi = {
	    /**
	     * Array of bodies, registered with current simulator. `bodies[i].index` is the body's row
	     * in the store (equal to `i` while the simulator steps).
	     *
	     * Note: To add new body, use addBody() method.
	     */
	    bodies: bodies,

	    /**
	     * Columns of body numbers: `pos`, `velocity`, `force` (D numbers per body), `mass`,
	     * `pinned`, `degree` (number of springs), and any column added with `store.define()`.
	     */
	    store: store,

	    /**
	     * Array of springs, registered with current simulator
	     *
	     * Note: To add new spring, use addSpring() method.
	     */
	    springs: springs,

	    /**
	     * Columns of spring numbers: `from`, `to` (body rows), `length`, `coefficient`.
	     */
	    springStore: springStore,

	    /**
	     * Returns settings with which current simulator was initialized
	     */
	    settings: settings,

	    /**
	     * Names of the stages of a step, in the order they run.
	     */
	    stages: function () {
	      return stages.map(function (stage) { return stage.name; });
	    },

	    /**
	     * Adds `run(store, simulator)` to every step. `options.before` or `options.after` name the
	     * stage to run next to; by default new stages run just before `integrate`. With
	     * `options.replace` the stage takes the place of the named one, which comes back when this
	     * stage is removed. `options.when` (an expression of `step` and the settings, or a function
	     * of the step context) runs it only on the steps where it holds.
	     *
	     * A stage written for other engines too (an add-on module's) describes itself with
	     * `options.describe`: plain data, or a function returning it, with at least a `shape`
	     * (see program()). An engine that does not know the shape refuses the stage by name. Without
	     * it the stage is JavaScript, which only the CPU runs. `options.values(context)` gives the
	     * stage's numbers for a step, as stageValues() returns them ({when, params, ...}).
	     */
	    addStage: function (name, run, options) {
	      var describe = options && options.describe;
	      if (describe !== undefined && typeof describe !== 'function') {
	        var described = describe;
	        describe = function () { return described; };
	      }
	      var stage = addStage(name, run, options, describe);
	      if (options && typeof options.values === 'function') stage.values = options.values;
	    },

	    /**
	     * Replaces the stage `name` with `run`, keeping its place. Returns the old function. The
	     * stage is a JS stage for plan() until its first function is put back.
	     */
	    replaceStage: function (name, run) {
	      var stage = getStage(name);
	      if (!stage) throw new Error('No stage named ' + name);
	      var old = stage.run;
	      if (!stage.first) stage.first = { run: old, describe: stage.describe, law: stage.law, values: stage.values };
	      var first = run === stage.first.run;
	      stage.run = run;
	      stage.describe = first ? stage.first.describe : describeJS;
	      stage.law = first ? stage.first.law : null;
	      stage.values = first ? stage.first.values : null;
	      stage.builtInNames = null;
	      structureVersion += 1;
	      return old;
	    },

	    /**
	     * Removes the stage `name` (a formula stage too). A stage it replaced comes back. Returns
	     * true when there was such a stage.
	     */
	    removeStage: function (name) {
	      var at = indexOfStage(name);
	      if (at < 0) return false;
	      var stage = stages[at];
	      if (stage.replaced) stages.splice(at, 1, stage.replaced);
	      else stages.splice(at, 1);
	      if (stage.dispose) stage.dispose();
	      structureVersion += 1;
	      return true;
	    },

	    /**
	     * Adds a step that JavaScript runs on the host, at its place among the stages:
	     * `run(simulator)` may read and change any data. `options.reads` and `options.writes` list
	     * the columns it reads and changes (names of body columns, or {space: 'links', column}),
	     * so that engines with their own copy of the numbers can hand them over; `options.when` (an
	     * expression of `step` and the settings, or a function of the step context) says on which
	     * steps it runs, every step without it. Place it with `before` or `after` as stages; by
	     * default it runs before `integrate`.
	     */
	    addHostStep: function (name, options) {
	      if (!options || typeof options.run !== 'function') throw new Error('Host step ' + name + ' needs a run(simulator) function');
	      var hostRun = options.run;
	      addStage(name, function () { hostRun(publicApi); }, options, function () {
	        return {
	          shape: 'host',
	          space: 'none',
	          reads: (options.reads || []).map(hostColumn),
	          writes: (options.writes || []).map(function (column) {
	            var entry = hostColumn(column);
	            entry.mode = 'host';
	            return entry;
	          })
	        };
	      });
	    },

	    /**
	     * Adds a stage that runs `options.formula` for every body (see formulaStages.js). The
	     * formula reads and assigns the body's columns by name, e.g. 'force += -k * (pos - center)'.
	     * `options.params` are numbers or functions of the step context, read once per step;
	     * `options.tables` are lookup tables; `when` gates it; `before`, `after` and `replace`
	     * place the stage as in addStage().
	     */
	    addNodeFormula: function (name, options) {
	      addFormulaStage(name, getFormulaStages().node(publicApi, name, options), options);
	    },

	    /**
	     * Adds a stage that runs `options.formula` for every link (see formulaStages.js). The formula
	     * sets `pull` from `r`, `length`, `coefficient`, link columns and the columns of both ends
	     * (`mass_i`, `mass_j`). With `replace: 'springs'` it takes the place of the stock springs;
	     * 'pull = coefficient * (r - length)' is what they compute.
	     */
	    addLinkFormula: function (name, options) {
	      addFormulaStage(name, getFormulaStages().link(publicApi, name, options), options);
	    },

	    /**
	     * Adds a stage that runs `options.formula` for every pair of bodies closer than
	     * `options.radius` (see formulaStages.js). The formula sets `push` from `r` and the columns
	     * of both bodies (`mass_i`, `mass_j`), and can add into columns (`stiff_i += ...`;
	     * `startAtZero: ['stiff']` zeroes them first). By default the stage runs after `springs`.
	     */
	    addPairFormula: function (name, options) {
	      var placement = options;
	      if (options && options.before === undefined && options.after === undefined && options.replace === undefined) {
	        placement = getStage('springs') ? { after: 'springs' } : undefined;
	      }
	      addFormulaStage(name, getFormulaStages().pair(publicApi, name, options), placement);
	    },

	    /**
	     * Adds a stage that adds up `options.formula` over bodies (or links, with
	     * `over: 'links'`), for all of them or per group (`group`: a column of group ids). Formulas
	     * added later read the result by `name` (or `name[group]`). `reduce` can be 'sum', 'min' or
	     * 'max'. Sums run where they are placed, like other stages; place them before the formulas
	     * that read them.
	     */
	    addSum: function (name, options) {
	      if (sums[name]) throw new Error('Sum ' + name + ' is already added');
	      var builtIn = requireFormula().BUILT_IN_VALUES;
	      if (!/^[A-Za-z_]\w*$/.test(name) || builtIn[name] || name === 'D' || name === 'pi' || store.has(name)) {
	        throw new Error('Sum ' + name + ' needs a name that is not a column or a built in value');
	      }
	      var stage = getFormulaStages().sum(publicApi, name, options);
	      stage.dispose = function () { delete sums[name]; };
	      addFormulaStage(name, stage, options);
	      sums[name] = stage.result;
	    },

	    /**
	     * Results of sums by name: {value, groups, count, width} (see formulaStages.js).
	     */
	    sums: function () {
	      return sums;
	    },

	    /**
	     * Adds another repulsion pass: every pair of bodies pushes apart by `options.law` (see
	     * repulsionLaw.js), with charges from the body column `options.charge` and sensitivity from
	     * `options.sensitivity`. Bodies with sensitivity 0 are skipped.
	     *
	     * Passes next to each other, and next to the stock repulsion, walk one quad tree with a
	     * charge each, so a pass costs much less than a walk of its own. nbody 'dualtree' does not
	     * apply to such a walk (plan() warns).
	     * A pass alone walks its own tree. Charges should not be negative: each acts from its own
	     * centre in a tree cell. With `options.centroid: 'shared'` it acts from the centre of the
	     * walk's first charge instead, which saves time, and then it may be signed.
	     */
	    addRepulsion: function (name, options) {
	      options = options || {};
	      if (options.centroid !== undefined && options.centroid !== 'own' && options.centroid !== 'shared') {
	        throw new Error(name + ': unknown centroid ' + options.centroid + '. Expected `own` or `shared`');
	      }
	      var pass = createRepulsionPass(name, options);
	      var stage = addFormulaStage(name, pass, options);
	      stage.law = pass.law;
	      stage.tree = pass.tree;
	    },

	    /**
	     * The step as plain data, for engines, inspectors and tests. Built when asked for, so a
	     * layout that never asks never pays for it:
	     *
	     *   {version, dims, spaces: {nodes, links}, settings, columns: {nodes: [...], links: [...]},
	     *    tables, sums, stages, hostSteps, listeners}
	     *
	     * `version` grows when the structure changes: stages added, removed or replaced, the law,
	     * the inertia, the integrator, the solver, charge columns, the adaptive time step turned on
	     * or off, columns defined or removed. Columns are {name, width (a number, or 'D'), type,
	     * writer, writers}: the writer is 'engine' when built in stages write the column,
	     * 'stage:<name>' for the first other stage that writes it, and 'host' otherwise. Stages come
	     * in the order the CPU runs them; each is {name, shape, builtIn, when, space, reads, writes,
	     * formula, params, builtIns, tables, sums, args}. Functions appear as {kind: 'host'},
	     * without their code: engines get their values from stageValues().
	     */
	    program: function () {
	      return buildProgram();
	    },

	    /**
	     * What stage `name` reads in the step of `context` (the current step without one), as numbers
	     * of its own for every call: `params`, `radius`, whether its `when` holds, the `builtIns` it
	     * reads ({step, unit, ...}, as formulas see them), and for repulsion passes the law's numbers
	     * (`lawValues`: its parameters, `$h<n>` for the parts computed once per step, `$range`). Engines
	     * that queue steps call it once per queued step. `law` is the compiled law, for generating
	     * code: its own `values` are live and change with the next call.
	     */
	    stageValues: function (name, context) {
	      var stage = getStage(name);
	      if (!stage) throw new Error('No stage named ' + name);
	      context = context || stepContext;
	      var out = stage.values ? stage.values(context) : { when: true };
	      if (stage.gate) out.when = !!stage.gate.test(context);
	      if (!out.builtIns) out.builtIns = getDescriber().builtInValues(stage, context);
	      if (stage.law) {
	        var stageLaw = stage.law();
	        stageLaw.update(context);
	        out.law = stageLaw;
	        out.lawValues = Object.assign({}, stageLaw.values);
	      }
	      return out;
	    },

	    /**
	     * The version program() would report, without building it: engines check it before each
	     * batch and re-plan when it grows.
	     */
	    programVersion: function () {
	      return structureVersion + store.columnsVersion + springStore.columnsVersion;
	    },

	    /**
	     * The step context: what functions that give stages their numbers see, the same on every
	     * engine. `iteration()` (the step being computed), `settings` (read only), a getter for
	     * every setting (`springLength()`, `gravity()`, ... `dimensions()`), `unit()`, and `store.n`,
	     * `store.D`. It has no columns or positions: data goes through formulas, sums and host
	     * steps. With `step`, a context for that step (engines that queue steps call functions with
	     * it); without, the one the CPU uses.
	     */
	    stepContext: function (step) {
	      if (step === undefined) return stepContext;
	      return createStepContext(function () { return step; });
	    },

	    /**
	     * Tells which stages an engine can run. `backend` describes an engine:
	     * {name, check(stage, program, simulator), checkProgram(program, simulator)?}. `check` gets
	     * each stage of program() and returns {runs: true, how} or {runs: false, reason}, and may
	     * add `warnings`; `checkProgram` returns reasons (a list) or {reasons, warnings} for the step
	     * as a whole. Without a backend it describes the CPU, which runs every stage. Returns
	     * {backend, runs, reasons, warnings, stages: [{stage, shape, runs, how or reason, cost?}]}.
	     * Warnings are not refusals: a column that only grows, a host step that runs every step.
	     */
	    plan: function (backend) {
	      return getDescriber().plan(buildProgram(), backend, publicApi);
	    },

	    /**
	     * Gets or sets the body column that forces are divided by when bodies move (`settings.inertia`,
	     * the mass by default). Charges and other formulas still read the mass.
	     */
	    inertia: function (name) {
	      if (name === undefined) return settings.inertia;
	      if (typeof name !== 'string' || !store.has(name)) throw new Error('No body column named ' + name + ' for inertia');
	      if (store.sizeOf(name) !== 1) throw new Error('Inertia column ' + name + ' should have one number per body');
	      if (name !== settings.inertia) {
	        settings.inertia = name;
	        structureVersion += 1;
	        publicApi.fire('settings', 'inertia', name);
	      }
	      return publicApi;
	    },

	    /**
	     * Counts the listeners of another event source too (the layout's 'step'), so that program()
	     * can list them.
	     */
	    watchListeners: function (source) {
	      countListeners(source);
	    },

	    /**
	     * Returns the function of stage `name`, so it can be wrapped or reused.
	     */
	    getStage: function (name) {
	      var stage = getStage(name);
	      return stage && stage.run;
	    },

	    /**
	     * Gets or sets the repulsion law: a string like 'exp(-r / L) / r^2' or an object (see
	     * repulsionLaw.js). `null` restores 1/r^2.
	     */
	    repulsionLaw: function (spec) {
	      if (spec === undefined) return law;
	      law = createRepulsionLaw(spec);
	      settings.repulsionLaw = spec;
	      quadTree = dualTree = null;
	      structureVersion += 1;
	      publicApi.fire('settings', 'repulsionLaw', spec);
	      return publicApi;
	    },

	    /**
	     * Adds a rule for pairs of bodies closer than `options.radius` (a number or a function of
	     * the simulator, read every step). For each such pair `rule(i, j, r, store)` returns `s`,
	     * and the force `s * (pos_i - pos_j)` is added to body `i`, the opposite one to `j`.
	     * With `options.symmetric === false` the rule is asked for both (i, j) and (j, i), and only
	     * body `i` gets the force. Pairs are found with one grid shared by all rules.
	     *
	     * Bodies on the same spot get r = 0. The force is then `s` itself, along an axis picked
	     * from i and j (as in the dual tree); a rule that gives no finite `s` there, e.g. one that
	     * divides by r, leaves them alone.
	     *
	     * Pair rules run in the stage `pairRules`, added with the first rule after `springs` (or
	     * before `integrate`, when there is no `springs` stage). They are JavaScript, so only the
	     * CPU runs them; pair formulas do the same on every engine.
	     */
	    addPairRule: function (name, options) {
	      if (!options || typeof options.rule !== 'function') throw new Error('Pair rule needs a rule(i, j, r, store) function');
	      if (pairRules.some(function (rule) { return rule.name === name; })) throw new Error('Pair rule ' + name + ' is already added');
	      if (!getStage('pairRules')) {
	        addStage('pairRules', pairRuleStage, getStage('springs') ? { after: 'springs' } : undefined, function () {
	          return { shape: 'pair rules', rules: pairRules.map(function (rule) { return rule.name; }) };
	        });
	      }
	      structureVersion += 1;
	      pairRules.push({
	        name: name,
	        radius: options.radius,
	        rule: options.rule,
	        symmetric: options.symmetric !== false
	      });
	    },

	    removePairRule: function (name) {
	      for (var i = 0; i < pairRules.length; ++i) {
	        if (pairRules[i].name === name) {
	          pairRules.splice(i, 1);
	          structureVersion += 1;
	          if (pairRules.length === 0) publicApi.removeStage('pairRules');
	          return true;
	        }
	      }
	      return false;
	    },

	    /**
	     * Grid of bodies for neighbor queries, built from the current positions with cells of
	     * `cellSize` (see createNeighborGrid.js). Stages can use it to find close bodies.
	     */
	    neighbors: function (cellSize) {
	      if (!neighborGrid) neighborGrid = requireCreateNeighborGrid()(dimensions);
	      neighborGrid.build(store, cellSize);
	      return neighborGrid;
	    },

	    /**
	     * A length that ideas can measure distances in: the spring length, but never below a
	     * small positive number (so dividing by it is safe while the spring length is typed in).
	     */
	    unit: unit,

	    /**
	     * Number of steps performed so far. With `count`, sets it (an engine that ran steps
	     * elsewhere hands back its count).
	     */
	    iteration: function (count) {
	      if (count === undefined) return iterationNumber;
	      if (!(Number.isInteger(count) && count >= 0)) throw new Error('Step count should be a whole number, not ' + count);
	      iterationNumber = count;
	      return publicApi;
	    },

	    /**
	     * Drops the rows of removed bodies and springs now, and fires 'topology' if bodies or
	     * springs were added or removed, rather than at the start of the next step. Code that
	     * reads the store between a graph edit and the next step then sees the rows as they will be.
	     */
	    applyEdits: function () {
	      compact();
	      if (topologyChanged) {
	        topologyChanged = false;
	        // every row may have moved
	        store.changed();
	        springStore.changed();
	        publicApi.fire('topology');
	      }
	      return publicApi;
	    },

	    /**
	     * Performs one step of force simulation.
	     *
	     * @returns {number} amount of movement during this step.
	     */
	    step: function () {
	      publicApi.applyEdits();
	      for (var i = 0; i < stages.length; ++i) {
	        stages[i].run(store, publicApi);
	      }
	      iterationNumber += 1;
	      return totalMovement;
	    },

	    /**
	     * Adds body to the system. The body keeps its numbers, but from now on they live in this
	     * simulator's store. Columns added with `store.define()` start from their initial values.
	     *
	     * @param {ngraph.physics.primitives.Body} body physical body
	     *
	     * @returns {ngraph.physics.primitives.Body} added body
	     */
	    addBody: function (body) {
	      if (!body) {
	        throw new Error('Body is required');
	      }
	      if (body.store === store) {
	        throw new Error('Body is already in this simulator');
	      }
	      var index = store.add();
	      copyBody(body.store, body.index, store, index);
	      store.degree[index] = 0;
	      body.moveTo(store, index);
	      bodies.push(body);
	      topologyChanged = true;

	      return body;
	    },

	    /**
	     * Adds body to the system at given position
	     *
	     * @param {Object} pos position of a body
	     *
	     * @returns {ngraph.physics.primitives.Body} added body
	     */
	    addBodyAt: function (pos) {
	      if (!pos) {
	        throw new Error('Body position is required');
	      }
	      checkPosition(pos);
	      var index = store.add();
	      setPosition(index, pos);
	      var body = Body.inStore(store, index);
	      bodies.push(body);
	      topologyChanged = true;

	      return body;
	    },

	    /**
	     * Removes body from the system, together with its springs.
	     *
	     * @param {ngraph.physics.primitives.Body} body to remove
	     *
	     * @returns {Boolean} true if body found and removed. falsy otherwise;
	     */
	    removeBody: function (body) {
	      if (!body || body.store !== store) { return; }

	      var row = body.index;
	      // Springs can only connect bodies of this simulator, so they go with the body
	      if (store.degree[row] > 0) removeSpringsOf(body);

	      // The removed body keeps its last numbers
	      if (!removedStore) {
	        removedStore = createBodyStore(dimensions);
	        removedStore.onResize = onRemovedStoreResize;
	      }
	      var removedRow = removedStore.add();
	      copyBody(store, row, removedStore, removedRow);
	      removedBodyRows.push(row);
	      bodies.splice(findByRow(bodies, row), 1);
	      body.moveTo(removedStore, removedRow);
	      removedBodies.push(body);
	      topologyChanged = true;

	      if (bodies.length === 0) {
	        bounds.reset();
	      }
	      return true;
	    },

	    /**
	     * Adds a spring between two bodies of this simulation.
	     *
	     * @returns {Object} - a handle for a spring. If you want to later remove
	     * spring pass it to removeSpring() method.
	     */
	    addSpring: function (body1, body2, springLength, springCoefficient) {
	      if (!body1 || !body2) {
	        throw new Error('Cannot add null spring to force simulator');
	      }
	      if (body1.store !== store || body2.store !== store) {
	        throw new Error('Spring ends should be bodies of this simulator. Use addBody() first');
	      }

	      if (typeof springLength !== 'number') {
	        springLength = -1; // assume global configuration
	      }

	      var index = springStore.add();
	      springStore.from[index] = body1.index;
	      springStore.to[index] = body2.index;
	      springStore.length[index] = springLength;
	      springStore.coefficient[index] = springCoefficient >= 0 ? springCoefficient : -1;
	      var spring = new Spring(body1, body2, undefined, undefined, springStore, index);
	      springs.push(spring);
	      store.degree[body1.index] += 1;
	      store.degree[body2.index] += 1;
	      topologyChanged = true;

	      return spring;
	    },

	    /**
	     * Returns amount of movement performed on last step() call
	     */
	    getTotalMovement: function () {
	      return totalMovement;
	    },

	    /**
	     * Removes spring from the system
	     *
	     * @param {Object} spring to remove. Spring is an object returned by addSpring
	     *
	     * @returns {Boolean} true if spring found and removed. falsy otherwise;
	     */
	    removeSpring: function (spring) {
	      if (!spring || spring.store !== springStore) { return; }
	      detachSpring(spring);
	      return true;
	    },

	    getBestNewBodyPosition: function (neighbors) {
	      return bounds.getBestNewPosition(neighbors);
	    },

	    /**
	     * Returns bounding box which covers all bodies
	     */
	    getBBox: getBoundingBox,
	    getBoundingBox: getBoundingBox,

	    /**
	     * Returns pseudo-random number generator instance.
	     */
	    random: random
	  };

	  // allow settings modification via public API:
	  expose(settings, publicApi, settingChanged);

	  eventify(publicApi);
	  countListeners(publicApi);

	  return publicApi;

	  function addStage(name, run, options, describe) {
	    if (typeof run !== 'function') throw new Error('Stage ' + name + ' needs a function');
	    if (getStage(name)) throw new Error('Stage ' + name + ' is already added');
	    var stage = {
	      name: name, run: run, describe: describe, replaced: null, dispose: null, first: null,
	      gate: null, law: null, values: null, builtInNames: null
	    };
	    var when = options ? options.when : undefined;
	    if (when !== undefined && !(options && options.formulaGate)) {
	      // The stage runs only on steps where `when` holds; ungated stages pay nothing for it
	      var gate = stage.gate = getFormulaStages().gate(publicApi, name, when, options.params);
	      var gated = run;
	      stage.run = function (bodyStore, sim) {
	        if (gate.test(stepContext)) gated(bodyStore, sim);
	      };
	    }
	    structureVersion += 1;
	    var at = stages.length;
	    var before = options ? options.before : undefined;
	    var after = options ? options.after : undefined;
	    var replace = options ? options.replace : undefined;
	    if (replace !== undefined) {
	      at = indexOfStage(replace);
	      if (at < 0) throw new Error('No stage named ' + replace);
	      stage.replaced = stages[at];
	      stages[at] = stage;
	      return stage;
	    }
	    if (before !== undefined || after !== undefined) {
	      at = indexOfStage(before !== undefined ? before : after);
	      if (at < 0) throw new Error('No stage named ' + (before !== undefined ? before : after));
	      if (after !== undefined) at += 1;
	    } else {
	      var integrate = indexOfStage('integrate');
	      if (integrate >= 0) at = integrate;
	    }
	    stages.splice(at, 0, stage);
	    return stage;
	  }

	  function addFormulaStage(name, formulaStage, options) {
	    // Formula stages read `when` with their own params, inside their run
	    var placement = options;
	    if (options && options.when !== undefined && formulaStage.values) {
	      placement = { before: options.before, after: options.after, replace: options.replace, formulaGate: true };
	    }
	    var stage = addStage(name, formulaStage.run, placement, formulaStage.describe);
	    stage.dispose = formulaStage.dispose || null;
	    stage.values = formulaStage.values || null;
	    return stage;
	  }

	  function describeJS() {
	    return { shape: 'js' };
	  }

	  // ---------------------------------------------------------------------------------------
	  // The step as plain data (program(); the descriptions are in describeProgram.js)
	  // ---------------------------------------------------------------------------------------

	  // A built in stage's description, made when first asked for
	  function describeBuiltIn(name) {
	    return function () { return getDescriber()[name](settings); };
	  }

	  function describeTree(builtIn, treeLaw, member) {
	    return getDescriber().tree(builtIn, treeLaw, member, settings, describeWalk(member));
	  }

	  // The walk a tree stage's charge is part of: its stages in order, this charge's place among
	  // them, and the tree that walks them
	  function describeWalk(member) {
	    if (walkVersion !== structureVersion) findWalkGroups();
	    var group = member.group;
	    if (!group) return { stages: [member.name], index: 0, charges: 1, tree: settings.nbody };
	    return {
	      stages: group.members.map(function (other) { return other.name; }),
	      index: group.members.indexOf(member),
	      charges: group.members.length,
	      tree: 'quadtree'
	    };
	  }

	  function hostColumn(column) {
	    if (typeof column === 'string') return { space: 'nodes', column: column };
	    return { space: column.space || 'nodes', column: column.column };
	  }

	  function buildProgram() {
	    return getDescriber().program({
	      version: publicApi.programVersion(), dimensions: dimensions, nodes: bodies.length, links: springs.length,
	      settings: settings, store: store, springStore: springStore, stages: stages, listenerCounts: listenerCounts
	    });
	  }

	  // ---------------------------------------------------------------------------------------
	  // Step context, settings and listeners
	  // ---------------------------------------------------------------------------------------

	  // Three fields of its own; the getters of settings and unit() come from a prototype shared by
	  // every context with the same settings, so contexts share a shape (see contextPrototype)
	  function createStepContext(iteration) {
	    var context = Object.create(contextPrototype(Object.keys(settings)));
	    context.iteration = iteration;
	    context.settings = settingsView();
	    context.store = storeView();
	    return Object.freeze(context);
	  }

	  // A read-only view of the live settings. Never the settings as a prototype: that gives every
	  // layout's settings object a shape of its own, and code that layouts share (the springs read
	  // options.springLength for every link) slows down once a few layouts ran in one process
	  function settingsView() {
	    var view = new SettingsView(settings);
	    Object.keys(settings).forEach(function (key) {
	      Object.defineProperty(view, key, { get: settingGetter(key), enumerable: true });
	    });
	    return Object.freeze(view);
	  }

	  function storeView() {
	    return Object.freeze(new StoreView(store));
	  }

	  function unit() {
	    var length = settings.springLength;
	    return length > MIN_UNIT ? length : MIN_UNIT;
	  }

	  // Setters of settings tell listeners; some settings change the structure of a step
	  function settingChanged(key, oldValue, value) {
	    var structural = key === 'integrator' || key === 'nbody' || key === 'repulsionCharge' || key === 'repulsionSensitivity' ||
	      (key === 'adaptiveTimeStepWeight' && (oldValue === 0) !== (value === 0));
	    if (structural) structureVersion += 1;
	    publicApi.fire('settings', key, value);
	  }

	  // Keeps a list of listeners per event next to ngraph.events, which keeps its own private
	  function countListeners(source) {
	    var on = source.on, off = source.off;
	    source.on = function (event, callback, ctx) {
	      on(event, callback, ctx);
	      if (!listenerCounts[event]) listenerCounts[event] = [];
	      listenerCounts[event].push(callback);
	      return source;
	    };
	    source.off = function (event, callback) {
	      off(event, callback);
	      Object.keys(listenerCounts).forEach(function (name) {
	        if (event !== undefined && name !== event) return;
	        listenerCounts[name] = typeof callback === 'function' ?
	          listenerCounts[name].filter(function (other) { return other !== callback; }) : [];
	      });
	      return source;
	    };
	  }

	  // A repulsion pass of its own, for addRepulsion()
	  function createRepulsionPass(name, options) {
	    var passLaw = createRepulsionLaw(options.law);
	    var passQuadTree, passDualTree;
	    var member = treeMember(name, run, chargeName, sensitivityName, function () { return passLaw; }, options.centroid || 'own');
	    return {
	      law: member.law,
	      tree: member,
	      run: run,
	      describe: function () {
	        return describeTree(null, passLaw, member);
	      }
	    };

	    function run() {
	      if (store.n === 0) return;
	      if (walkWith(member)) return;
	      passLaw.update(stepContext);
	      var charge = store[chargeName()];
	      if (!charge) throw new Error(name + ': no body column named ' + chargeName() + ' for charges');
	      var sensitivity = store[sensitivityName()];
	      if (!sensitivity) throw new Error(name + ': no body column named ' + sensitivityName() + ' for sensitivity');
	      if (settings.nbody === 'dualtree') {
	        if (!passDualTree) passDualTree = getTrees(passLaw).createDualTree(settings, runtimeLaw(passLaw));
	        passDualTree.computeForces(store, charge, sensitivity);
	        return;
	      }
	      if (!passQuadTree) passQuadTree = getTrees(passLaw).createQuadTree(settings, random, runtimeLaw(passLaw));
	      passQuadTree.options(settings);
	      passQuadTree.insertBodies(store, charge, sensitivity);
	      var pinned = store.pinned;
	      var i = store.n;
	      while (i--) {
	        if (!pinned[i] && sensitivity[i] !== 0) passQuadTree.updateBodyForce(i);
	      }
	    }

	    function chargeName() { return options.charge || settings.repulsionCharge; }
	    function sensitivityName() { return options.sensitivity || options.charge || settings.repulsionCharge; }
	  }

	  // ---------------------------------------------------------------------------------------
	  // Walk groups: tree stages next to each other walk one tree with a charge each
	  // ---------------------------------------------------------------------------------------

	  // A tree stage's part in a walk: its name, its own run function, its columns and law
	  function treeMember(name, run, charge, sensitivity, lawOf, centroid) {
	    var member = { name: name, run: run, charge: charge, sensitivity: sensitivity, law: lawOf, centroid: centroid, group: null };
	    treeMembers.push(member);
	    return member;
	  }

	  // Tree stages that run one after another, each with its own function (not replaced, not gated),
	  // form a walk group: the stock repulsion and the addRepulsion passes next to it. A group walks
	  // one K-charge quad tree, under nbody 'dualtree' too; a stage alone keeps its own tree. The 2D
	  // bundle has pre-generated trees of one charge, so there every stage walks alone.
	  function findWalkGroups() {
	    walkVersion = structureVersion;
	    treeMembers.forEach(function (member) { member.group = null; });
	    if (generateQuadTreeFunction.preGenerated) return;
	    var run = [];
	    for (var i = 0; i <= stages.length; ++i) {
	      var stage = stages[i];
	      var member = stage && stage.tree && stage.run === stage.tree.run && !stage.gate ? stage.tree : null;
	      if (member) {
	        run.push(member);
	        continue;
	      }
	      if (run.length > 1) {
	        var group = { members: run, laws: null, tree: null, charges: [], sensitivities: [] };
	        run.forEach(function (other) { other.group = group; });
	      }
	      run = [];
	    }
	  }

	  // True when the member's charge is walked with its group: now, by the group's first stage, or
	  // already in this step
	  function walkWith(member) {
	    if (walkVersion !== structureVersion) findWalkGroups();
	    var group = member.group;
	    if (!group) return false;
	    if (group.members[0] === member) walkGroup(group);
	    return true;
	  }

	  function walkGroup(group) {
	    var members = group.members, K = members.length;
	    if (!group.tree) group.tree = walkTree(group);
	    var charges = group.charges, sensitivities = group.sensitivities;
	    for (var c = 0; c < K; ++c) {
	      var member = members[c];
	      group.laws[c].update(stepContext);
	      var chargeName = member.charge(), sensitivityName = member.sensitivity();
	      charges[c] = store[chargeName];
	      if (!charges[c]) throw new Error(member.name + ': no body column named ' + chargeName + ' for charges');
	      sensitivities[c] = store[sensitivityName];
	      if (!sensitivities[c]) throw new Error(member.name + ': no body column named ' + sensitivityName + ' for sensitivity');
	    }
	    var tree = group.tree;
	    tree.options(settings);
	    tree.insertBodies(store, charges, sensitivities);
	    var pinned = store.pinned;
	    var i = store.n;
	    while (i--) {
	      if (pinned[i]) continue;
	      // bodies that feel none of the charges are skipped
	      for (c = 0; c < K; ++c) {
	        if (sensitivities[c][i] !== 0) {
	          tree.updateBodyForce(i);
	          break;
	        }
	      }
	    }
	  }

	  function walkTree(group) {
	    var laws = group.laws = group.members.map(function (member) { return member.law(); });
	    var centroids = group.members.map(function (member) { return member.centroid; });
	    // The code depends on the laws' code, which charges share a law object, and the centre rules
	    var key = dimensions + '|' + laws.map(function (treeLaw) { return treeLaw.key + '#' + laws.indexOf(treeLaw); }).join('/') +
	      '|' + centroids.join(',');
	    var create = walkTreeCache[key] || (walkTreeCache[key] = generateQuadTreeFunction(dimensions, laws, { centroid: centroids }));
	    return create(settings, random, laws);
	  }

	  function getStage(name) {
	    var at = indexOfStage(name);
	    return at < 0 ? undefined : stages[at];
	  }

	  function indexOfStage(name) {
	    for (var i = 0; i < stages.length; ++i) if (stages[i].name === name) return i;
	    return -1;
	  }

	  function clearStage() {
	    factory.clearForces(store);
	  }

	  function repulsionStage() {
	    if (store.n === 0) return;
	    if (walkWith(repulsion.tree)) return;
	    law.update(stepContext);
	    var charge = store[settings.repulsionCharge];
	    if (!charge) throw new Error('No body column named ' + settings.repulsionCharge + ' for charges');
	    var sensitivity = settings.repulsionSensitivity ? store[settings.repulsionSensitivity] : charge;
	    if (!sensitivity) throw new Error('No body column named ' + settings.repulsionSensitivity + ' for sensitivity');

	    if (settings.nbody === 'dualtree') {
	      if (!dualTree) dualTree = getTrees(law).createDualTree(settings, runtimeLaw(law));
	      dualTree.computeForces(store, charge, sensitivity);
	      return;
	    }

	    if (!quadTree) quadTree = getTrees(law).createQuadTree(settings, random, runtimeLaw(law));
	    quadTree.options(settings);
	    quadTree.insertBodies(store, charge, sensitivity);
	    var pinned = store.pinned;
	    var i = store.n;
	    while (i--) {
	      if (!pinned[i]) quadTree.updateBodyForce(i);
	    }
	  }

	  // Trees for a law, each generated when a layout first walks it: most layouts never use the
	  // dual tree, and making it costs about as much as the first step's walk
	  function getTrees(treeLaw) {
	    var key = dimensions + '|' + treeLaw.key;
	    var trees = treeCache[key];
	    if (!trees) {
	      trees = treeCache[key] = {
	        createQuadTree: function (options, randomNumbers, runLaw) {
	          trees.createQuadTree = generateQuadTreeFunction(dimensions, treeLaw);
	          return trees.createQuadTree(options, randomNumbers, runLaw);
	        },
	        createDualTree: function (options, runLaw) {
	          trees.createDualTree = requireGenerateDualTree()(dimensions, treeLaw);
	          return trees.createDualTree(options, runLaw);
	        }
	      };
	    }
	    return trees;
	  }

	  // The law a tree reads at run time. The stock 1/r^2 code reads none, and asking a default law
	  // for its values would load and run the formula parser
	  function runtimeLaw(stageLaw) {
	    return stageLaw.isDefault ? null : stageLaw;
	  }

	  function dragStage() {
	    // FIRE replaces drag with its own way of removing energy from the system:
	    if (settings.integrator !== 'fire') dragForce.update(store);
	  }

	  function springStage() {
	    // Spring counts and lengths per body are only needed by the adaptive time step
	    springForce.update(springStore, store, settings.adaptiveTimeStepWeight !== 0);
	  }

	  function integrateStage() {
	    var integrate = factory.integrate;
	    var inertia = settings.inertia;
	    if (settings.integrator === 'fire') {
	      // A new inertia column starts FIRE again, as an uphill step does
	      if (!fireIntegrate || fireInertia !== inertia) {
	        var generateFireIntegratorFunction = requireGenerateFireIntegrator();
	        if (inertia === 'mass' && !factory.createFireIntegrator) factory.createFireIntegrator = generateFireIntegratorFunction(dimensions);
	        fireIntegrate = inertia === 'mass' ? factory.createFireIntegrator() : generateFireIntegratorFunction(dimensions, checkInertia(inertia))();
	        fireInertia = inertia;
	      }
	      integrate = fireIntegrate;
	    } else if (inertia !== 'mass') {
	      checkInertia(inertia);
	      if (!factory.integrateBy) factory.integrateBy = Object.create(null);
	      integrate = factory.integrateBy[inertia] || (factory.integrateBy[inertia] = generateIntegratorFunction(dimensions, inertia));
	    }
	    totalMovement = integrate(store, settings.timeStep, settings.adaptiveTimeStepWeight, settings.maxVelocity);
	  }

	  function checkInertia(inertia) {
	    if (!store[inertia]) throw new Error('No body column named ' + inertia + ' for inertia');
	    return inertia;
	  }

	  function pairRuleStage() {
	    var radii = pairRules.map(function (rule) {
	      return typeof rule.radius === 'function' ? rule.radius(stepContext) : rule.radius;
	    });
	    var largest = 0;
	    for (var i = 0; i < radii.length; ++i) if (radii[i] > largest) largest = radii[i];
	    if (!(largest > 0)) return;
	    var grid = publicApi.neighbors(largest);
	    for (var r = 0; r < pairRules.length; ++r) {
	      grid.applyPairRule(radii[r], pairRules[r].rule, pairRules[r].symmetric);
	    }
	  }

	  // Throws before anything is added when an axis is missing or not a finite number
	  function checkPosition(pos) {
	    for (var k = 0; k < dimensions; ++k) {
	      if (!Number.isFinite(pos[getVariableName(k)])) throw new Error('Expected value is not a finite number at Vector constructor (' + getVariableName(k) + ')');
	    }
	  }

	  function setPosition(index, pos) {
	    var offset = index * dimensions;
	    for (var k = 0; k < dimensions; ++k) store.pos[offset + k] = pos[getVariableName(k)];
	  }

	  function getBoundingBox() {
	    compact();
	    bounds.update();
	    return bounds.box;
	  }

	  function detachSpring(spring) {
	    var row = spring.index;
	    store.degree[springStore.from[row]] -= 1;
	    store.degree[springStore.to[row]] -= 1;
	    removedSpringRows.push(row);
	    springs.splice(findByRow(springs, row), 1);
	    // The removed spring keeps its numbers in its own fields
	    spring.detach();
	    topologyChanged = true;
	  }

	  function removeSpringsOf(body) {
	    for (var i = springs.length - 1; i >= 0; --i) {
	      var spring = springs[i];
	      if (spring.from === body || spring.to === body) detachSpring(spring);
	    }
	  }

	  /**
	   * Drops the rows of removed springs and bodies; the rows after them move down.
	   */
	  function compact() {
	    if (removedSpringRows.length) {
	      removedSpringRows.sort(byNumber);
	      springStore.removeRows(removedSpringRows);
	      for (var k = firstAfterRow(springs, removedSpringRows[0]); k < springs.length; ++k) {
	        springs[k].moveTo(springStore, k);
	      }
	      removedSpringRows.length = 0;
	    }
	    if (removedBodyRows.length) {
	      removedBodyRows.sort(byNumber);
	      if (springStore.n > 0) {
	        // Springs keep pointing to the same bodies after they move down
	        var newRow = new Int32Array(store.n);
	        for (var row = 0, removed = 0; row < store.n; ++row) {
	          if (removedBodyRows[removed] === row) removed += 1;
	          else newRow[row] = row - removed;
	        }
	        var from = springStore.from, to = springStore.to;
	        for (var s = 0; s < springStore.n; ++s) {
	          from[s] = newRow[from[s]];
	          to[s] = newRow[to[s]];
	        }
	      }
	      store.removeRows(removedBodyRows);
	      for (var i = firstAfterRow(bodies, removedBodyRows[0]); i < bodies.length; ++i) {
	        bodies[i].moveTo(store, i);
	      }
	      removedBodyRows.length = 0;
	      // Bodies removed from now on go to a new store
	      removedStore = null;
	      removedBodies = [];
	    }
	  }

	  function onRemovedStoreResize() {
	    for (var i = 0; i < removedBodies.length; ++i) {
	      var body = removedBodies[i];
	      if (body.store === removedStore) body.moveTo(removedStore, body.index);
	    }
	  }
	}

	// What a view reads (the settings, or the store), under a symbol: the view's own keys are only
	// its getters. The same symbol as formula.js's, which this file does not load up front
	var SETTINGS = typeof Symbol === 'function' ? Symbol.for('ngraph.forcelayout.settings') : '$settings';

	function SettingsView(settings) {
	  Object.defineProperty(this, SETTINGS, { value: settings });
	}

	// Prototypes of step contexts, one per list of setting names: a getter method per setting
	// (`springLength()`, ...) and unit(), reading the context's settings view
	var contextPrototypes = Object.create(null);
	var CONTEXT_FIELDS = { iteration: true, settings: true, store: true, unit: true };
	function contextPrototype(keys) {
	  var id = keys.join(',');
	  var prototype = contextPrototypes[id];
	  if (prototype) return prototype;
	  // They read the live settings behind the view (see formula.liveSettings)
	  prototype = {
	    unit: function () {
	      var length = this.settings[SETTINGS].springLength;
	      return length > MIN_UNIT ? length : MIN_UNIT;
	    }
	  };
	  keys.forEach(function (key) {
	    if (!CONTEXT_FIELDS[key]) prototype[key] = function () { return this.settings[SETTINGS][key]; };
	  });
	  contextPrototypes[id] = Object.freeze(prototype);
	  return prototype;
	}

	// `store.n` and `store.D` of the step context; the getter is shared, so all views have one shape
	function StoreView(store) {
	  Object.defineProperty(this, SETTINGS, { value: store });
	  this.D = store.D;
	}
	Object.defineProperty(StoreView.prototype, 'n', { get: function () { return this[SETTINGS].n; } });

	// One getter per setting name for all views, so views with the same settings share a shape
	var settingGetters = Object.create(null);
	function settingGetter(key) {
	  var getter = settingGetters[key];
	  if (!getter) getter = settingGetters[key] = function () { return this[SETTINGS][key]; };
	  return getter;
	}

	function getFormulaStages() {
	  if (!formulaStages) formulaStages = requireFormulaStages();
	  return formulaStages;
	}

	function getDescriber() {
	  if (!describer) describer = requireDescribeProgram();
	  return describer;
	}

	function byNumber(a, b) { return a - b; }

	// Position of the item whose `index` is `row` in an array sorted by `index`
	function findByRow(array, row) {
	  var lo = 0, hi = array.length - 1;
	  while (lo <= hi) {
	    var mid = (lo + hi) >> 1;
	    var midRow = array[mid].index;
	    if (midRow === row) return mid;
	    if (midRow < row) lo = mid + 1; else hi = mid - 1;
	  }
	  return -1;
	}

	// Position of the first item whose `index` is greater than `row`
	function firstAfterRow(array, row) {
	  var lo = 0, hi = array.length;
	  while (lo < hi) {
	    var mid = (lo + hi) >> 1;
	    if (array[mid].index <= row) lo = mid + 1; else hi = mid;
	  }
	  return lo;
	}

	// Setters call `changed(key, oldValue, value)` after a setting changed
	function expose(settings, target, changed) {
	  for (var key in settings) {
	    augment(settings, target, key, changed);
	  }
	}

	function augment(source, target, key, changed) {
	  if (!source.hasOwnProperty(key)) return;
	  if (typeof target[key] === 'function') {
	    // this accessor is already defined. Ignore it
	    return;
	  }
	  var sourceIsNumber = Number.isFinite(source[key]);

	  if (sourceIsNumber) {
	    target[key] = function (value) {
	      if (value !== undefined) {
	        if (!Number.isFinite(value)) throw new Error('Value of ' + key + ' should be a valid number.');
	        var old = source[key];
	        source[key] = value;
	        if (old !== value) changed(key, old, value);
	        return target;
	      }
	      return source[key];
	    };
	  } else {
	    target[key] = function (value) {
	      if (value !== undefined) {
	        var old = source[key];
	        source[key] = value;
	        if (old !== value) changed(key, old, value);
	        return target;
	      }
	      return source[key];
	    };
	  }
	}
	return createPhysicsSimulator_1;
}

var createStabilityCheck_1;
var hasRequiredCreateStabilityCheck;

function requireCreateStabilityCheck () {
	if (hasRequiredCreateStabilityCheck) return createStabilityCheck_1;
	hasRequiredCreateStabilityCheck = 1;
	createStabilityCheck_1 = createStabilityCheck;

	/**
	 * Says when a layout has settled: when its drawing has stopped changing ('still'), or when
	 * what still changes is only noise ('noise').
	 *
	 * Every `window` steps it compares where a sample of bodies is now with where they were:
	 *  - still: 95% of the bodies moved less than `stillness` of the drawing's size over the last
	 *    window (0.002 is 2 px of a drawing shown 1000 px wide), on two checks in a row;
	 *  - noise: bodies moved no further over the last four windows than over the last one, as for
	 *    jitter or a random walk (mean squared shift over four windows below `noise` times the one
	 *    window shift; directed motion gives 16, a random walk 4, jitter 1), on `hold` checks in a
	 *    row.
	 * Shifts are measured after removing the drift of the whole drawing; pinned bodies are left
	 * out. A check costs O(sample size), once per window: nothing per step.
	 *
	 * Steps are counted by `simulator.iteration()`, so an engine that runs many steps between
	 * calls (the GPU, which reads positions back once per batch) gets a check at its next call
	 * after a window has passed, over the steps that actually passed.
	 */
	function createStabilityCheck(simulator, options) {
	  options = options || {};
	  var window = options.window > 0 ? options.window : 100;
	  var stillness = options.stillness >= 0 ? options.stillness : 0.002;
	  var noise = options.noise >= 0 ? options.noise : 5;
	  var hold = options.hold > 0 ? options.hold : 3;
	  var sampleSize = options.sample > 0 ? options.sample : 1000;

	  var store = simulator.store;
	  var HISTORY = 5; // now and four windows back
	  var sample, D, m;
	  var ring, ringSteps, ringCount;
	  var lastCheck, stillChecks, noiseChecks;
	  var state;
	  reset();

	  return {
	    /** Looks at the bodies if a window has passed since the last check; returns `stable` */
	    update: update,
	    /** Forgets what it saw: positions were moved by hand, the graph or the physics changed */
	    reset: reset,
	    /** {stable, reason ('still', 'noise' or ''), step (when it settled), stillness, noise} */
	    state: function () { return state; }
	  };

	  function reset() {
	    sample = null;
	    ringCount = 0;
	    lastCheck = -Infinity;
	    stillChecks = 0;
	    noiseChecks = 0;
	    state = {stable: false, reason: '', step: -1, stillness: NaN, noise: NaN};
	  }

	  function pickSample() {
	    var n = store.n;
	    D = store.D;
	    m = Math.min(n, sampleSize);
	    sample = new Int32Array(m);
	    if (m === n) {
	      for (var i = 0; i < n; ++i) sample[i] = i;
	    } else {
	      // every k-th row from a fixed offset: rows follow the order nodes were added
	      var stride = n / m;
	      for (var j = 0; j < m; ++j) sample[j] = Math.floor(j * stride + stride / 2);
	    }
	    ring = new Float64Array(HISTORY * m * D);
	    ringSteps = new Float64Array(HISTORY);
	  }

	  function update() {
	    if (state.stable) return true;
	    var step = simulator.iteration();
	    if (step - lastCheck < window) return false;
	    if (!sample || sample.length !== Math.min(store.n, sampleSize)) pickSample();
	    if (m === 0) return settle('still', step);
	    lastCheck = step;

	    // newest snapshot first: shift the ring
	    ring.copyWithin(m * D, 0, (HISTORY - 1) * m * D);
	    ringSteps.copyWithin(1, 0, HISTORY - 1);
	    var pos = store.pos;
	    for (var j = 0; j < m; ++j) {
	      var from = sample[j] * D;
	      for (var k = 0; k < D; ++k) ring[j * D + k] = pos[from + k];
	    }
	    ringSteps[0] = step;
	    if (ringCount < HISTORY) ringCount += 1;
	    if (ringCount < 2) return false;

	    var size = drawingSize();
	    var one = shifts(1);
	    state.stillness = size > 0 ? one.q95 / size : 0;
	    stillChecks = state.stillness <= stillness ? stillChecks + 1 : 0;
	    if (stillChecks >= 2) return settle('still', step);

	    if (ringCount === HISTORY) {
	      var four = shifts(HISTORY - 1);
	      state.noise = one.msd > 0 ? four.msd / one.msd : Infinity;
	      noiseChecks = state.noise < noise ? noiseChecks + 1 : 0;
	      if (noiseChecks >= hold) return settle('noise', step);
	    }
	    return false;
	  }

	  function settle(reason, step) {
	    state.stable = true;
	    state.reason = reason;
	    state.step = step;
	    return true;
	  }

	  // Shifts between the newest snapshot and the one `back` windows ago, the mean shift removed:
	  // their 95th percentile and mean square
	  var lengths = null;
	  function shifts(back) {
	    var pinned = store.pinned;
	    var mean = new Float64Array(D), count = 0, j, k;
	    var old = back * m * D;
	    for (j = 0; j < m; ++j) {
	      if (pinned[sample[j]]) continue;
	      for (k = 0; k < D; ++k) mean[k] += ring[j * D + k] - ring[old + j * D + k];
	      count += 1;
	    }
	    if (count === 0) return {q95: 0, msd: 0};
	    for (k = 0; k < D; ++k) mean[k] /= count;
	    if (!lengths || lengths.length !== m) lengths = new Float64Array(m);
	    var used = 0, sum = 0;
	    for (j = 0; j < m; ++j) {
	      if (pinned[sample[j]]) continue;
	      var d2 = 0;
	      for (k = 0; k < D; ++k) {
	        var d = ring[j * D + k] - ring[old + j * D + k] - mean[k];
	        d2 += d * d;
	      }
	      sum += d2;
	      lengths[used++] = d2;
	    }
	    var sorted = lengths.subarray(0, used).sort();
	    return {q95: Math.sqrt(sorted[Math.floor(0.95 * (used - 1))]), msd: sum / used};
	  }

	  // The larger side of the box around all bodies
	  function drawingSize() {
	    var box = simulator.getBBox();
	    var size = 0;
	    for (var k = 0; k < D; ++k) {
	      var name = k < 3 ? ['x', 'y', 'z'][k] : 'c' + (k + 1);
	      var lo = box['min_' + name], hi = box['max_' + name];
	      if (hi - lo > size) size = hi - lo;
	    }
	    return size;
	  }
	}
	return createStabilityCheck_1;
}

var hasRequiredNgraph_forcelayout;

function requireNgraph_forcelayout () {
	if (hasRequiredNgraph_forcelayout) return ngraph_forcelayout.exports;
	hasRequiredNgraph_forcelayout = 1;
	ngraph_forcelayout.exports = createLayout;
	ngraph_forcelayout.exports.simulator = requireCreatePhysicsSimulator();

	var eventify = requireNgraph_events();
	var createStabilityCheck = requireCreateStabilityCheck();

	/**
	 * Creates force based layout for a given graph.
	 *
	 * @param {ngraph.graph} graph which needs to be laid out
	 * @param {object} physicsSettings if you need custom settings
	 * for physics simulator you can pass your own settings here. If it's not passed
	 * a default one will be created.
	 */
	function createLayout(graph, physicsSettings) {
	  if (!graph) {
	    throw new Error('Graph structure cannot be undefined');
	  }

	  var createSimulator = (physicsSettings && physicsSettings.createSimulator) || requireCreatePhysicsSimulator();
	  var physicsSimulator = createSimulator(physicsSettings);
	  if (Array.isArray(physicsSettings)) throw new Error('Physics settings is expected to be an object');

	  var nodeMass = graph.version > 19 ? defaultSetNodeMass : defaultArrayNodeMass;
	  if (physicsSettings && typeof physicsSettings.nodeMass === 'function') {
	    nodeMass = physicsSettings.nodeMass;
	  }
	  // How hard a node pushes others. Without it, the mass is used.
	  var nodeCharge = physicsSettings && typeof physicsSettings.nodeCharge === 'function' ? physicsSettings.nodeCharge : null;
	  if (nodeCharge) {
	    physicsSimulator.store.define('charge', Float64Array, 1, 1);
	    physicsSimulator.repulsionCharge('charge');
	  }

	  var nodeBodies = new Map();
	  var springs = {};
	  var bodiesCount = 0;

	  var springTransform = physicsSimulator.settings.springTransform || noop;

	  // Initialize physics with what we have in the graph:
	  initPhysics();
	  listenToEvents();

	  var wasStable = false;
	  // When the drawing stopped changing (see lib/createStabilityCheck.js). `stable` in the
	  // settings tunes it: {window, stillness, noise, hold, sample}.
	  var stability = createStabilityCheck(physicsSimulator, physicsSettings && physicsSettings.stable);
	  // New physics, new graph: the layout has to settle again
	  physicsSimulator.on('settings', wake);
	  physicsSimulator.on('topology', wake);

	  var api = {
	    /**
	     * Performs one step of iterative layout algorithm
	     *
	     * @returns {boolean} true once the layout has settled: its drawing stopped changing, or only
	     * noise is left (see `getStability()`). It stays true until nodes are moved by hand, the
	     * graph changes or a setting changes.
	     */
	    step: function() {
	      if (bodiesCount === 0) {
	        updateStableStatus(true);
	        return true;
	      }

	      var lastMove = physicsSimulator.step();

	      // Save the movement in case if someone wants to query it in the step
	      // callback.
	      api.lastMove = lastMove;

	      // Allow listeners to perform low-level actions after nodes are updated.
	      api.fire('step');

	      return api.checkStable();
	    },

	    /**
	     * Updates whether the layout has settled from the positions in the store, and fires
	     * 'stable' when that changed. step() calls it; engines that step elsewhere (the GPU) call it
	     * after they bring positions back.
	     */
	    checkStable: function () {
	      var isStableNow = bodiesCount === 0 || stability.update();
	      updateStableStatus(isStableNow);
	      return isStableNow;
	    },

	    /**
	     * Whether and why the layout has settled: {stable, reason, step, stillness, noise}.
	     * `reason` is 'still' (the drawing stopped changing) or 'noise' (what still moves goes
	     * nowhere); `step` is when it settled; `stillness` is how far bodies moved over the last
	     * window, as a share of the drawing's size; `noise` how much further they moved over four
	     * windows than over one (16 for directed motion, 1 to 4 for noise).
	     */
	    getStability: function () {
	      return stability.state();
	    },

	    /**
	     * For a given `nodeId` returns position
	     */
	    getNodePosition: function (nodeId) {
	      return getInitializedBody(nodeId).pos;
	    },

	    /**
	     * Sets position of a node to a given coordinates
	     * @param {string} nodeId node identifier
	     * @param {number} x position of a node
	     * @param {number} y position of a node
	     * @param {number=} z position of node (only if applicable to body)
	     */
	    setNodePosition: function (nodeId) {
	      var body = getInitializedBody(nodeId);
	      body.setPosition.apply(body, Array.prototype.slice.call(arguments, 1));
	      // A node moved by hand: the others have to settle around it again
	      wake();
	    },

	    /**
	     * @returns {Object} Link position by link id
	     * @returns {Object.from} {x, y} coordinates of link start
	     * @returns {Object.to} {x, y} coordinates of link end
	     */
	    getLinkPosition: function (linkId) {
	      var spring = springs[linkId];
	      if (spring) {
	        return {
	          from: spring.from.pos,
	          to: spring.to.pos
	        };
	      }
	    },

	    /**
	     * @returns {Object} area required to fit in the graph. Object contains
	     * `x1`, `y1` - top left coordinates
	     * `x2`, `y2` - bottom right coordinates
	     */
	    getGraphRect: function () {
	      return physicsSimulator.getBBox();
	    },

	    /**
	     * Iterates over each body in the layout simulator and performs a callback(body, nodeId)
	     */
	    forEachBody: forEachBody,

	    /*
	     * Requests layout algorithm to pin/unpin node to its current position
	     * Pinned nodes should not be affected by layout algorithm and always
	     * remain at their position
	     */
	    pinNode: function (node, isPinned) {
	      var body = getInitializedBody(node.id);
	       body.isPinned = !!isPinned;
	    },

	    /**
	     * Checks whether given graph's node is currently pinned
	     */
	    isNodePinned: function (node) {
	      return getInitializedBody(node.id).isPinned;
	    },

	    /**
	     * Request to release all resources
	     */
	    dispose: function() {
	      graph.off('changed', onGraphChanged);
	      api.fire('disposed');
	    },

	    /**
	     * Gets physical body for a given node id. If node is not found undefined
	     * value is returned.
	     */
	    getBody: getBody,

	    /**
	     * Gets spring for a given edge.
	     *
	     * @param {string} linkId link identifier. If two arguments are passed then
	     * this argument is treated as formNodeId
	     * @param {string=} toId when defined this parameter denotes head of the link
	     * and first argument is treated as tail of the link (fromId)
	     */
	    getSpring: getSpring,

	    /**
	     * Returns length of cumulative force vector. The closer this to zero - the more stable the system is
	     */
	    getForceVectorLength: getForceVectorLength,

	    /**
	     * [Read only] Gets current physics simulator
	     */
	    simulator: physicsSimulator,

	    /**
	     * Gets the graph that was used for layout
	     */
	    graph: graph,

	    /**
	     * Gets amount of movement performed during last step operation
	     */
	    lastMove: 0
	  };

	  eventify(api);
	  // program() lists the layout's 'step' listeners too: other engines call them less often
	  if (physicsSimulator.watchListeners) physicsSimulator.watchListeners(api);

	  return api;

	  function wake() {
	    stability.reset();
	    updateStableStatus(bodiesCount === 0);
	  }

	  function updateStableStatus(isStableNow) {
	    if (wasStable !== isStableNow) {
	      wasStable = isStableNow;
	      onStableChanged(isStableNow);
	    }
	  }

	  function forEachBody(cb) {
	    nodeBodies.forEach(cb);
	  }

	  function getForceVectorLength() {
	    var fx = 0, fy = 0;
	    forEachBody(function(body) {
	      fx += Math.abs(body.force.x);
	      fy += Math.abs(body.force.y);
	    });
	    return Math.sqrt(fx * fx + fy * fy);
	  }

	  function getSpring(fromId, toId) {
	    var linkId;
	    if (toId === undefined) {
	      if (typeof fromId !== 'object') {
	        // assume fromId as a linkId:
	        linkId = fromId;
	      } else {
	        // assume fromId to be a link object:
	        linkId = fromId.id;
	      }
	    } else {
	      // toId is defined, should grab link:
	      var link = graph.hasLink(fromId, toId);
	      if (!link) return;
	      linkId = link.id;
	    }

	    return springs[linkId];
	  }

	  function getBody(nodeId) {
	    return nodeBodies.get(nodeId);
	  }

	  function listenToEvents() {
	    graph.on('changed', onGraphChanged);
	  }

	  function onStableChanged(isStable) {
	    api.fire('stable', isStable);
	  }

	  function onGraphChanged(changes) {
	    for (var i = 0; i < changes.length; ++i) {
	      var change = changes[i];
	      if (change.changeType === 'add') {
	        if (change.node) {
	          initBody(change.node.id);
	        }
	        if (change.link) {
	          initLink(change.link);
	        }
	      } else if (change.changeType === 'remove') {
	        if (change.node) {
	          releaseNode(change.node);
	        }
	        if (change.link) {
	          releaseLink(change.link);
	        }
	      }
	    }
	    bodiesCount = graph.getNodesCount();
	  }

	  function initPhysics() {
	    bodiesCount = 0;
	    // Rows for every node and link at once: growing the stores one doubling at a time copies
	    // them and re-points every body each time
	    var bodyStore = physicsSimulator.store, springStore = physicsSimulator.springStore;
	    if (bodyStore && bodyStore.reserve && graph.getNodesCount) bodyStore.reserve(graph.getNodesCount());
	    if (springStore && springStore.reserve && graph.getLinksCount) springStore.reserve(graph.getLinksCount());

	    graph.forEachNode(function (node) {
	      initBody(node.id);
	      bodiesCount += 1;
	    });

	    graph.forEachLink(initLink);
	  }

	  function initBody(nodeId) {
	    var body = nodeBodies.get(nodeId);
	    if (!body) {
	      var node = graph.getNode(nodeId);
	      if (!node) {
	        throw new Error('initBody() was called with unknown node id');
	      }

	      var pos = node.position;
	      if (!pos) {
	        var neighbors = getNeighborBodies(node);
	        pos = physicsSimulator.getBestNewBodyPosition(neighbors);
	      }

	      body = physicsSimulator.addBodyAt(pos);
	      body.id = nodeId;

	      nodeBodies.set(nodeId, body);
	      updateBodyMass(nodeId);

	      if (isNodeOriginallyPinned(node)) {
	        body.isPinned = true;
	      }
	    }
	  }

	  function releaseNode(node) {
	    var nodeId = node.id;
	    var body = nodeBodies.get(nodeId);
	    if (body) {
	      nodeBodies.delete(nodeId);
	      physicsSimulator.removeBody(body);
	    }
	  }

	  function initLink(link) {
	    updateBodyMass(link.fromId);
	    updateBodyMass(link.toId);

	    var fromBody = nodeBodies.get(link.fromId),
	        toBody  = nodeBodies.get(link.toId),
	        spring = physicsSimulator.addSpring(fromBody, toBody, link.length);

	    springTransform(link, spring);

	    springs[link.id] = spring;
	  }

	  function releaseLink(link) {
	    var spring = springs[link.id];
	    if (spring) {
	      var from = graph.getNode(link.fromId),
	          to = graph.getNode(link.toId);

	      if (from) updateBodyMass(from.id);
	      if (to) updateBodyMass(to.id);

	      delete springs[link.id];

	      physicsSimulator.removeSpring(spring);
	    }
	  }

	  function getNeighborBodies(node) {
	    // TODO: Could probably be done better on memory
	    var neighbors = [];
	    if (!node.links) {
	      return neighbors;
	    }
	    // TODO: Previously I was looking only at two links. Should I look at all of them?
	    node.links.forEach(function(link) {
	      var otherBody = link.fromId !== node.id ? nodeBodies.get(link.fromId) : nodeBodies.get(link.toId);
	      if (otherBody && otherBody.pos) {
	        neighbors.push(otherBody);
	      }
	    });

	    return neighbors;
	  }

	  function updateBodyMass(nodeId) {
	    var body = nodeBodies.get(nodeId);
	    // Straight into the store, not through the setter: every mass update here comes with a graph
	    // edit, after which the simulator marks all columns changed anyway
	    var mass = body.store.mass;
	    mass[body.index] = nodeMass(nodeId);
	    if (Number.isNaN(mass[body.index])) {
	      throw new Error('Node mass should be a number');
	    }
	    if (nodeCharge) {
	      var charge = nodeCharge(nodeId);
	      if (typeof charge !== 'number' || Number.isNaN(charge)) throw new Error('Node charge should be a number');
	      physicsSimulator.store.charge[body.index] = charge;
	    }
	  }

	  /**
	   * Checks whether graph node has in its settings pinned attribute,
	   * which means layout algorithm cannot move it. Node can be marked
	   * as pinned, if it has "isPinned" attribute, or when node.data has it.
	   *
	   * @param {Object} node a graph node to check
	   * @return {Boolean} true if node should be treated as pinned; false otherwise.
	   */
	  function isNodeOriginallyPinned(node) {
	    return (node && (node.isPinned || (node.data && node.data.isPinned)));
	  }

	  function getInitializedBody(nodeId) {
	    var body = nodeBodies.get(nodeId);
	    if (!body) {
	      initBody(nodeId);
	      body = nodeBodies.get(nodeId);
	    }
	    return body;
	  }

	  /**
	   * Calculates mass of a body, which corresponds to node with given id.
	   *
	   * @param {String|Number} nodeId identifier of a node, for which body mass needs to be calculated
	   * @returns {Number} recommended mass of the body;
	   */
	  function defaultArrayNodeMass(nodeId) {
	    // This function is for older versions of ngraph.graph.
	    var links = graph.getLinks(nodeId);
	    if (!links) return 1;
	    return 1 + links.length / 3.0;
	  }

	  function defaultSetNodeMass(nodeId) {
	    var links = graph.getLinks(nodeId);
	    if (!links) return 1;
	    return 1 + links.size / 3.0;
	  }
	}

	function noop() { }
	return ngraph_forcelayout.exports;
}

var ngraph_forcelayoutExports = requireNgraph_forcelayout();
var createLayout = /*@__PURE__*/getDefaultExportFromCjs(ngraph_forcelayoutExports);

/**
 * @fileOverview Contains definition of the core graph object.
 */


/**
 * Creates a new graph
 */
function createGraph(options) {
  // Graph structure is maintained as Map of nodes and Map of links.
  // Each node has 'links' (Set) which holds all incident links. This is
  // efficient for lookups and iteration, while keeping the API simple.
  options = options || {};
  if ('uniqueLinkId' in options) {
    console.warn(
      'ngraph.graph: Starting from version 0.14 `uniqueLinkId` is deprecated.\n' +
      'Use `multigraph` option instead\n',
      '\n',
      'Note: there is also change in default behavior: From now on each graph\n' +
      'is considered to be not a multigraph by default (each edge is unique).'
    );

    options.multigraph = options.uniqueLinkId;
  }

  // Dear reader, the non-multigraphs do not guarantee that there is only
  // one link for a given pair of node. When this option is set to false
  // we can save some memory and CPU (18% faster for non-multigraph);
  if (options.multigraph === undefined) options.multigraph = false;

  if (typeof Map !== 'function') {
    // TODO: Should we polyfill it ourselves? We don't use much operations there..
    throw new Error('ngraph.graph requires `Map` to be defined. Please polyfill it before using ngraph');
  }

  var nodes = new Map(); // nodeId => Node
  var links = new Map(); // linkId => Link
  // Hash of multi-edges. Used to track ids of edges between same nodes
  var multiEdges = {};
  var suspendEvents = 0;

  var createLink = options.multigraph ? createUniqueLink : createSingleLink,

    // Our graph API provides means to listen to graph changes. Users can subscribe
    // to be notified about changes in the graph by using `on` method. However
    // in some cases they don't use it. To avoid unnecessary memory consumption
    // we will not record graph changes until we have at least one subscriber.
    // Code below supports this optimization.
    //
    // Accumulates all changes made during graph updates.
    // Each change element contains:
    //  changeType - one of the strings: 'add', 'remove' or 'update';
    //  node - if change is related to node this property is set to changed graph's node;
    //  link - if change is related to link this property is set to changed graph's link;
    changes = [],
    recordLinkChange = noop,
    recordNodeChange = noop,
    enterModification = noop,
    exitModification = noop;

  // this is our public API:
  var graphPart = {
    /**
     * Sometimes duck typing could be slow. Giving clients a hint about data structure
     * via explicit version number here:
     */
    version: 20.0,

    /**
     * Adds node to the graph. If node with given id already exists in the graph
     * its data is extended with whatever comes in 'data' argument.
     *
     * @param nodeId the node's identifier. A string or number is preferred.
     * @param [data] additional data for the node being added. If node already
     *   exists its data object is augmented with the new one.
     *
     * @return {node} The newly added node or node with given id if it already exists.
     */
    addNode: addNode,

    /**
     * Adds a link to the graph. The function always create a new
     * link between two nodes. If one of the nodes does not exists
     * a new node is created.
     *
     * @param fromId link start node id;
     * @param toId link end node id;
     * @param [data] additional data to be set on the new link;
     *
     * @return {link} The newly created link
     */
    addLink: addLink,

    /**
     * Removes link from the graph. If link does not exist does nothing.
     *
     * @param link - object returned by addLink() or getLinks() methods.
     *
     * @returns true if link was removed; false otherwise.
     */
    removeLink: removeLink,

    /**
     * Removes node with given id from the graph. If node does not exist in the graph
     * does nothing.
     *
     * @param nodeId node's identifier passed to addNode() function.
     *
     * @returns true if node was removed; false otherwise.
     */
    removeNode: removeNode,

    /**
     * Gets node with given identifier. If node does not exist undefined value is returned.
     *
     * @param nodeId requested node identifier;
     *
     * @return {node} in with requested identifier or undefined if no such node exists.
     */
    getNode: getNode,

    /**
     * Gets number of nodes in this graph.
     *
     * @return number of nodes in the graph.
     */
    getNodeCount: getNodeCount,

    /**
     * Gets total number of links in the graph.
     */
    getLinkCount: getLinkCount,

    /**
     * Synonym for `getLinkCount()`
     */
    getEdgeCount: getLinkCount,

    /**
     * Synonym for `getLinkCount()`
     */
    getLinksCount: getLinkCount,

    /**
     * Synonym for `getNodeCount()`
     */
    getNodesCount: getNodeCount,

    /**
     * Gets all links (inbound and outbound) from the node with given id.
     * If node with given id is not found null is returned.
     *
     * @param nodeId requested node identifier.
     *
     * @return Set of links from and to requested node if such node exists;
     *   otherwise null is returned.
     */
    getLinks: getLinks,

    /**
     * Invokes callback on each node of the graph.
     *
     * @param {Function(node)} callback Function to be invoked. The function
     *   is passed one argument: visited node.
     */
    forEachNode: forEachNode,

    /**
     * Invokes callback on every linked (adjacent) node to the given one.
     *
     * @param nodeId Identifier of the requested node.
     * @param {Function(node, link)} callback Function to be called on all linked nodes.
     *   The function is passed two parameters: adjacent node and link object itself.
     * @param oriented if true graph treated as oriented.
     */
    forEachLinkedNode: forEachLinkedNode,

    /**
     * Enumerates all links in the graph
     *
     * @param {Function(link)} callback Function to be called on all links in the graph.
     *   The function is passed one parameter: graph's link object.
     *
     * Link object contains at least the following fields:
     *  fromId - node id where link starts;
     *  toId - node id where link ends,
     *  data - additional data passed to graph.addLink() method.
     */
    forEachLink: forEachLink,

    /**
     * Suspend all notifications about graph changes until
     * endUpdate is called.
     */
    beginUpdate: enterModification,

    /**
     * Resumes all notifications about graph changes and fires
     * graph 'changed' event in case there are any pending changes.
     */
    endUpdate: exitModification,

    /**
     * Removes all nodes and links from the graph.
     */
    clear: clear,

    /**
     * Detects whether there is a link between two nodes.
     * Operation complexity is O(n) where n - number of links of a node.
     * NOTE: this function is synonym for getLink()
     *
     * @returns link if there is one. null otherwise.
     */
    hasLink: getLink,

    /**
     * Detects whether there is a node with given id
     * 
     * Operation complexity is O(1)
     * NOTE: this function is synonym for getNode()
     *
     * @returns node if there is one; Falsy value otherwise.
     */
    hasNode: getNode,

    /**
     * Gets an edge between two nodes.
     * Operation complexity is O(n) where n - number of links of a node.
     *
     * @param {string} fromId link start identifier
     * @param {string} toId link end identifier
     *
     * @returns link if there is one; undefined otherwise.
     */
    getLink: getLink,

    /**
     * Gets a link by its id.
     *
     * @param {string} linkId link identifier
     *
     * @returns link if there is one; undefined otherwise.
     */
    getLinkById: getLinkById
  };

  // this will add `on()` and `fire()` methods.
  eventify(graphPart);

  monitorSubscribers();

  return graphPart;

  function monitorSubscribers() {
    var realOn = graphPart.on;

    // replace real `on` with our temporary on, which will trigger change
    // modification monitoring:
    graphPart.on = on;

    function on() {
      // now it's time to start tracking stuff:
      graphPart.beginUpdate = enterModification = enterModificationReal;
      graphPart.endUpdate = exitModification = exitModificationReal;
      recordLinkChange = recordLinkChangeReal;
      recordNodeChange = recordNodeChangeReal;

      // this will replace current `on` method with real pub/sub from `eventify`.
      graphPart.on = realOn;
      // delegate to real `on` handler:
      return realOn.apply(graphPart, arguments);
    }
  }

  function recordLinkChangeReal(link, changeType) {
    changes.push({
      link: link,
      changeType: changeType
    });
  }

  function recordNodeChangeReal(node, changeType) {
    changes.push({
      node: node,
      changeType: changeType
    });
  }

  function addNode(nodeId, data) {
    if (nodeId === undefined) {
      throw new Error('Invalid node identifier');
    }

    enterModification();

    var node = getNode(nodeId);
    if (!node) {
      node = new Node(nodeId, data);
      recordNodeChange(node, 'add');
    } else {
      node.data = data;
      recordNodeChange(node, 'update');
    }

    nodes.set(nodeId, node);

    exitModification();
    return node;
  }

  function getNode(nodeId) {
    return nodes.get(nodeId);
  }

  function removeNode(nodeId) {
    var node = getNode(nodeId);
    if (!node) {
      return false;
    }

    enterModification();

    var prevLinks = node.links;
    if (prevLinks) {
      prevLinks.forEach(removeLinkInstance);
      node.links = null;
    }

    nodes.delete(nodeId);

    recordNodeChange(node, 'remove');

    exitModification();

    return true;
  }


  function addLink(fromId, toId, data) {
    enterModification();

    var fromNode = getNode(fromId) || addNode(fromId);
    var toNode = getNode(toId) || addNode(toId);

    var link = createLink(fromId, toId, data);
    var isUpdate = links.has(link.id);

    links.set(link.id, link);

    // TODO: this is not cool. On large graphs potentially would consume more memory.
    addLinkToNode(fromNode, link);
    if (fromId !== toId) {
      // make sure we are not duplicating links for self-loops
      addLinkToNode(toNode, link);
    }

    recordLinkChange(link, isUpdate ? 'update' : 'add');

    exitModification();

    return link;
  }

  function createSingleLink(fromId, toId, data) {
    var linkId = makeLinkId(fromId, toId);
    var prevLink = links.get(linkId);
    if (prevLink) {
      prevLink.data = data;
      return prevLink;
    }

    return new Link(fromId, toId, data, linkId);
  }

  function createUniqueLink(fromId, toId, data) {
    // TODO: Find a better/faster way to store multigraphs
    var linkId = makeLinkId(fromId, toId);
    var isMultiEdge = multiEdges.hasOwnProperty(linkId);
    if (isMultiEdge || getLink(fromId, toId)) {
      if (!isMultiEdge) {
        multiEdges[linkId] = 0;
      }
      var suffix = '@' + (++multiEdges[linkId]);
      linkId = makeLinkId(fromId + suffix, toId + suffix);
    }

    return new Link(fromId, toId, data, linkId);
  }

  function getNodeCount() {
    return nodes.size;
  }

  function getLinkCount() {
    return links.size;
  }

  function getLinks(nodeId) {
    var node = getNode(nodeId);
    return node ? node.links : null;
  }

  function removeLink(link, otherId) {
    if (otherId !== undefined) {
      link = getLink(link, otherId);
    }
    return removeLinkInstance(link);
  }

  function removeLinkInstance(link) {
    if (!link) {
      return false;
    }
    if (!links.get(link.id)) return false;

    enterModification();

    links.delete(link.id);

    var fromNode = getNode(link.fromId);
    var toNode = getNode(link.toId);

    if (fromNode) {
      fromNode.links.delete(link);
    }

    if (toNode) {
      toNode.links.delete(link);
    }

    recordLinkChange(link, 'remove');

    exitModification();

    return true;
  }

  function getLink(fromNodeId, toNodeId) {
    if (fromNodeId === undefined || toNodeId === undefined) return undefined;
    return links.get(makeLinkId(fromNodeId, toNodeId));
  }

  function getLinkById(linkId) {
    if (linkId === undefined) return undefined;
    return links.get(linkId);
  }

  function clear() {
    enterModification();
    forEachNode(function (node) {
      removeNode(node.id);
    });
    exitModification();
  }

  function forEachLink(callback) {
    if (typeof callback === 'function') {
      var valuesIterator = links.values();
      var nextValue = valuesIterator.next();
      while (!nextValue.done) {
        if (callback(nextValue.value)) {
          return true; // client doesn't want to proceed. Return.
        }
        nextValue = valuesIterator.next();
      }
    }
  }

  function forEachLinkedNode(nodeId, callback, oriented) {
    var node = getNode(nodeId);

    if (node && node.links && typeof callback === 'function') {
      if (oriented) {
        return forEachOrientedLink(node.links, nodeId, callback);
      } else {
        return forEachNonOrientedLink(node.links, nodeId, callback);
      }
    }
  }

  // eslint-disable-next-line no-shadow
  function forEachNonOrientedLink(links, nodeId, callback) {
    var quitFast;

    var valuesIterator = links.values();
    var nextValue = valuesIterator.next();
    while (!nextValue.done) {
      var link = nextValue.value;
      var linkedNodeId = link.fromId === nodeId ? link.toId : link.fromId;
      quitFast = callback(nodes.get(linkedNodeId), link);
      if (quitFast) {
        return true; // Client does not need more iterations. Break now.
      }
      nextValue = valuesIterator.next();
    }
  }

  // eslint-disable-next-line no-shadow
  function forEachOrientedLink(links, nodeId, callback) {
    var quitFast;
    var valuesIterator = links.values();
    var nextValue = valuesIterator.next();
    while (!nextValue.done) {
      var link = nextValue.value;
      if (link.fromId === nodeId) {
        quitFast = callback(nodes.get(link.toId), link);
        if (quitFast) {
          return true; // Client does not need more iterations. Break now.
        }
      }
      nextValue = valuesIterator.next();
    }
  }

  // we will not fire anything until users of this library explicitly call `on()`
  // method.
  function noop() { }

  // Enter, Exit modification allows bulk graph updates without firing events.
  function enterModificationReal() {
    suspendEvents += 1;
  }

  function exitModificationReal() {
    suspendEvents -= 1;
    if (suspendEvents === 0 && changes.length > 0) {
      graphPart.fire('changed', changes);
      changes.length = 0;
    }
  }

  function forEachNode(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Function is expected to iterate over graph nodes. You passed ' + callback);
    }

    var valuesIterator = nodes.values();
    var nextValue = valuesIterator.next();
    while (!nextValue.done) {
      if (callback(nextValue.value)) {
        return true; // client doesn't want to proceed. Return.
      }
      nextValue = valuesIterator.next();
    }
  }
}

/**
 * Internal structure to represent node;
 */
function Node(id, data) {
  this.id = id;
  this.links = null;
  this.data = data;
}

function addLinkToNode(node, link) {
  if (node.links) {
    node.links.add(link);
  } else {
    node.links = new Set([link]);
  }
}

/**
 * Internal structure to represent links;
 */
function Link(fromId, toId, data, id) {
  this.fromId = fromId;
  this.toId = toId;
  this.data = data;
  this.id = id;
}

function makeLinkId(fromId, toId) {
  return fromId.toString() + '👉 ' + toId.toString();
}

var ngraph_events = function eventify(subject) {
  validateSubject(subject);

  var eventsStorage = createEventsStorage(subject);
  subject.on = eventsStorage.on;
  subject.off = eventsStorage.off;
  subject.fire = eventsStorage.fire;
  return subject;
};

function createEventsStorage(subject) {
  // Store all event listeners to this hash. Key is event name, value is array
  // of callback records.
  //
  // A callback record consists of callback function and its optional context:
  // { 'eventName' => [{callback: function, ctx: object}] }
  var registeredEvents = Object.create(null);

  return {
    on: function (eventName, callback, ctx) {
      if (typeof callback !== 'function') {
        throw new Error('callback is expected to be a function');
      }
      var handlers = registeredEvents[eventName];
      if (!handlers) {
        handlers = registeredEvents[eventName] = [];
      }
      handlers.push({callback: callback, ctx: ctx});

      return subject;
    },

    off: function (eventName, callback) {
      var wantToRemoveAll = (typeof eventName === 'undefined');
      if (wantToRemoveAll) {
        // Killing old events storage should be enough in this case:
        registeredEvents = Object.create(null);
        return subject;
      }

      if (registeredEvents[eventName]) {
        var deleteAllCallbacksForEvent = (typeof callback !== 'function');
        if (deleteAllCallbacksForEvent) {
          delete registeredEvents[eventName];
        } else {
          var callbacks = registeredEvents[eventName];
          for (var i = 0; i < callbacks.length; ++i) {
            if (callbacks[i].callback === callback) {
              callbacks.splice(i, 1);
            }
          }
        }
      }

      return subject;
    },

    fire: function (eventName) {
      var callbacks = registeredEvents[eventName];
      if (!callbacks) {
        return subject;
      }

      var fireArguments;
      if (arguments.length > 1) {
        fireArguments = Array.prototype.splice.call(arguments, 1);
      }
      for(var i = 0; i < callbacks.length; ++i) {
        var callbackInfo = callbacks[i];
        callbackInfo.callback.apply(callbackInfo.ctx, fireArguments);
      }

      return subject;
    }
  };
}

function validateSubject(subject) {
  if (!subject) {
    throw new Error('Eventify cannot use falsy object as events subject');
  }
  var reservedWords = ['on', 'fire', 'off'];
  for (var i = 0; i < reservedWords.length; ++i) {
    if (subject.hasOwnProperty(reservedWords[i])) {
      throw new Error("Subject cannot be eventified, since it already has property '" + reservedWords[i] + "'");
    }
  }
}

/**
 * Common utilities
 * @module glMatrix
 */
// Configuration Constants
var EPSILON = 0.000001;
var ARRAY_TYPE = typeof Float32Array !== 'undefined' ? Float32Array : Array;
/**
 * Sets the type of array used when creating new vectors and matrices
 *
 * @param {Float32ArrayConstructor | ArrayConstructor} type Array type, such as Float32Array or Array
 */

function setMatrixArrayType(type) {
  ARRAY_TYPE = type;
}
if (!Math.hypot) Math.hypot = function () {
  var y = 0,
      i = arguments.length;

  while (i--) {
    y += arguments[i] * arguments[i];
  }

  return Math.sqrt(y);
};

/**
 * 3x3 Matrix
 * @module mat3
 */

/**
 * Creates a new identity mat3
 *
 * @returns {mat3} a new 3x3 matrix
 */

function create$5() {
  var out = new ARRAY_TYPE(9);

  if (ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
  }

  out[0] = 1;
  out[4] = 1;
  out[8] = 1;
  return out;
}

/**
 * 4x4 Matrix<br>Format: column-major, when typed out it looks like row-major<br>The matrices are being post multiplied.
 * @module mat4
 */

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */

function create$4() {
  var out = new ARRAY_TYPE(16);

  if (ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
  }

  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}
/**
 * Copy the values from one mat4 to another
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function invert$1(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}
/**
 * Multiplies two mat4s
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function multiply$1(out, a, b) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15]; // Cache only the current line of the second matrix

  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}
/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to translate
 * @param {ReadonlyVec3} v vector to translate by
 * @returns {mat4} out
 */

function translate(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;

  if (a === out) {
    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  } else {
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    out[0] = a00;
    out[1] = a01;
    out[2] = a02;
    out[3] = a03;
    out[4] = a10;
    out[5] = a11;
    out[6] = a12;
    out[7] = a13;
    out[8] = a20;
    out[9] = a21;
    out[10] = a22;
    out[11] = a23;
    out[12] = a00 * x + a10 * y + a20 * z + a[12];
    out[13] = a01 * x + a11 * y + a21 * z + a[13];
    out[14] = a02 * x + a12 * y + a22 * z + a[14];
    out[15] = a03 * x + a13 * y + a23 * z + a[15];
  }

  return out;
}
/**
 * Scales the mat4 by the dimensions in the given vec3 not using vectorization
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to scale
 * @param {ReadonlyVec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/

function scale(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  out[0] = a[0] * x;
  out[1] = a[1] * x;
  out[2] = a[2] * x;
  out[3] = a[3] * x;
  out[4] = a[4] * y;
  out[5] = a[5] * y;
  out[6] = a[6] * y;
  out[7] = a[7] * y;
  out[8] = a[8] * z;
  out[9] = a[9] * z;
  out[10] = a[10] * z;
  out[11] = a[11] * z;
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Rotates a mat4 by the given angle around the given axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {ReadonlyVec3} axis the axis to rotate around
 * @returns {mat4} out
 */

function rotate(out, a, rad, axis) {
  var x = axis[0],
      y = axis[1],
      z = axis[2];
  var len = Math.hypot(x, y, z);
  var s, c, t;
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;
  var b00, b01, b02;
  var b10, b11, b12;
  var b20, b21, b22;

  if (len < EPSILON) {
    return null;
  }

  len = 1 / len;
  x *= len;
  y *= len;
  z *= len;
  s = Math.sin(rad);
  c = Math.cos(rad);
  t = 1 - c;
  a00 = a[0];
  a01 = a[1];
  a02 = a[2];
  a03 = a[3];
  a10 = a[4];
  a11 = a[5];
  a12 = a[6];
  a13 = a[7];
  a20 = a[8];
  a21 = a[9];
  a22 = a[10];
  a23 = a[11]; // Construct the elements of the rotation matrix

  b00 = x * x * t + c;
  b01 = y * x * t + z * s;
  b02 = z * x * t - y * s;
  b10 = x * y * t - z * s;
  b11 = y * y * t + c;
  b12 = z * y * t + x * s;
  b20 = x * z * t + y * s;
  b21 = y * z * t - x * s;
  b22 = z * z * t + c; // Perform rotation-specific matrix multiplication

  out[0] = a00 * b00 + a10 * b01 + a20 * b02;
  out[1] = a01 * b00 + a11 * b01 + a21 * b02;
  out[2] = a02 * b00 + a12 * b01 + a22 * b02;
  out[3] = a03 * b00 + a13 * b01 + a23 * b02;
  out[4] = a00 * b10 + a10 * b11 + a20 * b12;
  out[5] = a01 * b10 + a11 * b11 + a21 * b12;
  out[6] = a02 * b10 + a12 * b11 + a22 * b12;
  out[7] = a03 * b10 + a13 * b11 + a23 * b12;
  out[8] = a00 * b20 + a10 * b21 + a20 * b22;
  out[9] = a01 * b20 + a11 * b21 + a21 * b22;
  out[10] = a02 * b20 + a12 * b21 + a22 * b22;
  out[11] = a03 * b20 + a13 * b21 + a23 * b22;

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }

  return out;
}
/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateX(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[4] = a10 * c + a20 * s;
  out[5] = a11 * c + a21 * s;
  out[6] = a12 * c + a22 * s;
  out[7] = a13 * c + a23 * s;
  out[8] = a20 * c - a10 * s;
  out[9] = a21 * c - a11 * s;
  out[10] = a22 * c - a12 * s;
  out[11] = a23 * c - a13 * s;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateY(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c - a20 * s;
  out[1] = a01 * c - a21 * s;
  out[2] = a02 * c - a22 * s;
  out[3] = a03 * c - a23 * s;
  out[8] = a00 * s + a20 * c;
  out[9] = a01 * s + a21 * c;
  out[10] = a02 * s + a22 * c;
  out[11] = a03 * s + a23 * c;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateZ(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c + a10 * s;
  out[1] = a01 * c + a11 * s;
  out[2] = a02 * c + a12 * s;
  out[3] = a03 * c + a13 * s;
  out[4] = a10 * c - a00 * s;
  out[5] = a11 * c - a01 * s;
  out[6] = a12 * c - a02 * s;
  out[7] = a13 * c - a03 * s;
  return out;
}
/**
 * Creates a matrix from a quaternion rotation and vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     let quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {ReadonlyVec3} v Translation vector
 * @returns {mat4} out
 */

function fromRotationTranslation(out, q, v) {
  // Quaternion math
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var xy = x * y2;
  var xz = x * z2;
  var yy = y * y2;
  var yz = y * z2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  out[0] = 1 - (yy + zz);
  out[1] = xy + wz;
  out[2] = xz - wy;
  out[3] = 0;
  out[4] = xy - wz;
  out[5] = 1 - (xx + zz);
  out[6] = yz + wx;
  out[7] = 0;
  out[8] = xz + wy;
  out[9] = yz - wx;
  out[10] = 1 - (xx + yy);
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}
/**
 * Returns the translation vector component of a transformation
 *  matrix. If a matrix is built with fromRotationTranslation,
 *  the returned vector will be the same as the translation vector
 *  originally supplied.
 * @param  {vec3} out Vector to receive translation component
 * @param  {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {vec3} out
 */

function getTranslation(out, mat) {
  out[0] = mat[12];
  out[1] = mat[13];
  out[2] = mat[14];
  return out;
}
/**
 * Returns the scaling factor component of a transformation
 *  matrix. If a matrix is built with fromRotationTranslationScale
 *  with a normalized Quaternion paramter, the returned vector will be
 *  the same as the scaling vector
 *  originally supplied.
 * @param  {vec3} out Vector to receive scaling factor component
 * @param  {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {vec3} out
 */

function getScaling(out, mat) {
  var m11 = mat[0];
  var m12 = mat[1];
  var m13 = mat[2];
  var m21 = mat[4];
  var m22 = mat[5];
  var m23 = mat[6];
  var m31 = mat[8];
  var m32 = mat[9];
  var m33 = mat[10];
  out[0] = Math.hypot(m11, m12, m13);
  out[1] = Math.hypot(m21, m22, m23);
  out[2] = Math.hypot(m31, m32, m33);
  return out;
}
/**
 * Returns a quaternion representing the rotational component
 *  of a transformation matrix. If a matrix is built with
 *  fromRotationTranslation, the returned quaternion will be the
 *  same as the quaternion originally supplied.
 * @param {quat} out Quaternion to receive the rotation component
 * @param {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {quat} out
 */

function getRotation(out, mat) {
  var scaling = new ARRAY_TYPE(3);
  getScaling(scaling, mat);
  var is1 = 1 / scaling[0];
  var is2 = 1 / scaling[1];
  var is3 = 1 / scaling[2];
  var sm11 = mat[0] * is1;
  var sm12 = mat[1] * is2;
  var sm13 = mat[2] * is3;
  var sm21 = mat[4] * is1;
  var sm22 = mat[5] * is2;
  var sm23 = mat[6] * is3;
  var sm31 = mat[8] * is1;
  var sm32 = mat[9] * is2;
  var sm33 = mat[10] * is3;
  var trace = sm11 + sm22 + sm33;
  var S = 0;

  if (trace > 0) {
    S = Math.sqrt(trace + 1.0) * 2;
    out[3] = 0.25 * S;
    out[0] = (sm23 - sm32) / S;
    out[1] = (sm31 - sm13) / S;
    out[2] = (sm12 - sm21) / S;
  } else if (sm11 > sm22 && sm11 > sm33) {
    S = Math.sqrt(1.0 + sm11 - sm22 - sm33) * 2;
    out[3] = (sm23 - sm32) / S;
    out[0] = 0.25 * S;
    out[1] = (sm12 + sm21) / S;
    out[2] = (sm31 + sm13) / S;
  } else if (sm22 > sm33) {
    S = Math.sqrt(1.0 + sm22 - sm11 - sm33) * 2;
    out[3] = (sm31 - sm13) / S;
    out[0] = (sm12 + sm21) / S;
    out[1] = 0.25 * S;
    out[2] = (sm23 + sm32) / S;
  } else {
    S = Math.sqrt(1.0 + sm33 - sm11 - sm22) * 2;
    out[3] = (sm12 - sm21) / S;
    out[0] = (sm31 + sm13) / S;
    out[1] = (sm23 + sm32) / S;
    out[2] = 0.25 * S;
  }

  return out;
}
/**
 * Generates a perspective projection matrix with the given bounds.
 * The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
 * which matches WebGL/OpenGL's clip volume.
 * Passing null/undefined/no value for far will generate infinite projection matrix.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum, can be null or Infinity
 * @returns {mat4} out
 */

function perspectiveNO(out, fovy, aspect, near, far) {
  var f = 1.0 / Math.tan(fovy / 2),
      nf;
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[15] = 0;

  if (far != null && far !== Infinity) {
    nf = 1 / (near - far);
    out[10] = (far + near) * nf;
    out[14] = 2 * far * near * nf;
  } else {
    out[10] = -1;
    out[14] = -2 * near;
  }

  return out;
}
/**
 * Alias for {@link mat4.perspectiveNO}
 * @function
 */

var perspective = perspectiveNO;
/**
 * Generates a matrix that makes something look at something else.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {ReadonlyVec3} eye Position of the viewer
 * @param {ReadonlyVec3} center Point the viewer is looking at
 * @param {ReadonlyVec3} up vec3 pointing up
 * @returns {mat4} out
 */

function targetTo(out, eye, target, up) {
  var eyex = eye[0],
      eyey = eye[1],
      eyez = eye[2],
      upx = up[0],
      upy = up[1],
      upz = up[2];
  var z0 = eyex - target[0],
      z1 = eyey - target[1],
      z2 = eyez - target[2];
  var len = z0 * z0 + z1 * z1 + z2 * z2;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
    z0 *= len;
    z1 *= len;
    z2 *= len;
  }

  var x0 = upy * z2 - upz * z1,
      x1 = upz * z0 - upx * z2,
      x2 = upx * z1 - upy * z0;
  len = x0 * x0 + x1 * x1 + x2 * x2;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
    x0 *= len;
    x1 *= len;
    x2 *= len;
  }

  out[0] = x0;
  out[1] = x1;
  out[2] = x2;
  out[3] = 0;
  out[4] = z1 * x2 - z2 * x1;
  out[5] = z2 * x0 - z0 * x2;
  out[6] = z0 * x1 - z1 * x0;
  out[7] = 0;
  out[8] = z0;
  out[9] = z1;
  out[10] = z2;
  out[11] = 0;
  out[12] = eyex;
  out[13] = eyey;
  out[14] = eyez;
  out[15] = 1;
  return out;
}

/**
 * 3 Dimensional Vector
 * @module vec3
 */

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */

function create$3() {
  var out = new ARRAY_TYPE(3);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  return out;
}
/**
 * Calculates the length of a vec3
 *
 * @param {ReadonlyVec3} a vector to calculate length of
 * @returns {Number} length of a
 */

function length(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  return Math.hypot(x, y, z);
}
/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */

function fromValues(x, y, z) {
  var out = new ARRAY_TYPE(3);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
/**
 * Set the components of a vec3 to the given values
 *
 * @param {vec3} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} out
 */

function set$2(out, x, y, z) {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
/**
 * Adds two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  return out;
}
/**
 * Subtracts vector b from vector a
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  return out;
}
/**
 * Adds two vec3's after scaling the second operand by a scalar value
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec3} out
 */

function scaleAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  return out;
}
/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to normalize
 * @returns {vec3} out
 */

function normalize$2(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var len = x * x + y * y + z * z;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  out[2] = a[2] * len;
  return out;
}
/**
 * Calculates the dot product of two vec3's
 *
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {Number} dot product of a and b
 */

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function cross(out, a, b) {
  var ax = a[0],
      ay = a[1],
      az = a[2];
  var bx = b[0],
      by = b[1],
      bz = b[2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}
/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyMat4} m matrix to transform with
 * @returns {vec3} out
 */

function transformMat4$1(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2];
  var w = m[3] * x + m[7] * y + m[11] * z + m[15];
  w = w || 1.0;
  out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
  return out;
}
/**
 * Transforms the vec3 with a quat
 * Can also be used for dual quaternions. (Multiply it with the real part)
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyQuat} q quaternion to transform with
 * @returns {vec3} out
 */

function transformQuat(out, a, q) {
  // benchmarks: https://jsperf.com/quaternion-transform-vec3-implementations-fixed
  var qx = q[0],
      qy = q[1],
      qz = q[2],
      qw = q[3];
  var x = a[0],
      y = a[1],
      z = a[2]; // var qvec = [qx, qy, qz];
  // var uv = vec3.cross([], qvec, a);

  var uvx = qy * z - qz * y,
      uvy = qz * x - qx * z,
      uvz = qx * y - qy * x; // var uuv = vec3.cross([], qvec, uv);

  var uuvx = qy * uvz - qz * uvy,
      uuvy = qz * uvx - qx * uvz,
      uuvz = qx * uvy - qy * uvx; // vec3.scale(uv, uv, 2 * w);

  var w2 = qw * 2;
  uvx *= w2;
  uvy *= w2;
  uvz *= w2; // vec3.scale(uuv, uuv, 2);

  uuvx *= 2;
  uuvy *= 2;
  uuvz *= 2; // return vec3.add(out, a, vec3.add(out, uv, uuv));

  out[0] = x + uvx + uuvx;
  out[1] = y + uvy + uuvy;
  out[2] = z + uvz + uuvz;
  return out;
}
/**
 * Alias for {@link vec3.subtract}
 * @function
 */

var sub = subtract;
/**
 * Alias for {@link vec3.length}
 * @function
 */

var len = length;
/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

(function () {
  var vec = create$3();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 3;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }

    return a;
  };
})();

/**
 * 4 Dimensional Vector
 * @module vec4
 */

/**
 * Creates a new, empty vec4
 *
 * @returns {vec4} a new 4D vector
 */

function create$2() {
  var out = new ARRAY_TYPE(4);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
  }

  return out;
}
/**
 * Set the components of a vec4 to the given values
 *
 * @param {vec4} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {vec4} out
 */

function set$1(out, x, y, z, w) {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = w;
  return out;
}
/**
 * Normalize a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to normalize
 * @returns {vec4} out
 */

function normalize$1(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  var len = x * x + y * y + z * z + w * w;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
  }

  out[0] = x * len;
  out[1] = y * len;
  out[2] = z * len;
  out[3] = w * len;
  return out;
}
/**
 * Transforms the vec4 with a mat4.
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the vector to transform
 * @param {ReadonlyMat4} m matrix to transform with
 * @returns {vec4} out
 */

function transformMat4(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2],
      w = a[3];
  out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
  out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
  out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
  out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
  return out;
}
/**
 * Perform some operation over an array of vec4s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

(function () {
  var vec = create$2();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 4;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      vec[3] = a[i + 3];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
      a[i + 3] = vec[3];
    }

    return a;
  };
})();

/**
 * Quaternion
 * @module quat
 */

/**
 * Creates a new identity quat
 *
 * @returns {quat} a new quaternion
 */

function create$1() {
  var out = new ARRAY_TYPE(4);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  out[3] = 1;
  return out;
}
/**
 * Sets a quat from the given angle and rotation axis,
 * then returns it.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyVec3} axis the axis around which to rotate
 * @param {Number} rad the angle in radians
 * @returns {quat} out
 **/

function setAxisAngle(out, axis, rad) {
  rad = rad * 0.5;
  var s = Math.sin(rad);
  out[0] = s * axis[0];
  out[1] = s * axis[1];
  out[2] = s * axis[2];
  out[3] = Math.cos(rad);
  return out;
}
/**
 * Performs a spherical linear interpolation between two quat
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 */

function slerp(out, a, b, t) {
  // benchmarks:
  //    http://jsperf.com/quaternion-slerp-implementations
  var ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  var bx = b[0],
      by = b[1],
      bz = b[2],
      bw = b[3];
  var omega, cosom, sinom, scale0, scale1; // calc cosine

  cosom = ax * bx + ay * by + az * bz + aw * bw; // adjust signs (if necessary)

  if (cosom < 0.0) {
    cosom = -cosom;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  } // calculate coefficients


  if (1.0 - cosom > EPSILON) {
    // standard case (slerp)
    omega = Math.acos(cosom);
    sinom = Math.sin(omega);
    scale0 = Math.sin((1.0 - t) * omega) / sinom;
    scale1 = Math.sin(t * omega) / sinom;
  } else {
    // "from" and "to" quaternions are very close
    //  ... so we can do a linear interpolation
    scale0 = 1.0 - t;
    scale1 = t;
  } // calculate final values


  out[0] = scale0 * ax + scale1 * bx;
  out[1] = scale0 * ay + scale1 * by;
  out[2] = scale0 * az + scale1 * bz;
  out[3] = scale0 * aw + scale1 * bw;
  return out;
}
/**
 * Creates a quaternion from the given 3x3 rotation matrix.
 *
 * NOTE: The resultant quaternion is not normalized, so you should be sure
 * to renormalize the quaternion yourself where necessary.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyMat3} m rotation matrix
 * @returns {quat} out
 * @function
 */

function fromMat3(out, m) {
  // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
  // article "Quaternion Calculus and Fast Animation".
  var fTrace = m[0] + m[4] + m[8];
  var fRoot;

  if (fTrace > 0.0) {
    // |w| > 1/2, may as well choose w > 1/2
    fRoot = Math.sqrt(fTrace + 1.0); // 2w

    out[3] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot; // 1/(4w)

    out[0] = (m[5] - m[7]) * fRoot;
    out[1] = (m[6] - m[2]) * fRoot;
    out[2] = (m[1] - m[3]) * fRoot;
  } else {
    // |w| <= 1/2
    var i = 0;
    if (m[4] > m[0]) i = 1;
    if (m[8] > m[i * 3 + i]) i = 2;
    var j = (i + 1) % 3;
    var k = (i + 2) % 3;
    fRoot = Math.sqrt(m[i * 3 + i] - m[j * 3 + j] - m[k * 3 + k] + 1.0);
    out[i] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot;
    out[3] = (m[j * 3 + k] - m[k * 3 + j]) * fRoot;
    out[j] = (m[j * 3 + i] + m[i * 3 + j]) * fRoot;
    out[k] = (m[k * 3 + i] + m[i * 3 + k]) * fRoot;
  }

  return out;
}
/**
 * Set the components of a quat to the given values
 *
 * @param {quat} out the receiving quaternion
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {quat} out
 * @function
 */

var set = set$1;
/**
 * Normalize a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a quaternion to normalize
 * @returns {quat} out
 * @function
 */

var normalize = normalize$1;
/**
 * Sets a quaternion to represent the shortest rotation from one
 * vector to another.
 *
 * Both vectors are assumed to be unit length.
 *
 * @param {quat} out the receiving quaternion.
 * @param {ReadonlyVec3} a the initial vector
 * @param {ReadonlyVec3} b the destination vector
 * @returns {quat} out
 */

(function () {
  var tmpvec3 = create$3();
  var xUnitVec3 = fromValues(1, 0, 0);
  var yUnitVec3 = fromValues(0, 1, 0);
  return function (out, a, b) {
    var dot$1 = dot(a, b);

    if (dot$1 < -0.999999) {
      cross(tmpvec3, xUnitVec3, a);
      if (len(tmpvec3) < 0.000001) cross(tmpvec3, yUnitVec3, a);
      normalize$2(tmpvec3, tmpvec3);
      setAxisAngle(out, tmpvec3, Math.PI);
      return out;
    } else if (dot$1 > 0.999999) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
      out[3] = 1;
      return out;
    } else {
      cross(tmpvec3, a, b);
      out[0] = tmpvec3[0];
      out[1] = tmpvec3[1];
      out[2] = tmpvec3[2];
      out[3] = 1 + dot$1;
      return normalize(out, out);
    }
  };
})();
/**
 * Performs a spherical linear interpolation with two control points
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @param {ReadonlyQuat} c the third operand
 * @param {ReadonlyQuat} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 */

(function () {
  var temp1 = create$1();
  var temp2 = create$1();
  return function (out, a, b, c, d, t) {
    slerp(temp1, a, d, t);
    slerp(temp2, b, c, t);
    slerp(out, temp1, temp2, 2 * t * (1 - t));
    return out;
  };
})();
/**
 * Sets the specified quaternion with values corresponding to the given
 * axes. Each axis is a vec3 and is expected to be unit length and
 * perpendicular to all other specified axes.
 *
 * @param {ReadonlyVec3} view  the vector representing the viewing direction
 * @param {ReadonlyVec3} right the vector representing the local "right" direction
 * @param {ReadonlyVec3} up    the vector representing the local "up" direction
 * @returns {quat} out
 */

(function () {
  var matr = create$5();
  return function (out, view, right, up) {
    matr[0] = right[0];
    matr[3] = right[1];
    matr[6] = right[2];
    matr[1] = up[0];
    matr[4] = up[1];
    matr[7] = up[2];
    matr[2] = -view[0];
    matr[5] = -view[1];
    matr[8] = -view[2];
    return normalize(out, fromMat3(out, matr));
  };
})();

/**
 * 2 Dimensional Vector
 * @module vec2
 */

/**
 * Creates a new, empty vec2
 *
 * @returns {vec2} a new 2D vector
 */

function create() {
  var out = new ARRAY_TYPE(2);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
  }

  return out;
}
/**
 * Perform some operation over an array of vec2s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

(function () {
  var vec = create();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 2;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
    }

    return a;
  };
})();

/**
 * Represents a single element in the scene tree
 */
class Element {
    children;
    parent;
    /**
     * Transforms local coordinate system to parent coordinate system
     */
    model;
    /**
     * Cumulative transform to webgl coordinate system.
     */
    worldModel;
    /**
     * Model * view * projection matrix
     */
    modelViewProjection;
    worldTransformNeedsUpdate;
    /**
     * If true, the modelViewProjection matrix is updated before draw() call
     */
    modelViewProjectionNeedsUpdate;
    type;
    scene;
    constructor() {
        this.children = [];
        this.model = create$4();
        this.worldModel = create$4();
        this.modelViewProjection = create$4();
        this.worldTransformNeedsUpdate = true;
        this.modelViewProjectionNeedsUpdate = true;
        this.type = 'Element';
        this.scene = null;
        this.parent = null;
    }
    appendChild(child, sendToBack = false) {
        child.parent = this;
        if (sendToBack) {
            // back of z-index
            this.children.unshift(child);
        }
        else {
            this.children.push(child);
        }
        if (child.bindScene) {
            child.bindScene(this.scene);
        }
        if (this.scene)
            this.scene.renderFrame();
    }
    insertChildAfter(child, after) {
        child.parent = this;
        let afterIndex = this.children.indexOf(after);
        if (afterIndex < 0)
            throw new Error('Could not find element to insert after');
        this.children.splice(afterIndex + 1, 0, child);
        if (child.bindScene) {
            child.bindScene(this.scene);
        }
        if (this.scene)
            this.scene.renderFrame();
    }
    bindScene(scene) {
        this.scene = scene;
        this.worldTransformNeedsUpdate = true;
        this.modelViewProjectionNeedsUpdate = true;
    }
    traverse(enterCallback, exitCallback) {
        enterCallback(this);
        for (var i = 0; i < this.children.length; ++i) {
            var child = this.children[i];
            child.traverse(enterCallback, exitCallback);
        }
        if (exitCallback)
            exitCallback(this);
    }
    /**
     * Rotates this element `rad` radians around `axis`.
     */
    rotate(rad, axis) {
        rotate(this.model, this.model, rad, axis);
        this.worldTransformNeedsUpdate = true;
        if (this.scene)
            this.scene.renderFrame();
        return this;
    }
    /**
     * Rotate `rad` radians around X axis
     */
    rotateX(rad) {
        rotateX(this.model, this.model, rad);
        this.worldTransformNeedsUpdate = true;
        if (this.scene)
            this.scene.renderFrame();
        return this;
    }
    /**
     * Rotate `rad` radians around Y axis
     */
    rotateY(rad) {
        rotateY(this.model, this.model, rad);
        this.worldTransformNeedsUpdate = true;
        if (this.scene)
            this.scene.renderFrame();
        return this;
    }
    /**
     * Rotate `rad` radians around Z axis
     */
    rotateZ(rad) {
        rotateZ(this.model, this.model, rad);
        this.worldTransformNeedsUpdate = true;
        if (this.scene)
            this.scene.renderFrame();
        return this;
    }
    /**
     * Scales this element by vector `v`
     */
    scale(v) {
        scale(this.model, this.model, v);
        this.worldTransformNeedsUpdate = true;
        if (this.scene)
            this.scene.renderFrame();
        return this;
    }
    /**
     * Translate this element by vector `v`
     */
    translate(v) {
        translate(this.model, this.model, v);
        this.worldTransformNeedsUpdate = true;
        if (this.scene)
            this.scene.renderFrame();
        return this;
    }
    /**
     * Removes the child from the collection of children. Takes `O(n)` time where `n` is number
     * of children.
     */
    removeChild(child) {
        // TODO: should this be faster?
        let childIdx = this.children.indexOf(child);
        if (childIdx > -1) {
            this.children.splice(childIdx, 1);
            child.bindScene(null);
        }
        if (this.scene)
            this.scene.renderFrame();
    }
    updateWorldTransform(force = false) {
        if (this.worldTransformNeedsUpdate || force) {
            if (this.parent) {
                multiply$1(this.worldModel, this.parent.worldModel, this.model);
            }
            else {
                copy(this.worldModel, this.model);
            }
            this.modelViewProjectionNeedsUpdate = true;
            this.worldTransformNeedsUpdate = false;
            force = true; // We have to update children now.
        }
        let wasDirty = force;
        var children = this.children;
        for (var i = 0; i < children.length; i++) {
            wasDirty = children[i].updateWorldTransform(force) || wasDirty;
        }
        return wasDirty;
    }
    scheduleMVPUpdate() {
        this.modelViewProjectionNeedsUpdate = true;
        let children = this.children;
        for (var i = 0; i < children.length; i++) {
            children[i].scheduleMVPUpdate();
        }
    }
    updateModelViewProjection(projection, view) {
        if (!this.modelViewProjectionNeedsUpdate)
            return;
        multiply$1(this.modelViewProjection, projection, view);
        multiply$1(this.modelViewProjection, this.modelViewProjection, this.worldModel);
        this.modelViewProjectionNeedsUpdate = false;
    }
    /**
     * Requests the element to draw itself (and its children)
     */
    draw(gl, drawContext) {
        for (var i = 0; i < this.children.length; ++i) {
            let child = this.children[i];
            child.updateModelViewProjection(drawContext.projection, drawContext.view.matrix);
            child.draw(gl, drawContext);
        }
    }
    dispose() {
        for (var i = 0; i < this.children.length; ++i) {
            var child = this.children[i];
            child.dispose();
        }
    }
}

const config = {
    maxSingleTouchTime: 300,
    singleTapDistanceSquared: 25 // within 5px we consider it as a single tap
};
function onClap(element, callback, ctx) {
    var touchStartTime = Date.now();
    let startPos;
    // @ts-ignore
    element.addEventListener('click', invokeHandler, { passive: false });
    // @ts-ignore
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    // @ts-ignore
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    return disposePrevHandler;
    function handleTouchStart(e) {
        var touches = e.touches;
        if (touches.length === 1) {
            touchStartTime = Date.now();
            startPos = {
                x: e.touches[0].pageX,
                y: e.touches[0].pageY
            };
        }
    }
    function handleTouchEnd(e) {
        // multitouch - ignore
        if (e.touches.length > 1)
            return;
        // single touch - use time difference to determine if it was a touch or
        // a swipe
        var dt = Date.now() - touchStartTime;
        // To long - ignore
        if (dt > config.maxSingleTouchTime)
            return;
        let touch = e.changedTouches[0];
        var dx = touch.pageX - startPos.x;
        var dy = touch.pageY - startPos.y;
        if (dx * dx + dy * dy < config.singleTapDistanceSquared) {
            invokeHandler(touch);
        }
    }
    function disposePrevHandler() {
        // @ts-ignore
        element.removeEventListener('click', invokeHandler);
        // @ts-ignore
        element.removeEventListener('touchend', handleTouchEnd);
        // @ts-ignore
        element.removeEventListener('touchstart', handleTouchStart);
    }
    function invokeHandler(e) {
        // @ts-ignore
        callback.call(ctx, e);
    }
}

let spareVec3 = [0, 0, 0];
const xAxis = [1, 0, 0];
const yAxis = [0, 1, 0];
const zAxis = [0, 0, 1];
/**
 * View matrix allows you to place camera anywhere in the world
 */
class ViewMatrix {
    /**
     * This is our view matrix
     */
    matrix;
    /**
     * Inverse of the view matrix
     */
    cameraWorld;
    /**
     * Camera position in the world
     */
    position;
    /**
     * Camera orientation in the world
     */
    orientation;
    /**
     * Where the camera is looking
     */
    center;
    constructor(viewMatrix) {
        this.matrix = viewMatrix || create$4();
        // True position of the camera in the world:
        this.cameraWorld = invert$1(create$4(), this.matrix);
        this.position = [0, 0, 0];
        this.orientation = [0, 0, 0, 1];
        this.center = [0, 0, 0];
        this.deconstructPositionRotation();
    }
    /**
     * Makes the view look at a given point
     */
    lookAt(eye, center, up) {
        targetTo(this.cameraWorld, eye, center, up);
        invert$1(this.matrix, this.cameraWorld);
        this.deconstructPositionRotation();
        return this;
    }
    /**
     * Updates view matrix from the current orientation and position
     */
    update() {
        fromRotationTranslation(this.cameraWorld, this.orientation, this.position);
        invert$1(this.matrix, this.cameraWorld);
        return this;
    }
    /**
     * Extracts current position and orientation from the `cameraWorld` matrix
     */
    deconstructPositionRotation() {
        getTranslation(this.position, this.cameraWorld);
        getRotation(this.orientation, this.cameraWorld);
    }
    translateOnAxis(axis, distance) {
        let translation = transformQuat(spareVec3, axis, this.orientation);
        scaleAndAdd(this.position, this.position, translation, distance);
        return this;
    }
    translateX(distance) {
        return this.translateOnAxis(xAxis, distance);
    }
    translateY(distance) {
        return this.translateOnAxis(yAxis, distance);
    }
    translateZ(distance) {
        return this.translateOnAxis(zAxis, distance);
    }
}

var amator = {exports: {}};

/**
 * https://github.com/gre/bezier-easing
 * BezierEasing - use bezier curve for transition easing function
 * by Gaëtan Renaudeau 2014 - 2015 – MIT License
 */

// These values are established by empiricism with tests (tradeoff: performance VS precision)
var NEWTON_ITERATIONS = 4;
var NEWTON_MIN_SLOPE = 0.001;
var SUBDIVISION_PRECISION = 0.0000001;
var SUBDIVISION_MAX_ITERATIONS = 10;

var kSplineTableSize = 11;
var kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

var float32ArraySupported = typeof Float32Array === 'function';

function A (aA1, aA2) { return 1.0 - 3.0 * aA2 + 3.0 * aA1; }
function B (aA1, aA2) { return 3.0 * aA2 - 6.0 * aA1; }
function C (aA1)      { return 3.0 * aA1; }

// Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
function calcBezier (aT, aA1, aA2) { return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT; }

// Returns dx/dt given t, x1, and x2, or dy/dt given t, y1, and y2.
function getSlope (aT, aA1, aA2) { return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1); }

function binarySubdivide (aX, aA, aB, mX1, mX2) {
  var currentX, currentT, i = 0;
  do {
    currentT = aA + (aB - aA) / 2.0;
    currentX = calcBezier(currentT, mX1, mX2) - aX;
    if (currentX > 0.0) {
      aB = currentT;
    } else {
      aA = currentT;
    }
  } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
  return currentT;
}

function newtonRaphsonIterate (aX, aGuessT, mX1, mX2) {
 for (var i = 0; i < NEWTON_ITERATIONS; ++i) {
   var currentSlope = getSlope(aGuessT, mX1, mX2);
   if (currentSlope === 0.0) {
     return aGuessT;
   }
   var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
   aGuessT -= currentX / currentSlope;
 }
 return aGuessT;
}

function LinearEasing (x) {
  return x;
}

var src = function bezier (mX1, mY1, mX2, mY2) {
  if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) {
    throw new Error('bezier x values must be in [0, 1] range');
  }

  if (mX1 === mY1 && mX2 === mY2) {
    return LinearEasing;
  }

  // Precompute samples table
  var sampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array(kSplineTableSize);
  for (var i = 0; i < kSplineTableSize; ++i) {
    sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
  }

  function getTForX (aX) {
    var intervalStart = 0.0;
    var currentSample = 1;
    var lastSample = kSplineTableSize - 1;

    for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
      intervalStart += kSampleStepSize;
    }
    --currentSample;

    // Interpolate to provide an initial guess for t
    var dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
    var guessForT = intervalStart + dist * kSampleStepSize;

    var initialSlope = getSlope(guessForT, mX1, mX2);
    if (initialSlope >= NEWTON_MIN_SLOPE) {
      return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
    } else if (initialSlope === 0.0) {
      return guessForT;
    } else {
      return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
    }
  }

  return function BezierEasing (x) {
    // Because JavaScript number are imprecise, we should guarantee the extremes are right.
    if (x === 0) {
      return 0;
    }
    if (x === 1) {
      return 1;
    }
    return calcBezier(getTForX(x), mY1, mY2);
  };
};

var BezierEasing = src;

// Predefined set of animations. Similar to CSS easing functions
var animations = {
  ease:  BezierEasing(0.25, 0.1, 0.25, 1),
  easeIn: BezierEasing(0.42, 0, 1, 1),
  easeOut: BezierEasing(0, 0, 0.58, 1),
  easeInOut: BezierEasing(0.42, 0, 0.58, 1),
  linear: BezierEasing(0, 0, 1, 1)
};


amator.exports = animate;
amator.exports.makeAggregateRaf = makeAggregateRaf;
amator.exports.sharedScheduler = makeAggregateRaf();


function animate(source, target, options) {
  var start = Object.create(null);
  var diff = Object.create(null);
  options = options || {};
  // We let clients specify their own easing function
  var easing = (typeof options.easing === 'function') ? options.easing : animations[options.easing];

  // if nothing is specified, default to ease (similar to CSS animations)
  if (!easing) {
    if (options.easing) {
      console.warn('Unknown easing function in amator: ' + options.easing);
    }
    easing = animations.ease;
  }

  var step = typeof options.step === 'function' ? options.step : noop;
  var done = typeof options.done === 'function' ? options.done : noop;

  var scheduler = getScheduler(options.scheduler);

  var keys = Object.keys(target);
  keys.forEach(function(key) {
    start[key] = source[key];
    diff[key] = target[key] - source[key];
  });

  var durationInMs = typeof options.duration === 'number' ? options.duration : 400;
  var durationInFrames = Math.max(1, durationInMs * 0.06); // 0.06 because 60 frames pers 1,000 ms
  var previousAnimationId;
  var frame = 0;

  previousAnimationId = scheduler.next(loop);

  return {
    cancel: cancel
  }

  function cancel() {
    scheduler.cancel(previousAnimationId);
    previousAnimationId = 0;
  }

  function loop() {
    var t = easing(frame/durationInFrames);
    frame += 1;
    setValues(t);
    if (frame <= durationInFrames) {
      previousAnimationId = scheduler.next(loop);
      step(source);
    } else {
      previousAnimationId = 0;
      setTimeout(function() { done(source); }, 0);
    }
  }

  function setValues(t) {
    keys.forEach(function(key) {
      source[key] = diff[key] * t + start[key];
    });
  }
}

function noop() { }

function getScheduler(scheduler) {
  if (!scheduler) {
    var canRaf = typeof window !== 'undefined' && window.requestAnimationFrame;
    return canRaf ? rafScheduler() : timeoutScheduler()
  }
  if (typeof scheduler.next !== 'function') throw new Error('Scheduler is supposed to have next(cb) function')
  if (typeof scheduler.cancel !== 'function') throw new Error('Scheduler is supposed to have cancel(handle) function')

  return scheduler
}

function rafScheduler() {
  return {
    next: window.requestAnimationFrame.bind(window),
    cancel: window.cancelAnimationFrame.bind(window)
  }
}

function timeoutScheduler() {
  return {
    next: function(cb) {
      return setTimeout(cb, 1000/60)
    },
    cancel: function (id) {
      return clearTimeout(id)
    }
  }
}

function makeAggregateRaf() {
  var frontBuffer = new Set();
  var backBuffer = new Set();
  var frameToken = 0;

  return {
    next: next,
    cancel: next,
    clearAll: clearAll
  }

  function clearAll() {
    frontBuffer.clear();
    backBuffer.clear();
    cancelAnimationFrame(frameToken);
    frameToken = 0;
  }

  function next(callback) {
    backBuffer.add(callback);
    renderNextFrame();
  }

  function renderNextFrame() {
    if (!frameToken) frameToken = requestAnimationFrame(renderFrame);
  }

  function renderFrame() {
    frameToken = 0;

    var t = backBuffer;
    backBuffer = frontBuffer;
    frontBuffer = t;

    frontBuffer.forEach(function(callback) {
      callback();
    });
    frontBuffer.clear();
  }
}

/**
 * Allows smooth kinetic scrolling of the surface
 */
function createKineticAnimation(getCurrentPoint, moveCallback, settings) {
    if (typeof settings !== 'object')
        settings = {};
    let EPS = 1e-3;
    let minVelocity = typeof settings.minVelocity === 'number' ? settings.minVelocity : EPS;
    let amplitude = typeof settings.amplitude === 'number' ? settings.amplitude : 0.01;
    let cancelAnimationFrame = typeof settings.cancelAnimationFrame === 'function'
        ? settings.cancelAnimationFrame
        : getCancelAnimationFrame();
    let requestAnimationFrame = typeof settings.requestAnimationFrame === 'function'
        ? settings.requestAnimationFrame
        : getRequestAnimationFrame();
    let lastPoint;
    let timestamp;
    let timeConstant = 342;
    let trackValueHandle;
    let vx, ax;
    let vy, ay;
    let vz, az;
    let animationHandle;
    return {
        start,
        setAmplitude,
        getAmplitude,
        stop,
        impulse,
        cancel
    };
    function setAmplitude(newAmplitude) {
        amplitude = newAmplitude;
    }
    function getAmplitude() {
        return amplitude;
    }
    function cancel() {
        cancelAnimationFrame(trackValueHandle);
        cancelAnimationFrame(animationHandle);
    }
    function start() {
        lastPoint = getCurrentPoint();
        ax = ay = vx = vy = vz = 0;
        timestamp = new Date();
        cancelAnimationFrame(trackValueHandle);
        cancelAnimationFrame(animationHandle);
        // we start polling the point position to accumulate velocity
        // Once we stop(), we will use accumulated velocity to keep scrolling
        // an object.
        trackValueHandle = requestAnimationFrame(track);
    }
    function track() {
        var now = Date.now();
        var elapsed = now - timestamp;
        timestamp = now;
        var currentPoint = getCurrentPoint();
        var dx = currentPoint.x - lastPoint.x;
        var dy = currentPoint.y - lastPoint.y;
        var dz = (currentPoint.z || 0) - lastPoint.z;
        lastPoint = currentPoint;
        var dt = 1000 / (1 + elapsed);
        // moving average
        vx = 0.8 * dx * dt + 0.2 * vx;
        vy = 0.8 * dy * dt + 0.2 * vy;
        vz = 0.8 * dz * dt + 0.2 * vz;
        trackValueHandle = requestAnimationFrame(track);
    }
    function stop() {
        if (!trackValueHandle)
            return;
        cancelAnimationFrame(trackValueHandle);
        trackValueHandle = 0;
        cancelAnimationFrame(animationHandle);
        animationHandle = 0;
        impulse(vx, vy, vz);
    }
    function impulse(vx, vy, vz) {
        timestamp = Date.now();
        if (vx < -minVelocity || vx > minVelocity) {
            ax = amplitude * vx;
        }
        if (vy < -minVelocity || vy > minVelocity) {
            ay = amplitude * vy;
        }
        if (vz < -minVelocity || vz > minVelocity) {
            az = amplitude * vz;
        }
        animationHandle = requestAnimationFrame(kineticMove);
    }
    function kineticMove() {
        var elapsed = Date.now() - timestamp;
        var moving = false;
        var dx = 0;
        var dy = 0;
        var dz = 0;
        let fade = Math.exp(-elapsed / timeConstant);
        if (ax) {
            dx = ax * fade;
            if (dx > EPS || dx < -EPS)
                moving = true;
            else
                dx = ax = 0;
        }
        if (ay) {
            dy = ay * fade;
            if (dy > EPS || dy < -EPS)
                moving = true;
            else
                dy = ay = 0;
        }
        if (az) {
            dz = az * fade;
            if (dz > EPS || dz < -EPS)
                moving = true;
            else
                dz = az = 0;
        }
        if (moving) {
            let p = getCurrentPoint();
            moveCallback(p.x + dx, p.y + dy, p.z + dz);
            animationHandle = requestAnimationFrame(kineticMove);
        }
    }
}
function getCancelAnimationFrame() {
    if (typeof cancelAnimationFrame === 'function')
        return cancelAnimationFrame;
    return clearTimeout;
}
function getRequestAnimationFrame() {
    if (typeof requestAnimationFrame === 'function')
        return requestAnimationFrame;
    return function (handler) {
        return setTimeout(handler, 16);
    };
}

/**
 * Just to track changes for a single touch event, we create this state:
 */
class TouchState {
    x;
    y;
    lastX;
    lastY;
    id;
    createdAt;
    constructor(touch) {
        this.x = touch.clientX;
        this.y = touch.clientY;
        this.lastX = this.x;
        this.lastY = this.y;
        this.id = touch.identifier;
        this.createdAt = Date.now();
    }
    move(touch) {
        this.lastX = this.x;
        this.lastY = this.y;
        this.x = touch.clientX;
        this.y = touch.clientY;
    }
}
// When two fingers touch the scene we want to "lock" interaction to either rotation
// or scaling. When locked to rotation, we also allow scaling. When Locked to scaling
// only scaling is allowed
const UNKNOWN = 0; // here we don't know yet. Collect more input to make a decision
const SCALE = 1; // Locked to scaling.
const ROTATE = 2; // Locked to rotation.
const INCLINE = 3; // Locked to inclination.
/**
 * This state is used to detect gestures. It answers the questions:
 * - Should we scale with this gesture?
 * - Should we rotate with this gesture?
 * - Should we change incline with this gesture?
 */
class MultiTouchState {
    allowRotation;
    state;
    canRotate;
    canScale;
    canIncline;
    first;
    second;
    stateChanged;
    constructor(allowRotation) {
        this.allowRotation = allowRotation;
        this.state = UNKNOWN;
        this.canRotate = false;
        this.canScale = false;
        this.canIncline = false;
        this.first = undefined;
        this.second = undefined;
        this.stateChanged = false;
    }
    reset() {
        this.state = UNKNOWN;
        this.canRotate = false;
        this.canScale = false;
        this.canIncline = false;
        this.first = undefined;
        this.second = undefined;
    }
    isUnknown() {
        return this.state === UNKNOWN;
    }
    track(first, second) {
        this.stateChanged = false;
        if (this.state !== UNKNOWN)
            return; // Already resolved the state.
        if (!(this.first && this.second)) {
            this.first = {
                id: first.id,
                x: first.x,
                y: first.y
            };
            this.second = {
                id: second.id,
                x: second.x,
                y: second.y
            };
            // we are not ready yet to process anything. Wait for more data:
            return;
        }
        // Make sure we have the same first/second touches:
        let originalFirst = this.first;
        let originalSecond = this.second;
        if (first.id === originalSecond.id && second.id === originalFirst.id) {
            let t = originalFirst;
            originalFirst = originalSecond;
            originalSecond = t;
        }
        // Now let's figure out what gesture we are dealing with...
        let dfy = originalFirst.y - originalSecond.y;
        let dfx = originalFirst.x - originalSecond.x;
        let dcy = first.y - second.y;
        let dcx = first.x - second.x;
        // We compare how much the distance has changed between first two touches and
        // current two touches:
        let scaleChange = Math.abs(Math.hypot(dfy, dfx) - Math.hypot(dcy, dcx));
        // Also compare how much the angle has changed:
        let initialAngle = Math.atan2(dfy, dfx);
        let angleChange = Math.abs(initialAngle - Math.atan2(dcy, dcx));
        // Now let's see if this is incline change:
        initialAngle = (Math.abs(initialAngle) * 180) / Math.PI;
        // Two fingers have to be roughly on the horizontal line
        let horizontalAngleInDegrees = 60;
        let isHorizontalLine = initialAngle < horizontalAngleInDegrees ||
            180 - initialAngle < horizontalAngleInDegrees;
        if (isHorizontalLine &&
            this.allowRotation &&
            Math.abs(first.createdAt - second.createdAt) < 100) {
            // we take a sum of two vectors:
            // direction of the first finger + direction of the second finger
            // In case of incline change we want them to move either up or down
            // which means X change should be small, why Y change should be large
            let vx = first.x - originalFirst.x + second.x - originalSecond.x;
            let vy = first.y - originalFirst.y + second.y - originalSecond.y;
            if (Math.abs(vx) < 10 && Math.abs(vy) > 42) {
                this.canIncline = true;
            }
        }
        if (this.canIncline) {
            this.canRotate = false;
            this.canScale = false;
            this.canIncline = true;
            this.state = INCLINE;
        }
        else if (angleChange > 0.1 && this.allowRotation) {
            // When we are rotating we want to be able to scale too:
            this.canRotate = true;
            this.canScale = true;
            this.canIncline = false;
            this.state = ROTATE;
        }
        else if (scaleChange > 15) {
            // But when we are scaling, only scaling should be allowed
            // (otherwise it's too annoying):
            this.canRotate = false;
            this.canScale = true;
            this.canIncline = false;
            this.state = SCALE;
        }
        this.stateChanged = true;
    }
}

function createTouchController(inputTarget, camera) {
    let listening = false;
    let activeTouches = new Map();
    let { allowRotation, allowPinchRotation, panAnimation, rotateAnimation } = camera;
    let multiTouchState = new MultiTouchState(allowPinchRotation && allowRotation);
    // used for double tap distance check: if they tapped to far, it is not a double tap:
    let lastTouch;
    let lastTouchEndEventTime = Date.now();
    let lastMultiTouchEventTime = lastTouchEndEventTime;
    listenToEvents();
    return { dispose };
    function dispose() {
        inputTarget.removeEventListener('touchstart', handleTouchStart, { passive: false });
        stopDocumentTouchListeners();
    }
    function listenToEvents() {
        inputTarget.addEventListener('touchstart', handleTouchStart, { passive: false });
    }
    function handleTouchStart(e) {
        if (!listening) {
            startDocumentTouchListeners();
            listening = true;
        }
        panAnimation.cancel();
        rotateAnimation.cancel();
        if (e.touches.length === 1) {
            // only when one touch is active we want to have inertia
            panAnimation.start();
        }
        for (let i = 0; i < e.touches.length; ++i) {
            let touch = e.touches[i];
            if (!activeTouches.has(touch.identifier)) {
                activeTouches.set(touch.identifier, new TouchState(touch));
            }
        }
        e.stopPropagation();
        e.preventDefault();
    }
    function handleTouchMove(e) {
        let now = Date.now();
        let dx = 0;
        let dy = 0; // total difference between touches.
        let cx = 0;
        let cy = 0; // center of the touches
        let first, second; // fingers.
        let needRedraw = false;
        let touches = e.touches;
        for (let i = 0; i < touches.length; ++i) {
            let touch = touches[i];
            let state = activeTouches.get(touch.identifier);
            if (!state) {
                // We never tracked this touch - how is this even possible?
                continue;
            }
            state.move(touch);
            cx += state.x;
            cy += state.y;
            dx += state.x - state.lastX;
            dy += state.y - state.lastY;
            if (!first)
                first = state;
            else if (!second)
                second = state;
        }
        let changedCount = touches.length;
        dx /= changedCount;
        dy /= changedCount;
        cx /= changedCount;
        cy /= changedCount;
        if (!second)
            multiTouchState.reset();
        // todo: find something better than `first` and `second` tracking?
        if (first && second) {
            lastMultiTouchEventTime = now;
            let dx = second.x - first.x;
            let dy = second.y - first.y;
            let lastDx = second.lastX - first.lastX;
            let lastDy = second.lastY - first.lastY;
            let zoomChange = Math.hypot(dx, dy) / Math.hypot(lastDx, lastDy) - 1;
            let angle = Math.atan2(dy, dx) - Math.atan2(lastDy, lastDx);
            multiTouchState.track(first, second);
            if (multiTouchState.stateChanged) {
                rotateAnimation.start();
                panAnimation.cancel();
            }
            if (multiTouchState.canScale) {
                camera.zoomToClientCoordinates(cx, cy, zoomChange);
                needRedraw = true;
            }
            if (multiTouchState.canRotate) {
                camera.rotateByAngle(angle, 0);
                needRedraw = true;
            }
            if (multiTouchState.canIncline) {
                let totalMove = second.y - second.lastY + first.y - first.lastY;
                camera.rotateByAbsoluteOffset(0, totalMove);
                needRedraw = true;
            }
            e.preventDefault();
            e.stopPropagation();
        }
        let timeSinceLastTouchEnd = now - lastTouchEndEventTime;
        let shouldSkipPanning = multiTouchState.canIncline || // can't pan when incline is changed
            timeSinceLastTouchEnd < 300 || // don't pan if they just released a finger.
            (e.touches.length > 1 && multiTouchState.isUnknown());
        if ((dx !== 0 || dy !== 0) && !shouldSkipPanning) {
            // we are panning around
            camera.panByAbsoluteOffset(dx, dy);
            needRedraw = true;
        }
        if (needRedraw) {
            camera.redraw();
        }
    }
    function handleTouchEnd(e) {
        let now = Date.now();
        let timeSinceLastTouchEnd = now - lastTouchEndEventTime;
        lastTouchEndEventTime = now;
        let touches = e.changedTouches;
        for (let i = 0; i < touches.length; ++i) {
            let touch = touches[i];
            activeTouches.delete(touch.identifier);
        }
        if (e.touches.length < 2) {
            multiTouchState.reset(); // prepare for more multi-touch gesture detection
            rotateAnimation.stop(); // spin if necessary.
            panAnimation.stop();
        }
        if (e.touches.length === 0) {
            // Just in case we missed a finger in the map - clean it here.
            activeTouches.clear();
        }
        if (activeTouches.size === 0 && e.changedTouches.length === 1) {
            listening = false;
            stopDocumentTouchListeners();
            panAnimation.stop();
            if (timeSinceLastTouchEnd < 350 && now - lastMultiTouchEventTime > 350) {
                // Double tap?
                let newLastTouch = e.changedTouches[0];
                let dx = Math.abs(newLastTouch.clientX - lastTouch.clientX);
                let dy = Math.abs(newLastTouch.clientY - lastTouch.clientY);
                if (Math.hypot(dx, dy) < 30) {
                    // Yes! They tapped close enough to the last tap. Zoom in:
                    camera.zoomToClientCoordinates(lastTouch.clientX, lastTouch.clientY, 0.5, true);
                }
            }
            lastTouch = e.changedTouches[0];
        }
    }
    function startDocumentTouchListeners() {
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: false });
        document.addEventListener('touchcancel ', handleTouchEnd, { passive: false });
    }
    function stopDocumentTouchListeners() {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel ', handleTouchEnd);
    }
}

function getSpherical(r, theta, phi) {
    let z = r * Math.cos(theta);
    let x = r * Math.sin(theta) * Math.cos(phi);
    let y = r * Math.sin(theta) * Math.sin(phi);
    return [x, y, z];
}
function clamp$2(v, min, max) {
    if (v < min)
        v = min;
    if (v > max)
        v = max;
    return v;
}
function option(value, fallback) {
    if (value === undefined)
        return fallback;
    return value;
}
function clampTo(x, threshold, clampValue) {
    return Math.abs(x) < threshold ? clampValue : x;
}

function createKeyboardController(inputTarget, camera) {
    let frameHandle = 0;
    let vx = 0, vy = 0, vz = 0; // velocity of the panning
    let dx = 0, dy = 0, dz = 0; // actual offset of the panning
    let dPhi = 0, vPhi = 0; // rotation 
    let dRadius = 0, vRadius = 0; // radius
    let dIncline = 0, vIncline = 0; // inclination
    listenToEvents();
    return { dispose };
    function listenToEvents() {
        if (!inputTarget.getAttribute('tabindex')) {
            inputTarget.setAttribute('tabindex', '0');
        }
        inputTarget.addEventListener('keydown', handleKeyDown);
        inputTarget.addEventListener('keyup', handleKeyUp);
    }
    function dispose() {
        inputTarget.removeEventListener('keydown', handleKeyDown);
        inputTarget.removeEventListener('keyup', handleKeyUp);
        cancelAnimationFrame(frameHandle);
    }
    function frame() {
        frameHandle = 0;
        let dampFactor = 0.9;
        let needRedraw = false;
        dx = clampTo(dx * dampFactor + vx, 0.5, 0);
        dy = clampTo(dy * dampFactor + vy, 0.5, 0);
        dz = clampTo(dz * dampFactor + vz, 0.5, 0);
        if (dx || dy) {
            camera.panByAbsoluteOffset(dx, dy);
            needRedraw = true;
        }
        if (dz) {
            camera.slideCenterUpDown(dz);
            needRedraw = true;
        }
        dPhi = clampTo((dPhi * dampFactor + vPhi / 2), Math.PI / 360, 0);
        dIncline = clampTo((dIncline * dampFactor + vIncline / 6), Math.PI / 360, 0);
        if (dPhi || dIncline) {
            camera.rotateByAbsoluteOffset(dPhi, dIncline);
            needRedraw = true;
        }
        dRadius = clampTo((dRadius * 0.7 + vRadius), 0.5, 0);
        if (dRadius) {
            let scaleFactor = Math.sign(dRadius) * 0.025;
            camera.zoomCenterByScaleFactor(scaleFactor, 0, 0);
            needRedraw = true;
        }
        if (needRedraw) {
            camera.redraw();
            processNextInput();
        }
    }
    function processNextInput() {
        if (frameHandle)
            return; // already scheduled
        frameHandle = requestAnimationFrame(frame);
    }
    function handleKeyDown(e) {
        onKey(e, 1);
    }
    function handleKeyUp(e) {
        onKey(e, 0);
    }
    function onKey(e, isDown) {
        if (isModifierKey$1(e))
            return;
        // TODO: implement plane move on the z up/down?
        switch (e.which) {
            case 81: // q - roll right
                vPhi = -isDown;
                break;
            case 69: // e - roll left
                vPhi = isDown;
                break;
            case 187: // + - zoom in
                vRadius = isDown;
                break;
            case 189: // - - zoom in
                vRadius = -isDown;
                break;
            case 82: // r - incline up
                vIncline = isDown;
                break;
            case 70: // f - incline down
                vIncline = -isDown;
                break;
            case 37: // ←
            case 65: // a
                vx = isDown;
                break;
            case 39: // →
            case 68: // d
                vx = -isDown;
                break;
            case 38: // ↑
            case 87: // w
                vy = isDown;
                break;
            case 40: // ↓
            case 83: // s
                vy = -isDown;
                break;
            case 71: // g
                vz = -isDown;
                break;
            case 84: // t
                vz = isDown;
                break;
        }
        processNextInput();
    }
}
function isModifierKey$1(e) {
    return e.altKey || e.ctrlKey || e.metaKey;
}

function createMouseController(inputTarget, camera) {
    let mouseX, mouseY, isAltMouseMove;
    let { allowRotation, panAnimation, rotateAnimation } = camera;
    inputTarget.addEventListener('wheel', handleWheel, { passive: false });
    inputTarget.addEventListener('mousedown', handleMouseDown, {
        passive: false
    });
    inputTarget.addEventListener('dblclick', handleDoubleClick, {
        passive: false
    });
    return { dispose };
    function dispose() {
        inputTarget.removeEventListener('wheel', handleWheel, { passive: false });
        inputTarget.removeEventListener('mousedown', handleMouseDown, { passive: false });
        inputTarget.removeEventListener('dblclick', handleDoubleClick, { passive: false });
        // TODO: Should I be more precise here?
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
    function handleMouseDown(e) {
        let isLeftButton = (e.button === 1 && window.event !== null) || e.button === 0;
        if (!isLeftButton)
            return;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        mouseX = e.clientX;
        mouseY = e.clientY;
        isAltMouseMove = e.altKey && allowRotation;
        panAnimation.cancel();
        rotateAnimation.cancel();
        if (isAltMouseMove) {
            rotateAnimation.start();
        }
        else {
            panAnimation.start();
        }
    }
    function onMouseMove(e) {
        let dy = e.clientY - mouseY;
        let dx = e.clientX - mouseX;
        if (isAltMouseMove) {
            camera.rotateByAbsoluteOffset(dx, dy);
        }
        else {
            camera.panByAbsoluteOffset(dx, dy);
        }
        mouseX = e.clientX;
        mouseY = e.clientY;
        camera.redraw();
    }
    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        if (isAltMouseMove) {
            rotateAnimation.stop();
        }
        else {
            panAnimation.stop();
        }
    }
    function handleDoubleClick(e) {
        camera.zoomToClientCoordinates(e.clientX, e.clientY, 0.5, true);
        e.preventDefault();
        e.stopPropagation();
    }
    function handleWheel(e) {
        // in windows FF it scrolls differently. Want to have the same speed there:
        let deltaFactor = e.deltaMode > 0 ? 100 : 1;
        let scaleFactor = getScaleFactorFromDelta(-e.deltaY * deltaFactor);
        camera.zoomToClientCoordinates(e.clientX, e.clientY, scaleFactor);
        e.preventDefault();
    }
    function getScaleFactorFromDelta(delta) {
        return Math.sign(delta) * Math.min(0.25, Math.abs(delta / 128));
    }
}

function getInputTarget(requestedTarget, fallback) {
    if (typeof requestedTarget === 'string') {
        let result = document.querySelector(requestedTarget);
        if (!result)
            throw new Error('Cannot resolve input target element: ' + requestedTarget);
        return result;
    }
    if (requestedTarget)
        return requestedTarget;
    return fallback;
}

class TransformEvent {
    drawContext;
    updated;
    constructor(scene) {
        this.drawContext = scene.getDrawContext();
        this.updated = false;
    }
}

/**
 * Controls that are best suited for map-like applications with top-down view
 */
function createMapControls(scene) {
    const drawContext = scene.getDrawContext();
    let view = drawContext.view;
    let rotationSpeed = Math.PI * 2;
    let inclinationSpeed = Math.PI * 1.618;
    let transformEvent = new TransformEvent(scene);
    let sceneOptions = scene.getOptions() || {};
    let allowRotation = sceneOptions.allowRotation === undefined ? true : !!sceneOptions.allowRotation;
    let allowPinchRotation = sceneOptions.allowPinchRotation === undefined ? allowRotation : !!sceneOptions.allowPinchRotation;
    // angle of rotation around Y axis, tracked from axis X to axis Z
    let minPhi = option(sceneOptions.minPhi, -Infinity);
    let maxPhi = option(sceneOptions.maxPhi, Infinity);
    // Rotate the camera so it looks to the central point in Oxy plane from distance r.
    let phi = clamp$2(-Math.PI / 2, minPhi, maxPhi);
    // camera inclination angle. (Angle above Oxz plane)
    let minTheta = option(sceneOptions.minTheta, 0);
    let maxTheta = option(sceneOptions.maxTheta, Math.PI);
    let theta = clamp$2(0, minTheta, maxTheta);
    // Distance to the point at which our camera is looking
    let minR = option(sceneOptions.minZoom, -Infinity);
    let maxR = option(sceneOptions.maxZoom, Infinity);
    let r = clamp$2(1, minR, maxR);
    let centerPointPosition = view.center;
    let cameraPosition = view.position;
    let panAnimation = createKineticAnimation(getCenterPosition, setCenterPosition);
    let rotateAnimation = createKineticAnimation(getCenterRotation, setCenterRotation, { minVelocity: 1 });
    let planeNormal = [0, 0, 1];
    const api = {
        dispose,
        setViewBox,
        panByAbsoluteOffset,
        slideCenterUpDown,
        rotateByAngle,
        rotateByAbsoluteOffset,
        zoomCenterByScaleFactor,
        zoomToClientCoordinates,
        redraw,
        allowRotation,
        allowPinchRotation,
        rotateAnimation,
        panAnimation,
    };
    const inputTarget = getInputTarget(sceneOptions.inputTarget, drawContext.canvas);
    const keyboardController = createKeyboardController(inputTarget, api);
    const touchController = createTouchController(inputTarget, api);
    const mouseController = createMouseController(inputTarget, api);
    redraw();
    return api;
    function setViewBox() {
        cameraPosition = view.position;
        r = Math.hypot(cameraPosition[2]);
        centerPointPosition[0] = cameraPosition[0];
        centerPointPosition[1] = cameraPosition[1];
        centerPointPosition[2] = 0;
        theta = clamp$2(0, minTheta, maxTheta);
        phi = clamp$2(-Math.PI / 2, minPhi, maxPhi);
        redraw();
        return api;
    }
    function dispose() {
        rotateAnimation.cancel();
        panAnimation.cancel();
        touchController.dispose();
        keyboardController.dispose();
        mouseController.dispose();
    }
    function getZoomPlaneIntersection(clientX, clientY) {
        let viewPoint = scene.getSceneCoordinate(clientX, clientY);
        let ray = sub(viewPoint, viewPoint, cameraPosition);
        normalize$2(ray, ray);
        let denom = dot(planeNormal, ray);
        if (Math.abs(denom) > 1e-7) {
            let t = dot(sub([0, 0, 0], centerPointPosition, cameraPosition), planeNormal) / denom;
            return scaleAndAdd([0, 0, 0], cameraPosition, ray, t);
        }
    }
    function rotateByAngle(angleChange, thetaChange) {
        phi = clamp$2(phi + angleChange, minPhi, maxPhi);
        theta = clamp$2(theta + thetaChange, minTheta, maxTheta);
    }
    function rotateByAbsoluteOffset(dx, dy) {
        if (!allowRotation)
            return;
        let ar = drawContext.width / drawContext.height;
        phi -= (rotationSpeed * dx) / drawContext.width;
        theta -= ((inclinationSpeed * dy) / drawContext.height) * ar;
        theta = clamp$2(theta, minTheta, maxTheta);
        phi = clamp$2(phi, minPhi, maxPhi);
    }
    function panByAbsoluteOffset(dx, dy) {
        let ar = drawContext.width / drawContext.height;
        // the idea behind this formula is this. We turn dx and dy to be
        // in a range from [0..1] (as a ratio of the screen width or height),
        // We know the FoV angle, we want to know how much of the distance we
        // traveled on the frustrum plane.
        // Distance to frustrum is `r`, thus half length of the frustrum plane
        // is `r * tan(fov/2)`, we now extend it to full length by performing `2 * `
        // and take the ratio in dx and dy scale.
        let fCoefficient = 2 * r * Math.tan(drawContext.fov / 2);
        let x = (ar * fCoefficient * dx) / (drawContext.width / drawContext.pixelRatio);
        let y = (fCoefficient * dy) / (drawContext.height / drawContext.pixelRatio);
        moveCenterBy(x, -y); // WebGL Y is not the same as typical DOM Y.
    }
    function zoomToClientCoordinates(clientX, clientY, scaleFactor, shouldAnimate) {
        let p = getZoomPlaneIntersection(clientX, clientY);
        if (!p) {
            return;
        }
        let dx = p[0] - centerPointPosition[0];
        let dy = p[1] - centerPointPosition[1];
        if (shouldAnimate) {
            let from = { r, x: centerPointPosition[0], y: centerPointPosition[1] };
            let to = {
                r: clamp$2(r * (1 - scaleFactor), minR, maxR),
                x: from.x + dx * scaleFactor,
                y: from.y + dy * scaleFactor
            };
            amator.exports(from, to, {
                step(values) {
                    r = values.r;
                    centerPointPosition[0] = values.x;
                    centerPointPosition[1] = values.y;
                    redraw();
                }
            });
        }
        else {
            zoomCenterByScaleFactor(scaleFactor, dx, dy);
            redraw();
        }
    }
    function moveCenterBy(dx, dy) {
        let cPhi = Math.cos(phi);
        let sPhi = Math.sin(phi);
        centerPointPosition[0] += cPhi * dy + sPhi * dx;
        centerPointPosition[1] += sPhi * dy - cPhi * dx;
    }
    function slideCenterUpDown(dz) {
        centerPointPosition[2] += dz * r * 0.001;
    }
    function getCenterPosition() {
        return {
            x: centerPointPosition[0],
            y: centerPointPosition[1],
            z: centerPointPosition[2]
        };
    }
    function getCenterRotation() {
        return {
            x: phi,
            y: theta,
            z: 0, // Should be r, but not used.
        };
    }
    function setCenterRotation(new_phi, new_theta) {
        theta = clamp$2(new_theta, minTheta, maxTheta);
        phi = clamp$2(new_phi, minPhi, maxPhi);
        redraw();
    }
    function setCenterPosition(x, y, z) {
        set$2(centerPointPosition, x, y, z);
        redraw();
    }
    function zoomCenterByScaleFactor(scaleFactor, dx, dy) {
        // `scaleFactor` defines whether we shrink the radius by multiplying it by something < 1
        // or increase it by multiplying by something > 1.
        let newR = clamp$2(r * (1 - scaleFactor), minR, maxR);
        if (newR === r)
            return;
        r = newR;
        // let's also move the center closer to the scrolling origin, this gives
        // better UX, similar to the one seen in maps: Map zooms into point under
        // mouse cursor.
        // How much should we move the center point?
        // (dx, dy) is current distance from the scroll point to the center. We should
        // keep it the same after we scaled!
        // dXScaled = dx * (1 - scaleFactor); // this is going to be the distance after we scaled.
        // newOffsetX = dx - dXScaled; // Thus we move the center by this amount. Which is the same as:
        // newOffsetX = dx - dx * (1 - scaleFactor) == dx * (1 - 1 + scaleFactor) == dx * scaleFactor;
        // Thus the formula below:
        centerPointPosition[0] += dx * scaleFactor;
        centerPointPosition[1] += dy * scaleFactor;
    }
    function redraw() {
        let newCameraPosition = getSpherical(r, theta, phi);
        // We want to know what is an up vector? The idea is that its position
        // can also be represented in spherical coordinates of a sphere with slightly larger
        // radius. How much larger?
        // Just assume `up` vector length is 1, then the sphere  radius is sqrt(r * r + 1 * 1):
        let upVectorSphereRadius = Math.hypot(r, 1); // Note: may run into precision error here.
        // We know a hypotenuse of the new triangle and its size. The angle would be
        // `Math.acos(r/upVectorSphereRadius)`, and since we don't care whether up is above or below
        // the actual `theta`, we pick one direction and stick to it:
        let upVectorTheta = theta - Math.acos(r / upVectorSphereRadius);
        // The rotation angle around z axis (phi) is the same as the camera position.
        let upVector = getSpherical(upVectorSphereRadius, upVectorTheta, phi);
        // Finally we know both start of the upVector, and the end of the up vector, let's find the direction:
        sub(upVector, upVector, newCameraPosition);
        set$2(cameraPosition, newCameraPosition[0], newCameraPosition[1], newCameraPosition[2]);
        add(cameraPosition, cameraPosition, centerPointPosition);
        // I'd assume this could be simplified? I just don't know and haven't thought yet how:
        targetTo(view.cameraWorld, cameraPosition, centerPointPosition, upVector);
        getRotation(view.orientation, view.cameraWorld);
        view.update();
        transformEvent.updated = false;
        scene.fire('transform', transformEvent);
        if (transformEvent.updated) {
            redraw();
            return;
        }
        scene.getRoot().scheduleMVPUpdate();
        scene.renderFrame();
    }
}

// Float32 is not enough for large scenes.
setMatrixArrayType(Float64Array);
function createScene(canvas, options = {}) {
    let width;
    let height;
    let pixelRatio = options.devicePixelRatio || window.devicePixelRatio;
    let wglContextOptions = options.wglContextOptions;
    let gl = (canvas.getContext(options.version === 2 ? 'webgl2' : 'webgl', wglContextOptions) ||
        canvas.getContext('experimental-webgl', wglContextOptions));
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    let frameToken = 0;
    let sceneRoot = new Element();
    let hasMouseClickListeners = false;
    let hasMouseMoveListeners = false;
    let inputTarget = getInputTarget(options.inputTarget, canvas);
    // Keeping canvas rect in memory to speed things up
    let canvasRect;
    let view = new ViewMatrix();
    let projection = create$4();
    let inverseProjection = create$4();
    let fov = options.fov === undefined ? Math.PI * 45 / 180 : options.fov;
    let near = options.near === undefined ? 0.01 : options.near;
    let far = options.far === undefined ? Infinity : options.far;
    const drawContext = {
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio,
        canvas,
        projection,
        inverseProjection,
        view,
        fov,
    };
    updateCanvasSize();
    let api = ngraph_events({
        appendChild,
        getSceneCoordinate,
        getClientCoordinate,
        getTransform,
        getRoot,
        getGL,
        removeChild,
        setViewBox,
        setClearColor,
        getClearColor,
        clear,
        dispose,
        renderFrame,
        getPixelRatio,
        setPixelRatio,
        updateCanvasSize,
        getCameraController,
        setCameraController,
        getDrawContext,
        getOptions
    });
    let realOn = api.on;
    // We don't want to waste CPU resources if nobody cares about mouse events
    // only when they start listen to events we will perform the input listening
    api.on = trapOn;
    sceneRoot.bindScene(api);
    let cameraController = (options.controls || createMapControls)(api);
    let disposeClick;
    listenToEvents();
    renderFrame();
    return api;
    function getPixelRatio() {
        return pixelRatio;
    }
    function getDrawContext() {
        return drawContext;
    }
    function getOptions() {
        return options;
    }
    function setPixelRatio(newPixelRatio) {
        pixelRatio = newPixelRatio;
        drawContext.pixelRatio = pixelRatio;
        updateCanvasSize();
    }
    function getGL() {
        return gl;
    }
    function getRoot() {
        return sceneRoot;
    }
    function setCameraController(createCamera) {
        if (cameraController) {
            cameraController.dispose();
        }
        cameraController = createCamera(api, drawContext);
        return cameraController;
    }
    function getCameraController() {
        return cameraController;
    }
    function getTransform() {
        return sceneRoot.model;
    }
    function setClearColor(r, g, b, a) {
        gl.clearColor(r, g, b, a);
    }
    function getClearColor() {
        // [r, g, b, a]
        return gl.getParameter(gl.COLOR_CLEAR_VALUE);
    }
    function listenToEvents() {
        inputTarget.addEventListener('mousemove', onMouseMove);
        disposeClick = onClap(inputTarget, onMouseClick);
        window.addEventListener('resize', onResize, true);
    }
    function dispose() {
        inputTarget.removeEventListener('mousemove', onMouseMove);
        if (disposeClick)
            disposeClick();
        window.removeEventListener('resize', onResize, true);
        cameraController.dispose();
        sceneRoot.dispose();
        if (frameToken) {
            cancelAnimationFrame(frameToken);
            frameToken = 0;
        }
    }
    function onResize() {
        updateCanvasSize();
    }
    function updateCanvasSize() {
        if (options.size) {
            // Fixed size canvas doesn't update. We assume CSS does the scaling.
            width = canvas.width = options.size.width;
            height = canvas.height = options.size.height;
        }
        else {
            width = canvas.width = canvas.offsetWidth * pixelRatio;
            height = canvas.height = canvas.offsetHeight * pixelRatio;
        }
        canvasRect = canvas.getBoundingClientRect();
        gl.viewport(0, 0, width, height);
        drawContext.width = width;
        drawContext.height = height;
        sceneRoot.worldTransformNeedsUpdate = true;
        perspective(projection, fov, width / height, near, far);
        invert$1(inverseProjection, projection);
        renderFrame();
    }
    function onMouseClick(e) {
        if (!hasMouseClickListeners)
            return;
        var p = getSceneCoordinate(e.clientX, e.clientY);
        if (!p)
            return; // need to zoom in!
        api.fire('click', {
            originalEvent: e,
            x: p[0],
            y: p[1],
            z: p[2]
        });
    }
    function onMouseMove(e) {
        if (!hasMouseMoveListeners)
            return;
        var p = getSceneCoordinate(e.clientX, e.clientY);
        if (!p)
            return;
        api.fire('mousemove', {
            originalEvent: e,
            x: p[0],
            y: p[1],
            z: p[2],
        });
    }
    function getSceneCoordinate(clientX, clientY) {
        clientX -= canvasRect.left;
        clientY -= canvasRect.top;
        var dpr = api.getPixelRatio();
        let clipSpaceX = (dpr * clientX / width) * 2 - 1;
        let clipSpaceY = (1 - dpr * clientY / height) * 2 - 1;
        let spare = [0, 0, 0];
        let mx = transformMat4$1(spare, [clipSpaceX, clipSpaceY, 0], inverseProjection);
        transformMat4$1(mx, mx, view.cameraWorld);
        sub(mx, mx, view.position);
        normalize$2(mx, mx);
        var targetZ = 0;
        // TODO: This is likely not going to work for all cases.
        var distance = (targetZ - view.position[2]) / mx[2];
        if (mx[2] > 0) ;
        scaleAndAdd(mx, view.position, mx, distance);
        return mx;
    }
    function getClientCoordinate(sceneX, sceneY, sceneZ = 0) {
        // TODO: this is not optimized either.
        var mvp = multiply$1(create$4(), projection, view.matrix);
        multiply$1(mvp, mvp, sceneRoot.model);
        var coordinate = transformMat4([0, 0, 0, 0], [sceneX, sceneY, sceneZ, 1], mvp);
        var dpr = api.getPixelRatio();
        var x = width * (coordinate[0] / coordinate[3] + 1) * 0.5 / dpr;
        var y = height * (1 - (coordinate[1] / coordinate[3] + 1) * 0.5) / dpr;
        return { x, y };
    }
    function setViewBox(canvasRect) {
        const dpr = drawContext.pixelRatio;
        const nearHeight = dpr * Math.max((canvasRect.top - canvasRect.bottom) / 2, (canvasRect.right - canvasRect.left) / 2);
        const { position, orientation } = drawContext.view;
        position[0] = (canvasRect.left + canvasRect.right) / 2;
        position[1] = (canvasRect.top + canvasRect.bottom) / 2;
        position[2] = nearHeight / Math.tan(drawContext.fov / 2);
        set(orientation, 0, 0, 0, 1);
        drawContext.view.update();
        if (cameraController.setViewBox) {
            cameraController.setViewBox(canvasRect);
        }
    }
    function renderFrame(immediate = false) {
        if (immediate) {
            return frame();
        }
        if (!frameToken)
            frameToken = requestAnimationFrame(frame);
    }
    function frame() {
        gl.clear(gl.COLOR_BUFFER_BIT);
        sceneRoot.updateWorldTransform();
        sceneRoot.draw(gl, drawContext);
        frameToken = 0;
    }
    function clear() {
        gl.clear(gl.COLOR_BUFFER_BIT);
    }
    function appendChild(child, sendToBack = false) {
        sceneRoot.appendChild(child, sendToBack);
        api.fire('append-child', child); // TODO: might need to add support for bubbling?
    }
    function removeChild(child) {
        sceneRoot.removeChild(child);
        api.fire('remove-child', child);
    }
    function trapOn(eventName, callback, context) {
        if (eventName === 'click')
            hasMouseClickListeners = true;
        if (eventName === 'mousemove')
            hasMouseMoveListeners = true;
        return realOn(eventName, callback, context);
    }
}

/**
 * Smart initial placement: instead of starting from random positions, place nodes so
 * that distances on screen roughly follow graph distances (number of hops). The force
 * layout then only needs to polish the result.
 *
 * Two cheap candidates are computed, and the one that better matches graph distances wins:
 *  - Pivot MDS (Brandes & Pich, 2006): BFS from k well spread "pivot" nodes, then classical
 *    MDS on those distances. O(k * (n + m)).
 *  - Radial BFS tree (2D only): BFS tree from a central node, depth is the radius, each
 *    subtree gets an angular wedge proportional to its size. Catches trees, which MDS
 *    tends to fold onto themselves. O(n + m).
 */
function placeNodes(graph, layout, options = {}) {
  const dimensions = options.dimensions || 2;
  const unit = options.unit || 10; // length of one hop, in layout units
  const jitter = options.jitter === undefined ? 0.1 : options.jitter;
  const random = createRandom(options.seed || 42);

  const csr = toCSR(graph);
  if (csr.n === 0) return 'empty';

  let placement = pivotMDS(csr, dimensions, options.pivots || 25, random);
  let choice = 'pivot MDS';
  if (dimensions === 2 && csr.n > 2) {
    const radial = radialBFS(csr, random);
    if (pivotStress(csr, radial) < pivotStress(csr, placement)) {
      placement = radial;
      choice = 'radial tree';
    }
  }

  const coordinates = new Array(dimensions + 1);
  for (let i = 0; i < csr.n; i++) {
    coordinates[0] = csr.ids[i];
    for (let d = 0; d < dimensions; d++) {
      coordinates[d + 1] = placement[d][i] * unit + (random() - 0.5) * jitter * unit;
    }
    layout.setNodePosition.apply(layout, coordinates);
  }
  return choice;
}

function toCSR(graph) {
  const ids = [];
  graph.forEachNode(node => { ids.push(node.id); });
  const n = ids.length;
  const index = new Map(ids.map((id, i) => [id, i]));
  const degree = new Int32Array(n);
  const edges = [];
  graph.forEachLink(link => {
    const a = index.get(link.fromId), b = index.get(link.toId);
    if (a === b) return;
    edges.push(a, b);
    degree[a]++;
    degree[b]++;
  });
  const offsets = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) offsets[i + 1] = offsets[i] + degree[i];
  const fill = offsets.slice(0, n);
  const neighbors = new Int32Array(offsets[n]);
  for (let e = 0; e < edges.length; e += 2) {
    const a = edges[e], b = edges[e + 1];
    neighbors[fill[a]++] = b;
    neighbors[fill[b]++] = a;
  }
  return { ids, n, offsets, neighbors, degree };
}

// BFS from `source` into `dist` (-1 = not reached). Returns number of reached nodes;
// `queue` holds them in BFS order.
function bfs(csr, source, dist, queue) {
  dist.fill(-1);
  dist[source] = 0;
  queue[0] = source;
  let head = 0, tail = 1;
  while (head < tail) {
    const u = queue[head++];
    const next = dist[u] + 1;
    for (let k = csr.offsets[u]; k < csr.offsets[u + 1]; k++) {
      const v = csr.neighbors[k];
      if (dist[v] < 0) { dist[v] = next; queue[tail++] = v; }
    }
  }
  return tail;
}

function pivotMDS(csr, dimensions, pivotCount, random) {
  const n = csr.n;
  const k = Math.min(pivotCount, n);
  const dist = new Int32Array(n), queue = new Int32Array(n);
  const minDist = new Float64Array(n).fill(Infinity);
  const columns = []; // squared distances to each pivot

  // First pivot is the highest degree node; each next one is the farthest from all previous.
  let pivot = 0;
  for (let i = 1; i < n; i++) if (csr.degree[i] > csr.degree[pivot]) pivot = i;
  for (let t = 0; t < k; t++) {
    bfs(csr, pivot, dist, queue);
    let maxDist = 0;
    for (let i = 0; i < n; i++) if (dist[i] > maxDist) maxDist = dist[i];
    const column = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const d = dist[i] < 0 ? maxDist + 1 : dist[i]; // other components: just beyond the farthest
      column[i] = d * d;
      if (d < minDist[i]) minDist[i] = d;
    }
    columns.push(column);
    let next = 0;
    for (let i = 1; i < n; i++) if (minDist[i] > minDist[next]) next = i;
    pivot = next;
  }

  // Double centering
  const rowMean = new Float64Array(n);
  let grandMean = 0;
  const columnMean = columns.map(column => {
    let sum = 0;
    for (let i = 0; i < n; i++) { sum += column[i]; rowMean[i] += column[i]; }
    grandMean += sum;
    return sum / n;
  });
  for (let i = 0; i < n; i++) rowMean[i] /= k;
  grandMean /= n * k;
  columns.forEach((column, t) => {
    for (let i = 0; i < n; i++) column[i] = -0.5 * (column[i] - rowMean[i] - columnMean[t] + grandMean);
  });

  // Top eigenvectors of the small k x k matrix C^T C give the coordinates
  const M = new Float64Array(k * k);
  for (let a = 0; a < k; a++) {
    for (let b = a; b < k; b++) {
      let sum = 0;
      const ca = columns[a], cb = columns[b];
      for (let i = 0; i < n; i++) sum += ca[i] * cb[i];
      M[a * k + b] = M[b * k + a] = sum;
    }
  }
  const vectors = topEigenvectors(M, k, dimensions, random);
  const placement = vectors.map(v => {
    const out = new Float64Array(n);
    columns.forEach((column, t) => {
      for (let i = 0; i < n; i++) out[i] += v[t] * column[i];
    });
    return out;
  });
  scaleToGraphDistance(csr, placement, random);
  return placement;
}

function topEigenvectors(M, k, count, random) {
  const vectors = [];
  for (let e = 0; e < count; e++) {
    const v = new Float64Array(k).map(() => random() - 0.5);
    for (let iteration = 0; iteration < 200; iteration++) {
      const w = new Float64Array(k);
      for (let a = 0; a < k; a++) {
        let sum = 0;
        for (let b = 0; b < k; b++) sum += M[a * k + b] * v[b];
        w[a] = sum;
      }
      vectors.forEach(u => {
        let dot = 0;
        for (let a = 0; a < k; a++) dot += w[a] * u[a];
        for (let a = 0; a < k; a++) w[a] -= dot * u[a];
      });
      let norm = 0;
      for (let a = 0; a < k; a++) norm += w[a] * w[a];
      norm = Math.sqrt(norm) || 1;
      let delta = 0;
      for (let a = 0; a < k; a++) {
        const x = w[a] / norm;
        delta += Math.abs(x - v[a]);
        v[a] = x;
      }
      if (delta < 1e-9) break;
    }
    vectors.push(v);
  }
  return vectors;
}

// Scales coordinates so that 1 unit is about one hop (least squares on sampled pairs).
function scaleToGraphDistance(csr, placement, random) {
  const n = csr.n;
  const dist = new Int32Array(n), queue = new Int32Array(n);
  let num = 0, den = 0;
  for (let s = 0; s < Math.min(8, n); s++) {
    const source = Math.floor(random() * n);
    bfs(csr, source, dist, queue);
    for (let i = 0; i < n; i++) {
      const d = dist[i];
      if (d <= 0) continue;
      const e = distance(placement, i, source);
      num += e / d;
      den += (e * e) / (d * d);
    }
  }
  const scale = den > 0 ? num / den : 1;
  placement.forEach(axis => { for (let i = 0; i < n; i++) axis[i] *= scale; });
}

function radialBFS(csr, random) {
  const n = csr.n;
  const dist = new Int32Array(n), queue = new Int32Array(n);
  // Double sweep finds a long path; its middle is a good center.
  bfs(csr, 0, dist, queue);
  let a = 0;
  for (let i = 0; i < n; i++) if (dist[i] > dist[a]) a = i;
  bfs(csr, a, dist, queue);
  let b = 0;
  for (let i = 0; i < n; i++) if (dist[i] > dist[b]) b = i;
  const half = dist[b] >> 1;
  let center = b;
  while (dist[center] > half) {
    for (let k = csr.offsets[center]; k < csr.offsets[center + 1]; k++) {
      const v = csr.neighbors[k];
      if (dist[v] === dist[center] - 1) { center = v; break; }
    }
  }

  const reached = bfs(csr, center, dist, queue);
  const parent = new Int32Array(n).fill(-1);
  for (let h = 0; h < reached; h++) {
    const u = queue[h];
    for (let k = csr.offsets[u]; k < csr.offsets[u + 1]; k++) {
      const v = csr.neighbors[k];
      if (dist[v] === dist[u] + 1 && parent[v] < 0) parent[v] = u;
    }
  }
  const size = new Float64Array(n).fill(1);
  for (let h = reached - 1; h > 0; h--) size[parent[queue[h]]] += size[queue[h]];

  const start = new Float64Array(n), span = new Float64Array(n);
  const xs = new Float64Array(n), ys = new Float64Array(n);
  span[center] = 2 * Math.PI;
  for (let h = 0; h < reached; h++) {
    const u = queue[h];
    const angle = start[u] + span[u] / 2;
    xs[u] = dist[u] * Math.cos(angle);
    ys[u] = dist[u] * Math.sin(angle);
    let cursor = start[u];
    for (let k = csr.offsets[u]; k < csr.offsets[u + 1]; k++) {
      const v = csr.neighbors[k];
      if (parent[v] !== u) continue;
      start[v] = cursor;
      span[v] = span[u] * size[v] / (size[u] - 1);
      cursor += span[v];
    }
  }
  // Other components: random spots around
  let maxRadius = 0;
  for (let i = 0; i < n; i++) if (dist[i] > maxRadius) maxRadius = dist[i];
  for (let i = 0; i < n; i++) {
    if (dist[i] >= 0) continue;
    xs[i] = (random() - 0.5) * 2 * maxRadius;
    ys[i] = (random() - 0.5) * 2 * maxRadius;
  }
  return [xs, ys];
}

// How well do distances in `placement` follow graph distances (after the best scale)?
function pivotStress(csr, placement) {
  const n = csr.n, dist = new Int32Array(n), queue = new Int32Array(n);
  const random = createRandom(3);
  const pairs = [];
  for (let s = 0; s < Math.min(12, n); s++) {
    const source = Math.floor(random() * n);
    bfs(csr, source, dist, queue);
    for (let i = 0; i < n; i++) if (dist[i] > 0) pairs.push(source, i, dist[i]);
  }
  let num = 0, den = 0;
  for (let p = 0; p < pairs.length; p += 3) {
    const e = distance(placement, pairs[p], pairs[p + 1]), d = pairs[p + 2];
    num += e / d;
    den += e * e / (d * d);
  }
  const scale = den > 0 ? num / den : 1;
  let total = 0;
  for (let p = 0; p < pairs.length; p += 3) {
    const e = scale * distance(placement, pairs[p], pairs[p + 1]), d = pairs[p + 2];
    total += (e - d) * (e - d) / (d * d);
  }
  return total / Math.max(1, pairs.length / 3);
}

function distance(placement, i, j) {
  let sum = 0;
  for (let d = 0; d < placement.length; d++) {
    const delta = placement[d][i] - placement[d][j];
    sum += delta * delta;
  }
  return Math.sqrt(sum);
}

// Small deterministic PRNG (mulberry32), so placement is the same on every load.
function createRandom(seed) {
  let state = seed >>> 0;
  return function () {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Small WebGL 1 helpers. The view draws with plain WebGL inside a w-gl element, so it works next to
// w-gl's own collections (which use WebGL 1 and ANGLE_instanced_arrays) on the same context.

/**
 * What the view needs from WebGL 1: instancing, float textures, and texture reads in vertex
 * shaders (nodes and edges read positions from a texture). Throws an Error that says what is
 * missing.
 */
function getCapabilities(gl) {
  let instancing = gl.getExtension('ANGLE_instanced_arrays');
  let floatTextures = gl.getExtension('OES_texture_float');
  let vertexTextures = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) > 0;
  let missing = [];
  if (!instancing) missing.push('ANGLE_instanced_arrays');
  if (!floatTextures) missing.push('OES_texture_float');
  if (!vertexTextures) missing.push('textures in vertex shaders');
  if (missing.length) throw new Error('This browser\'s WebGL lacks ' + missing.join(', ') + ', which the view needs');
  // Optional: smooth edges of nodes (the node shader checks for it)
  gl.getExtension('OES_standard_derivatives');
  return {instancing, maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE)};
}

/**
 * Compiles and links a program. `attributes` lists the attribute names in the order of their
 * locations; the first one must be a per-vertex (not per-instance) attribute, as some drivers
 * need location 0 to be one.
 */
function createProgram(gl, vertexSource, fragmentSource, attributes, uniforms) {
  let vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  let fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  let program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  attributes.forEach((name, location) => gl.bindAttribLocation(program, location, name));
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    let log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error('Linking a view program failed: ' + log);
  }
  let locations = {};
  attributes.forEach((name, location) => { locations[name] = location; });
  let uniformLocations = {};
  uniforms.forEach(name => { uniformLocations[name] = gl.getUniformLocation(program, name); });
  return {program, attributes: locations, uniforms: uniformLocations};
}

function compile(gl, type, source) {
  let shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    let log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error('Compiling a view shader failed: ' + log);
  }
  return shader;
}

/** A buffer holding `data` (a typed array) */
function createBuffer(gl, data) {
  let buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
}

/** Replaces the contents of `buffer` */
function setBufferData(gl, buffer, data) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
}

/** An RGBA float texture of `width` x `height` texels, read without filtering */
function createFloatTexture(gl, width, height) {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, null);
  return texture;
}

/**
 * Points attribute `location` at `buffer`: `size` components of `type` per vertex (or per
 * instance with `divisor` 1).
 */
function bindAttribute(gl, instancing, location, buffer, size, type, normalized, divisor) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, type, normalized, 0, 0);
  instancing.vertexAttribDivisorANGLE(location, divisor);
}

/** Undoes bindAttribute(), so w-gl's programs find the attribute state they expect */
function unbindAttribute(gl, instancing, location) {
  instancing.vertexAttribDivisorANGLE(location, 0);
  gl.disableVertexAttribArray(location);
}

// The two programs of the view: nodes as round points, edges as lines of a fixed width on screen.
// Both read node positions from the positions texture (see positions.js), so the CPU never touches
// an edge after it is built. The texture's fourth float holds the node's flags (see flags.js):
// nodes and links read their style from it with the same fetch.
//
// Edges smooth their own sides: the quad is half a pixel wider on each side than the line, and
// the fragment shader scales alpha by how much of the pixel the line covers. Multisampling (the
// WebGL default) is not needed, and should be off: with it, every blended edge fragment is written
// to every sample, which made edges the most expensive part of a frame. Nodes smooth their round
// edge the same way, over one pixel (with OES_standard_derivatives; without it the edge is hard).
//
// Each program draws in two passes. The first (`pass` 0) skips nodes flagged ON_TOP and the links
// that touch them; the second (`pass` 1) draws only those, from short lists, after everything
// else, so a highlight is never buried under faint links.

// Row `i` of the positions texture: xyz, and the node's flags in w. Layers of modules (labels)
// read positions the same way.
const POSITION_OF = `
  uniform highp sampler2D positions;
  uniform vec2 positionsSize;
  vec4 positionOf(float row) {
    float y = floor(row / positionsSize.x);
    float x = row - y * positionsSize.x;
    return texture2D(positions, vec2((x + 0.5) / positionsSize.x, (y + 0.5) / positionsSize.y));
  }
  // 1.0 when flags has the bit (a power of two)
  float hasFlag(float flags, float bit) {
    return mod(floor(flags / bit + 0.5 / bit), 2.0);
  }
  // Hovered, dragged or focused
  float isPointed(float flags) {
    return max(hasFlag(flags, 1.0), max(hasFlag(flags, 4.0), hasFlag(flags, 8.0)));
  }
  // Out of view: the instance draws nothing
  const vec4 NOWHERE = vec4(0.0, 0.0, 2.0, 1.0);
`;

// Fog in depth (3D): what is farther from the camera fades, from full at fog.x to fog.z at fog.y
// (clip w). fog.z = 1 turns it off.
const FOG = `
  uniform vec3 fog;
  float fogOf(float w) {
    if (fog.z >= 1.0) return 1.0;
    return mix(1.0, fog.z, clamp((w - fog.x) / max(fog.y - fog.x, 1e-6), 0.0, 1.0));
  }
`;

const NODE_VERTEX = `
  precision highp float;
  uniform mat4 modelViewProjection;
  uniform vec2 resolution;
  uniform float pass;
  // Styles of flagged nodes. Colors with alpha 0 keep the node's own color. Sizes: x scales the
  // node, y is the smallest diameter in pixels.
  uniform vec4 pointedColor;
  uniform vec2 pointedSize;
  uniform vec4 selectedColor;
  uniform vec2 selectedSize;
  // Rings around pointed and selected nodes (alpha 0: none), the halo between a node and its ring
  // (the background's color, so the ring reads on any node color), and in pixels the halo's and
  // the ring's widths
  uniform vec4 pointedRing;
  uniform vec4 selectedRing;
  // The ring of a focused node (the keyboard's place, a node search went to); alpha 0: pointedRing
  uniform vec4 focusedRing;
  uniform vec4 ringHalo;
  uniform vec2 ringSize;
  // Alpha of nodes that are neither selected, next to a selected node, nor pointed at, while
  // something is selected (1 otherwise)
  uniform float dimAlpha;
  // Smallest diameter, in pixels, of the smallest node (0: none); bigger nodes keep their order:
  // a node size/baseSize times as big is at least sqrt of that times minSize wide
  uniform float minSize;
  uniform float baseSize;
  ${FOG}
  ${POSITION_OF}
  attribute vec2 point; // corner of the quad, per vertex
  attribute float row;  // per node
  attribute float size;
  // Widest diameter the node's neighbourhood leaves it, in scene units (0: no cap; see room.js)
  attribute float room;
  attribute vec4 color; // 0xRRGGBBAA as four bytes

  varying vec4 vColor;
  varying vec2 vPoint;
  // Radii in units of the quad: where the node's disc ends and where its halo ends (the ring runs
  // from there to the quad's edge); 0.5 for nodes without a ring
  varying vec2 vRadii;
  varying vec4 vRing;
  varying vec4 vHalo;
  void main() {
    vec4 position = positionOf(row);
    float flags = position.w;
    if (hasFlag(flags, 128.0) != pass) {
      gl_Position = NOWHERE;
      return;
    }
    vec4 c = color.abgr;
    vec4 ring = vec4(0.0);
    float diameter = size;
    float scale = 1.0;
    if (flags > 0.0 || minSize > 0.0) {
      vec4 center = modelViewProjection * vec4(position.xyz, 1.0);
      // pixels per unit of the scene here
      scale = 0.5 * resolution.y * length(vec3(modelViewProjection[0][1], modelViewProjection[1][1], modelViewProjection[2][1])) / max(center.w, 1e-6);
      // Every node is at least minSize pixels wide, so a node's color shows at any zoom
      diameter = max(diameter, minSize * sqrt(max(size / baseSize, 1.0)) / scale);
    }
    // ...but no wider than its room, where nodes crowd (highlighted nodes keep their size)
    if (room > 0.0 && flags == 0.0) diameter = min(diameter, room);
    if (flags > 0.0) {
      float pointed = isPointed(flags);
      float selected = hasFlag(flags, 2.0);
      if (selected > 0.5) {
        if (selectedColor.a > 0.0) c = selectedColor;
        diameter = max(diameter * selectedSize.x, selectedSize.y / scale);
      }
      if (pointed > 0.5) {
        if (pointedColor.a > 0.0) c = pointedColor;
        diameter = max(diameter * pointedSize.x, pointedSize.y / scale);
      }
      if (pointed + selected + hasFlag(flags, 16.0) < 0.5) c.a *= dimAlpha;
      // A pointer on the node wins, then focus, then selection
      float pointer = max(hasFlag(flags, 1.0), hasFlag(flags, 4.0));
      float focused = hasFlag(flags, 8.0);
      ring = pointer > 0.5 && pointedRing.a > 0.0 ? pointedRing
        : focused > 0.5 && focusedRing.a > 0.0 ? focusedRing
        : pointed > 0.5 && pointedRing.a > 0.0 ? pointedRing
        : selected > 0.5 ? selectedRing : vec4(0.0);
    } else {
      c.a *= dimAlpha;
    }
    float quad = diameter;
    vRadii = vec2(0.5);
    if (ring.a > 0.0) {
      // The quad grows by the halo and the ring, which keep their width in pixels at any zoom
      quad = diameter + 2.0 * (ringSize.x + ringSize.y) / scale;
      vRadii = vec2(0.5 * diameter / quad, 0.5 * (diameter + 2.0 * ringSize.x / scale) / quad);
    }
    gl_Position = modelViewProjection * vec4(position.xyz + vec3(point * quad, 0.), 1.0);
    if (flags == 0.0) c.a *= fogOf(gl_Position.w);
    vColor = c;
    vRing = ring;
    vHalo = vec4(ringHalo.rgb, ringHalo.a * c.a);
    vPoint = point;
  }`;

const NODE_FRAGMENT = `
  #extension GL_OES_standard_derivatives : enable
  precision highp float;
  // 0: the whole node; 1: only its solid inside; 2: only its smoothed edge
  uniform float part;
  varying vec4 vColor;
  varying vec2 vPoint;
  varying vec2 vRadii;
  varying vec4 vRing;
  varying vec4 vHalo;
  void main() {
    float dist = length(vPoint);
  #ifdef GL_OES_standard_derivatives
    // one pixel, in units of the quad
    float pixel = fwidth(dist);
    float coverage = clamp((0.5 - dist) / pixel + 0.5, 0.0, 1.0);
    if (coverage <= 0.0 || (part == 1.0 && coverage < 1.0) || (part == 2.0 && coverage >= 1.0)) {discard;}
    vec4 c = vColor;
    if (vRing.a > 0.0) {
      // disc, then halo, then ring, each edge smoothed over a pixel
      c = mix(c, vHalo, clamp((dist - vRadii.x) / pixel + 0.5, 0.0, 1.0));
      c = mix(c, vRing, clamp((dist - vRadii.y) / pixel + 0.5, 0.0, 1.0));
    }
    gl_FragColor = vec4(c.rgb, c.a * coverage);
  #else
    if (dist >= 0.5) {discard;}
    vec4 c = vColor;
    if (vRing.a > 0.0) c = dist < vRadii.x ? vColor : dist < vRadii.y ? vHalo : vRing;
    gl_FragColor = c;
  #endif
  }`;

const EDGE_VERTEX = `
  precision highp float;
  uniform mat4 modelViewProjection;
  uniform float width;
  uniform vec2 resolution;
  uniform float pass;
  // Alpha (at least) of links that touch a selected or pointed-at node, and their color (alpha 0:
  // they keep their own)
  uniform float litAlpha;
  uniform vec4 litColor;
  uniform float dimAlpha;
  ${FOG}
  ${POSITION_OF}
  attribute vec2 point; // corner of the quad, per vertex
  attribute vec2 ends;  // rows of the two nodes, per edge
  attribute vec4 color;

  varying vec4 vColor;
  varying float vAcross; // distance from the middle of the line, in pixels
  void main() {
    vec4 from = positionOf(ends.x);
    vec4 to = positionOf(ends.y);
    if (max(hasFlag(from.w, 128.0), hasFlag(to.w, 128.0)) != pass) {
      gl_Position = NOWHERE;
      return;
    }
    vec4 c = color.abgr;
    float lit = max(max(isPointed(from.w), hasFlag(from.w, 2.0)), max(isPointed(to.w), hasFlag(to.w, 2.0)));
    if (lit > 0.5) {
      if (litColor.a > 0.0) c.rgb = litColor.rgb;
      c.a = max(c.a, litAlpha);
    } else c.a *= dimAlpha;

    vec4 clip0 = modelViewProjection * vec4(from.xyz, 1.0);
    vec4 clip1 = modelViewProjection * vec4(to.xyz, 1.0);

    vec2 screen0 = resolution * (0.5 * clip0.xy/clip0.w + 0.5);
    vec2 screen1 = resolution * (0.5 * clip1.xy/clip1.w + 0.5);

    vec2 xBasis = normalize(screen1 - screen0);
    vec2 yBasis = vec2(-xBasis.y, xBasis.x);

    // half a pixel wider than the line on each side, for the smoothed sides
    float across = (width + 1.0) * point.x;
    vec2 pt0 = screen0 + across * yBasis;
    vec2 pt1 = screen1 + across * yBasis;

    vec2 pt = mix(pt0, pt1, point.y);
    vec4 clip = mix(clip0, clip1, point.y);

    gl_Position = vec4(clip.w * (2.0 * pt/resolution - 1.0), clip.z, clip.w);
    if (lit < 0.5) c.a *= fogOf(clip.w);
    vColor = c;
    vAcross = across;
  }`;

const EDGE_FRAGMENT = `
  precision highp float;
  uniform float width;
  varying vec4 vColor;
  varying float vAcross;
  void main() {
    // the part of this pixel (one unit wide, centered here) that the line covers
    float coverage = clamp(0.5 * width + 0.5 - abs(vAcross), 0.0, 1.0);
    gl_FragColor = vec4(vColor.rgb, vColor.a * coverage);
  }`;

const POSITION_UNIFORMS = ['modelViewProjection', 'positions', 'positionsSize'];

// Two triangles of a quad
const NODE_QUAD = new Float32Array([-0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, -0.5]);
const EDGE_QUAD = new Float32Array([-0.5, 0, -0.5, 1, 0.5, 1, -0.5, 0, 0.5, 1, 0.5, 0]);

/**
 * Draws `nodes.count` nodes: buffers `nodes.rows`, `nodes.sizes`, `nodes.colors`, one entry each.
 * `style` holds the uniforms of flagged nodes (see index.js), `pass` is 0 or 1 (see above).
 *
 * With depth (`positions.hasDepth`, a layout in 3D or more) nodes are drawn in two passes: first
 * their solid insides, which write depth, then their smoothed edges, which are tested against
 * depth but don't write it. An edge then blends over whatever is behind it and is hidden by
 * whatever is in front, in any drawing order. In 2D every node is at depth 0 and one pass draws
 * them in order.
 */
function createNodeProgram(gl, instancing) {
  let info = createProgram(gl, NODE_VERTEX, NODE_FRAGMENT, ['point', 'row', 'size', 'color', 'room'], POSITION_UNIFORMS.concat([
    'part', 'pass', 'resolution', 'pointedColor', 'pointedSize', 'selectedColor', 'selectedSize', 'dimAlpha', 'minSize', 'baseSize', 'fog', 'pointedRing', 'selectedRing', 'focusedRing', 'ringHalo', 'ringSize'
  ]));
  let quad = createBuffer(gl, NODE_QUAD);
  let a = info.attributes, u = info.uniforms;

  return {
    draw(nodes, positions, modelViewProjection, drawContext, style, pass) {
      if (!nodes.count) return;
      gl.useProgram(info.program);
      setPositionUniforms(gl, u, positions, modelViewProjection);
      gl.uniform1f(u.pass, pass);
      gl.uniform2f(u.resolution, drawContext.width, drawContext.height);
      gl.uniform4fv(u.pointedColor, style.pointedColor);
      gl.uniform2fv(u.pointedSize, style.pointedSize);
      gl.uniform4fv(u.selectedColor, style.selectedColor);
      gl.uniform2fv(u.selectedSize, style.selectedSize);
      gl.uniform1f(u.dimAlpha, style.dimAlpha);
      gl.uniform1f(u.minSize, style.minSize || 0);
      gl.uniform4fv(u.pointedRing, style.pointedRing);
      gl.uniform4fv(u.selectedRing, style.selectedRing);
      gl.uniform4fv(u.focusedRing, style.focusedRing);
      gl.uniform4fv(u.ringHalo, style.ringHalo);
      gl.uniform2fv(u.ringSize, style.ringSize);
      gl.uniform1f(u.baseSize, style.baseSize || 1);
      gl.uniform3fv(u.fog, style.fog);
      bindAttribute(gl, instancing, a.point, quad, 2, gl.FLOAT, false, 0);
      bindAttribute(gl, instancing, a.row, nodes.rows, 1, gl.FLOAT, false, 1);
      bindAttribute(gl, instancing, a.size, nodes.sizes, 1, gl.FLOAT, false, 1);
      bindAttribute(gl, instancing, a.color, nodes.colors, 4, gl.UNSIGNED_BYTE, true, 1);
      // Nodes without a room buffer (those drawn on top) have no cap: one value for all
      if (nodes.rooms) bindAttribute(gl, instancing, a.room, nodes.rooms, 1, gl.FLOAT, false, 1);
      else {
        gl.disableVertexAttribArray(a.room);
        gl.vertexAttrib1f(a.room, 0);
      }
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      if (positions.hasDepth) {
        gl.uniform1f(u.part, 1);
        instancing.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, nodes.count);
        gl.depthMask(false);
        gl.uniform1f(u.part, 2);
        instancing.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, nodes.count);
        gl.depthMask(true);
      } else {
        gl.uniform1f(u.part, 0);
        instancing.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, nodes.count);
      }
      gl.disable(gl.DEPTH_TEST);
      [a.point, a.row, a.size, a.color].forEach(location => unbindAttribute(gl, instancing, location));
      if (nodes.rooms) unbindAttribute(gl, instancing, a.room);
    },
    dispose() {
      gl.deleteBuffer(quad);
      gl.deleteProgram(info.program);
    }
  };
}

/**
 * Draws `edges.count` edges, `width` pixels wide: buffers `edges.ends` (two rows per edge) and
 * `edges.colors`. `style.litAlpha` and `style.dimAlpha` style links by the flags of their ends.
 */
function createEdgeProgram(gl, instancing) {
  let info = createProgram(gl, EDGE_VERTEX, EDGE_FRAGMENT, ['point', 'ends', 'color'], POSITION_UNIFORMS.concat([
    'width', 'resolution', 'pass', 'litAlpha', 'litColor', 'dimAlpha', 'fog'
  ]));
  let quad = createBuffer(gl, EDGE_QUAD);
  let a = info.attributes, u = info.uniforms;

  return {
    draw(edges, positions, modelViewProjection, drawContext, style, pass) {
      if (!edges.count) return;
      gl.useProgram(info.program);
      setPositionUniforms(gl, u, positions, modelViewProjection);
      gl.uniform1f(u.pass, pass);
      gl.uniform1f(u.litAlpha, style.litAlpha);
      gl.uniform4fv(u.litColor, style.litColor);
      gl.uniform1f(u.dimAlpha, style.dimAlpha);
      gl.uniform3fv(u.fog, style.fog);
      gl.uniform1f(u.width, edges.width);
      gl.uniform2f(u.resolution, drawContext.width, drawContext.height);
      bindAttribute(gl, instancing, a.point, quad, 2, gl.FLOAT, false, 0);
      bindAttribute(gl, instancing, a.ends, edges.ends, 2, gl.FLOAT, false, 1);
      bindAttribute(gl, instancing, a.color, edges.colors, 4, gl.UNSIGNED_BYTE, true, 1);
      instancing.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, edges.count);
      [a.point, a.ends, a.color].forEach(location => unbindAttribute(gl, instancing, location));
    },
    dispose() {
      gl.deleteBuffer(quad);
      gl.deleteProgram(info.program);
    }
  };
}

function setPositionUniforms(gl, u, positions, modelViewProjection) {
  gl.uniformMatrix4fv(u.modelViewProjection, false, modelViewProjection);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, positions.texture);
  gl.uniform1i(u.positions, 0);
  gl.uniform2f(u.positionsSize, positions.width, positions.rows);
}

// Where the view keeps what it draws. Node `i` of the drawing is body `i` of the layout (row `i`
// of `simulator.store`), so positions go to the GPU in one pass over `store.pos`, and an edge is
// just the two rows it joins.

// Positions live in a float texture this many texels wide (a power of two, so the shaders can
// turn a row number into texture coordinates exactly); it grows by rows.
const TEXTURE_WIDTH = 2048;

/** Texture rows needed for `count` nodes (at least one, so an empty graph still has a texture) */
function textureRows(count) {
  return Math.max(1, Math.ceil(count / TEXTURE_WIDTH));
}

/**
 * Copies the first three axes of `n` bodies from `pos` (`D` numbers per body, as in
 * `simulator.store.pos`) into `out`, four floats per node: x, y, z (0 when D < 3), and a fourth
 * it doesn't touch (the view keeps node flags there). Axes after the third are not drawn.
 */
function packPositions(pos, D, n, out) {
  let i, j, o;
  if (D === 2) {
    for (i = 0, j = 0, o = 0; i < n; ++i, j += 2, o += 4) {
      out[o] = pos[j];
      out[o + 1] = pos[j + 1];
      out[o + 2] = 0;
    }
  } else if (D === 3) {
    for (i = 0, j = 0, o = 0; i < n; ++i, j += 3, o += 4) {
      out[o] = pos[j];
      out[o + 1] = pos[j + 1];
      out[o + 2] = pos[j + 2];
    }
  } else {
    let axes = Math.min(D, 3);
    for (i = 0, j = 0, o = 0; i < n; ++i, j += D, o += 4) {
      for (let k = 0; k < 3; ++k) out[o + k] = k < axes ? pos[j + k] : 0;
    }
  }
  return out;
}

/**
 * Node colors and sizes in body order. `color(node)` and `size(node)` give each node's values;
 * a color of 0 (or none) means `defaultColor`. Returns {colors: Uint32Array, sizes: Float32Array,
 * nodes, maxSize} with one entry per body: `nodes[row]` is the graph's node of that row, and
 * `maxSize` the largest size.
 */
function collectNodes(graph, layout, color, size, defaultColor) {
  let count = layout.simulator.store.n;
  let colors = new Uint32Array(count);
  let sizes = new Float32Array(count);
  let nodes = new Array(count);
  let maxSize = 0;
  graph.forEachNode(node => {
    let row = layout.getBody(node.id).index;
    colors[row] = (color && color(node)) || defaultColor;
    sizes[row] = size(node);
    nodes[row] = node;
    if (sizes[row] > maxSize) maxSize = sizes[row];
  });
  return {colors, sizes, nodes, maxSize};
}

/**
 * The rows each link joins, two floats per link in the order of `graph.forEachLink()`, and the
 * link colors. `color(link)` gives a link's color; 0 (or none) means `defaultColor`.
 */
function collectEdges(graph, layout, color, defaultColor) {
  let count = graph.getLinksCount();
  let ends = new Float32Array(count * 2);
  let colors = new Uint32Array(count);
  let k = 0;
  graph.forEachLink(link => {
    ends[2 * k] = layout.getBody(link.fromId).index;
    ends[2 * k + 1] = layout.getBody(link.toId).index;
    colors[k] = (color && color(link)) || defaultColor;
    k += 1;
  });
  // Links can be fewer than getLinksCount() says while a graph change is in flight
  return {ends: ends.subarray(0, 2 * k), colors: colors.subarray(0, k), count: k};
}

// Camera math for picking and dragging, in the coordinates of the view's element (the layout's
// coordinates) and in CSS pixels of the canvas. Matrices are column-major, as in WebGL and gl-matrix.

/** `out` = `a` × `b`. `out` must be neither of them. */
function multiply(out, a, b) {
  for (let c = 0; c < 4; ++c) {
    let b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
    for (let r = 0; r < 4; ++r) {
      out[c * 4 + r] = a[r] * b0 + a[4 + r] * b1 + a[8 + r] * b2 + a[12 + r] * b3;
    }
  }
  return out;
}

/** The inverse of `a` into `out`, or null when `a` has none */
function invert(out, a) {
  let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  let b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
  let b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
  let b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
  let b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return null;
  det = 1 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}

/**
 * Turns points of the scene into points of the canvas and back. `set()` takes the camera of a
 * frame: the projection and view matrices, the element's world model, and the canvas size in CSS
 * pixels. Screen points are CSS pixels from the canvas's top left corner.
 */
function createProjector() {
  let mvp = new Float64Array(16);
  let inverse = new Float64Array(16);
  let viewModel = new Float64Array(16);
  let width = 1, height = 1;
  // CSS pixels per unit of the scene at clip w = 1 (see pixelsPerUnit())
  let yScale = 1;
  let invertible = false;
  let near = [0, 0, 0], far = [0, 0, 0];

  let projector = {
    mvp,
    get width() { return width; },
    get height() { return height; },
    set(projection, view, model, cssWidth, cssHeight) {
      multiply(viewModel, view, model);
      multiply(mvp, projection, viewModel);
      invertible = invert(inverse, mvp) !== null;
      width = cssWidth || 1;
      height = cssHeight || 1;
      // How far clip y moves for one unit of the scene, in the direction where it moves most
      yScale = 0.5 * height * Math.hypot(mvp[1], mvp[5], mvp[9]);
      return projector;
    },

    /** A point of the scene on the canvas: `out.x`, `out.y` and its clip `out.w`; false behind the camera */
    toScreen(x, y, z, out) {
      let w = mvp[3] * x + mvp[7] * y + mvp[11] * z + mvp[15];
      if (!(w > 0)) return false;
      out.x = ((mvp[0] * x + mvp[4] * y + mvp[8] * z + mvp[12]) / w + 1) * 0.5 * width;
      out.y = (1 - (mvp[1] * x + mvp[5] * y + mvp[9] * z + mvp[13]) / w) * 0.5 * height;
      out.w = w;
      return true;
    },

    /** CSS pixels per unit of the scene, at a point whose clip w is `w` */
    pixelsPerUnit(w) {
      return yScale / w;
    },

    /**
     * The ray from the camera through a point of the canvas: `out.origin` and `out.direction`
     * (not normalized). False when the camera can't be inverted.
     */
    ray(sx, sy, out) {
      if (!invertible) return false;
      let nx = (sx / width) * 2 - 1;
      let ny = 1 - (sy / height) * 2;
      // The near plane, and a plane between it and infinity (w-gl's far plane is at infinity)
      if (!unproject(nx, ny, -1, near) || !unproject(nx, ny, 0, far)) return false;
      out.origin[0] = near[0]; out.origin[1] = near[1]; out.origin[2] = near[2];
      out.direction[0] = far[0] - near[0];
      out.direction[1] = far[1] - near[1];
      out.direction[2] = far[2] - near[2];
      return true;
    },

    /**
     * Where the ray through a canvas point meets the plane through `point` with `normal`, into
     * `out` ([x, y, z]). False when it misses (parallel, or behind the camera).
     */
    onPlane(sx, sy, point, normal, out) {
      let ray = scratchRay;
      if (!projector.ray(sx, sy, ray)) return false;
      let o = ray.origin, d = ray.direction;
      let denominator = d[0] * normal[0] + d[1] * normal[1] + d[2] * normal[2];
      if (Math.abs(denominator) < 1e-12) return false;
      let t = ((point[0] - o[0]) * normal[0] + (point[1] - o[1]) * normal[1] + (point[2] - o[2]) * normal[2]) / denominator;
      if (!(t > 0) || !Number.isFinite(t)) return false;
      out[0] = o[0] + t * d[0];
      out[1] = o[1] + t * d[1];
      out[2] = o[2] + t * d[2];
      return true;
    },

    /** The direction the camera looks in, through the middle of the canvas, into `out` (unit length) */
    forward(out) {
      let ray = scratchRay;
      if (!projector.ray(width / 2, height / 2, ray)) return false;
      let d = ray.direction, length = Math.hypot(d[0], d[1], d[2]);
      if (!length) return false;
      out[0] = d[0] / length; out[1] = d[1] / length; out[2] = d[2] / length;
      return true;
    }
  };
  let scratchRay = {origin: [0, 0, 0], direction: [0, 0, 0]};
  return projector;

  function unproject(nx, ny, nz, out) {
    let m = inverse;
    let w = m[3] * nx + m[7] * ny + m[11] * nz + m[15];
    if (!w) return false;
    out[0] = (m[0] * nx + m[4] * ny + m[8] * nz + m[12]) / w;
    out[1] = (m[1] * nx + m[5] * ny + m[9] * nz + m[13]) / w;
    out[2] = (m[2] * nx + m[6] * ny + m[10] * nz + m[14]) / w;
    return true;
  }
}

const Z_NORMAL = [0, 0, 1];
const ORIGIN = [0, 0, 0];

// Which node is under a point of the canvas. Picking runs on the CPU, from the layout's own
// positions, and only when someone asks (a press, a hover module, a selection box).
//
// It works as a bubble cursor with a capped reach: a point inside a node's disc picks that node;
// otherwise the node whose disc edge is nearest wins, if it is within `reach` pixels. Overlapping
// discs go to the node drawn last in 2D, and to the nearest one in 3D. The result also says how
// clearly it won (`gap`): how much farther the next node is.
//
// A disc is the one drawn: at least `minPixels` wide (wider for larger nodes, by the square root
// of their size, as the node shader draws them), and no wider than its room where nodes crowd.
// So the dot that shows is the dot that picks, at any zoom.
//
// In 2D the point becomes a point of the scene and the positions are scanned there, with no
// projection (0.1 ms at 100k nodes, 0.9 ms at 1M on an M4 Max). Only the few nodes near it are
// projected, to measure them in pixels. In 3D every node is projected (0.6 ms at 100k, 5 ms at 1M).

const onScreen = {x: 0, y: 0, w: 0};
const planePoint = [0, 0, 0], stepX = [0, 0, 0], stepY = [0, 0, 0];

/**
 * `state`:
 * - `pos`, `D`: the layout's `store.pos`, `D` numbers per row;
 * - `count`: rows to look at;
 * - `sizes`: diameter of each row's disc in scene units, and `maxSize` the largest of them;
 * - `projector`: the camera of this frame (see math.js);
 * - optional, as the view draws the discs: `minPixels` (the smallest drawn diameter in pixels),
 *   `baseSize` (the size drawn `minPixels` wide; larger sizes grow by the square root) and
 *   `rooms` (each row's largest diameter in scene units where nodes crowd; 0: no limit).
 *
 * `sx`, `sy`: the point, in CSS pixels of the canvas. `reach`: pixels from a disc's edge within
 * which a node still counts. Row `sticky` (the hovered node, or -1) gets `bonus` more pixels.
 * Nodes up to `margin` pixels beyond the reach are looked at too, to measure the gap.
 *
 * Returns {row, distance, inside, covers, x, y, radius, gap} or null: `distance` is in pixels
 * from the disc's edge (0 inside), `covers` how many discs the point is inside, `x`, `y` and
 * `radius` are the disc on the canvas, and `gap` is how many pixels farther the next nearest node
 * is (Infinity: none within reach + margin). The gap ignores the bonus: being hovered helps a
 * node win, not look clearly nearer, so a press decides the same for a mouse that hovers and a
 * finger that doesn't. It is negative when the bonus won over a nearer node.
 */
function pickNode(state, sx, sy, reach, sticky = -1, bonus = 0, margin = 0) {
  let best = {
    row: -1, inside: false, covers: 0, score: Infinity, distance: 0, x: 0, y: 0, w: 0, radius: 0,
    // The two nearest disc edges seen (no bonus), for the gap
    near1: Infinity, near1Row: -1, near2: Infinity
  };
  let around = reach + bonus + margin;
  let flat = state.D < 3;
  if (!flat || !scanPlane(state, sx, sy, reach, around, sticky, bonus, best)) {
    scanAll(state, sx, sy, reach, around, sticky, bonus, best, !flat);
  }
  if (best.row < 0) return null;
  let next = best.near1Row === best.row ? best.near2 : best.near1;
  return {
    row: best.row, distance: best.distance, inside: best.inside, covers: best.covers,
    x: best.x, y: best.y, radius: best.radius, gap: next - best.distance
  };
}

/**
 * Rows whose disc touches the rectangle between two canvas points (CSS pixels), for a selection box
 */
function nodesInRect(state, x0, y0, x1, y1) {
  let left = Math.min(x0, x1), right = Math.max(x0, x1);
  let top = Math.min(y0, y1), bottom = Math.max(y0, y1);
  let {pos, D, count, projector} = state;
  let rows = [];
  for (let i = 0, j = 0; i < count; ++i, j += D) {
    if (!projector.toScreen(pos[j], D > 1 ? pos[j + 1] : 0, D > 2 ? pos[j + 2] : 0, onScreen)) continue;
    let radius = discRadius(state, i, projector.pixelsPerUnit(onScreen.w));
    let dx = onScreen.x < left ? left - onScreen.x : (onScreen.x > right ? onScreen.x - right : 0);
    let dy = onScreen.y < top ? top - onScreen.y : (onScreen.y > bottom ? onScreen.y - bottom : 0);
    if (dx * dx + dy * dy <= radius * radius) rows.push(i);
  }
  return rows;
}

/**
 * Every row's place on the canvas: {x, y, radius, onScreen, width, height}, with x and y in CSS
 * pixels (NaN behind the camera), the disc's radius in pixels, and onScreen 1 for rows in front of
 * the camera and inside the canvas.
 */
function projectAll(state) {
  let {pos, D, count, projector, sizes} = state;
  let m = projector.mvp, width = projector.width, height = projector.height;
  // NaN: behind the camera
  let xs = new Float32Array(count).fill(NaN), ys = new Float32Array(count).fill(NaN), visible = new Uint8Array(count);
  let radius = new Float32Array(count);
  for (let i = 0, j = 0; i < count; ++i, j += D) {
    let x = pos[j], y = D > 1 ? pos[j + 1] : 0, z = D > 2 ? pos[j + 2] : 0;
    let w = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (!(w > 0)) continue;
    let px = ((m[0] * x + m[4] * y + m[8] * z + m[12]) / w + 1) * 0.5 * width;
    let py = (1 - (m[1] * x + m[5] * y + m[9] * z + m[13]) / w) * 0.5 * height;
    xs[i] = px;
    ys[i] = py;
    radius[i] = sizes ? sizes[i] * 0.5 * projector.pixelsPerUnit(w) : 0;
    visible[i] = px >= 0 && py >= 0 && px <= width && py <= height ? 1 : 0;
  }
  return {x: xs, y: ys, radius, onScreen: visible, width, height};
}

// 2D: scan in the plane z = 0. Returns false when the camera can't map pixels to that plane well
// enough (then every node is projected instead).
function scanPlane(state, sx, sy, reach, around, sticky, bonus, best) {
  let projector = state.projector;
  // Looking away from the plane: nothing is under the point
  if (!projector.onPlane(sx, sy, ORIGIN, Z_NORMAL, planePoint)) return true;
  if (!projector.onPlane(sx + 1, sy, ORIGIN, Z_NORMAL, stepX) ||
      !projector.onPlane(sx, sy + 1, ORIGIN, Z_NORMAL, stepY)) return false;
  // Units of the scene per pixel near the point, with room for a tilted camera
  let unitsPerPixel = 1.25 * Math.max(distance3(planePoint, stepX), distance3(planePoint, stepY));
  if (!Number.isFinite(unitsPerPixel)) return false;

  let near = around * unitsPerPixel;
  // The widest a disc can be drawn here, in scene units (the room only makes discs smaller)
  let limit = near + Math.max(state.maxSize, minDiameter(state, state.maxSize) * unitsPerPixel) * 0.5;
  let {pos, D, count, sizes} = state;
  let cx = planePoint[0], cy = planePoint[1];
  for (let i = 0, j = 0; i < count; ++i, j += D) {
    let dx = pos[j] - cx;
    if (dx > limit || dx < -limit) continue;
    let y = D > 1 ? pos[j + 1] : 0;
    let dy = y - cy;
    if (dy > limit || dy < -limit) continue;
    let within = near + Math.max(sizes[i], minDiameter(state, sizes[i]) * unitsPerPixel) * 0.5;
    if (dx * dx + dy * dy > within * within) continue;
    if (!projector.toScreen(pos[j], y, 0, onScreen)) continue;
    rank(best, i, discRadius(state, i, projector.pixelsPerUnit(onScreen.w)), sx, sy, reach, sticky, bonus, false);
  }
  return true;
}

function scanAll(state, sx, sy, reach, around, sticky, bonus, best, depth) {
  let {pos, D, count, projector} = state;
  let m = projector.mvp, width = projector.width, height = projector.height;
  let far = around;
  for (let i = 0, j = 0; i < count; ++i, j += D) {
    let x = pos[j], y = D > 1 ? pos[j + 1] : 0, z = D > 2 ? pos[j + 2] : 0;
    let w = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (!(w > 0)) continue;
    let px = ((m[0] * x + m[4] * y + m[8] * z + m[12]) / w + 1) * 0.5 * width;
    let radius = discRadius(state, i, projector.pixelsPerUnit(w));
    let limit = far + radius;
    if (px - sx > limit || sx - px > limit) continue;
    let py = (1 - (m[1] * x + m[5] * y + m[9] * z + m[13]) / w) * 0.5 * height;
    if (py - sy > limit || sy - py > limit) continue;
    onScreen.x = px; onScreen.y = py; onScreen.w = w;
    rank(best, i, radius, sx, sy, reach, sticky, bonus, depth);
  }
}

// Keeps the better of `best` and the row at `onScreen`
function rank(best, row, radius, sx, sy, reach, sticky, bonus, depth) {
  let distance = Math.hypot(onScreen.x - sx, onScreen.y - sy) - radius;
  let edge = Math.max(distance, 0);
  let own = edge - (row === sticky ? bonus : 0);
  if (edge < best.near1) {
    best.near2 = best.near1;
    best.near1 = edge;
    best.near1Row = row;
  } else if (edge < best.near2) {
    best.near2 = edge;
  }
  if (distance <= 0) {
    best.covers += 1;
    if (best.inside) {
      // Inside several discs: the hovered one, then the one on top
      if (best.row === sticky) return;
      if (row !== sticky && (depth ? onScreen.w >= best.w : row < best.row)) return;
    }
    best.inside = true;
    best.score = -Infinity;
    keep(best, row, 0, radius);
    return;
  }
  if (best.inside) return;
  if (own > reach || own >= best.score) return;
  best.score = own;
  keep(best, row, distance, radius);
}

function keep(best, row, distance, radius) {
  best.row = row;
  best.distance = distance;
  best.x = onScreen.x;
  best.y = onScreen.y;
  best.w = onScreen.w;
  best.radius = radius;
}

/**
 * The radius in pixels of row `row`'s disc as drawn, `pixelsPerUnit` where it is: its size, at
 * least the smallest drawn diameter (grown by the square root of its size), at most its room.
 * Flags (hovered, selected) draw it larger still; picking doesn't count that.
 */
function discRadius(state, row, pixelsPerUnit) {
  let size = state.sizes[row];
  let diameter = Math.max(size * pixelsPerUnit, minDiameter(state, size));
  let rooms = state.rooms;
  if (rooms && rooms[row] > 0) diameter = Math.min(diameter, rooms[row] * pixelsPerUnit);
  return diameter * 0.5;
}

// The smallest diameter in pixels the view draws a node of `size` at (the node shader's rule)
function minDiameter(state, size) {
  let min = state.minPixels;
  return min > 0 ? min * Math.sqrt(Math.max(size / (state.baseSize || 1), 1)) : 0;
}

function distance3(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

// Per-node state that the view draws: one byte per node, written into the unused fourth float of
// the positions texture, so nodes and links read it with the same fetch as their position. Links
// read the flags of both ends, so lighting up a selected node's links costs no JavaScript per link.

const HOVERED = 1;
const SELECTED = 2;
const DRAGGED = 4;
const FOCUSED = 8;
/** Set by the view on nodes linked to a selected node */
const NEIGHBOR = 16;
/** Free for modules: not styled by the view */
const CUSTOM_1 = 32;
const CUSTOM_2 = 64;
/** The view's own: this node, and the links that touch it, are drawn again after everything else */
const ON_TOP = 128;

const SETTABLE = HOVERED | SELECTED | DRAGGED | FOCUSED | CUSTOM_1 | CUSTOM_2;
const ALWAYS_ON_TOP = HOVERED | DRAGGED | FOCUSED;

/**
 * Flags by node id. `onChange()` is called after every change. Ids stay until cleared, also when
 * their node leaves the graph (see `drop()`).
 */
function createFlags(onChange) {
  let byId = new Map();
  let counts = new Map();

  return {
    /** Sets (`on` true) or clears the bits of `bit` on node `id`; true if something changed */
    set(id, bit, on) {
      bit &= SETTABLE;
      let old = byId.get(id) || 0;
      let next = on ? (old | bit) : (old & ~bit);
      if (next === old) return false;
      if (next) byId.set(id, next); else byId.delete(id);
      count(old, -1);
      count(next, 1);
      onChange();
      return true;
    },
    /** All bits of node `id` (0 if none) */
    get(id) {
      return byId.get(id) || 0;
    },
    has(id, bit) {
      return ((byId.get(id) || 0) & bit) !== 0;
    },
    /** Clears `bit` on every node */
    clear(bit) {
      let changed = false;
      byId.forEach((bits, id) => {
        if (!(bits & bit)) return;
        let next = bits & ~bit;
        if (next) byId.set(id, next); else byId.delete(id);
        count(bits, -1);
        count(next, 1);
        changed = true;
      });
      if (changed) onChange();
      return changed;
    },
    /** Ids of the nodes that have `bit` */
    ids(bit) {
      let ids = [];
      byId.forEach((bits, id) => { if (bits & bit) ids.push(id); });
      return ids;
    },
    /** How many nodes have `bit` (a single bit) */
    count(bit) {
      return counts.get(bit) || 0;
    },
    forEach(callback) {
      byId.forEach((bits, id) => callback(id, bits));
    },
    /** Forgets node `id`, e.g. when it left the graph */
    drop(id) {
      let old = byId.get(id);
      if (!old) return;
      byId.delete(id);
      count(old, -1);
      onChange();
    }
  };

  function count(bits, change) {
    for (let bit = 1; bit <= 64; bit <<= 1) {
      if (bits & bit) counts.set(bit, (counts.get(bit) || 0) + change);
    }
  }
}

/**
 * The flag of every row, ready to draw: writes `rowBits` (one byte per row) and says which rows
 * and links are drawn again on top.
 *
 * - `rowOf(id)`: the row of a node, or -1 when it has none;
 * - `previousRows`: rows written last time (cleared first);
 * - `limits.nodes`, `limits.links`: selected nodes are drawn on top only while there are at most
 *   this many of them, with at most this many links between them (a highlight of half the graph
 *   would just draw it twice; dimming the rest already shows it).
 *
 * Returns {rows, topNodes, topLinks}: the rows written, the rows drawn on top (selected first,
 * hovered last, so it is the topmost), and the links drawn on top, each once.
 */
function layoutFlags(flags, graph, rowOf, rowBits, previousRows, limits) {
  for (let i = 0; i < previousRows.length; ++i) rowBits[previousRows[i]] = 0;
  let rows = [];
  let selectedOnTop = flags.count(SELECTED) <= limits.nodes;
  if (selectedOnTop) {
    let links = 0;
    flags.forEach((id, bits) => {
      if (bits & SELECTED) links += degree(graph.getNode(id));
    });
    selectedOnTop = links <= limits.links;
  }

  // Selected first, hovered last: the order they are drawn on top in. Each holds [row, id] pairs.
  let buckets = [[], [], [], []];
  flags.forEach((id, bits) => {
    let row = rowOf(id);
    if (row < 0) return;
    if ((bits & ALWAYS_ON_TOP) || ((bits & SELECTED) && selectedOnTop)) {
      buckets[bits & HOVERED ? 3 : bits & DRAGGED ? 2 : bits & FOCUSED ? 1 : 0].push(row, id);
      bits |= ON_TOP;
    }
    rowBits[row] = bits;
    rows.push(row);
  });

  if (flags.count(SELECTED)) {
    flags.forEach((id, bits) => {
      if (!(bits & SELECTED)) return;
      graph.forEachLinkedNode(id, other => {
        let row = rowOf(other.id);
        if (row < 0) return;
        if (!rowBits[row]) rows.push(row);
        rowBits[row] |= NEIGHBOR;
      });
    });
  }

  let pairs = buckets[0].concat(buckets[1], buckets[2], buckets[3]);
  let topNodes = [];
  let topLinks = [];
  for (let i = 0; i < pairs.length; i += 2) {
    let row = pairs[i];
    topNodes.push(row);
    graph.forEachLinkedNode(pairs[i + 1], (other, link) => {
      let otherRow = rowOf(other.id);
      if (otherRow < 0) return;
      // A link between two nodes on top: once, from the end with the larger row
      if ((rowBits[otherRow] & ON_TOP) && otherRow < row) return;
      if (otherRow === row && topLinks.length && topLinks[topLinks.length - 1] === link) return;
      topLinks.push(link);
    });
  }
  return {rows, topNodes, topLinks};
}

function degree(node) {
  if (!node || !node.links) return 0;
  return node.links.size !== undefined ? node.links.size : node.links.length;
}

var FLAGS = /*#__PURE__*/Object.freeze({
  __proto__: null,
  CUSTOM_1: CUSTOM_1,
  CUSTOM_2: CUSTOM_2,
  DRAGGED: DRAGGED,
  FOCUSED: FOCUSED,
  HOVERED: HOVERED,
  NEIGHBOR: NEIGHBOR,
  ON_TOP: ON_TOP,
  SELECTED: SELECTED,
  createFlags: createFlags,
  layoutFlags: layoutFlags
});

// Pointer, wheel and key input on the view's canvas, shared by the camera and the modules.
//
// Every pointer has one owner, decided when it goes down: handlers are asked in priority order
// (lower first) whether they want it, with the node under it at hand; the camera, last, takes the
// rest. So one finger can drag a node while two others move the camera.
//
// Everything is Pointer Events, and every rule follows the `pointerType` of the event at hand,
// not the kind of device: on a laptop with a touch screen, or a tablet with a pen and a mouse,
// each pointer behaves as what it is.
//
// A press stays undecided until it moves past a small distance (then the owner gets dragstart,
// drag, dragend) or lifts (then it is a tap, offered to everyone). A long press of a finger or a
// pen (`longPressFor`; a mouse has Shift and its other buttons) is offered to everyone while the
// press is undecided; a handler that takes it becomes the owner. Taps fire on release, at once: a
// double tap doesn't make single taps wait.
//
// Two fingers always pinch: a finger that lands while another is down goes to the camera, and so
// does the other finger, wherever they landed (on a node or not). A finger that holds something
// (its owner has suspend(), as the drag has) and has been down for `pinchTime` keeps it: the
// camera borrows the finger for the pinch (its owner gets suspend(p)), and gives it back when the
// camera's own fingers have lifted (resume(p)); the press then counts from where the finger is.
// Any other finger's gesture ends: its owner gets cancel(). So two fingers that land together are
// a pinch, also on a node.
//
// A handler is an object with any of:
//   priority          lower is asked first (default 100; the camera is last)
//   press(p)          claim pointer `p`? Must not change anything: it is also asked for the cursor
//   down(p)           the claimed pointer went down
//   dragstart(p)      `p` moved past the drag distance; return false to pass it on to the next handler
//   drag(p), dragend(p)
//   up(p)             `p` lifted before it moved (a tap may follow)
//   cancel(p)         the gesture is over without an end: pointercancel, lost capture, blur, Escape...
//   longpress(p)      return true to take `p` (the previous owner gets cancel)
//   suspend(p), resume(p)   the camera borrows `p` for a pinch, and gives it back
//   tap(e), doubletap(e), contextmenu(e), twofingertap(e)   return true to stop the others
//   hover(point)      a mouse or pen moved with no button down (null: it left)
//   wheel(w), key(e), keyup(e), blur()
//   cursor            the cursor to show where this handler would claim a press

const PENDING = 0, DRAGGING = 1, CANCELLED = 2, DONE = 3;

const DEFAULTS$7 = {
  // Pixels a press moves before it is a drag
  dragDistance: {mouse: 3, pen: 6, touch: 10},
  doubleTapTime: 300,
  doubleTapDistance: {mouse: 10, pen: 30, touch: 30},
  longPressTime: 500,
  // Pointers that long-press: a mouse has Shift and its other buttons instead, and a slow click
  // is a click
  longPressFor: {mouse: false, pen: true, touch: true},
  twoFingerTapTime: 400,
  // A finger that has been down for less than this (ms) when another one lands joins the pinch,
  // and what it held is let go; one down longer keeps holding it through the pinch
  pinchTime: 250
};

/**
 * `canvas`: the element to listen on.
 * `options`:
 * - `pick(x, y, pointer)`: the hit under a canvas point (CSS pixels), or null;
 * - `emit(name, event)`: give an event to the app's listeners first;
 * - `hasListeners(name)`: whether the app listens to `name`;
 * - `scenePoint(x, y)`: the point of the scene under a canvas point;
 * - `onPress()`: a pointer or the wheel started (the camera stops its inertia);
 * - `settings`: thresholds (DEFAULTS above);
 * - `env`: {window, document, now, setTimeout, clearTimeout} for tests.
 */
function createInput(canvas, options) {
  let env = options.env || defaultEnv();
  let settings = mergeSettings(options.settings);
  let handlers = [];
  let pointers = new Map();
  let lastTap = null;
  // Pointers pressed together: none of them taps, two quick touches are a two-finger tap
  let group = null;
  let hover = null;
  let sequence = 0;

  let savedStyle = prepareCanvas(canvas);
  let addedTabIndex = false;
  if (canvas.setAttribute && !canvas.hasAttribute('tabindex')) {
    canvas.setAttribute('tabindex', '0');
    addedTabIndex = true;
  }

  let listeners = [
    [canvas, 'pointerdown', onPointerDown],
    [canvas, 'pointermove', onPointerMove],
    [canvas, 'pointerup', onPointerUp],
    [canvas, 'pointercancel', onPointerCancel],
    [canvas, 'lostpointercapture', onPointerCancel],
    [canvas, 'pointerleave', onPointerLeave],
    [canvas, 'wheel', onWheel, {passive: false}],
    [canvas, 'contextmenu', preventDefault],
    // Safari's own pinch zoom of the page
    [canvas, 'gesturestart', preventDefault],
    [canvas, 'keydown', onKeyDown],
    [canvas, 'keyup', onKeyUp],
    [canvas, 'blur', onBlur],
    [env.window, 'blur', onWindowBlur],
    [env.document, 'visibilitychange', onVisibilityChange]
  ];
  listeners.forEach(([target, name, fn, opts]) => target && target.addEventListener(name, fn, opts));

  return {
    add,
    remove,
    cancel,
    cancelAll,
    /** True while any pointer drags (a node, the camera, a box...) */
    dragging() {
      for (let p of pointers.values()) if (p.state === DRAGGING) return true;
      return false;
    },
    /** True while any pointer is down */
    busy: () => pointers.size > 0,
    /** The last mouse or pen position with no button down, or null */
    hoverPoint: () => hover,
    /**
     * A tap that came from somewhere else than a pointer (a key): the app's listeners, then the
     * handlers, see it like any tap. `hit` is {node, row, ...}.
     */
    tap(hit, fields) {
      let e = new ViewEvent('tap', hit, fields);
      return dispatch('tap', e, true);
    },
    /** The first handler (not the camera) that would claim a press like `p`, or null */
    claimant(p) {
      for (let h of handlers) {
        if (h.priority === Infinity) continue;
        if (h.press && h.press(p)) return h;
      }
      return null;
    },
    settings,
    dispose
  };

  function add(handler) {
    if (!handler || typeof handler !== 'object') throw new Error('input.add() needs a handler object');
    if (handler.priority === undefined) handler.priority = 100;
    handler.order = sequence++;
    handlers.push(handler);
    handlers.sort((a, b) => (a.priority - b.priority) || (a.order - b.order));
    return () => remove(handler);
  }

  function remove(handler) {
    let index = handlers.indexOf(handler);
    if (index < 0) return;
    // Its pointers end here
    pointers.forEach(p => {
      if (p.owner !== handler) return;
      unlend(p);
      if (p.state === PENDING || p.state === DRAGGING) call(handler, 'cancel', p);
      p.owner = null;
      p.state = CANCELLED;
    });
    handlers.splice(index, 1);
  }

  /** Ends the gesture of a pointer: its owner gets cancel(), and the pointer is ignored until it lifts */
  function cancel(pointerId) {
    let p = pointers.get(pointerId);
    if (!p || p.state === CANCELLED) return;
    clearLongPress(p);
    unlend(p);
    let owner = p.owner;
    p.state = CANCELLED;
    if (group) group.cancelled = true;
    if (owner) call(owner, 'cancel', p);
    if (owner && owner === cameraHandler()) giveBack();
  }

  function cancelAll() {
    Array.from(pointers.keys()).forEach(cancel);
  }

  function onPointerDown(e) {
    // Another button of a mouse that is already down, or the back and forward buttons
    if (pointers.has(e.pointerId) || e.button > 2) return;
    if (options.onPress) options.onPress();
    if (e.isTrusted && canvas.setPointerCapture) {
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* the pointer is gone already */ }
    }
    if (canvas.focus && env.document && env.document.activeElement !== canvas) {
      // A press is not keyboard focus: no focus ring (browsers that ignore focusVisible decide themselves)
      canvas.focus({preventScroll: true, focusVisible: false});
    }

    let p = new Pointer(e, local(e), env.now(), options.pick);
    if (!pointers.size || !group) group = {start: p.downTime, count: 0, touch: true, moved: false, cancelled: false, x: 0, y: 0, clientX: 0, clientY: 0};
    if (pointers.size) {
      p.multi = true;
      pointers.forEach(q => { q.multi = true; clearLongPress(q); });
    }
    group.count += 1;
    group.x += p.downX; group.y += p.downY;
    group.clientX += p.downClientX; group.clientY += p.downClientY;
    if (p.pointerType !== 'touch') group.touch = false;
    pointers.set(p.id, p);

    if (!(p.multi && p.pointerType === 'touch' && pinch(p))) offer(p, 0);
    if (p.owner) call(p.owner, 'down', p);
    if (!p.multi && settings.longPressFor[p.pointerType] !== false && wantsLongPress()) {
      p.timer = env.setTimeout(() => longPress(p), settings.longPressTime);
    }
  }

  function onPointerMove(e) {
    let p = pointers.get(e.pointerId);
    if (!p) {
      if (e.pointerType !== 'touch' && !e.buttons) hoverAt(e);
      return;
    }
    if (p.state === CANCELLED) return;
    if (p.pointerType === 'mouse' && e.buttons === 0) {
      // The button went up where we couldn't see it (outside the window)
      finish(p, true);
      return;
    }
    p.update(e, local(e));
    if (p.lent) {
      // Lent to the camera for a pinch: the camera moves with it, its owner waits
      if (group && Math.hypot(p.x - p.downX, p.y - p.downY) > distanceFor(settings.dragDistance, p.pointerType)) group.moved = true;
      let camera = cameraHandler();
      if (camera) call(camera, 'drag', p);
      return;
    }
    if (p.state === PENDING) {
      if (Math.hypot(p.x - p.downX, p.y - p.downY) > distanceFor(settings.dragDistance, p.pointerType)) {
        clearLongPress(p);
        if (group) group.moved = true;
        startDrag(p);
      }
    } else if (p.state === DRAGGING && p.owner) {
      call(p.owner, 'drag', p);
    }
  }

  function onPointerUp(e) {
    let p = pointers.get(e.pointerId);
    if (!p) return;
    if (p.state !== CANCELLED) p.update(e, local(e));
    finish(p, false);
    if (e.pointerType !== 'touch') hoverAt(e);
  }

  function onPointerCancel(e) {
    let p = pointers.get(e.pointerId);
    if (p) finish(p, true);
  }

  function onPointerLeave(e) {
    if (e.pointerType === 'touch' || pointers.has(e.pointerId)) return;
    setHover(null);
  }

  function finish(p, cancelled) {
    clearLongPress(p);
    pointers.delete(p.id);
    // A lent finger lifted: the camera lets go of it, and its owner sees it end as usual
    unlend(p);
    let owner = p.owner;
    if (p.state === DRAGGING) {
      if (owner) call(owner, cancelled ? 'cancel' : 'dragend', p);
    } else if (p.state === PENDING) {
      if (cancelled) {
        if (owner) call(owner, 'cancel', p);
      } else {
        if (owner) call(owner, 'up', p);
        if (!p.multi && !p.longPressed) tapped(p);
      }
    }
    if (cancelled && group) group.cancelled = true;
    p.state = DONE;
    if (owner && owner === cameraHandler()) giveBack();
    if (!pointers.size && group) {
      let g = group;
      group = null;
      if (g.count === 2 && g.touch && !g.moved && !g.cancelled && env.now() - g.start <= settings.twoFingerTapTime) {
        let e = new ViewEvent('twofingertap', null, {
          x: g.x / 2, y: g.y / 2, clientX: g.clientX / 2, clientY: g.clientY / 2,
          pointerType: 'touch', originalEvent: p.event
        });
        dispatch('twofingertap', e, false);
      }
    }
  }

  // Asks handlers from `from` on whether they want `p`
  function offer(p, from) {
    for (let i = from; i < handlers.length; ++i) {
      let h = handlers[i];
      if (h.press && h.press(p)) {
        p.owner = h;
        return true;
      }
    }
    p.owner = null;
    return false;
  }

  // Finger `p` landed while other touch fingers are down: the camera takes it and them, to pinch.
  // A finger that holds something (its owner can suspend) and has been down for `pinchTime` is
  // lent to the camera; any other ends its gesture (a node grabbed a moment ago goes back where it
  // was). True when the camera took `p`.
  function pinch(p) {
    let camera = cameraHandler();
    if (!camera) return false;
    let others = [];
    for (let q of pointers.values()) {
      if (q !== p && q.pointerType === 'touch' && q.state !== CANCELLED) others.push(q);
    }
    if (!others.length) return false;
    others.forEach(q => {
      if (q.owner === camera || q.lent) return;
      let owner = q.owner;
      clearLongPress(q);
      if (owner && owner.suspend && env.now() - q.downTime >= settings.pinchTime) {
        q.lent = true;
        call(owner, 'suspend', q);
      } else {
        if (owner) call(owner, 'cancel', q);
        q.owner = camera;
      }
      call(camera, 'down', q);
    });
    p.owner = camera;
    return true;
  }

  // Lets go of a finger the camera borrowed
  function unlend(p) {
    if (!p.lent) return;
    p.lent = false;
    let camera = cameraHandler();
    if (camera) call(camera, 'up', p);
  }

  // Once the camera's own fingers have all lifted, the fingers it borrowed go back to their owners,
  // and their press counts from where they are now
  function giveBack() {
    let camera = cameraHandler();
    for (let q of pointers.values()) {
      if (q.owner === camera && !q.lent && (q.state === PENDING || q.state === DRAGGING)) return;
    }
    pointers.forEach(q => {
      if (!q.lent) return;
      unlend(q);
      q.downX = q.x;
      q.downY = q.y;
      q.downClientX = q.clientX;
      q.downClientY = q.clientY;
      call(q.owner, 'resume', q);
    });
  }

  function cameraHandler() {
    return handlers.find(h => h.priority === Infinity) || null;
  }

  function startDrag(p) {
    p.state = DRAGGING;
    while (p.owner) {
      let owner = p.owner;
      if (!owner.dragstart || owner.dragstart(p) !== false) {
        // The owner sees the whole move since the press
        if (p.owner === owner && p.state === DRAGGING) call(owner, 'drag', p);
        return;
      }
      offer(p, handlers.indexOf(owner) + 1);
      if (p.owner) call(p.owner, 'down', p);
    }
  }

  function wantsLongPress() {
    if (options.hasListeners && options.hasListeners('longpress')) return true;
    return handlers.some(h => h.longpress);
  }

  function longPress(p) {
    p.timer = 0;
    if (p.state !== PENDING || p.multi || pointers.get(p.id) !== p) return;
    let e = makeEvent('longpress', p);
    let listened = options.hasListeners && options.hasListeners('longpress');
    if (options.emit) options.emit('longpress', e);
    if (e.defaultPrevented) {
      p.longPressed = true;
      return;
    }
    for (let h of handlers.slice()) {
      if (!h.longpress || !h.longpress(p)) continue;
      if (p.owner && p.owner !== h) call(p.owner, 'cancel', p);
      p.owner = h;
      p.longPressed = true;
      return;
    }
    // Someone saw it: the release is not a tap
    if (listened) p.longPressed = true;
  }

  function clearLongPress(p) {
    if (!p.timer) return;
    env.clearTimeout(p.timer);
    p.timer = 0;
  }

  function tapped(p) {
    if (p.button === 1) return;
    if (p.button === 2) {
      dispatch('contextmenu', makeEvent('contextmenu', p), true);
      return;
    }
    let time = env.now();
    let near = lastTap && lastTap.pointerType === p.pointerType &&
      time - lastTap.time <= settings.doubleTapTime &&
      Math.hypot(p.downX - lastTap.x, p.downY - lastTap.y) <= distanceFor(settings.doubleTapDistance, p.pointerType);
    let count = near ? lastTap.count + 1 : 1;
    lastTap = {time, x: p.downX, y: p.downY, count, pointerType: p.pointerType};

    let tap = makeEvent('tap', p);
    tap.count = count;
    dispatch('tap', tap, true);
    if (count === 2) {
      let double = makeEvent('doubletap', p);
      double.count = 2;
      dispatch('doubletap', double, true);
    }
  }

  // The app's listeners first (they can prevent the rest), then handlers until one returns true
  function dispatch(name, e, toApp) {
    if (toApp && options.emit) options.emit(name, e);
    if (e.defaultPrevented) return e;
    for (let h of handlers.slice()) {
      if (h[name] && h[name](e) === true) break;
    }
    return e;
  }

  function makeEvent(type, p) {
    let hit = p.hit;
    return new ViewEvent(type, hit, {
      x: p.downX, y: p.downY, clientX: p.downClientX, clientY: p.downClientY,
      scene: options.scenePoint ? options.scenePoint(p.downX, p.downY) : null,
      pointerType: p.pointerType, pointerId: p.id, button: p.button,
      shiftKey: p.shiftKey, altKey: p.altKey, ctrlKey: p.ctrlKey, metaKey: p.metaKey,
      originalEvent: p.event
    });
  }

  function hoverAt(e) {
    if (e.pointerType === 'touch') return;
    let point = local(e);
    setHover({
      x: point.x, y: point.y, clientX: e.clientX, clientY: e.clientY,
      pointerType: e.pointerType || 'mouse', width: e.width || 1,
      shiftKey: e.shiftKey, altKey: e.altKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey,
      originalEvent: e
    });
  }

  function setHover(point) {
    if (!point && !hover) return;
    hover = point;
    for (let h of handlers.slice()) if (h.hover) h.hover(point);
  }

  function onWheel(e) {
    // Firefox turns line deltas into pixels only if the deltas are read first: read the mode first
    let mode = e.deltaMode;
    let scale = mode === 1 ? 25 : mode === 2 ? (canvas.clientHeight || 800) : 1;
    let point = local(e);
    e.preventDefault();
    if (options.onPress) options.onPress();
    let wheel = {
      deltaX: e.deltaX * scale, deltaY: e.deltaY * scale, deltaMode: mode,
      x: point.x, y: point.y, clientX: e.clientX, clientY: e.clientY,
      shiftKey: e.shiftKey, altKey: e.altKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey,
      originalEvent: e
    };
    for (let h of handlers.slice()) {
      if (h.wheel && h.wheel(wheel) === true) break;
    }
  }

  function onKeyDown(e) {
    if (e.isComposing || e.key === 'Tab') return;
    for (let h of handlers.slice()) {
      if (h.key && h.key(e) === true) {
        e.preventDefault();
        return;
      }
    }
  }

  function onKeyUp(e) {
    for (let h of handlers.slice()) if (h.keyup) h.keyup(e);
  }

  function onBlur() {
    for (let h of handlers.slice()) if (h.blur) h.blur();
  }

  function onWindowBlur() {
    cancelAll();
    onBlur();
  }

  function onVisibilityChange() {
    if (env.document.visibilityState === 'hidden') onWindowBlur();
  }

  function local(e) {
    let rect = canvas.getBoundingClientRect();
    return {x: e.clientX - rect.left, y: e.clientY - rect.top};
  }

  function dispose() {
    cancelAll();
    listeners.forEach(([target, name, fn, opts]) => target && target.removeEventListener(name, fn, opts));
    restoreCanvas(canvas, savedStyle);
    if (addedTabIndex) canvas.removeAttribute('tabindex');
    handlers = [];
    hover = null;
  }
}

/** An event for the app and the handlers. `node` is null on the background. */
class ViewEvent {
  constructor(type, hit, fields) {
    this.type = type;
    this.node = hit ? hit.node : null;
    this.id = hit ? hit.node.id : undefined;
    this.row = hit ? hit.row : -1;
    this.hit = hit || null;
    this.count = 1;
    this.defaultPrevented = false;
    Object.assign(this, fields);
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
}

class Pointer {
  constructor(e, point, time, pick) {
    this.id = e.pointerId;
    // From pointerdown: since Safari 18.2 later events of a touch may say 'mouse' (WebKit bug 282988)
    this.pointerType = e.pointerType || 'mouse';
    this.button = e.button;
    this.downX = this.x = point.x;
    this.downY = this.y = point.y;
    this.downClientX = this.clientX = e.clientX;
    this.downClientY = this.clientY = e.clientY;
    this.width = e.width || 1;
    this.height = e.height || 1;
    this.downTime = time;
    this.state = PENDING;
    this.owner = null;
    this.multi = false;
    this.longPressed = false;
    this.timer = 0;
    this.event = e;
    this.shiftKey = !!e.shiftKey;
    this.altKey = !!e.altKey;
    this.ctrlKey = !!e.ctrlKey;
    this.metaKey = !!e.metaKey;
    this._pick = pick;
    this._hit = undefined;
  }

  /** What is under the press (picked once, when first asked) */
  get hit() {
    if (this._hit === undefined) this._hit = (this._pick && this._pick(this.downX, this.downY, this)) || null;
    return this._hit;
  }

  get node() {
    let hit = this.hit;
    return hit ? hit.node : null;
  }

  get dragging() {
    return this.state === DRAGGING;
  }

  update(e, point) {
    this.x = point.x;
    this.y = point.y;
    this.clientX = e.clientX;
    this.clientY = e.clientY;
    this.shiftKey = !!e.shiftKey;
    this.altKey = !!e.altKey;
    this.ctrlKey = !!e.ctrlKey;
    this.metaKey = !!e.metaKey;
    this.event = e;
  }
}

function call(handler, name, p) {
  if (handler[name]) handler[name](p);
}

function distanceFor(table, pointerType) {
  return table[pointerType] !== undefined ? table[pointerType] : table.mouse;
}

function preventDefault(e) {
  e.preventDefault();
}

function mergeSettings(custom = {}) {
  let settings = {...DEFAULTS$7, ...custom};
  settings.dragDistance = {...DEFAULTS$7.dragDistance, ...(custom.dragDistance || {})};
  settings.doubleTapDistance = {...DEFAULTS$7.doubleTapDistance, ...(custom.doubleTapDistance || {})};
  settings.longPressFor = {...DEFAULTS$7.longPressFor, ...(custom.longPressFor || {})};
  return settings;
}

const CANVAS_STYLE = {
  // Read when a gesture starts, so it can't be set during a press
  touchAction: 'none',
  userSelect: 'none',
  webkitUserSelect: 'none',
  webkitTouchCallout: 'none',
  webkitTapHighlightColor: 'transparent'
};

function prepareCanvas(canvas) {
  let saved = {};
  if (!canvas.style) return saved;
  Object.keys(CANVAS_STYLE).forEach(name => {
    saved[name] = canvas.style[name];
    canvas.style[name] = CANVAS_STYLE[name];
  });
  return saved;
}

function restoreCanvas(canvas, saved) {
  if (!canvas.style) return;
  Object.keys(saved).forEach(name => { canvas.style[name] = saved[name] || ''; });
}

function defaultEnv() {
  return {
    window: typeof window !== 'undefined' ? window : null,
    document: typeof document !== 'undefined' ? document : null,
    now: () => performance.now(),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: handle => clearTimeout(handle)
  };
}

// The camera as an input handler: pointers nobody else claimed pan, zoom and rotate it, and so do
// the wheel and keys. The camera itself stays w-gl's map controls (its pan, zoom about a point,
// rotation and inertia); only their mouse, touch and keyboard listeners are replaced. The controls
// listen on a detached element, so they never see an event, and this handler drives them.
//
// A 2D view doesn't turn under the user's hands: a right or Alt drag pans it, and two fingers
// pinch and pan (the fit module may still turn it to the screen's shape). A 3D view rotates and
// tilts. Motion that only eases (a double tap's zoom, the glide after a fling) is skipped when
// the user prefers reduced motion.

const DEFAULTS$6 = {
  // 'auto': a mouse wheel zooms about the pointer, a trackpad's two-finger scroll pans (a scroll
  // that moves sideways), and a pinch zooms. 'zoom': every scroll zooms. 'pan': every scroll pans,
  // and a pinch or Cmd/Ctrl + wheel zooms.
  wheel: 'auto',
  // Rotation and tilt of a 3D view (where the scene allows rotation): right or Alt drag, two-finger
  // twist and tilt, Q E R F. 'always': a 2D view turns too. false: never.
  rotate: true,
  doubleTapZoom: true,
  twoFingerTapZoom: true,
  inertia: true,
  keys: true,
  // Pixels of arc two fingers turn before the camera rotates
  rotateArc: 25
};

const KEYS = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  Equal: 'in', NumpadAdd: 'in', '+': 'in', '=': 'in',
  Minus: 'out', NumpadSubtract: 'out', '-': 'out', '_': 'out',
  KeyQ: 'turnRight', KeyE: 'turnLeft',
  KeyR: 'tiltUp', KeyF: 'tiltDown'
};
const ROTATING = {turnRight: true, turnLeft: true, tiltUp: true, tiltDown: true};

// Events of one scroll gesture come less than this many ms apart
const SCROLL_GAP = 200;

/**
 * Takes over camera input of `scene`. Returns {handler, stop, dispose}: add `handler` to the
 * input, `stop()` stops the inertia, and `dispose()` gives the scene back its own controls.
 * `env`: {is3D() (whether the drawing has depth; default true), now(), reducedMotion(),
 * requestAnimationFrame, cancelAnimationFrame}, for the view and for tests.
 */
function createCamera(scene, options = {}, env = {}) {
  let settings = {...DEFAULTS$6, ...options};
  let raf = env.requestAnimationFrame || (fn => requestAnimationFrame(fn));
  let cancelRaf = env.cancelAnimationFrame || (handle => cancelAnimationFrame(handle));
  let detached = document.createElement('div');
  let proxy = Object.create(scene);
  proxy.getOptions = () => Object.assign({}, scene.getOptions(), {inputTarget: detached});
  let controls = install(scene, proxy);

  let is3D = env.is3D || (() => true);
  let now = env.now || (() => performance.now());
  let reducedMotion = env.reducedMotion || (() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  // The user turns the view: a 3D one (or any, with rotate: 'always')
  let canRotate = () => !!(settings.rotate && controls.allowRotation && (settings.rotate === 'always' || is3D()));
  let canTwist = () => canRotate() && !!controls.allowPinchRotation;

  // Pointers this camera owns, in the order they went down: id -> {p, x, y} (client coordinates
  // the last time the camera moved for them)
  let owned = new Map();
  let mode = null;      // one pointer: 'pan' or 'rotate'
  let pinch = null;     // two or more: what the fingers do
  let pinched = false;  // a pinch happened since the first pointer went down: no inertia after it
  let gliding = false;  // the pan or rotation records its speed, to glide on after the release
  let scroll = {pans: false, at: -Infinity}; // the scroll gesture going on: whether it pans

  let held = new Map(); // key code -> action
  let keyFrame = 0;
  let motion = {x: 0, y: 0, turn: 0, tilt: 0, zoom: 0};

  let handler = {
    name: 'camera',
    priority: Infinity,
    press: p => p.button >= 0 && p.button <= 2,
    down(p) {
      owned.set(p.id, {p, x: p.clientX, y: p.clientY});
      if (owned.size >= 2) {
        pinched = true;
        controls.panAnimation.cancel();
        pinch = null;
      }
    },
    dragstart(p) {
      if (owned.size === 1) {
        let rotate = canRotate() && p.pointerType !== 'touch' && (p.button === 2 || p.altKey);
        mode = rotate ? 'rotate' : 'pan';
        stop();
        gliding = settings.inertia && !reducedMotion();
        if (gliding) (rotate ? controls.rotateAnimation : controls.panAnimation).start();
      }
    },
    drag: move,
    dragend: p => release(p, false),
    up: p => release(p, true),
    cancel: p => release(p, true),
    wheel,
    doubletap(e) {
      // Two quick Shift or Cmd taps add and toggle selection: they don't zoom
      if (!settings.doubleTapZoom || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return false;
      controls.zoomToClientCoordinates(e.clientX, e.clientY, 0.5, !reducedMotion());
      return true;
    },
    twofingertap(e) {
      if (!settings.twoFingerTapZoom) return false;
      controls.zoomToClientCoordinates(e.clientX, e.clientY, -1, !reducedMotion());
      return true;
    },
    key,
    keyup,
    blur: releaseKeys
  };

  return {handler, stop, dispose, controls};

  function stop() {
    controls.panAnimation.cancel();
    controls.rotateAnimation.cancel();
  }

  function move() {
    if (owned.size === 1) {
      let only = owned.values().next().value;
      let dx = only.p.clientX - only.x, dy = only.p.clientY - only.y;
      only.x = only.p.clientX;
      only.y = only.p.clientY;
      if (!dx && !dy) return;
      if (mode === 'rotate') controls.rotateByAbsoluteOffset(dx, dy);
      else controls.panByAbsoluteOffset(dx, dy);
      controls.redraw();
      return;
    }
    let iterator = owned.values();
    let a = iterator.next().value, b = iterator.next().value;
    let ax = a.p.clientX, ay = a.p.clientY, bx = b.p.clientX, by = b.p.clientY;
    if (!pinch) pinch = {state: 'unknown', turned: 0, ax: a.x, ay: a.y, bx: b.x, by: b.y};

    let before = Math.hypot(b.x - a.x, b.y - a.y), after = Math.hypot(bx - ax, by - ay);
    let turn = Math.atan2(by - ay, bx - ax) - Math.atan2(b.y - a.y, b.x - a.x);
    if (turn > Math.PI) turn -= 2 * Math.PI;
    if (turn < -Math.PI) turn += 2 * Math.PI;
    pinch.turned += turn;
    classify(ax, ay, bx, by, after);

    let cx = (ax + bx) / 2, cy = (ay + by) / 2;
    if (pinch.state === 'tilt') {
      controls.rotateByAbsoluteOffset(0, ((ay - a.y) + (by - b.y)) / 2);
      controls.redraw();
    } else {
      if (pinch.state === 'turn') controls.rotateByAngle(turn, 0);
      controls.panByAbsoluteOffset(cx - (a.x + b.x) / 2, cy - (a.y + b.y) / 2);
      controls.redraw();
      // Zoom about the fingers' centre: the distance between them scales the view exactly
      if (before > 0 && after > 0) controls.zoomToClientCoordinates(cx, cy, 1 - before / after);
    }
    owned.forEach(state => {
      state.x = state.p.clientX;
      state.y = state.p.clientY;
    });
  }

  // Two fingers either turn (after `rotateArc` pixels of arc; they also zoom then), tilt (both move
  // up or down together while level), or just pinch and pan
  function classify(ax, ay, bx, by, distance) {
    if (pinch.state !== 'unknown' || !canRotate()) return;
    if (canTwist() && Math.abs(pinch.turned) * distance / 2 > settings.rotateArc) {
      pinch.state = 'turn';
      return;
    }
    let level = Math.abs(Math.atan2(pinch.by - pinch.ay, pinch.bx - pinch.ax));
    level = Math.min(level, Math.PI - level);
    let va = ay - pinch.ay, vb = by - pinch.by;
    let sideways = Math.abs(ax - pinch.ax) + Math.abs(bx - pinch.bx);
    if (level < Math.PI / 3 && va * vb > 0 && Math.abs(va + vb) > 42 && sideways < 20) {
      pinch.state = 'tilt';
    }
  }

  function release(p, abrupt) {
    if (!owned.delete(p.id)) return;
    pinch = null;
    if (owned.size) return;
    if (mode && gliding && !abrupt && !pinched) {
      (mode === 'rotate' ? controls.rotateAnimation : controls.panAnimation).stop();
    } else {
      stop();
    }
    mode = null;
    pinched = false;
    gliding = false;
  }

  function wheel(w) {
    stop();
    if (!w.ctrlKey && !w.metaKey && scrollPans(w)) {
      controls.panByAbsoluteOffset(-w.deltaX, -w.deltaY);
      controls.redraw();
      return true;
    }
    // Ctrl + wheel is a trackpad pinch in Chrome, Firefox and Safari: small deltas, finer steps
    let change = w.deltaY * (w.ctrlKey ? 0.01 : 0.002);
    change = Math.max(-0.5, Math.min(0.5, change));
    if (change) controls.zoomToClientCoordinates(w.clientX, w.clientY, 1 - Math.exp(change));
    return true;
  }

  // Whether a scroll pans. 'auto': browsers don't say which device scrolled, but only a trackpad
  // (or a tilting wheel, or Shift + wheel, which want to pan too) scrolls sideways. A scroll
  // gesture (events less than SCROLL_GAP apart) that moves sideways pans from then on, also where
  // it goes straight up or down; a mouse wheel zooms.
  function scrollPans(w) {
    if (settings.wheel === 'pan') return true;
    if (settings.wheel !== 'auto') return false;
    let time = now();
    if (time - scroll.at > SCROLL_GAP) scroll.pans = false;
    scroll.at = time;
    if (w.deltaX) scroll.pans = true;
    return scroll.pans;
  }

  function key(e) {
    if (!settings.keys || e.ctrlKey || e.metaKey || e.altKey) return false;
    let action = KEYS[e.code] || KEYS[e.key];
    if (!action || (ROTATING[action] && !canRotate())) return false;
    held.set(e.code || e.key, action);
    startKeys();
    return true;
  }

  function keyup(e) {
    // macOS drops other keys' keyup while Cmd is down
    if (e.key === 'Meta') held.clear();
    else held.delete(e.code || e.key);
  }

  function releaseKeys() {
    held.clear();
  }

  // Held keys move the camera with the same easing as w-gl's keyboard controls
  function startKeys() {
    if (!keyFrame) keyFrame = raf(keyStep);
  }

  function keyStep() {
    keyFrame = 0;
    let wants = {left: 0, right: 0, up: 0, down: 0, in: 0, out: 0, turnLeft: 0, turnRight: 0, tiltUp: 0, tiltDown: 0};
    held.forEach(action => { wants[action] = 1; });
    motion.x = settle(motion.x * 0.9 + wants.left - wants.right, 0.5);
    motion.y = settle(motion.y * 0.9 + wants.up - wants.down, 0.5);
    motion.turn = settle(motion.turn * 0.9 + (wants.turnLeft - wants.turnRight) / 2, Math.PI / 360);
    motion.tilt = settle(motion.tilt * 0.9 + (wants.tiltUp - wants.tiltDown) / 6, Math.PI / 360);
    motion.zoom = settle(motion.zoom * 0.7 + wants.in - wants.out, 0.5);
    let moved = false;
    if (motion.x || motion.y) {
      controls.panByAbsoluteOffset(motion.x, motion.y);
      moved = true;
    }
    if (motion.turn || motion.tilt) {
      controls.rotateByAbsoluteOffset(motion.turn, motion.tilt);
      moved = true;
    }
    if (motion.zoom) {
      controls.zoomCenterByScaleFactor(Math.sign(motion.zoom) * 0.025, 0, 0);
      moved = true;
    }
    if (moved) {
      controls.redraw();
      startKeys();
    }
  }

  function dispose() {
    stop();
    if (keyFrame) cancelRaf(keyFrame);
    keyFrame = 0;
    owned.clear();
    held.clear();
    install(scene, scene);
  }
}

// New map controls for `scene`, made through `sceneLike`, that keep the camera where it is.
// Map controls start at distance 1 from the centre; setViewBox() takes the distance from the
// camera's position instead.
function install(scene, sceneLike) {
  let view = scene.getDrawContext().view;
  let position = [view.position[0], view.position[1], view.position[2]];
  scene.setCameraController(() => createMapControls(sceneLike));
  let controls = scene.getCameraController();
  view.position[0] = position[0];
  view.position[1] = position[1];
  view.position[2] = position[2];
  controls.setViewBox();
  return controls;
}

function settle(value, threshold) {
  return Math.abs(value) < threshold ? 0 : value;
}

// What part of the canvas the user can see. Other elements can cover it (a settings panel, a
// toolbar, a header), and part of it can be outside the window. The view finds out the way the
// browser routes a press: a point of the canvas is visible when a click there would reach the
// canvas. That needs no word from the app, and follows whatever the page does (a panel that opens
// or scrolls, a window that shrinks).
//
// Elements marked `data-graph-overlay` don't count: the view's own tooltip, search box and help
// card move with what they show. Elements with `pointer-events: none` don't count either, since
// the browser looks through them.
//
// Hit testing a point costs a few µs (more when the page has to lay itself out first), so the
// visible area is measured on a grid of about 1500 cells (30 px on a 1440×900 canvas, 3 to 12 ms)
// only when asked. What covers the canvas changes almost only when the visitor does something
// (a click, a key, a resize, a scroll) or when a transition ends, so a measured area is kept
// until one of those happens, and at most a second (for pages that change on their own).

const OVERLAY_ATTRIBUTE = 'data-graph-overlay';

const CELLS = 1500;
const MIN_CELL = 16;
// How long a measured area is trusted (ms) when nothing that could change it happened
const MAX_AGE = 1000;
// What makes a measured area stale: the visitor acted, the page moved or a transition ended
const STALE_ON = ['pointerup', 'keyup', 'click', 'scroll', 'transitionend', 'animationend'];

/**
 * `canvas`: the element. `covered`: `(x, y) => boolean` in canvas CSS pixels, to say yourself
 * what is hidden; by default the page is hit tested.
 */
function createVisibility(canvas, covered) {
  let test = covered || hitTest(canvas);
  let cached = null;
  let listeners = new Set();
  let notifying = 0;
  // After the page had a chance to change: the app's own handlers of this event, and its
  // re-render, run first
  let notify = () => {
    notifying = 0;
    listeners.forEach(fn => fn());
  };
  let forget = () => {
    cached = null;
    if (listeners.size && !notifying) notifying = setTimeout(notify, 0);
  };
  let doc = typeof document !== 'undefined' ? document : null;
  let win = typeof window !== 'undefined' ? window : null;
  // Capture: a panel's own handlers may stop the event from bubbling
  if (doc && doc.addEventListener) STALE_ON.forEach(name => doc.addEventListener(name, forget, true));
  if (win && win.addEventListener) win.addEventListener('resize', forget);
  // A soft keyboard opens or closes: the visual viewport changes, the window may not
  let vv = win && win.visualViewport;
  if (vv && vv.addEventListener) vv.addEventListener('resize', forget);

  return {
    /** True when the canvas point (CSS pixels) is hidden */
    covered(x, y) {
      return test(x, y, canvasRect());
    },
    /** True when any point of a `step` lattice in the box is hidden */
    coveredIn(x0, y0, x1, y1, step) {
      let rect = canvasRect();
      let nx = Math.max(1, Math.ceil((x1 - x0) / step)), ny = Math.max(1, Math.ceil((y1 - y0) / step));
      for (let j = 0; j <= ny; ++j) {
        for (let i = 0; i <= nx; ++i) {
          if (test(x0 + (x1 - x0) * i / nx, y0 + (y1 - y0) * j / ny, rect)) return true;
        }
      }
      return false;
    },
    /** The visible area, measured now or a moment ago (see measureArea) */
    area() {
      let rect = canvasRect();
      let now = Date.now();
      if (!cached || now - cached.time > MAX_AGE || cached.width !== rect.width || cached.height !== rect.height) {
        cached = measureArea(rect.width, rect.height, (x, y) => test(x, y, rect));
        cached.time = now;
      }
      return cached;
    },
    forget,
    /** `fn()` runs when what covers the canvas may have changed; returns a function that stops it */
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    dispose() {
      cached = null;
      listeners.clear();
      clearTimeout(notifying);
      if (doc && doc.removeEventListener) STALE_ON.forEach(name => doc.removeEventListener(name, forget, true));
      if (win && win.removeEventListener) win.removeEventListener('resize', forget);
      if (vv && vv.removeEventListener) vv.removeEventListener('resize', forget);
    }
  };

  function canvasRect() {
    return canvas.getBoundingClientRect();
  }
}

// Pixels between an element placed over the canvas and the canvas's edges or what covers it
const OVERLAY_MARGIN = 12;

/**
 * Puts a fixed-position element of the view (a search box, a help card) over the canvas where it
 * shows: the first spot from the `from` edge ('top' or 'bottom') where it fits in the visible
 * `area`, a little away from covers and from the view's other overlays (a details card); over
 * another overlay when it fits nowhere else; the canvas's corner on that side when it fits
 * nowhere at all. `height`: room to keep for an element that grows (its own height when larger).
 */
function placeOverCanvas(element, canvas, area, from = 'top', height = 0) {
  let rect = canvas.getBoundingClientRect();
  let w = element.offsetWidth, h = Math.max(element.offsetHeight, height);
  let others = overlayBoxes(rect, element);
  let at = area ? area.spot(w, h, OVERLAY_MARGIN, from, others) : null;
  if (!at && area && others.length) at = area.spot(w, h, OVERLAY_MARGIN, from);
  if (!at) {
    at = {x: OVERLAY_MARGIN, y: from === 'bottom' ? Math.max(OVERLAY_MARGIN, rect.height - h - OVERLAY_MARGIN) : OVERLAY_MARGIN};
  }
  element.style.left = (rect.left + at.x) + 'px';
  element.style.top = (rect.top + at.y) + 'px';
}

/**
 * Boxes ({x, y, width, height}, canvas pixels) of the view's overlays that show over the canvas
 * (elements marked `data-graph-overlay`), but `except` and what contains it or is inside it
 */
function overlayBoxes(rect, except = null, root = typeof document !== 'undefined' ? document : null) {
  let boxes = [];
  if (!root) return boxes;
  root.querySelectorAll('[' + OVERLAY_ATTRIBUTE + ']').forEach(element => {
    if (except && (element === except || element.contains(except) || except.contains(element))) return;
    let r = element.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    if (r.right <= rect.left || r.left >= rect.right || r.bottom <= rect.top || r.top >= rect.bottom) return;
    boxes.push({x: r.left - rect.left, y: r.top - rect.top, width: r.width, height: r.height});
  });
  return boxes;
}

// A point is covered when the topmost element there (looking through the view's own overlays)
// is not the canvas, or when it is outside the window
function hitTest(canvas) {
  let root = canvas.getRootNode ? canvas.getRootNode() : null;
  if (!root || typeof root.elementFromPoint !== 'function') root = typeof document !== 'undefined' ? document : null;
  if (!root) return () => false;
  let vv = typeof window !== 'undefined' ? window.visualViewport : null;
  return (x, y, rect) => {
    let clientX = rect.left + x, clientY = rect.top + y;
    // Below the visual viewport is what a soft keyboard covers: the page doesn't know it is there
    if (vv && clientY > vv.offsetTop + vv.height) return true;
    let top = root.elementFromPoint(clientX, clientY);
    if (top === canvas) return false;
    if (!top || !isOverlay(top)) return true;
    let stack = root.elementsFromPoint(clientX, clientY);
    for (let i = 0; i < stack.length; ++i) {
      if (stack[i] === canvas) return false;
      if (!isOverlay(stack[i])) return true;
    }
    return true;
  };
}

function isOverlay(element) {
  return !!(element.closest && element.closest('[' + OVERLAY_ATTRIBUTE + ']'));
}

/**
 * The visible part of a `width` × `height` canvas as a grid: `covered(x, y)` (canvas pixels) is
 * sampled at the centre of each cell. Returns an area with:
 * - `cell`, `cols`, `rows`, `hidden` (1 per covered cell), `anyHidden`;
 * - `clearance`: per cell, how many cells away the nearest covered cell is (along either axis);
 * - `isHidden(x, y)`, `nearest(x, y, margin)`, `center()`, `largestRect()`,
 *   `spot(width, height, margin, from)`, `boxCovered(x, y, width, height, reach)` below.
 */
function measureArea(width, height, covered, cellSize) {
  let cell = cellSize || Math.max(MIN_CELL, Math.ceil(Math.sqrt(width * height / CELLS)));
  let cols = Math.max(1, Math.ceil(width / cell)), rows = Math.max(1, Math.ceil(height / cell));
  let count = cols * rows;
  let hidden = new Uint8Array(count);
  let anyHidden = false, allHidden = true;
  for (let r = 0; r < rows; ++r) {
    let y = Math.min((r + 0.5) * cell, height - 0.5);
    for (let c = 0; c < cols; ++c) {
      let x = Math.min((c + 0.5) * cell, width - 0.5);
      if (covered(x, y)) {
        hidden[r * cols + c] = 1;
        anyHidden = true;
      } else {
        allHidden = false;
      }
    }
  }
  let clearance = chebyshev(hidden, cols, rows);
  let largest;
  let sumsCache = null;

  return {
    width, height, cell, cols, rows, hidden, clearance, anyHidden,
    // Nothing is visible: the page covers the whole canvas (a transparent layer that takes the
    // clicks, say). Then nobody can tell, and covers are ignored.
    allHidden,
    isHidden(x, y) {
      let c = Math.floor(x / cell), r = Math.floor(y / cell);
      if (c < 0 || r < 0 || c >= cols || r >= rows) return true;
      return hidden[r * cols + c] === 1;
    },
    /**
     * The visible point nearest (x, y) that is at least `margin` pixels inside the canvas and
     * `margin` away from what covers it; with a smaller margin where nothing is that far in.
     * Null when nothing is visible.
     */
    nearest(x, y, margin) {
      if (allHidden) return null;
      for (let m = margin; ; m /= 2) {
        let spot = nearestAt(x, y, m < 1 ? 0 : m);
        if (spot || m < 1) return spot;
      }
    },
    /** The visible point farthest from what covers the canvas and from its edges, or null */
    center() {
      if (allHidden) return null;
      let best = -1, bestRoom = -1, bestOff = Infinity;
      for (let r = 0; r < rows; ++r) {
        for (let c = 0; c < cols; ++c) {
          let i = r * cols + c;
          if (hidden[i]) continue;
          let x = (c + 0.5) * cell, y = (r + 0.5) * cell;
          let room = Math.min((clearance[i] - 0.5) * cell, x, y, width - x, height - y);
          let off = Math.abs(x - width / 2) + Math.abs(y - height / 2);
          if (room > bestRoom || (room === bestRoom && off < bestOff)) {
            best = i; bestRoom = room; bestOff = off;
          }
        }
      }
      return best < 0 ? null : {x: Math.min((best % cols + 0.5) * cell, width), y: Math.min((Math.floor(best / cols) + 0.5) * cell, height)};
    },
    /**
     * The largest rectangle of the canvas that nothing covers, {x, y, width, height} in canvas
     * pixels (the whole canvas when nothing covers it; null when everything does). It is where
     * the whole graph can be shown, or an overlay placed, out from under a panel.
     */
    largestRect() {
      if (largest !== undefined) return largest;
      if (allHidden) return (largest = null);
      if (!anyHidden) return (largest = {x: 0, y: 0, width, height});
      let best = largestOpenRect(hidden, cols, rows);
      if (!best) return (largest = null);
      let x = best.c0 * cell, y = best.r0 * cell;
      largest = {
        x, y,
        width: Math.min(width, (best.c1 + 1) * cell) - x,
        height: Math.min(height, (best.r1 + 1) * cell) - y
      };
      return largest;
    },
    /**
     * Where a `width` × `height` box (a search box, a help card) fits in what shows, `margin`
     * pixels inside the canvas and at least `margin` (and half a cell) from what covers it: its
     * top left corner {x, y}, the first one found from the `from` edge ('top' or 'bottom'), left
     * to right. `avoid`: more boxes ({x, y, width, height}, canvas pixels) to keep `margin` from,
     * such as the view's other overlays. Null when it fits nowhere.
     */
    spot(boxWidth, boxHeight, margin = 0, from = 'top', avoid = null) {
      if (allHidden) return null;
      let left = margin, right = width - margin - boxWidth;
      let top = margin, bottom = height - margin - boxHeight;
      if (right < left || bottom < top) return null;
      let sums = summed();
      let reach = Math.max(margin, cell / 2);
      let xs = candidates(left, right), ys = candidates(top, bottom);
      if (from === 'bottom') ys.reverse();
      for (let j = 0; j < ys.length; ++j) {
        for (let i = 0; i < xs.length; ++i) {
          let x = xs[i], y = ys[j];
          let c0 = Math.max(0, Math.floor((x - reach) / cell)), c1 = Math.min(cols - 1, Math.floor((x + boxWidth + reach) / cell));
          let r0 = Math.max(0, Math.floor((y - reach) / cell)), r1 = Math.min(rows - 1, Math.floor((y + boxHeight + reach) / cell));
          if (countIn(sums, c0, r0, c1, r1) !== 0) continue;
          if (avoid && avoid.some(b => x < b.x + b.width + margin && x + boxWidth + margin > b.x &&
            y < b.y + b.height + margin && y + boxHeight + margin > b.y)) continue;
          return {x, y};
        }
      }
      return null;

      // The edge positions, then every cell boundary between them
      function candidates(from0, to) {
        let list = [from0];
        for (let k = Math.ceil(from0 / cell); k * cell < to; ++k) if (k * cell > from0) list.push(k * cell);
        if (to > from0) list.push(to);
        return list;
      }
    },
    /**
     * True when something covers the canvas within `reach` pixels (half a cell by default: a
     * cover's edge is known to that) of the box at (x, y), `boxWidth` × `boxHeight` pixels
     */
    boxCovered(x, y, boxWidth, boxHeight, reach = cell / 2) {
      if (!anyHidden) return false;
      let c0 = Math.max(0, Math.floor((x - reach) / cell)), c1 = Math.min(cols - 1, Math.floor((x + boxWidth + reach) / cell));
      let r0 = Math.max(0, Math.floor((y - reach) / cell)), r1 = Math.min(rows - 1, Math.floor((y + boxHeight + reach) / cell));
      if (c1 < c0 || r1 < r0) return false;
      return countIn(summed(), c0, r0, c1, r1) > 0;
    }
  };

  function summed() {
    if (!sumsCache) sumsCache = hiddenSums();
    return sumsCache;
  }

  // Hidden cells summed over every top left rectangle, so a box is counted at once
  function hiddenSums() {
    let sums = new Uint32Array((cols + 1) * (rows + 1));
    for (let r = 0; r < rows; ++r) {
      let line = 0;
      for (let c = 0; c < cols; ++c) {
        line += hidden[r * cols + c];
        sums[(r + 1) * (cols + 1) + c + 1] = sums[r * (cols + 1) + c + 1] + line;
      }
    }
    return sums;
  }

  function countIn(sums, c0, r0, c1, r1) {
    let w = cols + 1;
    return sums[(r1 + 1) * w + c1 + 1] - sums[r0 * w + c1 + 1] - sums[(r1 + 1) * w + c0] + sums[r0 * w + c0];
  }

  function nearestAt(x, y, margin) {
    // Cells that are `margin` away from covered cells, all of them: `need` cells apart, the gap
    // between them is (need - 1) cells. The edge of a cover is known to half a cell.
    let need = margin > 0 ? margin / cell + 1 : 1;
    let x0 = margin, y0 = margin, x1 = width - margin, y1 = height - margin;
    if (x0 > x1 || y0 > y1) return null;
    let best = null, bestDistance = Infinity;
    for (let r = 0; r < rows; ++r) {
      let top = Math.max(r * cell, y0), bottom = Math.min((r + 1) * cell, y1);
      if (top > bottom) continue;
      let py = Math.min(Math.max(y, top), bottom);
      let dy = py - y;
      if (dy * dy >= bestDistance) continue;
      for (let c = 0; c < cols; ++c) {
        let i = r * cols + c;
        if (hidden[i] || clearance[i] < need) continue;
        let left = Math.max(c * cell, x0), right = Math.min((c + 1) * cell, x1);
        if (left > right) continue;
        let px = Math.min(Math.max(x, left), right);
        let d = (px - x) * (px - x) + dy * dy;
        if (d < bestDistance) {
          bestDistance = d;
          best = {x: px, y: py};
        }
      }
    }
    return best;
  }
}

// Per cell: the distance in cells (the larger of the two axes) to the nearest hidden cell. Hidden
// cells get 0; with no hidden cell at all, every cell gets a large number.
function chebyshev(hidden, cols, rows) {
  let far = 65535;
  let d = new Uint16Array(cols * rows);
  for (let i = 0; i < d.length; ++i) d[i] = hidden[i] ? 0 : far;
  for (let r = 0; r < rows; ++r) {
    for (let c = 0; c < cols; ++c) {
      let i = r * cols + c;
      if (!d[i]) continue;
      let v = d[i];
      if (c > 0) v = Math.min(v, d[i - 1] + 1);
      if (r > 0) {
        v = Math.min(v, d[i - cols] + 1);
        if (c > 0) v = Math.min(v, d[i - cols - 1] + 1);
        if (c < cols - 1) v = Math.min(v, d[i - cols + 1] + 1);
      }
      d[i] = Math.min(v, far);
    }
  }
  for (let r = rows - 1; r >= 0; --r) {
    for (let c = cols - 1; c >= 0; --c) {
      let i = r * cols + c;
      if (!d[i]) continue;
      let v = d[i];
      if (c < cols - 1) v = Math.min(v, d[i + 1] + 1);
      if (r < rows - 1) {
        v = Math.min(v, d[i + cols] + 1);
        if (c < cols - 1) v = Math.min(v, d[i + cols + 1] + 1);
        if (c > 0) v = Math.min(v, d[i + cols - 1] + 1);
      }
      d[i] = Math.min(v, far);
    }
  }
  return d;
}

/**
 * The largest all-open rectangle of a grid (`hidden[r * cols + c]` is 1 where covered), by the
 * histogram method in O(cols × rows): {c0, c1, r0, r1} (inclusive cells), or null.
 */
function largestOpenRect(hidden, cols, rows) {
  let heights = new Int32Array(cols);
  let stack = new Int32Array(cols + 1);
  let best = null, bestArea = 0;
  for (let r = 0; r < rows; ++r) {
    for (let c = 0; c < cols; ++c) heights[c] = hidden[r * cols + c] ? 0 : heights[c] + 1;
    let top = 0;
    for (let c = 0; c <= cols; ++c) {
      let h = c < cols ? heights[c] : 0;
      while (top > 0 && heights[stack[top - 1]] >= h) {
        let height = heights[stack[--top]];
        let left = top > 0 ? stack[top - 1] + 1 : 0;
        let area = height * (c - left);
        if (area > bestArea) {
          bestArea = area;
          best = {c0: left, c1: c - 1, r0: r - height + 1, r1: r};
        }
      }
      stack[top++] = c;
    }
  }
  return best;
}

// How much room each node has: the distance to its nearest neighbour that is at least as big. The
// view draws no node wider than a share of its room (option `nodeRoom`), so where nodes crowd
// (the leaves around a hub, the core of a hairball) small nodes give way to bigger ones instead
// of merging into a solid disc, while a node with space around it keeps its size.
//
// Only the room that would cap a node matters: node i is searched up to `reach[i]` (its drawn
// diameter over the share), so small nodes look at a few cells and big ones further. One pass
// puts the nodes into the buckets of a hashed uniform grid (a counting sort), sized for the
// typical node's spacing; a node searches at most MAX_RINGS rings of cells, so a big node isn't
// capped by what is further than that (big nodes keep their size). Positions are the view's packed texture data: four floats per node, x, y, z first.

const MAX_RINGS = 6;

/**
 * Fills `out[i]` with node i's room in scene units, or 0 when it has more than `reach[i]`.
 * `sizes[i]` is node i's diameter: a node yields only to neighbours at least as big. `depth`: use
 * z as well (3D). `cache` keeps the grid's arrays between calls.
 */
function computeRooms(data, n, sizes, reach, depth, out, cache = {}) {
  out.fill(0, 0, n);
  if (n < 2) return out;
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0, o = 0; i < n; ++i, o += 4) {
    let x = data[o], y = data[o + 1], z = depth ? data[o + 2] : 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  if (!(maxX >= minX)) return out;
  // Cells about as wide as the spacing where the typical node is (a few nodes a cell there), and
  // never so small that the most common reach needs more than MAX_RINGS rings. Cells are hashed
  // into a table of buckets, so far-flung nodes cost no empty cells.
  let w = maxX - minX, h = maxY - minY, d = depth ? maxZ - minZ : 0;
  let cell = Math.max(crowdedSpacing(data, n, minX, minY, minZ, w, h, d, depth, cache) * 1.5, medianOf(reach, n, cache) / MAX_RINGS);
  if (!(cell > 0)) return out;
  let buckets = 1;
  while (buckets < 2 * n) buckets *= 2;
  let mask = buckets - 1;
  if (!cache.start || cache.start.length < buckets + 1) {
    cache.start = new Int32Array(buckets + 1);
    cache.fill = new Int32Array(buckets);
  }
  if (!cache.cellOf || cache.cellOf.length < n) {
    cache.cellOf = new Int32Array(n * 3);
    cache.order = new Int32Array(n);
  }
  let start = cache.start, fill = cache.fill, cellOf = cache.cellOf, order = cache.order;
  start.fill(0, 0, buckets + 1);
  let bucketOf = (kx, ky, kz) => (Math.imul(kx, 73856093) ^ Math.imul(ky, 19349663) ^ Math.imul(kz, 83492791)) & mask;
  for (let i = 0, o = 0; i < n; ++i, o += 4) {
    let kx = Math.floor((data[o] - minX) / cell);
    let ky = Math.floor((data[o + 1] - minY) / cell);
    let kz = depth ? Math.floor((data[o + 2] - minZ) / cell) : 0;
    cellOf[3 * i] = kx;
    cellOf[3 * i + 1] = ky;
    cellOf[3 * i + 2] = kz;
    start[bucketOf(kx, ky, kz) + 1] += 1;
  }
  for (let c = 0; c < buckets; ++c) start[c + 1] += start[c];
  fill.set(start.subarray(0, buckets));
  for (let i = 0; i < n; ++i) order[fill[bucketOf(cellOf[3 * i], cellOf[3 * i + 1], cellOf[3 * i + 2])]++] = i;

  for (let i = 0, o = 0; i < n; ++i, o += 4) {
    let limit = reach[i];
    if (!(limit > 0)) continue;
    // Big nodes look at most MAX_RINGS rings away: what is further doesn't cap them
    let rings = Math.min(MAX_RINGS, Math.ceil(limit / cell));
    let x = data[o], y = data[o + 1], z = depth ? data[o + 2] : 0;
    let size = sizes[i];
    let ix = cellOf[3 * i], iy = cellOf[3 * i + 1], iz = cellOf[3 * i + 2];
    let best = limit * limit;
    for (let ring = 0; ring <= rings; ++ring) {
      // every point of this ring is at least (ring - 1) cells away
      let near = (ring - 1) * cell;
      if (ring > 1 && near * near >= best) break;
      let z0 = depth ? iz - ring : 0, z1 = depth ? iz + ring : 0;
      for (let kz = z0; kz <= z1; ++kz) {
        let edgeZ = depth && Math.abs(kz - iz) === ring;
        for (let ky = iy - ring; ky <= iy + ring; ++ky) {
          let edge = edgeZ || Math.abs(ky - iy) === ring;
          // inside the ring only its two ends in x are new
          let step = edge || ring === 0 ? 1 : 2 * ring;
          for (let kx = ix - ring; kx <= ix + ring; kx += step) {
            let k = bucketOf(kx, ky, kz);
            for (let q = start[k], end = start[k + 1]; q < end; ++q) {
              let j = order[q];
              if (j === i || sizes[j] < size) continue;
              let p = j * 4;
              let dx = data[p] - x, dy = data[p + 1] - y, dz = depth ? data[p + 2] - z : 0;
              let dist = dx * dx + dy * dy + dz * dz;
              if (dist < best) best = dist;
            }
          }
        }
      }
    }
    if (best < limit * limit) out[i] = Math.sqrt(best);
  }
  return out;
}

// Spacing of nodes where the typical node is, from a coarse grid over the box (32 bins a side)
function crowdedSpacing(data, n, minX, minY, minZ, w, h, d, depth, cache) {
  let bins = depth ? 16 : 32, total = depth ? bins * bins * bins : bins * bins;
  if (!cache.bins || cache.bins.length < total) cache.bins = new Int32Array(total);
  let counts = cache.bins;
  counts.fill(0, 0, total);
  let bx = Math.max(w, 1e-9) / bins, by = Math.max(h, 1e-9) / bins, bz = Math.max(d, 1e-9) / bins;
  for (let i = 0, o = 0; i < n; ++i, o += 4) {
    let kx = Math.min(bins - 1, Math.floor((data[o] - minX) / bx));
    let ky = Math.min(bins - 1, Math.floor((data[o + 1] - minY) / by));
    let kz = depth ? Math.min(bins - 1, Math.floor((data[o + 2] - minZ) / bz)) : 0;
    counts[(kz * bins + ky) * bins + kx] += 1;
  }
  // The crowding the typical node sees: the bin that holds the median node, densest first
  let filled = Array.from(counts.subarray(0, total)).filter(c => c > 0).sort((a, b) => b - a);
  let crowd = 1;
  for (let k = 0, seen = 0; k < filled.length; ++k) {
    seen += filled[k];
    crowd = filled[k];
    if (seen >= n / 2) break;
  }
  let volume = depth ? bx * by * bz : bx * by;
  return (depth ? Math.cbrt : Math.sqrt)(volume / crowd);
}

function medianOf(values, n, cache) {
  if (!cache.sample) cache.sample = new Float32Array(1024);
  let sample = cache.sample, m = Math.min(n, sample.length), stride = n / m;
  for (let k = 0; k < m; ++k) sample[k] = values[Math.floor(k * stride)];
  let part = sample.subarray(0, m).sort();
  return part[m >> 1];
}

// hover: the node a mouse or pen rests on is flagged HOVERED, and 'hover' fires with the node and
// the previous one (node null: nothing is hovered now). The cursor shows at once what a press
// would do there.
//
//   view.use(hoverNodes);
//   view.on('hover', e => tooltip(e.node));
//
// Resting: a node lights up (and its label comes in front, its tooltip opens) once the pointer
// rests on it: it stayed within `rest.distance` pixels of a point for `rest.time` ms (as Windows'
// hover rectangle, and hoverIntent).
// A pointer on its way somewhere crosses other nodes without lighting them up, so nothing it
// passes changes the picture; leaving the hovered node puts its light out at once. A label's text
// counts as its node (see the labels module).
//
// While the pointer rests, nodes move under it (a running layout, a zoom): the hovered node stays
// hovered while it stays near the pointer (`stillReach` pixels from its disc, or on its label),
// so a still pointer doesn't hop between neighbours. Touch never hovers. Nothing is hovered while
// something is being dragged. e.preventDefault() on 'hover' keeps the node from lighting up.
//
// Options:
// - `holdStill` (false): pin the hovered node, so it doesn't drift away from the pointer. Off by
//   default because it changes the layout's physics.
// - `rest` ({distance: {mouse: 3, pen: 6}, time: 120}): how still a pointer rests (a pen hovering
//   in the air shakes more); false: it rests at once, and a node lights up as soon as the pointer
//   is over it.
// - `stillReach` (20): pixels from the hovered node's disc within which a still pointer keeps it.

const REST = {distance: {mouse: 3, pen: 6}, time: 120};
const STILL_REACH = 20;

var hoverNodes = {
  name: 'hover',
  attach(ctx, options = {}) {
    let point = null;
    // The hovered hit: {node, row, distance, inside, x, y, radius}
    let hovered = null;
    let frame = 0;
    let held = null; // {node, wasPinned}
    let rest = options.rest === false ? null : Object.assign({}, REST, options.rest || {});
    let stillReach = options.stillReach !== undefined ? options.stillReach : STILL_REACH;
    // The pointer rests: it has stayed near `anchor` ({x, y, t}) since `anchor.t` for `rest.time`
    let still = !rest;
    let anchor = null;
    let restTimer = 0;

    ctx.input.add({
      name: 'hover',
      priority: 0,
      hover(newPoint) {
        point = newPoint;
        if (!point) {
          still = !rest;
          anchor = null;
          stopWatching();
        } else if (rest) {
          if (!anchor || Math.hypot(point.x - anchor.x, point.y - anchor.y) >= restDistance(point)) {
            anchor = {x: point.x, y: point.y, t: performance.now()};
            still = false;
          }
          if (!still) watchRest();
        }
        if (!frame) frame = requestAnimationFrame(onFrame);
      }
    });
    ctx.onFrame(change => {
      if (point && (change.positions || change.camera || change.structure)) update(true);
    });
    // A press of this pointer takes the node that is lit (index.js asks): what lights up is what
    // a press takes, also when the node drifted from a still pointer (`stillReach`)
    ctx.provide('litAt', (x, y) => hovered && point && Math.hypot(x - point.x, y - point.y) <= restDistance(point) ? hovered : null);

    return {
      /** The hovered node, or null */
      get: () => hovered ? hovered.node : null,
      dispose() {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        stopWatching();
        point = null;
        set(null);
      }
    };

    function onFrame() {
      frame = 0;
      update(false);
    }

    // `moved`: the nodes or the camera moved under the pointer (not the pointer itself)
    function update(moved) {
      let hit = null;
      if (point && !ctx.input.dragging()) {
        if (moved && still && hovered && near(hovered.node)) {
          hit = hovered;
        } else {
          hit = ctx.pick(point.x, point.y, {
            pointerType: point.pointerType,
            width: point.width,
            sticky: hovered ? hovered.node : null
          });
        }
      }
      if (hit && hovered && hit.node === hovered.node) hovered = hit;
      // A resting pointer hovers what it is on; a moving one only lets go of what it left
      else if (still || !hit) set(hit);
      else set(null);
      // The cursor shows what a press would do: a press takes what is lit (see index.js)
      updateCursor(hit);
    }

    // The still pointer is near `node`: on its label, or within `stillReach` of its disc
    function near(node) {
      let labels = ctx.get ? ctx.get('labelTargets') : null;
      let box = labels ? labels.boxOf(node) : null;
      if (box && point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height) return true;
      let disc = ctx.discsOf ? ctx.discsOf([node])[0] : null;
      return !!disc && Math.hypot(disc.x - point.x, disc.y - point.y) - disc.radius <= stillReach;
    }

    function restDistance(p) {
      let d = rest.distance;
      if (typeof d === 'number') return d;
      return d[p.pointerType] || d.mouse || 3;
    }

    // Checks, once the pointer has had `rest.time` to settle, whether it stayed near its anchor
    function watchRest() {
      if (restTimer) return;
      restTimer = setTimeout(checkRest, Math.max(10, anchor.t + rest.time - performance.now()));
    }

    function stopWatching() {
      clearTimeout(restTimer);
      restTimer = 0;
    }

    function checkRest() {
      restTimer = 0;
      if (!point || !anchor || still) return;
      if (performance.now() - anchor.t >= rest.time - 1) {
        still = true;
        update(false);
      } else {
        watchRest();
      }
    }

    function set(hit) {
      let previous = hovered ? hovered.node : null;
      let node = hit ? hit.node : null;
      hovered = hit;
      if (previous === node) return;
      if (previous) {
        ctx.flags.set(previous.id, HOVERED, false);
        letGo();
      }
      let e = ctx.emit('hover', {
        node, previous, id: node ? node.id : undefined, row: hit ? hit.row : -1, hit,
        x: point ? point.x : 0, y: point ? point.y : 0,
        clientX: point ? point.clientX : 0, clientY: point ? point.clientY : 0,
        pointerType: point ? point.pointerType : null,
        originalEvent: point ? point.originalEvent : null
      });
      if (node && !e.defaultPrevented) {
        ctx.flags.set(node.id, HOVERED, true);
        if (options.holdStill) hold(node);
      }
    }

    // What a press would do here: the cursor of the module that would take it (a drag's grab),
    // or a pointer over a node a tap would pick
    function updateCursor(hit) {
      if (!point) {
        ctx.setCursor(null);
        return;
      }
      let claimant = ctx.input.claimant({
        id: -1, pointerType: point.pointerType, button: 0,
        x: point.x, y: point.y, downX: point.x, downY: point.y,
        shiftKey: point.shiftKey, altKey: point.altKey, ctrlKey: point.ctrlKey, metaKey: point.metaKey,
        hit, node: hit ? hit.node : null
      });
      let cursor = claimant && claimant.cursor ? claimant.cursor : (hit ? 'pointer' : null);
      ctx.setCursor(cursor);
    }

    function hold(node) {
      let layout = ctx.layout;
      held = {node, layout, wasPinned: layout.isNodePinned(node)};
      layout.pinNode(node, true);
    }

    function letGo() {
      if (!held) return;
      // A drag may have pinned or released it since: leave it to the drag then
      if (held.layout === ctx.layout && ctx.graph.getNode(held.node.id) && !ctx.flags.has(held.node.id, ctx.FLAGS.DRAGGED)) {
        held.layout.pinNode(held.node, held.wasPinned);
      }
      held = null;
    }
  }
};

// drag: moves nodes with a mouse, pen or finger. The node is pinned while it moves and goes back
// to the layout when dropped. Dragging a selected node moves the whole selection rigidly. Escape
// (or a cancelled pointer) puts every dragged node back where it was.
//
//   view.use(dragNodes);
//   view.on('dragend', e => console.log(e.node.id, e.nodes.length, e.cancelled));
//
// One rule for a mouse, a pen and a finger: a press on a node takes it, a press anywhere else
// moves the camera. On a node means on its dot as drawn, on its label, or within the pointer's
// reach of the dot (8 pixels for a mouse, 10 for a pen, 16 or the finger's half width for a
// finger); where several nodes are within reach, the nearest takes the press, and a mouse or pen
// takes the node it highlighted. What lights up is what moves.
//
// The node lifts (flagged DRAGGED: drawn larger, with a ring, its label in front) the moment the
// press lands, before it moves, so a finger sees what it holds; the cursor is a grabbing hand. A
// press that lifts without moving is a tap.
//
// The node stays under the pointer while the camera moves (keys, inertia), and keeps its offset
// from the pointer. A second finger always pinches: while it is down the camera has both fingers
// (input.js lends it the holding one), and the node stays where it is in the drawing, still held;
// when the second finger lifts, the first drags the node on from where it is. In 3D the node moves
// on the plane through it that faces the camera. It works the same with the layout on the CPU or
// on WebGPU (through setNodePosition()), and with the layout paused.
//
// Events: 'dragstart' (e.preventDefault() leaves the press to the camera), 'drag', 'dragend'
// ({cancelled}). Each has `node` (the one under the pointer) and `nodes` (all that move).
//
// Options:
// - `pinOnDrop` (false): leave dropped nodes pinned. Nodes that were pinned stay pinned either way.

var dragNodes = {
  name: 'drag',
  attach(ctx, options = {}) {
    let pinOnDrop = !!options.pinOnDrop;
    // Pointer id -> drag in progress
    let drags = new Map();
    // Pointer id -> node lifted by a press, not moved yet
    let taken = new Map();

    ctx.input.add({
      name: 'drag',
      priority: 20,
      cursor: 'grab',
      press: p => grabs(p) && !!p.node,
      // The press landed: the node lifts at once
      down(p) {
        if (!p.node || taken.has(p.id) || drags.has(p.id)) return;
        taken.set(p.id, p.node);
        ctx.flags.set(p.node.id, DRAGGED, true);
        updateCursor();
      },
      dragstart: begin,
      drag(p) {
        let drag = drags.get(p.id);
        if (!drag || drag.lent) return;
        drag.x = p.x;
        drag.y = p.y;
        move(drag);
        ctx.emit('drag', eventOf(drag, p, {}));
      },
      dragend: p => end(p, false),
      cancel: p => end(p, true),
      up: p => letGoTaken(p.id),
      // A second finger: the camera has this one for the pinch, the node stays where it is
      suspend(p) {
        let drag = drags.get(p.id);
        if (drag) drag.lent = true;
      },
      // The pinch is over: this finger drags the node on from where the node is now
      resume(p) {
        let drag = drags.get(p.id);
        if (!drag || !drag.lent) return;
        drag.lent = false;
        rebase(drag, p);
      },
      key(e) {
        if (e.key !== 'Escape' || (!drags.size && !taken.size)) return false;
        Array.from(drags.keys()).concat(Array.from(taken.keys())).forEach(ctx.input.cancel);
        return true;
      }
    });
    // Keys or inertia move the camera: keep the nodes under their pointers (not during a pinch:
    // the camera follows the fingers then, and the node stays in place)
    ctx.onCamera(() => drags.forEach(drag => { if (!drag.lent) move(drag); }));

    return {
      /** Nodes being dragged now */
      get() {
        let all = [];
        drags.forEach(drag => drag.items.forEach(item => all.push(item.node)));
        return all;
      },
      dispose() {
        Array.from(drags.keys()).concat(Array.from(taken.keys())).forEach(ctx.input.cancel);
      }
    };

    function grabs(p) {
      return p.button === 0 && !p.shiftKey && !(p.node && ctx.flags.has(p.node.id, DRAGGED) && !taken.has(p.id));
    }

    function begin(p) {
      let node = taken.get(p.id) || p.node;
      if (!node) return false;
      let layout = ctx.layout;
      let group = ctx.flags.has(node.id, SELECTED) ? ctx.flags.ids(SELECTED) : [node.id];
      let nodes = [node].concat(group.filter(id => id !== node.id).map(id => ctx.graph.getNode(id)).filter(Boolean));
      let e = ctx.emit('dragstart', {
        node, nodes, id: node.id, x: p.x, y: p.y, clientX: p.clientX, clientY: p.clientY,
        pointerType: p.pointerType, pointerId: p.id, originalEvent: p.event
      });
      if (e.defaultPrevented) {
        letGoTaken(p.id);
        return false;
      }
      taken.delete(p.id);

      let D = layout.simulator.store.D;
      let items = nodes.map(n => {
        let body = layout.getBody(n.id);
        let start = new Float64Array(D);
        for (let k = 0; k < D; ++k) start[k] = body.pos.array[body.pos.offset + k];
        let item = {node: n, body, start, wasPinned: layout.isNodePinned(n)};
        layout.pinNode(n, true);
        body.velocity.reset();
        ctx.flags.set(n.id, DRAGGED, true);
        return item;
      });
      // Where the node is on the canvas, relative to where the press went down
      let anchor = items[0].start;
      let onScreen = ctx.toScreen(anchor[0], D > 1 ? anchor[1] : 0, D > 2 ? anchor[2] : 0);
      let drag = {
        pointerId: p.id, layout, items, D, x: p.x, y: p.y,
        offsetX: onScreen ? onScreen.x - p.downX : 0,
        offsetY: onScreen ? onScreen.y - p.downY : 0
      };
      drags.set(p.id, drag);
      updateCursor();
      return true;
    }

    function move(drag) {
      if (drag.layout !== ctx.layout) return;
      let D = drag.D;
      let anchor = drag.items[0];
      let x = drag.x + drag.offsetX, y = drag.y + drag.offsetY;
      let target;
      if (D >= 3) {
        let pos = anchor.body.pos;
        target = ctx.fromScreen(x, y, [pos.array[pos.offset], pos.array[pos.offset + 1], pos.array[pos.offset + 2]]);
      } else {
        target = ctx.fromScreen(x, y);
      }
      if (!target) return;
      let delta = [target[0] - anchor.start[0], D > 1 ? target[1] - anchor.start[1] : 0, D > 2 ? target[2] - anchor.start[2] : 0];
      drag.items.forEach(item => place(drag.layout, item, delta));
      ctx.view.invalidate();
    }

    // The pointer is at `p` and the node where it is now: the node keeps that offset from now on
    function rebase(drag, p) {
      let D = drag.D, pos = drag.items[0].body.pos, o = pos.offset;
      let onScreen = ctx.toScreen(pos.array[o], D > 1 ? pos.array[o + 1] : 0, D > 2 ? pos.array[o + 2] : 0);
      drag.x = p.x;
      drag.y = p.y;
      if (!onScreen) return;
      drag.offsetX = onScreen.x - p.x;
      drag.offsetY = onScreen.y - p.y;
    }

    function place(layout, item, delta) {
      let args = [item.node.id];
      let pos = item.body.pos;
      for (let k = 0; k < item.start.length; ++k) {
        args.push(k < 3 ? item.start[k] + delta[k] : pos.array[pos.offset + k]);
      }
      layout.setNodePosition.apply(layout, args);
    }

    function end(p, cancelled) {
      if (letGoTaken(p.id)) return;
      let drag = drags.get(p.id);
      if (!drag) return;
      drags.delete(p.id);
      let layout = drag.layout;
      let current = layout === ctx.layout;
      drag.items.forEach(item => {
        ctx.flags.set(item.node.id, DRAGGED, false);
        if (!current || !ctx.graph.getNode(item.node.id)) return;
        if (cancelled) place(layout, item, [0, 0, 0]);
        layout.pinNode(item.node, item.wasPinned || (pinOnDrop && !cancelled));
        // Velocity from before the drag would throw the node
        item.body.velocity.reset();
      });
      ctx.view.invalidate();
      updateCursor();
      ctx.emit('dragend', eventOf(drag, p, {cancelled}));
    }

    function letGoTaken(pointerId) {
      let node = taken.get(pointerId);
      if (!node) return false;
      taken.delete(pointerId);
      ctx.flags.set(node.id, DRAGGED, false);
      updateCursor();
      return true;
    }

    function eventOf(drag, p, fields) {
      let node = drag.items[0].node;
      return Object.assign({
        node, nodes: drag.items.map(item => item.node), id: node.id,
        x: p.x, y: p.y, clientX: p.clientX, clientY: p.clientY,
        pointerType: p.pointerType, pointerId: p.id, originalEvent: p.event
      }, fields);
    }

    function updateCursor() {
      ctx.setCursor(drags.size || taken.size ? 'grabbing' : null, 2);
    }
  }
};

// select: a set of selected nodes, flagged SELECTED. The view lights their links, marks their
// neighbours and dims the rest.
//
//   const selection = view.use(selectNodes);
//   view.on('select', e => console.log(e.nodes.map(node => node.id)));
//   selection.set(['a', 'b']);
//
// A tap on a node selects it; Shift adds it, Cmd or Ctrl toggles it. A tap on the background, or
// Escape, clears the selection. A long press on the background, then a drag, draws a box (with a
// finger or a pen: input.js doesn't long-press a mouse) that selects the nodes whose disc touches
// it; Shift-drag draws one right away, with any pointer. With Shift, Cmd or Ctrl held, the box adds to the selection.
//
// 'select' fires before a change is kept: {nodes, added, removed}; e.preventDefault() keeps the
// old selection. A box shows what it would select while it is drawn, and fires once at the end.
//
// Options:
// - `box` (true): a long press on the background, or Shift-drag, draws a selection box.
// - `boxStyle`: CSS for the box element.

const BOX_STYLE = 'position:fixed;pointer-events:none;z-index:2147483647;box-sizing:border-box;' +
  'border:1px solid rgba(255,255,255,0.85);background:rgba(255,255,255,0.08);';

var selectNodes = {
  name: 'select',
  attach(ctx, options = {}) {
    let selected = new Set();
    let box = null;

    ctx.input.add({
      name: 'select',
      priority: 30,
      cursor: 'crosshair',
      press: p => options.box !== false && p.button === 0 && p.shiftKey,
      longpress(p) {
        if (options.box === false || p.button !== 0 || p.node || box) return false;
        openBox(p);
        return true;
      },
      dragstart(p) {
        if (!box) openBox(p);
      },
      up(p) {
        // A long press that never moved: no box
        if (box && box.pointerId === p.id) cancelBox();
      },
      drag(p) {
        if (!box || box.pointerId !== p.id) return;
        box.x1 = p.x; box.y1 = p.y;
        box.clientX1 = p.clientX; box.clientY1 = p.clientY;
        placeBox();
        if (!box.frame) box.frame = requestAnimationFrame(previewBox);
      },
      dragend(p) {
        if (!box || box.pointerId !== p.id) return;
        let next = new Set(box.base);
        ctx.nodesInRect(box.x0, box.y0, box.x1, box.y1).forEach(node => next.add(node.id));
        closeBox();
        change(next, p);
      },
      cancel(p) {
        if (box && box.pointerId === p.id) cancelBox();
      },
      tap(e) {
        if (e.button !== 0) return false;
        let toggle = e.metaKey || e.ctrlKey;
        if (!e.node) {
          if (!e.shiftKey && !toggle && selected.size) change(new Set(), e);
          return false;
        }
        let id = e.node.id;
        let next;
        if (toggle) {
          next = new Set(selected);
          if (next.has(id)) next.delete(id); else next.add(id);
        } else if (e.shiftKey) {
          next = new Set(selected).add(id);
        } else {
          next = new Set([id]);
        }
        change(next, e);
        return false;
      },
      key(e) {
        if (e.key !== 'Escape') return false;
        if (box) {
          ctx.input.cancel(box.pointerId);
          return true;
        }
        if (!selected.size) return false;
        change(new Set(), e);
        return true;
      }
    });
    ctx.graph.on('changed', onGraphChanged);

    return {
      /** The selected nodes */
      get() {
        let nodes = [];
        selected.forEach(id => {
          let node = ctx.graph.getNode(id);
          if (node) nodes.push(node);
        });
        return nodes;
      },
      /** Selects these nodes (or ids); fires 'select' */
      set(nodesOrIds) {
        return change(new Set(Array.from(nodesOrIds || [], idOf)), null);
      },
      clear() {
        return change(new Set(), null);
      },
      has(nodeOrId) {
        return selected.has(idOf(nodeOrId));
      },
      dispose() {
        if (box) ctx.input.cancel(box.pointerId);
        ctx.graph.off('changed', onGraphChanged);
        show(new Set());
        selected.clear();
      }
    };

    // Keeps `next` as the selection unless a 'select' listener prevents it; true if kept
    function change(next, cause) {
      next.forEach(id => { if (!ctx.graph.getNode(id)) next.delete(id); });
      let added = [], removed = [];
      next.forEach(id => { if (!selected.has(id)) added.push(id); });
      selected.forEach(id => { if (!next.has(id)) removed.push(id); });
      if (!added.length && !removed.length) {
        show(next);
        return true;
      }
      let e = ctx.emit('select', {
        nodes: nodesOf(next), added: nodesOf(added), removed: nodesOf(removed),
        node: cause && cause.node ? cause.node : null,
        pointerType: cause ? cause.pointerType : null,
        originalEvent: cause ? (cause.originalEvent || cause.event || cause) : null
      });
      if (e.defaultPrevented) {
        show(selected);
        return false;
      }
      selected = next;
      show(selected);
      return true;
    }

    // Flags exactly the nodes of `ids` as selected
    function show(ids) {
      ctx.flags.ids(SELECTED).forEach(id => { if (!ids.has(id)) ctx.flags.set(id, SELECTED, false); });
      ids.forEach(id => ctx.flags.set(id, SELECTED, true));
    }

    function openBox(p) {
      let adds = p.shiftKey || p.metaKey || p.ctrlKey;
      box = {
        pointerId: p.id, base: adds ? new Set(selected) : new Set(),
        x0: p.downX, y0: p.downY, x1: p.x, y1: p.y,
        clientX0: p.downClientX, clientY0: p.downClientY, clientX1: p.clientX, clientY1: p.clientY,
        element: createBoxElement(), frame: 0
      };
      placeBox();
      ctx.setCursor('crosshair', 2);
    }

    function cancelBox() {
      let shown = selected;
      closeBox();
      show(shown);
    }

    function previewBox() {
      if (!box) return;
      box.frame = 0;
      let preview = new Set(box.base);
      ctx.nodesInRect(box.x0, box.y0, box.x1, box.y1).forEach(node => preview.add(node.id));
      show(preview);
    }

    function createBoxElement() {
      if (typeof document === 'undefined') return null;
      let element = document.createElement('div');
      element.style.cssText = BOX_STYLE + (options.boxStyle || '');
      document.body.appendChild(element);
      return element;
    }

    function placeBox() {
      if (!box.element) return;
      let left = Math.min(box.clientX0, box.clientX1), top = Math.min(box.clientY0, box.clientY1);
      let width = Math.abs(box.clientX1 - box.clientX0), height = Math.abs(box.clientY1 - box.clientY0);
      let style = box.element.style;
      if (width < 2 && height < 2) {
        // A long press that hasn't moved yet: a ring under the pointer (or finger) says a box is coming
        style.left = (box.clientX0 - 12) + 'px';
        style.top = (box.clientY0 - 12) + 'px';
        style.width = style.height = '24px';
        style.borderRadius = '50%';
        return;
      }
      style.borderRadius = '0';
      style.left = left + 'px';
      style.top = top + 'px';
      style.width = width + 'px';
      style.height = height + 'px';
    }

    function closeBox() {
      if (box.frame) cancelAnimationFrame(box.frame);
      if (box.element && box.element.parentNode) box.element.parentNode.removeChild(box.element);
      box = null;
      ctx.setCursor(null);
    }

    function onGraphChanged(changes) {
      changes.forEach(c => {
        if (c.changeType === 'remove' && c.node) selected.delete(c.node.id);
      });
    }

    function nodesOf(ids) {
      let nodes = [];
      ids.forEach(id => {
        let node = ctx.graph.getNode(id);
        if (node) nodes.push(node);
      });
      return nodes;
    }
  }
};

function idOf(nodeOrId) {
  return nodeOrId && typeof nodeOrId === 'object' && 'id' in nodeOrId ? nodeOrId.id : nodeOrId;
}

// inspect: a tooltip with what is known about a node: its label, id, number of links and data.
//
//   view.use(hoverNodes);      // tooltips while a mouse or pen hovers a node
//   view.use(inspectNodes);    // a tap (mouse, pen or finger) keeps one open
//   view.use(inspectNodes, {content: node => node.data.title});
//
// Hovering a node (the hover module's: the pointer rests on it, so a pointer on its way elsewhere
// opens no cards over what it reaches for) shows its tooltip `delay` ms later, while the pointer
// stays on the node or on the tooltip (so its text can be read and selected). A card covers more
// than a label, so it waits longer: with the hover module's rest, about Windows' 400 ms hover
// time. Once one card is open, the next node's opens at once. Keyboard focus (the navigate module) shows it too, while the
// node has focus. A tap on a node, or Enter on a focused one, keeps the tooltip open until a tap
// elsewhere or Escape; that is how touch shows it. The tooltip follows its node as the layout and the camera
// move, beside the node rather than over it, inside the canvas.
//
// Where it goes: beside the node, on the side that covers the fewest of the node's neighbours
// (what a selection lights up), never under what covers the canvas; when every side covers some,
// docked at the bottom of what shows. On a phone-sized canvas it always docks at the bottom, in a
// card at most 150 px tall that scrolls.
//
// Options:
// - `content(node)`: what to show, as text (a string) or an element; null shows nothing. The
//   default is `describeNode()`: the label (and the id when it differs), the number of links,
//   and the fields of `node.data`.
//   Strings are always text, never HTML.
// - `hover` (true): show tooltips on hover (needs the hover module). `tap` (true): keep one open
//   on tap. `delay` (280): ms a hovered node waits for its card.
// - `style`: CSS added to the tooltip's own. `className`: a class for it.
//
// API: show(node), hide(), get() (the node shown, or null).

const STYLE = 'position:fixed;z-index:2147483646;max-width:280px;padding:6px 8px;border-radius:4px;' +
  'background:rgba(9,22,44,0.94);color:#e8f1ff;border:1px solid rgba(255,255,255,0.18);' +
  'font:12px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 2px 10px rgba(0,0,0,0.45);' +
  'pointer-events:auto;user-select:text;-webkit-user-select:text;overflow-wrap:anywhere;display:none;' +
  // A finger may scroll a docked card, but a pinch on it must not zoom the page
  'touch-action:pan-y;';
// Pixels between a node and its tooltip
const OFFSET = 14;
// After the pointer leaves a node, how long the tooltip waits for it to reach the tooltip
const LINGER = 200;
// A hovered node's card opens this long after the hover, unless a card was open less than WARM ms
// ago (then at once: the visitor is reading cards)
const DELAY = 280, WARM = 300;
const MAX_FIELDS = 12;
const MAX_VALUE = 120;
// The sides of a node a tooltip may take, in the order they are tried
const SIDES = ['below-right', 'above-right', 'below-left', 'above-left'];
// A neighbour this close to the card counts as covered (its disc and the start of its label)
const COVER_MARGIN = 10;
// Pixels between a docked tooltip and what covers the canvas or its edges
const DOCK_MARGIN = 12;
// Neighbours looked at, at most (a hub's thousands don't need to be)
const NEIGHBOURS$1 = 500;
// A canvas narrower than this (a phone) has no room beside a node: the card docks at the bottom,
// in the band a width-bound drawing leaves free, at most DOCK_HEIGHT tall (it scrolls) and
// narrow enough to leave room for buttons in a corner
const NARROW = 560, DOCK_HEIGHT = 150, DOCK_ROOM = 150;
// Smaller caps a card takes when it fits nowhere at its own size; it scrolls (and fades at its
// edge) instead. On a narrow canvas only the heights apply.
const COMPACT = [{width: 220, height: 110}, {width: 160, height: 72}];
// Pixels of a scrolling card's fade at its bottom edge
const FADE = 28;

function boxBeside$1(side, at, width, height) {
  let right = side.endsWith('right'), below = side.startsWith('below');
  return {
    x: right ? at.x + OFFSET : at.x - OFFSET - width,
    y: below ? at.y + OFFSET : at.y - OFFSET - height,
    width, height
  };
}

// The box of the node and its neighbours that show on the canvas, `COVER_MARGIN` wider
function around(at, points, rect) {
  let left = at.x, right = at.x, top = at.y, bottom = at.y;
  for (let i = 0; i < points.length; ++i) {
    let p = points[i];
    if (p.x < 0 || p.y < 0 || p.x > rect.width || p.y > rect.height) continue;
    if (p.x < left) left = p.x;
    if (p.x > right) right = p.x;
    if (p.y < top) top = p.y;
    if (p.y > bottom) bottom = p.y;
  }
  return {left: left - COVER_MARGIN, right: right + COVER_MARGIN, top: top - COVER_MARGIN, bottom: bottom + COVER_MARGIN};
}

// How many points are on the box, or near it
function covers(box, points) {
  let count = 0;
  for (let i = 0; i < points.length; ++i) {
    if (inside(points[i], box, box.width, box.height, COVER_MARGIN)) count += 1;
  }
  return count;
}

function inside(point, box, width, height, margin) {
  return point.x >= box.x - margin && point.x <= box.x + width + margin &&
    point.y >= box.y - margin && point.y <= box.y + height + margin;
}

var inspectNodes = {
  name: 'inspect',
  attach(ctx, options = {}) {
    let content = options.content || (node => describeNode(node, ctx.graph, ctx.labelOf ? ctx.labelOf(node) : undefined));
    let card = null;
    let natural = null;
    let fade = null;
    // What is shown: {node, pinned, source} (source: 'hover', 'focus' or 'tap')
    let shown = null;
    let overCard = false;
    let hoverNode = null;
    let lingering = 0;
    let opening = 0;
    // When a hover card was last on screen
    let lastSeen = -Infinity;
    let delay = options.delay !== undefined ? options.delay : DELAY;

    if (options.hover !== false) ctx.on('hover', onHover);
    ctx.on('focus', e => {
      if (shown && shown.pinned) return;
      if (e.node) show(e.node, false, 'focus');
      else if (shown && shown.source === 'focus') hide();
    });
    ctx.input.add({
      name: 'inspect',
      priority: 25,
      tap(e) {
        if (options.tap === false || e.button !== 0) return false;
        if (e.node) show(e.node, true, 'tap');
        else if (shown) hide();
        return false;
      },
      key(e) {
        if (e.key !== 'Escape' || !shown) return false;
        hide();
        return true;
      }
    });
    // Nodes move under their tooltips: follow them every frame
    ctx.onFrame(() => { if (shown) place(); });
    // More room may show (a panel closed): a card that shrank tries its own size again
    if (ctx.onVisibleAreaChange) {
      ctx.onVisibleAreaChange(() => {
        if (!shown) return;
        shown.size = 0;
        ctx.requestFrame();
      });
    }
    ctx.graph.on('changed', onGraphChanged);

    return {
      show: node => show(node, true, 'api'),
      hide,
      get: () => shown ? shown.node : null,
      dispose() {
        clearTimeout(lingering);
        clearTimeout(opening);
        ctx.graph.off('changed', onGraphChanged);
        if (card && card.parentNode) card.parentNode.removeChild(card);
        card = null;
        shown = null;
      }
    };

    function onHover(e) {
      hoverNode = e.node;
      if (shown && shown.pinned) return;
      clearTimeout(lingering);
      clearTimeout(opening);
      if (e.node) {
        let warm = (shown && shown.source === 'hover') || performance.now() - lastSeen < WARM;
        if (warm || delay <= 0) {
          show(e.node, false, 'hover');
        } else {
          let node = e.node;
          opening = setTimeout(() => {
            if (hoverNode === node && !(shown && shown.pinned)) show(node, false, 'hover');
          }, delay);
        }
      } else if (shown && shown.source === 'hover') {
        // The card goes a moment later: the pointer may be on its way to it
        lingering = setTimeout(() => {
          if (!overCard && !hoverNode && shown && shown.source === 'hover') hide();
        }, LINGER);
      }
    }

    function show(node, pinned, source) {
      if (!node) return hide();
      let body = content(node);
      if (body === null || body === undefined) return hide();
      ensureCard();
      if (!shown || shown.node !== node) fill(body);
      let same = shown && shown.node === node;
      shown = {node, pinned, source, side: same ? shown.side : null, narrow: same ? shown.narrow : null, size: same ? shown.size : 0};
      place();
    }

    function hide() {
      clearTimeout(lingering);
      if (shown && shown.source === 'hover') lastSeen = performance.now();
      shown = null;
      if (card) card.style.display = 'none';
    }

    function fill(body) {
      card.textContent = '';
      if (typeof body === 'string') {
        card.textContent = body;
        return;
      }
      if (body && body.nodeType) {
        card.appendChild(body);
        return;
      }
      // {title, rows: [[name, value], ...]} from describeNode()
      let title = document.createElement('div');
      title.style.cssText = 'font-weight:600;margin-bottom:2px;';
      title.textContent = body.title;
      card.appendChild(title);
      if (!body.rows.length) return;
      let table = document.createElement('div');
      table.style.cssText = 'display:grid;grid-template-columns:auto 1fr;column-gap:8px;';
      body.rows.forEach(([name, value]) => {
        let key = document.createElement('div');
        key.style.cssText = 'opacity:0.65;white-space:nowrap;';
        key.textContent = name;
        let text = document.createElement('div');
        text.textContent = value;
        table.appendChild(key);
        table.appendChild(text);
      });
      card.appendChild(table);
    }

    // Beside the node, on the side that covers the fewest of its neighbours (what a selection
    // lights up), inside what shows of the canvas (not under a panel). When every side covers
    // some (a hub, a node zoomed in on), just outside the neighbourhood, nearest the node; when
    // that fails too (a small screen), along the bottom of what shows. The side it had is kept
    // unless another one is clearly better, so the card doesn't hop as the layout jiggles. When
    // the card fits nowhere at its size (a short screen, a panel open), it tries smaller ones and
    // scrolls, rather than covering its node, a panel or the canvas buttons.
    function place() {
      let layout = ctx.layout;
      if (!layout || !layout.getBody(shown.node.id)) return hide();
      let pos = layout.getNodePosition(shown.node.id);
      let at = ctx.toScreen(pos.x, pos.y || 0, pos.z || 0);
      if (!at) {
        card.style.display = 'none';
        return;
      }
      let rect = ctx.scene.getDrawContext().canvas.getBoundingClientRect();
      if (at.x < 0 || at.y < 0 || at.x > rect.width || at.y > rect.height) {
        // The node is out of view
        card.style.display = 'none';
        return;
      }
      card.style.display = 'block';
      let narrow = rect.width < NARROW;
      if (narrow !== shown.narrow) {
        shown.narrow = narrow;
        shown.size = 0;
      }
      let area = ctx.visibleArea ? ctx.visibleArea() : null;
      if (area && (area.allHidden || area.width !== rect.width || area.height !== rect.height)) area = null;
      let points = neighbourPoints(shown.node);
      // The view's other overlays (a search box, the keys card) stay uncovered too, and so does
      // the node's own label: the pointer may rest on it
      let others = overlayBoxes(rect, card);
      let labels = ctx.get('labelTargets');
      let own = labels ? labels.boxOf(shown.node) : null;
      let avoid = own ? others.concat([own]) : others;
      let sizes = cardSizes(rect, narrow);
      let best = null;
      // A card that had to shrink stays small until what shows changes (see onVisibleAreaChange)
      for (let i = Math.min(shown.size || 0, sizes.length - 1); i < sizes.length && !best; ++i) {
        setSize(sizes[i]);
        best = bestBox(at, rect, area, points, avoid, narrow);
        shown.size = i;
      }
      if (!best && others.length) {
        // No room beside another overlay (the keys card on a short phone): the one opened later
        // wins, and this card is back when it closes
        card.style.display = 'none';
        return;
      }
      if (!best) {
        // Nowhere good: beside the node, inside the canvas, at the smallest size
        let width = card.offsetWidth, height = card.offsetHeight;
        let x = at.x + OFFSET, y = at.y + OFFSET;
        if (x + width > rect.width) x = at.x - OFFSET - width;
        if (y + height > rect.height) y = at.y - OFFSET - height;
        best = {side: null, box: {x: Math.max(0, x), y: Math.max(0, y)}};
      }
      fadeIfMore();
      shown.side = best.side;
      card.style.left = (rect.left + best.box.x) + 'px';
      card.style.top = (rect.top + best.box.y) + 'px';
    }

    // The sizes to try, largest first: {width, height} caps in pixels (0: none)
    function cardSizes(rect, narrow) {
      if (!narrow) return [{width: 0, height: 0}].concat(COMPACT);
      let width = Math.max(160, Math.min(280, rect.width - DOCK_ROOM));
      return [DOCK_HEIGHT].concat(COMPACT.map(size => size.height)).map(height => ({width, height}));
    }

    function setSize(size) {
      let maxWidth = size.width ? size.width + 'px' : natural.maxWidth;
      let maxHeight = size.height ? size.height + 'px' : natural.maxHeight;
      if (card.style.maxWidth !== maxWidth) card.style.maxWidth = maxWidth;
      if (card.style.maxHeight !== maxHeight) {
        card.style.maxHeight = maxHeight;
        card.style.overflowY = maxHeight ? 'auto' : '';
      }
    }

    // Where the card goes at its current size: {side, box, cost}, or null when it fits nowhere
    // clear of its node, what covers the canvas and the other overlays
    function bestBox(at, rect, area, points, others, narrow) {
      let width = card.offsetWidth, height = card.offsetHeight;
      let clear = box => !others.some(b => box.x < b.x + b.width && box.x + width > b.x && box.y < b.y + b.height && box.y + height > b.y);
      let best = null;
      (narrow ? [] : SIDES).forEach(side => {
        let box = boxBeside$1(side, at, width, height);
        if (box.x < 0 || box.y < 0 || box.x + width > rect.width || box.y + height > rect.height) return;
        if (area && area.boxCovered(box.x, box.y, width, height)) return;
        if (!clear(box)) return;
        let cost = covers(box, points) + (side === shown.side ? -0.5 : 0);
        if (!best || cost < best.cost) best = {side, box, cost};
      });
      if (!narrow && (!best || best.cost > 0)) {
        // Every side covers some of what the selection lights up: just outside it, on the side
        // nearest the node, rather than in a far corner
        let hood = around(at, points, rect);
        [
          {x: hood.right + OFFSET, y: at.y - height / 2},
          {x: hood.left - OFFSET - width, y: at.y - height / 2},
          {x: at.x - width / 2, y: hood.bottom + OFFSET},
          {x: at.x - width / 2, y: hood.top - OFFSET - height}
        ].forEach(spot => {
          let box = {
            x: Math.min(Math.max(spot.x, 0), rect.width - width),
            y: Math.min(Math.max(spot.y, 0), rect.height - height),
            width, height
          };
          if (box.x < 0 || box.y < 0 || inside(at, box, width, height, OFFSET)) return;
          if (area && area.boxCovered(box.x, box.y, width, height)) return;
          if (!clear(box)) return;
          let cost = covers(box, points) + (shown.side === 'hood' ? -0.5 : 0);
          let far = Math.hypot(box.x + width / 2 - at.x, box.y + height / 2 - at.y);
          if (!best || cost < best.cost || (cost === best.cost && best.side === 'hood' && far < best.far)) {
            best = {side: 'hood', box, cost, far};
          }
        });
      }
      if (!best || best.cost > 0) {
        // Docked at the bottom of what shows, away from the node: the spot search steps around it
        let node = {x: at.x - OFFSET, y: at.y - OFFSET, width: 2 * OFFSET, height: 2 * OFFSET};
        let spot = area ? area.spot(width, height, DOCK_MARGIN, 'bottom', others.concat([node]))
          : {x: DOCK_MARGIN, y: rect.height - height - DOCK_MARGIN};
        if (spot && spot.y >= 0 && !inside(at, spot, width, height, OFFSET) && clear(spot)) {
          let box = {x: spot.x, y: spot.y, width, height};
          let cost = covers(box, points) + (shown.side === 'dock' ? -0.5 : 0);
          if (!best || cost < best.cost) best = {side: 'dock', box, cost};
        }
      }
      return best;
    }

    // A card that scrolls fades out at its bottom edge while there is more below, so the last
    // visible line doesn't look cut: a strip in the card's own colour sticks to its bottom, so
    // the fade hides the text under it and nothing behind the card shows through
    function fadeIfMore() {
      if (!card) return;
      let more = card.scrollHeight - card.clientHeight - card.scrollTop > 1;
      if (!more) {
        if (fade) fade.style.display = 'none';
        return;
      }
      if (!fade) {
        fade = document.createElement('div');
        fade.setAttribute('aria-hidden', 'true');
      }
      // fill() empties the card
      if (fade.parentNode !== card) card.appendChild(fade);
      let style = getComputedStyle(card);
      let color = style.backgroundColor;
      let rgb = (color.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).join(',');
      fade.style.cssText = 'display:block;position:sticky;pointer-events:none;height:' + FADE + 'px;' +
        'bottom:-' + style.paddingBottom + ';margin:-' + FADE + 'px -' + style.paddingRight + ' -' + style.paddingBottom + ' -' + style.paddingLeft + ';' +
        'background:linear-gradient(to bottom, rgba(' + rgb + ',0), ' + color + ');';
    }

    // The card sits over the canvas: the wheel over it zooms the drawing, as it would without the
    // card, unless the card scrolls (a docked one with more to show). A pinch (Ctrl + wheel)
    // always zooms the drawing, never the page.
    function onCardWheel(e) {
      // Firefox turns line deltas into pixels only if the deltas are read first: read the mode first
      let deltaMode = e.deltaMode;
      if (!e.ctrlKey && !e.metaKey && card.scrollHeight - card.clientHeight > 1) return;
      e.preventDefault();
      let canvas = ctx.scene.getDrawContext().canvas;
      canvas.dispatchEvent(new WheelEvent('wheel', {
        deltaMode, deltaX: e.deltaX, deltaY: e.deltaY, deltaZ: e.deltaZ,
        clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY,
        ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey,
        bubbles: true, cancelable: true
      }));
    }

    // Where the shown node's neighbours are on the canvas (at most NEIGHBOURS of them)
    function neighbourPoints(node) {
      let points = [];
      let layout = ctx.layout;
      ctx.graph.forEachLinkedNode(node.id, other => {
        if (points.length >= NEIGHBOURS$1 || other.id === node.id || !layout.getBody(other.id)) return;
        let p = layout.getNodePosition(other.id);
        let s = ctx.toScreen(p.x, p.y || 0, p.z || 0);
        if (s) points.push(s);
      });
      return points;
    }

    function ensureCard() {
      if (card) return;
      card = document.createElement('div');
      card.setAttribute('role', 'tooltip');
      // It moves with the node it describes: it doesn't hide the canvas (see visible.js)
      card.setAttribute('data-graph-overlay', '');
      card.style.cssText = STYLE + (options.style || '');
      // Its own size caps (STYLE's, or the `style` option's): what a card that shrank goes back to
      natural = {maxWidth: card.style.maxWidth, maxHeight: card.style.maxHeight};
      if (options.className) card.className = options.className;
      card.addEventListener('scroll', fadeIfMore, {passive: true});
      card.addEventListener('wheel', onCardWheel, {passive: false});
      // The pointer can move onto the tooltip without it closing
      card.addEventListener('pointerenter', () => { overCard = true; clearTimeout(lingering); });
      card.addEventListener('pointerleave', () => {
        overCard = false;
        if (shown && shown.source === 'hover' && !hoverNode) hide();
      });
      document.body.appendChild(card);
    }

    function onGraphChanged(changes) {
      if (!shown) return;
      changes.forEach(change => {
        if (change.changeType === 'remove' && change.node && shown && change.node.id === shown.node.id) hide();
      });
    }
  }
};

/**
 * What the default tooltip shows: {title, rows}, with rows of [name, value] text: the id when the
 * title (`label`, default the id) is something else, the number of links, then the fields of
 * `node.data` (or `data` itself when it isn't an object).
 */
function describeNode(node, graph, label) {
  let rows = [];
  let title = label === undefined || label === null ? String(node.id) : String(label);
  if (title !== String(node.id)) rows.push(['id', String(node.id)]);
  let links = 0;
  if (graph && graph.forEachLinkedNode) graph.forEachLinkedNode(node.id, () => { links += 1; });
  rows.push(['links', String(links)]);
  let data = node.data;
  if (data !== undefined && data !== null) {
    if (typeof data === 'object' && !Array.isArray(data)) {
      let names = Object.keys(data);
      names.slice(0, MAX_FIELDS).forEach(name => rows.push([name, valueText(data[name])]));
      if (names.length > MAX_FIELDS) rows.push(['…', `${names.length - MAX_FIELDS} more`]);
    } else {
      rows.push(['data', valueText(data)]);
    }
  }
  return {title, rows};
}

function valueText(value) {
  let text;
  if (typeof value === 'number') text = Number.isInteger(value) ? String(value) : String(+value.toPrecision(6));
  else if (typeof value === 'string') text = value;
  else {
    try { text = JSON.stringify(value); } catch (_) { text = String(value); }
    if (text === undefined) text = String(value);
  }
  return text.length > MAX_VALUE ? text.slice(0, MAX_VALUE - 1) + '…' : text;
}

// navigate: keyboard and screen-reader access to the nodes.
//
//   view.use(navigateNodes);
//
// The canvas is one tab stop. On it:
//   Enter        focuses the selected node, the hovered one, or else the labelled node nearest
//                the middle of what shows (a name the visitor can see); on a
//                focused node it is a tap: it selects (Shift adds, Cmd/Ctrl toggles) and keeps
//                its tooltip open, exactly as a click or a tap would
//   arrows       move focus to the nearest node in that direction (with no node focused, the
//                arrows move the camera, as before)
//   ] and [      walk the neighbours of the node you started from, strongest link first
//   Space        walks into the focused node: its neighbours are next; Backspace goes back
//   Shift+arrows move the focused node (Alt for small steps); releasing Shift drops it, like the
//                end of a drag: the keyboard way to do what dragging does
//   Escape       one layer at a time: a move in progress, then (after the tooltip and the
//                selection) the focus
//   ?            lists these keys
// Tab always leaves the canvas.
//
// A polite live region says where focus went: the node's label, its links, whether it is
// selected or pinned, and its place among the neighbours being walked. The camera follows focus.
// The FOCUSED flag shows only while the canvas has keyboard focus, and the keys above act only
// while it shows. Clicking a node moves the keyboard's place there without a focus ring: the
// arrows still move the camera, and Enter shows the focus on the clicked node.
//
// Events: 'focus' ({node, previous, reason}); a move fires 'dragstart', 'drag' and 'dragend'
// with pointerType 'keyboard'. Other modules reach it as ctx.get('focus').
//
// Options:
// - `pinOnDrop` (false): leave a node moved with the keys pinned.
// - `help` (true): ? shows a card with the keys.
// - `announce` (true): speak through a live region.
//
// API: focus(node), get(), clear(), announce(text).

const DIRECTIONS = {
  ArrowRight: {x: 1, y: 0, name: 'to the right'},
  ArrowLeft: {x: -1, y: 0, name: 'to the left'},
  ArrowUp: {x: 0, y: -1, name: 'above'},
  ArrowDown: {x: 0, y: 1, name: 'below'}
};
// Pixels a node moves per key press (Alt: fine steps)
const STEP = 10, FINE_STEP = 1;

// Pointer gestures: the same for a mouse, a pen and a finger (only the reach differs)
const GESTURES = [
  ['Drag a node or its label', 'moves it; what lights up is what moves'],
  ['Drag the background', 'pans; so does a right or middle drag'],
  ['Two fingers', 'pinch to zoom and pan, also while one holds a node'],
  ['Wheel, pinch', 'zoom; a trackpad’s two-finger swipe sideways pans'],
  ['Double click or tap', 'zoom in; a two-finger tap zooms out'],
  ['Click or tap a node', 'its details and neighbours; Shift adds, Cmd/Ctrl toggles; the background clears'],
  ['Shift drag, or long press', 'on the background: a box that selects'],
  ['Right or Alt drag, twist', 'rotate and tilt (3D)']
];

const HELP = [
  ['Enter', 'focus a node; on a focused node, select it (Shift adds, Cmd/Ctrl toggles)'],
  ['Arrows', 'nearest node in that direction'],
  ['] and [', 'next and previous neighbour'],
  ['Space', 'walk into the focused node’s neighbours'],
  ['Backspace', 'back to where the walk came from'],
  ['Shift+arrows', 'move the node (Alt: small steps); release Shift to drop it'],
  ['/', 'search'],
  ['Escape', 'close, clear, then leave the nodes'],
  ['WASD, + and −', 'move and zoom the camera'],
  ['Q E, R F', 'turn and tilt the camera (3D)']
];

const CARD_STYLE = 'position:fixed;z-index:2147483646;max-width:360px;padding:8px 10px;border-radius:4px;' +
  'background:rgba(9,22,44,0.96);color:#e8f1ff;border:1px solid rgba(255,255,255,0.18);' +
  'font:12px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 2px 10px rgba(0,0,0,0.45);';
const HIDDEN_STYLE = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;' +
  'overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;';

var navigateNodes = {
  name: 'navigate',
  attach(ctx, options = {}) {
    let canvas = ctx.scene.getDrawContext().canvas;
    let graph = ctx.graph;
    // The keyboard's place, and whether its FOCUSED flag shows
    let current = null;
    let showing = false;
    // Neighbours being walked: {anchor, list: [{node, link, weight}], index}
    let walk = null;
    let back = [];
    // A move with Shift+arrows: {node, body, start, wasPinned, layout}
    let nudge = null;
    let live = options.announce === false ? null : createLiveRegion();
    let help = null;
    let savedAria = saveAttributes(canvas, ['role', 'aria-roledescription', 'aria-label']);

    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-roledescription', 'graph');
    describeCanvas();
    canvas.addEventListener('focus', onCanvasFocus);
    canvas.addEventListener('blur', onCanvasBlur);
    graph.on('changed', onGraphChanged);
    // A click or tap on a node moves the keyboard's place there (no focus ring until a key)
    ctx.on('tap', e => {
      if (e.pointerType !== 'keyboard' && e.node) place(e.node);
    });

    // Escape first ends what is in progress here (a move, the keys card), before the tooltip or the
    // selection; like a pointer drag, which also comes first
    ctx.input.add({
      name: 'navigate-escape',
      priority: 15,
      key(e) {
        if (e.key !== 'Escape') return false;
        if (nudge) {
          finishNudge(true);
          return true;
        }
        if (help) {
          closeHelp();
          return true;
        }
        return false;
      }
    });
    ctx.input.add({
      name: 'navigate',
      priority: 40,
      key,
      keyup(e) {
        if (e.key === 'Shift' && nudge) finishNudge(false);
      },
      blur() {
        if (nudge) finishNudge(false);
      }
    });

    let api = {
      focus: node => focus(node, 'api'),
      get: () => current,
      clear,
      announce: say,
      /** Shows or hides the help card (keys and gestures); with no argument it toggles */
      help(show) {
        if (show === undefined ? !help : show) {
          if (!help) toggleHelp();
        } else {
          closeHelp();
        }
        return !!help;
      }
    };
    ctx.provide('focus', {get: () => current, set: (node, reason) => focus(node, reason || 'api'), clear});
    ctx.provide('announce', say);

    return Object.assign(api, {
      dispose() {
        if (nudge) finishNudge(true);
        hideFlag();
        closeHelp();
        canvas.removeEventListener('focus', onCanvasFocus);
        canvas.removeEventListener('blur', onCanvasBlur);
        graph.off('changed', onGraphChanged);
        restoreAttributes(canvas, savedAria);
        if (live && live.parentNode) live.parentNode.removeChild(live);
        live = null;
        current = null;
      }
    });

    function key(e) {
      if (e.ctrlKey && e.key !== 'Enter' || e.metaKey && e.key !== 'Enter') return false;
      if (e.key === '?') {
        if (options.help === false) return false;
        toggleHelp();
        return true;
      }
      if (e.key === 'Enter') {
        if (!current || !showing) {
          let entry = current || entryNode();
          if (!entry) {
            say('This graph has no nodes.');
            return true;
          }
          focus(entry, current ? 'return' : 'enter');
        } else {
          select(e);
        }
        return true;
      }
      if (e.key === 'Escape') {
        if (!current || !showing) return false;
        clear();
        say('Left the nodes. The arrow keys move the camera.');
        return true;
      }
      // The rest acts on a focused node, and only while its focus ring shows: after a click the
      // arrows still move the camera, and Enter shows the focus on the clicked node
      if (!current || !showing) return false;
      let direction = DIRECTIONS[e.key];
      if (direction) {
        if (e.shiftKey) nudgeBy(direction, e.altKey ? FINE_STEP : STEP);
        else moveToward(direction);
        return true;
      }
      if (e.key === ']' || e.key === '[') {
        stepNeighbour(e.key === ']' ? 1 : -1);
        return true;
      }
      if (e.key === ' ' || e.code === 'Space') {
        walkInto();
        return true;
      }
      if (e.key === 'Backspace') {
        walkBack();
        return true;
      }
      return false;
    }

    function focus(node, reason) {
      if (!node || !graph.getNode(node.id)) return;
      let previous = current;
      if (nudge && nudge.node !== node) finishNudge(false);
      hideFlag();
      current = node;
      if (reason !== 'neighbour' && reason !== 'back') {
        walk = null;
        if (reason !== 'walk') back = [];
      }
      showFlag();
      ctx.reveal(node);
      ctx.emit('focus', {node, previous, reason, id: node.id});
      say(describe(node));
    }

    // The keyboard's place without the focus ring (after a click)
    function place(node) {
      if (current === node) return;
      hideFlag();
      current = node;
      walk = null;
      back = [];
    }

    function clear() {
      if (nudge) finishNudge(true);
      let previous = current;
      hideFlag();
      current = null;
      walk = null;
      back = [];
      if (previous) ctx.emit('focus', {node: null, previous, reason: 'clear'});
    }

    function showFlag() {
      if (!current || showing) return;
      ctx.flags.set(current.id, FOCUSED, true);
      showing = true;
    }

    function hideFlag() {
      if (current && showing) ctx.flags.set(current.id, FOCUSED, false);
      showing = false;
    }

    // Where Enter starts: the selected node, else the hovered one, else the labelled node nearest
    // the middle of what the user sees (a name they can read, not a dot among thousands), else
    // any node nearest the middle (a panel may cover part of the canvas)
    function entryNode() {
      let selected = ctx.flags.ids(SELECTED);
      if (selected.length === 1 && graph.getNode(selected[0])) return graph.getNode(selected[0]);
      let hovered = ctx.flags.ids(HOVERED);
      if (hovered.length === 1 && graph.getNode(hovered[0])) return graph.getNode(hovered[0]);
      let screen = ctx.screenPositions();
      let labels = ctx.get('labelTargets');
      let named = labels ? new Set(labels.labelled().map(node => node.id)) : null;
      if (named && !named.size) named = null;
      let best = -1, bestDistance = Infinity;
      let cx = screen.width / 2, cy = screen.height / 2;
      let area = ctx.visibleArea();
      let middle = area && area.anyHidden ? area.center() : null;
      if (middle) {
        cx = middle.x;
        cy = middle.y;
      } else {
        area = null;
      }
      for (let pass = named ? 0 : 1; pass < 2 && best < 0; ++pass) {
        for (let i = 0; i < screen.x.length; ++i) {
          if (!screen.onScreen[i] || (area && area.isHidden(screen.x[i], screen.y[i]))) continue;
          if (pass === 0 && !(screen.nodes[i] && named.has(screen.nodes[i].id))) continue;
          let d = (screen.x[i] - cx) * (screen.x[i] - cx) + (screen.y[i] - cy) * (screen.y[i] - cy);
          if (d < bestDistance) { bestDistance = d; best = i; }
        }
      }
      if (best >= 0) return screen.nodes[best];
      // Nothing in view: the node with the most links
      let hub = null, most = -1;
      graph.forEachNode(node => {
        let links = degreeOf$1(graph, node);
        if (links > most) { most = links; hub = node; }
      });
      return hub;
    }

    function moveToward(direction) {
      let screen = ctx.screenPositions();
      let body = ctx.layout.getBody(current.id);
      let row = body ? body.index : -1;
      let next = row >= 0 ? nearestInDirection(screen, row, direction) : -1;
      if (next < 0) {
        say(`No node ${direction.name}.`);
        return;
      }
      focus(screen.nodes[next], 'arrow');
    }

    function stepNeighbour(by) {
      if (!walk) walk = {anchor: current, list: neighboursOf(graph, current, ctx.labelOf), index: -1};
      if (!walk.list.length) {
        say(`${ctx.labelOf(walk.anchor)} has no neighbours.`);
        return;
      }
      let n = walk.list.length;
      walk.index = walk.index < 0 ? (by > 0 ? 0 : n - 1) : (walk.index + by + n) % n;
      focus(walk.list[walk.index].node, 'neighbour');
    }

    function walkInto() {
      if (walk && current !== walk.anchor) back.push(walk.anchor);
      walk = {anchor: current, list: neighboursOf(graph, current, ctx.labelOf), index: -1};
      say(`${ctx.labelOf(current)}: ${plural(walk.list.length, 'neighbour')}.` +
        (walk.list.length ? ' Press ] for the first.' : ''));
    }

    function walkBack() {
      if (!back.length) {
        say(walk ? `Back at ${ctx.labelOf(walk.anchor)}, where the walk started.` : 'Nothing to go back to.');
        if (walk && current !== walk.anchor) focus(walk.anchor, 'back');
        return;
      }
      let anchor = back.pop();
      walk = {anchor, list: neighboursOf(graph, anchor, ctx.labelOf), index: -1};
      focus(anchor, 'back');
    }

    function select(e) {
      let node = current;
      let wasSelected = ctx.flags.has(node.id, SELECTED);
      ctx.input.tap(node, {
        shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey, originalEvent: e
      });
      let selected = ctx.flags.has(node.id, SELECTED);
      if (selected !== wasSelected) {
        let count = ctx.flags.count(SELECTED);
        say(`${ctx.labelOf(node)} ${selected ? 'selected' : 'deselected'}.` + (count > 1 ? ` ${count} selected.` : ''));
      }
    }

    // Shift+arrows: a drag made of key presses. Releasing Shift drops the node.
    function nudgeBy(direction, step) {
      let layout = ctx.layout;
      if (!nudge) {
        let e = ctx.emit('dragstart', {node: current, nodes: [current], id: current.id, pointerType: 'keyboard'});
        if (e.defaultPrevented) return;
        let body = layout.getBody(current.id);
        let start = new Float64Array(body.pos.array.subarray(body.pos.offset, body.pos.offset + layout.simulator.store.D));
        nudge = {node: current, body, start, layout, wasPinned: layout.isNodePinned(current), moved: false};
        layout.pinNode(current, true);
        body.velocity.reset();
        ctx.flags.set(current.id, DRAGGED, true);
      }
      let pos = nudge.body.pos, D = nudge.start.length;
      let x = pos.array[pos.offset], y = D > 1 ? pos.array[pos.offset + 1] : 0, z = D > 2 ? pos.array[pos.offset + 2] : 0;
      let at = ctx.toScreen(x, y, z);
      if (!at) return;
      let target = ctx.fromScreen(at.x + direction.x * step, at.y + direction.y * step, D > 2 ? [x, y, z] : null);
      if (!target) return;
      let args = [current.id];
      for (let k = 0; k < D; ++k) args.push(k < 3 ? target[k] : pos.array[pos.offset + k]);
      layout.setNodePosition.apply(layout, args);
      nudge.moved = true;
      ctx.view.invalidate();
      ctx.reveal(current);
      ctx.emit('drag', {node: current, nodes: [current], id: current.id, pointerType: 'keyboard'});
    }

    function finishNudge(cancelled) {
      let move = nudge;
      nudge = null;
      let {node, layout, body} = move;
      ctx.flags.set(node.id, DRAGGED, false);
      if (layout === ctx.layout && graph.getNode(node.id)) {
        if (cancelled) {
          let args = [node.id].concat(Array.from(move.start));
          layout.setNodePosition.apply(layout, args);
        }
        layout.pinNode(node, move.wasPinned || (!!options.pinOnDrop && !cancelled));
        body.velocity.reset();
        ctx.view.invalidate();
      }
      ctx.emit('dragend', {node, nodes: [node], id: node.id, cancelled, pointerType: 'keyboard'});
      if (move.moved) say(cancelled ? `Put ${ctx.labelOf(node)} back.` : `Moved ${ctx.labelOf(node)}.`);
    }

    function describe(node) {
      let parts = [ctx.labelOf(node) + '.'];
      let links = degreeOf$1(graph, node);
      if (walk && node !== walk.anchor && walk.index >= 0 && walk.list[walk.index].node === node) {
        let entry = walk.list[walk.index];
        parts.push(`Neighbour ${walk.index + 1} of ${walk.list.length} of ${ctx.labelOf(walk.anchor)}` +
          (entry.weight !== null ? `, link weight ${entry.weight}.` : '.'));
      }
      parts.push(plural(links, 'link') + '.');
      if (ctx.flags.has(node.id, SELECTED)) parts.push('Selected.');
      if (ctx.layout && ctx.layout.getBody(node.id) && ctx.layout.isNodePinned(node)) parts.push('Pinned.');
      return parts.join(' ');
    }

    function describeCanvas() {
      canvas.setAttribute('aria-label', `Graph with ${plural(graph.getNodesCount(), 'node')} and ${plural(graph.getLinksCount(), 'link')}`);
    }

    function onCanvasFocus() {
      let byKeyboard = false;
      try { byKeyboard = canvas.matches(':focus-visible'); } catch (_) { byKeyboard = false; }
      if (!byKeyboard) return;
      if (current) {
        showFlag();
        say(describe(current));
      } else {
        say(`Graph with ${plural(graph.getNodesCount(), 'node')} and ${plural(graph.getLinksCount(), 'link')}. ` +
          'Enter focuses a node, slash searches, question mark lists the keys.');
      }
    }

    function onCanvasBlur() {
      // The ring shows only while the canvas has focus; the place is kept for coming back
      hideFlag();
    }

    function onGraphChanged(changes) {
      describeCanvas();
      changes.forEach(change => {
        if (change.changeType !== 'remove' || !change.node) return;
        let id = change.node.id;
        if (current && current.id === id) clear();
        if (walk) {
          if (walk.anchor.id === id) walk = null;
          else walk.list = walk.list.filter(entry => entry.node.id !== id);
        }
        back = back.filter(node => node.id !== id);
      });
    }

    function say(text) {
      if (!live) return;
      // The same words twice still get read: alternate a trailing no-break space
      live.textContent = live.textContent === text ? text + ' ' : text;
    }

    function toggleHelp() {
      if (help) return closeHelp();
      help = document.createElement('div');
      help.style.cssText = CARD_STYLE;
      help.setAttribute('data-graph-overlay', '');
      help.setAttribute('role', 'dialog');
      help.setAttribute('aria-label', 'Keys and gestures');
      let keys = keyRows();
      // A finger first sees what fingers do; a keyboard first sees the keys
      let coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
      let sections = coarse ? [['Gestures', GESTURES], ['Keys', keys]] : [['Keys', keys], ['Gestures', GESTURES]];
      sections.forEach(([name, rows], i) => {
        let title = document.createElement('div');
        title.style.cssText = 'font-weight:600;margin:' + (i ? '8px' : '0') + ' 0 4px;';
        title.textContent = name;
        help.appendChild(title);
        let table = document.createElement('div');
        table.style.cssText = 'display:grid;grid-template-columns:auto 1fr;column-gap:10px;';
        rows.forEach(([what, does]) => {
          let k = document.createElement('div');
          k.style.cssText = 'white-space:nowrap;font-weight:600;';
          k.textContent = what;
          let w = document.createElement('div');
          w.style.cssText = 'opacity:0.8;';
          w.textContent = does;
          table.appendChild(k);
          table.appendChild(w);
        });
        help.appendChild(table);
      });
      help.style.overflowY = 'auto';
      document.body.appendChild(help);
      // At the top of what shows, not under a panel, and clear of buttons along the bottom
      let area = ctx.visibleArea && ctx.visibleArea();
      let free = area && area.largestRect();
      if (free) {
        // narrow enough to fit what shows with a margin (a phone is barely wider than the card)
        help.style.maxWidth = Math.max(200, Math.min(360, free.width - 40)) + 'px';
        help.style.maxHeight = Math.max(120, free.height - 24 - 56) + 'px';
      }
      placeOverCanvas(help, canvas, area, 'top');
      say('Keys: ' + keys.map(([name, what]) => `${name}: ${what}`).join('. ') + '. Gestures: ' +
        GESTURES.map(([gesture, what]) => `${gesture}: ${what}`).join('. ') + '.');
    }

    // The keys, with those of other modules that say so (fit's key)
    function keyRows() {
      let rows = HELP.slice();
      let fit = ctx.get('fit');
      if (fit && fit.key) rows.splice(rows.length - 1, 0, [fit.key, 'fit the whole graph, and follow it']);
      return rows;
    }

    function closeHelp() {
      if (help && help.parentNode) help.parentNode.removeChild(help);
      help = null;
    }
  }
};

/**
 * The row nearest `from` in a direction ({x, y}, a unit step on the screen), among rows in front
 * of the camera, or -1. Rows within about 63° of the direction count, and one that is off to the
 * side counts as twice as far, so the arrow goes where the eye expects.
 */
function nearestInDirection(screen, from, direction) {
  let x0 = screen.x[from], y0 = screen.y[from];
  let best = -1, bestScore = Infinity;
  for (let i = 0; i < screen.x.length; ++i) {
    if (i === from) continue;
    let dx = screen.x[i] - x0, dy = screen.y[i] - y0;
    if (dx !== dx || dy !== dy) continue; // NaN: behind the camera
    let along = dx * direction.x + dy * direction.y;
    if (along <= 0.5) continue;
    let across = Math.abs(dx * direction.y - dy * direction.x);
    if (across > 2 * along) continue;
    let score = along + 2 * across;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

/**
 * A node's neighbours, each once: [{node, link, weight}], strongest link first (link data
 * `weight` or `value`, when they are numbers), then the neighbours with more links, then by label.
 */
function neighboursOf(graph, node, labelOf) {
  let byId = new Map();
  graph.forEachLinkedNode(node.id, (other, link) => {
    if (other.id === node.id) return;
    let weight = linkWeight(link);
    let known = byId.get(other.id);
    if (!known) byId.set(other.id, {node: other, link, weight});
    else if (weight !== null && (known.weight === null || weight > known.weight)) {
      known.weight = weight;
      known.link = link;
    }
  });
  let list = Array.from(byId.values());
  let degree = new Map();
  list.forEach(entry => degree.set(entry.node.id, degreeOf$1(graph, entry.node)));
  list.sort((a, b) => {
    let wa = a.weight === null ? -Infinity : a.weight, wb = b.weight === null ? -Infinity : b.weight;
    if (wa !== wb) return wb - wa;
    let da = degree.get(a.node.id), db = degree.get(b.node.id);
    if (da !== db) return db - da;
    let la = labelOf ? labelOf(a.node) : String(a.node.id), lb = labelOf ? labelOf(b.node) : String(b.node.id);
    return la < lb ? -1 : la > lb ? 1 : 0;
  });
  return list;
}

function linkWeight(link) {
  let data = link && link.data;
  if (typeof data === 'number') return data;
  if (data && typeof data === 'object') {
    if (typeof data.weight === 'number') return data.weight;
    if (typeof data.value === 'number') return data.value;
  }
  return null;
}

function degreeOf$1(graph, node) {
  let links = 0;
  graph.forEachLinkedNode(node.id, () => { links += 1; });
  return links;
}

function plural(count, word) {
  return `${count.toLocaleString('en-US')} ${word}${count === 1 ? '' : 's'}`;
}

function createLiveRegion() {
  if (typeof document === 'undefined') return null;
  let region = document.createElement('div');
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'true');
  region.setAttribute('data-graph-announcer', '');
  region.setAttribute('data-graph-overlay', '');
  region.style.cssText = HIDDEN_STYLE;
  document.body.appendChild(region);
  return region;
}

function saveAttributes(element, names) {
  let saved = {};
  names.forEach(name => { saved[name] = element.getAttribute ? element.getAttribute(name) : null; });
  return saved;
}

function restoreAttributes(element, saved) {
  Object.keys(saved).forEach(name => {
    if (saved[name] === null) element.removeAttribute(name);
    else element.setAttribute(name, saved[name]);
  });
}

// search: find a node by its label (or id) and go to it.
//
//   view.use(searchNodes);                  // '/' on the canvas opens a search box
//   const search = view.use(searchNodes);
//   search.open('Val');
//
// Typing lists the best matches: labels that start with the text, then labels with a word that
// starts with it, then labels that contain it, then ids; nodes with more links first in each
// group. Up and Down move through the list; Enter (or a click) goes to the node. With the
// navigate module the node gets keyboard focus (and its tooltip shows); without it, going to a
// node is a tap on it. The camera brings it into view. Escape closes the box and gives the keys
// back to the canvas.
//
// The box is an ARIA combobox with a listbox, so screen readers read the matches.
//
// Events: 'search' ({node, query}) when a node is picked.
// Options: `limit` (8), `key` ('/'), `placeholder` ('Find a node').
// API: open(text), close(), find(text) (the matching nodes), dispose().
//
// The box opens at the top of what shows of the canvas, beside a panel that covers part of it
// rather than under it (see the view's visible area).

// Height kept free below the box's top for the list of matches (CSS pixels)
const RESULTS_ROOM = 260;
const ROOT_STYLE = 'position:fixed;z-index:2147483646;width:300px;max-width:calc(100vw - 24px);padding:6px;' +
  'border-radius:4px;background:rgba(9,22,44,0.96);border:1px solid rgba(255,255,255,0.18);' +
  'box-shadow:0 2px 10px rgba(0,0,0,0.45);font:13px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;color:#e8f1ff;';
const INPUT_STYLE = 'width:100%;box-sizing:border-box;padding:5px 7px;border-radius:3px;border:1px solid rgba(255,255,255,0.3);' +
  'background:rgba(0,0,0,0.35);color:inherit;font:inherit;outline-offset:1px;';
const LIST_STYLE = 'list-style:none;margin:4px 0 0;padding:0;max-height:50vh;overflow:auto;';
const OPTION_STYLE = 'display:flex;justify-content:space-between;gap:8px;padding:3px 6px;border-radius:3px;cursor:pointer;';

let searchBoxes = 0;

var searchNodes = {
  name: 'search',
  attach(ctx, options = {}) {
    let limit = options.limit || 8;
    let openKey = options.key || '/';
    let canvas = ctx.scene.getDrawContext().canvas;
    let index = null;
    let box = null;
    // The last pointer on the page: after a touch or a pen, Enter is a soft keyboard's Go key, and
    // the canvas takes focus without the keyboard's ring (as after a tap on a result)
    let lastPointer = 'mouse';
    let notePointer = e => { lastPointer = e.pointerType || 'mouse'; };
    window.addEventListener('pointerdown', notePointer, true);
    let listId = 'graph-search-' + (++searchBoxes);

    ctx.input.add({
      name: 'search',
      priority: 35,
      key(e) {
        if (e.key !== openKey || e.ctrlKey || e.metaKey || e.altKey) return false;
        open('');
        return true;
      }
    });
    ctx.graph.on('changed', forget);
    // A turned phone or a resized window: the box goes again where the canvas shows
    let onResize = () => {
      if (!box || box.root.style.display === 'none') return;
      setTimeout(() => placeOverCanvas(box.root, canvas, ctx.visibleArea(), 'top', RESULTS_ROOM), 300);
    };
    window.addEventListener('resize', onResize);

    return {
      open,
      close: () => close(false),
      find: text => findNodes(getIndex(), text, limit).map(match => match.node),
      dispose() {
        close(false);
        ctx.graph.off('changed', forget);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('pointerdown', notePointer, true);
      }
    };

    function forget() {
      index = null;
    }

    function getIndex() {
      if (!index) index = buildSearchIndex(ctx.graph, ctx.labelOf);
      return index;
    }

    function open(text) {
      if (!box) createBox();
      box.input.value = text || '';
      box.root.style.display = 'block';
      // At the top of what shows, not under a panel, with room for the results below it
      placeOverCanvas(box.root, canvas, ctx.visibleArea(), 'top', RESULTS_ROOM);
      box.input.focus({preventScroll: true});
      update();
    }

    // `byPointer`: the pick was a click or a tap, so the canvas takes focus without the keyboard's
    // focus ring (browsers that ignore focusVisible decide themselves)
    function close(backToCanvas, byPointer) {
      if (!box || box.root.style.display === 'none') return;
      box.root.style.display = 'none';
      box.input.setAttribute('aria-expanded', 'false');
      box.input.removeAttribute('aria-activedescendant');
      if (backToCanvas && canvas.focus) canvas.focus(byPointer ? {preventScroll: true, focusVisible: false} : {preventScroll: true});
    }

    function createBox() {
      let root = document.createElement('div');
      root.style.cssText = ROOT_STYLE;
      root.setAttribute('role', 'search');
      root.setAttribute('data-graph-overlay', '');
      let input = document.createElement('input');
      input.type = 'search';
      input.style.cssText = INPUT_STYLE;
      input.placeholder = options.placeholder || 'Find a node';
      input.setAttribute('role', 'combobox');
      input.setAttribute('aria-label', 'Find a node');
      input.setAttribute('aria-autocomplete', 'list');
      input.setAttribute('aria-expanded', 'false');
      input.setAttribute('aria-controls', listId);
      input.autocomplete = 'off';
      input.spellcheck = false;
      let list = document.createElement('ul');
      list.id = listId;
      list.setAttribute('role', 'listbox');
      list.setAttribute('aria-label', 'Matching nodes');
      list.style.cssText = LIST_STYLE;
      let status = document.createElement('div');
      status.setAttribute('aria-live', 'polite');
      status.style.cssText = 'opacity:0.65;font-size:12px;margin-top:3px;';
      root.appendChild(input);
      root.appendChild(list);
      root.appendChild(status);
      document.body.appendChild(root);

      input.addEventListener('input', update);
      input.addEventListener('keydown', onKey);
      root.addEventListener('focusout', () => {
        // Closes when focus leaves the box (Tab, a click elsewhere)
        setTimeout(() => { if (box && !box.root.contains(document.activeElement)) close(false); }, 0);
      });
      // A click on an option keeps focus in the input until the pick
      list.addEventListener('pointerdown', e => e.preventDefault());
      list.addEventListener('click', e => {
        let option = e.target.closest('[role=option]');
        if (option) pick(+option.dataset.index, true);
      });
      box = {root, input, list, status, matches: [], active: -1};
    }

    function update() {
      let query = box.input.value;
      let matches = findNodes(getIndex(), query, limit);
      box.matches = matches;
      box.active = matches.length ? 0 : -1;
      render(query);
    }

    function render(query) {
      let {list, input, status, matches} = box;
      list.textContent = '';
      matches.forEach((match, i) => {
        let option = document.createElement('li');
        option.id = `${listId}-${i}`;
        option.setAttribute('role', 'option');
        option.dataset.index = i;
        option.style.cssText = OPTION_STYLE;
        let label = document.createElement('span');
        label.textContent = match.label;
        label.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        let links = document.createElement('span');
        links.textContent = match.degree === 1 ? '1 link' : `${match.degree} links`;
        links.style.cssText = 'opacity:0.6;white-space:nowrap;font-size:12px;';
        option.appendChild(label);
        option.appendChild(links);
        list.appendChild(option);
      });
      input.setAttribute('aria-expanded', matches.length ? 'true' : 'false');
      highlight();
      let total = matches.total || 0;
      status.textContent = !query.trim() ? '' :
        total === 0 ? 'No matches' :
        total > matches.length ? `${total.toLocaleString('en-US')} matches, the first ${matches.length} shown` :
        total === 1 ? '1 match' : `${total} matches`;
    }

    function highlight() {
      let items = box.list.children;
      for (let i = 0; i < items.length; ++i) {
        let on = i === box.active;
        items[i].setAttribute('aria-selected', on ? 'true' : 'false');
        items[i].style.background = on ? 'rgba(255,255,255,0.16)' : '';
      }
      if (box.active >= 0) {
        box.input.setAttribute('aria-activedescendant', `${listId}-${box.active}`);
        if (items[box.active] && items[box.active].scrollIntoView) items[box.active].scrollIntoView({block: 'nearest'});
      } else {
        box.input.removeAttribute('aria-activedescendant');
      }
    }

    function onKey(e) {
      let count = box.matches.length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!count) return;
        box.active = (box.active + (e.key === 'ArrowDown' ? 1 : -1) + count) % count;
        highlight();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (box.active >= 0) pick(box.active, lastPointer === 'touch' || lastPointer === 'pen');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close(true);
      }
    }

    function pick(i, byPointer) {
      let match = box.matches[i];
      if (!match) return;
      let query = box.input.value;
      close(true, byPointer);
      let node = match.node;
      let focus = ctx.get('focus');
      if (focus) focus.set(node, 'search');
      else ctx.reveal(node);
      // Found reads as picked: the node is selected as a tap would (its ring, its links lit, the
      // rest dimmed, the tooltip kept), so it stands out on any graph
      ctx.input.tap(node, {});
      ctx.emit('search', {node, id: node.id, query});
    }
  }
};

/** What search looks in: one entry per node with its label, lowercased text and links */
function buildSearchIndex(graph, labelOf) {
  let entries = [];
  graph.forEachNode(node => {
    let label = labelOf ? labelOf(node) : String(node.id);
    let links = 0;
    graph.forEachLinkedNode(node.id, () => { links += 1; });
    entries.push({node, label, text: label.toLowerCase(), id: String(node.id).toLowerCase(), degree: links});
  });
  return entries;
}

/**
 * The best `limit` matches of `query`: [{node, label, degree, rank}] with `total`, the number of
 * all matches. Ranks: 0 the label starts with it, 1 a word of the label does, 2 the label contains
 * it, 3 the id does. Within a rank, more links first, then the label (ignoring case).
 */
function findNodes(index, query, limit = 8) {
  let q = (query || '').trim().toLowerCase();
  let best = [];
  best.total = 0;
  if (!q) return best;
  for (let i = 0; i < index.length; ++i) {
    let entry = index[i];
    let rank = rankOf(entry, q);
    if (rank < 0) continue;
    best.total += 1;
    // Keep the best `limit` so far, sorted (insertion into a short list)
    if (best.length === limit && !better(rank, entry, best[limit - 1])) continue;
    let match = {node: entry.node, label: entry.label, text: entry.text, degree: entry.degree, rank};
    let at = best.length;
    while (at > 0 && better(rank, entry, best[at - 1])) at -= 1;
    best.splice(at, 0, match);
    if (best.length > limit) best.pop();
  }
  return best;
}

function rankOf(entry, q) {
  let text = entry.text;
  let at = text.indexOf(q);
  if (at === 0) return 0;
  if (at > 0) {
    while (at > 0) {
      if (!isWordCharacter(text.charCodeAt(at - 1))) return 1;
      at = text.indexOf(q, at + 1);
    }
    return 2;
  }
  if (entry.id !== text && entry.id.indexOf(q) >= 0) return 3;
  return -1;
}

function better(rank, entry, match) {
  if (rank !== match.rank) return rank < match.rank;
  if (entry.degree !== match.degree) return entry.degree > match.degree;
  return entry.text < match.text;
}

function isWordCharacter(code) {
  // Letters and digits (Latin, and anything above ASCII counts as a letter)
  return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code > 127;
}

// Label images. Each label is drawn once with the canvas 2D API (so any script, with the
// browser's kerning and shaping) into a canvas that mirrors a texture, at the device's pixel
// ratio, so text stays sharp at its fixed size on screen. The text is drawn red over a green halo:
// once in a texture (premultiplied), red is the text's coverage and green the halo's, and the
// shader colors each.
//
// Space is handed out in shelves (rows of equal height). When the atlas is full it starts over,
// and whoever asks for a label again draws it again.

const WIDTH = 2048, HEIGHT = 1024;
// Pixels kept clear around each image, so filtering never reads a neighbour
const PAD = 1;

function createLabelAtlas(gl) {
  let canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  let context = canvas.getContext('2d', {willReadFrequently: true});
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, WIDTH, HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  let shelves = [];
  let bottom = 0;
  let entries = new Map();
  let dirty = null;
  let generation = 0;

  return {
    texture,
    width: WIDTH,
    height: HEIGHT,
    /** Increases every time the atlas starts over (entries from before are gone) */
    get generation() { return generation; },
    get(key) {
      return entries.get(key);
    },
    /** Width of `text` in `font` (a CSS font), in the font's pixels */
    measure(text, font) {
      context.font = font;
      return context.measureText(text).width;
    },
    /**
     * Draws `text` in `font` (CSS font, sized in device pixels) with a halo `halo` device pixels
     * wide, into a box of `width` x `height` device pixels. Returns {x, y, width, height} in the
     * atlas, or null when it is full.
     */
    add(key, text, font, halo, width, height) {
      let known = entries.get(key);
      if (known) return known;
      let at = allocate(width + 2 * PAD, height + 2 * PAD);
      if (!at) return null;
      let entry = {x: at.x + PAD, y: at.y + PAD, width, height};
      context.save();
      context.beginPath();
      context.rect(entry.x, entry.y, width, height);
      context.clip();
      context.font = font;
      context.textBaseline = 'middle';
      context.textAlign = 'left';
      context.lineJoin = 'round';
      let x = entry.x + halo + 1, y = entry.y + height / 2;
      if (halo > 0) {
        context.lineWidth = 2 * halo;
        context.strokeStyle = '#00ff00';
        context.strokeText(text, x, y);
      }
      context.fillStyle = '#ff0000';
      context.fillText(text, x, y);
      context.restore();
      entries.set(key, entry);
      grow(entry);
      return entry;
    },
    /** Sends what was drawn since the last call to the texture */
    upload() {
      if (!dirty) return;
      let x = dirty.x0, y = dirty.y0, w = dirty.x1 - dirty.x0, h = dirty.y1 - dirty.y0;
      dirty = null;
      if (w <= 0 || h <= 0) return;
      let image = context.getImageData(x, y, w, h);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    },
    /** Forgets every image */
    reset() {
      context.clearRect(0, 0, WIDTH, HEIGHT);
      shelves = [];
      bottom = 0;
      entries.clear();
      generation += 1;
      // The texture keeps its old pixels: every new image (and its padding) is uploaded over them
    },
    dispose() {
      gl.deleteTexture(texture);
      entries.clear();
    }
  };

  function allocate(width, height) {
    if (width > WIDTH) return null;
    for (let i = 0; i < shelves.length; ++i) {
      let shelf = shelves[i];
      if (shelf.height === height && shelf.x + width <= WIDTH) {
        let at = {x: shelf.x, y: shelf.y};
        shelf.x += width;
        return at;
      }
    }
    if (bottom + height > HEIGHT) return null;
    let shelf = {y: bottom, height, x: width};
    shelves.push(shelf);
    bottom += height;
    return {x: 0, y: shelf.y};
  }

  function grow(entry) {
    let x0 = entry.x - PAD, y0 = entry.y - PAD, x1 = entry.x + entry.width + PAD, y1 = entry.y + entry.height + PAD;
    if (!dirty) dirty = {x0, y0, x1, y1};
    else {
      dirty.x0 = Math.min(dirty.x0, x0);
      dirty.y0 = Math.min(dirty.y0, y0);
      dirty.x1 = Math.max(dirty.x1, x1);
      dirty.y1 = Math.max(dirty.y1, y1);
    }
  }
}

// Draws labels: one quad per label, beside its node. The quad keeps only the node's row and which
// side it is on; the shader reads the node's position from the positions texture, so labels follow
// moving nodes and the camera with no work on the CPU between placements. Fades run in the shader
// from a start time and two alphas.

// Floats per label (see LabelBuffer in labels.js)
const STRIDE = 13;

const VERTEX$1 = `
  precision highp float;
  uniform mat4 modelViewProjection;
  uniform vec2 resolution;
  uniform float pixelRatio;
  uniform float gap;
  uniform float time;
  uniform float fadeDuration;
  uniform float dimAlpha;
  uniform vec2 pointedSize;
  uniform vec2 selectedSize;
  // Device pixels a ring adds around pointed and selected nodes (0: no ring)
  uniform vec2 rings;
  ${POSITION_OF}
  attribute vec2 corner; // per vertex, 0..1
  // row, diameter in scene units, side (0 right, 1 left, 2 above, 3 below), and the text's tone
  // (0 to 1), or below 0 for a label in front: -1 at its own place, -2 over the others on a plate
  attribute vec4 node;
  attribute vec2 box;    // width, height in CSS pixels
  attribute vec4 uv;     // the image in the atlas: left, top, right, bottom
  attribute vec3 fade;   // start (seconds), alpha at the start, alpha at the end

  varying vec2 vUv;
  varying float vAlpha;
  varying float vTone;
  varying float vFront;
  void main() {
    vec4 position = positionOf(node.x);
    vec4 clip = modelViewProjection * vec4(position.xyz, 1.0);
    if (clip.w <= 0.0) {
      gl_Position = NOWHERE;
      return;
    }
    vec2 center = (clip.xy / clip.w * 0.5 + 0.5) * resolution;
    // The node's radius in device pixels, as the node program draws it
    float scale = 0.5 * resolution.y * length(vec3(modelViewProjection[0][1], modelViewProjection[1][1], modelViewProjection[2][1])) / clip.w;
    float diameter = node.y * scale;
    float flags = position.w;
    if (hasFlag(flags, 2.0) > 0.5) diameter = max(diameter * selectedSize.x, selectedSize.y);
    // A pointed node is drawn larger; its label makes room only once it is in front, so a pointer
    // passing over nodes doesn't nudge their labels
    float front = 1.0 - step(-0.5, node.w);
    float pointed = isPointed(flags) * front;
    if (pointed > 0.5) diameter = max(diameter * pointedSize.x, pointedSize.y);
    float ring = pointed > 0.5 && rings.x > 0.0 ? rings.x : hasFlag(flags, 2.0) > 0.5 ? rings.y : 0.0;
    float r = 0.5 * diameter + ring + gap * pixelRatio;

    vec2 size = box * pixelRatio;
    vec2 origin;
    if (node.z < 0.5) origin = center + vec2(r, -0.5 * size.y);
    else if (node.z < 1.5) origin = center + vec2(-r - size.x, -0.5 * size.y);
    else if (node.z < 2.5) origin = center + vec2(-0.5 * size.x, r);
    else origin = center + vec2(-0.5 * size.x, -r - size.y);
    // On whole device pixels, so the image maps texel to pixel
    origin = floor(origin + 0.5);
    vec2 at = origin + corner * size;
    gl_Position = vec4(at / resolution * 2.0 - 1.0, 0.0, 1.0);
    // The atlas's rows go down, the screen's go up
    vUv = vec2(mix(uv.x, uv.z, corner.x), mix(uv.w, uv.y, corner.y));

    float t = clamp((time - fade.x) / fadeDuration, 0.0, 1.0);
    float alpha = mix(fade.y, fade.z, t);
    if (isPointed(flags) + hasFlag(flags, 2.0) + hasFlag(flags, 16.0) < 0.5) alpha *= dimAlpha;
    vAlpha = alpha;
    // Pointed and selected nodes' labels at full brightness; others at their tier's tone. A label
    // over the others (-2) is at full brightness on a plate (vTone -1)
    vTone = node.w < -1.5 ? -1.0 : front > 0.5 || isPointed(flags) + hasFlag(flags, 2.0) > 0.5 ? 1.0 : node.w;
    vFront = front;
  }`;

const FRAGMENT$1 = `
  precision mediump float;
  uniform sampler2D atlas;
  uniform vec4 textColor;
  uniform vec4 haloColor;
  varying vec2 vUv;
  varying float vAlpha;
  varying float vTone;
  varying float vFront;
  void main() {
    // Premultiplied: red is the text's coverage, green the halo's where the text isn't
    vec4 texel = texture2D(atlas, vUv);
    float text = texel.r;
    // A label over the others sits on a plate: its whole box in the halo's color
    float plate = vTone < 0.0 ? 1.0 : 0.0;
    // A label in front at its own place knocks out what is under its text with a full halo (its
    // node's lit links are brighter than a resting halo hides), and leaves the rest of the drawing
    float haloAlpha = vFront > 0.5 ? 1.0 : haloColor.a;
    float halo = max(texel.g * haloAlpha, plate * (1.0 - text));
    float alpha = text + halo;
    if (alpha <= 0.0) discard;
    // A dimmer tone mixes the text toward the halo (the background): a grey, not a see-through
    vec3 ink = mix(haloColor.rgb, textColor.rgb, abs(vTone));
    vec3 color = (ink * text + haloColor.rgb * halo) / alpha;
    gl_FragColor = vec4(color, alpha * textColor.a * vAlpha);
  }`;

const QUAD$1 = new Float32Array([0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0]);

function createLabelProgram(gl, instancing) {
  let info = createProgram(gl, VERTEX$1, FRAGMENT$1, ['corner', 'node', 'box', 'uv', 'fade'], [
    'modelViewProjection', 'positions', 'positionsSize', 'resolution', 'pixelRatio', 'gap', 'time',
    'fadeDuration', 'dimAlpha', 'pointedSize', 'selectedSize', 'rings', 'atlas', 'textColor', 'haloColor'
  ]);
  let quad = createBuffer(gl, QUAD$1);
  let instances = gl.createBuffer();
  let capacity = 0;
  let a = info.attributes, u = info.uniforms;

  return {
    /** New label data: `count` labels, STRIDE floats each */
    update(data, count) {
      gl.bindBuffer(gl.ARRAY_BUFFER, instances);
      let bytes = count * STRIDE * 4;
      if (bytes > capacity) {
        capacity = Math.max(bytes, 2 * capacity, 1024);
        gl.bufferData(gl.ARRAY_BUFFER, capacity, gl.DYNAMIC_DRAW);
      }
      if (count) gl.bufferSubData(gl.ARRAY_BUFFER, 0, data.subarray(0, count * STRIDE));
    },
    /**
     * `frame`: what the view passes to layers. `look`: {count, atlas, time (seconds), fade
     * (seconds), gap, textColor, haloColor (vec4s)}.
     */
    draw(frame, look) {
      if (!look.count) return;
      let {positions, mvp, drawContext, style} = frame;
      gl.useProgram(info.program);
      gl.uniformMatrix4fv(u.modelViewProjection, false, mvp);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, positions.texture);
      gl.uniform1i(u.positions, 0);
      gl.uniform2f(u.positionsSize, positions.width, positions.rows);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, look.atlas);
      gl.uniform1i(u.atlas, 1);
      gl.uniform2f(u.resolution, drawContext.width, drawContext.height);
      gl.uniform1f(u.pixelRatio, drawContext.pixelRatio || 1);
      gl.uniform1f(u.gap, look.gap);
      gl.uniform1f(u.time, look.time);
      gl.uniform1f(u.fadeDuration, look.fade);
      gl.uniform1f(u.dimAlpha, style.dimAlpha);
      gl.uniform2fv(u.pointedSize, style.pointedSize);
      gl.uniform2fv(u.selectedSize, style.selectedSize);
      let ring = style.ringSize ? style.ringSize[0] + style.ringSize[1] : 0;
      gl.uniform2f(u.rings, style.pointedRing && style.pointedRing[3] > 0 ? ring : 0, style.selectedRing && style.selectedRing[3] > 0 ? ring : 0);
      gl.uniform4fv(u.textColor, look.textColor);
      gl.uniform4fv(u.haloColor, look.haloColor);

      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(a.corner);
      gl.vertexAttribPointer(a.corner, 2, gl.FLOAT, false, 0, 0);
      instancing.vertexAttribDivisorANGLE(a.corner, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, instances);
      let stride = STRIDE * 4;
      perInstance(a.node, 4, stride, 0);
      perInstance(a.box, 2, stride, 4 * 4);
      perInstance(a.uv, 4, stride, 6 * 4);
      perInstance(a.fade, 3, stride, 10 * 4);
      gl.disable(gl.DEPTH_TEST);
      instancing.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, look.count);
      [a.corner, a.node, a.box, a.uv, a.fade].forEach(location => {
        instancing.vertexAttribDivisorANGLE(location, 0);
        gl.disableVertexAttribArray(location);
      });
      gl.activeTexture(gl.TEXTURE0);
    },
    dispose() {
      gl.deleteBuffer(quad);
      gl.deleteBuffer(instances);
      gl.deleteProgram(info.program);
    }
  };

  function perInstance(location, size, stride, offset) {
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset);
    instancing.vertexAttribDivisorANGLE(location, 1);
  }
}

// Where labels go: a greedy pass over candidates in order of preference, against a grid of screen
// cells. A label sits beside its node (right, left, above or below); a label placed last time
// tries its old side first, so labels don't jump around.

/** The sides a label can take, in the order they are tried */
const ANCHORS = ['right', 'left', 'above', 'below'];
const ANCHOR_INDEX = {right: 0, left: 1, above: 2, below: 3};

/**
 * `candidates`, in order of preference: {row, x, y, radius, width, height, anchor, forced}. x, y
 * and radius are the node's disc on the screen (CSS pixels); width and height the label's box;
 * `anchor` the side it had last time (or null); `forced` labels are placed even where they
 * overlap others (the hovered or selected node's label). A label that had a side last time may
 * come `slack` pixels closer to others than a new one: a layout that jiggles a few pixels must
 * not knock out (or flip) labels that are on screen.
 *
 * `options`: width, height (the canvas), gap (pixels between the disc and the label, 3),
 * padding (pixels kept free around each label, 2), margin (pixels past the canvas edges where
 * labels may still go, 0), max (labels at most, not counting forced ones), cell (grid cell, 32),
 * blocked (`box => boolean`: true where a label can't go, such as under a panel; optional), slack
 * (pixels a label shown last time may overlap the padding and others, 0), spacing ({x, y}: how
 * far apart, in pixels, the nodes of two labels must be; an ellipse, wider than tall as labels
 * are. Labels spread over the drawing instead of packing a crowded part solid. A label shown
 * last time, or a forced one, needs only `keep` (0.7) of it. Optional).
 *
 * Returns [{row, anchor, x, y, width, height}]: the placed labels' boxes (top left corner).
 */
function placeLabels(candidates, options) {
  let gap = options.gap !== undefined ? options.gap : 3;
  let padding = options.padding !== undefined ? options.padding : 2;
  let margin = options.margin || 0;
  let max = options.max !== undefined ? options.max : Infinity;
  let blocked = options.blocked;
  let slack = options.slack;
  let grid = createGrid(options.width, options.height, options.cell || 32, margin);
  let spacing = options.spacing && options.spacing.x > 0 && options.spacing.y > 0 ? createSpacing(options.spacing, options.keep || 0.7) : null;
  let placed = [];
  let free = 0;
  let box = {x: 0, y: 0, width: 0, height: 0};
  for (let i = 0; i < candidates.length; ++i) {
    let c = candidates[i];
    if (!c.forced && free >= max) break;
    // Too near the node of a label placed already (more important, or shown last time)
    if (spacing && !c.forced && spacing.near(c.x, c.y, !!c.anchor)) continue;
    let first = c.anchor && ANCHOR_INDEX[c.anchor] !== undefined ? c.anchor : null;
    // A forced label goes anyway, but where it fits if it can: clear of the others, else inside
    // the canvas (a selected node's name isn't cut at the edge), else on its first side
    for (let level = 2; level >= (c.forced ? 0 : 2); --level) {
      let anchor = sideThatFits(c, first, level);
      if (!anchor) continue;
      boxBeside(c, anchor, gap, box);
      grid.add(box);
      if (spacing) spacing.add(c.x, c.y);
      placed.push({row: c.row, anchor, x: box.x, y: box.y, width: box.width, height: box.height});
      if (!c.forced) free += 1;
      break;
    }
  }
  return placed;

  // The first side (the one it had first) where the label fits: level 2 clear of everything,
  // 1 inside the canvas and not blocked, 0 anywhere
  function sideThatFits(c, first, level) {
    for (let k = first ? -1 : 0; k < ANCHORS.length; ++k) {
      let anchor = k < 0 ? first : ANCHORS[k];
      if (k >= 0 && anchor === first) continue;
      if (level === 0) return anchor;
      boxBeside(c, anchor, gap, box);
      if (box.x < -margin || box.y < -margin || box.x + box.width > options.width + margin ||
          box.y + box.height > options.height + margin) continue;
      if (blocked && blocked(box)) continue;
      // Only on the side it had: a label that has to move is placed like a new one
      if (level === 2 && grid.collides(box, anchor === first ? padding - slack : padding)) continue;
      return anchor;
    }
    return null;
  }
}

/**
 * The side for a label drawn in front of the others (a pointed node's): the one whose box covers
 * the least of `others` ([{x, y, width, height, weight}]: a covered pixel counts `weight` times,
 * 1 by default, so a landmark's name is covered last), inside the canvas and not `blocked` if it
 * can.
 * `c`: {x, y, radius, width, height}; `options`: gap, width, height (the canvas), blocked.
 * Ties go to the first side in ANCHORS.
 */
function frontSide(c, others, options = {}) {
  let gap = options.gap !== undefined ? options.gap : 3;
  let box = {x: 0, y: 0, width: 0, height: 0};
  let best = ANCHORS[0], bestCost = Infinity;
  for (let k = 0; k < ANCHORS.length; ++k) {
    boxBeside(c, ANCHORS[k], gap, box);
    let cost = 0;
    let outside = options.width > 0 && (box.x < 0 || box.y < 0 || box.x + box.width > options.width || box.y + box.height > options.height);
    if (outside || (options.blocked && options.blocked(box))) cost += 1e12;
    for (let i = 0; i < others.length; ++i) {
      let o = others[i];
      let w = Math.min(box.x + box.width, o.x + o.width) - Math.max(box.x, o.x);
      let h = Math.min(box.y + box.height, o.y + o.height) - Math.max(box.y, o.y);
      if (w > 0 && h > 0) cost += w * h * (o.weight || 1);
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = ANCHORS[k];
    }
  }
  return best;
}

/**
 * The label under a point: the last of `boxes` (in drawing order, so the one on top) that holds
 * (x, y), as {node, x, y, radius, front} (its node's disc, and whether it is a label in front), or
 * null. `boxes`: [{node, x, y, width, height, disc: {x, y, radius}, front}].
 */
function labelAt(boxes, x, y) {
  for (let i = boxes.length - 1; i >= 0; --i) {
    let b = boxes[i];
    if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
      return {node: b.node, x: b.disc ? b.disc.x : x, y: b.disc ? b.disc.y : y, radius: b.disc ? b.disc.radius : 0, front: !!b.front};
    }
  }
  return null;
}

/** The box (top left corner and size) of a label on `anchor` side of its node, into `out` */
function boxBeside(c, anchor, gap, out) {
  let w = c.width, h = c.height, r = c.radius + gap;
  if (anchor === 'right') { out.x = c.x + r; out.y = c.y - h / 2; }
  else if (anchor === 'left') { out.x = c.x - r - w; out.y = c.y - h / 2; }
  else if (anchor === 'above') { out.x = c.x - w / 2; out.y = c.y - r - h; }
  else { out.x = c.x - w / 2; out.y = c.y + r; }
  out.width = w;
  out.height = h;
  return out;
}

// Boxes by the cells they cover. Boxes outside the grid still count, in the edge cells.
function createGrid(width, height, cell, margin) {
  let left = -margin, top = -margin;
  let columns = Math.max(1, Math.ceil((width + 2 * margin) / cell));
  let rows = Math.max(1, Math.ceil((height + 2 * margin) / cell));
  let cells = new Array(columns * rows);
  let boxes = [];
  return {
    add(box) {
      let index = boxes.length / 4;
      boxes.push(box.x, box.y, box.x + box.width, box.y + box.height);
      forCells(box, 0, c => {
        (cells[c] || (cells[c] = [])).push(index);
        return false;
      });
    },
    collides(box, padding) {
      let x0 = box.x - padding, y0 = box.y - padding, x1 = box.x + box.width + padding, y1 = box.y + box.height + padding;
      return forCells(box, padding, c => {
        let list = cells[c];
        if (!list) return false;
        for (let i = 0; i < list.length; ++i) {
          let b = list[i] * 4;
          if (boxes[b] < x1 && boxes[b + 2] > x0 && boxes[b + 1] < y1 && boxes[b + 3] > y0) return true;
        }
        return false;
      });
    }
  };

  function forCells(box, padding, visit) {
    let c0 = clamp$1(Math.floor((box.x - padding - left) / cell), columns);
    let c1 = clamp$1(Math.floor((box.x + box.width + padding - left) / cell), columns);
    let r0 = clamp$1(Math.floor((box.y - padding - top) / cell), rows);
    let r1 = clamp$1(Math.floor((box.y + box.height + padding - top) / cell), rows);
    for (let r = r0; r <= r1; ++r) {
      for (let c = c0; c <= c1; ++c) {
        if (visit(r * columns + c)) return true;
      }
    }
    return false;
  }
}

// The nodes of placed labels, hashed by cells as big as the spacing: near(x, y) looks at the 3 x 3
// cells around. Distances are measured in the spacing's ellipse, so it is the same everywhere
// on the screen (no cell edges for labels to pop at as the camera pans).
function createSpacing(spacing, keep) {
  let sx = spacing.x, sy = spacing.y;
  let cells = new Map();
  return {
    add(x, y) {
      let key = keyOf(Math.floor(x / sx), Math.floor(y / sy));
      let list = cells.get(key);
      if (!list) cells.set(key, list = []);
      list.push(x, y);
    },
    near(x, y, shownBefore) {
      let limit = shownBefore ? keep * keep : 1;
      let cx = Math.floor(x / sx), cy = Math.floor(y / sy);
      for (let i = -1; i <= 1; ++i) {
        for (let j = -1; j <= 1; ++j) {
          let list = cells.get(keyOf(cx + i, cy + j));
          if (!list) continue;
          for (let k = 0; k < list.length; k += 2) {
            let dx = (list[k] - x) / sx, dy = (list[k + 1] - y) / sy;
            if (dx * dx + dy * dy < limit) return true;
          }
        }
      }
      return false;
    }
  };
}

function keyOf(i, j) {
  return i * 100003 + j;
}

function clamp$1(value, count) {
  return value < 0 ? 0 : value >= count ? count - 1 : value;
}

// How important each node is, for labels: the most important get their labels first, and bigger.

/**
 * A score per row: `how` is 'degree' (links), 'pagerank', the name of a numeric field of
 * node.data, or `node => number`. `rowOf(id)` gives a node's row, `count` the number of rows.
 * Returns a Float64Array; rows with no node score -Infinity.
 */
function computeImportance(graph, rowOf, count, how = 'degree') {
  let scores = new Float64Array(count).fill(-Infinity);
  if (how === 'pagerank') return pagerank(graph, rowOf, count, scores);
  graph.forEachNode(node => {
    let row = rowOf(node.id);
    if (row < 0 || row >= count) return;
    let score;
    if (typeof how === 'function') score = +how(node);
    else if (how === 'degree') {
      score = 0;
      graph.forEachLinkedNode(node.id, () => { score += 1; });
    } else {
      let value = node.data && node.data[how];
      score = typeof value === 'number' ? value : +value;
    }
    scores[row] = Number.isFinite(score) ? score : 0;
  });
  return scores;
}

/**
 * Rows from the most important to the least. Ties come in a fixed scrambled order: rows follow
 * the order the graph was built in (a grid row by row), so ties by row would put every label of
 * a grid on its first rows, where placement stops looking.
 */
function rankRows(scores) {
  let order = new Uint32Array(scores.length);
  let mixed = new Uint32Array(scores.length);
  for (let i = 0; i < order.length; ++i) {
    order[i] = i;
    mixed[i] = scramble(i);
  }
  order.sort((a, b) => (scores[b] - scores[a]) || (mixed[a] - mixed[b]) || (a - b));
  return order;
}

// A 32-bit integer hash (lowbias32): neighbouring rows land far apart
function scramble(x) {
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

// PageRank of the graph with links read both ways: 30 rounds, damping 0.85
function pagerank(graph, rowOf, count, scores) {
  let from = [], to = [];
  graph.forEachLink(link => {
    let a = rowOf(link.fromId), b = rowOf(link.toId);
    if (a < 0 || b < 0 || a >= count || b >= count || a === b) return;
    from.push(a);
    to.push(b);
  });
  let present = new Uint8Array(count);
  let n = 0;
  graph.forEachNode(node => {
    let row = rowOf(node.id);
    if (row >= 0 && row < count && !present[row]) { present[row] = 1; n += 1; }
  });
  if (!n) return scores;
  let degree = new Float64Array(count);
  for (let i = 0; i < from.length; ++i) { degree[from[i]] += 1; degree[to[i]] += 1; }
  let rank = new Float64Array(count), next = new Float64Array(count);
  for (let i = 0; i < count; ++i) rank[i] = present[i] ? 1 / n : 0;
  let damping = 0.85;
  for (let round = 0; round < 30; ++round) {
    let dangling = 0;
    for (let i = 0; i < count; ++i) if (present[i] && degree[i] === 0) dangling += rank[i];
    let base = (1 - damping) / n + damping * dangling / n;
    for (let i = 0; i < count; ++i) next[i] = present[i] ? base : 0;
    for (let i = 0; i < from.length; ++i) {
      let a = from[i], b = to[i];
      next[b] += damping * rank[a] / degree[a];
      next[a] += damping * rank[b] / degree[b];
    }
    let swap = rank; rank = next; next = swap;
  }
  for (let i = 0; i < count; ++i) if (present[i]) scores[i] = rank[i];
  return scores;
}

// labels: node labels that stay put while the layout moves.
//
//   view.use(labelNodes);
//   view.use(labelNodes, {importance: 'pagerank'});
//   view.use(labelNodes, {importance: 'population', max: 150});
//
// Every node has a fixed importance (links by default; or PageRank, a numeric field of node.data,
// or `node => number`), ranked once per graph change. A greedy pass places labels in that order
// against a grid on the screen, beside their node, and skips any that would overlap. So the most
// important nodes are labelled first, and zooming in makes room for more: the hierarchy comes
// from the ranking and the zoom. The most important labels are also bigger.
//
// Placement is stable:
// - It runs again only every 250 ms while the layout or the camera moves, and once they stop;
//   sooner when the zoom changed a lot (a search glide, a double tap), so the screen isn't left
//   with the labels of nodes that flew off it.
// - Labels placed last time go first, on the side of their node they had, so they don't jump.
// - Selected nodes are always labelled, then the selection's neighbours.
// - Hover never places again (as on a map, hover changes how things look, never where labels
//   go). The hovered node (the hover module's: the pointer rests on it), the focused node and
//   dragged ones get their label in front: drawn last, where their own label is (at its size; a
//   focused node's in the top tier) with a full halo, or else on the side that covers the fewest
//   labels, on a plate. Labels under it stay where they are, behind it, and show again when it
//   goes.
// - A label's text is part of its node: the view's pick() takes a point on a label as its node
//   (so the label you reach for is what you hover and tap).
// - Labels make way for what covers the canvas (a settings panel, a toolbar): the view measures
//   what is visible (see visible.js and the view's `occlusion` option), and no label goes there.
// - Labels fade in and out (300 ms) in the shader.
// - Between placements each label follows its node on the GPU (see labels/program.js), so a
//   running layout costs the CPU nothing per frame for labels.
//
// The text is the view's `labelOf(node)` (or `text(node)`), cut to `maxLength` characters, drawn
// once per label with the canvas 2D API (any script works) into an atlas at the device's pixel
// ratio. A node whose text is empty gets no label.
//
// Options:
// - `importance` ('degree'): 'degree', 'pagerank', a field name of node.data, or `node => number`.
// - `max`: labels at most (besides forced ones). Default: one per `area` (14,000) square pixels of
//   canvas, between 30 and 150, so about as many at every zoom.
// - `padding` ('auto'): pixels kept free around each label, so a dense part of the drawing reads
//   as labels with the drawing between them, not a wall of text. 'auto': 8 on a desktop, less on
//   a small screen (the canvas's shorter side / 110, at least 4), where names are fewer already.
// - `spacing` ('auto'): {x, y} pixels the nodes of two labels must be apart, as an ellipse (a
//   label on screen needs only 0.7 of it to stay). 'auto' grows it with how many nodes each label
//   stands for: none up to 20 nodes a label (small graphs keep their names), up to {x: 90, y: 36}
//   from 200 (a dense graph at fit shows a few names over its drawing), less on a small screen.
//   null: none.
// - `tiers`: text sizes by rank, [{count, share, min, size, weight, tone}] from the most important;
//   a node ranked below `count` and below `share` of all nodes (but at least `min`) takes that
//   tier. Default: the top 20 at 16 px semibold, the next to 200 at 13 px, the rest at 12 px.
//   `tone` (0 to 1) dims a tier's text toward the halo: small labels recede and the drawing's
//   colors lead (the default tones are 1, 0.85, 0.75); pointed and selected nodes' labels are
//   always at full brightness.
// - `text`: `node => string`, the label's text (default: the view's `labelOf`). Return '' for
//   nodes that should have no label, e.g. nodes that have only an id.
// - `font` (system-ui and friends), `color` (0xffffffff), `halo` (0x0c2952e6), `haloWidth` (2 px),
//   `gap` (3 px between the node and its label), `every` (250 ms), `fade` (300 ms), `maxLength` (40).
//
// API: update(options) (new options; importance, text and look are read again), refresh() (labels
// read again), get() (the labelled nodes), boxes() (the labels on the canvas now: [{node, x, y,
// width, height, alpha, front}], CSS pixels, in drawing order), stats() ({labels, placements,
// lastMs, maxMs}), dispose().

const DEFAULTS$5 = {
  importance: 'degree',
  max: 0,
  // Text sizes by rank: a tier holds the nodes ranked below `count` (and below `share` of all
  // nodes), so a big graph has as few big labels as a small one. `tone` is the text's brightness:
  // the small labels recede and the big ones read first, as on a map.
  tiers: [
    {count: 20, share: 0.05, min: 3, size: 16, weight: 600, tone: 1},
    {count: 200, share: 0.3, min: 10, size: 13, weight: 500, tone: 0.85},
    {share: 1, min: 0, size: 12, weight: 400, tone: 0.75}
  ],
  // How far apart the nodes of two labels must be ({x, y} CSS pixels, an ellipse), for a sparser,
  // more even spread than padding gives. Off by default
  spacing: 'auto',
  // One label per this many square CSS pixels of canvas at most (20 to 150): about as many at
  // every zoom, so zooming in brings other names, not more of them
  area: 14000,
  // Pixels kept free around each label: room to breathe, so dense parts aren't a wall of text
  padding: 'auto',
  font: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  color: 0xffffffff,
  halo: 0x0c2952e6,
  haloWidth: 2,
  gap: 3,
  every: 250,
  fade: 300,
  maxLength: 40
};
// For this long after a selection ends, the labels from before it come first (ms)
const RESTORE_TIME = 1200;
// A label placed less than this long ago is kept before older ones
const YOUNG = 1000;
// At most this many selected nodes are labelled for sure, and this many of their neighbours first
const FORCED_SELECTED = 50, NEIGHBOURS = 200;
// How many candidates (per label wanted) a placement looks at before it stops
const LOOK_AT = 12;
// Pixels a label on screen may come closer to others before it gives way: a running layout
// jiggles nodes by a few pixels, and without this the labels packed tightest blink out and
// back, or jump to another side, as their neighbours move
const SLACK = 6;
// How much covering a label of each tier counts, when a label in front picks its side
const COVER_WEIGHT = [10, 3, 1];
// A label that comes in front (a pointed node's) starts its fade in at this alpha
const FRONT_FROM = 0.6;
// The zoom changed by this factor since the last placement: place again without waiting for
// `every`, but not more often than every ZOOM_GAP ms
const ZOOM_STEP = 1.5, ZOOM_GAP = 50;

var labelNodes = {
  name: 'labels',
  attach(ctx, options = {}) {
    let settings = merge(options);
    let graph = ctx.graph;
    let atlas = createLabelAtlas(ctx.gl);
    let program = createLabelProgram(ctx.gl, ctx.instancing);
    let epoch = performance.now();

    // Ranking, by row: rebuilt when the graph or the layout's rows change
    let ranked = null;
    // What is on screen or fading out: node id -> label
    let shown = new Map();
    // Labels in front (pointed nodes) need to be worked out again at the next frame
    let frontDirty = true;
    // The labels' boxes on the canvas, as last measured (null: measure again)
    let boxCache = null;
    // Label sizes (CSS pixels) by tier and text
    let sizes = new Map();
    // Nodes' diameters by row (scene units), from the last placement
    let nodeSizes = null;
    let ratio = 0;
    let data = new Float32Array(64 * STRIDE);
    let count = 0;
    let look = {count: 0, atlas: atlas.texture, time: 0, fade: settings.fade / 1000, gap: settings.gap,
      textColor: rgba$1(settings.color), haloColor: rgba$1(settings.halo)};

    let pending = true;
    // The layout or the camera moved since the last placement
    let moved = true;
    // The labels on screen when a selection began (node ids), given back their place first when
    // it ends: the selection's neighbours took places of their own while it lasted, and they must
    // not keep the landmarks they displaced off the screen afterwards
    // (for a second after it ends: the details card that covered part of the canvas goes too)
    let beforeSelection = null, restore = null, restoreUntil = 0, hadSelection = false;
    let last = -Infinity;
    // The canvas at the last placement (CSS pixels)
    let canvasSize = {width: 0, height: 0};
    // The camera's distance to what it looks at, at the last placement
    let lastDistance = 0;
    let timer = 0;
    let stats = {labels: 0, placements: 0, lastMs: 0, maxMs: 0};

    ctx.onFrame(onFrame);
    ctx.addLayer({
      order: 0,
      draw(frame) {
        atlas.upload();
        look.count = count;
        look.time = (frame.time - epoch) / 1000;
        program.draw(frame, look);
      },
      dispose() {
        program.dispose();
        atlas.dispose();
      }
    });
    // What is labelled for sure changes with the selection: place again at the next frame
    ctx.on('select', soon);
    // Pointed nodes change which labels are in front, without placing again
    ['hover', 'focus', 'dragstart', 'dragend'].forEach(name => ctx.on(name, () => {
      frontDirty = true;
      ctx.requestFrame();
    }));
    // The view's pick() asks here first: a point on a label's text is its node
    ctx.provide('labelTargets', {
      at: (x, y) => labelAt(currentBoxes(), x, y),
      /** The nodes whose labels are placed on the canvas now (not those only in front) */
      labelled() {
        let nodes = [];
        shown.forEach(label => { if (label.to > 0 && !label.frontOnly) nodes.push(label.node); });
        return nodes;
      },
      /** The box of `node`'s label on the canvas now ({x, y, width, height}), or null */
      boxOf(node) {
        let found = currentBoxes().find(b => b.node === node);
        return found ? {x: found.x, y: found.y, width: found.width, height: found.height} : null;
      }
    });
    // A panel opened or closed: place again, as often as while the camera moves
    let coversChanged = false;
    if (ctx.onVisibleAreaChange) {
      ctx.onVisibleAreaChange(() => {
        coversChanged = true;
        ctx.requestFrame();
      });
    }
    graph.on('changed', onGraphChanged);
    ctx.requestFrame();

    return {
      update(newOptions) {
        settings = merge(Object.assign({}, options, newOptions));
        options = Object.assign({}, options, newOptions);
        look.fade = settings.fade / 1000;
        look.gap = settings.gap;
        look.textColor = rgba$1(settings.color);
        look.haloColor = rgba$1(settings.halo);
        restart();
      },
      refresh: restart,
      get() {
        let nodes = [];
        shown.forEach(label => { if (label.to > 0) nodes.push(label.node); });
        return nodes;
      },
      stats: () => Object.assign({}, stats),
      // `{fading: true}`: also the labels still fading out
      boxes(which) {
        let time = (performance.now() - epoch) / 1000;
        let list = which && which.fading ? currentBoxes(true) : currentBoxes();
        return list.map(b => ({node: b.node, x: b.x, y: b.y, width: b.width, height: b.height,
          alpha: alphaAt(b.label, time, settings.fade / 1000), front: !!b.label.front}));
      },
      dispose() {
        clearTimeout(timer);
        graph.off('changed', onGraphChanged);
      }
    };

    function soon() {
      pending = true;
      ctx.requestFrame();
    }

    function restart() {
      ranked = null;
      sizes.clear();
      atlas.reset();
      shown.forEach(label => { label.entry = null; });
      soon();
    }

    function onGraphChanged() {
      ranked = null;
      soon();
    }

    function onFrame(change) {
      if (change.structure) {
        ranked = null;
        pending = true;
      }
      if (change.positions || change.camera || change.structure) {
        boxCache = null;
        moved = true;
      }
      let now = performance.now();
      if (pending) {
        place(now);
      } else {
        if (change.positions || change.camera || coversChanged) {
          coversChanged = false;
          // Moving: place again every `every` ms, and once more after it stops
          if (now - last >= settings.every || (now - last >= ZOOM_GAP && zoomedFar())) place(now);
          else schedule(settings.every - (now - last));
        }
        // A node was pointed or let go: only the labels in front change
        if (frontDirty) {
          updateFront(now);
          fill();
        }
      }
      if (fading(now)) ctx.animate();
    }

    function schedule(ms) {
      if (timer) return;
      timer = setTimeout(() => {
        timer = 0;
        soon();
      }, Math.max(16, ms));
    }

    function zoomedFar() {
      let distance = cameraDistance();
      return lastDistance > 0 && distance > 0 &&
        (distance > lastDistance * ZOOM_STEP || distance * ZOOM_STEP < lastDistance);
    }

    function cameraDistance() {
      let view = ctx.scene.getDrawContext().view;
      if (!view || !view.position || !view.center) return 0;
      let p = view.position, c = view.center;
      return Math.hypot(p[0] - c[0], p[1] - c[1], (p[2] || 0) - (c[2] || 0));
    }

    function place(now) {
      pending = false;
      last = now;
      lastDistance = cameraDistance();
      clearTimeout(timer);
      timer = 0;
      let screen = ctx.screenPositions();
      let drawContext = ctx.scene.getDrawContext();
      if (drawContext.pixelRatio !== ratio) {
        // Images were drawn for another pixel ratio
        ratio = drawContext.pixelRatio || 1;
        atlas.reset();
        shown.forEach(label => { label.entry = null; });
      }
      nodeSizes = screen.sizes;
      if (!ranked || ranked.count !== screen.x.length) ranked = rank(screen.x.length);
      let max = settings.max || Math.round(Math.min(150, Math.max(30, screen.width * screen.height / settings.area)));

      let covered = coveredTest(ctx.visibleArea());
      let spacing = spacingFor(settings.spacing, screen, max);
      let fadingOut = fadingBoxes(screen, now);
      let selecting = ctx.flags.ids(SELECTED).length > 0;
      if (selecting && !hadSelection) {
        // and on which side of their node they were: the selected node's label may take another
        // side while it is selected (a forced label takes a side where it fits)
        beforeSelection = new Map();
        shown.forEach((label, id) => { if (label.to > 0 && !label.frontOnly) beforeSelection.set(id, label.anchor); });
      } else if (!selecting && hadSelection) {
        restore = beforeSelection;
        restoreUntil = now + RESTORE_TIME;
        beforeSelection = null;
      }
      hadSelection = selecting;
      if (restore && (selecting || now > restoreUntil)) restore = null;
      let list = candidates(screen, max);
      moved = false;
      let placed = placeLabels(list, {
        width: screen.width, height: screen.height, gap: settings.gap, padding: paddingFor(settings.padding, screen), slack: SLACK, max,
        spacing,
        // No new name prints over one still fading out
        blocked: fadingOut.length ? box => (covered && covered(box)) || overlapsAny(box, fadingOut) : covered
      });
      let waiting = placed.length;
      placed = withoutOverprint(placed, screen);
      // Labels that wait for a dropped one to fade come at the next placement: make sure there is
      // one, also when nothing moves any more
      if (placed.length < waiting) schedule(settings.fade + 20);
      canvasSize.width = screen.width;
      canvasSize.height = screen.height;
      apply(placed, screen, now);
      let ms = performance.now() - now;
      stats.labels = placed.length;
      stats.placements += 1;
      stats.lastMs = ms;
      stats.maxMs = Math.max(stats.maxMs, ms);
    }

    // Who gets a label, in order: forced (selected), the selection's neighbours, labels placed last
    // time (young ones first), then everyone by importance. Pointed nodes take no part: their
    // labels are in front (see updateFront)
    function candidates(screen, max) {
      let list = [];
      let taken = new Set();
      // `anchor`: the side it had (a label from before a selection, which counts as one on screen)
      let add = (node, forced, anchor) => {
        if (!node || taken.has(node.id)) return;
        if (!textOf(node)) return;
        let body = ctx.layout.getBody(node.id);
        let row = body ? body.index : -1;
        if (row < 0 || row >= screen.x.length || !screen.onScreen[row]) return;
        taken.add(node.id);
        let tier = ranked.tier[row];
        let size = sizeOf(node, tier);
        let radius = drawnRadius(node, screen.radius[row], false);
        let previous = shown.get(node.id);
        list.push({
          row, node, tier, x: screen.x[row], y: screen.y[row], radius,
          width: size.width, height: size.height,
          anchor: anchor || (previous && previous.to > 0 && !previous.frontOnly ? previous.anchor : null),
          forced
        });
      };
      let selected = ctx.flags.ids(SELECTED);
      selected.slice(0, FORCED_SELECTED).forEach(id => add(graph.getNode(id), true));
      let neighbours = 0;
      for (let i = 0; i < selected.length && i < FORCED_SELECTED && neighbours < NEIGHBOURS; ++i) {
        graph.forEachLinkedNode(selected[i], other => {
          if (neighbours >= NEIGHBOURS) return;
          neighbours += 1;
          add(other, false);
        });
      }
      // A selection just ended: the labels from before it come back first, most important first
      if (restore) {
        Array.from(restore.keys()).map(id => graph.getNode(id)).filter(Boolean)
          .sort((a, b) => ranked.position[rowOf(a)] - ranked.position[rowOf(b)])
          .forEach(node => add(node, false, restore.get(node.id)));
      }
      // Landmarks first: the top tier's nodes on screen, before the labels placed last time, so the
      // biggest names arrive at once and stay while the layout runs
      let topCount = 0;
      while (topCount < ranked.order.length && ranked.tier[ranked.order[topCount]] === 0) topCount += 1;
      // (those shown last time first, so two landmarks of one cluster don't take turns). On a still
      // drawing (nothing moved since the last placement: a panel folded, a tap cleared the
      // selection) only those shown: a label on screen never makes way for a newcomer there
      let still = !moved;
      for (let pass = 0; pass < (still ? 1 : 2); ++pass) {
        for (let i = 0; i < topCount; ++i) {
          let row = ranked.order[i];
          if (!screen.onScreen[row]) continue;
          let label = shown.get(screen.nodes[row].id);
          let wasShown = !!(label && label.to > 0 && !label.frontOnly);
          if (wasShown === (pass === 0)) add(screen.nodes[row], false);
        }
      }
      let now = performance.now();
      let before = [];
      // Labels only in front (a pointed node's) were not placed: they don't go first
      shown.forEach(label => { if (label.to > 0 && !label.frontOnly) before.push(label); });
      before.sort((a, b) => {
        let youngA = now - a.placedAt < YOUNG, youngB = now - b.placedAt < YOUNG;
        if (youngA !== youngB) return youngA ? -1 : 1;
        return ranked.position[rowOf(a.node)] - ranked.position[rowOf(b.node)];
      });
      before.forEach(label => add(label.node, false));
      let lookAt = max * LOOK_AT;
      let order = ranked.order, nodes = screen.nodes;
      for (let i = 0, seen = 0; i < order.length && seen < lookAt; ++i) {
        let row = order[i];
        if (!screen.onScreen[row]) continue;
        seen += 1;
        add(nodes[row], false);
      }
      return list;
    }

    // Labels on, labels off: fades, atlas images, and the buffer the shader reads
    function apply(placed, screen, now) {
      let time = (now - epoch) / 1000;
      let keep = new Set();
      placed.forEach(p => {
        let node = screen.nodes[p.row];
        keep.add(node.id);
        let label = shown.get(node.id);
        if (!label) {
          label = {node, from: 0, to: 0, start: time, placedAt: now};
          shown.set(node.id, label);
        }
        if (label.to === 0) {
          // Fading in, from wherever it was
          label.from = alphaAt(label, time, settings.fade / 1000);
          label.to = 1;
          label.start = time;
          label.placedAt = now;
        }
        label.anchor = p.anchor;
        label.frontOnly = false;
        setTier(label, label.front ? frontTier(node) : ranked.tier[p.row]);
        // Where its box sits beside its node (CSS pixels), for the fade-out test
        label.ox = p.x - screen.x[p.row];
        label.oy = p.y - screen.y[p.row];
        label.w = p.width;
        label.h = p.height;
      });
      shown.forEach((label, id) => {
        if (keep.has(id)) return;
        // In front stays, also where no label of its own fits now
        if (label.front) {
          label.frontOnly = true;
          return;
        }
        if (label.to > 0) {
          label.from = alphaAt(label, time, settings.fade / 1000);
          label.to = 0;
          label.start = time;
        } else if (time - label.start >= settings.fade / 1000) {
          shown.delete(id);
        }
      });
      updateFront(now);
      fill();
    }

    // Labels in front: the pointed nodes' (resting hover, focus, drag), largest, drawn last, where
    // their own label is or on the side that covers the fewest others. Nothing is placed again.
    function updateFront(now) {
      frontDirty = false;
      let time = (now - epoch) / 1000;
      // The hover module flags a node once the pointer rests on it
      let ids = new Set(ctx.flags.ids(FOCUSED).concat(ctx.flags.ids(DRAGGED), ctx.flags.ids(HOVERED)));
      shown.forEach((label, id) => {
        if (!label.front || ids.has(id)) return;
        label.front = false;
        if (label.frontOnly) {
          // Gone at once: it would fade under the next pointed node's plate
          label.from = 0;
          label.to = 0;
          label.start = time;
        } else {
          setTier(label, ranked ? ranked.tier[rowOf(label.node)] : 0);
        }
      });
      if (!ranked) return;
      let others = null;
      ids.forEach(id => {
        let node = graph.getNode(id);
        if (!node || !textOf(node) || !ctx.layout.getBody(id)) return;
        let label = shown.get(id);
        if (!label) {
          label = {node, from: 0, to: 0, start: time, placedAt: now};
          shown.set(id, label);
        }
        let placedHere = label.to > 0 && !label.frontOnly;
        if (!placedHere) {
          if (label.to === 0 || !label.front) {
            // Most of the way in already: it answers the pointer
            label.from = Math.max(alphaAt(label, time, settings.fade / 1000), FRONT_FROM);
            label.to = 1;
            label.start = time;
          }
          // A label that wasn't on the canvas takes the side that covers the fewest others, and
          // keeps it while it stays in front
          if (!label.front || !label.anchor) {
            // Covering a big name costs more than covering a small one: the landmark the pointer
            // may be on its way to stays readable
            if (!others) others = currentBoxes().filter(b => !b.label.front).map(b => ({x: b.x, y: b.y, width: b.width, height: b.height,
              weight: COVER_WEIGHT[b.label.tier] || 1}));
            let disc = ctx.discsOf([node])[0];
            let size = sizeOf(node, frontTier(node));
            label.anchor = disc ? frontSide({x: disc.x, y: disc.y, radius: drawnRadius(node, disc.radius, true),
              width: size.width, height: size.height}, others, {
              gap: settings.gap, width: canvasSize.width, height: canvasSize.height,
              blocked: coveredTest(ctx.visibleArea())
            }) : 'right';
          }
          label.frontOnly = true;
        }
        label.front = true;
        setTier(label, frontTier(node));
      });
      boxCache = null;
    }

    // A label in front keeps its own size (labels don't grow and shrink under the pointer), but a
    // focused (or found) node's is in the top tier, so it reads among the labels around it
    function frontTier(node) {
      return ctx.flags.has(node.id, FOCUSED) || !ranked ? 0 : ranked.tier[rowOf(node)];
    }

    // A label's text size (tier); its image is drawn again when that changes
    function setTier(label, tier) {
      let text = textOf(label.node);
      let key = tier + '|' + text;
      label.tier = tier;
      if (label.key !== key || !label.entry) {
        label.key = key;
        label.text = text;
        label.entry = null;
      }
    }

    // The node's disc as its label makes room for it: selected nodes are larger, maybe with a
    // ring (see the view's styles), and so are pointed ones, for a label in front (as the shader)
    function drawnRadius(node, radius, front) {
      let flags = ctx.flags.get(node.id);
      let styles = ctx.view.getStyles ? ctx.view.getStyles() : {};
      if (front && (flags & (HOVERED | FOCUSED | DRAGGED))) return Math.max(radius * (styles.pointedScale || 1.5), (styles.pointedMinSize || 8) / 2) + ringOf(styles, styles.pointedRing);
      if (flags & SELECTED) return Math.max(radius * (styles.selectedScale || 1.25), (styles.selectedMinSize || 6) / 2) + ringOf(styles, styles.selectedRing);
      return radius;
    }

    // Labels in the order they are drawn: those in front last
    function drawOrder() {
      let back = [], front = [];
      shown.forEach(label => (label.front ? front : back).push(label));
      return back.concat(front);
    }

    // Where the labels are on the canvas now (they follow their nodes), in drawing order: the
    // ones shown or fading in, with an image. Measured again after the nodes or the camera moved.
    function currentBoxes(withFading) {
      if (boxCache && !withFading) return boxCache;
      let time = (performance.now() - epoch) / 1000, fade = settings.fade / 1000;
      let list = drawOrder().filter(label => (label.to > 0 || (withFading && time - label.start < fade)) &&
        label.anchor && ctx.layout.getBody(label.node.id));
      let discs = list.length ? ctx.discsOf(list.map(label => label.node)) : [];
      let box = {x: 0, y: 0, width: 0, height: 0};
      let out = [];
      list.forEach((label, i) => {
        let disc = discs[i];
        if (!disc) return;
        let size = sizeOf(label.node, label.tier);
        boxBeside({x: disc.x, y: disc.y, radius: drawnRadius(label.node, disc.radius, !!label.front), width: size.width, height: size.height},
          label.anchor, settings.gap, box);
        out.push({label, node: label.node, x: box.x, y: box.y, width: box.width, height: box.height,
          disc: {x: disc.x, y: disc.y, radius: disc.radius}, front: !!label.front});
      });
      if (!withFading) boxCache = out;
      return out;
    }

    // The buffer the shader reads: one entry per label shown or fading out, those in front last
    function fill() {
      shown.forEach((label, id) => { if (!ctx.layout.getBody(id)) shown.delete(id); });
      drawImages();
      if (data.length < shown.size * STRIDE) data = new Float32Array(Math.max(shown.size, 2 * data.length / STRIDE) * STRIDE);
      count = 0;
      boxCache = null;
      drawOrder().forEach(label => {
        let id = label.node.id;
        // No image: even an empty atlas could not hold every label; this one waits
        if (!label.entry || label.generation !== atlas.generation) return;
        let body = ctx.layout.getBody(id);
        let e = label.entry, o = count * STRIDE;
        data[o] = body.index;
        data[o + 1] = nodeSizes && body.index < nodeSizes.length ? nodeSizes[body.index] : 1;
        data[o + 2] = ANCHOR_INDEX[label.anchor] || 0;
        let tier = settings.tiers[label.tier] || settings.tiers[settings.tiers.length - 1];
        // How bright the text is: its tier's tone (the shader shows pointed and selected nodes' at
        // full). Below 0, a label in front (a pointed node's): -1 at its own place, with a full
        // halo that knocks its lit links out of the text but leaves the drawing around it; -2
        // drawn over other labels, on a plate of the halo's color that hides them
        data[o + 3] = label.front ? (label.frontOnly ? -2 : -1) : tier.tone === undefined ? 1 : tier.tone;
        data[o + 4] = e.width / ratio;
        data[o + 5] = e.height / ratio;
        data[o + 6] = e.x / atlas.width;
        data[o + 7] = e.y / atlas.height;
        data[o + 8] = (e.x + e.width) / atlas.width;
        data[o + 9] = (e.y + e.height) / atlas.height;
        data[o + 10] = label.start;
        data[o + 11] = label.from;
        data[o + 12] = label.to;
        count += 1;
      });
      program.update(data, count);
    }

    // Every label gets its image before any of them is written for the shader. The atlas keeps
    // images until it is full; then it starts over with only the labels shown now, those on
    // screen first and those fading out last, so no label points at an image that is gone.
    function drawImages() {
      for (let attempt = 0; ; ++attempt) {
        let full = false;
        for (let pass = 0; pass < 2 && !full; ++pass) {
          for (let label of shown.values()) {
            if ((label.to > 0) !== (pass === 0)) continue;
            if (label.entry && label.generation === atlas.generation) continue;
            let entry = image(label);
            if (!entry) {
              full = true;
              break;
            }
            label.entry = entry;
            label.generation = atlas.generation;
          }
        }
        // Full even when empty: the labels that didn't fit wait for the next placement
        if (!full || attempt > 0) return;
        atlas.reset();
      }
    }

    function image(label) {
      let tier = settings.tiers[label.tier] || settings.tiers[settings.tiers.length - 1];
      let size = sizeOf(label.node, label.tier);
      let font = `${tier.weight} ${tier.size * ratio}px ${settings.font}`;
      return atlas.add(label.key, label.text, font, settings.haloWidth * ratio,
        Math.ceil(size.width * ratio), Math.ceil(size.height * ratio));
    }

    // A label's box in CSS pixels: its text, a pixel of room, and the halo on each side
    function sizeOf(node, tierIndex) {
      let text = textOf(node);
      let key = tierIndex + '|' + text;
      let known = sizes.get(key);
      if (known) return known;
      let tier = settings.tiers[tierIndex] || settings.tiers[settings.tiers.length - 1];
      let width = atlas.measure(text, `${tier.weight} ${tier.size}px ${settings.font}`);
      let halo = settings.haloWidth;
      known = {width: Math.ceil(width + 2 * halo + 2), height: Math.ceil(tier.size * 1.3 + 2 * halo)};
      sizes.set(key, known);
      return known;
    }

    function textOf(node) {
      let text = settings.text ? settings.text(node) : ctx.labelOf(node);
      if (!text) return '';
      let max = settings.maxLength;
      return text.length > max ? text.slice(0, max - 1) + '…' : text;
    }

    function rowOf(node) {
      let body = ctx.layout.getBody(node.id);
      return body ? body.index : 0;
    }

    // Importance by row, the order of rows, each row's place in it, and its tier
    function rank(rows) {
      let rowOfId = id => {
        let body = ctx.layout.getBody(id);
        return body ? body.index : -1;
      };
      let scores = computeImportance(graph, rowOfId, rows, settings.importance);
      let order = rankRows(scores);
      let position = new Uint32Array(rows);
      for (let i = 0; i < order.length; ++i) position[order[i]] = i;
      let tier = new Uint8Array(rows);
      let nodes = graph.getNodesCount();
      let bounds = settings.tiers.map(t => {
        let bound = Math.ceil((t.share === undefined ? 1 : t.share) * nodes);
        if (t.count !== undefined) bound = Math.min(bound, t.count);
        return Math.max(t.min || 0, bound);
      });
      for (let i = 0; i < order.length; ++i) {
        let t = 0;
        while (t < bounds.length - 1 && i >= bounds[t]) t += 1;
        tier[order[i]] = t;
      }
      // Equal nodes get equal text: a tie takes the smallest size of its members, so when a grid's
      // nodes are all alike, none of them looks more important than the others
      for (let start = 0, i = 1; i <= order.length; ++i) {
        if (i < order.length && scores[order[i]] === scores[order[start]]) continue;
        let t = tier[order[i - 1]];
        for (let k = start; k < i; ++k) tier[order[k]] = t;
        start = i;
      }
      return {count: rows, order, position, tier};
    }

    // Boxes of labels still fading out, where they are now: a new label waits for them to go
    // A label this placement drops starts fading out now: a new label that would take its place in
    // the same placement waits for the next one (when the old one's box blocks it until it is gone)
    function withoutOverprint(placed, screen) {
      let kept = new Set(placed.map(p => p.row));
      let dropped = [];
      shown.forEach(label => {
        if (!(label.to > 0) || label.frontOnly || label.ox === undefined) return;
        let body = ctx.layout.getBody(label.node.id);
        if (!body || kept.has(body.index) || body.index >= screen.x.length || !screen.onScreen[body.index]) return;
        dropped.push(screen.x[body.index] + label.ox, screen.y[body.index] + label.oy, label.w, label.h);
      });
      if (!dropped.length) return placed;
      return placed.filter(p => {
        let label = shown.get(screen.nodes[p.row].id);
        let isNew = !(label && label.to > 0 && !label.frontOnly);
        return !isNew || !overlapsAny(p, dropped);
      });
    }

    function fadingBoxes(screen, now) {
      let time = (now - epoch) / 1000, fade = settings.fade / 1000, list = [];
      shown.forEach(label => {
        if (label.to !== 0 || time - label.start >= fade || label.ox === undefined) return;
        let body = ctx.layout.getBody(label.node.id);
        if (!body || body.index >= screen.x.length || !screen.onScreen[body.index]) return;
        list.push(screen.x[body.index] + label.ox, screen.y[body.index] + label.oy, label.w, label.h);
      });
      return list;
    }

    function fading(now) {
      let time = (now - epoch) / 1000, fade = settings.fade / 1000;
      for (let label of shown.values()) {
        if (time - label.start < fade) return true;
      }
      return false;
    }
  }
};

// `box => boolean` for placeLabels: true where something covers the canvas (a panel, a toolbar),
// from the view's measured visible area. The area is known to a cell (a cover's edge to half a
// cell), so a box keeps half a cell clear of covered cells. Null when nothing covers it.
function coveredTest(area) {
  if (!area || !area.anyHidden || area.allHidden) return null;
  let {cell, cols, rows, hidden} = area;
  let reach = cell / 2;
  return box => {
    let c0 = Math.max(0, Math.floor((box.x - reach) / cell)), c1 = Math.min(cols - 1, Math.floor((box.x + box.width + reach) / cell));
    let r0 = Math.max(0, Math.floor((box.y - reach) / cell)), r1 = Math.min(rows - 1, Math.floor((box.y + box.height + reach) / cell));
    for (let r = r0; r <= r1; ++r) {
      for (let c = c0; c <= c1; ++c) {
        if (hidden[r * cols + c]) return true;
      }
    }
    return false;
  };
}

// 'auto': labels spread out in proportion to how many nodes each one stands for. Where a label
// stands for a handful of nodes (London, Mammals), they pack as they fit; where it stands for
// hundreds (a 74k-node graph at fit), the nodes of two labels keep up to {x: 90, y: 36} pixels
// apart, so the picture shows the drawing with a few names over it, not a carpet of names.
function paddingFor(padding, screen) {
  if (padding !== 'auto') return padding;
  return Math.round(Math.min(8, Math.max(4, Math.min(screen.width, screen.height) / 110)));
}

function spacingFor(spacing, screen, max) {
  if (spacing !== 'auto') return spacing;
  let on = 0;
  for (let i = 0; i < screen.onScreen.length; ++i) on += screen.onScreen[i];
  let perLabel = on / Math.max(1, max);
  // 0 up to 20 nodes a label, 1 from 200
  let f = Math.min(1, Math.max(0, Math.log10(Math.max(perLabel, 1)) - 1.3));
  // ...and with the screen: a phone's names are fewer already
  f *= Math.min(1, Math.min(screen.width, screen.height) / 700);
  return f > 0 ? {x: 90 * f, y: 36 * f} : null;
}

function overlapsAny(box, list) {
  for (let i = 0; i < list.length; i += 4) {
    if (box.x < list[i] + list[i + 2] && box.x + box.width > list[i] && box.y < list[i + 1] + list[i + 3] && box.y + box.height > list[i + 1]) return true;
  }
  return false;
}

function alphaAt(label, time, fade) {
  let t = Math.min(1, Math.max(0, (time - label.start) / fade));
  return label.from + (label.to - label.from) * t;
}

// Pixels a ring adds around a node (the view's styles: halo and ring), or 0 without a ring
function ringOf(styles, ring) {
  return ring ? (styles.ringGap || 0) + (styles.ringWidth || 0) : 0;
}

function merge(options) {
  let settings = Object.assign({}, DEFAULTS$5, options);
  settings.tiers = (options.tiers || DEFAULTS$5.tiers).map(t => Object.assign({share: 1, min: 0, size: 12, weight: 400, tone: 1}, t));
  return settings;
}

function rgba$1(color) {
  return new Float32Array([((color >>> 24) & 255) / 255, ((color >>> 16) & 255) / 255, ((color >>> 8) & 255) / 255, (color & 255) / 255]);
}

// pulse: rings that spread from a node and fade, to show where it is in a big drawing.
//
//   view.use(pulseNodes);                       // pulses the node search goes to
//   let pulse = view.use(pulseNodes, {on: []}); // only when asked
//   pulse.start(node);
//
// A found node may be one dot among a hundred thousand: its highlight (a ring, see the view's
// styles) shows it to whoever already looks there, and the pulse makes the eye go there. Rings
// grow from the node outwards and fade (`count` of them, `duration` ms each, `stagger` apart),
// following the node as it moves. With prefers-reduced-motion nothing moves: no pulse (the
// highlight stays).
//
// Options: `on` (['search']: view events whose node pulses), `color` (0xffffffff), `halo`
// (0x0e1624b3: a dark band either side of the ring, so it reads over bright areas), `width` (2
// CSS pixels), `radius` (64: how far the rings spread), `count` (2), `duration` (900),
// `stagger` (300).
//
// API: start(nodeOrId), stop(), dispose().

const DEFAULTS$4 = {
  on: ['search'],
  color: 0xffffffff,
  halo: 0x0e1624b3,
  width: 2,
  radius: 64,
  count: 2,
  duration: 900,
  stagger: 300
};

const VERTEX = `
  precision highp float;
  uniform mat4 modelViewProjection;
  uniform vec2 resolution;
  uniform float row;
  // Outer edge of the quad, in device pixels
  uniform float reach;
  ${POSITION_OF}
  attribute vec2 point; // corner of the quad, -0.5..0.5
  varying vec2 vPixel;  // device pixels from the node
  void main() {
    vec4 clip = modelViewProjection * vec4(positionOf(row).xyz, 1.0);
    if (clip.w <= 0.0) {
      gl_Position = NOWHERE;
      return;
    }
    vPixel = point * 2.0 * reach;
    gl_Position = vec4(clip.xy + clip.w * vPixel * 2.0 / resolution, 0.0, clip.w);
  }`;

const FRAGMENT = `
  precision mediump float;
  uniform vec4 color;
  uniform vec4 halo;
  uniform float radius; // the ring's middle, device pixels
  uniform float width;  // device pixels
  uniform float alpha;
  varying vec2 vPixel;
  void main() {
    float off = abs(length(vPixel) - radius);
    float ring = clamp(0.5 * width + 0.5 - off, 0.0, 1.0);
    float band = clamp(0.5 * width + 2.0 - off, 0.0, 1.0);
    if (band <= 0.0) discard;
    vec4 c = mix(vec4(halo.rgb, halo.a * band), color, ring);
    gl_FragColor = vec4(c.rgb, c.a * alpha);
  }`;

const QUAD = new Float32Array([-0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, -0.5]);

var pulseNodes = {
  name: 'pulse',
  attach(ctx, options = {}) {
    let settings = Object.assign({}, DEFAULTS$4, options);
    let gl = ctx.gl;
    let info = createProgram(gl, VERTEX, FRAGMENT, ['point'],
      ['modelViewProjection', 'positions', 'positionsSize', 'resolution', 'row', 'reach', 'color', 'halo', 'radius', 'width', 'alpha']);
    let quad = createBuffer(gl, QUAD);
    let color = rgba(settings.color), halo = rgba(settings.halo);
    // {node, start} while a pulse runs
    let running = null;
    let reduced = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

    settings.on.forEach(name => ctx.on(name, e => { if (e && e.node) start(e.node); }));
    ctx.addLayer({
      order: 10,
      draw(frame) {
        if (!running) return;
        let elapsed = frame.time - running.start;
        let total = settings.duration + settings.stagger * (settings.count - 1);
        if (elapsed > total) {
          running = null;
          return;
        }
        let body = ctx.layout.getBody(running.node.id);
        if (!body) {
          running = null;
          return;
        }
        let ratio = frame.drawContext.pixelRatio || 1;
        let u = info.uniforms;
        gl.useProgram(info.program);
        gl.uniformMatrix4fv(u.modelViewProjection, false, frame.mvp);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, frame.positions.texture);
        gl.uniform1i(u.positions, 0);
        gl.uniform2f(u.positionsSize, frame.positions.width, frame.positions.rows);
        gl.uniform2f(u.resolution, frame.drawContext.width, frame.drawContext.height);
        gl.uniform1f(u.row, body.index);
        gl.uniform1f(u.reach, (settings.radius + settings.width + 4) * ratio);
        gl.uniform4fv(u.color, color);
        gl.uniform4fv(u.halo, halo);
        gl.uniform1f(u.width, settings.width * ratio);
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.enableVertexAttribArray(info.attributes.point);
        gl.vertexAttribPointer(info.attributes.point, 2, gl.FLOAT, false, 0, 0);
        gl.disable(gl.DEPTH_TEST);
        for (let k = 0; k < settings.count; ++k) {
          let t = (elapsed - k * settings.stagger) / settings.duration;
          if (t < 0 || t > 1) continue;
          // eases out: fast at first, slowing as it fades
          let grow = 1 - (1 - t) * (1 - t);
          gl.uniform1f(u.radius, (8 + (settings.radius - 8) * grow) * ratio);
          gl.uniform1f(u.alpha, 1 - t);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
        gl.disableVertexAttribArray(info.attributes.point);
        ctx.animate();
      },
      dispose() {
        gl.deleteBuffer(quad);
        gl.deleteProgram(info.program);
      }
    });

    return {
      start,
      stop() { running = null; },
      dispose() { running = null; }
    };

    function start(nodeOrId) {
      if (reduced && reduced.matches) return;
      let node = typeof nodeOrId === 'object' && nodeOrId ? nodeOrId : ctx.graph.getNode(nodeOrId);
      if (!node) return;
      running = {node, start: performance.now()};
      ctx.requestFrame();
    }
  }
};

function rgba(color) {
  return new Float32Array([((color >>> 24) & 255) / 255, ((color >>> 16) & 255) / 255, ((color >>> 8) & 255) / 255, (color & 255) / 255]);
}

// style: colors and sizes from the graph's data, kept readable while the layout and the camera move.
//
//   view.use(styleNodes);                                   // colors by node.data.group, if any
//   let style = view.use(styleNodes, {colorBy: 'branch', background: '#0e1624'});
//   style.legend(); // {title, items: [{color, label, count}], more} or null
//
// One set of rules for any graph, made for a dark background:
// - **Color from a category** (`colorBy`: a field of node.data, or `node => value`; default
//   `group` when nodes have one). Categories take PALETTE in order of size, the biggest first;
//   past its eight colors they share OTHER. A `palette` ({value: color}) gives the data's own
//   colors, and values that are colors themselves (`'#e42313'`, `'red'`) are drawn as they are.
//   Any color too dark for the background is lightened to 3:1 against it. Links inside a category
//   take its color; links between categories are neutral and fainter. `linkColors`
//   ({value: color} for `link.data`, or `'self'` when link.data is a color) colors links by the
//   data instead. Nodes without a category are `color`.
// - **Size from links**: a leaf is `unit` scene units wide, a node with k links unit·√k.
// - **Link alpha from their ink**: at most every 300 ms the links are binned on a 32 x 32 grid over
//   the drawing (see linkCrowding), and their alpha is set so the most crowded tenth of the cells
//   gets `ink` of opacity. A hairball's core isn't a solid disc, a sparse tree's links are bright, and zooming
//   in brings them up. Below 1/255 (the least an 8-bit canvas blends) a fixed share of the links
//   is drawn at 1/255 instead.
// - **Nodes at least `minSize` pixels wide**, less where they crowd (1 px at the least), and no
//   wider than `room` of the distance to their nearest neighbour as big (the view's nodeRoom).
// - **Highlights**: nodes keep their color and get a ring, with a halo of the background: white
//   under the pointer, cyan (the page's focus color) when focused or found by search, amber when
//   selected; lit links in one light color.
// - **`background`**: the scene's clear color, the rings' halo and the labels' halo.
// - In 3D, `fog` fades the far side of the drawing.
//
// Options (defaults): colorBy, palette, linkColors, color ('#90f8fc'), background ('#0e1624'),
// unit (1), ink (0.25), alpha ([0.05 / 255, 0.5]), crossLinks (0.6, alpha share of links between
// categories), minSize (3.5), room (0.7), fog (0.3), rings (true), dim (0.3: the alpha of what
// isn't selected or next to it, while something is selected), linkWidth (2).
//
// API: legend(), colorOf(node) (0xRRGGBBAA), linkAlpha(), nodeMinSize(), update(), dispose().

// Eight categorical colors for a dark background, in this order. Checked with the dataviz palette
// validator against #0e1624: every color 3:1 or more, in the dark lightness band (OKLCH L
// 0.48-0.67), chroma 0.10 or more; every adjacent pair, and all pairs of the first four, pass both
// color-vision checks (CVD ΔE >= 8, normal ΔE >= 15). All eight at once can't: gold and orange
// look alike to deuteranopes, teal and green are close. Categories sit together in a layout, and
// a legend and the tooltip name them.
const PALETTE = ['#3987e5', '#e66700', '#da5dad', '#259f56', '#9e76f2', '#b18d2a', '#c3513d', '#1aa39a'];
// Categories past the palette
const OTHER = '#6e7a8d';

const DEFAULTS$3 = {
  colorBy: undefined,
  palette: null,
  linkColors: null,
  color: '#90f8fc',
  background: '#0e1624',
  unit: 1,
  ink: 0.25,
  alpha: [0.05 / 255, 0.5],
  crossLinks: 0.6,
  minSize: 3.5,
  room: 0.7,
  fog: 0.3,
  rings: true,
  dim: 0.3,
  linkWidth: 2
};

var styleNodes = {
  name: 'style',
  attach(ctx, options = {}) {
    let settings = Object.assign({}, DEFAULTS$3, options);
    let view = ctx.view, graph = ctx.graph;
    let colors = null;
    let alpha = settings.alpha[1], minSize = settings.minSize;
    let timer = 0, at = 0, labelsStyled = false;

    apply();
    ctx.onFrame(change => {
      if (!labelsStyled) styleLabels();
      if (change.positions || change.camera) schedule();
    });
    ctx.onCamera(schedule);
    graph.on('changed', onGraphChanged);

    return {
      legend: () => colors.legend,
      colorOf: node => colors.nodeColor(node),
      linkAlpha: () => alpha,
      nodeMinSize: () => minSize,
      // Read the data again (after its fields changed)
      update: apply,
      dispose() {
        clearTimeout(timer);
        graph.off('changed', onGraphChanged);
      }
    };

    function onGraphChanged() {
      apply();
    }

    function apply() {
      colors = colorsOf(graph, settings);
      let rgb = toRGB(settings.background);
      ctx.scene.setClearColor(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, 1);
      let halo = toRGBA$1(settings.background);
      view.setDrawing({
        nodeSize: sizeByLinks(settings.unit),
        nodeRoom: settings.room,
        fog: settings.fog,
        linkWidth: settings.linkWidth
      });
      view.setNodeColor(colors.nodeColor);
      view.setLinkColor(colors.linkColor(alpha));
      view.setNodeMinSize(minSize);
      // While something is selected the rest fades to `dim`: enough to show the selection, not so
      // much that the visitor loses where it is (the rings mark the selection already)
      let styles = {litLinkColor: 0xe6ebf2ff, litLinkAlpha: 0.7, dimAlpha: settings.dim};
      if (settings.rings) {
        Object.assign(styles, {
          pointedColor: 0, pointedMinSize: 10, pointedRing: 0xffffffff,
          selectedColor: 0, selectedMinSize: 8, selectedRing: 0xffc24bff,
          // Focus (the keyboard's place, a node search went to) in the page's focus color, so a
          // found node and a hovered one never look the same
          focusedRing: 0x7fe7efff,
          ringHalo: halo, ringGap: 2, ringWidth: 2
        });
      }
      view.setStyles(styles);
      labelsStyled = false;
      schedule();
    }

    // Labels attached after this module get the background's halo at the next frame
    function styleLabels() {
      let labels = view.getModule && view.getModule('labels');
      if (!labels) return;
      labelsStyled = true;
      // A thin, part-see-through halo: enough to lift the text off links and dots, without
      // punching dark boxes into the drawing
      labels.update({color: 0xe6ebf2ff, halo: (toRGBA$1(settings.background) & 0xffffff00 | 0xb3) >>> 0, haloWidth: 2});
    }

    function schedule() {
      if (timer) return;
      timer = setTimeout(measure, Math.max(0, 300 - (performance.now() - at)));
    }

    function measure() {
      timer = 0;
      at = performance.now();
      let layout = view.getLayout();
      if (!layout || !layout.simulator) return;
      let sim = layout.simulator, pos = sim.store.pos, D = sim.store.D, springs = sim.springStore;
      let n = sim.store.n;
      if (!n) return;
      let rect = layout.getGraphRect();
      let w = rect.max_x - rect.min_x, h = rect.max_y - rect.min_y;
      let k = pixelsPerUnit(rect);
      if (!(k > 0) || !(w > 0) || !(h > 0)) return;

      // Nodes: 1 to minSize pixels, by how many share a pixel of the drawing's box
      let perNode = w * h * k * k / n;
      let size = Math.min(settings.minSize, Math.max(1, Math.sqrt(0.15 * perNode)));
      if (Math.abs(size - minSize) > 0.1) {
        minSize = size;
        view.setNodeMinSize(size);
      }

      // Links: how much of the screen they cover where they crowd
      if (!springs.n) return;
      let crowded = linkCrowding(pos, D, springs, rect, k, settings.linkWidth);
      if (!(crowded > 0)) return;
      let [low, high] = settings.alpha;
      let next = Math.min(high, Math.max(low, settings.ink / Math.max(crowded, 1e-9)));
      // Rebuilding link colors costs a pass over the links: only for a visible change
      if (Math.abs(next - alpha) / alpha < 0.15) return;
      alpha = next;
      view.setLinkColor(colors.linkColor(alpha));
    }

    // CSS pixels per unit of the scene at the middle of the drawing
    function pixelsPerUnit(rect) {
      let cx = (rect.min_x + rect.max_x) / 2, cy = (rect.min_y + rect.max_y) / 2;
      let cz = rect.min_z !== undefined ? (rect.min_z + rect.max_z) / 2 : 0;
      let a = view.toScreen(cx, cy, cz), b = view.toScreen(cx + 1, cy, cz), c = view.toScreen(cx, cy + 1, cz);
      if (!a || !b || !c) return 0;
      return Math.max(Math.hypot(b.x - a.x, b.y - a.y), Math.hypot(c.x - a.x, c.y - a.y));
    }
  }
};

/** Node diameter in scene units: a leaf is `unit`·0.5, a node with k links `unit`·0.5·√k */
function sizeByLinks(unit = 1) {
  return node => {
    let links = degreeOf(node);
    return unit * (links <= 1 ? 0.5 : 0.5 * Math.sqrt(links));
  };
}

function degreeOf(node) {
  let links = node.links;
  if (!links) return 0;
  return links.size !== undefined ? links.size : links.length;
}

// Cells along each side of the grid that measures link ink
const BINS = 32;
// A link is cut into at most this many pieces, each binned where it lies
const MAX_PIECES = 2 * BINS;

/**
 * How much links cover the screen where they crowd: links are binned on a BINS x BINS grid over
 * `rect` (the layout's box), and the answer is the coverage of the cell at the 90th percentile
 * of the cells that have any (1: as much link as the cell has area; links overlap, so it can be
 * more). `pixelsPerUnit` is the zoom, `linkWidth` in pixels.
 *
 * Every link gives each cell the length that crosses it (it is cut into pieces no longer than a
 * cell), and no cell is thinner than a link is wide. Otherwise a graph of a few long links would
 * put each link's whole length into one small cell, and a chain that settles into a straight line
 * would have cells of no height: both read as crowded, and their links were drawn almost
 * transparent.
 */
function linkCrowding(pos, D, springs, rect, pixelsPerUnit, linkWidth) {
  let count = springs.n;
  let width = linkWidth / pixelsPerUnit;
  let w = Math.max(rect.max_x - rect.min_x, BINS * width), h = Math.max(rect.max_y - rect.min_y, BINS * width);
  if (!count || !(w > 0) || !(h > 0)) return 0;
  let left = (rect.min_x + rect.max_x) / 2 - w / 2, top = (rect.min_y + rect.max_y) / 2 - h / 2;
  let cellW = w / BINS, cellH = h / BINS, cell = Math.min(cellW, cellH);
  let cells = new Float64Array(BINS * BINS);
  // At most about 20,000 links are measured; each stands for `step` links
  let step = Math.max(1, Math.floor(count / 20000));
  for (let i = 0; i < count; i += step) {
    let a = springs.from[i] * D, b = springs.to[i] * D;
    let x1 = pos[a], y1 = pos[a + 1], dx = pos[b] - x1, dy = pos[b + 1] - y1;
    let length = Math.hypot(dx, dy);
    let pieces = Math.min(MAX_PIECES, Math.max(1, Math.ceil(length / cell)));
    let ink = length * step / pieces;
    for (let p = 0; p < pieces; ++p) {
      let t = (p + 0.5) / pieces;
      let mx = Math.min(BINS - 1, Math.max(0, Math.floor((x1 + dx * t - left) / cellW)));
      let my = Math.min(BINS - 1, Math.max(0, Math.floor((y1 + dy * t - top) / cellH)));
      cells[my * BINS + mx] += ink;
    }
  }
  let cellArea = cellW * cellH;
  let filled = [];
  for (let c = 0; c < cells.length; ++c) if (cells[c] > 0) filled.push(cells[c] * width / cellArea);
  if (!filled.length) return 0;
  filled.sort((p, q) => p - q);
  return filled[Math.floor(0.9 * (filled.length - 1))];
}

/**
 * The graph's colors by the rules above: {nodeColor: node => 0xRRGGBBAA, linkColor: alpha =>
 * color or link => color, legend}. `options` as the module's.
 */
function colorsOf(graph, options = {}) {
  let settings = Object.assign({}, DEFAULTS$3, options);
  let background = settings.background;
  let readableOn = hex => readable(hex, background);
  let valueOf = typeof settings.colorBy === 'function' ? settings.colorBy
    : settings.colorBy ? node => node.data && node.data[settings.colorBy]
    : hasField(graph, 'group') ? node => node.data && node.data.group : null;
  let title = typeof settings.colorBy === 'string' ? settings.colorBy.replace(/^_/, '') : 'group';
  let plain = toRGBA$1(readableOn(settings.color));
  let linkRGB = 0xffffff00;
  let ownLinks = settings.linkColors ? linkColorsOf(settings.linkColors, readableOn) : null;
  if (!valueOf) {
    return {nodeColor: () => plain, legend: null, linkColor: thinned(alpha => ownLinks ? withOwn(ownLinks, alpha, (linkRGB | alphaByte(alpha)) >>> 0) : (linkRGB | alphaByte(alpha)) >>> 0)};
  }
  let counts = new Map();
  graph.forEachNode(node => {
    let value = valueOf(node);
    if (value === undefined || value === null || value === '') return;
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  let values = Array.from(counts.keys()).sort((a, b) => counts.get(b) - counts.get(a) || String(a).localeCompare(String(b)));
  let colorOf = new Map();
  let legend = null;
  if (settings.palette) {
    // The data's own palette (London's line colors), made readable on the background
    values.forEach(value => colorOf.set(value, readableOn(settings.palette[value] || OTHER)));
    legend = legendOf(title, values, counts, colorOf, 10);
  } else if (values.length && values.every(value => parseColor(String(value)))) {
    // The values are colors (metro lines): draw them; a legend of colors says nothing
    values.forEach(value => colorOf.set(value, readableOn(parseColor(String(value)))));
  } else {
    values.forEach((value, i) => colorOf.set(value, i < PALETTE.length ? PALETTE[i] : OTHER));
    legend = legendOf(title, values, counts, colorOf, PALETTE.length);
  }
  let rgba = new Map();
  colorOf.forEach((hex, value) => rgba.set(value, toRGBA$1(hex)));
  let other = toRGBA$1(OTHER);
  let nodeColor = node => rgba.get(valueOf(node)) || other;
  let linkColor = thinned(alpha => {
    let a = alphaByte(alpha);
    let cross = (linkRGB | alphaByte(alpha * settings.crossLinks)) >>> 0;
    if (ownLinks) return withOwn(ownLinks, alpha, cross);
    return link => {
      let from = graph.getNode(link.fromId), to = graph.getNode(link.toId);
      let a1 = from && valueOf(from), a2 = to && valueOf(to);
      if (a1 === undefined || a1 !== a2 || !rgba.has(a1)) return cross;
      return ((rgba.get(a1) & 0xffffff00) | a) >>> 0;
    };
  });
  return {nodeColor, linkColor, legend};
}

function hasField(graph, name) {
  let found = false, seen = 0;
  graph.forEachNode(node => {
    seen += 1;
    if (node.data && node.data[name] !== undefined) found = true;
    return found || seen >= 200;
  });
  return found;
}

function legendOf(title, values, counts, colorOf, max) {
  if (values.length < 2) return null;
  // Bare numbers (Les Misérables' groups) name nothing: the colors show the groups, no legend
  if (values.every(value => typeof value === 'number' || /^\d+$/.test(String(value)))) return null;
  let shown = values.slice(0, max);
  let rest = values.slice(max);
  return {
    title,
    items: shown.map(value => ({color: colorOf.get(value), label: String(value), count: counts.get(value)})),
    more: rest.length ? {count: rest.length, nodes: rest.reduce((sum, value) => sum + counts.get(value), 0), color: OTHER} : null
  };
}

// Link colors from the data: link.data is a key of `table`, or a color itself ('self')
function linkColorsOf(table, readableOn) {
  let cache = new Map();
  return value => {
    if (!value) return 0;
    if (!cache.has(value)) {
      let hex = table === 'self' ? parseColor(String(value)) : table[value];
      cache.set(value, hex ? toRGBA$1(readableOn(hex)) : 0);
    }
    return cache.get(value);
  };
}

function withOwn(own, alpha, fallback) {
  // The data's link colors are the data: bright enough to read, at least 0.8
  let a = alphaByte(Math.max(alpha, 0.8));
  return link => {
    let color = own(link.data);
    return color ? ((color & 0xffffff00) | a) >>> 0 : fallback;
  };
}

// Below the smallest alpha an 8-bit canvas can blend (1/255), links are thinned instead: a share
// of them, picked by a hash of their ends (the same ones every time), is drawn at 1/255 and the
// rest not at all.
function thinned(colorOf) {
  let floor = 1 / 255;
  return alpha => {
    if (alpha >= floor) return colorOf(alpha);
    let keep = alpha / floor, color = colorOf(floor);
    let colorFn = typeof color === 'function' ? color : () => color;
    return link => hashOf(link) < keep ? colorFn(link) : ((colorFn(link) & 0xffffff00) >>> 0) || 0xffffff00;
  };
}

let hashes = new WeakMap();
function hashOf(link) {
  let h = hashes.get(link);
  if (h !== undefined) return h;
  let text = String(link.fromId) + ':' + String(link.toId), x = 2166136261;
  for (let i = 0; i < text.length; ++i) x = Math.imul(x ^ text.charCodeAt(i), 16777619);
  h = (x >>> 0) / 4294967296;
  hashes.set(link, h);
  return h;
}

function alphaByte(alpha) {
  return Math.max(1, Math.min(255, Math.round(alpha * 255)));
}

function toRGBA$1(hex, alpha = 0xff) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return ((parseInt(h.slice(0, 6), 16) << 8) | alpha) >>> 0;
}

/** '#rrggbb' for a CSS color ('red', '#f00', '#e42313'), or null */
let parser = null;
function parseColor(value) {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(value)) return '#' + value.slice(1).split('').map(c => c + c).join('').toLowerCase();
  if (typeof document === 'undefined') return null;
  if (!parser) parser = document.createElement('canvas').getContext('2d');
  parser.fillStyle = '#000001';
  parser.fillStyle = value;
  let parsed = parser.fillStyle;
  if (parsed === '#000001' && value.toLowerCase() !== '#000001') return null;
  return /^#[0-9a-f]{6}$/i.test(parsed) ? parsed : null;
}

/** The color, mixed toward white just enough for `ratio` (3:1) against `against` */
function readable(hex, against = '#0e1624', ratio = 3) {
  let rgb = toRGB(hex);
  if (contrast(rgb, toRGB(against)) >= ratio) return hex;
  for (let t = 0.05; t <= 1.001; t += 0.05) {
    let mixed = rgb.map(c => c + (255 - c) * t);
    if (contrast(mixed, toRGB(against)) >= ratio) return toHex(mixed);
  }
  return '#ffffff';
}

function toRGB(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}

function toHex(rgb) {
  return '#' + rgb.map(c => Math.round(c).toString(16).padStart(2, '0')).join('');
}

function luminance(rgb) {
  let [r, g, b] = rgb.map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  let la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// fit: keeps the whole layout in view while it moves, inside the part of the canvas the user
// sees (out from under a panel), until the user moves the camera. fit() brings it back.
//
//   const fit = view.use(fitLayout);
//   fit.on(following => button.hidden = following);
//   button.onclick = () => fit.fit();       // or the 0 key on the canvas
//
// - The camera moves with the layout: when the drawing grows it backs off in the same frame
//   (nothing is cut off); when it shrinks it eases in (it snaps when the user prefers reduced
//   motion).
// - While a node is dragged (or lifted, held, moved by keys) the camera holds still: the drawing
//   doesn't shrink under the hand that moves it. It catches up when the node is let go.
// - Any other camera move stops following: a pan, the wheel, a pinch, keys, a double tap, or
//   reveal() for search and keyboard focus. The module remembers where it left the camera, and
//   a camera that is somewhere else was moved by someone else.
// - It changes only where the camera looks and how far it is, never its angles, so a 3D layout
//   keeps the tilt it has (a 3D layout gets `tilt` the first time it is fitted). It measures the
//   projected corners of the layout's box, so perspective is accounted for.
// - It frames the bulk of the nodes: a few far pieces don't shrink the rest to a dot (`bulk`).
// - With labels on, it leaves room for them beside the outermost nodes (`labelRoom`).
// - What shows of the canvas changes (a panel opens or closes): it refits into the new free area,
//   except when that only grew a little and the drawing wouldn't get bigger in it (a line of a
//   phone's panel folding away): moving it a few pixels would only place every label again.
// - In 2D, once the layout settles, it turns the view so the drawing's long side runs along the
//   long side of what shows (`orient`), when that shows it clearly larger: a wide drawing on a
//   tall phone screen stands up. Force layouts have no up, so turning the view loses nothing.
//   Not while the visitor points at a node (hovered, focused, dragged or selected): the drawing
//   doesn't turn under them.


// Pixels the middle of the free area may move, as it grows, before the drawing follows it
const SMALL_SHIFT = 32;

const DEFAULTS$2 = {
  // pixels between the drawing and the edges of what shows
  padding: 24,
  // more pixels at the sides and at the top and bottom while labels are on
  labelRoom: {x: 60, y: 12},
  // closest zoom, in pixels per layout unit, so a graph of a few nodes isn't blown up
  maxScale: 12,
  // share of the way to the target per frame when the camera moves in
  ease: 0.08,
  // frame the box that holds all but `bulk` of the nodes on each side of each axis...
  bulk: 0.01,
  // ...unless the box of every node is at most this much larger: a branch that reaches out stays
  // in the frame, pieces thrown far away don't
  bulkSlack: 2,
  // how the camera leans the first time it fits a 3D layout (radians from straight above, and
  // around the vertical axis); null keeps it as it is
  tilt: {theta: 0.6, phi: 0.5},
  // the key on the canvas that fits again (null: none)
  key: '0',
  // pixels the free area needs each way before the fit moves into it (a strip above a soft
  // keyboard isn't room for the drawing)
  minRoom: 120,
  // 2D: turn the view to the free area's long side when the layout settles, if the drawing then
  // shows at least this much larger by area (false: never turn)
  orient: 1.25,
  // ms the turn takes (it snaps when the user prefers reduced motion)
  orientTime: 400,
  follow: true
};

var fitLayout = {
  name: 'fit',
  attach(ctx, options) {
    let settings = {...DEFAULTS$2, ...options};
    let following = !!settings.follow;
    let pending = following;  // fit at the next frame, without easing
    let mine = null;          // the camera as this module left it
    let easing = false;       // the camera is still on its way in
    let tiltedFor = null;     // the layout the 3D tilt was applied to
    let tilted = false;       // the camera leans because this module leaned it
    let listeners = new Set();
    let canvas = ctx.scene.getDrawContext().canvas;
    let reduced = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
    let watched = null;       // the layout whose 'stable' event this module listens to
    let usedFree = null;      // the free area the last fit used
    // What shows can change without a frame (a panel opens): look again now and then while following
    let areaTimer = setInterval(checkArea, 400);
    let turning = 0;          // the animation frame of a turn
    let gliding = 0;          // the animation frame of a glide to a node (zoomTo)
    let tracking = null;      // after zoomTo: () => where the camera looks to keep the node in place
    let held = false;         // a fit waits for a dragged node to be let go

    ctx.onFrame(change => {
      watch(ctx.layout);
      if (tracking && !gliding) {
        // After zoomTo: the camera stays on the node while the layout still moves it, until the
        // user moves the camera
        if (mine && moved()) {
          tracking = null;
        } else if (change.positions) {
          place(tracking(), distance());
          mine = cameraState();
          ctx.animate();
        }
      }
      if (!following) return;
      if (mine && moved()) {
        setFollowing(false);
        return;
      }
      if (ctx.flags && ctx.flags.count && ctx.flags.count(DRAGGED)) {
        // A node is in someone's hand: the camera holds still until it is let go
        if (change.positions || change.structure || easing) held = true;
        return;
      }
      if (pending || change.positions || change.structure || easing || held) {
        held = false;
        let instant = pending;
        pending = false;
        fitNow(instant);
      }
    });

    if (settings.key) {
      ctx.input.add({
        name: 'fit',
        priority: 45,
        key(e) {
          if (e.key !== settings.key || e.ctrlKey || e.metaKey || e.altKey) return false;
          api.fit();
          return true;
        }
      });
    }

    let onResize = () => {
      if (!following) return;
      pending = true;
      mine = null;
      ctx.requestFrame();
    };
    window.addEventListener('resize', onResize);

    let api = {
      /** Fits the layout now, and follows it again until the user moves the camera */
      fit() {
        stopCamera();
        tracking = null;
        pending = true;
        mine = null;
        setFollowing(true);
        ctx.requestFrame();
      },
      /** Turns following on or off without moving the camera now */
      follow(on) {
        setFollowing(!!on);
        if (on) {
          pending = true;
          mine = null;
          ctx.requestFrame();
        }
      },
      following: () => following,
      /**
       * Brings `node` to the middle of what shows, close enough that its links are about
       * `linkPixels` long on the screen (it never moves out: a node already that close is only
       * centred). Following stops, as after any camera move; fit() brings the whole drawing back.
       * It glides over `duration` ms, or jumps when the user prefers reduced motion.
       */
      zoomTo(node, how = {}) {
        return zoomTo(node, how);
      },
      /** The key that fits, for help texts */
      key: settings.key,
      /** `fn(following)` runs when following starts or stops. Returns a function that removes it. */
      on(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      dispose() {
        clearInterval(areaTimer);
        window.removeEventListener('resize', onResize);
        if (turning) cancelAnimationFrame(turning);
        if (gliding) cancelAnimationFrame(gliding);
        watch(null);
        listeners.clear();
      }
    };
    ctx.provide('fit', api);
    return api;

    // Settling is when the drawing's shape is known: the moment to turn it to the screen
    function watch(layout) {
      if (layout === watched) return;
      if (watched && watched.off) watched.off('stable', onStable);
      watched = layout && layout.on ? layout : null;
      if (watched) watched.on('stable', onStable);
    }

    function onStable(isStable) {
      if (isStable && following && settings.orient) orient();
    }

    // Turns the view (2D) so the drawing's main axis runs along the free area's long side. Not
    // while the visitor points at something (a resting pointer, focus, a drag, a selection): the
    // drawing doesn't turn under them, and the turn is skipped
    function orient() {
      if (ctx.flags && ctx.flags.ids(HOVERED | FOCUSED | DRAGGED | SELECTED).length) return;
      let cam = controls();
      let store = ctx.layout && ctx.layout.simulator && ctx.layout.simulator.store;
      if (!cam || !cam.allowRotation || !store || store.D !== 2 || store.n < 3 || angles().theta > 0.05) return;
      let axis = principalAxis(store);
      if (!axis) return;
      let rect = canvas.getBoundingClientRect();
      let area = ctx.visibleArea && ctx.visibleArea();
      let free = (area && area.largestRect()) || {width: rect.width, height: rect.height};
      if (Math.abs(free.width / free.height - 1) < 0.15) return;
      // The axis on the screen now, and where it should point: down a tall area, across a wide one
      let c = ctx.toScreen(axis.cx, axis.cy, 0), e = ctx.toScreen(axis.cx + axis.ux, axis.cy + axis.uy, 0);
      if (!c || !e) return;
      let now = Math.atan2(e.y - c.y, e.x - c.x);
      let want = free.height > free.width ? Math.PI / 2 : 0;
      let delta = want - now;
      // an axis has no direction: the shortest turn is at most a quarter
      while (delta > Math.PI / 2) delta -= Math.PI;
      while (delta < -Math.PI / 2) delta += Math.PI;
      if (Math.abs(delta) < 0.05) return;
      // Worth it? Compare how large the drawing could show along its axes now and turned
      let scaleNow = Math.min(free.width / axis.extent(now), free.height / axis.extent(now + Math.PI / 2));
      let scaleTurned = Math.min(free.width / axis.extent(want), free.height / axis.extent(want + Math.PI / 2));
      if (!(scaleTurned * scaleTurned >= settings.orient * scaleNow * scaleNow)) return;
      // phi turns the view about the vertical; which way the screen turns is measured, not assumed.
      // From straight above phi can't be read back from the camera, so the turn is applied in steps
      // that add up, and the probe is undone.
      cam.rotateByAngle(0.01, 0);
      cam.redraw();
      let e2 = ctx.toScreen(axis.cx + axis.ux, axis.cy + axis.uy, 0), c2 = ctx.toScreen(axis.cx, axis.cy, 0);
      cam.rotateByAngle(-0.01, 0);
      cam.redraw();
      if (!e2 || !c2) return;
      let shift = Math.atan2(e2.y - c2.y, e2.x - c2.x) - now;
      if (shift > Math.PI) shift -= 2 * Math.PI;
      if (shift < -Math.PI) shift += 2 * Math.PI;
      // phi by +0.01 turned the screen by `shift`: the turn in phi that gives `delta` on the screen
      let total = (Math.sign(shift) || 1) * delta;
      let applied = 0;
      let start = performance.now();
      let duration = reduced && reduced.matches ? 0 : settings.orientTime;
      if (turning) cancelAnimationFrame(turning);
      let step = () => {
        turning = 0;
        if (!following) return;
        let t = duration > 0 ? Math.min(1, (performance.now() - start) / duration) : 1;
        let eased = t < 1 ? 1 - Math.pow(1 - t, 3) : 1;
        let next = total * eased;
        cam.rotateByAngle(next - applied, 0);
        cam.redraw();
        applied = next;
        pending = true;
        fitNow(true);
        if (t < 1) turning = requestAnimationFrame(step);
      };
      step();
    }

    function checkArea() {
      if (!following || !usedFree || (typeof document !== 'undefined' && document.hidden)) return;
      let area = ctx.visibleArea && ctx.visibleArea();
      let free = area && area.largestRect();
      if (!free) return;
      let change = Math.abs(free.x - usedFree.x) + Math.abs(free.y - usedFree.y) +
        Math.abs(free.width - usedFree.width) + Math.abs(free.height - usedFree.height);
      if (change > 16) {
        // A little more room and no bigger drawing (a line of a phone's panel folded away): the
        // camera stays, rather than move the drawing a few pixels and place every label again
        if (grewALittle(free)) {
          usedFree = free;
          return;
        }
        easing = true;
        ctx.requestFrame();
        // the free area's shape changed: a settled drawing may turn to its new long side
        let layout = ctx.layout;
        if (settings.orient && layout && layout.getStability && layout.getStability().stable) setTimeout(() => { if (following) orient(); }, 450);
      }
    }

    // The free area grew around the one the fit used, its middle moved less than SMALL_SHIFT
    // pixels, and the drawing would grow less than 5% in it
    function grewALittle(free) {
      let old = usedFree;
      let around = free.x <= old.x + 1 && free.y <= old.y + 1 && free.x + free.width >= old.x + old.width - 1 &&
        free.y + free.height >= old.y + old.height - 1;
      if (!around) return false;
      let shift = Math.hypot(free.x + free.width / 2 - old.x - old.width / 2, free.y + free.height / 2 - old.y - old.height / 2);
      if (shift > SMALL_SHIFT) return false;
      let layout = ctx.layout;
      let bounds = layout && layoutBounds(layout, settings.bulk, settings.bulkSlack);
      let screen = bounds && projectBox(bounds);
      if (!screen || !(screen.width > 0) || !(screen.height > 0)) return false;
      let fits = r => Math.min(r.width / screen.width, r.height / screen.height);
      return fits(free) < 1.05 * fits(old);
    }

    // A pan or pinch can leave the camera gliding (inertia): stop it before this module moves it
    function stopCamera() {
      let cam = controls();
      if (cam && cam.panAnimation) cam.panAnimation.cancel();
      if (cam && cam.rotateAnimation) cam.rotateAnimation.cancel();
    }

    function zoomTo(node, {linkPixels = 40, duration = 450} = {}) {
      let cam = controls(), layout = ctx.layout;
      if (!cam || !layout || !node || !layout.getBody(node.id)) return false;
      let p = layout.getNodePosition(node.id);
      // How long its links are: the median, in layout units
      let lengths = [];
      ctx.graph.forEachLinkedNode(node.id, other => {
        if (!layout.getBody(other.id)) return;
        let q = layout.getNodePosition(other.id);
        lengths.push(Math.hypot(q.x - p.x, (q.y || 0) - (p.y || 0), (q.z || 0) - (p.z || 0)));
      });
      lengths.sort((x, y) => x - y);
      let length = lengths.length ? lengths[Math.floor(lengths.length / 2)] : 0;
      if (!(length > 0)) length = (layout.simulator && layout.simulator.springLength && layout.simulator.springLength()) || 10;
      let rect = canvas.getBoundingClientRect();
      let fov = ctx.scene.getDrawContext().fov;
      let view = ctx.scene.getDrawContext().view;
      let from = {center: Array.from(view.center), r: distance()};
      // pixels per unit at the distance r, and the distance that gives `linkPixels` per link
      let ppu = r => (rect.height / 2) / (r * Math.tan(fov / 2));
      let want = linkPixels / length;
      let r = Math.min(from.r, (rect.height / 2) / (want * Math.tan(fov / 2)));
      if (ppu(from.r) >= want) r = from.r;
      // The node at the middle of the free area (out from under a panel)
      let area = ctx.visibleArea && ctx.visibleArea();
      let free = (area && area.largestRect()) || {x: 0, y: 0, width: rect.width, height: rect.height};
      let dx = -(free.x + free.width / 2 - rect.width / 2) / ppu(r);
      let dy = -(free.y + free.height / 2 - rect.height / 2) / ppu(r);
      let m = Array.from(view.cameraWorld);
      // where the camera looks for the node where it is now (a running layout moves it)
      let target = () => {
        let q = layout.getNodePosition(node.id);
        let x = q.x, y = q.y || 0, z = q.z || 0;
        return [x + m[0] * dx - m[4] * dy, y + m[1] * dx - m[5] * dy, z + m[2] * dx - m[6] * dy];
      };
      setFollowing(false);
      stopCamera();
      tracking = null;
      if (gliding) cancelAnimationFrame(gliding);
      let start = performance.now();
      let time = reduced && reduced.matches ? 0 : duration;
      let step = () => {
        gliding = 0;
        let t = time > 0 ? Math.min(1, (performance.now() - start) / time) : 1;
        let e = t < 1 ? 1 - Math.pow(1 - t, 3) : 1;
        let to = target();
        place(from.center.map((v, i) => v + (to[i] - v) * e), from.r * Math.pow(r / from.r, e));
        if (t < 1) {
          gliding = requestAnimationFrame(step);
        } else {
          tracking = target;
          mine = cameraState();
        }
      };
      step();
      return true;
    }

    function setFollowing(on) {
      if (on === following) return;
      following = on;
      if (!on) mine = null;
      listeners.forEach(fn => fn(following));
    }

    function controls() {
      return ctx.view.getCamera && ctx.view.getCamera();
    }

    function cameraState() {
      let view = ctx.scene.getDrawContext().view;
      return Array.from(view.position).concat(Array.from(view.center));
    }

    function moved() {
      let now = cameraState();
      let tolerance = 1e-6 * Math.max(1, Math.abs(distance()));
      for (let i = 0; i < now.length; ++i) {
        if (Math.abs(now[i] - mine[i]) > tolerance) return true;
      }
      return false;
    }

    // The camera's distance to the point it looks at
    function distance() {
      let view = ctx.scene.getDrawContext().view;
      let p = view.position, c = view.center;
      return Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]);
    }

    // The camera's angles: theta from straight above, phi around the vertical axis
    function angles() {
      let view = ctx.scene.getDrawContext().view;
      let p = view.position, c = view.center;
      let x = p[0] - c[0], y = p[1] - c[1], z = p[2] - c[2];
      let r = Math.hypot(x, y, z) || 1;
      return {theta: Math.acos(Math.max(-1, Math.min(1, z / r))), phi: Math.atan2(y, x)};
    }

    // Turns the camera to these angles (when the scene allows rotation)
    function turn(cam, theta, phi) {
      if (!cam.allowRotation || !cam.rotateByAngle) return false;
      let now = angles();
      cam.rotateByAngle(phi - now.phi, theta - now.theta);
      cam.redraw();
      return true;
    }

    // Puts the camera `r` away from `center`, at the angles it has now
    function place(center, r) {
      let cam = controls();
      let view = ctx.scene.getDrawContext().view;
      let now = distance();
      view.center[0] = center[0];
      view.center[1] = center[1];
      view.center[2] = center[2];
      if (now > 0 && Math.abs(r / now - 1) > 1e-9) cam.zoomCenterByScaleFactor(1 - r / now, 0, 0);
      cam.redraw();
    }

    function fitNow(instant) {
      let cam = controls();
      let layout = ctx.layout;
      if (!cam || !layout) return;
      let bounds = layoutBounds(layout, settings.bulk, settings.bulkSlack);
      if (!bounds) return;
      if (bounds.D > 2 && settings.tilt && tiltedFor !== layout) {
        // a 3D layout: lean the camera so depth shows, if it looks straight down
        tiltedFor = layout;
        if (angles().theta < 0.05) tilted = turn(cam, settings.tilt.theta || 0, (settings.tilt.phi || 0) + angles().phi) || tilted;
      } else if (bounds.D <= 2 && tilted) {
        // back to 2D: level the camera this module leaned
        tiltedFor = null;
        tilted = false;
        turn(cam, 0, angles().phi);
      }
      let rect = canvas.getBoundingClientRect();
      let area = ctx.visibleArea && ctx.visibleArea();
      let open = area && area.largestRect();
      // Nothing, or only a sliver, of the canvas shows (Settings and a soft keyboard cover it):
      // keep the camera until there is room again
      if (area && area.anyHidden && (!open || open.height < settings.minRoom || open.width < settings.minRoom)) return;
      let free = open || {x: 0, y: 0, width: rect.width, height: rect.height};
      usedFree = free;
      let labels = !!(ctx.view.getModule && ctx.view.getModule('labels'));
      let room = labels && settings.labelRoom ? settings.labelRoom : {x: 0, y: 0};
      // Room around the drawing, and beside it for labels, shrinks with a small screen
      let pad = Math.min(settings.padding, Math.max(8, 0.04 * Math.min(free.width, free.height)));
      let padX = Math.min(pad + Math.min(room.x, 0.08 * free.width), free.width / 4);
      let padY = Math.min(pad + room.y, free.height / 4);
      let target = {
        x: free.x + padX, y: free.y + padY,
        width: Math.max(1, free.width - 2 * padX), height: Math.max(1, free.height - 2 * padY)
      };
      let view = ctx.scene.getDrawContext().view;
      let from = {center: Array.from(view.center), r: distance()};
      let fov = ctx.scene.getDrawContext().fov;
      // pixels per layout unit at the plane through the centre, facing the camera
      let ppu = r => (rect.height / 2) / (r * Math.tan(fov / 2));
      let minR = (rect.height / 2) / (settings.maxScale * Math.tan(fov / 2));

      let center = [(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2, (bounds.minZ + bounds.maxZ) / 2];
      let r = Math.max(from.r, minR);
      place(center, r);
      // The box's corners on the screen decide the distance and where the camera looks. With a
      // camera from straight above this is exact at once; leaning, it converges in a few rounds.
      for (let round = 0; round < 6; ++round) {
        let screen = projectBox(bounds);
        if (!screen) {
          r *= 2;
          place(center, r);
          continue;
        }
        let f = Math.max(screen.width / target.width, screen.height / target.height, 1e-3);
        let newR = Math.max(r * f, minR);
        let k = ppu(r), kNew = ppu(newR);
        let canvasX = rect.width / 2, canvasY = rect.height / 2;
        let dx = (screen.x + screen.width / 2 - canvasX) / k - (target.x + target.width / 2 - canvasX) / kNew;
        let dy = (screen.y + screen.height / 2 - canvasY) / k - (target.y + target.height / 2 - canvasY) / kNew;
        // the camera's right and up, in the scene
        let m = view.cameraWorld;
        center = [
          center[0] + m[0] * dx - m[4] * dy,
          center[1] + m[1] * dx - m[5] * dy,
          center[2] + m[2] * dx - m[6] * dy
        ];
        let done = Math.abs(newR / r - 1) < 2e-3 && Math.abs(dx * kNew) < 0.5 && Math.abs(dy * kNew) < 0.5;
        r = newR;
        place(center, r);
        if (done) break;
      }
      easing = false;
      if (!instant && r < from.r * 0.995 && !(reduced && reduced.matches)) {
        // moving in: ease. Moving out happens at once, so the drawing is never cut off
        let a = settings.ease;
        r = from.r * Math.pow(r / from.r, a);
        center = center.map((value, i) => from.center[i] + (value - from.center[i]) * a);
        place(center, r);
        easing = true;
      }
      mine = cameraState();
      // the frame being drawn used the camera from before: draw once more
      ctx.animate();
    }

    // The screen box (CSS pixels) of what is drawn: in 2D the layout's box; in 3D the nodes
    // themselves (a sample of them, inside the box), since a round drawing doesn't fill the
    // corners of its box. Null when a point is behind the camera.
    function projectBox(b) {
      if (b.D > 2) return projectNodes(b);
      let corners = b.corners || (b.corners = screenAlignedCorners(b));
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < corners.length; i += 2) {
        let p = ctx.toScreen(corners[i], corners[i + 1], 0);
        if (!p) return null;
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      return {x: minX, y: minY, width: Math.max(maxX - minX, 1e-3), height: Math.max(maxY - minY, 1e-3)};
    }

    // 2D: the corners of the nodes' box along the screen's axes (the view may be turned), so a
    // turned drawing doesn't get the room of its box's corners. The camera turns only in
    // orient(), never inside a fit, so the axes stay put while the fit converges.
    function screenAlignedCorners(b) {
      let m = ctx.scene.getDrawContext().view.cameraWorld;
      let rx = m[0], ry = m[1], ux = m[4], uy = m[5];
      let lr = Math.hypot(rx, ry) || 1, lu = Math.hypot(ux, uy) || 1;
      rx /= lr; ry /= lr; ux /= lu; uy /= lu;
      if (Math.abs(rx - 1) < 1e-9 && Math.abs(uy - 1) < 1e-9) {
        return [b.minX, b.minY, b.maxX, b.minY, b.minX, b.maxY, b.maxX, b.maxY];
      }
      let {pos, D, n} = ctx.layout.simulator.store;
      let r0 = Infinity, r1 = -Infinity, u0 = Infinity, u1 = -Infinity;
      for (let i = 0; i < n; ++i) {
        let x = pos[i * D], y = pos[i * D + 1];
        if (!(x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY)) continue;
        let r = x * rx + y * ry, u = x * ux + y * uy;
        if (r < r0) r0 = r;
        if (r > r1) r1 = r;
        if (u < u0) u0 = u;
        if (u > u1) u1 = u;
      }
      if (!(r0 <= r1)) return [b.minX, b.minY, b.maxX, b.minY, b.minX, b.maxY, b.maxX, b.maxY];
      let corner = (r, u) => [r * rx + u * ux, r * ry + u * uy];
      return [].concat(corner(r0, u0), corner(r1, u0), corner(r0, u1), corner(r1, u1));
    }

    function projectNodes(b) {
      let store = ctx.layout.simulator.store;
      let {pos, D, n} = store;
      let stride = Math.max(1, Math.floor(n / 3000));
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < n; i += stride) {
        let x = pos[i * D], y = pos[i * D + 1], z = pos[i * D + 2];
        if (!(x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY && z >= b.minZ && z <= b.maxZ)) continue;
        let p = ctx.toScreen(x, y, z);
        if (!p) return null;
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      if (!(minX <= maxX)) return null;
      return {x: minX, y: minY, width: Math.max(maxX - minX, 1e-3), height: Math.max(maxY - minY, 1e-3)};
    }
  }
};

/**
 * The box to frame: of every node, or, when that is much larger (`slack` times on an axis than
 * the box that leaves out `bulk` of the nodes at each end), of the bulk. First three axes.
 */
function layoutBounds(layout, bulk = 0, slack = Infinity) {
  let store = layout && layout.simulator && layout.simulator.store;
  if (!store || !store.pos || !store.n) return null;
  let {pos, D, n} = store;
  let dims = Math.min(D, 3);
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; ++i) {
    for (let d = 0; d < dims; ++d) {
      let v = pos[i * D + d];
      if (!Number.isFinite(v)) continue;
      if (v < min[d]) min[d] = v;
      if (v > max[d]) max[d] = v;
    }
  }
  if (!(min[0] <= max[0])) return null;
  for (let d = dims; d < 3; ++d) min[d] = max[d] = 0;
  if (bulk > 0 && n >= 50) {
    let trimmed = false;
    let lo = min.slice(), hi = max.slice();
    for (let d = 0; d < dims; ++d) {
      let q = quantiles(pos, D, n, d, min[d], max[d], bulk);
      if (max[d] - min[d] > slack * (q[1] - q[0])) {
        lo[d] = q[0];
        hi[d] = q[1];
        trimmed = true;
      }
    }
    if (trimmed) {
      // a little room past the bulk, so its own edge isn't cut
      for (let d = 0; d < dims; ++d) {
        let extra = (hi[d] - lo[d]) * 0.04;
        min[d] = Math.max(min[d], lo[d] - extra);
        max[d] = Math.min(max[d], hi[d] + extra);
      }
    }
  }
  return {minX: min[0], maxX: max[0], minY: min[1], maxY: max[1], minZ: min[2], maxZ: max[2], D};
}

// The `share` and 1 - `share` quantiles of axis `d`, from a histogram (O(n), no sort)
function quantiles(pos, D, n, d, lo, hi, share) {
  const BINS = 4096;
  if (!(hi > lo)) return [lo, hi];
  let counts = new Uint32Array(BINS);
  let scale = (BINS - 1) / (hi - lo);
  let total = 0;
  for (let i = 0; i < n; ++i) {
    let v = pos[i * D + d];
    if (!Number.isFinite(v)) continue;
    counts[Math.floor((v - lo) * scale)] += 1;
    total += 1;
  }
  let cut = Math.floor(total * share);
  let a = 0, b = BINS - 1;
  for (let seen = 0; a < BINS - 1; ++a) {
    seen += counts[a];
    if (seen > cut) break;
  }
  for (let seen = 0; b > 0; --b) {
    seen += counts[b];
    if (seen > cut) break;
  }
  return [lo + a / scale, lo + (b + 1) / scale];
}

// The main axis of a 2D layout: its centre, unit direction, and extent(angle on the screen) giving
// the width of the drawing along a screen direction once the axis points at angle 0. Null when
// the drawing is round.
function principalAxis(store) {
  let {pos, D, n} = store;
  let mx = 0, my = 0, count = 0;
  for (let i = 0; i < n; ++i) {
    let x = pos[i * D], y = pos[i * D + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    mx += x; my += y; count += 1;
  }
  if (count < 3) return null;
  mx /= count; my /= count;
  let xx = 0, yy = 0, xy = 0;
  for (let i = 0; i < n; ++i) {
    let x = pos[i * D] - mx, y = pos[i * D + 1] - my;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    xx += x * x; yy += y * y; xy += x * y;
  }
  let angle = 0.5 * Math.atan2(2 * xy, xx - yy);
  let ux = Math.cos(angle), uy = Math.sin(angle);
  // extents along the axis (a) and across it (b), from the 1st to the 99th percentile
  let along = [], across = [];
  let stride = Math.max(1, Math.floor(n / 5000));
  for (let i = 0; i < n; i += stride) {
    let x = pos[i * D] - mx, y = pos[i * D + 1] - my;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    along.push(x * ux + y * uy);
    across.push(-x * uy + y * ux);
  }
  let spread = values => {
    values.sort((p, q) => p - q);
    let k = Math.floor(values.length * 0.01);
    return Math.max(1e-6, values[values.length - 1 - k] - values[k]);
  };
  let a = spread(along), b = spread(across);
  return {
    cx: mx, cy: my, ux, uy,
    // the drawing's width along a screen direction at `angle` from where the axis points
    extent: theta => Math.abs(a * Math.cos(theta)) + Math.abs(b * Math.sin(theta))
  };
}

// createView(): draws a graph that an ngraph.forcelayout layout moves, on a w-gl scene, and lets
// modules add interaction on top of it.
//
//   const scene = createScene(canvas);
//   const view = createView(scene, { graph, layout });
//   view.use(hoverNodes);   // modules: hover, drag, select (see modules/)
//   layout.step();          // the view redraws on the layout's 'step' event
//   view.setLayout(next);   // a new layout of the same graph
//   view.dispose();
//
// Positions go to the GPU as a texture, filled in one pass over the layout's `store.pos`; nodes
// and edges read them there, so a frame costs one loop over the nodes and one upload, and nothing
// at all when no position changed. Frames are drawn only when something changed: a step of the
// layout, a camera move, a flag, or a call below.
//
// The view takes over camera input from the scene (see camera.js and input.js): pointers, the
// wheel and keys go through one input layer, which modules share with the camera.

const DEFAULTS$1 = {
  // The text that stands for a node: in tooltips, search, announcements and labels
  nodeLabel: node => {
    let data = node.data;
    if (data && typeof data === 'object') {
      if (data.label !== undefined && data.label !== null) return String(data.label);
      if (data.name !== undefined && data.name !== null) return String(data.name);
    }
    return String(node.id);
  },
  nodeColor: 0x90f8fcff,
  linkColor: 0xffffff10,
  linkWidth: 2,
  // Size of a node's dot in scene units
  nodeSize: node => (node.data && node.data.size) || 1,
  // Smallest diameter of the smallest node in CSS pixels, at any zoom (0: nodes shrink with the
  // zoom). Bigger nodes keep their order: four times the size is at least twice as wide
  nodeMinSize: 0,
  // Where nodes crowd, no node is drawn wider than this share of the distance to its nearest
  // neighbour at least as big (see room.js), so small nodes give way to big ones. 0: off
  nodeRoom: 0,
  // How nodes and links mix with what is under them: 'normal' (alpha), or 'add' (light adds up,
  // so dense places glow; on a dark background). Highlights and layers always blend normally.
  blend: 'normal',
  // In 3D, what is farther from the camera fades to this share of its alpha (1: no fog)
  fog: 1
};

// How flagged nodes and links look. "Pointed" is hovered, dragged or focused.
const STYLES = {
  pointedColor: 0xffffffff,
  pointedScale: 1.5,
  // Smallest diameter in CSS pixels, so a highlight shows at any zoom
  pointedMinSize: 8,
  selectedColor: 0xffc24bff,
  selectedScale: 1.25,
  selectedMinSize: 6,
  // Rings around pointed and selected nodes (0: none): a halo in `ringHalo` (best the background's
  // color) `ringGap` pixels wide, then the ring, `ringWidth` pixels. A ring reads on a node of any
  // color, so with rings the fill colors above can be 0 (the node keeps its own color).
  pointedRing: 0,
  selectedRing: 0,
  // A focused node's ring (the keyboard's place, or where search went); 0: pointedRing
  focusedRing: 0,
  ringHalo: 0x000000cc,
  ringGap: 2,
  ringWidth: 2,
  // Links that touch a selected or pointed node get at least this alpha, and this color (alpha
  // 0: they keep their own)
  litLinkAlpha: 0.8,
  litLinkColor: 0,
  // While something is selected, nodes and links away from it fade to this alpha
  dimAlpha: 0.15
};

// Pixels from a node's disc within which a pointer still picks it. For touch, half the finger's
// reported contact width when that is larger, up to `touchMax`.
const REACH = {mouse: 8, pen: 10, touch: 16, touchMax: 32};
// The hovered node gets this many more pixels, so hover doesn't flicker between neighbours
const STICKY = 4;
// Selected nodes are drawn on top while there are at most this many, with this many links
const ON_TOP_LIMITS = {nodes: 1000, links: 100000};

/**
 * Options:
 * - `graph`: the ngraph.graph to draw.
 * - `layout`: the ngraph.forcelayout layout of that graph that gives the positions.
 * - `nodeColor`: 0xRRGGBBAA, or `node => color` (0 or nothing means the default color).
 * - `linkColor`: 0xRRGGBBAA, or `link => color`.
 * - `nodeSize`: a number, or `node => size` in scene units (default: `node.data.size` or 1).
 * - `linkWidth`: width of links in pixels.
 * - `nodeLabel`: `node => text` that stands for a node in tooltips, search and announcements
 *   (default: `data.label`, `data.name`, or the id).
 * - `styles`: how flagged nodes look (STYLES above).
 * - `camera`: camera input options (see camera.js), `input`: thresholds (see input.js), or
 *   `input: false` to leave the scene's own controls alone (no modules then).
 * - `reach`: picking reach in pixels per pointer type (REACH above).
 * - `occlusion`: what hides parts of the canvas, so the camera brings nodes out from under it
 *   (see visible.js). true (default): any element on top of the canvas (a settings panel) or
 *   outside the window, found by hit testing; false: only the canvas edges; or a function
 *   `(x, y) => boolean` that says whether a canvas point (CSS pixels) is hidden.
 *
 * Functions are called once per node or link when the view builds its buffers (the first frame,
 * graph changes, setLayout(), setNodeColor(), refresh()), never on every frame.
 */
function createView(scene, options = {}) {
  let gl = scene.getGL();
  let {instancing, maxTextureSize} = getCapabilities(gl);
  let graph = options.graph;
  if (!graph) throw new Error('createView() needs a graph');
  let canvas = scene.getDrawContext().canvas;

  let settings = {...DEFAULTS$1};
  ['nodeColor', 'linkColor', 'linkWidth', 'nodeSize', 'nodeLabel', 'nodeMinSize', 'nodeRoom', 'blend', 'fog'].forEach(name => {
    if (options[name] !== undefined) settings[name] = options[name];
  });
  let styles = {...STYLES, ...(options.styles || {})};
  let reach = {...REACH, ...(options.reach || {})};
  let style = {
    pointedColor: new Float32Array(4), pointedSize: new Float32Array(2),
    selectedColor: new Float32Array(4), selectedSize: new Float32Array(2),
    pointedRing: new Float32Array(4), selectedRing: new Float32Array(4), focusedRing: new Float32Array(4), ringHalo: new Float32Array(4),
    ringSize: new Float32Array(2),
    litAlpha: 1, litColor: new Float32Array(4), dimAlpha: 1, minSize: 0, fog: new Float32Array([0, 1, 1])
  };

  let nodeProgram = createNodeProgram(gl, instancing);
  let edgeProgram = createEdgeProgram(gl, instancing);
  // `hasDepth`: the layout has a third axis, so nodes are drawn with depth (see programs.js)
  let positions = {texture: null, width: TEXTURE_WIDTH, rows: 0, data: null, hasDepth: false};
  // `rooms` is set while `roomBuffer` holds a room for every node
  let nodes = {count: 0, rows: gl.createBuffer(), sizes: gl.createBuffer(), colors: gl.createBuffer(), rooms: null, rowCount: 0};
  let roomBuffer = gl.createBuffer();
  // Rooms of the nodes (room.js), when they were measured, what that took, and a timer for the
  // measure after the drawing stopped moving
  let rooms = {data: new Float32Array(0), reach: new Float32Array(0), cache: {}, at: -Infinity, ms: 0, timer: 0, stale: true};
  // The box of the drawn positions (for the fog), updated with them
  let bounds = {cx: 0, cy: 0, cz: 0, radius: 0};
  let edges = {count: 0, ends: gl.createBuffer(), colors: gl.createBuffer(), width: settings.linkWidth};
  // Nodes and links drawn again on top (see flags.js)
  let top = {
    nodes: {count: 0, rows: gl.createBuffer(), sizes: gl.createBuffer(), colors: gl.createBuffer()},
    edges: {count: 0, ends: gl.createBuffer(), colors: gl.createBuffer(), width: settings.linkWidth}
  };
  // What the last build read: the node of each row, sizes and colors
  let nodeData = {nodes: [], sizes: new Float32Array(0), colors: new Uint32Array(0), maxSize: 0};

  // What the next frame has to bring up to date
  let structureDirty = true, nodesDirty = true, edgesDirty = true, positionsDirty = true;
  let flagsDirty = true, textureDirty = false, cameraMoved = false;
  // The graph changed and the layout may still hold rows of removed bodies
  let editsPending = false;
  let layout = null;

  let flags = createFlags(() => {
    flagsDirty = true;
    scene.renderFrame();
  });
  // Flag of each row as drawn, and the rows that have one
  let rowBits = new Uint8Array(0);
  let flaggedRows = [];

  let events = createEmitter();
  let projector = createProjector();
  let frameHooks = new Set();
  let cameraHooks = new Set();
  // APIs modules share with each other (ctx.provide / ctx.get)
  let services = new Map();
  // What modules draw after the nodes (labels), and whether one wants the next frame too
  let layers = [];
  let animating = false;
  let revealFrame = 0;
  let modules = [];
  let savedCursor = canvas.style ? canvas.style.cursor : '';

  let element = new Element();
  element.type = 'GraphView';
  element.draw = draw;
  element.dispose = disposeGL;
  scene.appendChild(element);

  let visibility = options.occlusion === false ? null :
    createVisibility(canvas, typeof options.occlusion === 'function' ? options.occlusion : null);

  let camera = null, input = null;
  if (options.input !== false) {
    // The user turns only a drawing with depth: a 2D one stays as it is under the hands
    camera = createCamera(scene, options.camera, {is3D: () => !!layout && layout.simulator.store.D >= 3});
    input = createInput(canvas, {
      pick: pressHit,
      emit: (name, e) => events.emit(name, e),
      hasListeners: name => events.has(name),
      scenePoint,
      onPress: () => camera.stop(),
      settings: options.input
    });
    input.add(camera.handler);
  }

  scene.on('transform', onTransform);
  graph.on('changed', onGraphChanged);
  setLayout(options.layout);

  let api = {
    setLayout,
    setNodeColor,
    setLinkColor,
    setNodeMinSize,
    setDrawing,
    setStyles,
    getStyles: () => ({...styles}),
    invalidate,
    refresh,
    use,
    /** The API of the attached module with this name (the last one attached), or null */
    getModule(name) {
      for (let i = modules.length - 1; i >= 0; --i) {
        if (modules[i].module.name === name && modules[i].result) return modules[i].result;
      }
      return null;
    },
    on: (name, fn) => { events.on(name, fn); return api; },
    off: (name, fn) => { events.off(name, fn); return api; },
    pick,
    flags,
    labelOf,
    reveal,
    visibleArea,
    toScreen,
    getLayout: () => layout,
    getCamera: () => camera && camera.controls,
    dispose,
    getElement: () => element
  };
  return api;

  /** Draw positions of another layout of the same graph (e.g. after a reset) */
  function setLayout(newLayout) {
    if (!newLayout) throw new Error('createView() needs a layout');
    if (layout) unsubscribe(layout);
    layout = newLayout;
    layout.on('step', invalidate);
    // Rows of bodies move when bodies come and go
    layout.simulator.on('topology', onTopology);
    // Body order of the new layout may differ from the old one
    structureDirty = true;
    scene.renderFrame();
  }

  /**
   * New drawing settings, any of `nodeSize`, `linkWidth`, `nodeRoom`, `fog`, `blend` (as in the
   * options): what they change is built again at the next frame
   */
  function setDrawing(drawing) {
    ['nodeSize', 'linkWidth', 'nodeRoom', 'fog', 'blend'].forEach(name => {
      if (drawing[name] !== undefined) settings[name] = drawing[name];
    });
    if (drawing.nodeSize !== undefined) nodesDirty = true;
    if (drawing.linkWidth !== undefined) edgesDirty = true;
    rooms.stale = true;
    scene.renderFrame();
  }

  function setNodeColor(color) {
    settings.nodeColor = color;
    nodesDirty = true;
    scene.renderFrame();
  }

  function setLinkColor(color) {
    settings.linkColor = color;
    edgesDirty = true;
    scene.renderFrame();
  }

  /** Smallest diameter of a node in CSS pixels (0: none) */
  function setNodeMinSize(pixels) {
    settings.nodeMinSize = pixels || 0;
    scene.renderFrame();
  }

  /** New styles for flagged nodes and links (any of STYLES) */
  function setStyles(newStyles) {
    Object.assign(styles, newStyles);
    scene.renderFrame();
  }

  /** Positions changed outside of a layout step (setNodePosition(), a GPU sync, ...) */
  function invalidate() {
    positionsDirty = true;
    scene.renderFrame();
  }

  /** Call the color and size functions again, e.g. when what they read has changed */
  function refresh() {
    nodesDirty = edgesDirty = positionsDirty = true;
    scene.renderFrame();
  }

  /**
   * Attaches a module: an object with `attach(ctx, options)` that returns its API (or nothing).
   * Returns that API with a `dispose()` that also removes everything the module registered
   * through `ctx`.
   */
  function use(module, moduleOptions) {
    if (!module || typeof module.attach !== 'function') throw new Error('view.use() needs a module with attach(ctx, options)');
    if (!input) throw new Error(`The ${module.name || ''} module needs input, but this view was created with input: false`);
    let record = {module, cleanups: [], cursor: null, disposed: false};
    modules.push(record);
    let result;
    try {
      result = module.attach(createContext(record), moduleOptions || {}) || {};
    } catch (e) {
      release(record);
      throw e;
    }
    let ownDispose = result.dispose;
    result.dispose = () => {
      if (record.disposed) return;
      if (ownDispose) ownDispose.call(result);
      release(record);
    };
    record.result = result;
    return result;
  }

  function release(record) {
    record.disposed = true;
    for (let i = record.cleanups.length - 1; i >= 0; --i) record.cleanups[i]();
    record.cleanups = [];
    let index = modules.indexOf(record);
    if (index >= 0) modules.splice(index, 1);
    updateCursor();
  }

  // What a module gets. Everything it registers here is removed when it is disposed.
  function createContext(record) {
    let cleanups = record.cleanups;
    return {
      view: api,
      scene,
      graph,
      get layout() { return layout; },
      flags,
      FLAGS,
      input: {
        add(handler) {
          let remove = input.add(handler);
          cleanups.push(remove);
          return remove;
        },
        cancel: pointerId => input.cancel(pointerId),
        dragging: () => input.dragging(),
        busy: () => input.busy(),
        claimant: p => input.claimant(p),
        hoverPoint: () => input.hoverPoint(),
        /**
         * A tap on `node` that came from somewhere else than a pointer (Enter on a focused node):
         * the app and every module see it as a tap. `fields` adds modifier keys and the like.
         */
        tap(node, fields) {
          let row = rowOf(node.id);
          let at = row >= 0 ? toScreenOf(node) : null;
          return input.tap({node, row, inside: true, clear: true}, Object.assign({
            x: at ? at.x : 0, y: at ? at.y : 0, pointerType: 'keyboard', button: 0
          }, fields));
        },
        settings: input.settings
      },
      labelOf,
      reveal,
      visibleArea,
      /** Every node's place on the canvas this frame: {nodes, x, y, onScreen} (see screenPositions) */
      screenPositions,
      /** Makes `api` available to other modules as `ctx.get(name)` while this module is attached */
      provide(name, value) {
        services.set(name, value);
        cleanups.push(() => { if (services.get(name) === value) services.delete(name); });
      },
      get: name => services.get(name) || null,
      pick,
      nodesInRect: (x0, y0, x1, y1) => {
        let state = pickState();
        if (!state) return [];
        return nodesInRect(state, x0, y0, x1, y1).map(row => nodeData.nodes[row]).filter(Boolean);
      },
      toScreen,
      fromScreen,
      /**
       * Where `nodes` are drawn now, for a few of them (one read of the camera for all):
       * [{x, y, radius} or null], in CSS pixels; `radius` is the disc's as sized (not as flags
       * enlarge it). Null behind the camera or for nodes that have no row.
       */
      discsOf(list) {
        updateProjector();
        let out = {x: 0, y: 0, w: 0};
        return list.map(node => {
          let row = rowOf(node.id);
          if (row < 0 || !layout) return null;
          let pos = layout.getNodePosition(node.id);
          if (!pos || !projector.toScreen(pos.x, pos.y || 0, pos.z || 0, out)) return null;
          let size = row < nodeData.sizes.length ? nodeData.sizes[row] : 1;
          return {x: out.x, y: out.y, radius: size * 0.5 * projector.pixelsPerUnit(out.w)};
        });
      },
      /** An event for the app's listeners (returned, so the module can check defaultPrevented) */
      emit(name, fields) {
        let e = new ViewEvent(name, null, fields);
        events.emit(name, e);
        return e;
      },
      on(name, fn) {
        events.on(name, fn);
        cleanups.push(() => events.off(name, fn));
      },
      /**
       * `fn(change)` runs inside every frame, before flags and positions go to the GPU, so what
       * it flags shows in this frame. `change`: {positions, camera, structure} tells what moved.
       */
      onFrame(fn) {
        frameHooks.add(fn);
        cleanups.push(() => frameHooks.delete(fn));
      },
      /**
       * `fn()` runs when what covers the canvas may have changed (a click, a key, a resize, a
       * scroll, the end of a transition): a module that avoids covers (labels) looks again
       */
      onVisibleAreaChange(fn) {
        if (!visibility) return;
        cleanups.push(visibility.onChange(fn));
      },
      /** `fn()` runs after every camera move */
      onCamera(fn) {
        cameraHooks.add(fn);
        cleanups.push(() => cameraHooks.delete(fn));
      },
      /** WebGL of the scene, for layers: the context and ANGLE_instanced_arrays */
      gl,
      instancing,
      /**
       * Draws `layer.draw(frame)` after the nodes, in `layer.order` (default 0). `frame` has gl,
       * instancing, positions (the texture, see positions.js), mvp, drawContext, style and time.
       * `layer.dispose()` runs when the module goes.
       */
      addLayer(layer) {
        if (layer.order === undefined) layer.order = 0;
        layers.push(layer);
        layers.sort((a, b) => a.order - b.order);
        cleanups.push(() => {
          let index = layers.indexOf(layer);
          if (index >= 0) layers.splice(index, 1);
          if (layer.dispose) layer.dispose();
          scene.renderFrame();
        });
      },
      /** Asks for another frame after this one (an animation, such as a fade, is running) */
      animate() {
        animating = true;
        scene.renderFrame();
      },
      /** The cursor this module wants (null: none). The highest `priority` wins. */
      setCursor(value, priority = 1) {
        record.cursor = value ? {value, priority} : null;
        updateCursor();
      },
      requestFrame: () => scene.renderFrame()
    };
  }

  function updateCursor() {
    if (!canvas.style) return;
    let best = null;
    modules.forEach(record => {
      if (record.cursor && (!best || record.cursor.priority >= best.priority)) best = record.cursor;
    });
    canvas.style.cursor = best ? best.value : savedCursor;
  }

  /**
   * The node under a canvas point (CSS pixels from its top left corner), or null. `options`:
   * `pointerType` ('mouse', 'pen', 'touch') and `width` (contact width) set the reach; `reach`
   * sets it in pixels; `sticky` (a node) gets a few more pixels; `labels: false` looks at the
   * discs only (a label module makes each label's text pick its node).
   *
   * Returns {node, row, distance, inside, covers, clear, gap, x, y, radius, label}: `label` is true
   * when the point is on the node's label and not right on a disc (then `clear` is false: a press there
   * moves the camera, a tap picks the node, a long press grabs it). `distance` from the
   * disc's edge in pixels, the disc on the canvas. `clear`: the point is on this disc and no
   * other, or the next nearest node is at least half the reach farther (`gap` pixels). Where nodes
   * crowd or overlap, a pick is not clear. The same for every pointer: hovering (`sticky`) helps a
   * node win, but doesn't make it clear.
   */
  function pick(x, y, pickOptions = {}) {
    let state = pickState();
    if (!state || !state.count) return null;
    let distance = pickOptions.reach !== undefined ? pickOptions.reach : reachFor(pickOptions.pointerType, pickOptions.width);
    let margin = distance / 2;
    let stickyRow = pickOptions.sticky ? rowOf(pickOptions.sticky.id) : -1;
    let hit = pickNode(state, x, y, distance, stickyRow, stickyRow >= 0 ? STICKY : 0, margin);
    // A label is part of its node: a point on a label's text picks that node, unless it is right
    // on a disc that shows through the text (the inner half of it: a dot under a letter doesn't
    // take the word). A label in front (the pointed node's) is above everything. Not clear: a
    // press on a label moves the camera, as on a map
    let labels = pickOptions.labels === false ? null : services.get('labelTargets');
    let labelled = labels ? labels.at(x, y) : null;
    let onDisc = hit && hit.inside && Math.hypot(x - hit.x, y - hit.y) <= Math.max(1.5, hit.radius * 0.5);
    if (labelled && (labelled.front || !onDisc)) {
      let row = rowOf(labelled.node.id);
      if (row >= 0 && nodeData.nodes[row]) {
        return {node: nodeData.nodes[row], row, distance: 0, inside: true, covers: 1, clear: false, gap: 0,
          x: labelled.x, y: labelled.y, radius: labelled.radius, label: true};
      }
    }
    if (!hit) return null;
    hit.node = nodeData.nodes[hit.row];
    hit.clear = (hit.inside && hit.covers === 1) || hit.gap >= margin;
    return hit.node ? hit : null;
  }

  function reachFor(pointerType, width) {
    if (pointerType === 'touch') return Math.max(reach.touch, Math.min(reach.touchMax, (width || 0) / 2));
    if (pointerType === 'pen') return reach.pen;
    return reach.mouse;
  }

  function pickState() {
    if (!layout) return null;
    build();
    let store = layout.simulator.store;
    updateProjector();
    return {
      pos: store.pos, D: store.D, count: Math.min(store.n, nodes.count),
      sizes: nodeData.sizes, maxSize: nodeData.maxSize, projector,
      // Discs as drawn: at least nodeMinSize pixels wide, at most their room (see pick.js)
      minPixels: settings.nodeMinSize || 0, baseSize: nodeData.minSize || 1,
      rooms: settings.nodeRoom > 0 && nodes.rooms ? rooms.data : null
    };
  }

  function updateProjector() {
    let drawContext = scene.getDrawContext();
    let rect = canvas.getBoundingClientRect();
    projector.set(drawContext.projection, drawContext.view.matrix, element.worldModel, rect.width, rect.height);
  }

  // What a press at (x, y) takes. What lights up is what a press takes: a mouse or pen takes the
  // node it lit (the hover module says which), a finger the node nearest to it
  function pressHit(x, y, p) {
    if (p.pointerType !== 'touch') {
      let litAt = services.get('litAt');
      let lit = litAt ? litAt(x, y) : null;
      if (lit && lit.node && rowOf(lit.node.id) >= 0) return lit;
    }
    return pick(x, y, {pointerType: p.pointerType, width: p.width});
  }

  function rowOf(id) {
    let body = layout && layout.getBody(id);
    return body && body.index < nodes.count ? body.index : -1;
  }

  /**
   * Pans the camera so `node` is in view: inside the canvas and out from under what covers it (a
   * panel over the canvas, see the `occlusion` option), `margin` (a share of the smaller side,
   * 0.15) away from both. It glides there (about 200 ms) unless the user prefers reduced motion
   * or `animate` is false. Returns false when the node was in view already.
   *
   * The camera pans the plane z = 0; a node at another depth moves by a different amount, so
   * every step measures again where the node is and how far it still has to go.
   */
  function reveal(node, revealOptions = {}) {
    let controls = camera && camera.controls;
    if (!controls || !node) return false;
    let margin = revealOptions.margin !== undefined ? revealOptions.margin : 0.15;
    let area = coversNear(node, margin) ? visibility.area() : null;
    let first = remaining(node, margin, area);
    if (!first || (!first.x && !first.y)) return false;
    if (revealFrame) cancelAnimationFrame(revealFrame);
    revealFrame = 0;
    let reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || revealOptions.animate === false) {
      for (let i = 0, left = first; i < 6 && left && (Math.abs(left.x) > 0.5 || Math.abs(left.y) > 0.5); ++i) {
        controls.panByAbsoluteOffset(left.x, left.y);
        controls.redraw();
        left = remaining(node, margin, area);
      }
      return true;
    }
    let frames = 0;
    let step = () => {
      let left = remaining(node, margin, area);
      frames += 1;
      if (!left || (Math.abs(left.x) <= 0.5 && Math.abs(left.y) <= 0.5) || frames > 40) {
        if (left && (left.x || left.y)) {
          controls.panByAbsoluteOffset(left.x, left.y);
          controls.redraw();
        }
        revealFrame = 0;
        return;
      }
      // A third of the way each frame: about 200 ms to arrive at 60 fps
      controls.panByAbsoluteOffset(left.x / 3, left.y / 3);
      controls.redraw();
      revealFrame = requestAnimationFrame(step);
    };
    revealFrame = requestAnimationFrame(step);
    return true;
  }

  // How far (pixels) the camera still has to move `node` to have it `margin` inside the canvas,
  // and, with the visible `area`, as far from what covers it
  function remaining(node, margin, area) {
    let at = toScreenOf(node);
    if (!at) return null;
    let rect = canvas.getBoundingClientRect();
    let inset = Math.min(rect.width, rect.height) * margin;
    let spot = area && area.anyHidden ? area.nearest(at.x, at.y, inset) : null;
    if (!spot) spot = {x: clamp(at.x, inset, rect.width - inset), y: clamp(at.y, inset, rect.height - inset)};
    return {x: spot.x - at.x, y: spot.y - at.y};
  }

  // Whether something covers the canvas near where `node` would go without covers: a quick look
  // (25 points) before measuring the whole visible area
  function coversNear(node, margin) {
    if (!visibility) return false;
    let at = toScreenOf(node);
    if (!at) return false;
    let rect = canvas.getBoundingClientRect();
    let inset = Math.min(rect.width, rect.height) * margin;
    let x = clamp(at.x, inset, rect.width - inset), y = clamp(at.y, inset, rect.height - inset);
    let around = Math.max(inset, 8);
    return visibility.coveredIn(Math.max(0, x - around), Math.max(0, y - around),
      Math.min(rect.width, x + around), Math.min(rect.height, y + around), around / 2);
  }

  /**
   * The part of the canvas the user can see (see visible.js): {isHidden(x, y), nearest(x, y,
   * margin), center(), anyHidden, ...}, measured by hit testing (about 3 ms) or a moment ago.
   * Null with `occlusion: false`.
   */
  function visibleArea() {
    return visibility ? visibility.area() : null;
  }

  function labelOf(node) {
    let label = settings.nodeLabel(node);
    return label === undefined || label === null || label === '' ? String(node.id) : String(label);
  }

  /** Where a node is on the canvas now: {x, y} in CSS pixels, or null */
  function toScreenOf(node) {
    let pos = layout && layout.getBody(node.id) ? layout.getNodePosition(node.id) : null;
    return pos ? toScreen(pos.x, pos.y || 0, pos.z || 0) : null;
  }

  /**
   * Where every node is on the canvas: {nodes, x, y, radius, onScreen, width, height, sizes}. `x`,
   * `y` (CSS pixels) and `radius` (of the disc, pixels) are per row; `onScreen[row]` is 1 when the
   * node is in front of the camera and inside the canvas; `sizes` are the nodes' diameters in
   * scene units. One pass over the nodes (about 0.6 ms at 100k).
   */
  function screenPositions() {
    let state = pickState();
    if (!state) return {nodes: [], x: new Float32Array(0), y: new Float32Array(0), onScreen: new Uint8Array(0), width: 0, height: 0};
    let projected = projectAll(state);
    projected.nodes = nodeData.nodes;
    projected.sizes = nodeData.sizes;
    return projected;
  }

  /** Where a point of the scene is on the canvas: {x, y} in CSS pixels, or null behind the camera */
  function toScreen(x, y, z = 0) {
    updateProjector();
    let out = {x: 0, y: 0, w: 0};
    return projector.toScreen(x, y, z, out) ? out : null;
  }

  /**
   * The point of the scene under a canvas point: on the plane z = 0, or, with `through` ([x, y, z]),
   * on the plane through that point that faces the camera. Null when the ray misses the plane.
   */
  function fromScreen(x, y, through) {
    updateProjector();
    let out = [0, 0, 0];
    if (!through) return projector.onPlane(x, y, ORIGIN, Z_NORMAL, out) ? out : null;
    let normal = [0, 0, 0];
    if (!projector.forward(normal)) return null;
    return projector.onPlane(x, y, through, normal, out) ? out : null;
  }

  function scenePoint(x, y) {
    let point = fromScreen(x, y);
    return point ? {x: point[0], y: point[1], z: point[2]} : null;
  }

  function onTransform() {
    cameraMoved = true;
    cameraHooks.forEach(fn => fn());
  }

  function onGraphChanged(changes) {
    // The layout updates its bodies on the same event; rebuild at the next frame, after it did
    editsPending = true;
    if (changes) {
      changes.forEach(change => {
        if (change.changeType === 'remove' && change.node) flags.drop(change.node.id);
      });
    }
    onTopology();
  }

  function onTopology() {
    structureDirty = true;
    scene.renderFrame();
  }

  function unsubscribe(oldLayout) {
    oldLayout.off('step', invalidate);
    oldLayout.simulator.off('topology', onTopology);
  }

  function draw(_gl, drawContext) {
    prepare();
    updateStyle(drawContext);
    // w-gl clears only colors between frames. Nodes test depth (in 3D a nearer node covers a
    // farther one), so depth from the last frame's positions must not hide this frame's nodes.
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    let mvp = element.modelViewProjection;
    let add = settings.blend === 'add';
    if (add) gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    edgeProgram.draw(edges, positions, mvp, drawContext, style, 0);
    // Nodes cover the links under them, also in additive light (no spokes inside a disc)
    if (add) gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    nodeProgram.draw(nodes, positions, mvp, drawContext, style, 0);
    top.edges.width = edges.width;
    edgeProgram.draw(top.edges, positions, mvp, drawContext, style, 1);
    if (layers.length) {
      let frame = {gl, instancing, positions, mvp, drawContext, style, time: performance.now()};
      layers.forEach(layer => layer.draw(frame));
    }
    // Highlighted nodes last, over the labels too: a found or selected node is never under a label
    nodeProgram.draw(top.nodes, positions, mvp, drawContext, style, 1);
    // A frame hook (or an app listener it called) changed something after it was read, or a
    // layer animates: the scene ignores renderFrame() inside a frame, so ask again once it's over
    if (structureDirty || nodesDirty || edgesDirty || positionsDirty || flagsDirty || cameraMoved || animating) {
      animating = false;
      Promise.resolve().then(() => scene.renderFrame());
    }
  }

  function prepare() {
    let structureChanged = structureDirty;
    build();
    if (edgesDirty) buildEdges();
    let change = {positions: positionsDirty, camera: cameraMoved, structure: structureChanged};
    let moved = cameraMoved;
    // A hook may move the camera (a fit that follows the layout): that move belongs to the next
    // frame, so it is cleared before the hooks run, not after
    cameraMoved = false;
    if (frameHooks.size) frameHooks.forEach(fn => fn(change));
    if (flagsDirty) writeFlags();
    if (positionsDirty) {
      packPositions(layout.simulator.store.pos, layout.simulator.store.D, Math.min(layout.simulator.store.n, nodes.count), positions.data);
      positions.hasDepth = layout.simulator.store.D >= 3;
      if (positions.hasDepth && settings.fog < 1) updateBounds();
      textureDirty = true;
      positionsDirty = false;
      rooms.stale = true;
    }
    // Rooms depend on the zoom too: the smallest size is in pixels
    if (moved) rooms.stale = true;
    if (settings.nodeRoom > 0 && rooms.stale) measureRooms();
    if (textureDirty) uploadTexture();
  }

  // Brings rows and node buffers up to date (also before picking, between frames)
  function build() {
    if (structureDirty) {
      if (editsPending) {
        // Drop the rows of removed bodies now rather than at the next step, so rows are dense.
        // It may fire 'topology', which only marks what is rebuilt here.
        editsPending = false;
        layout.simulator.applyEdits();
      }
      nodesDirty = edgesDirty = positionsDirty = flagsDirty = true;
      structureDirty = false;
    }
    if (nodesDirty) buildNodes();
  }

  function buildNodes() {
    let size = settings.nodeSize;
    let sizeOf = typeof size === 'function' ? size : () => size;
    let color = settings.nodeColor;
    let colorOf = typeof color === 'function' ? color : null;
    let defaultColor = colorOf ? DEFAULTS$1.nodeColor : color;
    let built = collectNodes(graph, layout, colorOf, sizeOf, defaultColor);
    let count = built.sizes.length;

    if (count > nodes.rowCount) {
      // Row numbers 0..n-1: node i of the drawing is body i of the layout
      let rows = new Float32Array(count);
      for (let i = 0; i < count; ++i) rows[i] = i;
      setBufferData(gl, nodes.rows, rows);
      nodes.rowCount = count;
    }
    setBufferData(gl, nodes.sizes, built.sizes);
    setBufferData(gl, nodes.colors, built.colors);
    nodes.count = count;
    nodes.rooms = null;
    let smallest = Infinity;
    for (let i = 0; i < count; ++i) if (built.sizes[i] > 0 && built.sizes[i] < smallest) smallest = built.sizes[i];
    built.minSize = Number.isFinite(smallest) ? smallest : 1;
    rooms.stale = true;
    nodeData = built;
    ensureTexture(count);
    nodesDirty = false;
    // Nodes drawn on top copy their sizes and colors
    flagsDirty = true;
  }

  // Measures every node's room (room.js) at most every 400 ms, or less often when it takes long,
  // and once more after the drawing stops moving
  function measureRooms() {
    let now = performance.now();
    let wait = Math.max(400, 20 * rooms.ms) - (now - rooms.at);
    if (wait > 0 && nodes.rooms) {
      if (!rooms.timer) rooms.timer = setTimeout(() => { rooms.timer = 0; scene.renderFrame(); }, wait);
      return;
    }
    rooms.stale = false;
    rooms.at = now;
    let n = Math.min(nodes.count, nodeData.sizes.length);
    if (!n) return;
    if (rooms.data.length < n) {
      rooms.data = new Float32Array(n);
      rooms.reach = new Float32Array(n);
    }
    // A node is drawn at least nodeMinSize pixels wide: in scene units at the middle of the drawing
    updateBounds();
    updateProjector();
    let at = {x: 0, y: 0, w: 1};
    let ppu = projector.toScreen(bounds.cx, bounds.cy, bounds.cz, at) ? projector.pixelsPerUnit(at.w) : 0;
    let smallest = ppu > 0 ? (settings.nodeMinSize || 0) / ppu : 0;
    let share = settings.nodeRoom, sizes = nodeData.sizes, radius = rooms.reach;
    let base = nodeData.minSize || 1;
    for (let i = 0; i < n; ++i) radius[i] = Math.max(sizes[i], smallest * Math.sqrt(Math.max(sizes[i] / base, 1))) / share;
    computeRooms(positions.data, n, sizes, radius, positions.hasDepth, rooms.data, rooms.cache);
    for (let i = 0; i < n; ++i) rooms.data[i] *= share;
    setBufferData(gl, roomBuffer, rooms.data.subarray(0, n));
    nodes.rooms = roomBuffer;
    rooms.ms = performance.now() - now;
  }

  // The box around the drawn positions: its middle and half its diagonal
  function updateBounds() {
    let data = positions.data, n = Math.min(nodes.count, layout ? layout.simulator.store.n : 0);
    let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0, o = 0; i < n; ++i, o += 4) {
      let x = data[o], y = data[o + 1], z = data[o + 2];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    if (!(maxX >= minX)) return;
    bounds.cx = (minX + maxX) / 2;
    bounds.cy = (minY + maxY) / 2;
    bounds.cz = (minZ + maxZ) / 2;
    bounds.radius = 0.5 * Math.hypot(maxX - minX, maxY - minY, maxZ - minZ);
  }

  // Fog runs from the nearest to the farthest point of the drawing's box, as the camera sees it
  function updateFog() {
    let fog = style.fog;
    if (!positions.hasDepth || !(settings.fog < 1) || !(bounds.radius > 0)) {
      fog[0] = 0;
      fog[1] = 1;
      fog[2] = 1;
      return;
    }
    updateProjector();
    let at = {x: 0, y: 0, w: 1};
    if (!projector.toScreen(bounds.cx, bounds.cy, bounds.cz, at)) return;
    fog[0] = at.w - bounds.radius;
    fog[1] = at.w + bounds.radius;
    fog[2] = settings.fog;
  }

  function buildEdges() {
    let colorOf = linkColorOf();
    let built = collectEdges(graph, layout, colorOf, DEFAULTS$1.linkColor);
    setBufferData(gl, edges.ends, built.ends);
    setBufferData(gl, edges.colors, built.colors);
    edges.count = built.count;
    edges.width = settings.linkWidth;
    edgesDirty = false;
    flagsDirty = true;
  }

  function linkColorOf() {
    let color = settings.linkColor;
    return typeof color === 'function' ? color : () => color;
  }

  function ensureTexture(count) {
    let rows = textureRows(count);
    if (rows > maxTextureSize) throw new Error(`The view draws at most ${TEXTURE_WIDTH * maxTextureSize} nodes here`);
    if (rowBits.length < count) {
      rowBits = new Uint8Array(Math.max(count, 2 * rowBits.length));
      flaggedRows = [];
    }
    if (positions.texture && rows <= positions.rows) return;
    if (positions.texture) gl.deleteTexture(positions.texture);
    positions.texture = createFloatTexture(gl, TEXTURE_WIDTH, rows);
    positions.rows = rows;
    positions.data = new Float32Array(TEXTURE_WIDTH * rows * 4);
    // The new texture has no flags yet
    rowBits.fill(0);
    flaggedRows = [];
    flagsDirty = positionsDirty = true;
  }

  // Writes each row's flags into the fourth float of its texel, and the lists drawn on top
  function writeFlags() {
    let data = positions.data;
    for (let i = 0; i < flaggedRows.length; ++i) data[flaggedRows[i] * 4 + 3] = 0;
    let laid = layoutFlags(flags, graph, rowOf, rowBits, flaggedRows, ON_TOP_LIMITS);
    for (let i = 0; i < laid.rows.length; ++i) data[laid.rows[i] * 4 + 3] = rowBits[laid.rows[i]];
    flaggedRows = laid.rows;

    let topRows = laid.topNodes;
    let rows = new Float32Array(topRows.length);
    let sizes = new Float32Array(topRows.length);
    let colors = new Uint32Array(topRows.length);
    for (let i = 0; i < topRows.length; ++i) {
      rows[i] = topRows[i];
      sizes[i] = nodeData.sizes[topRows[i]];
      colors[i] = nodeData.colors[topRows[i]];
    }
    setBufferData(gl, top.nodes.rows, rows);
    setBufferData(gl, top.nodes.sizes, sizes);
    setBufferData(gl, top.nodes.colors, colors);
    top.nodes.count = topRows.length;

    let colorOf = linkColorOf();
    let ends = new Float32Array(laid.topLinks.length * 2);
    let linkColors = new Uint32Array(laid.topLinks.length);
    let k = 0;
    laid.topLinks.forEach(link => {
      let from = rowOf(link.fromId), to = rowOf(link.toId);
      if (from < 0 || to < 0) return;
      ends[2 * k] = from;
      ends[2 * k + 1] = to;
      linkColors[k] = colorOf(link) || DEFAULTS$1.linkColor;
      k += 1;
    });
    setBufferData(gl, top.edges.ends, ends.subarray(0, 2 * k));
    setBufferData(gl, top.edges.colors, linkColors.subarray(0, k));
    top.edges.count = k;

    flagsDirty = false;
    textureDirty = true;
  }

  function uploadTexture() {
    let rows = textureRows(nodes.count);
    gl.bindTexture(gl.TEXTURE_2D, positions.texture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TEXTURE_WIDTH, rows, gl.RGBA, gl.FLOAT,
      positions.data.subarray(0, TEXTURE_WIDTH * rows * 4));
    textureDirty = false;
  }

  function updateStyle(drawContext) {
    let ratio = drawContext.pixelRatio || 1;
    toRGBA(styles.pointedColor, style.pointedColor);
    toRGBA(styles.selectedColor, style.selectedColor);
    style.pointedSize[0] = styles.pointedScale;
    style.pointedSize[1] = styles.pointedMinSize * ratio;
    style.selectedSize[0] = styles.selectedScale;
    style.selectedSize[1] = styles.selectedMinSize * ratio;
    style.minSize = (settings.nodeMinSize || 0) * ratio;
    style.baseSize = nodeData.minSize || 1;
    style.litAlpha = styles.litLinkAlpha;
    toRGBA(styles.litLinkColor || 0, style.litColor);
    toRGBA(styles.pointedRing || 0, style.pointedRing);
    toRGBA(styles.selectedRing || 0, style.selectedRing);
    toRGBA(styles.focusedRing || 0, style.focusedRing);
    toRGBA(styles.ringHalo || 0, style.ringHalo);
    style.ringSize[0] = (styles.ringGap || 0) * ratio;
    style.ringSize[1] = (styles.ringWidth || 0) * ratio;
    updateFog();
    style.dimAlpha = flags.count(SELECTED) ? styles.dimAlpha : 1;
  }

  function disposeGL() {
    nodeProgram.dispose();
    edgeProgram.dispose();
    clearTimeout(rooms.timer);
    [nodes.rows, nodes.sizes, nodes.colors, roomBuffer, edges.ends, edges.colors,
      top.nodes.rows, top.nodes.sizes, top.nodes.colors, top.edges.ends, top.edges.colors
    ].forEach(buffer => gl.deleteBuffer(buffer));
    if (positions.texture) gl.deleteTexture(positions.texture);
    positions.texture = null;
  }

  function dispose() {
    if (revealFrame) cancelAnimationFrame(revealFrame);
    modules.slice().reverse().forEach(record => record.result ? record.result.dispose() : release(record));
    if (input) input.dispose();
    if (camera) camera.dispose();
    if (visibility) visibility.dispose();
    if (canvas.style) canvas.style.cursor = savedCursor;
    scene.off('transform', onTransform);
    graph.off('changed', onGraphChanged);
    if (layout) unsubscribe(layout);
    scene.removeChild(element);
    disposeGL();
  }
}

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

function toRGBA(color, out) {
  out[0] = ((color >>> 24) & 255) / 255;
  out[1] = ((color >>> 16) & 255) / 255;
  out[2] = ((color >>> 8) & 255) / 255;
  out[3] = (color & 255) / 255;
}

// Listeners of the view's events, called in the order they were added
function createEmitter() {
  let listeners = new Map();
  return {
    on(name, fn) {
      if (typeof fn !== 'function') throw new Error(`view.on('${name}') needs a function`);
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(fn);
    },
    off(name, fn) {
      let list = listeners.get(name);
      if (!list) return;
      let index = list.indexOf(fn);
      if (index >= 0) list.splice(index, 1);
    },
    has(name) {
      let list = listeners.get(name);
      return !!(list && list.length);
    },
    emit(name, e) {
      let list = listeners.get(name);
      if (list) list.slice().forEach(fn => fn(e));
      return e;
    }
  };
}

// What the device can do, and how much layout work a frame may carry on it.

// Most steps a frame runs when steps per frame are automatic
const MAX_AUTO_STEPS = 10;

/**
 * Milliseconds of layout work per frame. A handheld device (the main pointer is a finger, and
 * nothing hovers) gets half of a desktop's: its CPU is slower, its battery smaller, and its
 * frame has to draw too.
 */
function frameBudgetOf(win = globalThis) {
  let media = query => !!(win.matchMedia && win.matchMedia(query).matches);
  let handheld = media('(pointer: coarse)') && !media('(hover: hover)');
  return handheld ? 4 : 8;
}

/**
 * Whether WebGPU is worth using here. `navigator.gpu` can be there without a usable GPU: no
 * adapter (a blocklisted driver, WebGPU turned off), or a software one, which runs a layout
 * slower than the CPU does.
 */
async function hasHardwareWebGPU(nav = globalThis.navigator) {
  if (!nav || !nav.gpu) return false;
  try {
    let adapter = await nav.gpu.requestAdapter({powerPreference: 'high-performance'});
    if (!adapter) return false;
    let software = adapter.info ? adapter.info.isFallbackAdapter : adapter.isFallbackAdapter;
    return !software;
  } catch (e) {
    return false;
  }
}

/**
 * Steps for the next frame: `stepsPerFrame` when it is a positive number; for 0 ("auto") as many
 * as fit into `frameBudget` ms at the measured `msPerStep`, between 1 and MAX_AUTO_STEPS (one
 * step while nothing is measured yet).
 */
function stepsForFrame(stepsPerFrame, msPerStep, frameBudget) {
  if (stepsPerFrame > 0) return stepsPerFrame;
  if (!(msPerStep > 0)) return 1;
  return Math.max(1, Math.min(MAX_AUTO_STEPS, Math.floor(frameBudget / msPerStep)));
}

/**
 * Whether the nodes of a graph have names worth drawing as labels: at least half of them (of the
 * first 200) have a `label` or a `name` in their data, or an id that is a word rather than a
 * number (`graph.addLink('Alice', 'Bob')`). A graph of numbered nodes gets no labels by default;
 * its tooltips still show the ids.
 */
function hasNames(graph) {
  let named = 0, seen = 0;
  graph.forEachNode(node => {
    seen += 1;
    let data = node.data;
    if ((data && (isName(data.label) || isName(data.name))) || isWord(node.id)) named += 1;
    return seen >= 200;
  });
  return seen > 0 && named >= seen / 2;
}

function isWord(id) {
  return typeof id === 'string' && id.length > 0 && !/^[-+]?\d+(\.\d+)?$/.test(id.trim());
}

function isName(value) {
  return typeof value === 'string' && value.length > 0;
}

// render(graph): a graph on screen in one call.
//
// It puts together what ngraph.forcelayout and its add-on modules offer, with the choices their
// demo makes: a force layout that starts from pivot positions, drawn with WebGL, running on
// WebGPU when the graph is big and the device has a real GPU, stepping as much as a frame can
// carry, and stopping by itself once the drawing has settled.
//
//   const viva = render(graph);                       // fills the page
//   const viva = render(graph, element, {layout: {springLength: 20}});
//   viva.on('settled', e => console.log('done in', e.step, 'steps'));
//   viva.view.on('tap', e => e.node && console.log(e.node.id));
//
// Everything it builds stays reachable (viva.layout, viva.view, viva.scene), so nothing here has
// to be configured through render() alone.

// With `gpu: 'auto'`, graphs below this many nodes stay on the CPU. Up to about this size a CPU
// step takes 0.4 ms or less (M4 Max; Barabasi-Albert graphs), so a frame already runs the most
// steps it may (10), and the GPU has nothing to add. At 5,000 nodes the CPU is down to 7 steps
// a frame, at 20,000 to one.
const GPU_MIN_NODES = 2000;

const DEFAULTS = {
  // Settings for ngraph.forcelayout (see its README), or `graph => layout` to build your own
  layout: null,
  // 'pivot': nodes start where graph distances put them, so the layout only polishes.
  // 'random': the layout's own start.
  start: 'pivot',
  // 'auto': WebGPU for graphs of GPU_MIN_NODES nodes and more, on a hardware adapter.
  // true: WebGPU whenever there is a hardware adapter. false: always the CPU.
  gpu: 'auto',
  // Layout steps per frame; 0 fits as many as `frameBudget` ms allow (1 to 10)
  stepsPerFrame: 0,
  // ms of layout work per frame for stepsPerFrame 0. Default: 8, or 4 on phones and tablets.
  frameBudget: 0,
  // Stop stepping once the layout has settled; it runs again when something wakes it
  autoStop: true,
  // Start running at once
  run: true,
  // Canvas color
  background: '#0e1624',
  // Options of the view's style module (colorBy, palette, color, ...); false: don't attach it
  style: {},
  // 'auto': labels when the nodes have names. true: always (ids when there is nothing else).
  // false: never. An object: options of the view's labels module.
  labels: 'auto',
  // Hover, drag, select, tooltips, keyboard navigation and search
  interactive: true,
  // Keep the whole drawing in view until the user moves the camera. An object: fit options.
  fit: true,
  // More options for the view itself (nodeColor, linkColor, reach, ...)
  view: null
};

function render(graph, target, options) {
  if (!graph || typeof graph.forEachNode !== 'function') {
    throw new Error('render() needs a graph (see createGraph())');
  }
  if (target && !isElement(target)) {
    options = target;
    target = options.container;
  }
  const settings = Object.assign({}, DEFAULTS, options);
  const frameBudget = settings.frameBudget > 0 ? settings.frameBudget : frameBudgetOf();
  let stepsPerFrame = Math.max(0, Math.round(settings.stepsPerFrame) || 0);

  const events = eventify({});
  const stage = createCanvas(target);
  const canvas = stage.canvas;
  // No multisampling: the view smooths its own edges, and multisampled blending is slow
  const scene = createScene(canvas, {wglContextOptions: {antialias: false}});
  // Until the camera fits the drawing: about the size a small layout has
  scene.setViewBox({left: -100, top: -100, right: 100, bottom: 100});

  let layout = startLayout();
  let view, fitter = null;
  try {
    view = createView(scene, Object.assign({graph, layout}, settings.view));
    attachModules();
  } catch (e) {
    // e.g. WebGL lacks what the view needs: leave nothing behind
    if (view) view.dispose();
    layout.dispose();
    scene.dispose();
    stage.dispose();
    throw e;
  }

  let disposed = false;
  let isRunning = false;
  // The layout settled and the loop stopped by itself (not paused by the caller)
  let autoStopped = false;
  // {step, reason} of the last settling, while the layout stays settled
  let settled = null;
  let rafHandle = 0;
  let steps = 0, lastFrameSteps = 0;
  let stepTimes = [];

  // The GPU runs the layout's own simulator when its plan says it can (`gpu`); otherwise the
  // layout steps on the CPU and `gpuReason` says why.
  let gpuModule = null, gpuBackend = null, gpu = null, gpuReason = '';
  // Starting and stopping the GPU runs one change at a time; frames don't step meanwhile
  let changes = Promise.resolve(), changing = false;

  const stopWatchingRatio = watchPixelRatio(ratio => scene.setPixelRatio(ratio));
  const stopWatchingSize = watchSize(canvas, () => scene.setPixelRatio(scene.getPixelRatio()));

  watchStability(layout);
  const ready = chooseBackend();
  if (settings.run) resume();

  const api = {
    graph,
    scene,
    view,
    canvas,
    /** The layout that runs now (restart() makes a new one) */
    get layout() { return layout; },
    /** Resolves with 'webgpu' or 'cpu', once it is known where the layout runs */
    ready,
    resume,
    pause,
    isRunning: () => isRunning,
    restart,
    fit,
    stats,
    setStepsPerFrame(n) { stepsPerFrame = Math.max(0, Math.round(n) || 0); },
    on(name, fn) { events.on(name, fn); return api; },
    off(name, fn) { events.off(name, fn); return api; },
    dispose
  };
  return api;

  function startLayout() {
    let made = typeof settings.layout === 'function'
      ? settings.layout(graph)
      // Dual tree repulsion: the same forces as the library's default quad tree, several times
      // faster on big graphs
      : createLayout(graph, Object.assign({nbody: 'dualtree'}, settings.layout));
    if (!made || typeof made.step !== 'function') throw new Error('The `layout` function has to return a layout');
    if (settings.start === 'pivot' && graph.getNodesCount() > 2) {
      let simulator = made.simulator;
      placeNodes(graph, made, {dimensions: simulator.store.D, unit: simulator.springLength()});
    } else if (settings.start !== 'pivot' && settings.start !== 'random') {
      throw new Error('Unknown start: ' + settings.start + '. Expected `pivot` or `random`');
    }
    return made;
  }

  function attachModules() {
    let named = hasNames(graph);
    if (settings.style !== false) {
      let springLength = layout.simulator.springLength();
      let style = {background: settings.background};
      // Node sizes follow the length of links
      if (springLength > 0 && springLength !== 10) style.unit = springLength / 10;
      view.use(styleNodes, Object.assign(style, settings.style));
    }
    if (settings.fit) {
      // No room for labels at the sides when there are none
      let labelled = settings.labels === true || (settings.labels && settings.labels !== 'auto') || named;
      fitter = view.use(fitLayout, Object.assign(labelled ? {} : {labelRoom: null}, settings.fit === true ? null : settings.fit));
    }
    if (settings.interactive) {
      view.use(hoverNodes);
      view.use(dragNodes);
      view.use(selectNodes);
      view.use(inspectNodes);
      view.use(navigateNodes);
      view.use(searchNodes);
      // A node that search goes to comes close and sends out two fading rings: on a big graph it
      // is a dot among thousands. Fit (the 0 key) goes back to the whole drawing.
      view.use(pulseNodes, {color: 0x7fe7efff});
      view.on('search', e => { if (e.node && fitter) fitter.zoomTo(e.node); });
    }
    if (settings.labels === true) view.use(labelNodes);
    else if (settings.labels === 'auto') { if (named) view.use(labelNodes); }
    else if (settings.labels) view.use(labelNodes, settings.labels);
  }

  // When the layout settles (the drawing stopped changing, or only jitter is left), the frame
  // loop stops: no more steps, no more GPU work. When it wakes (a node is moved by hand, the
  // graph or a setting changes), the loop runs again until it settles again.
  function watchStability(target) {
    settled = null;
    target.on('stable', isStable => {
      if (target !== layout || disposed) return;
      if (isStable) {
        settled = {step: steps, reason: target.getStability().reason};
        if (isRunning && settings.autoStop) {
          autoStopped = true;
          setRunning(false);
        }
        events.fire('settled', settled);
      } else {
        settled = null;
        events.fire('wake');
        resumeIfSettled();
      }
    });
  }

  function resumeIfSettled() {
    if (!autoStopped) return;
    autoStopped = false;
    setRunning(true);
  }

  /** Runs the layout; on a settled layout, keeps it going until it settles again */
  function resume() {
    if (disposed) return;
    autoStopped = false;
    settled = null;
    setRunning(true);
  }

  /** Stops stepping; the drawing still follows the camera, and nodes can still be dragged */
  function pause() {
    autoStopped = false;
    setRunning(false);
  }

  function setRunning(newIsRunning) {
    isRunning = newIsRunning;
    if (isRunning && !rafHandle) rafHandle = requestAnimationFrame(frame);
  }

  function frame() {
    rafHandle = 0;
    if (!isRunning) return;
    rafHandle = requestAnimationFrame(frame);
    if (changing) return;

    let count = stepsForFrame(stepsPerFrame, msPerStep(), frameBudget);
    lastFrameSteps = count;
    let start = performance.now();
    if (gpu) {
      gpu.step(count);
    } else {
      // Each step fires the layout's 'step' event, on which the view asks for a frame
      for (let i = 0; i < count; ++i) layout.step();
    }
    steps += count;
    stepTimes.push((performance.now() - start) / count);
    if (stepTimes.length > 30) stepTimes.shift();
  }

  function msPerStep() {
    if (gpu) return gpu.stats().msPerStep;
    if (stepTimes.length === 0) return 0;
    return stepTimes.reduce((a, b) => a + b, 0) / stepTimes.length;
  }

  /** A fresh layout of the same graph with the same settings: new positions, no velocities */
  function restart() {
    if (disposed) return ready;
    return changeLayout(() => {
      layout.dispose();
      layout = startLayout();
      watchStability(layout);
      view.setLayout(layout);
      steps = 0;
      stepTimes = [];
      resumeIfSettled();
      fit();
    });
  }

  /** Back to the whole drawing, following it again */
  function fit() {
    if (fitter) fitter.fit();
  }

  function stats() {
    return {
      // where the layout runs now
      backend: gpu ? 'webgpu' : 'cpu',
      // why it runs on the CPU although WebGPU was asked for ('' when it wasn't, or it runs there)
      gpuReason,
      running: isRunning,
      settled,
      steps,
      msPerStep: msPerStep(),
      stepsPerFrame: lastFrameSteps,
      nodes: graph.getNodesCount(),
      links: graph.getLinksCount()
    };
  }

  // Decides once where the layout runs, and starts the GPU if that is where
  async function chooseBackend() {
    let wanted = settings.gpu === true || (settings.gpu === 'auto' && graph.getNodesCount() >= GPU_MIN_NODES);
    if (!wanted) return 'cpu';
    try {
      if (!(await hasHardwareWebGPU())) {
        gpuReason = 'no hardware WebGPU adapter';
        return 'cpu';
      }
      gpuModule = await import('./vivagraph.gpu.js');
      gpuBackend = await gpuModule.createWebGPUBackend();
      if (!gpuBackend) {
        gpuReason = 'no WebGPU device';
        return 'cpu';
      }
    } catch (e) {
      gpuReason = e.message;
      return 'cpu';
    }
    if (disposed) return 'cpu';
    await changeLayout(null);
    return gpu ? 'webgpu' : 'cpu';
  }

  // Runs `change` (which may replace the layout) with the GPU stopped, then starts the GPU again
  // when it is in use and the layout's plan runs there. Changes run one at a time.
  function changeLayout(change) {
    changes = changes.then(async () => {
      if (disposed) return;
      changing = true;
      try {
        if (gpu) {
          let running = gpu;
          gpu = null;
          await running.stop();
        }
        if (change) change();
        if (gpuBackend && !disposed) await startGpu();
      } catch (e) {
        console.error('VivaGraph: switching the layout failed', e);
      } finally {
        changing = false;
        // Stopping the GPU brought its last positions into the layout
        if (!disposed) view.invalidate();
      }
    });
    return changes;
  }

  async function startGpu() {
    let target = layout;
    let plan = target.simulator.plan(gpuBackend);
    if (!plan.runs) {
      gpuReason = plan.reasons.join('; ');
      return;
    }
    gpuReason = '';
    try {
      let running = await gpuModule.runOnGpu(target, gpuBackend);
      if (target !== layout || disposed) {
        await running.stop();
        return;
      }
      gpu = running;
      gpu.on('error', e => {
        // Stepping stopped on the GPU: carry on with the CPU from the last positions
        gpuReason = e.lost ? 'the WebGPU device was lost' : e.message;
        gpuBackend = null;
        changeLayout(null);
      });
    } catch (e) {
      gpuReason = e.reasons ? e.reasons.join('; ') : e.message;
    }
  }

  /** Stops everything and frees the GPU resources; removes the canvas if render() made it */
  function dispose() {
    if (disposed) return;
    disposed = true;
    isRunning = false;
    cancelAnimationFrame(rafHandle);
    rafHandle = 0;
    stopWatchingRatio();
    stopWatchingSize();
    let running = gpu;
    gpu = null;
    // The GPU hands the layout back before the layout goes
    Promise.resolve(running && running.stop()).catch(() => {}).then(() => layout.dispose());
    view.dispose();
    scene.dispose();
    stage.dispose();
  }
}

function isElement(value) {
  return !!value && typeof value === 'object' && value.nodeType === 1;
}

// The canvas to draw on: `target` itself when it is a canvas, else a new canvas that fills
// `target` (the whole window when there is no target)
function createCanvas(target) {
  if (target && target.tagName === 'CANVAS') return {canvas: target, dispose() {}};
  let container = target || (typeof document !== 'undefined' && document.body);
  if (!container) {
    // A script in <head> runs before the page has a body
    throw new Error('render() has nowhere to draw: the page has no <body> yet. Call it from a script at ' +
      'the end of <body> or after DOMContentLoaded, or pass it an element.');
  }
  let canvas = document.createElement('canvas');
  canvas.style.cssText = target
    ? 'display:block;width:100%;height:100%'
    : 'position:fixed;inset:0;width:100%;height:100%';
  // First in its container: what the page already has there (a legend, a toolbar) stays on top
  container.insertBefore(canvas, container.firstChild);
  if (canvas.offsetWidth === 0 || canvas.offsetHeight === 0) {
    console.warn('VivaGraph: the container has no size, so nothing will show. Give it a width and a height.');
  }
  return {canvas, dispose() { canvas.remove(); }};
}

// Calls `onChange(ratio)` whenever window.devicePixelRatio changes: browser zoom, or a move to a
// screen of another density. Returns a function that stops.
function watchPixelRatio(onChange) {
  if (typeof matchMedia !== 'function') return () => {};
  let query = null;
  let listen = () => {
    // Matches only the current ratio: it stops matching once the ratio changes
    query = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    query.addEventListener('change', changed, {once: true});
  };
  let changed = () => {
    listen();
    onChange(window.devicePixelRatio);
  };
  listen();
  return () => query.removeEventListener('change', changed);
}

// Calls `onChange()` when the canvas box changes size without the window doing so (a panel
// opens, a splitter moves): the scene itself listens to the window only
function watchSize(canvas, onChange) {
  if (typeof ResizeObserver !== 'function') return () => {};
  let width = canvas.offsetWidth, height = canvas.offsetHeight;
  let observer = new ResizeObserver(() => {
    if (canvas.offsetWidth === width && canvas.offsetHeight === height) return;
    width = canvas.offsetWidth;
    height = canvas.offsetHeight;
    onChange();
  });
  observer.observe(canvas);
  return () => observer.disconnect();
}

// Kept equal to package.json's version (test/render.test.js checks)
var version = '1.0.0-alpha.1';

export { GPU_MIN_NODES as G, PALETTE as P, createLayout as a, createScene as b, createGraph as c, createView as d, dragNodes as e, fitLayout as f, getDefaultExportFromCjs as g, hasHardwareWebGPU as h, hasNames as i, hoverNodes as j, inspectNodes as k, labelNodes as l, pulseNodes as m, navigateNodes as n, render as o, placeNodes as p, selectNodes as q, requireFormula as r, searchNodes as s, stepsForFrame as t, styleNodes as u, version as v };
