/**
 * Get the full list of dependencies
 */


const npm = require('npm');
const bluebird = require('bluebird');
const path = require('path');
const npmLoad = bluebird.promisify(npm.load);
const npmList = bluebird.promisify(function (opts, _cb) { // wrap, otherwise npm calls shrinkwrap prematurely
  npm.commands.ls(opts, true, function callbackWrapper(err, pkinfo, lite) {
    _cb(err, pkinfo);
  });
});

function makeParseable (data, long, dir, depth, parent, d) {
  depth = depth || 0
  if (depth > npm.config.get('depth')) return [ makeParseable_(data, long, dir, depth, parent, d) ]
  return [ makeParseable_(data, long, dir, depth, parent, d) ]
  .concat(Object.keys(data.dependencies || {})
    .sort(alphasort).map(function (d) {
      return makeParseable(data.dependencies[d], long, dir, depth + 1, data, d)
    }))
  .filter(function (x) { return x })
  .join('--');
}

function makeParseable_ (data, long, dir, depth, parent, d) {
  if (data.hasOwnProperty('_found') && data._found !== true) return ''

  if (data.missing) {
    if (depth < npm.config.get('depth')) {
      data = npm.config.get('long')
           ? path.resolve(parent.path, 'node_modules', d) +
             ':' + d + '@' + JSON.stringify(data.requiredBy) + ':INVALID:MISSING'
           : ''
    } else {
      data = path.resolve(dir || '', 'node_modules', d || '') +
             (npm.config.get('long')
             ? ':' + d + '@' + JSON.stringify(data.requiredBy) +
               ':' + // no realpath resolved
               ':MAXDEPTH'
             : '')
    }

    return data
  }

  if (!npm.config.get('long')) return data.path

  return data.path +
         ':' + (data._id || '') +
         ':' + (data.realPath !== data.path ? data.realPath : '') +
         (data.extraneous ? ':EXTRANEOUS' : '') +
         (data.error && data.path !== path.resolve(npm.globalDir, '..') ? ':ERROR' : '') +
         (data.invalid ? ':INVALID' : '') +
         (data.peerInvalid ? ':PEERINVALID' : '') +
         (data.peerMissing ? ':PEERINVALID:MISSING' : '')
}

function inList (list, value) {
  return list.indexOf(value) !== -1
}

function bfsify (root) {
  // walk over the data, and turn it from this:
  // +-- a
  // |   `-- b
  // |       `-- a (truncated)
  // `--b (truncated)
  // into this:
  // +-- a
  // `-- b
  // which looks nicer
  var queue = [root]
  var seen = [root]

  while (queue.length) {
    var current = queue.shift()
    var deps = current.dependencies = current.dependencies || {}
    Object.keys(deps).forEach(function (d) {
      var dep = deps[d]
      if (dep.missing) return
      if (inList(seen, dep)) {
        if (npm.config.get('parseable') || !npm.config.get('long')) {
          delete deps[d]
          return
        } else {
          dep = deps[d] = Object.create(dep)
          dep.dependencies = {}
        }
      }
      queue.push(dep)
      seen.push(dep)
    })
  }

  return root
}

function alphasort (a, b) {
  a = a.toLowerCase()
  b = b.toLowerCase()
  return a > b ? 1
       : a < b ? -1 : 0
}

function GetDependencies (opts) {

  var unique = {};
  //var options = { _exit : true, prefix : __dirname, parseable : true };
  var options = {
    parseable: true,
    _exit : true,
    argv: {
      remain: [],
      cooked: [ 'ls', '--parseable' ],
      original: [ 'ls', '--parseable' ]
    }
  };

  Object.assign (options, opts);

  return npmLoad (options)
  .then (function () {
    return npmList([]);
  }).then (function (result) {
    var long = npm.config.get('long')
    var dir = path.resolve(npm.dir, '..')
    var bfs = bfsify(result);
    var out = makeParseable(bfs, long).split('--');
    var total = (dir.match(/\//g) || []).length + 2;
    var complete = out.filter(function (item) {
      return (item.match(/\//g) || []).length == total;
    });
    return complete;
  });
};

module.exports = GetDependencies;
