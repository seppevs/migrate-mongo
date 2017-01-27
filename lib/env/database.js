'use strict';

const configFile = require('./configFile');
const MongoClient = require('mongodb').MongoClient;
const _ = require('lodash');

module.exports = {
  connect(done) {
    const config = configFile.read();
    const url = _.get(config, 'mongodb.url');
    MongoClient.connect(url, done);
  }
};