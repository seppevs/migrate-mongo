'use strict';

const async = require('async');
const moment = require('moment');
const fs = require('fs-extra');
const path = require('path');

const migrationsDir = require('../env/migrationsDir');

module.exports = function (description, done) {
  if (!description) return done(new Error('Missing parameter: description'));
  async.waterfall([
    migrationsDir.shouldExist,
    (taskDone) => {
      description = description.split(' ').join('_');
      const source = path.join(__dirname, '../../samples/migration.js');
      const filename = moment.utc().format('YYYYMMDDHHmmss') + '-' + description + '.js';
      const destination = path.join(migrationsDir.resolve(), filename);
      return fs.copy(source, destination, (err) => {
        if (err) return taskDone(err);
        return taskDone(null, filename);
      });
    }
  ], done);
};