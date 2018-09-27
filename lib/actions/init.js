'use strict';

const async = require('async');
const fs = require('fs-extra');
const path = require('path');

const migrationsDir = require('../env/migrationsDir');
const configFile = require('../env/configFile');

module.exports = function (done) {
  async.waterfall([
    migrationsDir.shouldNotExist,
    configFile.shouldNotExist,
    copySampleConfigFile,
    createMigrationsDirectory,
  ], done);
};

function copySampleConfigFile(next) {
  const source = path.join(__dirname, '../../samples/migrate-mongo-config.js');
  const destination = path.join(process.cwd(), configFile.DEFAULT_CONFIG_FILE_NAME);
  return fs.copy(source, destination, next);
}

function createMigrationsDirectory(next) {
  return fs.mkdirs(path.join(process.cwd(), 'migrations'), next);
}