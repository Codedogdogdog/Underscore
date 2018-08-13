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
      navtiveCreate = Object.create;
  // 为surrogate-prototype-swapping创建一个裸函数引用.
  var Ctor = function() {}
  // 为接下来的使用创建一个安全的Undderscore变量引用.
  var _ = function(obj) {
    if(obj instanceof _) return obj;
    // 判断是否是实例化对象，若不是则返回实例化对象
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
   * @return 若value为null则返回一个返回自身的函数, 若是function则返回优化后的函数，
   * 若是object则返回是否匹配函数，否则返回一个返回该key的value的函数
   */
  var cb = function(value, context, argCount) {
    if(value === null) return _.identity;
    if(_.isFunction(value)) return optimizeCb(value, context, argCount);
    if(_.isObject(value)) return _.matcher(value);
    return _.property(value);
  };
  // 一个用于创建分配器功能的内部函数, 目前作用好像就是返回一个合并函数
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
      // 如果没有提供初始值则默认为0或者最后一个值
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
   * @param {Object} obj  对象
   * @param {*} target  指定值
   * @param {Number} fromIndex  从哪里开始查找
   * @returns {Boolean}
   */
  _.contains = _.includes = _.include = function(obj, target, fromIndex) {
    if(!isArrayLike(obj)) obj = _.values(obj);
    return _.indexOf(obj, target, typeof fromIndex == 'number' && fromIndex) > 0;
  };
  /**
   * 使对象中的每个属性都调用该方法
   * @param {Object} obj 对象
   * @param {Function} method 方法
   */
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      var func = isFunc ? method : value[method];
      return func == null ? func : func.apply(value, args);
    })
  };
  /**
   * 对_.map函数的再封装，便利地调用常用方法，获取键值
   * @param {Object} obj 对象
   * @param {String} key 键名
   * @return {Array}
   */
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };
  /**
   * 对_.filter函数的再封装，便利地调用常用方法，返回对象中对应的键值对? 感觉没什么用？都知道键值对了？？
   * @param {Object} obj 对象
   * @param {{key:value}} attrs 键值对
   */
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matcher(attrs));
  };
  /**
   * 对_.find函数的再封装，便利地调用常用方法，返回该键值对的key值? 感觉没什么用？都知道键值对了？？
   * @param {Object} obj 对象
   * @param {Object} obj 对象
   * @param {{key:value}} attrs 键值对
   */
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matcher(attrs));
  };
  /**
   * 返回对象中最大的值
   * @param {Object} obj 对象
   * @param {Function} iteratee 遍历器
   * @param {Object} context 上下文对象
   * @return {*}
   */
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity, value, computed;
    if(iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for(var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if(value > result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if(computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };
  /**
   * 返回对象中最小的值
   * @param {Object} obj 对象
   * @param {Function} iteratee 遍历器
   * @param {Object} context 上下文对象
   * @return {*}
   */
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity, value, computed;
    if(iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for(var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if(result > value) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if(computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };
  /**
   * 返回一个打乱的对象
   * @param {Object} obj 对象
   * @return {Object}
   */
  _.shuffle = function(obj) {
    // 思考，洗牌算法可直接实现？
    var set = isArrayLike(obj) ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    // 基于洗牌算法的实现
    // const array = set.slice(0);
    // for(var i = length - 1; i--;) {
    //   const randomIndex = Math.floor(Math.random()*(i + 1));
    //   [array[i], array[randomIndex]] = [array[randomIndex], array[i]];
    // }
    // return array;
    for(var index = 0; index < length; index++) {
      rand = _.random(0, index);
      if(rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };
  /**
   * 将对象中的n个随机值作为对象返回
   * @param {Object} obj 对象
   * @param {Number} n 要返回的对象中含值个数
   * @param {Boolean} guard 是否允许使用map
   * @return {Object}
   */
  _.sample = function(obj, n, guard) {
    if(n == null || guard) {
      if(!isArrayLike(obj)) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };
  /**
   * 对对象的value进行排序，最后返回排序完的数组
   * @param {Object}} obj 对象
   * @param {Function} iteratee 遍历器
   * @param {Object} context 上下文对象
   * @return {Array}
   */
  _.sortBy = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    return _.pluck(_.map(obj, function(value, index ,list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)  // 使用_.map返回criteria属性
      };
    }).sort(function(left, right) { // 这里直接使用了Array.prototype.sort方法进行排序
      var a = left.criteria;
      var b = right.criteria;
      if(a !== b) {
        if(a > b || a === void 0) return 1;
        if(a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };
  // 一个用于分组操作的内部函数??作用？通过用户传入的iteratee进行分组判断
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    }
  };
  /**
   * 将对象根据自己传入的iteratee进行分组
   */
  _.groupBy = group(function(result, value, key) {
    if(_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });
  /**
   * 计数分组
   */
  _.countBy = group(function(result, value, key) {
    if(_.has(result, key)) result[key]++; else result[key] = 1;
  });
  /**
   * 返回一个安全的数组,可用在underscore的任何地方(个人理解：因为underscore上有些方法的实现在我看来存在问题，所以通过该方法可以创建一个安全无问题可遍历的数组)
   * @param {object}} obj 对象
   * @return {Array}
   */
  _.toArray = function(obj) {
    if(!obj) return [];
    if(_.isArray(obj)) return slice.call(obj);
    if(isArrayLike(obj)) return _.map(obj, _.identity);
    return _.values(obj);
  };
  /**
   * 返回对象的长度
   * @param {Object} obj 对象
   * @return {Number}
   */
  _.size = function(obj) {
    if(obj == null) return 0;
    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
  };
  /**
   * 将判断函数predicate的结果分成pass和fail返回
   * @param {Object} obj 对象
   * @param {Function} predicate 判断函数
   * @param {Object} context 上下文对象
   * @return {Array}
   */
  _.partition = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  }

  /**
   * 数组函数(ARRAY FUNCTIONS)
   */

  /**
   * 返回数组中前n个元素，若n为null，则返回数组中第一个元素(若n为1则返回值是value值，否则返回数组，这应该就是它和_.initial的区别？？)
   * @param {Array} array 数组
   * @param {Number} n 需要返回元素的个数
   * @param {Boolean} guard 安全性检测，是否能用于guard
   * @return {*}
   */
  _.first = _.head = _.take = function(array, n, guard) {
    if(array == null) return void 0;
    if(n == null || guard) return array[0];
    return _.initial(array, array.length - n);
  };
  /**
   * 返回数组中前n个元素，若n为null，则返回数组中第一个元素(返回值始终是数组)
   * @param {Array} array 数组
   * @param {Number} n 需要返回元素的个数
   * @param {Boolean} guard 安全性检测，是否能用于guard
   * @return {Array}
   */
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard) ? 1 : n));
  };
  /**
   * 返回数组中后n个元素，若n为null，则返回数组中最后一个元素元素(若n为1则返回值是value值，否则返回数组，这应该就是它和_.rest的区别？？)
   * @param {Array} array 数组
   * @param {Number} n 需要返回元素的个数
   * @param {Boolean} guard 安全性检测，是否能用于guard
   * @return {*}
   */
  _.last = function(array, n, guard) {
    if(array == null) return void 0;
    if(n == null || guard) return array[array.length - 1];
    return _.rest(array, Math.max(0, array.length - 1));
  };
  /**
   * 返回数组中后n个元素，若n为null，则返回数组中最后一个元素(返回值始终是数组)
   * @param {Array} array 数组
   * @param {Number} n 需要返回元素的个数
   * @param {Boolean} guard 安全性检测，是否能用于guard
   * @return {Array}
   */
  _.rest = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };
  /**
   * 剔除数组中的所有伪值
   * @param {Array} array 数组
   */
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };
  // 一个用于递归展平(将多维数组转成一维数组)的内部函数
  var flatten = function(input, shallow, strict, startIndex) {
    var output = [], idx = 0;
    for(var i = startIndex || 0, length = input.length; i < length; i++) {
      var value = input[i];
      if(isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
        if(!shallow) value = flatten(value, shallow, strict);
        var j = 0, len = value.length;
        output.length += len;
        while(j < len) {
          output[idx++] = value[j++];
        }
      } else if(!strict) {
        output[idx++] = value;
      }
    }
    return output;
  };
  /**
   * 以递归方式（默认情况下）或仅一个级别展平数组。
   * @param {Array} array 数组
   * @param {*} shallow 
   * @return {Array}
   */
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  };
  /**
   * 返回不包含指定值的数组
   * @param {Array} array 数组
   * @return {Array}
   */
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };
  // 该函数需要再理解。。。
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if(array == null) return [];
    if(!_.isBoolean(isSorted)) {  // 方法可以省略isSorted参数，若不传，则参数向后赋值
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if(iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for(var i = 0, length = array.length; i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      if(isSorted) {
        if(!i == seen !== computed) result.push(value);
        seen = computed;
      } else if(iteratee) {
        if(!_.contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if(!_.contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  };
  _.union = function() {
    return _.uniq(flatten(arguments, true, true));
  };
  /**
   * 返回一个所有数组参数均有的值的数组
   * @param {Array} array 数组
   * @return {Array}
   */
  _.intersection = function(array) {
    if(array == null) return [];
    var result = [];
    var argsLength = arguments.length;
    for(var i = 0, length = array.length; i < length; i++) {
      var item = array[i];
      if(_.contains(result, item)) continue;
      for(var j = 1; j < argsLength; j++) {
        if(!_.contains(arguments[j], item)) break;
      }
      if(j === argsLength) result.push(item);
    }
    return result;
  };
  /**
   * 返回一个数组中其他数组不包含的值（值以数组形式保存）
   * @param {Array} array 数组
   */
  _.difference = function(array) {
    var rest = flatten(arguments, true, true, 1);
    return _.filter(array, function(value) {  // 返回array中rest不包含的值
      return !_.contains(rest, value);
    });
  };
  /**
   * 将多个列表压缩到一个数组中 - 共享索引的元素组合在一起。
   */
  _.zip = function() {
    return _.unzip(arguments);
  }
  /**
   * 接受一个数组数组，并将每个数组的元素分组到共享索引上
   * @param {Array} array 数组
   */
  _.unzip = function(array) {
    var length = array && _.max(array, 'length').length || 0;
    var result = Array(length);
    for(var index = 0; index < length; index++) {
      result[index] = _.pluck(array, index);
    }
    return result;
  }
  /**
   * 返回一个list数组转换成的对象
   * @param {Array}} list 数组（当只有list时，说明是二维数组，否则为key数组）
   * @param {Array} values 数组（value数组）
   */
  _.object = function(list, values) {
    var result = {};
    for(var i = 0, length = list && list.length; i < length; i++) {
      if(values) {
        result[list[i]] = values[i];
      } else {
        result[lsit[i][0]] = list[i][1];
      }
    }
    return result;
  };
  /**
   * 返回该值在数组中第一次出现的位置，若无则返回-1
   * @param {Array} array 数组
   * @param {*} item 要查找的值
   * @param {*} isSorted 
   * @return {Number}
   */
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
  /**
   * 返回该值在数组中最后一次出现的位置，若无则返回-1
   * @param {Array} array 数组
   * @param {*} item 要查找的值
   * @param {*} from 起始位置
   * @return {Number}
   */
  _.lastIndexOf = function(array, item, from) {
    var idx = array ? array.length : 0;
    if(typeof from == 'number') {
      idx = from < 0 ? idx + from + 1 : Math.min(idx, from + 1);
    }
    if(item !== item) {
      return _.findLastIndex(slice.call(array, 0, idx), _.isNaN);
    }
    while(--idx > 0) if(array[idx] === item) return idx;
    return -1;
  };
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
  };
  /**
   * 返回数组上的第一个通过predicate test(也可称为真值测试)的索引值
   */
  _.findIndex = createIndexFinder(1);
  /**
   * 顾名思义，返回最后一个通过oredicate test的索引值
   */
  _.findLastIndex = createIndexFinder(-1);
  /**
   * 二分查找. 使用比较函数来计算出应该插入对象的最小索引，以保持顺序。使用二进制搜索。
   * @param {ARRAY} array 数组
   * @param {Object} obj 对象
   * @param {Function} iteratee 遍历器
   * @param {Object} context 上下文对象
   */
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
   * 返回一个有step为间隔的数组？？目前不清楚作用是什么？
   * @param {Number} start 开始位置
   * @param {Number} stop 结束位置
   * @param {Number} step 跨越个数
   */
  _.range = function(start, stop, step) {
    if(arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;
    
    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for(var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }
    return range;
  }


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
  // 反转对象的键和值，值必须可序列化
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for(var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
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
  // 返回一个介于min~max的随机值。 这个max - min + 1理论上会超过max？并不会，Math.random返回的是不包含1的0~1的数，而Math.floor会向下取整，所以最大值也就只是20
  _.random = function(min, max) {
    if(max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };
  // 返回当前时间
  _.now = Date.now || function() {
    return new Date().getTime();
  };
  // 用于转义的HTML列表
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);
}.call(this))