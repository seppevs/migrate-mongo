'use strict';

const async = require('async');
const _ = require('lodash');
const shifting = require('shifting');

const status = require('./status');
const configFile = require('../env/configFile');
const migrationsDir = require('../env/migrationsDir');

module.exports = function (db, done) {
  const downgraded = [];

  async.waterfall([
    function fetchStatus(next) {
      status(db, next);
    },
    function downGradeLastApplied(statusItems, next) {
      const appliedItems = statusItems.filter((item) => item.appliedAt !== 'PENDING');
      const lastAppliedItem = _.last(appliedItems);

      if (!lastAppliedItem) {
        return next();
      }

      const migration = migrationsDir.loadMigration(lastAppliedItem.fileName);
      shifting.call([migration, migration.down], db, (err) => {
        if (err) return next(new Error('Could not migrate down ' + lastAppliedItem.fileName + ': ' + err.message));

        const collectionName = configFile.read().changelogCollectionName;
        const collection = db.collection(collectionName);

        collection.deleteOne({fileName: lastAppliedItem.fileName}, (err) => {
          if (err) return next(new Error('Could not update changelog: ' + err.message));
          downgraded.push(lastAppliedItem.fileName);
          next();
        });
      });
    }
  ], (err) => done(err, downgraded));
};