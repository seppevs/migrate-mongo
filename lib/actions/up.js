'use strict';

const async = require('async');
const status = require('./status');
const shifting = require('shifting');
const _ = require('lodash');
const moment = require('moment');

const configFile = require('../env/configFile');
const migrationsDir = require('../env/migrationsDir');

module.exports = function (db, done) {
  const upgraded = [];

  async.waterfall([
    (next) => status(db, next),
    function upgradePending(statusItems, next) {
      const pendingItems = _.filter(statusItems, {appliedAt: 'PENDING'});
      async.eachSeries(pendingItems, function (item, nextItem) {
        const migration = migrationsDir.loadMigration(item.fileName);
        shifting.call([migration, migration.up], db, (err) => {
          if (err) return nextItem(new Error('Could not migrate up ' + item.fileName + ': ' + err.message));

          const collectionName = configFile.read().changelogCollectionName;
          const collection = db.collection(collectionName);

          const fileName = item.fileName;
          const appliedAt = moment.utc().toDate();

          collection.insert({ fileName, appliedAt }, (err) => {
            if (err) return nextItem(new Error('Could not update changelog: ' + err.message));
            upgraded.push(item.fileName);
            nextItem();
          });
        });
      }, next);
    }
  ], (err) => done(err, upgraded));
};