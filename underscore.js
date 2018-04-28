(function() {
  var root = this;  // 建立根对象，window为浏览器根对象，exports为服务器根对象
  var previousUnderscore = root._;  // 保存_变量的前一个值
  // 实现更少的字节和作用域查找
  var ArrayProto = Array.prototype, 
      ObjProto = Object.prototype,
      FuncProto = Function.prototype;
  // 为快速访问核心原型，创建快速引用变量
  var push = ArrayProto.push, 
      slice = ArrayProto.slice,
      concat = ArrayProto.concat,
      toString = ObjProto.toString,
      hasOwnProperty = ObjProto.hasOwnProperty;
  // 这里声明了所有我们希望使用的ES5本地函数实现方式
  var nativeIsArray = Array.isArray,  
      nativeKeys = Object.keys,
      nativeBind = FuncProto.bind;
  // 为surrogate-prototype-swapping创建一个裸函数引用
  var Ctor = function() {}
  // 为接下来的使用创建一个安全的Undderscore变量引用
  var _ = function(obj) {
    if(obj instanceof _) return obj;
    if(!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  }
  // 为NodeJs创建一个Underscore对象的输出，为旧的require()API提供向后兼容，如果处于浏览器中，增加_作为全局对象
  if(typeof exports !== 'undefined') {
    if(typeof module !== 'undefined' && module.exports) {
      exports = module.exports._;
    }
    exports._ = _;
  } else {
    root._ = _;
  }
  _.VERSION = '1.8.2';  // 当前版本

  // 内部函数，返回一个有效版本的回调函数使其在其它Underscore函数中能被重复调用
  

}.call(this))