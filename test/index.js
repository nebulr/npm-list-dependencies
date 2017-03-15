
const path = require ('path');
const assert = require ('assert');

describe ('npm-list-dependencies', function () {
  it('should list total dependencies', function (done) {
    var NpmListDependencies = require ('../index.js');
    NpmListDependencies ({ prefix : path.join (__dirname + '/..') })
    .then (function (dependencies) {
      console.log (dependencies);
      assert.ok(dependencies);
      done();
    });
  });
});
