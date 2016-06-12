'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var proxyquire = require('proxyquire');


describe('database', function () {

  var database;

  var configFile, mongodb;

  beforeEach(function () {
    configFile = mockConfigFile();
    mongodb = mockMongodb();

    database = proxyquire('../../lib/env/database', {
      './configFile': configFile,
      'mongodb': mongodb,
    });
  });

  describe('connect()', function () {
    it('should connect MongoClient to the configured mongodb url', function (done) {
      database.connect(function () {
        expect(mongodb.MongoClient.connect.called).to.equal(true);
        expect(mongodb.MongoClient.connect.getCall(0).args[0])
          .to.equal('mongodb://someserver:27017/testdb');
        done();
      });
    });
  });

  function mockConfigFile() {
    var mockedConfigFile = {};
    mockedConfigFile.read = sinon.stub().returns({
      mongodb: {
        url: 'mongodb://someserver:27017/testdb'
      }
    });
    return mockedConfigFile;
  }

  function mockMongodb() {
    var mockedMongodb = {
      MongoClient: {
        connect: sinon.stub().yields()
      }
    };
    return mockedMongodb;
  }

});