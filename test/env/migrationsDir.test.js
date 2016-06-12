'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var proxyquire = require('proxyquire');

var path = require('path');

describe('migrationsDir', function () {

  var migrationsDir;
  var fs;

  beforeEach(function () {
    fs = mockFs();
    migrationsDir = proxyquire('../../lib/env/migrationsDir', {'fs-extra': fs});
  });

  describe('shouldExist()', function () {
    it('should not yield an error if the migrations dir exists', function (done) {
      fs.stat.yields(null);
      migrationsDir.shouldExist(function (err) {
        expect(err).to.equal(undefined);
        done();
      });
    });

    it('should yield an error if the migrations dir does not exist', function (done) {
      var migrationsPath = path.join(process.cwd(), 'migrations');
      fs.stat.yields(new Error('It does not exist'));
      migrationsDir.shouldExist(function (err) {
        expect(err.message)
          .to.equal('migrations directory does not exist: ' + migrationsPath);
        done();
      });
    });
  });

  describe('shouldNotExist()', function () {
    it('should not yield an error if the migrations dir does not exist', function (done) {
      var error = new Error('File does not exist');
      error.code = 'ENOENT';
      fs.stat.yields(error);
      migrationsDir.shouldNotExist(function (err) {
        expect(err).to.equal(undefined);
        done();
      });
    });

    it('should yield an error if the migrations dir exists', function (done) {
      var migrationsPath = path.join(process.cwd(), 'migrations');
      fs.stat.yields();
      migrationsDir.shouldNotExist(function (err) {
        expect(err.message)
          .to.equal('migrations directory already exists: ' + migrationsPath);
        done();
      });
    });
  });

  describe('getFileNames()', function () {
    it('should read the directory and yield the result', function (done) {
      var migrationsPath = path.join(process.cwd(), 'migrations');
      fs.readdir.yields(null, ['file1', 'file2']);
      migrationsDir.getFileNames(function (err, files) {
        expect(files).to.deep.equal(['file1', 'file2']);
        done();
      });
    });
  });

  describe('loadMigration()', function () {
    it('should attempt to load the fileName in the migrations directory', function (done) {
      var pathToMigration = path.join(process.cwd(), 'migrations', 'someFile.js');
      try {
        migrationsDir.loadMigration('someFile.js');
      } catch (err) {
        expect(err.message).to.equal('Cannot find module \'' + pathToMigration + '\'');
        done();
      }
    });
  });

  function mockFs() {
    var mockedFs = {};
    mockedFs.stat = sinon.stub();
    mockedFs.readdir = sinon.stub();
    return mockedFs;
  }

});