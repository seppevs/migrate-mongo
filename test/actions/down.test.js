import migrationsDir from "../../lib/env/migrationsDir.js";
import config from "../../lib/env/config.js";
import status from "../../lib/actions/status.js";
import down from "../../lib/actions/down.js";

vi.mock("../../lib/actions/status");

describe("down", () => {
  let db;
  let client;
  let migration;
  let changelogCollection;
  let changelogLockCollection;

  function mockMigration() {
    const theMigration = {
      down: vi.fn().mockResolvedValue()
    };
    return theMigration;
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
      deleteOne: vi.fn().mockResolvedValue()
    };
  }

  function mockChangelogLockCollection() {
    return {
      updateOne: vi.fn().mockResolvedValue({ upsertedCount: 1 }),
      createIndex: vi.fn().mockResolvedValue(),
      deleteOne: vi.fn().mockResolvedValue(),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();

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

    vi.spyOn(config, 'shouldExist').mockResolvedValue();
    vi.spyOn(config, 'read').mockReturnValue({
      changelogCollectionName: "changelog",
      lockCollectionName: "changelog_lock",
      lockTtl: 10
    });

    vi.spyOn(migrationsDir, 'loadMigration').mockResolvedValue(migration);
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
    expect(migrationsDir.loadMigration).toHaveBeenCalledWith(
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
    expect(changelogLockCollection.updateOne).toHaveBeenCalled();
    expect(changelogLockCollection.deleteOne).toHaveBeenCalled();
  });

  it("should ignore lock if feature is disabled", async() => {
    vi.spyOn(config, 'read').mockReturnValue({
      changelogCollectionName: "changelog",
      lockCollectionName: "changelog_lock",
      lockTtl: 0
    });

    await down(db);
    expect(changelogLockCollection.createIndex).not.toHaveBeenCalled();
    expect(changelogLockCollection.updateOne).not.toHaveBeenCalled();
    expect(changelogLockCollection.deleteOne).not.toHaveBeenCalled();
  });

  it("should yield an error when unable to create a lock", async() => {
    changelogLockCollection.updateOne.mockRejectedValue(new Error("Kernel panic"));

    await expect(down(db)).rejects.toThrow("Could not create a lock: Kernel panic");
  });

  it("should yield an error when changelog is locked", async() => {
    changelogLockCollection.updateOne.mockResolvedValue({ upsertedCount: 0 });

    await expect(down(db)).rejects.toThrow("Could not migrate down, a lock is in place.");
  });

  it("should yield an error when changelog is locked due to a concurrent acquire (E11000)", async() => {
    const dupKeyError = new Error("E11000 duplicate key error");
    dupKeyError.code = 11000;
    changelogLockCollection.updateOne.mockRejectedValue(dupKeyError);

    await expect(down(db)).rejects.toThrow("Could not migrate down, a lock is in place.");
  });
});
