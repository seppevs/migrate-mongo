'use strict';

var fs = require('fs-extra');
var path = require('path');

module.exports = {
  
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
      return done(new Error('config file already exists: ' + configPath));
    });
  },

  read: function () {
    return require(path.join(process.cwd(), 'config.js'));
  }
};