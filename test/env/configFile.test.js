'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const path = require('path');

describe('configFile', function () {

  let configFile; // module under test
  let fs; // mocked dependencies

  beforeEach(function () {
    fs = mockFs();
    configFile = proxyquire('../../lib/env/configFile', {'fs-extra': fs});
  });

  describe('shouldExist()', function () {
    it('should not yield an error if the config file exists', function (done) {
      fs.stat.yields(null);
      configFile.shouldExist((err) => {
        expect(err).to.equal(undefined);
        done();
      });
    });

    it('should yield an error if the config file does not exist', function (done) {
      const configPath = path.join(process.cwd(), 'config.js');
      fs.stat.yields(new Error('It does not exist'));
      configFile.shouldExist((err) => {
        expect(err.message)
          .to.equal('config file does not exist: ' + configPath);
        done();
      });
    });
  });

  describe('shouldNotExist()', function () {
    it('should not yield an error if the config file does not exist', function (done) {
      const error = new Error('File does not exist');
      error.code = 'ENOENT';
      fs.stat.yields(error);
      configFile.shouldNotExist((err) => {
        expect(err).to.equal(undefined);
        done();
      });
    });

    it('should yield an error if the config file exists', function (done) {
      const configPath = path.join(process.cwd(), 'config.js');
      fs.stat.yields();
      configFile.shouldNotExist((err) => {
        expect(err.message).to.equal('config file already exists: ' + configPath);
        done();
      });
    });
  });

  describe('read()', function () {
    it('should attempt to read the config file', function (done) {
      const configPath = path.join(process.cwd(), 'config.js');
      try {
        configFile.read();
      } catch (err) {
        expect(err.message).to.equal('Cannot find module \'' + configPath + '\'');
        done();
      }
    });

    it('should be possible to read a custom, absolute config file path', function (done) {
      global.options = {file: '/some/absoluete/path/to/a-config-file.js'};
      try {
        configFile.read();
      } catch (err) {
        expect(err.message).to.equal('Cannot find module \'' + global.options.file + '\'');
        done();
      }
    });

    it('should be possible to read a custom, relative config file path', function (done) {
      global.options = {file: './a/relative/path/to/a-config-file.js'};
      const configPath = path.join(process.cwd(), global.options.file);
      try {
        configFile.read();
      } catch (err) {
        expect(err.message).to.equal('Cannot find module \'' + configPath + '\'');
        done();
      }
    });
  });

  function mockFs() {
    return {
      stat: sinon.stub()
    };
  }

});