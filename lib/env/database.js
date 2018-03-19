'use strict';

const configFile = require('./configFile');
const MongoClient = require('mongodb').MongoClient;
const _ = require('lodash');

module.exports = {
  connect(done) {
    const config = configFile.read();
    const url = _.get(config, 'mongodb.url');
    const databaseName = _.get(config, 'mongodb.databaseName');
    const options = _.get(config, 'mongodb.options');

    if (!url) {
      return done(new Error('No `url` defined in config file!'));
    }

    if (!databaseName) {
      return done(new Error('No `databaseName` defined in config file! This is required since migrate-mongo v3. ' +
        'See https://github.com/seppevs/migrate-mongo#initialize-a-new-project'));
    }

    MongoClient.connect(url, options, (err, client) => {
      if (err) return done(err);
      const db = client.db(databaseName);
      return done(null, db);
    });
  }
};