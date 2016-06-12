'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var proxyquire = require('proxyquire');

var path = require('path');

describe('configFile', function () {

  var configFile;
  var fs;

  beforeEach(function () {
    fs = mockFs();
    configFile = proxyquire('../../lib/env/configFile', {'fs-extra': fs});
  });

  describe('shouldExist()', function () {
    it('should not yield an error if the config file exists', function (done) {
      fs.stat.yields(null);
      configFile.shouldExist(function (err) {
        expect(err).to.equal(undefined);
        done();
      });
    });

    it('should yield an error if the config file does not exist', function (done) {
      var configPath = path.join(process.cwd(), 'config.js');
      fs.stat.yields(new Error('It does not exist'));
      configFile.shouldExist(function (err) {
        expect(err.message)
          .to.equal('config file does not exist: ' + configPath);
        done();
      });
    });
  });

  describe('shouldNotExist()', function () {
    it('should not yield an error if the config file does not exist', function (done) {
      var error = new Error('File does not exist');
      error.code = 'ENOENT';
      fs.stat.yields(error);
      configFile.shouldNotExist(function (err) {
        expect(err).to.equal(undefined);
        done();
      });
    });

    it('should yield an error if the config file exists', function (done) {
      var configPath = path.join(process.cwd(), 'config.js');
      fs.stat.yields();
      configFile.shouldNotExist(function (err) {
        expect(err.message)
          .to.equal('config file already exists: ' + configPath);
        done();
      });
    });
  });

  describe('read()', function () {
    it('should attempt to read the config file', function (done) {
      var configPath = path.join(process.cwd(), 'config.js');
      try {
        configFile.read();
      } catch (err) {
        expect(err.message).to.equal('Cannot find module \'' + configPath + '\'');
        done();
      }
    });
  });

  function mockFs() {
    var mockedFs = {};
    mockedFs.stat = sinon.stub();
    return mockedFs;
  }

});