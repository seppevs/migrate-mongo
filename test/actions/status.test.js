vi.mock("fs/promises");

import migrationsDir from "../../lib/env/migrationsDir.js";
import config from "../../lib/env/config.js";
import status from "../../lib/actions/status.js";

describe("status", () => {
  let db;
  let changelogCollection;

  const defaultLoadFileHashImpl = (fileName) => {
    switch (fileName) {
      case "20160509113224-first_migration.js":
        return Promise.resolve("0f295f21f63c66dc78d8dc091ce3c8bab8c56d8b74fb35a0c99f6d9953e37d1a");
      case "20160512091701-second_migration.js":
        return Promise.resolve("18b4d9c95a8678ae3a6dd3ae5b8961737a6c3dd65e3e655a5f5718d97a0bff70");
      case "20160513155321-third_migration.js":
        return Promise.resolve("1f9eb3b5eb70b2fb5b83fa0c660d859082f0bb615e835d29943d26fb0d352022");
      default:
        return Promise.resolve();
    }
  };

  function mockDb() {
    const mock = {};
    mock.collection = vi.fn((name) => {
      if (name === "changelog") return changelogCollection;
      return null;
    });
    return mock;
  }

  function mockChangelogCollection() {
    return {
      deleteOne: vi.fn().mockResolvedValue(),
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          {
            fileName: "20160509113224-first_migration.js",
            appliedAt: new Date("2016-06-03T20:10:12.123Z")
          },
          {
            fileName: "20160512091701-second_migration.js",
            appliedAt: new Date("2016-06-09T20:10:12.123Z")
          }
        ])
      })
    };
  }

  function enabledFileHash() {
    vi.spyOn(config, 'read').mockReturnValue({
      changelogCollectionName: "changelog",
      useFileHash: true
    });
  }

  function addHashToChangeLog() {
    changelogCollection.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          fileName: "20160509113224-first_migration.js",
          fileHash: "0f295f21f63c66dc78d8dc091ce3c8bab8c56d8b74fb35a0c99f6d9953e37d1a",
          appliedAt: new Date("2016-06-03T20:10:12.123Z")
        },
        {
          fileName: "20160512091701-second_migration.js",
          fileHash: "18b4d9c95a8678ae3a6dd3ae5b8961737a6c3dd65e3e655a5f5718d97a0bff70",
          appliedAt: new Date("2016-06-09T20:10:12.123Z")
        }
      ])
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    
    changelogCollection = mockChangelogCollection();
    db = mockDb();

    vi.spyOn(migrationsDir, 'shouldExist').mockResolvedValue();
    vi.spyOn(migrationsDir, 'getFileNames').mockResolvedValue([
      "20160509113224-first_migration.js",
      "20160512091701-second_migration.js",
      "20160513155321-third_migration.js"
    ]);
    vi.spyOn(migrationsDir, 'loadFileHash').mockImplementation(defaultLoadFileHashImpl);
    
    vi.spyOn(config, 'shouldExist').mockResolvedValue();
    vi.spyOn(config, 'read').mockReturnValue({
      changelogCollectionName: "changelog"
    });
  });

  it("should check that the migrations directory exists", async () => {
    await status(db);
    expect(migrationsDir.shouldExist).toHaveBeenCalled();
  });

  it("should yield an error when the migrations directory does not exist", async () => {
    vi.spyOn(migrationsDir, 'shouldExist').mockRejectedValue(
      new Error("migrations directory does not exist")
    );
    await expect(status(db)).rejects.toThrow("migrations directory does not exist");
  });

  it("should check that the config file exists", async () => {
    await status(db);
    expect(config.shouldExist).toHaveBeenCalled();
  });

  it("should yield an error when config file does not exist", async () => {
    vi.spyOn(config, 'shouldExist').mockRejectedValue(
      new Error("config file does not exist")
    );
    await expect(status(db)).rejects.toThrow("config file does not exist");
  });

  it("should get the list of files in the migrations directory", async () => {
    await status(db);
    expect(migrationsDir.getFileNames).toHaveBeenCalled();
  });

  it("should yield errors that occurred when getting the list of files in the migrations directory", async () => {
    vi.spyOn(migrationsDir, 'getFileNames').mockRejectedValue(
      new Error("File system unavailable")
    );
    await expect(status(db)).rejects.toThrow("File system unavailable");
  });

  it("should fetch the content of the changelog collection", async () => {
    await status(db);
    expect(changelogCollection.find).toHaveBeenCalled();
    expect(changelogCollection.find({}).toArray).toHaveBeenCalled();
  });

  it("should yield errors that occurred when fetching the changelog collection", async () => {
    changelogCollection.find.mockReturnValue({
      toArray: vi.fn().mockRejectedValue(new Error("Cannot read from the database"))
    });
    await expect(status(db)).rejects.toThrow("Cannot read from the database");
  });

  it("should yield an array that indicates the status of the migrations in the directory", async () => {
    const statusItems = await status(db);
    expect(statusItems).toEqual([
      {
        appliedAt: "2016-06-03T20:10:12.123Z",
        fileName: "20160509113224-first_migration.js",
        migrationBlock: undefined
      },
      {
        appliedAt: "2016-06-09T20:10:12.123Z",
        fileName: "20160512091701-second_migration.js",
        migrationBlock: undefined
      },
      {
        appliedAt: "PENDING",
        fileName: "20160513155321-third_migration.js",
        migrationBlock: undefined
      }
    ]);
  });

  it("should mark all scripts as pending when enabling for the first time", async () => {
    enabledFileHash();
    const statusItems = await status(db);
    expect(statusItems).toEqual([
      {
        appliedAt: "PENDING",
        fileName: "20160509113224-first_migration.js",
        fileHash: "0f295f21f63c66dc78d8dc091ce3c8bab8c56d8b74fb35a0c99f6d9953e37d1a",
        migrationBlock: undefined
      },
      {
        appliedAt: "PENDING",
        fileName: "20160512091701-second_migration.js",
        fileHash: "18b4d9c95a8678ae3a6dd3ae5b8961737a6c3dd65e3e655a5f5718d97a0bff70",
        migrationBlock: undefined
      },
      {
        appliedAt: "PENDING",
        fileName: "20160513155321-third_migration.js",
        fileHash: "1f9eb3b5eb70b2fb5b83fa0c660d859082f0bb615e835d29943d26fb0d352022",
        migrationBlock: undefined
      }
    ]);
  });

  it("should mark new scripts as pending with a file hash", async () => {
    enabledFileHash();
    addHashToChangeLog();
    const statusItems = await status(db);
    expect(statusItems).toEqual([
      {
        appliedAt: "2016-06-03T20:10:12.123Z",
        fileName: "20160509113224-first_migration.js",
        fileHash: "0f295f21f63c66dc78d8dc091ce3c8bab8c56d8b74fb35a0c99f6d9953e37d1a",
        migrationBlock: undefined
      },
      {
        appliedAt: "2016-06-09T20:10:12.123Z",
        fileName: "20160512091701-second_migration.js",
        fileHash: "18b4d9c95a8678ae3a6dd3ae5b8961737a6c3dd65e3e655a5f5718d97a0bff70",
        migrationBlock: undefined
      },
      {
        appliedAt: "PENDING",
        fileName: "20160513155321-third_migration.js",
        fileHash: "1f9eb3b5eb70b2fb5b83fa0c660d859082f0bb615e835d29943d26fb0d352022",
        migrationBlock: undefined
      }
    ]);
  });

  it("should mark changed scripts with pending", async () => {
    enabledFileHash();
    addHashToChangeLog();
    vi.spyOn(migrationsDir, 'loadFileHash').mockImplementation((fileName) => {
      switch (fileName) {
        case "20160509113224-first_migration.js":
          return Promise.resolve("0f295f21f63c66dc78d8dc091ce3c8bab8c56d8b74fb35a0c99f6d9953e37d1a");
        case "20160512091701-second_migration.js":
          return Promise.resolve("18b4d9c95a8678ae3a6dd3ae5b8961737a6c3dd65e3e655a5f5718d97a0bff71");
        case "20160513155321-third_migration.js":
          return Promise.resolve("1f9eb3b5eb70b2fb5b83fa0c660d859082f0bb615e835d29943d26fb0d352022");
        default:
          return Promise.resolve();
      }
    });

    const statusItems = await status(db);
    expect(statusItems).toEqual([
      {
        appliedAt: "2016-06-03T20:10:12.123Z",
        fileName: "20160509113224-first_migration.js",
        fileHash: "0f295f21f63c66dc78d8dc091ce3c8bab8c56d8b74fb35a0c99f6d9953e37d1a",
        migrationBlock: undefined
      },
      {
        appliedAt: "PENDING",
        fileName: "20160512091701-second_migration.js",
        fileHash: "18b4d9c95a8678ae3a6dd3ae5b8961737a6c3dd65e3e655a5f5718d97a0bff71", // this hash is different
        migrationBlock: undefined
      },
      {
        appliedAt: "PENDING",
        fileName: "20160513155321-third_migration.js",
        fileHash: "1f9eb3b5eb70b2fb5b83fa0c660d859082f0bb615e835d29943d26fb0d352022",
        migrationBlock: undefined
      }
    ]);
  });
});
