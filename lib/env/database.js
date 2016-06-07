'use strict';

var configHelper = require('./config');
var MongoClient = require('mongodb').MongoClient
var _ = require('lodash');

module.exports = {

  connect: function (done) {
    var config = configHelper.read();
    var url = _.get(config, 'mongodb.url');
    MongoClient.connect(url, done);
  }

};