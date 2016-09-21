'use strict';

var async = require('async');
var status = require('./status');
var shifting = require('shifting');
var path = require('path');
var _ = require('lodash');
var moment = require('moment');

var configFile = require('../env/configFile');
var migrationsDir = require('../env/migrationsDir');

module.exports = function (db, done) {
  var upgraded = [];

  async.waterfall([
    function fetchStatus(next) {
      status(db, next);
    },
    function upgradePending(statusItems, next) {
      var pendingItems = _.filter(statusItems, {appliedAt: 'PENDING'});
      async.eachSeries(pendingItems, function (item, nextItem) {
        var migration = migrationsDir.loadMigration(item.fileName);
        shifting.call([migration, migration.up], db, function (err) {
          if (err) return nextItem(new Error('Could not migrate up ' + item.fileName + ': ' + err.message));

          var collectionName = configFile.read().changelogCollectionName;
          var collection = db.collection(collectionName);

          var changelogDoc = {fileName: item.fileName, appliedAt: moment.utc().toDate()};
          collection.insert(changelogDoc, function (err, result) {
            if (err) return nextItem(new Error('Could not update changelog: ' + err.message));
            upgraded.push(item.fileName);
            nextItem();
          });
        });
      }, next);
    }
  ], function (err) {
    if (err) return done(err, upgraded);
    return done(null, upgraded);
  });
};