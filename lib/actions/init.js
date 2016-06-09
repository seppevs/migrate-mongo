'use strict';

var async = require('async');
var fs = require('fs-extra');
var path = require('path');

var migrationsDir = require('../env/migrationsDir');
var configFile = require('../env/configFile');

module.exports = function (done) {
  async.waterfall([
    migrationsDir.shouldNotExist,
    configFile.shouldNotExist,
    function copySampleConfigFile(next) {
      var source = path.join(__dirname, '../../samples/config.js');
      var destination = path.join(process.cwd(), 'config.js');
      return fs.copy(source, destination, next);
    },
    function createMigrationsDirectory(next) {
      return fs.mkdirs(path.join(process.cwd(), 'migrations'), next);
    }
  ], done);
};