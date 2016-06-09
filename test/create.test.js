'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var path = require('path');

var proxyquire = require('proxyquire');

describe('create', function () {

  // under test:
  var create;

  // mocked dependencies:
  var migrationsDir, configFile, fs;

  beforeEach(function () {
    migrationsDir = mockMigrationsDir();
    configFile = mockConfigFile();
    fs = mockFs();
    create = proxyquire('../lib/actions/create', {
      '../env/migrationsDir': migrationsDir,
      '../env/configFile': configFile,
      'fs-extra': fs
    });
  });

  it('should yield an error when called without a description', function (done) {
    create(null, function (err) {
      expect(err.message).to.equal('Missing parameter: description');
      done();
    });
  });

  it('should check that the migrations directory exists', function (done) {
    create('my_description', function () {
      expect(migrationsDir.shouldExist.called).to.equal(true);
      done();
    });
  });

  it('should yield an error when the migrations directory does not exist', function (done) {
    migrationsDir.shouldExist.yields(new Error('migrations directory does not exist'));
    create('my_description', function (err) {
      expect(err.message).to.equal('migrations directory does not exist');
      done();
    });
  });

  it('should check that the config file exists', function (done) {
    create('my_description', function () {
      expect(configFile.shouldExist.called).to.equal(true);
      done();
    });
  });

  it('should yield an error when config file does not exist', function (done) {
    configFile.shouldExist.yields(new Error('config file does not exist'));
    create('my_description', function (err) {
      expect(err.message).to.equal('config file does not exist');
      done();
    });
  });

  it('should create a new migration file and yield the filename', function (done) {
    var clock = sinon.useFakeTimers(new Date('2016-06-09T08:07:00.077Z').getTime());
    create('my_description', function (err, filename) {
      expect(fs.copy.called).to.equal(true);
      expect(fs.copy.getCall(0).args[0])
        .to.equal(path.join(__dirname, '../samples/migration.js'));
      expect(fs.copy.getCall(0).args[1])
        .to.equal(path.join(process.cwd(), 'migrations', '20160609080700-my_description.js'));
      expect(filename).to.equal('20160609080700-my_description.js');
      clock.restore();
      done();
    });
  });

  it('should replace spaces in the description with underscores', function (done) {
    var clock = sinon.useFakeTimers(new Date('2016-06-09T08:07:00.077Z').getTime());
    create('my spaced description', function () {
      expect(fs.copy.called).to.equal(true);
      expect(fs.copy.getCall(0).args[0])
        .to.equal(path.join(__dirname, '../samples/migration.js'));
      expect(fs.copy.getCall(0).args[1])
        .to.equal(path.join(process.cwd(), 'migrations', '20160609080700-my_spaced_description.js'));
      clock.restore();
      done();
    });
  });

  it('should yield errors that occurred when copying the file', function (done) {
    fs.copy.yields(new Error('Copy failed'));
    create('my_description', function (err) {
      expect(err.message).to.equal('Copy failed');
      done();
    });
  });

  function mockMigrationsDir() {
    var mockedMigrationsDir = {};
    mockedMigrationsDir.shouldExist = sinon.stub().yields();
    return mockedMigrationsDir;
  }

  function mockConfigFile() {
    var mockedConfigFile = {};
    mockedConfigFile.shouldExist = sinon.stub().yields();
    return mockedConfigFile;
  }

  function mockFs() {
    var mockedFs = {};
    mockedFs.copy = sinon.stub().yields();
    return mockedFs;
  }

});