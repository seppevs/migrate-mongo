'use strict';

var async = require('async');
var fs = require('fs-extra');

var migrationsDir = require('../env/migrationsDir');
var configFile = require('../env/configFile');

module.exports = function (done) {
  async.waterfall([
    verify.migrationDirShouldExist,
    verify.configFileShouldExist,

    function fetchFilesInMigrationsDirectory(next) {
      migrationsDir.getFileNames(next)
    },
    function fetchContentOfChangeLog(fileNames, next) {
      // TODO ///
      next();
    }

  ], done);
};