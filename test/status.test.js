'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');

const proxyquire = require('proxyquire');

describe('status', function () {

  let status; // under test:
  let migrationsDir, configFile, fs, db; // mocked dependencies:
  let changelogCollection; // test data

  beforeEach(function () {
    changelogCollection = mockChangelogCollection();

    migrationsDir = mockMigrationsDir();
    configFile = mockConfigFile();
    fs = mockFs();
    db = mockDb();
    status = proxyquire('../lib/actions/status', {
      '../env/migrationsDir': migrationsDir,
      '../env/configFile': configFile,
      'fs-extra': fs
    });
  });

  it('should check that the migrations directory exists', function (done) {
    status(db, () => {
      expect(migrationsDir.shouldExist.called).to.equal(true);
      done();
    });
  });

  it('should yield an error when the migrations directory does not exist', function (done) {
    migrationsDir.shouldExist.yields(new Error('migrations directory does not exist'));
    status(db, (err) => {
      expect(err.message).to.equal('migrations directory does not exist');
      done();
    });
  });

  it('should check that the config file exists', function (done) {
    status(db, () => {
      expect(configFile.shouldExist.called).to.equal(true);
      done();
    });
  });

  it('should yield an error when config file does not exist', function (done) {
    configFile.shouldExist.yields(new Error('config file does not exist'));
    status(db, (err) => {
      expect(err.message).to.equal('config file does not exist');
      done();
    });
  });

  it('should get the list of files in the migrations directory', function (done) {
    status(db, () => {
      expect(migrationsDir.getFileNames.called).to.equal(true);
      done();
    });
  });

  it('should yield errors that occurred when getting the list of files in the migrations directory', function (done) {
    migrationsDir.getFileNames.yields(new Error('File system unavailable'));
    status(db, (err) => {
      expect(err.message).to.equal('File system unavailable');
      done();
    });
  });

  it('should fetch the content of the changelog collection', function (done) {
    status(db, () => {
      expect(changelogCollection.find.called).to.equal(true);
      expect(changelogCollection.find({}).toArray.called).to.equal(true);
      done();
    });
  });

  it('should yield errors that occurred when fetching the changelog collection', function (done) {
    changelogCollection.find({}).toArray.yields(new Error('Cannot read from the database'));
    status(db, (err) => {
      expect(err.message).to.equal('Cannot read from the database');
      done();
    });
  });

  it('should yield an array that indicates the status of the migrations in the directory', function (done) {
    status(db, (err, statusItems) => {
      expect(statusItems).to.deep.equal([
        {
          appliedAt: '2016-06-03T20:10:12.123Z',
          fileName: '20160509113224-first_migration.js'
        },
        {
          appliedAt: '2016-06-09T20:10:12.123Z',
          fileName: '20160512091701-second_migration.js'
        },
        {
          appliedAt: 'PENDING',
          fileName: '20160513155321-third_migration.js'
        }
      ]);
      done();
    });
  });

  function mockMigrationsDir() {
    return {
      shouldExist: sinon.stub().yields(),
      getFileNames: sinon.stub().yields(null, [
        '20160509113224-first_migration.js',
        '20160512091701-second_migration.js',
        '20160513155321-third_migration.js'
      ])
    };
  }

  function mockConfigFile() {
    return {
      shouldExist: sinon.stub().yields(),
      read: sinon.stub().returns({
        changelogCollectionName: 'changelog'
      })
    };
  }

  function mockFs() {
    return {
      copy: sinon.stub().yields()
    };
  }

  function mockDb() {
    const mock = {};
    mock.collection = sinon.stub();
    mock.collection.withArgs('changelog').returns(changelogCollection);
    return mock;
  }

  function mockChangelogCollection() {
    return {
      deleteOne: sinon.stub().yields(),
      find: sinon.stub().returns({
        toArray: sinon.stub().yields(null, [
          {fileName: '20160509113224-first_migration.js', appliedAt: new Date('2016-06-03T20:10:12.123Z')},
          {fileName: '20160512091701-second_migration.js', appliedAt: new Date('2016-06-09T20:10:12.123Z')}
        ])
      })
    };
  }

});