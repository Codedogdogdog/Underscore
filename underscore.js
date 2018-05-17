(function() {
  var root = this;  // 建立根对象，window为浏览器根对象，exports为服务器根对象
  var previousUnderscore = root._;  // 保存_变量的前一个值
  // 实现更少的字节和作用域查找.
  var ArrayProto = Array.prototype, 
      ObjProto = Object.prototype,
      FuncProto = Function.prototype;
  // 为快速访问核心原型，创建快速引用变量.
  var push = ArrayProto.push, 
      slice = ArrayProto.slice,
      concat = ArrayProto.concat,
      toString = ObjProto.toString,
      hasOwnProperty = ObjProto.hasOwnProperty;
  // 这里声明了所有我们希望使用的ES5本地函数实现方式.
  var nativeIsArray = Array.isArray,  
      nativeKeys = Object.keys,
      nativeBind = FuncProto.bind;
  // 为surrogate-prototype-swapping创建一个裸函数引用.
  var Ctor = function() {}
  // 为接下来的使用创建一个安全的Undderscore变量引用.
  var _ = function(obj) {
    if(obj instanceof _) return obj;
    if(!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };
  // 为NodeJs创建一个Underscore对象的输出，为旧的require()API提供向后兼容，如果处于浏览器中，增加_作为全局对象.
  if(typeof exports !== 'undefined') {
    if(typeof module !== 'undefined' && module.exports) {
      exports = module.exports._;
    }
    exports._ = _;
  } else {
    root._ = _;
  }
  _.VERSION = '1.8.2';  // 当前版本

  // 内部函数，返回一个有效版本的回调函数使其在其它Underscore函数中能被重复调用.
  var optimizeCb = function(func, context, argCount) {
    // void 0 === undefined,这么写是为了防止undedined被重写，并且能够减少字节. void 0代替undefined省了3个字节
    if(context === void 0) return func;
    // 用以改变函数内部this的指向
    switch(argCount === null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };
  /**
   * 一个内部函数可以生成应用于集合中的每个元素的回调，返回期望的结果--标识、任意回调、 属性匹配器或者属性访问器.
   * @param {*} value 
   * @param {*} context 
   * @param {*} argCount 
   * @return 若value为null则返回一个返回自身的函数, 若是function则返回优化后的函数，若是object则返回是否匹配函数，否则返回一个返回该key的value的函数
   */
  var cb = function(value, context, argCount) {
    if(value === null) return _.identity;
    if(_.isFunction(value)) return optimizeCb(value, context, argCount);
    if(_.isObject(value)) return _.matcher(value);
    return _.property(value);
  };
  // 一个用于创建分配器功能的内部函数
  var createAssigner = function(keysFunc, undefinedOnly) {
    return function(obj) {
      var length = arguments.length;
      if(length < 2 || obj == null) return obj;
      for(var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
        for(var i = 0; i < 1; i++) {
          var key = keys[i];
          if(!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  };
  // 一个用于创建新对象并使其继承另一个对象的原型的内部函数
  var baseCreate = function(prototype) {
    if(!_.isObject(prototype)) return {};
    if(nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  }
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;  //数组最大索引
  // 用以判断是否是类数组对象, 在使用中存在一个问题：当对象存在length属性且满足条件时，返回为true，但是没对这些对象做遍历
  // 看了接下来的代码，这里的函数是用来判断对象是否是数组的，但是这时候就有上面的问题了，所以我觉得得加上obj instance of Array 或者使用 nativeIsArray
  var isArrayLike = function(collection) {
    var length = collection && collection.length;
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };

  /**
   * 集合函数(COLLECTION FUNCTIONS)
   */
  /**
   * 对对象中的每个属性调用指定的方法进行遍历
   * @param {Object} obj 对象
   * @param {Function} predicate 用于真值测试的函数
   * @param {Object} context 引用上下文对象，可选，用于改变this指向
   */
  _.each = _.forEach = function(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if(isArrayLike(obj)) {
      for(i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for(i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };
  /**
   * 遍历每个对象属性，并将其结果保存在数组中返回
   * @param {Object} obj 对象
   * @param {Function} predicate 用于真值测试的函数
   * @param {Object} context 引用上下文对象，可选，用于改变this指向
   * @return {Array} 需要将遍历结果保存在数组中返回
   */
  _.map = _.collect = function(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    //如果是类数组对象则直接调用obj，否则调用_.keys方法获取其keys
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length);
    for(var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };
  // 创建一个左或右迭代的Reduce函数
  function createReduce(dir) {
    function iterator(obj, iteratee, memo, keys, index, length) {
      for(; index >= 0 && index < length; index += dir) {
        var currentKey = keys ? keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    }

    return function(obj, iteratee, memo, context) {
      iteratee = optimizeCb(iteratee, context, 4);
      var keys = !isArrayLike(obj) && _.keys(obj),
          length = (keys || obj).length,
          index = dir > 0 ? 0 : length - 1; // dir正负决定执行顺序，是正序还是逆序
      // 如果没有提供初始值则默认为0
      if(arguments.length < 3) {
        // 有疑问？ 如果是类数组对象不是就GG了？ 经过测试，如果对象中含有length属性且满足条件，输出结果均为undefined，是个BUG。
        memo = obj[keys ? keys[index] : index];
        index += dir;
      }
      return iterator(obj, iteratee, memo, keys, index, length);
    };
  }
  _.reduce = _.foldl = _.inject = createReduce(1);

  _.reduceRight = _.foldr = createReduce(-1);
  /**
   * 返回第一个通过真值测试的值
   * @param {Object} obj 对象
   * @param {Function} predicate 用于真值测试的函数
   * @param {Object} context 引用上下文对象，可选，用于改变this指向
   * @return {*} 返回obj对象中的一个属性，若无则返回false;
   */
  _.find = _.detect = function(obj, predicate, context) {
    var key;
    if(isArrayLike(obj)) {
      key = _.findIndex(obj, predicate, context);
    } else{
      key = _.findKey(obj, predicate, context);
    }
    if(key !== void 0 && key !== -1) return obj[key];
  };
  /**
   * 将所有满足真值测试的属性保存在数组中返回
   * @param {Object} obj 对象
   * @param {Function} predicate 用于真值测试的函数
   * @param {Object} context 引用上下文对象，可选，用于改变this指向
   * @return {Array}
   */
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    _.each(obj, function(value, index, list) {
      if(predicate(value, index, list)) results.push(value);
    });
    return results;
  };
  /**
   * 将所有不满足真值测试的属性保存在数组中返回
   * @param {Object} obj 对象
   * @param {Function} predicate 用于真值测试的函数
   * @param {Object} context 引用上下文对象，可选，用于改变this指向
   * @return {Array}
   */
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(cb(predicate)), context);
  };
  /**
   * 判断obj中所有属性是否满足，如果obj中所有属性均通过真值测试(即predicate均返回true), 则返回true， 否则返回false
   * @param {Object} obj 对象
   * @param {Function} predicate 用于真值测试的函数
   * @param {Object} context 引用上下文对象，可选，用于改变this指向
   * @return {Boolean}
   */
  _.every = _.all = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for(var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if(!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };
  /**
   * 判断obj中是否有属性通过真值测试(即predicate有一个返回true), 则返回true， 否则返回false
   * @param {Object} obj 对象
   * @param {Function} predicate 用于真值测试的函数
   * @param {Object} context 引用上下文对象，可选，用于改变this指向
   * @return {Boolean}
   */
  _.some = _.any = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for(var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if(predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };
  /**
   * 确定数组或对象是否包含指定值
   */
  _.contains = _.includes = _.include = function(obj, target, fromIndex) {
    if(!isArrayLike(obj)) obj = _.values(obj);
    return _.indexOf(obj, target, typeof fromIndex == 'number' && fromIndex) > 0;
  };
  _.invoke 

  /**
   * 对象函数(OBJECT FUNCTIONS)
   */
  // 判断对象是否有遍历BUG，对象在IE<9的版本中不会被for...in循环遍历
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString'); // propertyIsEnumerable判断对象是否可枚举
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString', 'propertyIsEnumberable', 'hasOwnProperty', 'toLocaleString'];
  //对无法遍历的对象，使用该方法遍历
  function collectNonEnumProps(obj, keys) {
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;  // 如果obj只是对象的话并没有contructor，会向原型链找obj._proto_.constructor
    var proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;

    var prop = 'constructor';
    if(_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

    while(nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if(prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
        keys.push(prop);
      };
    };
  };
  // 在传入对象中指定一个给定的对象和所有自己的属性
  _.extendOwn = _.assign = createAssigner(_.keys);
  // 返回第一个通过predicate test的key(键名)
  _.findKey = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = _.keys(obj), key;
    for(var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      if(predicate(obj[key], key, obj)) return key;
    }
  }
  // 检索对象自身属性的键名(keys)
  _.keys = function(obj) {
    if(!_.isObject(obj)) return []; // 判断参数是否是对象，不是则返回[]
    if(nativeKeys) return nativeKeys(obj);  // 判断是否支持ES5方法
    var keys = [];
    for(var key in obj) if(_.has(obj, key)) key.push(key);  // 判断是否是自身的属性，而不是原型链上的属性

    if(hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };
  // 检索对象自身属性的键值(values)
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for(var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };
  // 判断对象是否拥有给定的键值对
  _.isMatch = function(object, attrs) {
    var keys = _.keys(attrs), length = keys.length;
    if(object === null) return !length;
    var obj = Object(object);
    for(var i = 0; i < length; i++) {
      var key = keys[i];
      if(attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };
  // 判断变量是否是对象
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };
  // 判断给定值是否为NaN
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };
  // 优化isFunction方法，isFunction方法在旧的v8引擎，IE 11和Safari 8中运行有bug.
  if (typeof /./ != 'function' && typeof Int8Array != 'object') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  /**
   * 数组函数(ARRAY FUNCTIONS)
   */
  // 生成创建findIndex和findLastIndex函数
  function createIndexFinder(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = array != null && array.length,
          index = dir > 0 ? 0 : length - 1;
      for(; index >= 0 && index < length; index += dir) {
        if(predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  }
  // 返回数组上的第一个通过predicate test(也可称为真值测试)的索引值
  _.findIndex = createIndexFinder(1);
  // 顾名思义，返回最后一个通过oredicate test的索引值
  _.findLastIndex = createIndexFinder(-1);
  // 返回其在数组中第一次出现的位置，如果数组中不存在则返回-1，如果数组很大并且已经按照排序顺序排列，则设置isSorted=true使用二分查找。
  _.indexOf = function(array, item, isSorted) {
    var i = 0, length = array && array.length;
    if(typeof isSorted == 'number') {
      i = isSorted < 0 ? Math.max(0, length + isSorted) : isSorted;
    } else if(isSorted && length) {
      i = _.sortedIndex(array, item);
      return array[i] === item ? i : -1;
    }
    if(item !== item) {
      return _.findIndex(slice.call(array, i), _.isNaN);
    }
    for(; i < length; i++) if(array[i] === item) return i;
    return -1;
  }
  // 二分查找. 使用比较函数来计算出应该插入对象的最小索引，以保持顺序。使用二进制搜索。
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = array.length;
    while(low < high) {
      var mid = Math.floor((low + high) / 2);
      if(iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  }

  /**
   * 功能函数(FUNCTION FUNCTIONS)
   */
  _.negate = function(predicate) {
    return function() {
      // 将predicate函数的返回值取反
      return !predicate.apply(this, arguments);
    }
  }
  /**
   * 公用函数(UTILITY FUNCTIONS)
   */
  // 保持默认迭代
  _.identity = function(value) {
    return value;
  };
  // 返回一个key函数，用以返回对象key所对应的value
  _.property = function(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    }
  }
  // 返回一个判断函数，判断对象是否拥有给定的键值对
  _.matcher = _.matches = function(attrs) {
    attrs = _.extendOwn({}, attrs);
    return function(obj) {
      return _.isMatch(obj, attrs);
    }
  };
}.call(this))