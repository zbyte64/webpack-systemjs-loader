module.exports = function (source) {

    if (this.cacheable) {
        this.cacheable();
    }

    if (target !== "web") {
      this.callback(null, source);
    }

    var modName = this.resourcePath.split('.js', 2)[0];

    code = 'if (!window.modules) {window.modules={};}\n'+
      'window.modules["'+modName+'"] = '+this.loaderIndex+';'+
      'function require(modname) {return __webpack_require__(window.modules[modName]);}\n'+
      source;

    this.callback(null, code);

};
