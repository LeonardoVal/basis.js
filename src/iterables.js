﻿/** # Iterables

Standard implementation of iterables and iterators (a.k.a. enumerations or sequences), and many
functions that can be built with it. This implementation is inspired in the Python iterables. An
iterable is an object with a method `__iter__()` which returns an iterator function. An iterator
function returns the next element in the sequence, or raises `STOP_ITERATION` if the sequence has
ended.
*/
var STOP_ITERATION = new Error('Sequence has ended.');

var Iterable = exports.Iterable = declare({
	/** The Iterable constructor builds different types of sequences depending on the given object.
	It supports strings (iterating over each character), arrays, objects (key-value pairs) and
	functions (assuming it is the iterator maker). A value of `null` or `undefined` is not allowed.
	Everything else is assumed to be the only value of a singleton sequence. If the object has an
	`__iter__` method it is assumed to be an Iterable already. In this case a copy of that Iterable
	is built.
	*/
	constructor: function Iterable(obj) {
		if (obj === null || obj === undefined) {
			throw new Error('Iterable source is null or undefined.');
		} else if (typeof obj === 'function') {
			this.__iter__ = obj;
		} else if (typeof obj === 'string') {
			this.__iter__ = Iterable.__iteratorFromString__(obj);
		} else if (Array.isArray(obj)) {
			this.__iter__ = Iterable.__iteratorFromArray__(obj);
		} else if (typeof obj === 'object') {
			if (typeof obj.__iter__ === 'function') {
				this.__iter__ = obj.__iter__.bind(obj);
			} else {
				this.__iter__ = Iterable.__iteratorFromObject__(obj);
			}
		} else {
			this.__iter__ = Iterable.__iteratorSingleton__(obj);
		}
	},

	/** `STOP_ITERATION` is the singleton error raised when an sequence	has finished. It is catched
	by all Iterable's functions.
	*/
	"dual STOP_ITERATION": STOP_ITERATION,

	/** `stop()` raises the STOP_ITERATION exception. If used inside an iterator it breaks the
	iteration.
	*/
	"dual stop": function stop() {
		throw STOP_ITERATION;
	},

	/** `catchStop(exception)` does nothing `exception` is `STOP_ITERATION`, but if it isn't the
	exception is thrown.
	*/
	"dual catchStop": function catchStop(exception) {
		if (exception !== STOP_ITERATION) {
			throw exception;
		}
	},

	// ## Iterables from common datatypes ##########################################################

	/** `__iteratorFromArray__(array)` returns the `__iter__` function that builds the iterators of
	iterables based on arrays.
	*/
	"static __iteratorFromArray__": function __iteratorFromArray__(array) {
		return function __iter__() {
			var i = 0, iterable = this;
			return function __arrayIterator__() {
				if (i < array.length) {
					return array[i++];
				} else {
					throw STOP_ITERATION;
				}
			};
		};
	},

	/** The iterables based on strings iterate character by character. `__iteratorFromString__(str)`
	returns the `__iter__` function that builds iterators over the `str` string.
	*/
	"static __iteratorFromString__": function __iteratorFromString__(str) {
		return function __iter__() {
			var i = 0, iterable = this;
			return function __stringIterator__() {
				if (i < str.length) {
					return str.charAt(i++);
				} else {
					throw STOP_ITERATION;
				}
			};
		};
	},

	/** Iterables over objects iterate over pairs `[name, value]` for each property of the object.
	`__iteratorFromObject__(obj)` return the `__iter__` function for these sequences.
	*/
	"static __iteratorFromObject__": function __iteratorFromObject__(obj) {
		return function __iter__() {
			var keys = Object.keys(obj), iterable = this;
			return function __objectIterator__() {
				if (keys.length > 0) {
					var k = keys.shift();
					return [k, obj[k]];
				} else {
					throw STOP_ITERATION;
				}
			};
		};
	},

	/** Singleton iterables have only one value in their sequence. Their `__iter__` function can be
	obtained with `__iteratorSingleton__(x)`.
	*/
	"static __iteratorSingleton__": function __iteratorSingleton__(x) {
		return function __iter__() {
			var finished = false, iterable = this;
			return function __singletonIterator__() {
				if (!finished) {
					finished = true;
					return x;
				} else {
					throw STOP_ITERATION;
				}
			};
		};
	},

	// ## Sequence predicates ######################################################################

	/** `isEmpty()` returns if the sequence has no elements.
	*/
	isEmpty: function isEmpty() {
		try {
			this.__iter__()();
			return false;
		} catch (err) {
			this.catchStop(err);
			return true;
		}
	},

	// ## Sequence information #####################################################################

	/** `count()` counts the number of elements in the sequence.
	*/
	count: function count() {
		var result = 0;
		this.forEach(function (x) {
			result++;
		});
		return result;
	},

	/** `length()` is just a synonym for `count()`.
	*/
	length: function length() {
		return this.count();
	},

	/** `indexOf(value, from=0)` is analogous to the array's namesake method. Returns the first
	position of the given `value`, or -1 if it is not found.
	*/
	indexOf: function indexOf(value, from) {
		from = from|0;
		var iter = this.__iter__(), x, i = 0;
		try {
			for (x = iter(); true; x = iter(), ++i) {
				if (i >= from && x === value) {
					return i;
				}
			}
		} catch (err) {
			this.catchStop(err);
		}
		return -1;
	},

	/** `indexesOf(value, from=0)` is a sequence of the positions of the value in this iterable.
	*/
	indicesOf: function indexesOf(value, from) {
		from = from|0;
		return this.filter(function (v, i) {
			return i >= from && v === value;
		}, function (v, i) {
			return i;
		});
	},

	/** `indexWhere(condition, from=0)` returns the position of the first value of this iterable
	that complies with the given `condition`, or -1 if there is none.
	*/
	indexWhere: function indexWhere(condition, from) {
		from = from|0;
		var iter = this.__iter__(), x, i = 0;
		try {
			for (x = iter(); true; x = iter(), ++i) {
				if (i >= from && condition(x, i)) {
					return i;
				}
			}
		} catch (err) {
			this.catchStop(err);
		}
		return -1;
	},

	/** `indexesWhere(condition, from=0)` is a sequence of the positions in this iterable of values
	that comply with the given `condition`.
	*/
	indicesWhere: function indexesWhere(condition, from) {
		from = from|0;
		return this.filter(function (v, i) {
			return i >= from && condition(v);
		}, function (v, i) {
			return i;
		});
	},

	// ## Iteration methods ########################################################################

	/** `forEach(doFunction, ifFunction)` applies `doFunction` to all elements complying with
	`ifFunction`, and returns the last result. If no `ifFunction` is given, it iterates through all
	the elements in the sequence. Both functions get the current value and position as arguments.
	*/
	forEach: function forEach(doFunction, ifFunction) {
		var iter = this.__iter__(), x, i = 0, result;
		try {
			for (x = iter(); true; x = iter(), i++) {
				if (!ifFunction || ifFunction(x, i)) {
					result = doFunction(x, i);
				}
			}
		} catch (err) {
			this.catchStop(err);
		}
		return result;
	},

	/** `forEachApply(doFunction, ifFunction, _this)` is similar to `forEach` but instead of calling
	`doFunction`, it uses `apply`. It assumes the elements in the sequence are arrays of arguments
	to pass to the functions.
	*/
	forEachApply: function forEachApply(doFunction, ifFunction, _this) {
		_this = _this || this;
		return this.forEach(function (args, i) {
			return doFunction.apply(_this, args.concat([i]));
		}, ifFunction);
	},

	/** `map(mapFunction, filterFunction)` returns an iterable iterating on the results of applying
	`mapFunction` to each of this iterable elements. If `filterFunction` is given, only elements for
	which `filterFunction` returns true are considered.
	*/
	map: function map(mapFunction, filterFunction) {
		var from = this; // for closures.
		return new Iterable(function __iter__() {
			var iter = from.__iter__(), x, i = -1;
			return function __mapIterator__() {
				for (x = iter(); true; x = iter()) {
					i++;
					x = mapFunction ? mapFunction(x, i) : x;
					if (!filterFunction || filterFunction(x, i)) {
						return x;
					}
				}
				throw STOP_ITERATION;
			};
		});
	},

	/** `mapApply(mapFunction, filterFunction, _this)` is similar to `map` but instead of calling
	`mapFunction`, it uses `apply`. It assumes the elements in the sequence are arrays of arguments
	to pass to the functions.
	*/
	mapApply: function mapApply(mapFunction, filterFunction, _this) {
		_this = _this || this;
		return this.map(function (args, i) {
			return mapFunction.apply(_this, args.concat([i]));
		}, filterFunction);
	},

	/** `select(members)` is a shortcut for a map that extracts a member or members from the objects
	in the sequence. If `members` is an object, then for each value in the sequence another object
	is built with a selection for each key in the object. Arrays can also be built in a similar
	fashion.
	*/
	select: (function () {
		function __selection__(from, member) {
			if (Array.isArray(member)) {
				return member.map(__selection__.bind(null, from));
			} else if (typeof member === 'object') {
				var result = {};
				Object.keys(member).forEach(function (k) {
					result[k] = __selection__.call(null, from, member[k]);
				});
				return result;
			} else if (typeof member === 'function') {
				return member(from);
			} else {
				return from[member];
			}
		}
		return function select(members) {
			return this.map(function (obj) {
				return __selection__(obj, members);
			});
		};
	})(),

	// ## Sequence selection and filtering #########################################################

	/** `filter(filterFunction, mapFunction)` returns an iterable of this iterable elements for
	which `filterFunction` returns true. If `mapFunction` is given it is applied before yielding the
	elements.
	*/
	filter: function filter(filterFunction, mapFunction) {
		var from = this; // for closures.
		return new Iterable(function __iter__() {
			var iter = from.__iter__(), x, i = -1;
			return function __mapIterator__() {
				while (true) {
					x = iter();
					i++;
					if (filterFunction ? filterFunction(x, i) : x) {
						return mapFunction ? mapFunction(x, i) : x;
					}
				}
				throw STOP_ITERATION;
			};
		});
	},

	/** `filterApply(filterFunction, mapFunction, _this)` is similar to `filter` but instead of
	calling the given functions, it uses `apply`. It assumes the elements in the sequence are arrays
	of arguments to pass to the functions.
	*/
	filterApply: function filterApply(filterFunction, mapFunction, _this) {
		_this = _this || this;
		return this.filter(function (args, i) {
			return filterFunction.apply(_this, args.concat([i]));
		}, mapFunction && function (args, i) {
			return mapFunction.apply(_this, args.concat([i]));
		});
	},

	/** `takeWhile(condition)` return an iterable with the first elements that verify the given
	condition.
	*/
	takeWhile: function takeWhile(condition) {
		var from = this; // for closures.
		return new Iterable(function __iter__() {
			var iter = from.__iter__(),
				i = 0;
			return function __takeWhileIterator__() {
				if (i >= 0) {
					var x = iter();
					if (condition(x, i)) {
						i++;
						return x;
					} else {
						i = -Infinity;
					}
				}
				from.stop();
			};
		});
	},

	/** `take(n=1)` return an iterable with the first `n` elements of this one.
	*/
	take: function take(n) {
		n = isNaN(n) ? 1 : n | 0;
		return this.takeWhile(function (x, i) {
			return i < n;
		});
	},

	/** `dropWhile(condition)` returns an iterable with the same elements than this, except the
	first ones that comply with the condition.
	*/
	dropWhile: function dropWhile(condition) {
		var from = this; // for closures.
		return new Iterable(function __iter__() {
			var iter = from.__iter__(),
				i = 0,
				dropping = true;
			return function __dropWhileIterator__() {
				var x;
				do {
					x = iter();
					dropping = dropping && condition(x, i);
					i++;
				} while (dropping);
				return x;
			};
		});
	},

	/** `drop(n=1)` returns an iterable with the same elements than this, except the first `n` ones.
	*/
	drop: function drop(n) {
		n = isNaN(n) ? 1 : n | 0;
		return this.dropWhile(function (x, i) {
			return i < n;
		});
	},

	/** `head(defaultValue)` returns the first element. If the sequence is empty it returns
	`defaultValue`, or raise an exception if one is not given.
	*/
	head: function head(defaultValue) {
		try {
			return this.__iter__()();
		} catch (err) {
			this.catchStop(err);
			if (arguments.length < 1) {
				throw new Error("Tried to get the head value of an empty Iterable.");
			} else {
				return defaultValue;
			}
		}
	},

	/** `tail()` returns an iterable with the same elements than this, except the first one.
	*/
	tail: function tail() {
		var from = this; // for closures.
		return new Iterable(function __iter__() {
			var iter = from.__iter__();
			try {
				iter();
			} catch (err) {
				this.catchStop(err);
				throw new Error("Tried to get the tail of an empty Iterable.");
			}
			return iter;
		});
	},

	/** `last(defaultValue)` returns the last element. If the sequence is empty it returns
	`defaultValue`, or raise an exception if one is not given.
	*/
	last: function last(defaultValue) {
		var result, isEmpty = true, it = this.__iter__();
		try {
			for (isEmpty = true; true; isEmpty = false) {
				result = it();
			}
		} catch (err) {
			this.catchStop(err);
			if (!isEmpty) {
				return result;
			} else if (arguments.length < 1) {
				throw new Error("Tried to get the last value of an empty Iterable.");
			} else {
				return defaultValue;
			}
		}
	},

	/** `init()` returns an iterable with the same elements than this, except the last one.
	*/
	init: function init() {
		var from = this; // for closures.
		return new Iterable(function __iter__() {
			var iter = from.__iter__(), last;
			try {
				last = iter();
			} catch (err) {
				this.catchStop(err);
				throw new Error("Tried to get the init of an empty Iterable.");
			}
			return function __mapIterator__() {
				var result = last;
				last = iter();
				return result;
			};
		});
	},

	/** `greater(evaluation)` returns an array with the elements of the iterable with greater
	evaluation (or numerical conversion by default).
	*/
	greater: function greater(evaluation) {
		evaluation = typeof evaluation === 'function' ? evaluation : function (x) {
				return +x;
			};
		var maxEval = -Infinity, result = [], e;
		this.forEach(function (x) {
			e = evaluation(x);
			if (maxEval < e) {
				maxEval = e;
				result = [x];
			} else if (maxEval == e) {
				result.push(x);
			}
		});
		return result;
	},

	/** `lesser(evaluation)` returns an array with the elements of the iterable with lesser
	evaluation (or numerical conversion by default).
	*/
	lesser: function lesser(evaluation) {
		evaluation = typeof evaluation === 'function' ? evaluation : function (x) {
				return +x;
			};
		var minEval = Infinity, result = [], e;
		this.forEach(function (x) {
			e = evaluation(x);
			if (minEval > e) {
				minEval = e;
				result = [x];
			} else if (minEval == e) {
				result.push(x);
			}
		});
		return result;
	},

	/** `sample(n, random=Randomness.DEFAULT)` returns an iterable with `n` elements of this
	iterable randomly selected. The order of the elements is maintained.
	*/
	sample: function sample(n, random) {
		n = n|0;
		if (n < 1) {
			return Iterable.EMPTY;
		}
		random = random || Randomness.DEFAULT;
		var buffer = [];
		this.forEach(function (x, i) {
			var r = random.random();
			for (var p = buffer.length; p > 0 && buffer[p-1][0] < r; --p); // Ordered insertion.
			buffer.splice(p, 0, [r, x, i]);
			while (buffer.length > n) {
				buffer.pop();
			}
		});
		buffer.sort(function (t1, t2) { // Order by index.
			return t1[2] - t2[2];
		});
		return new Iterable(buffer.map(function (t) { // Keep only the elements.
			return t[1];
		}));
	},

	// ## Sequence aggregation #####################################################################

	/** `foldl(foldFunction, initial)` folds the elements of this iterable with `foldFunction` as a
	left associative operator. The `initial` value is used as a starting point, but if it is not
	defined, then the first element in the sequence is used.
	*/
	foldl: function foldl(foldFunction, initial) {
		var iter = this.__iter__(), x;
		try {
			initial = initial === undefined ? iter() : initial;
			for (x = iter(); true; x = iter()) {
				initial = foldFunction(initial, x);
			}
		} catch (err) {
			this.catchStop(err);
		}
		return initial;
	},

	/** `scanl(foldFunction, initial)` folds the elements of this iterable with `foldFunction` as a
	left associative operator. Instead of returning the last result, it iterates over the
	intermediate values in the folding sequence.
	*/
	scanl: function scanl(foldFunction, initial) {
		var from = this; // for closures.
		return new Iterable(function __iter__() {
			var iter = from.__iter__(), value, count = -1;
			return function __scanlIterator__() {
				count++;
				if (count === 0) {
					value = initial === undefined ? iter() : initial;
				} else {
					value = foldFunction(value, iter());
				}
				return value;
			};
		});
	},

	/** `foldr(foldFunction, initial)` folds the elements of this iterable with `foldFunction` as a
	right associative operator. The `initial` value is used as a starting point, but if it is not
	defined the first element in the sequence is used.

	Warning! This is the same as doing a `foldl` in a reversed iterable.
	*/
	foldr: function foldr(foldFunction, initial) {
		function flippedFoldFunction(x,y) {
			return foldFunction(y,x);
		}
		return this.reverse().foldl(flippedFoldFunction, initial);
	},

	/** `scanr(foldFunction, initial)` folds the elements of this iterable with `foldFunction` as a
	right associative operator. Instead of returning the last result, it iterates over the
	intermediate values in the folding sequence.

	Warning! This is the same as doing a `scanl` in a reversed iterable.
	*/
	scanr: function scanr(foldFunction, initial) {
		function flippedFoldFunction(x,y) {
			return foldFunction(y,x);
		}
		return this.reverse().scanl(flippedFoldFunction, initial);
	},

	/** `sum(n=0)` returns the sum of all elements in the sequence, or `n` if the sequence is empty.
	*/
	sum: function sum(n) {
		var result = isNaN(n) ? 0 : +n;
		this.forEach(function (x) {
			result += (+x);
		});
		return result;
	},

	/** `min(n=Infinity)` returns the minimum element of all elements in the sequence, or `Infinity`
	if the sequence is empty.
	*/
	min: function min(n) {
		var result = isNaN(n) ? Infinity : +n;
		this.forEach(function (x) {
			x = (+x);
			if (x < result) {
				result = x;
			}
		});
		return result;
	},

	/** `max(n=-Infinity)` returns the maximum element of all elements in the sequence, or
	`-Infinity` if the sequence is empty.
	*/
	max: function max(n) {
		var result = isNaN(n) ? -Infinity : +n;
		this.forEach(function (x) {
			x = (+x);
			if (x > result) {
				result = x;
			}
		});
		return result;
	},

	/** `all(predicate, strict=false)` returns true if for all elements in the sequence `predicate`
	returns true, or if the sequence is empty.
	*/
	all: function all(predicate, strict) {
		predicate = typeof predicate === 'function' ? predicate : function (x) { return !!x; };
		var result = true;
		this.forEach(function (x, i) {
			if (!predicate(x, i)) {
				result = false;
				if (!strict) {
					throw STOP_ITERATION; // Shortcircuit.
				}
			}
		});
		return result;
	},

	/** `any(predicate, strict=false)` returns false if for all elements in the sequence `predicate`
	returns false, or if the sequence is empty.
	*/
	any: function any(predicate, strict) {
		predicate = typeof predicate === 'function' ? predicate : function (x) { return !!x; };
		var result = false;
		this.forEach(function (x, i) {
			if (predicate(x, i)) {
				result = true;
				if (!strict) {
					throw STOP_ITERATION; // Shortcut.
				}
			}
		});
		return result;
	},

	/** `join(sep='')` concatenates all strings in the sequence using `sep` as separator. If `sep`
	is not given, '' is assumed.
	*/
	join: function join(sep) {
		var result = '';
		sep = ''+ (sep || '');
		this.forEach(function (x, i) {
			result += (i === 0) ? x : sep + x;
		});
		return result;
	},

	// ## Sequence conversions #####################################################################

	/** `toArray(array=[])`: appends to `array` the elements of the sequence and returns it. If no
	array is given, a new one is used.
	*/
	toArray: function toArray(array) {
		array = array || [];
		this.forEach(function (x) {
			array.push(x);
		});
		return array;
	},

	/** `toObject(obj={})` takes an iterable of 2 element arrays and assigns to the given object (or
	a new one by default) each key-value pairs as a property.
	*/
	toObject: function toObject(obj) {
		obj = obj || {};
		this.forEach(function (x) {
			obj[x[0]] = x[1];
		});
		return obj;
	},

	// ## Whole sequence operations ################################################################

	/** `reverse()` returns an iterable with this iterable elements in reverse order.

	Warning! It stores all this iterable's elements in memory.
	*/
	reverse: function reverse() {
		return new Iterable(this.toArray().reverse());
	},

	/** `sorted(sortFunction)` returns an iterable that goes through this iterable's elements in
	order.

	Warning! This iterable's elements are stored in memory for sorting.
	*/
	sorted: function sorted(sortFunction) {
		return new Iterable(this.toArray().sort(sortFunction));
	},

	/** `permutations(k)` returns an iterable that runs over the permutations of `k` elements of
	this iterable. Permutations are not generated in any particular order.

	Warning! It stores all this iterable's elements in memory.
	*/
	permutations: function permutations(k) {
		k = k|0;
		var pool = this.toArray(),
			n = pool.length;
		if (k < 1 || k > n) {
			return Iterable.EMPTY;
		} else {
			var count = math.factorial(n) / math.factorial(n - k);
			return new Iterable(function () {
				var current = 0,
					indices = Iterable.range(n).toArray();
				return function __permutationsIterator__() {
					if (current < count) {
						var result = new Array(k),
							is = indices.slice(), // copy indices array.
							i = current;
						for (var p = 0; p < k; ++p) {
							result[p] = pool[is.splice(i % (n - p), 1)[0]];
							i = (i / (n - p)) |0;
						}
						++current;
						return result;
					} else {
						throw STOP_ITERATION;
					}
				};
			});
		}
	},

	/** `combinations(k)` returns an iterable that runs over the combinations of `k` elements of
	this iterable. Combinations are generated in lexicographical order. The implementations is
	inspired in [Python's itertools](https://docs.python.org/3/library/itertools.html#itertools.combinations).

	Warning! It stores all this iterable's elements in memory.
	*/
	combinations: function combinations(k) {
		k = k|0;
		var pool = this.toArray(),
			n = pool.length;
		if (k < 1 || k > n) {
			return Iterable.EMPTY;
		} else {
			return new Iterable(function () {
				var indices = Iterable.range(k).toArray(),
					current = indices.map(function (i) { return pool[i]; });
				return function __combinationsIterator__() {
					if (!current) throw STOP_ITERATION;
					var result = current;
					for (var i = k-1; i >= 0; --i) {
						if (indices[i] !== i + n - k) break;
					}
					if (i < 0) {
						current = null;
					} else {
						indices[i] += 1;
						for (var j = i+1; j < k; ++j) {
							indices[j] = indices[j-1] + 1;
						}
						current = indices.map(function (i) { return pool[i]; });
					}
					return result;
				};
			});
		}
	},

	/** `slices(size=1)` builds another iterable that enumerates arrays of the given size of
	elements of this iterable.
	*/
	slices: function slices(size) {
		var _this = this;
		size = isNaN(size) || size < 1 ? 1 : size|0;
		return new Iterable(function __iter__(){
			var it = _this.__iter__(), slice;
			return function __sliceIterator__() {
				slice = [];
				try {
					for (var i = 0; i < size; ++i) {
						slice.push(it());
					}
				} catch (err) {
					if (err !== STOP_ITERATION) {
						throw err;
					}
				}
				if (slice.length > 0) {
					return slice;
				} else {
					throw STOP_ITERATION;
				}
			};
		});
	},

	/** `groupBy(key)` returns an iterable that runs over the subsequent elements of this iterable
	that when applied the `key` function return the same value. If no `key` function is given, the
	actual values are used. Each element in the grouped iterable is a pair, with the key value first
	and an array second.
	*/
	groupBy: function groupBy(key) {
		var it = this;
		return new Iterable(function __iter__() {
			var iter = it.__iter__(),
				i = 0,
				currentValues = null,
				currentKey;
			try {
				currentValues = [iter()];
				currentKey = key ? key(currentValues[0], i++) : currentValues[0];
			} catch (err) {
				it.catchStop(err);
			}
			return function __groupByIterator__() {
				var value, valueKey, pair;
				if (!currentValues) {
					it.stop();
				} else while (true) {
					try {
						value = iter();
						valueKey = key ? key(value, i++) : value;
						if (valueKey === currentKey) {
							currentValues.push(value);
						} else {
							pair = [currentKey, currentValues];
							currentKey = valueKey;
							currentValues = [value];
							return pair;
						}
					} catch (err) {
						it.catchStop(err);
						pair = [currentKey, currentValues];
						currentValues = null;
						return pair;
					}
				}
			};
		});
	},

	/** `groupAll(key, accum)` returns an object with one member per group of elements. The
	elements' keys are calculated by the `key` function, or the default string conversion by
	default. If a `accum` function is given, it is used to accumulate the groups. By default an
	array is built.
	*/
	groupAll: (function () {
		function DEFAULT_KEY(x) {
			return x +'';
		}
		function DEFAULT_ACCUM(xs, x) {
			xs = xs || [];
			xs.push(x);
			return xs;
		}
		return function groupAll(key, accum) {
			var result = {};
			key = key || DEFAULT_KEY;
			accum = accum || DEFAULT_ACCUM;
			this.forEach(function (elem, i) {
				var k = key(elem, i);
				result[k] = accum(result[k], elem, i);
			});
			return result;
		};
	})(),

	// ## Operations on many sequences #############################################################

	/** `zip(iterables...)` builds an iterable that iterates over this and all the given iterables
	at the same time, yielding an array of the values of each and stopping at the first sequence
	finishing.
	*/
	'static zipWith': function zipWith(f) {
		var its = Array.prototype.slice.call(arguments, 1).map(iterable);
		return new Iterable(function __iter__() {
			var iterators = its.map(function (it) {
				return it.__iter__();
			});
			return function __zipIterator__() {
				var r = iterators.map(function (iterator) {
					return iterator();
				});
				return f ? f.apply(null, r) : r;
			};
		});
	},

	zipWith: function zipWith(f) {
		var args = [f, this].concat(Array.prototype.slice.call(arguments, 1));
		return this.constructor.zipWith.apply(this.constructor, args);
	},

	'static zip': function zip() {
		var args = [null].concat(Array.prototype.slice.call(arguments));
		return this.zipWith.apply(this, args);
	},

	zip: function zip() {
		var args = [null, this].concat(Array.prototype.slice.call(arguments));
		return this.constructor.zipWith.apply(this.constructor, args);
	},

	/** `product(iterables...)` builds an iterable that iterates over the
	[cartesian product](http://en.wikipedia.org/wiki/Cartesian_product) of this and all the given
	iterables, yielding an array of the values of each.
	*/
	product: function product() {
		var its = Array.prototype.slice.call(arguments).map(iterable);
		its.unshift(this);
		return new Iterable(function __iter__() {
			var iterators, tuple;
			return function __productIterator__() {
				if (!iterators) { // First tuple.
					iterators = its.map(function (it) {
						return it.__iter__();
					});
					tuple = iterators.map(function (iter) {
						return iter(); // If STOP_ITERATION is raised, it should not be catched.
					});
				} else if (!tuple) { // Sequence has ended.
					throw STOP_ITERATION;
				} else {
					for (var i = iterators.length - 1; i >= 0; --i) { // Subsequent tuples.
						try {
							tuple[i] = iterators[i]();
							break;
						} catch (err) {
							if (i > 0 && err === STOP_ITERATION) {
								iterators[i] = its[i].__iter__();
								tuple[i] = iterators[i]();
							} else {
								tuple = null; // So subsequent calls while still throw STOP_ITERATION.
								throw err;
							}
						}
					}
				}
				return tuple.slice(0); // Shallow array clone.
			};
		});
	},

	'static product': function (it) {
		it = it ? iterable(it) : this.EMPTY;
		return this.prototype.product.apply(it, Array.prototype.slice.call(arguments, 1));
	},

	/** `chain(iterables...)` returns an iterable that iterates over the concatenation of this and
	all the given iterables.
	*/
	chain: function chain() {
		var its = Array.prototype.slice.call(arguments).map(iterable);
		its.unshift(this);
		return new Iterable(function __iter__() {
			var i = 0, iterator = its[0].__iter__();
			return function __chainIterator__() {
				while (true) try {
					return iterator();
				} catch (err) {
					if (err === STOP_ITERATION && i + 1 < its.length) {
						i++;
						iterator = its[i].__iter__();
					} else {
						throw err; // Rethrow if not STOP_ITERATION or there aren't more iterables.
					}
				}
				throw STOP_ITERATION;
			};
		});
	},

	'static chain': function (it) {
		it = it ? iterable(it) : this.EMPTY;
		return this.prototype.chain.apply(it, Array.prototype.slice.call(arguments, 1));
	},

	/** `flatten()` chains all the iterables in the elements of this iterable.
	*/
	flatten: function flatten() {
		var self = this;
		return new Iterable(function __iter__() {
			var it = self.__iter__(),
				iterator = this.stop;
			return function __flattenIterator__() {
				while (true) try {
					return iterator();
				} catch (err) {
					if (err === STOP_ITERATION) {
						iterator = iterable(it()).__iter__();
					}
				}
				throw STOP_ITERATION;
			};
		});
	},

	// ## Set related ##############################################################################

	/** The `nub` of a sequence is another sequence with each element only appearing once. Basically
	repeated elements are removed. The argument `comp` may have a function to compare the sequence's
	values.

	Warning! All the elements of the result are stored in memory.
	*/
	nub: function nub(comp) {
		var buffer = [];
		return this.filter(function (x) {
			if (comp) {
				for (var i = buffer.length-1; i >= 0; --i) {
					if (comp(buffer[i], x)) {
						return false;
					}
				}
			} else if (buffer.indexOf(x) >= 0) {
				return false;
			}
			buffer.push(x);
			return true;
		});
	},

	/** The `union(iterable...)` and `unionBy(comp, iterable...)` methods treat this and each
	iterable argument as sets, and calculate the union of all. `unionBy` allows to define a specific
	equality criteria between the elements.

	Warning! All the elements of the result are stored in memory.
	*/
	union: function union() {
		var args = [void 0].concat(Array.prototype.slice.call(arguments));
		return this.unionBy.apply(this, args);
	},

	unionBy: function unionBy(comp) {
		return this.chain.apply(this, Array.prototype.slice.call(arguments, 1)).nub(comp);
	},

	/** The `intersection(iterable...)` and `intersectionBy(comp, iterable...)` methods intersection
	of the iterable arguments with `this`. This iterable is assumed not to have repeated elements.
	`intersectionBy` allows to define a specific equality criteria between the elements.

	Warning! All the elements of the result are stored in memory.
	*/
	intersection: function intersection() {
		var args = [void 0].concat(Array.prototype.slice.call(arguments));
		return this.intersectionBy.apply(this, args);
	},

	intersectionBy: function intersectionBy(comp) {
		var buffer = this.toArray();
		for (var i = 1; i < arguments.length; ++i) {
			buffer = iterable(arguments[i]).filter(function (x) {
				if (comp) {
					for (var i = buffer.length-1; i >= 0; --i) {
						if (comp(buffer[i], x)) {
							return true;
						}
					}
					return false;
				} else {
					return buffer.indexOf(x) >= 0;
				}
			}).toArray();
		}
		return iterable(buffer);
	},

	/** The `difference(iterable...)` and `differenceBy(comp, iterable...)` methods difference of
	the iterable arguments with `this`. This iterable is assumed not to have repeated elements.
	`differenceBy` allows to define a specific equality criteria between the elements.

	Warning! All the elements of given sequences are stored in memory.
	*/
	difference: function difference() {
		var args = [void 0].concat(Array.prototype.slice.call(arguments));
		return this.differenceBy.apply(this, args);
	},

	differenceBy: function differenceBy(comp) {
		var result = this,
			buffer;
		for (var i = 1; i < arguments.length; ++i) {
			buffer = iterable(arguments[i]).toArray();
			result = result.filter(function (x) {
				if (comp) {
					for (var i = buffer.length-1; i >= 0; --i) {
						if (comp(buffer[i], x)) {
							return false;
						}
					}
					return true;
				} else {
					return buffer.indexOf(x) < 0;
				}
			});
		}
		return result;
	},

	// ## Sequence builders ########################################################################

	/** `range(from=0, to, step=1)` builds an Iterable object with number from `from` upto `to` with
	the given `step`. For example, `range(2,12,3)` represents the sequence `[2, 5, 8, 11]`.
	*/
	"static range": function range(from, to, step) {
		switch (arguments.length) {
			case 0: from = 0; to = 0; step = 1; break;
			case 1: to = from; from = 0; step = 1; break;
			case 2: step = 1; break;
		}
		return new Iterable(function __iter__() {
			var i = from, r;
			return function __rangeIterator__() {
				if (isNaN(i) || isNaN(to) || i >= to) {
					throw STOP_ITERATION;
				} else {
					r = i;
					i = i + step;
					return r;
				}
			};
		});
	},

	/** `repeat(x, n=Infinity)` builds an iterable that repeats the element `x`	`n` times (or
	forever by default).
	*/
	"static repeat": function repeat(x, n) {
		n = isNaN(n) ? Infinity : +n;
		return new Iterable(function __iter__() {
			var i = n;
			return function __repeatIterator__() {
				i--;
				if (i < 0) {
					throw STOP_ITERATION;
				} else {
					return x;
				}
			};
		});
	},

	/** `iterate(f, x, n=Infinity)` returns an iterable that repeatedly applies the function `f` to
	the value `x`, `n` times (or indefinitely by default).
	*/
	"static iterate": function iterate(f, x, n) {
		n = isNaN(n) ? Infinity : +n;
		return new Iterable(function __iter__() {
			var i = n, value = x;
			return function __iterateIterator__() {
				i--;
				if (i < 0) {
					throw STOP_ITERATION;
				} else {
					var result = value;
					value = f(value);
					return result;
				}
			};
		});
	},

	/** `cycle(n=Infinity)` returns an iterable that loops n times over the elements of this
	`Iterable` (or forever by default).
	*/
	cycle: function cycle(n) {
		n = n === undefined ? Infinity : (+n);
		var iterable = this;
		return new Iterable(function __iter__() {
			var i = n, iter = iterable.__iter__();
			return function __cycleIterator__() {
				while (i > 0) try {
					return iter();
				} catch (err) {
					if (err === STOP_ITERATION && i > 1) {
						i--;
						iter = iterable.__iter__();
					} else {
						throw err;
					}
				}
				throw STOP_ITERATION; // In case n < 1.
			};
		});
	},

	// ## Utility definitions. #####################################################################

	/** The string conversion of an iterable (`toString(n=5)`) returns a string with the first `n`
	elements. It ends with `...` if there are more elements in the sequence.
	*/
	toString: function toString(n) {
		n = (n|0) || 5;
		var elems = this.take(n + 1).toArray();
		if (elems.length > n) {
			elems.pop();
			return "Iterable("+ JSON.stringify(elems).replace(/\]$/, " ...]") +")";
		} else {
			return "Iterable("+ JSON.stringify(elems) +")";
		}
	}
}); //// declare Iterable.

/** `Iterable.EMPTY` is a singleton holding an empty iterable.
*/
Iterable.EMPTY = new Iterable(function () {
	return Iterable.prototype.stop;
});

/** `iterable(obj)` returns an iterable, either if `obj` is already one or builds one from it.
*/
var iterable = exports.iterable = function iterable(obj) {
	return typeof obj !== 'undefined' && obj !== null && typeof obj.__iter__ === 'function' ? obj : new Iterable(obj);
};
