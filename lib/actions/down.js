'use strict';

var async = require('async');
var status = require('./status');
var path = require('path');
var _ = require('lodash');

var configFile = require('../env/configFile');

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

      var migration = require(path.join(process.cwd(), 'migrations', lastAppliedItem.fileName));
      migration.down(db, function (err) {
        if (err) return next(new Error('Could not migrate down ' + item.fileName + ': ' + err.message));

        var collectionName = configFile.read().changelogCollectionName;
        var collection = db.collection(collectionName);

        collection.deleteOne({fileName: lastAppliedItem.fileName}, function (err, result) {
          if (err) return next('Could not update changelog: ' + err.message);
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