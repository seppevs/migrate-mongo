const { expect } = require("chai");
const sinon = require("sinon");

const proxyquire = require("proxyquire");

describe("up", () => {
  let up;
  let status;
  let configFile;
  let migrationsDir;
  let alwaysDir;
  let db;

  let firstAppliedAlways;
  let firstPendingAlways;
  let firstPendingMigration;
  let secondPendingMigration;
  let changelogCollection;

  function mockStatus() {
    return sinon.stub().returns(
      Promise.resolve([
        {
          type: "ALWAYS",
          fileName: "20160605123224-first_applied_always.js",
          appliedAt: new Date()
        },
        {
          type: "ALWAYS",
          fileName: "20160607173840-first_pending_always.js",
          appliedAt: "PENDING"
        },
        {
          type: "MIGRATION",
          fileName: "20160605123224-first_applied_migration.js",
          appliedAt: new Date()
        },
        {
          type: "MIGRATION",
          fileName: "20160606093207-second_applied_migration.js",
          appliedAt: new Date()
        },
        {
          type: "MIGRATION",
          fileName: "20160607173840-first_pending_migration.js",
          appliedAt: "PENDING"
        },
        {
          type: "MIGRATION",
          fileName: "20160608060209-second_pending_migration.js",
          appliedAt: "PENDING"
        }
      ])
    );
  }

  function mockConfigFile() {
    return {
      shouldExist: sinon.stub().returns(Promise.resolve()),
      read: sinon.stub().returns({
        changelogCollectionName: "changelog"
      })
    };
  }

  function mockAlwaysDir() {
    const mock = {};
    mock.loadMigration = sinon.stub();
    mock.loadMigration
      .withArgs("20160605123224-first_applied_always.js")
      .returns(Promise.resolve(firstAppliedAlways));
    mock.loadMigration
      .withArgs("20160607173840-first_pending_always.js")
      .returns(Promise.resolve(firstPendingAlways));
    return mock;
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
    return mock;
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

  function loadUpWithInjectedMocks() {
    return proxyquire("../lib/actions/up", {
      "./status": status,
      "../env/configFile": configFile,
      "../env/alwaysDir": alwaysDir,
      "../env/migrationsDir": migrationsDir
    });
  }

  beforeEach(() => {
    firstAppliedAlways = mockMigration();
    firstPendingAlways = mockMigration();
    firstPendingMigration = mockMigration();
    secondPendingMigration = mockMigration();
    changelogCollection = mockChangelogCollection();

    status = mockStatus();
    configFile = mockConfigFile();
    alwaysDir = mockAlwaysDir();
    migrationsDir = mockMigrationsDir();
    db = mockDb();

    up = loadUpWithInjectedMocks();
  });

  it("should fetch the status", async () => {
    await up(db);
    expect(status.called).to.equal(true);
  });

  it("should load all the pending always scripts", async () => {
    await up(db);
    expect(alwaysDir.loadMigration.called).to.equal(true);
    expect(alwaysDir.loadMigration.callCount).to.equal(2);
    expect(alwaysDir.loadMigration.getCall(0).args[0]).to.equal(
      "20160605123224-first_applied_always.js"
    );
    expect(alwaysDir.loadMigration.getCall(1).args[0]).to.equal(
      "20160607173840-first_pending_always.js"
    );
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

  it("should upgrade all operations in ascending order", async () => {
    await up(db);
    expect(firstAppliedAlways.up.called).to.equal(true);
    expect(firstPendingAlways.up.called).to.equal(true);
    expect(firstPendingMigration.up.called).to.equal(true);
    expect(secondPendingMigration.up.called).to.equal(true);
    sinon.assert.callOrder(firstAppliedAlways.up, firstPendingAlways.up, firstPendingMigration.up, secondPendingMigration.up);
  });

  it("should be able to upgrade callback based migration", async () => {
    firstPendingMigration = {
      up(theDb, callback) {
        return callback();
      }
    };
    migrationsDir = mockMigrationsDir();
    up = loadUpWithInjectedMocks();
    await up(db);
  });

  it("should populate the changelog with info about the upgraded migrations", async () => {
    const clock = sinon.useFakeTimers(
      new Date("2016-06-09T08:07:00.077Z").getTime()
    );
    await up(db);

    expect(changelogCollection.insertOne.called).to.equal(true);
    expect(changelogCollection.insertOne.callCount).to.equal(4);
    expect(changelogCollection.insertOne.getCall(0).args[0]).to.deep.equal({
      appliedAt: new Date("2016-06-09T08:07:00.077Z"),
      fileName: "20160605123224-first_applied_always.js"
    });
    clock.restore();
  });

  it("should yield a list of upgraded migration file names", async () => {
    const upgradedFileNames = await up(db);
    expect(upgradedFileNames).to.deep.equal([
      "20160605123224-first_applied_always.js",
      "20160607173840-first_pending_always.js",
      "20160607173840-first_pending_migration.js",
      "20160608060209-second_pending_migration.js"
    ]);
  });

  // TODO this test first also had a list of migrated files (on error), review !
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
});
