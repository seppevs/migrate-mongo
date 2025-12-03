import migrationsDir from "../../lib/env/migrationsDir.js";
import config from "../../lib/env/config.js";
import status from "../../lib/actions/status.js";
import up from "../../lib/actions/up.js";

vi.mock("../../lib/actions/status");

describe("up", () => {
  let db;
  let client;
  let firstPendingMigration;
  let secondPendingMigration;
  let changelogCollection;
  let changelogLockCollection;

  function mockMigration() {
    const migration = {
      up: vi.fn().mockResolvedValue()
    };
    return migration;
  }

  function mockDb() {
    const mock = {
      collection: vi.fn((name) => {
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
      insertOne: vi.fn().mockResolvedValue()
    };
  }

  function mockChangelogLockCollection() {
    const findStub = {
      toArray: vi.fn().mockResolvedValue([])
    };

    return {
      insertOne: vi.fn().mockResolvedValue(),
      createIndex: vi.fn().mockResolvedValue(),
      find: vi.fn().mockReturnValue(findStub),
      deleteMany: vi.fn().mockResolvedValue(),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();

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

    vi.spyOn(config, 'shouldExist').mockResolvedValue();
    vi.spyOn(config, 'read').mockReturnValue({
      changelogCollectionName: "changelog",
      lockCollectionName: "changelog_lock",
      lockTtl: 10
    });

    vi.spyOn(migrationsDir, 'loadMigration')
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
    expect(migrationsDir.loadMigration).toHaveBeenNthCalledWith(
      1,
      "20160607173840-first_pending_migration.js"
    );
    expect(migrationsDir.loadMigration).toHaveBeenNthCalledWith(
      2,
      "20160608060209-second_pending_migration.js"
    );
  });

  it("should upgrade all pending migrations in ascending order", async () => {
    await up(db);
    expect(firstPendingMigration.up).toHaveBeenCalled();
    expect(secondPendingMigration.up).toHaveBeenCalled();
    // Verify second was called after first
    expect(secondPendingMigration.up).toHaveBeenCalledAfter(firstPendingMigration.up);
  });

  it("should populate the changelog with info about the upgraded migrations", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2016-06-09T08:07:00.077Z"));
    
    await up(db);

    expect(changelogCollection.insertOne).toHaveBeenCalledTimes(2);
    expect(changelogCollection.insertOne).toHaveBeenNthCalledWith(1, {
      appliedAt: new Date("2016-06-09T08:07:00.077Z"),
      fileName: "20160607173840-first_pending_migration.js",
      migrationBlock: 1465459620077
    });
    
    vi.useRealTimers();
  });

  it("should populate the changelog with info about the upgraded migrations (using file hash)", async () => {
    vi.spyOn(config, 'read').mockReturnValue({
      changelogCollectionName: "changelog",
      lockCollectionName: "changelog_lock",
      lockTtl: 0,
      useFileHash: true,
    });
    changelogLockCollection.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ createdAt: new Date() }])
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2016-06-09T08:07:00.077Z"));
    
    await up(db);

    expect(changelogCollection.insertOne).toHaveBeenCalledTimes(2);
    expect(changelogCollection.insertOne).toHaveBeenNthCalledWith(1, {
      appliedAt: new Date("2016-06-09T08:07:00.077Z"),
      "fileHash": undefined,
      fileName: "20160607173840-first_pending_migration.js",
      migrationBlock: 1465459620077
    });
    
    vi.useRealTimers();
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
    vi.spyOn(config, 'read').mockReturnValue({
      changelogCollectionName: "changelog",
      lockCollectionName: "changelog_lock",
      lockTtl: 0
    });
    changelogLockCollection.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ createdAt: new Date() }])
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
      toArray: vi.fn().mockResolvedValue([{ createdAt: new Date() }])
    });
    
    await expect(up(db)).rejects.toThrow("Could not migrate up, a lock is in place.");
  });
});
