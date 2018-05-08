'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');

const proxyquire = require('proxyquire');

describe('down', function () {

  let down; // module under test
  let status, configFile, migrationsDir, db;  // mocked dependencies
  let migration, changelogCollection; // test data

  beforeEach(function () {
    migration = mockMigration();
    changelogCollection = mockChangelogCollection();

    status = mockStatus();
    configFile = mockConfigFile();
    migrationsDir = mockMigrationsDir();
    db = mockDb();

    down = loadDownWithInjectedMocks();
  });

  it('should fetch the status', function (done) {
    down(db, () => {
      expect(status.called).to.equal(true);
      done();
    });
  });

  it('should yield empty list when nothing to downgrade', function (done) {
    status.yields(null, [
      { fileName: '20160609113224-some_migration.js', appliedAt: 'PENDING' }
    ]);
    down(db, (err, migrated) => {
      expect(err).to.equal(undefined);
      expect(migrated).to.deep.equal([]);
      done();
    });
  });

  it('should load the last applied migration', function (done) {
    down(db, () => {
      expect(migrationsDir.loadMigration.getCall(0).args[0]).to.equal('20160609113225-last_migration.js');
      done();
    });
  });

  it('should downgrade the last applied migration', function (done) {
    down(db, () => {
      expect(migration.down.called).to.equal(true);
      done();
    });
  });

  /*eslint no-unused-vars: "off"*/
  it('should allow downgrade to return promise', function (done) {
    migration = sinon.stub({ down: function (db) { /* arg required for function.length */ } });
    migration.down.returns(Promise.resolve());
    migrationsDir = mockMigrationsDir();
    down = loadDownWithInjectedMocks();
    down(db, () => {
      expect(migration.down.called).to.equal(true);
      done();
    });
  });

  it('should yield an error when an error occurred during the downgrade', function (done) {
    migration.down.yields(new Error('Invalid syntax'));
    down(db, (err) => {
      expect(err.message).to.equal('Could not migrate down 20160609113225-last_migration.js: Invalid syntax');
      done();
    });
  });

  it('should remove the entry of the downgraded migration from the changelog collection', function (done) {
    down(db, () => {
      expect(changelogCollection.deleteOne.called).to.equal(true);
      expect(changelogCollection.deleteOne.callCount).to.equal(1);
      done();
    });
  });

  it('should yield errors that occurred when deleting from the changelog collection', function (done) {
    changelogCollection.deleteOne.yields(new Error('Could not delete'));
    down(db, (err) => {
      expect(err.message).to.equal('Could not update changelog: Could not delete');
      done();
    });
  });

  it('should yield a list of downgraded items', function (done) {
    down(db, (err, items) => {
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
      read: sinon.stub().returns({ changelogCollectionName: 'changelog' })
    };
  }

  function mockMigrationsDir() {
    return {
      loadMigration: sinon.stub().returns(migration)
    };
  }

  function mockDb() {
    const mock = {};
    mock.collection = sinon.stub();
    mock.collection.withArgs('changelog').returns(changelogCollection);
    return mock;
  }

  function mockMigration() {
    const migration = sinon.stub({
      down: function (db, cb) {
        // args are required for function.length
      },
    });
    migration.down.yields(null);
    return migration;
  }

  function mockChangelogCollection() {
    return {
      deleteOne: sinon.stub().yields()
    };
  }

  function loadDownWithInjectedMocks() {
    return proxyquire('../lib/actions/down', {
      './status': status,
      '../env/configFile': configFile,
      '../env/migrationsDir': migrationsDir
    });
  }

});
