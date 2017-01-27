'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const path = require('path');
const proxyquire = require('proxyquire');

describe('init', function () {

  let init; // module under test
  let migrationsDir, configFile, fs; // mocked dependencies

  beforeEach(function () {
    migrationsDir = mockMigrationsDir();
    configFile = mockConfigFile();
    fs = mockFs();
    init = proxyquire('../lib/actions/init', {
      '../env/migrationsDir': migrationsDir,
      '../env/configFile': configFile,
      'fs-extra': fs
    });
  });

  it('should check if the migrations directory already exists', function (done) {
    init(() => {
      expect(migrationsDir.shouldNotExist.called).to.equal(true);
      done();
    });
  });

  it('should not continue and yield an error if the migrations directory already exists', function (done) {
    migrationsDir.shouldNotExist.yields(new Error('Dir exists'));
    init((err) => {
      expect(err.message).to.equal('Dir exists');
      expect(fs.copy.called).to.equal(false);
      expect(fs.mkdirs.called).to.equal(false);
      done();
    });
  });

  it('should check if the config file already exists', function (done) {
    init(() => {
      expect(configFile.shouldNotExist.called).to.equal(true);
      done();
    });
  });

  it('should not continue and yield an error if the config file already exists', function (done) {
    configFile.shouldNotExist.yields(new Error('Config exists'));
    init((err) => {
      expect(err.message).to.equal('Config exists');
      expect(fs.copy.called).to.equal(false);
      expect(fs.mkdirs.called).to.equal(false);
      done();
    });
  });

  it('should copy the sample config file to the current working directory', function (done) {
    init(() => {
      expect(fs.copy.called).to.equal(true);
      expect(fs.copy.callCount).to.equal(1);

      const source = fs.copy.getCall(0).args[0];
      expect(source).to.equal(path.join(__dirname, '../samples/config.js'));

      const destination = fs.copy.getCall(0).args[1];
      expect(destination).to.equal(path.join(process.cwd(), 'config.js'));

      done();
    });
  });

  it('should yield errors that occurred when copying the sample config', function (done) {
    fs.copy.yields(new Error('No space left on device'));
    init((err) => {
      expect(err.message).to.equal('No space left on device');
      done();
    });
  });

  it('should create a migrations directory in the current working directory', function (done) {
    init(() => {
      expect(fs.mkdirs.called).to.equal(true);
      expect(fs.mkdirs.callCount).to.equal(1);
      expect(fs.mkdirs.getCall(0).args[0]).to.deep.equal(path.join(process.cwd(), 'migrations'));
      done();
    });
  });

  it('should yield errors that occurred when creating the migrations directory', function (done) {
    fs.mkdirs.yields(new Error('I cannot do that'));
    init((err) => {
      expect(err.message).to.equal('I cannot do that');
      done();
    });
  });

  function mockMigrationsDir() {
    return {
      shouldNotExist: sinon.stub().yields()
    };
  }

  function mockConfigFile() {
    return {
      shouldNotExist: sinon.stub().yields()
    };
  }

  function mockFs() {
    return {
      copy: sinon.stub().yields(),
      mkdirs: sinon.stub().yields()
    };
  }


});