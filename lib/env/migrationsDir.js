'use strict';

var fs = require('fs-extra');
var path = require('path');

module.exports = {

  shouldExist: function(done) {
    var migrationsDir = path.join(process.cwd(), 'migrations');
    return fs.stat(migrationsDir, function (err, stats) {
      if (err) return done(new Error('migrations directory does not exist: ' + migrationsDir));
      return done();
    });
  },

  shouldNotExist: function(done) {
    var migrationsDir = path.join(process.cwd(), 'migrations');
    return fs.stat(migrationsDir, function (err, stats) {
      if (err && err.code === 'ENOENT') return done();
      return done(new Error('migrations directory already exists: ' + migrationsDir));
    });
  },

  getFileNames: function(done) {
    var migrationsDir = path.join(process.cwd(), 'migrations');
    fs.readdir(migrationsDir, done);
  }
}