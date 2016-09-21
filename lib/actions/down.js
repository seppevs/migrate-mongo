'use strict';

var async = require('async');
var path = require('path');
var _ = require('lodash');
var shifting = require('shifting');

var status = require('./status');
var configFile = require('../env/configFile');
var migrationsDir = require('../env/migrationsDir');

module.exports = function (db, done) {
  var downgraded = [];

  async.waterfall([
    function fetchStatus(next) {
      status(db, next);
    },
    function downGradeLastApplied(statusItems, next) {
      var appliedItems = statusItems.filter(function (item) {
        return item.appliedAt !== 'PENDING';
      });
      var lastAppliedItem = _.last(appliedItems);

      if (!lastAppliedItem) {
        return next(new Error('No more items to downgrade'));
      }

      var migration = migrationsDir.loadMigration(lastAppliedItem.fileName);
      shifting.call([migration, migration.down], db, function (err) {
        if (err) return next(new Error('Could not migrate down ' + lastAppliedItem.fileName + ': ' + err.message));

        var collectionName = configFile.read().changelogCollectionName;
        var collection = db.collection(collectionName);

        collection.deleteOne({fileName: lastAppliedItem.fileName}, function (err) {
          if (err) return next(new Error('Could not update changelog: ' + err.message));
          downgraded.push(lastAppliedItem.fileName);
          next();
        });
      });
    }
  ], function (err) {
    if (err) return done(err, downgraded);
    return done(null, downgraded);
  });
};