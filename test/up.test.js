const { expect } = require("chai");
const sinon = require("sinon");

const proxyquire = require("proxyquire");

describe("up", () => {
  let up;
  let status;
  let configFile;
  let migrationsDir;
  let beforeDir;
  let afterDir;
  let db;

  let firstAppliedBefore;
  let firstPendingBefore;
  let firstPendingMigration;
  let secondPendingMigration;
  let firstAppliedAfter;
  let firstPendingAfter;
  let changelogCollection;

  function mockStatus() {
    return sinon.stub().returns(
      Promise.resolve([
        {
          type: "ALWAYS_BEFORE",
          fileName: "20160605123224-first_applied_before.js",
          appliedAt: new Date()
        },
        {
          type: "ALWAYS_BEFORE",
          fileName: "20160607173840-first_pending_before.js",
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
        },
        {
          type: "ALWAYS_AFTER",
          fileName: "20160605123224-first_applied_after.js",
          appliedAt: new Date()
        },
        {
          type: "ALWAYS_AFTER",
          fileName: "20160607173840-first_pending_after.js",
          appliedAt: "PENDING"
        },
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

  function mockBeforeDir() {
    const mock = {};
    mock.loadMigration = sinon.stub();
    mock.loadMigration
      .withArgs("20160605123224-first_applied_before.js")
      .returns(Promise.resolve(firstAppliedBefore));
    mock.loadMigration
      .withArgs("20160607173840-first_pending_before.js")
      .returns(Promise.resolve(firstPendingBefore));
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

  function mockAfterDir() {
    const mock = {};
    mock.loadMigration = sinon.stub();
    mock.loadMigration
      .withArgs("20160605123224-first_applied_after.js")
      .returns(Promise.resolve(firstAppliedAfter));
    mock.loadMigration
      .withArgs("20160607173840-first_pending_after.js")
      .returns(Promise.resolve(firstPendingAfter));
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
      "../env/beforeDir": beforeDir,
      "../env/migrationsDir": migrationsDir,
      "../env/afterDir": afterDir,
    });
  }

  beforeEach(() => {
    firstAppliedBefore = mockMigration();
    firstPendingBefore = mockMigration();
    firstPendingMigration = mockMigration();
    secondPendingMigration = mockMigration();
    firstAppliedAfter = mockMigration();
    firstPendingAfter = mockMigration();
    changelogCollection = mockChangelogCollection();

    status = mockStatus();
    configFile = mockConfigFile();
    beforeDir = mockBeforeDir();
    migrationsDir = mockMigrationsDir();
    afterDir = mockAfterDir();
    db = mockDb();

    up = loadUpWithInjectedMocks();
  });

  it("should fetch the status", async () => {
    await up(db);
    expect(status.called).to.equal(true);
  });

  it("should load all the pending before scripts", async () => {
    await up(db);
    expect(beforeDir.loadMigration.called).to.equal(true);
    expect(beforeDir.loadMigration.callCount).to.equal(2);
    expect(beforeDir.loadMigration.getCall(0).args[0]).to.equal(
      "20160605123224-first_applied_before.js"
    );
    expect(beforeDir.loadMigration.getCall(1).args[0]).to.equal(
      "20160607173840-first_pending_before.js"
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

  it("should load all the pending after scripts", async () => {
    await up(db);
    expect(afterDir.loadMigration.called).to.equal(true);
    expect(afterDir.loadMigration.callCount).to.equal(2);
    expect(afterDir.loadMigration.getCall(0).args[0]).to.equal(
      "20160605123224-first_applied_after.js"
    );
    expect(afterDir.loadMigration.getCall(1).args[0]).to.equal(
      "20160607173840-first_pending_after.js"
    );
  });

  it("should upgrade all operations in ascending order", async () => {
    await up(db);
    expect(firstAppliedBefore.up.called).to.equal(true);
    expect(firstPendingBefore.up.called).to.equal(true);
    expect(firstPendingMigration.up.called).to.equal(true);
    expect(secondPendingMigration.up.called).to.equal(true);
    expect(firstAppliedAfter.up.called).to.equal(true);
    expect(firstPendingAfter.up.called).to.equal(true);
    sinon.assert.callOrder(firstAppliedBefore.up, firstPendingBefore.up, 
      firstPendingMigration.up, secondPendingMigration.up, firstAppliedAfter.up, firstPendingAfter.up);
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
    expect(changelogCollection.insertOne.callCount).to.equal(6);
    expect(changelogCollection.insertOne.getCall(0).args[0]).to.deep.equal({
      appliedAt: new Date("2016-06-09T08:07:00.077Z"),
      fileName: "20160605123224-first_applied_before.js"
    });
    clock.restore();
  });

  it("should yield a list of upgraded migration file names", async () => {
    const upgradedFileNames = await up(db);
    expect(upgradedFileNames).to.deep.equal([
      "20160605123224-first_applied_before.js",
      "20160607173840-first_pending_before.js",
      "20160607173840-first_pending_migration.js",
      "20160608060209-second_pending_migration.js",
      "20160605123224-first_applied_after.js",
      "20160607173840-first_pending_after.js",
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
