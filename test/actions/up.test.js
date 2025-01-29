const { expect } = require("chai");
const sinon = require("sinon");

const proxyquire = require("proxyquire");

describe("up", () => {
  let up;
  let status;
  let config;
  let lock;
  let migrationsDir;
  let db;
  let client;

  let firstPendingMigration;
  let secondPendingMigration;
  let changelogCollection;
  let changelogLockCollection;

  function mockStatus() {
    return sinon.stub().returns(
      Promise.resolve([
        {
          fileName: "20160605123224-first_applied_migration.js",
          appliedAt: new Date()
        },
        {
          fileName: "20160606093207-second_applied_migration.js",
          appliedAt: new Date()
        },
        {
          fileName: "20160607173840-first_pending_migration.js",
          appliedAt: "PENDING"
        },
        {
          fileName: "20160608060209-second_pending_migration.js",
          appliedAt: "PENDING"
        }
      ])
    );
  }

  function mockConfig() {
    return {
      shouldExist: sinon.stub().returns(Promise.resolve()),
      read: sinon.stub().returns({
        changelogCollectionName: "changelog",
        lockCollectionName: "changelog_lock",
        lockTtl: 10
      })
    };
  }

  function mockMigrationsDir() {
    const mock = {};
    mock.loadMigration = sinon.stub();
    mock.loadMigration
      .withArgs("20160607173840-first_pending_migration.js")
      .returns(Promise.resolve(firstPendingMigration));
    mock.loadMigration
      .withArgs("20160608060209-second_pending_migration.js")
      .returns(Promise.resolve(secondPendingMigration));
    return mock;
  }

  function mockDb() {
    const mock = {};
    mock.collection = sinon.stub();
    mock.collection.withArgs("changelog").returns(changelogCollection);
    mock.collection.withArgs("changelog_lock").returns(changelogLockCollection);
    return mock;
  }

  function mockClient() {
    return { the: 'client' };
  }

  function mockMigration() {
    const migration = {
      up: sinon.stub()
    };
    migration.up.returns(Promise.resolve());
    return migration;
  }

  function mockChangelogCollection() {
    return {
      insertOne: sinon.stub().returns(Promise.resolve())
    };
  }

  function mockChangelogLockCollection() {
    const findStub = {
      toArray: () => {
        return [];
      }
    }

    return {
      insertOne: sinon.stub().returns(Promise.resolve()),
      createIndex: sinon.stub().returns(Promise.resolve()),
      find: sinon.stub().returns(findStub),
      deleteMany: sinon.stub().returns(Promise.resolve()),
    }
  }

  function loadUpWithInjectedMocks() {
    return proxyquire("../../lib/actions/up", {
      "./status": status,
      "../env/config": config,
      "../env/migrationsDir": migrationsDir,
      "../utils/lock": lock
    });
  }

  function loadLockWithInjectedMocks() {
    return proxyquire("../../lib/utils/lock", {
      "../env/config": config
    });
  }

  beforeEach(() => {
    firstPendingMigration = mockMigration();
    secondPendingMigration = mockMigration();
    changelogCollection = mockChangelogCollection();
    changelogLockCollection = mockChangelogLockCollection();

    status = mockStatus();
    config = mockConfig();
    migrationsDir = mockMigrationsDir();
    db = mockDb();
    client = mockClient();

    lock = loadLockWithInjectedMocks();
    up = loadUpWithInjectedMocks();
  });

  it("should fetch the status", async () => {
    await up(db);
    expect(status.called).to.equal(true);
  });

  it("should load all the pending migrations", async () => {
    await up(db);
    expect(migrationsDir.loadMigration.called).to.equal(true);
    expect(migrationsDir.loadMigration.callCount).to.equal(2);
    expect(migrationsDir.loadMigration.getCall(0).args[0]).to.equal(
      "20160607173840-first_pending_migration.js"
    );
    expect(migrationsDir.loadMigration.getCall(1).args[0]).to.equal(
      "20160608060209-second_pending_migration.js"
    );
  });

  it("should upgrade all pending migrations in ascending order", async () => {
    await up(db);
    expect(firstPendingMigration.up.called).to.equal(true);
    expect(secondPendingMigration.up.called).to.equal(true);
    sinon.assert.callOrder(firstPendingMigration.up, secondPendingMigration.up);
  });

  it("should be able to upgrade callback based migration that has both the `db` and `client` args", async () => {
    firstPendingMigration = {
      up(theDb, theClient, callback) {
        return callback();
      }
    };
    migrationsDir = mockMigrationsDir();
    up = loadUpWithInjectedMocks();
    await up(db, client);
  });

  it("should be able to upgrade callback based migration that has only the `db` arg", async () => {
    firstPendingMigration = {
      up(theDb, callback) {
        return callback();
      }
    };
    migrationsDir = mockMigrationsDir();
    up = loadUpWithInjectedMocks();
    await up(db, client);
  });

  it("should populate the changelog with info about the upgraded migrations", async () => {
    const clock = sinon.useFakeTimers(
      new Date("2016-06-09T08:07:00.077Z").getTime()
    );
    await up(db);

    expect(changelogCollection.insertOne.called).to.equal(true);
    expect(changelogCollection.insertOne.callCount).to.equal(2);
    expect(changelogCollection.insertOne.getCall(0).args[0]).to.deep.equal({
      appliedAt: new Date("2016-06-09T08:07:00.077Z"),
      fileName: "20160607173840-first_pending_migration.js",
      migrationBlock: 1465459620077
    });
    clock.restore();
  });

  it("should populate the changelog with info about the upgraded migrations (using file hash)", async () => {
    config.read = sinon.stub().returns({
      changelogCollectionName: "changelog",
      lockCollectionName: "changelog_lock",
      lockTtl: 0,
      useFileHash: true,
    });
    const findStub = {
      toArray: () => {
        return [{ createdAt: new Date() }];
      }
    }
    changelogLockCollection.find.returns(findStub);

    const clock = sinon.useFakeTimers(
      new Date("2016-06-09T08:07:00.077Z").getTime()
    );
    await up(db);

    expect(changelogCollection.insertOne.called).to.equal(true);
    expect(changelogCollection.insertOne.callCount).to.equal(2);
    expect(changelogCollection.insertOne.getCall(0).args[0]).to.deep.equal({
      appliedAt: new Date("2016-06-09T08:07:00.077Z"),
      "fileHash": undefined,
      fileName: "20160607173840-first_pending_migration.js",
      migrationBlock: 1465459620077
    });
    clock.restore();
  });

  it("should yield a list of upgraded migration file names", async () => {
    const upgradedFileNames = await up(db);
    expect(upgradedFileNames).to.deep.equal([
      "20160607173840-first_pending_migration.js",
      "20160608060209-second_pending_migration.js"
    ]);
  });

  it("should stop migrating when an error occurred and yield the error", async () => {
    secondPendingMigration.up.returns(Promise.reject(new Error("Nope")));
    try {
      await up(db);
      expect.fail("Error was not thrown");
    } catch (err) {
      expect(err.message).to.deep.equal(
        "Could not migrate up 20160608060209-second_pending_migration.js: Nope"
      );
    }
  });

  it("should yield an error + items already migrated when unable to update the changelog", async () => {
    changelogCollection.insertOne
      .onSecondCall()
      .returns(Promise.reject(new Error("Kernel panic")));
    try {
      await up(db);
      expect.fail("Error was not thrown");
    } catch (err) {
      expect(err.message).to.deep.equal(
        "Could not update changelog: Kernel panic"
      );
    }
  });

  it("should lock if feature is enabled", async() => {
    await up(db);
    expect(changelogLockCollection.createIndex.called).to.equal(true);
    expect(changelogLockCollection.find.called).to.equal(true);
    expect(changelogLockCollection.insertOne.called).to.equal(true);
    expect(changelogLockCollection.deleteMany.called).to.equal(true);
  });

  it("should ignore lock if feature is disabled", async() => {
    config.read = sinon.stub().returns({
      changelogCollectionName: "changelog",
      lockCollectionName: "changelog_lock",
      lockTtl: 0
    });
    const findStub = {
      toArray: () => {
        return [{ createdAt: new Date() }];
      }
    }
    changelogLockCollection.find.returns(findStub);

    await up(db);
    expect(changelogLockCollection.createIndex.called).to.equal(false);
    expect(changelogLockCollection.find.called).to.equal(false);
    expect(changelogLockCollection.insertOne.called).to.equal(false);
    expect(changelogLockCollection.deleteMany.called).to.equal(false);
  });

  it("should yield an error when unable to create a lock", async() => {
    changelogLockCollection.insertOne.returns(Promise.reject(new Error("Kernel panic")));

    try {
      await up(db);
      expect.fail("Error was not thrown");
    } catch (err) {
      expect(err.message).to.deep.equal(
        "Could not create a lock: Kernel panic"
      );
    }
  });

  it("should yield an error when changelog is locked", async() => {
    const findStub = {
      toArray: () => {
        return [{ createdAt: new Date() }];
      }
    }
    changelogLockCollection.find.returns(findStub);
    
    try {
      await up(db);
      expect.fail("Error was not thrown");
    } catch (err) {
      expect(err.message).to.deep.equal(
        "Could not migrate up, a lock is in place."
      );
    }
  });
});
