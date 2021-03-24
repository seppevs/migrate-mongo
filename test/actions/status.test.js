const { expect } = require("chai");
const sinon = require("sinon");

const proxyquire = require("proxyquire");

describe("status", () => {
  let status;
  let migrationsDir;
  let config;
  let fs;
  let db;
  let changelogCollection;

  function mockMigrationsDir() {
    return {
      shouldExist: sinon.stub().returns(Promise.resolve()),
      getFileNames: sinon
        .stub()
        .returns(
          Promise.resolve([
            "20160509113224-first_migration.js",
            "20160512091701-second_migration.js",
            "20160513155321-third_migration.js"
          ])
        ),
      loadFileHash: sinon
        .stub()
        .callsFake((fileName) => {
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
        }),
    };
  }

  function mockConfig() {
    return {
      shouldExist: sinon.stub().returns(Promise.resolve()),
      read: sinon.stub().returns({
        changelogCollectionName: "changelog"
      })
    };
  }

  function mockFs() {
    return {
      copy: sinon.stub().returns(Promise.resolve()),
      readFile: sinon.stub().returns(Promise.resolve("some file content"))
    };
  }

  function mockDb() {
    const mock = {};
    mock.collection = sinon.stub();
    mock.collection.withArgs("changelog").returns(changelogCollection);
    return mock;
  }

  function mockChangelogCollection() {
    return {
      deleteOne: sinon.stub().returns(Promise.resolve()),
      find: sinon.stub().returns({
        toArray: sinon.stub().returns(
          Promise.resolve([
            {
              fileName: "20160509113224-first_migration.js",
              appliedAt: new Date("2016-06-03T20:10:12.123Z")
            },
            {
              fileName: "20160512091701-second_migration.js",
              appliedAt: new Date("2016-06-09T20:10:12.123Z")
            }
          ])
        )
      })
    };
  }

  function enabledFileHash(configContent) {
    configContent.read.returns({
      changelogCollectionName: "changelog",
      useFileHash: true
    })
  }

  function addHashToChangeLog(changelog) {
    changelog.find.returns({
      toArray: sinon.stub().returns(
        Promise.resolve([
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
      )
    })
  }

  beforeEach(() => {
    changelogCollection = mockChangelogCollection();

    migrationsDir = mockMigrationsDir();
    config = mockConfig();
    fs = mockFs();
    db = mockDb();
    status = proxyquire("../../lib/actions/status", {
      "../env/migrationsDir": migrationsDir,
      "../env/config": config,
      "fs-extra": fs
    });
  });

  it("should check that the migrations directory exists", async () => {
    await status(db);
    expect(migrationsDir.shouldExist.called).to.equal(true);
  });

  it("should yield an error when the migrations directory does not exist", async () => {
    migrationsDir.shouldExist.returns(
      Promise.reject(new Error("migrations directory does not exist"))
    );
    try {
      await status(db);
      expect.fail("Error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("migrations directory does not exist");
    }
  });

  it("should check that the config file exists", async () => {
    await status(db);
    expect(config.shouldExist.called).to.equal(true);
  });

  it("should yield an error when config file does not exist", async () => {
    config.shouldExist.returns(
      Promise.reject(new Error("config file does not exist"))
    );
    try {
      await status(db);
      expect.fail("Error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("config file does not exist");
    }
  });

  it("should get the list of files in the migrations directory", async () => {
    await status(db);
    expect(migrationsDir.getFileNames.called).to.equal(true);
  });

  it("should yield errors that occurred when getting the list of files in the migrations directory", async () => {
    migrationsDir.getFileNames.returns(
      Promise.reject(new Error("File system unavailable"))
    );
    try {
      await status(db);
      expect.fail("Error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("File system unavailable");
    }
  });

  it("should fetch the content of the changelog collection", async () => {
    await status(db);
    expect(changelogCollection.find.called).to.equal(true);
    expect(changelogCollection.find({}).toArray.called).to.equal(true);
  });

  it("should yield errors that occurred when fetching the changelog collection", async () => {
    changelogCollection
      .find({})
      .toArray.returns(
        Promise.reject(new Error("Cannot read from the database"))
      );
    try {
      await status(db);
      expect.fail("Error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("Cannot read from the database");
    }
  });

  it("should yield an array that indicates the status of the migrations in the directory", async () => {
    const statusItems = await status(db);
    expect(statusItems).to.deep.equal([
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

  it("it should mark all scripts as pending when enabling for the first time", async () => {
    enabledFileHash(config);
    const statusItems = await status(db);
    expect(statusItems).to.deep.equal([
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

  it("it should mark new scripts as pending with a file hash", async () => {
    enabledFileHash(config);
    addHashToChangeLog(changelogCollection);
    const statusItems = await status(db);
    expect(statusItems).to.deep.equal([
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

  it("it should mark changed scripts with pending", async () => {
    enabledFileHash(config);
    addHashToChangeLog(changelogCollection);
    migrationsDir.loadFileHash.callsFake((fileName) => {
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
    })

    const statusItems = await status(db);
    expect(statusItems).to.deep.equal([
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
