'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const path = require('path');

const proxyquire = require('proxyquire');

describe('create', function () {

  let create; // module under test
  let migrationsDir, configFile, fs; // mocked dependencies

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
    create(null, (err) => {
      expect(err.message).to.equal('Missing parameter: description');
      done();
    });
  });

  it('should check that the migrations directory exists', function (done) {
    create('my_description', () => {
      expect(migrationsDir.shouldExist.called).to.equal(true);
      done();
    });
  });

  it('should yield an error when the migrations directory does not exist', function (done) {
    migrationsDir.shouldExist.yields(new Error('migrations directory does not exist'));
    create('my_description', (err) => {
      expect(err.message).to.equal('migrations directory does not exist');
      done();
    });
  });

  it('should not be necessary to have an config file present', function (done) {
    create('my_description', () => {
      expect(configFile.shouldExist.called).to.equal(false);
      done();
    });
  });

  it('should create a new migration file and yield the filename', function (done) {
    const clock = sinon.useFakeTimers(new Date('2016-06-09T08:07:00.077Z').getTime());
    create('my_description', (err, filename) => {
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
    const clock = sinon.useFakeTimers(new Date('2016-06-09T08:07:00.077Z').getTime());
    create('this description contains spaces', () => {
      expect(fs.copy.called).to.equal(true);
      expect(fs.copy.getCall(0).args[0])
        .to.equal(path.join(__dirname, '../samples/migration.js'));
      expect(fs.copy.getCall(0).args[1])
        .to.equal(path.join(process.cwd(), 'migrations', '20160609080700-this_description_contains_spaces.js'));
      clock.restore();
      done();
    });
  });

  it('should yield errors that occurred when copying the file', function (done) {
    fs.copy.yields(new Error('Copy failed'));
    create('my_description', (err) => {
      expect(err.message).to.equal('Copy failed');
      done();
    });
  });

  function mockMigrationsDir() {
    return {
      shouldExist: sinon.stub().yields()
    };
  }

  function mockConfigFile() {
    return {
      shouldExist: sinon.stub().yields()
    };
  }

  function mockFs() {
    return {
      copy: sinon.stub().yields()
    };
  }

});