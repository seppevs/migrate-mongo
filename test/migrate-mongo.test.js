'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var proxyquire = require('proxyquire');

describe('/lib/migrate-mongo.js', function() {

  var migrateMongo;

  var dependencies;

  beforeEach(function() {
    dependencies = {
      './actions/create': sinon.stub(),
      './actions/down': sinon.stub(),
      './actions/init': sinon.stub(),
      './actions/status': sinon.stub(),
      './actions/up': sinon.stub(),
    }
    migrateMongo = proxyquire('../lib/migrate-mongo', dependencies);
  });

  describe('create()', function() {
    it('should delegate to the create action', function(done) {
      migrateMongo.create();
      expect(dependencies['./actions/create'].called).to.equal(true);
      done();
    });
  });

  describe('down()', function() {
    it('should delegate to the down action', function(done) {
      migrateMongo.down();
      expect(dependencies['./actions/down'].called).to.equal(true);
      done();
    });
  });

  describe('init()', function() {
    it('should delegate to the init action', function(done) {
      migrateMongo.init();
      expect(dependencies['./actions/init'].called).to.equal(true);
      done();
    });
  });

  describe('status()', function() {
    it('should delegate to the status action', function(done) {
      migrateMongo.status();
      expect(dependencies['./actions/status'].called).to.equal(true);
      done();
    });
  });

  describe('up()', function() {
    it('should delegate the up action', function(done) {
      migrateMongo.up();
      expect(dependencies['./actions/up'].called).to.equal(true);
      done();
    });
  });

});

