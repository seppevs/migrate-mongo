'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const path = require('path');

describe('migrationsDir', function () {

  let migrationsDir;
  let fs, configFile;

  beforeEach(function () {
    fs = mockFs();
    configFile = mockConfigFile();
    migrationsDir = proxyquire('../../lib/env/migrationsDir', {
      'fs-extra': fs,
      './configFile': configFile,
    });
  });

  describe('resolve()', function () {

    it('should use the configured relative migrations dir when a config file is available', function () {
      configFile.read.returns({
        migrationsDir: 'custom-migrations-dir'
      });
      expect(migrationsDir.resolve()).to.equal(path.join(process.cwd(), 'custom-migrations-dir'));
    });

    it('should use the configured absolute migrations dir when a config file is available', function () {
      configFile.read.returns({
        migrationsDir: '/absolute/path/to/my/custom-migrations-dir'
      });
      expect(migrationsDir.resolve()).to.equal('/absolute/path/to/my/custom-migrations-dir');
    });

    it('should use the default migrations directory when no migrationsDir is specified in the config file', function () {
      configFile.read.returns({
      });
      expect(migrationsDir.resolve()).to.equal(path.join(process.cwd(), 'migrations'));
    });

    it('should use the default migrations directory when unable to read the config file', function () {
      configFile.read.throws(new Error('Cannot read config file'));
      expect(migrationsDir.resolve()).to.equal(path.join(process.cwd(), 'migrations'));
    });

  });

  describe('shouldExist()', function () {
    it('should not yield an error if the migrations dir exists', function (done) {
      fs.stat.yields(null);
      migrationsDir.shouldExist((err) => {
        expect(err).to.equal(undefined);
        done();
      });
    });

    it('should yield an error if the migrations dir does not exist', function (done) {
      const migrationsPath = path.join(process.cwd(), 'migrations');
      fs.stat.yields(new Error('It does not exist'));
      migrationsDir.shouldExist((err) => {
        expect(err.message).to.equal('migrations directory does not exist: ' + migrationsPath);
        done();
      });
    });
  });

  describe('shouldNotExist()', function () {
    it('should not yield an error if the migrations dir does not exist', function (done) {
      const error = new Error('File does not exist');
      error.code = 'ENOENT';
      fs.stat.yields(error);
      migrationsDir.shouldNotExist((err) => {
        expect(err).to.equal(undefined);
        done();
      });
    });

    it('should yield an error if the migrations dir exists', function (done) {
      const migrationsPath = path.join(process.cwd(), 'migrations');
      fs.stat.yields();
      migrationsDir.shouldNotExist((err) => {
        expect(err.message).to.equal('migrations directory already exists: ' + migrationsPath);
        done();
      });
    });
  });

  describe('getFileNames()', function () {
    it('should read the directory and yield the result', function (done) {
      fs.readdir.yields(null, ['file1.js', 'file2.js']);
      migrationsDir.getFileNames((err, files) => {
        expect(files).to.deep.equal(['file1.js', 'file2.js']);
        done();
      });
    });

    it('should list only .js files', function (done) {
      fs.readdir.yields(null, ['file1.js', 'file2.js', '.keep']);
      migrationsDir.getFileNames((err, files) => {
        expect(files).to.deep.equal(['file1.js', 'file2.js']);
        done();
      });
    });

    it('should yield errors that occurred while reading the dir', function (done) {
      fs.readdir.yields(new Error('Could not read'));
      migrationsDir.getFileNames((err) => {
        expect(err.message).to.equal('Could not read');
        done();
      });
    });
  });

  describe('loadMigration()', function () {
    it('should attempt to load the fileName in the migrations directory', function (done) {
      const pathToMigration = path.join(process.cwd(), 'migrations', 'someFile.js');
      try {
        migrationsDir.loadMigration('someFile.js');
      } catch (err) {
        expect(err.message).to.equal('Cannot find module \'' + pathToMigration + '\'');
        done();
      }
    });
  });

  function mockFs() {
    return {
      stat: sinon.stub(),
      readdir: sinon.stub()
    };
  }

  function mockConfigFile() {
    return {
      read: sinon.stub().returns({
        migrationsDir: 'migrations',
      }),
    };
  }

});