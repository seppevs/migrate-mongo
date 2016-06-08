'use strict';

var async = require('async');
var status = require('./status');
var path = require('path');
var _ = require('lodash');

var configFile = require('../env/configFile');

module.exports = function (db, done) {
  var upgraded = [];

  async.waterfall([
    function fetchStatus(next) {
      status(db, next);
    },
    function upgradePending(statusItems, next) {
      var pendingItems = _.filter(statusItems, {applied: false});
      async.eachSeries(pendingItems, function (item, nextItem) {
        var migration = require(path.join(process.cwd(), 'migrations', item.fileName));
        migration.up(db, function (err) {
          if (err) return nextItem(new Error('Could not migrate up ' + item.fileName + ': ' + err.message));

          var collectionName = configFile.read().changelogCollectionName;
          var collection = db.collection(collectionName);

          collection.insert({fileName: item.fileName}, function (err, result) {
            if (err) return nextItem('Could not update changelog: ' + err.message);
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