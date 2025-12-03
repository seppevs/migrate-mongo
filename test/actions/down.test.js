jest.mock("../../lib/actions/status", () => jest.fn());

const migrationsDir = require("../../lib/env/migrationsDir");
const config = require("../../lib/env/config");
const status = require("../../lib/actions/status");
const down = require("../../lib/actions/down");

describe("down", () => {
  let db;
  let client;
  let migration;
  let changelogCollection;
  let changelogLockCollection;

  function mockMigration() {
    const theMigration = {
      down: jest.fn().mockResolvedValue()
    };
    return theMigration;
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
      deleteOne: jest.fn().mockResolvedValue()
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

    migration = mockMigration();
    changelogCollection = mockChangelogCollection();
    changelogLockCollection = mockChangelogLockCollection();
    db = mockDb();
    client = mockClient();

    status.mockResolvedValue([
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
    ]);

    jest.spyOn(config, 'shouldExist').mockResolvedValue();
    jest.spyOn(config, 'read').mockReturnValue({
      changelogCollectionName: "changelog",
      lockCollectionName: "changelog_lock",
      lockTtl: 10
    });

    jest.spyOn(migrationsDir, 'loadMigration').mockResolvedValue(migration);
  });

  it("should fetch the status", async () => {
    await down(db);
    expect(status).toHaveBeenCalled();
  });

  it("should yield empty list when nothing to downgrade", async () => {
    status.mockResolvedValue([
      { fileName: "20160609113224-some_migration.js", appliedAt: "PENDING" }
    ]);
    const migrated = await down(db);
    expect(migrated).toEqual([]);
  });

  it("should load the last applied migration", async () => {
    await down(db);
    expect(migrationsDir.loadMigration.mock.calls[0][0]).toBe(
      "20160609113225-last_migration.js"
    );
  });

  it("should downgrade the last applied migration", async () => {
    await down(db);
    expect(migration.down).toHaveBeenCalled();
  });

  it("should allow downgrade to return promise", async () => {
    await down(db);
    expect(migration.down).toHaveBeenCalled();
  });

  it("should yield an error when an error occurred during the downgrade", async () => {
    migration.down.mockRejectedValue(new Error("Invalid syntax"));
    
    await expect(down(db)).rejects.toThrow(
      "Could not migrate down 20160609113225-last_migration.js: Invalid syntax"
    );
  });

  it("should remove the entry of the downgraded migration from the changelog collection", async () => {
    await down(db);
    expect(changelogCollection.deleteOne).toHaveBeenCalled();
    expect(changelogCollection.deleteOne).toHaveBeenCalledTimes(1);
  });

  it("should yield errors that occurred when deleting from the changelog collection", async () => {
    changelogCollection.deleteOne.mockRejectedValue(new Error("Could not delete"));
    
    try {
      await down(db);
    } catch (err) {
      expect(err.message).toBe("Could not update changelog: Could not delete");
    }
  });

  it("should yield a list of downgraded items", async () => {
    const items = await down(db);
    expect(items).toEqual(["20160609113225-last_migration.js"]);
  });

  it("should rollback last migrations scripts of a same migration block", async () => {
    global.options = { block: true };
    const items = await down(db);
    expect(items).toEqual(["20160609113225-last_migration.js", "20160609113224-second_migration.js"]);
  });

  it("should lock if feature is enabled", async() => {
    await down(db);
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

    await down(db);
    expect(changelogLockCollection.createIndex).not.toHaveBeenCalled();
    expect(changelogLockCollection.find).not.toHaveBeenCalled();
  });

  it("should yield an error when unable to create a lock", async() => {
    changelogLockCollection.insertOne.mockRejectedValue(new Error("Kernel panic"));

    await expect(down(db)).rejects.toThrow("Could not create a lock: Kernel panic");
  });

  it("should yield an error when changelog is locked", async() => {
    changelogLockCollection.find.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([{ createdAt: new Date() }])
    });

    await expect(down(db)).rejects.toThrow("Could not migrate down, a lock is in place.");
  });
});
