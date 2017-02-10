'use strict';

const async = require('async');
const _ = require('lodash');

const migrationsDir = require('../env/migrationsDir');
const configFile = require('../env/configFile');

module.exports = function (db, done) {

  const context = {};

  async.waterfall([
    migrationsDir.shouldExist,
    configFile.shouldExist,
    function fetchFilesInMigrationsDirectory(next) {
      migrationsDir.getFileNames((err, fileNames) => {
        if (err) return next(err);
        context.fileNames = fileNames;
        next();
      });
    },
    function fetchContentOfChangeLog(next) {
      const collectionName = configFile.read().changelogCollectionName;
      const collection = db.collection(collectionName);
      collection.find({}).toArray((err, docs) => {
        if (err) return next(err);
        context.changelog = docs;
        next();
      });
    }
  ], function (err) {
    if (err) return done(err);
    const statusTable = context.fileNames.map((fileName) => {
      const itemInLog = _.find(context.changelog, {fileName});
      const appliedAt = itemInLog ? itemInLog.appliedAt.toJSON() : 'PENDING';
      return { fileName, appliedAt };
    });
    return done(null, statusTable);
  });
};