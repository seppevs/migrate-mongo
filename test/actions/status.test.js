const { expect } = require("chai");
const sinon = require("sinon");

const proxyquire = require("proxyquire");

describe("status", () => {
  let status;
  let migrationsDir;
  let configFile;
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
        )
    };
  }

  function mockConfigFile() {
    return {
      shouldExist: sinon.stub().returns(Promise.resolve()),
      read: sinon.stub().returns({
        changelogCollectionName: "changelog"
      })
    };
  }

  function mockFs() {
    return {
      copy: sinon.stub().returns(Promise.resolve())
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

  beforeEach(() => {
    changelogCollection = mockChangelogCollection();

    migrationsDir = mockMigrationsDir();
    configFile = mockConfigFile();
    fs = mockFs();
    db = mockDb();
    status = proxyquire("../../lib/actions/status", {
      "../env/migrationsDir": migrationsDir,
      "../env/configFile": configFile,
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
    expect(configFile.shouldExist.called).to.equal(true);
  });

  it("should yield an error when config file does not exist", async () => {
    configFile.shouldExist.returns(
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
        fileName: "20160509113224-first_migration.js"
      },
      {
        appliedAt: "2016-06-09T20:10:12.123Z",
        fileName: "20160512091701-second_migration.js"
      },
      {
        appliedAt: "PENDING",
        fileName: "20160513155321-third_migration.js"
      }
    ]);
  });
});
