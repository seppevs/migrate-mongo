jest.mock("../../lib/actions/status", () => jest.fn());

const migrationsDir = require("../../lib/env/migrationsDir");
const config = require("../../lib/env/config");
const status = require("../../lib/actions/status");
const up = require("../../lib/actions/up");

describe("up", () => {
  let db;
  let client;
  let firstPendingMigration;
  let secondPendingMigration;
  let changelogCollection;
  let changelogLockCollection;

  function mockMigration() {
    const migration = {
      up: jest.fn().mockResolvedValue()
    };
    return migration;
  }

  function mockDb() {
    const mock = {
      collection: jest.fn((name) => {
        if (name === "changelog") return changelogCollection;
        if (name === "changelog_lock") return changelogLockCollection;
        return null;
      })
    };
    return mock;
  }

  function mockClient() {
    return { the: 'client' };
  }

  function mockChangelogCollection() {
    return {
      insertOne: jest.fn().mockResolvedValue()
    };
  }

  function mockChangelogLockCollection() {
    const findStub = {
      toArray: jest.fn().mockResolvedValue([])
    };

    return {
      insertOne: jest.fn().mockResolvedValue(),
      createIndex: jest.fn().mockResolvedValue(),
      find: jest.fn().mockReturnValue(findStub),
      deleteMany: jest.fn().mockResolvedValue(),
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();

    firstPendingMigration = mockMigration();
    secondPendingMigration = mockMigration();
    changelogCollection = mockChangelogCollection();
    changelogLockCollection = mockChangelogLockCollection();
    db = mockDb();
    client = mockClient();

    status.mockResolvedValue([
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
    ]);

    jest.spyOn(config, 'shouldExist').mockResolvedValue();
    jest.spyOn(config, 'read').mockReturnValue({
      changelogCollectionName: "changelog",
      lockCollectionName: "changelog_lock",
      lockTtl: 10
    });

    jest.spyOn(migrationsDir, 'loadMigration')
      .mockImplementation((fileName) => {
        if (fileName === "20160607173840-first_pending_migration.js") {
          return Promise.resolve(firstPendingMigration);
        }
        if (fileName === "20160608060209-second_pending_migration.js") {
          return Promise.resolve(secondPendingMigration);
        }
        return Promise.resolve(mockMigration());
      });
  });

  it("should fetch the status", async () => {
    await up(db);
    expect(status).toHaveBeenCalled();
  });

  it("should load all the pending migrations", async () => {
    await up(db);
    expect(migrationsDir.loadMigration).toHaveBeenCalled();
    expect(migrationsDir.loadMigration).toHaveBeenCalledTimes(2);
    expect(migrationsDir.loadMigration.mock.calls[0][0]).toBe(
      "20160607173840-first_pending_migration.js"
    );
    expect(migrationsDir.loadMigration.mock.calls[1][0]).toBe(
      "20160608060209-second_pending_migration.js"
    );
  });

  it("should upgrade all pending migrations in ascending order", async () => {
    await up(db);
    expect(firstPendingMigration.up).toHaveBeenCalled();
    expect(secondPendingMigration.up).toHaveBeenCalled();
    // Check call order
    const firstCallOrder = firstPendingMigration.up.mock.invocationCallOrder[0];
    const secondCallOrder = secondPendingMigration.up.mock.invocationCallOrder[0];
    expect(firstCallOrder).toBeLessThan(secondCallOrder);
  });

  it("should populate the changelog with info about the upgraded migrations", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2016-06-09T08:07:00.077Z"));
    
    await up(db);

    expect(changelogCollection.insertOne).toHaveBeenCalled();
    expect(changelogCollection.insertOne).toHaveBeenCalledTimes(2);
    expect(changelogCollection.insertOne.mock.calls[0][0]).toEqual({
      appliedAt: new Date("2016-06-09T08:07:00.077Z"),
      fileName: "20160607173840-first_pending_migration.js",
      migrationBlock: 1465459620077
    });
    
    jest.useRealTimers();
  });

  it("should populate the changelog with info about the upgraded migrations (using file hash)", async () => {
    jest.spyOn(config, 'read').mockReturnValue({
      changelogCollectionName: "changelog",
      lockCollectionName: "changelog_lock",
      lockTtl: 0,
      useFileHash: true,
    });
    changelogLockCollection.find.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([{ createdAt: new Date() }])
    });

    jest.useFakeTimers();
    jest.setSystemTime(new Date("2016-06-09T08:07:00.077Z"));
    
    await up(db);

    expect(changelogCollection.insertOne).toHaveBeenCalled();
    expect(changelogCollection.insertOne).toHaveBeenCalledTimes(2);
    expect(changelogCollection.insertOne.mock.calls[0][0]).toEqual({
      appliedAt: new Date("2016-06-09T08:07:00.077Z"),
      "fileHash": undefined,
      fileName: "20160607173840-first_pending_migration.js",
      migrationBlock: 1465459620077
    });
    
    jest.useRealTimers();
  });

  it("should yield a list of upgraded migration file names", async () => {
    const upgradedFileNames = await up(db);
    expect(upgradedFileNames).toEqual([
      "20160607173840-first_pending_migration.js",
      "20160608060209-second_pending_migration.js"
    ]);
  });

  it("should stop migrating when an error occurred and yield the error", async () => {
    secondPendingMigration.up.mockRejectedValue(new Error("Nope"));
    
    await expect(up(db)).rejects.toThrow(
      "Could not migrate up 20160608060209-second_pending_migration.js: Nope"
    );
  });

  it("should include errInfo as additionalInfo when MongoDB error has it", async () => {
    const mongoError = new Error("Document failed validation");
    mongoError.errInfo = {
      failingDocumentId: "66d1826cb0fcad2724e40e14",
      details: {
        operatorName: "$jsonSchema",
        schemaRulesNotSatisfied: [{ operatorName: "required" }]
      }
    };
    secondPendingMigration.up.mockRejectedValue(mongoError);
    
    try {
      await up(db);
      throw new Error("Error was not thrown");
    } catch (err) {
      expect(err.message).toBe(
        "Could not migrate up 20160608060209-second_pending_migration.js: Document failed validation"
      );
      expect(err.additionalInfo).toEqual(mongoError.errInfo);
    }
  });

  it("should yield an error + items already migrated when unable to update the changelog", async () => {
    changelogCollection.insertOne
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error("Kernel panic"));
    
    await expect(up(db)).rejects.toThrow("Could not update changelog: Kernel panic");
  });

  it("should lock if feature is enabled", async() => {
    await up(db);
    expect(changelogLockCollection.createIndex).toHaveBeenCalled();
    expect(changelogLockCollection.find).toHaveBeenCalled();
    expect(changelogLockCollection.insertOne).toHaveBeenCalled();
    expect(changelogLockCollection.deleteMany).toHaveBeenCalled();
  });

  it("should ignore lock if feature is disabled", async() => {
    jest.spyOn(config, 'read').mockReturnValue({
      changelogCollectionName: "changelog",
      lockCollectionName: "changelog_lock",
      lockTtl: 0
    });
    changelogLockCollection.find.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([{ createdAt: new Date() }])
    });

    await up(db);
    expect(changelogLockCollection.createIndex).not.toHaveBeenCalled();
    expect(changelogLockCollection.find).not.toHaveBeenCalled();
    expect(changelogLockCollection.insertOne).not.toHaveBeenCalled();
    expect(changelogLockCollection.deleteMany).not.toHaveBeenCalled();
  });

  it("should yield an error when unable to create a lock", async() => {
    changelogLockCollection.insertOne.mockRejectedValue(new Error("Kernel panic"));

    await expect(up(db)).rejects.toThrow("Could not create a lock: Kernel panic");
  });

  it("should yield an error when changelog is locked", async() => {
    changelogLockCollection.find.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([{ createdAt: new Date() }])
    });
    
    await expect(up(db)).rejects.toThrow("Could not migrate up, a lock is in place.");
  });
});
