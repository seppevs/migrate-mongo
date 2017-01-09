'use strict';

var fs = require('fs-extra');
var path = require('path');
var _ = require('lodash');

var DEFAULT_CONFIG_FILE_NAME = 'config.js';

module.exports = {

  shouldExist: function (done) {
    var configPath = getConfigPath();
    return fs.stat(configPath, function (err, stats) {
      if (err) return done(new Error('config file does not exist: ' + configPath));
      return done();
    });
  },

  shouldNotExist: function (done) {
    var configPath = getConfigPath();
    return fs.stat(configPath, function (err, stats) {
      if (err && err.code === 'ENOENT') return done();
      return done(new Error('config file already exists: ' + configPath));
    });
  },

  read: function () {
    return require(getConfigPath());
  }
};

function getConfigPath() {
  var fileOptionValue = _.get(global.options, 'file');
  if (!fileOptionValue) {
    return path.join(process.cwd(), DEFAULT_CONFIG_FILE_NAME);
  }

  if (path.isAbsolute(fileOptionValue)) {
    return fileOptionValue;
  } else {
    return path.join(process.cwd(), fileOptionValue);
  }
}