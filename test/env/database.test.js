'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('database', function () {

  let database; // module under test
  let configFile, mongodb; // mocked dependencies

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
      database.connect(() => {
        expect(mongodb.MongoClient.connect.called).to.equal(true);
        expect(mongodb.MongoClient.connect.getCall(0).args[0])
          .to.equal('mongodb://someserver:27017/testdb');
        done();
      });
    });
  });

  function mockConfigFile() {
    return {
      read: sinon.stub().returns({
        mongodb: {
          url: 'mongodb://someserver:27017/testdb'
        }
      })
    };
  }

  function mockMongodb() {
    return {
      MongoClient: {
        connect: sinon.stub().yields()
      }
    };
  }

});