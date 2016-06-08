'use strict';

var async = require('async');
var moment = require('moment');
var fs = require('fs-extra');
var path = require('path');

var migrationsDir = require('../env/migrationsDir');
var configFile = require('../env/configFile');

module.exports = function (description, done) {
  if (!description) return done(new Error('Missing parameter: description'));
  async.waterfall([
    migrationsDir.shouldExist,
    configFile.shouldExist,
    function (taskDone) {
      description = description.split(' ').join('_'); // replace spaces with underscores
      var source = path.join(__dirname, '../../samples/migration.js');
      var filename = moment.utc().format('YYYYMMDDHHmmss') + '-' + description + '.js';
      var destination = path.join(process.cwd(), 'migrations', filename);
      return fs.copy(source, destination, function (err) {
        if (err) return taskDone(err);
        return taskDone(null, filename);
      });
    }
  ], done);
};