'use strict';

var fs = require('fs-extra');
var path = require('path');

module.exports = {

  'path': function () {
    return path.join(process.cwd(), 'migrations');
  },

  shouldExist: function (done) {
    var configPath = path.join(process.cwd(), 'config.js');
    return fs.stat(configPath, function (err, stats) {
      if (err) return done(new Error('config file does not exist: ' + configPath));
      return done();
    });
  },

  shouldNotExist: function (done) {
    var configPath = path.join(process.cwd(), 'config.js');
    return fs.stat(configPath, function (err, stats) {
      if (err && err.code === 'ENOENT') return done();
      return done(new Error('config.js file already exists at ' + process.cwd()));
    });
  },

  read: function () {
    return require(path.join(process.cwd(), 'config.js'));
  }
};