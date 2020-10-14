const { expect } = require("chai");
const sinon = require("sinon");

const proxyquire = require("proxyquire");

describe("down", () => {
  let down;
  let status;
  let config;
  let lock;
  let migrationsDir;
  let db;
  let client;
  let migration;
  let changelogCollection;
  let changelogLockCollection;

  function mockStatus() {
    return sinon.stub().returns(
      Promise.resolve([
        {
          fileName: "20160609113224-first_migration.js",
          appliedAt: new Date(),
        },
        {
          fileName: "20160609113224-second_migration.js",
          appliedAt: new Date(),
          migrationBlock: 1
        },
        {
          fileName: "20160609113225-last_migration.js",
          appliedAt: new Date(),
          migrationBlock: 1
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
    return {
      loadMigration: sinon.stub().returns(Promise.resolve(migration))
    };
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
    const theMigration = {
      down: sinon.stub()
    };
    theMigration.down.returns(Promise.resolve());
    return theMigration;
  }

  function mockChangelogCollection() {
    return {
      deleteOne: sinon.stub().returns(Promise.resolve())
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

  function loadDownWithInjectedMocks() {
    return proxyquire("../../lib/actions/down", {
      "./status": status,
      "../env/config": config,
      "../env/migrationsDir": migrationsDir,
      "../utils/lock": lock,
    });
  }

  function loadLockWithInjectedMocks() {
    return proxyquire("../../lib/utils/lock", {
      "../env/config": config
    });
  }

  beforeEach(() => {
    migration = mockMigration();
    changelogCollection = mockChangelogCollection();
    changelogLockCollection = mockChangelogLockCollection();

    status = mockStatus();
    config = mockConfig();
    migrationsDir = mockMigrationsDir();
    db = mockDb();
    client = mockClient();

    lock = loadLockWithInjectedMocks();
    down = loadDownWithInjectedMocks();
  });

  it("should fetch the status", async () => {
    await down(db);
    expect(status.called).to.equal(true);
  });

  it("should yield empty list when nothing to downgrade", async () => {
    status.returns(
      Promise.resolve([
        { fileName: "20160609113224-some_migration.js", appliedAt: "PENDING" }
      ])
    );
    const migrated = await down(db);
    expect(migrated).to.deep.equal([]);
  });

  it("should load the last applied migration", async () => {
    await down(db);
    expect(migrationsDir.loadMigration.getCall(0).args[0]).to.equal(
      "20160609113225-last_migration.js"
    );
  });

  it("should downgrade the last applied migration", async () => {
    await down(db);
    expect(migration.down.called).to.equal(true);
  });

  it("should be able to downgrade callback based migration that has both the `db` and `client` arguments", async () => {
    migration = {
      down(theDb, theClient, callback) {
        return callback();
      }
    };
    migrationsDir = mockMigrationsDir();
    down = loadDownWithInjectedMocks();
    await down(db, client);
  });

  it("should be able to downgrade callback based migration that has only the `db` argument", async () => {
    migration = {
      down(theDb, callback) {
        return callback();
      }
    };
    migrationsDir = mockMigrationsDir();
    down = loadDownWithInjectedMocks();
    await down(db);
  });

  /* eslint no-unused-vars: "off" */
  it("should allow downgrade to return promise", async () => {
    migrationsDir = mockMigrationsDir();
    down = loadDownWithInjectedMocks();
    await down(db);
    expect(migration.down.called).to.equal(true);
  });

  it("should yield an error when an error occurred during the downgrade", async () => {
    migration.down.returns(Promise.reject(new Error("Invalid syntax")));
    try {
      await down(db);
      expect.fail("Error was not thrown");
    } catch (err) {
      expect(err.message).to.equal(
        "Could not migrate down 20160609113225-last_migration.js: Invalid syntax"
      );
    }
  });

  it("should remove the entry of the downgraded migration from the changelog collection", async () => {
    await down(db);
    expect(changelogCollection.deleteOne.called).to.equal(true);
    expect(changelogCollection.deleteOne.callCount).to.equal(1);
  });

  it("should yield errors that occurred when deleting from the changelog collection", async () => {
    changelogCollection.deleteOne.returns(
      Promise.reject(new Error("Could not delete"))
    );
    try {
      await down(db);
    } catch (err) {
      expect(err.message).to.equal(
        "Could not update changelog: Could not delete"
      );
    }
  });

  it("should yield a list of downgraded items", async () => {
    const items = await down(db);
    expect(items).to.deep.equal(["20160609113225-last_migration.js"]);
  });

  it("should rollback last migrations scripts of a same migration block", async () => {
    global.options = { block: true };
    const items = await down(db);
    expect(items).to.deep.equal(["20160609113225-last_migration.js", "20160609113224-second_migration.js"]);
  });

  it("should lock if feature is enabled", async() => {
    await down(db);
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

    await down(db);
    expect(changelogLockCollection.createIndex.called).to.equal(false);
    expect(changelogLockCollection.find.called).to.equal(false);
  });

  it("should yield an error when unable to create a lock", async() => {
    changelogLockCollection.insertOne.returns(Promise.reject(new Error("Kernel panic")));

    try {
      await down(db);
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
      await down(db);
      expect.fail("Error was not thrown");
    } catch (err) {
      expect(err.message).to.deep.equal(
        "Could not migrate down, a lock is in place."
      );
    }
  });
});
