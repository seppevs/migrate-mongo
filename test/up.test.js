'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');

const proxyquire = require('proxyquire');

describe('up', function () {

  let up; // module under test:
  let status, configFile, migrationsDir, db; // mocked dependencies
  let firstPendingMigration, secondPendingMigration, changelogCollection; // test data

  beforeEach(function () {
    firstPendingMigration = mockMigration();
    secondPendingMigration = mockMigration();
    changelogCollection = mockChangelogCollection();

    status = mockStatus();
    configFile = mockConfigFile();
    migrationsDir = mockMigrationsDir();
    db = mockDb();

    up = loadUpWithInjectedMocks();
  });

  it('should fetch the status', function (done) {
    up(db, () => {
      expect(status.called).to.equal(true);
      done();
    });
  });

  it('should load all the pending migrations', function (done) {
    up(db, () => {
      expect(migrationsDir.loadMigration.called).to.equal(true);
      expect(migrationsDir.loadMigration.callCount).to.equal(2);
      expect(migrationsDir.loadMigration.getCall(0).args[0])
        .to.equal('20160607173840-first_pending_migration.js');
      expect(migrationsDir.loadMigration.getCall(1).args[0])
        .to.equal('20160608060209-second_pending_migration.js');
      done();
    });
  });

  it('should upgrade all pending migrations in ascending order', function (done) {
    up(db, () => {
      expect(firstPendingMigration.up.called).to.equal(true);
      expect(secondPendingMigration.up.called).to.equal(true);
      sinon.assert.callOrder(firstPendingMigration.up, secondPendingMigration.up);
      done();
    });
  });

  /*eslint no-unused-vars: "off"*/
  it('should allow upgrades to return promises', function (done) {
    firstPendingMigration = sinon.stub({
      up: (db) => { /* arg required for function.length */
      }
    });
    secondPendingMigration = sinon.stub({
      up: (db) => { /* arg required for function.length */
      }
    });
    firstPendingMigration.up.returns(Promise.resolve());
    secondPendingMigration.up.returns(Promise.resolve());
    migrationsDir = mockMigrationsDir();
    up = loadUpWithInjectedMocks();
    up(db, (err, upgradedFileNames) => {
      expect(firstPendingMigration.up.called).to.equal(true);
      expect(secondPendingMigration.up.called).to.equal(true);
      expect(upgradedFileNames).to.deep.equal([
        '20160607173840-first_pending_migration.js',
        '20160608060209-second_pending_migration.js'
      ]);
      done();
    });
  });

  it('should populate the changelog with info about the upgraded migrations', function (done) {
    const clock = sinon.useFakeTimers(new Date('2016-06-09T08:07:00.077Z').getTime());
    up(db, () => {
      expect(changelogCollection.insert.called).to.equal(true);
      expect(changelogCollection.insert.callCount).to.equal(2);
      expect(changelogCollection.insert.getCall(0).args[0]).to.deep.equal({
        appliedAt: new Date('2016-06-09T08:07:00.077Z'),
        fileName: '20160607173840-first_pending_migration.js'
      });
      clock.restore();
      done();
    });
  });

  it('should yield a list of upgraded migration file names', function (done) {
    up(db, (err, upgradedFileNames) => {
      expect(upgradedFileNames).to.deep.equal([
        '20160607173840-first_pending_migration.js',
        '20160608060209-second_pending_migration.js'
      ]);
      done();
    });
  });

  it('should stop migrating when an error occurred and yield the error + a list successful migrated', function (done) {
    secondPendingMigration.up.yields(new Error('Nope'));
    up(db, (err, upgradedFileNames) => {
      expect(err.message).to.deep.equal('Could not migrate up 20160608060209-second_pending_migration.js: Nope');
      expect(upgradedFileNames).to.deep.equal(['20160607173840-first_pending_migration.js']);
      done();
    });
  });

  it('should yield an error + items already migrated when unable to update the changelog', function (done) {
    changelogCollection.insert.onSecondCall().yields(new Error('Kernel panic'));
    up(db, (err, upgradedFileNames) => {
      expect(err.message).to.deep.equal('Could not update changelog: Kernel panic');
      expect(upgradedFileNames).to.deep.equal(['20160607173840-first_pending_migration.js']);
      done();
    });
  });

  function mockStatus() {
    return sinon.stub().yields(null, [
      {fileName: '20160605123224-first_applied_migration.js', appliedAt: new Date()},
      {fileName: '20160606093207-second_applied_migration.js', appliedAt: new Date()},
      {fileName: '20160607173840-first_pending_migration.js', appliedAt: 'PENDING'},
      {fileName: '20160608060209-second_pending_migration.js', appliedAt: 'PENDING'}
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
    const mock = {};
    mock.loadMigration = sinon.stub();
    mock.loadMigration.withArgs('20160607173840-first_pending_migration.js').returns(firstPendingMigration);
    mock.loadMigration.withArgs('20160608060209-second_pending_migration.js').returns(secondPendingMigration);
    return mock;
  }

  function mockDb() {
    const mock = {};
    mock.collection = sinon.stub();
    mock.collection.withArgs('changelog').returns(changelogCollection);
    return mock;
  }

  function mockMigration() {
    const migration = sinon.stub({
      up: function (db, cb) {
        // args are required for function.length
      },
    });
    migration.up.yields(null);
    return migration;
  }

  function mockChangelogCollection() {
    return {
      insert: sinon.stub().yields()
    };
  }

  function loadUpWithInjectedMocks() {
    return proxyquire('../lib/actions/up', {
      './status': status,
      '../env/configFile': configFile,
      '../env/migrationsDir': migrationsDir
    });
  }

});
