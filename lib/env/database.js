'use strict';

var configFile = require('./configFile');
var MongoClient = require('mongodb').MongoClient
var _ = require('lodash');

module.exports = {

  connect: function (done) {
    var config = configFile.read();
    var url = _.get(config, 'mongodb.url');
    MongoClient.connect(url, done);
  }

};