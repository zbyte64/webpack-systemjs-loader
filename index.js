var loaderUtils = require('loader-utils');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');

function packageInfo(resourcePath, root, aliases) {
  var modPath = path.dirname(resourcePath);
  var modName = null;
  var modSubPath = [_.last(resourcePath.split(path.sep))];
  var modInfo, modMain;
  //console.log(this.options)
  while (!modName && modPath && modPath.length >= root.length) {
    var packagePaths = [
      path.join(modPath, 'bower.json'),
      path.join(modPath, 'package.json')
    ];
    for (var index in packagePaths) {
      var pPath = packagePaths[index];
      if (fs.existsSync(pPath)) {
        modInfo = require(pPath);
        //console.log("modInfo:", pPath, modInfo.name)
        modName = modInfo.name;
        if (aliases[modName]) { //POSSIBLY manually defined entry point
          //TODO this makes unsafe assumptions
          //but then so is everything else
          modMain = [[_.last(aliases[modName].split(path.sep))]];
        } else if (_.isString(modInfo.main)) {
          modMain = [modInfo.main.split(path.sep)];
        } else if (_.isArray(modInfo.main)) {
          modMain = _.map(modInfo.main, function(m) {
            return m.split(path.sep);
          });
        }
      }
    }
    if (!modName) {
      modSubPath.push(_.last(modPath.split(path.sep)));
      modPath = path.resolve(modPath, '..');
    }
  }
  modSubPath = modSubPath.reverse();
  if (modMain) {
    //console.log("comparison", modMain, modSubPath, resourcePath);
    _.each(modMain, function(entry) {
      //our resourcePath is a main entry point
      if (_.isEqual(entry, modSubPath)) {
        modSubPath = null;
        return false;
      }
    });
  }
  if (modMain && modSubPath) {
    //chomp relative to entry point
    var commonPath = modMain[0].slice(0, modMain[0].length-1);
    modSubPath = _.dropWhile(modSubPath, function(part, index) {
      return commonPath[index] === part;
    });
  }
  return {
    mains: modMain,
    name: modName,
    info: modInfo,
    path: modSubPath
  };
}

function fNameToMName(modName) {
  modName = modName.split('.');
  return modName.slice(0, modName.length-1).join('.');
}

module.exports = function (source) {
    if (this.cacheable) {
        this.cacheable();
    }

    if (this.target !== "web") {
      this.callback(null, source);
    }

    var options = loaderUtils.parseQuery(this.query);

    //it would be awesome if we could lookup what we were resolved from, o well
    var aliases = this.options.resolve.alias || {};
    var info = packageInfo(this.resourcePath, this.options.context, aliases);
    var modName;


    if (!info.name) {
      //this should not happen, we have no concept of a base path here
      console.log("uh oh");
      var modPath = this.context + '/';
      modName = fNameToMName(this.resourcePath.slice(modPath.length));
    } else {
      modName = info.name;
      if (info.path && info.path.length) {
        var lastName = fNameToMName(_.last(info.path));
        var rPath = info.path.slice(0, info.path.length-1);
        modName = modName + '/' + rPath.join('/') + '/' + lastName;
      }
      if (options.path && modName.slice(0, options.path.length) === options.path) {
        modName = modName.slice(options.path.length);
      }
    }

    console.log("registering", modName);


    code = 'if (!window.modules) {window.modules={};}\n'+
      'window.modules["'+modName+'"] = module.id;\n'+
      'function _require(modName) {return __webpack_require__(window.modules[modName]);}\n'+
      source;

    this.callback(null, code);

};
