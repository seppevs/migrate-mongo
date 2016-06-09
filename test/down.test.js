'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var path = require('path');

var proxyquire = require('proxyquire');

describe('down', function () {

  // under test:
  var down;

  // mocked dependencies:
  var status, configFile, migrationsDir, db;

  // test data
  var migration, config, changelogCollection, statusItems;

  beforeEach(function () {
    migration = mockMigration();
    config = mockConfig();
    changelogCollection = mockChangelogCollection();

    status = mockStatus();
    configFile = mockConfigFile();
    migrationsDir = mockMigrationsDir();
    db = mockDb();

    down = proxyquire('../lib/actions/down', {
      './status': status,
      '../env/configFile': configFile,
      '../env/migrationsDir': migrationsDir
    });
  });

  it('should fetch the status', function (done) {
    down(db, function () {
      expect(status.called).to.equal(true);
      done();
    });
  });

  it('should yield an error when there is nothing to downgrade', function (done) {
    status.yields(null, [
      {fileName: '20160609113224-some_migration.js', appliedAt: 'PENDING'}
    ]);
    down(db, function (err) {
      expect(err.message).to.equal('No more items to downgrade');
      done();
    });
  });

  it('should load the last applied migration', function (done) {
    down(db, function (err) {
      expect(migrationsDir.loadMigration.getCall(0).args[0])
        .to.equal('20160609113225-last_migration.js');
      done();
    });
  });

  it('should downgrade the last applied migration', function (done) {
    down(db, function (err) {
      expect(migration.down.called).to.equal(true);
      done();
    });
  });

  it('should yield an error when an error occurred during the downgrade', function (done) {
    migration.down.yields(new Error('Invalid syntax'));
    down(db, function (err) {
      expect(err.message).to.equal('Could not migrate down 20160609113225-last_migration.js: Invalid syntax');
      done();
    });
  });

  it('should remove the entry of the downgraded migration from the changelog collection', function (done) {
    down(db, function (err) {
      expect(changelogCollection.deleteOne.called).to.equal(true);
      expect(changelogCollection.deleteOne.callCount).to.equal(1);
      done();
    });
  });

  it('should yield errors that occurred when deleting from the changelog collection', function (done) {
    changelogCollection.deleteOne.yields(new Error('Could not delete'));
    down(db, function (err) {
      expect(err.message).to.equal('Could not update changelog: Could not delete');
      done();
    });
  });

  it('should yield a list of downgraded items', function (done) {
    down(db, function (err, items) {
      expect(items).to.deep.equal(['20160609113225-last_migration.js']);
      done();
    });
  });

  function mockStatus() {
    return sinon.stub().yields(null, [
      {fileName: '20160609113224-first_migration.js', appliedAt: new Date()},
      {fileName: '20160609113225-last_migration.js', appliedAt: new Date()}
    ]);
  }

  function mockConfigFile() {
    return {
      shouldExist: sinon.stub().yields(),
      read: sinon.stub().returns({
        changelogCollectionName: 'changelog'
      })
    };
  }

  function mockMigrationsDir() {
    return {
      loadMigration: sinon.stub().returns(migration)
    };
  }

  function mockDb() {
    var mocked = {};
    mocked.collection = sinon.stub();
    mocked.collection.withArgs('changelog').returns(changelogCollection);
    return mocked;
  }

  function mockMigration() {
    return {
      down: sinon.stub().yields()
    };
  }

  function mockChangelogCollection() {
    return {
      deleteOne: sinon.stub().yields()
    };
  }

  function mockConfig() {
    return {};
  }

});