'use strict';

var fs = require('fs-extra');
var path = require('path');

module.exports = {

  'path': function() {
    return path.join(process.cwd(), 'migrations');
  },

  shouldExist: function(done) {
    var migrationsDir = this.path();
    return fs.stat(migrationsDir, function (err, stats) {
      if (err) return next(new Error('migrations directory does not exist: ' + migrationsDir));
      return next();
    });
  },

  shouldNotExist: function(done) {
    var migrationsDir = this.path();
    return fs.stat(migrationsDir, function (err, stats) {
      if (err && err.code === 'ENOENT') return next();
      return next(new Error('migrations directory already exists: ' + migrationsDir));
    });
  },

  getFileNames: function(done) {
    fs.readdir(this.path(), done);
  }
}