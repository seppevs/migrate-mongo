'use strict';

var async = require('async');
var fs = require('fs-extra');
var _ = require('lodash');

var migrationsDir = require('../env/migrationsDir');
var configFile = require('../env/configFile');
var database = require('../env/database');

module.exports = function (db, done) {

  var context = {};

  async.waterfall([
    migrationsDir.shouldExist,
    configFile.shouldExist,

    function fetchFilesInMigrationsDirectory(next) {
      migrationsDir.getFileNames(function (err, fileNames) {
        if (err) return next(err);
        context.fileNames = fileNames;
        next();
      })
    },
    function fetchContentOfChangeLog(next) {
      var collectionName = configFile.read().changelogCollectionName;
      var collection = db.collection(collectionName);
      collection.find({}).toArray(function (err, docs) {
        context.changelog = docs;
        next();
      });
    }

  ], function (err) {
    if (err) return done(err);
    var statusTable = context.fileNames.map(function (fileName) {
      var itemInLog = _.find(context.changelog, {fileName: fileName});
      var applied = (itemInLog !== null && itemInLog !== undefined);
      return {fileName: fileName, applied: applied}
    });
    return done(null, statusTable);
  });
};