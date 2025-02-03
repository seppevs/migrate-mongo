const { expect } = require("chai");
const sinon = require("sinon");
const path = require("path");

const proxyquire = require("proxyquire");

describe("create", () => {
  let create;
  let migrationsDir;
  let config;
  let fs;

  function mockMigrationsDir() {
    return {
      shouldExist: sinon.stub().returns(Promise.resolve()),
      resolveMigrationFileExtension: sinon.stub().returns('.js'),
      doesSampleMigrationExist: sinon.stub().returns(Promise.resolve(false))
    };
  }

  function mockConfig() {
    return {
      shouldExist: sinon.stub().returns(Promise.resolve()),
      read: sinon.stub().returns(Promise.resolve({
        moduleSystem: 'commonjs',
      }))
    };
  }

  function mockFs() {
    return {
      copy: sinon.stub().returns(Promise.resolve())
    };
  }

  beforeEach(() => {
    migrationsDir = mockMigrationsDir();
    config = mockConfig();
    fs = mockFs();
    create = proxyquire("../../lib/actions/create", {
      "../env/migrationsDir": migrationsDir,
      "../env/config": config,
      "fs-extra": fs
    });
  });

  it("should yield an error when called without a description", async () => {
    try {
      await create(null);
      expect.fail("Error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("Missing parameter: description");
    }
  });

  it("should check that the migrations directory exists", async () => {
    await create("my_description");
    expect(migrationsDir.shouldExist.called).to.equal(true);
  });

  it("should yield an error when the migrations directory does not exist", async () => {
    migrationsDir.shouldExist.returns(
      Promise.reject(new Error("migrations directory does not exist"))
    );
    try {
      await create("my_description");
      expect.fail("Error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("migrations directory does not exist");
    }
  });

  it("should not be necessary to have an config present", async () => {
    await create("my_description");
    expect(config.shouldExist.called).to.equal(false);
  });

  it("should create a new migration file and yield the filename", async () => {
    const clock = sinon.useFakeTimers(
      new Date("2016-06-09T08:07:00.077Z").getTime()
    );
    const filename = await create("my_description");
    expect(fs.copy.called).to.equal(true);
    expect(fs.copy.getCall(0).args[0]).to.equal(
      path.join(__dirname, "../../samples/commonjs/migration.js")
    );
    expect(fs.copy.getCall(0).args[1]).to.equal(
      path.join(process.cwd(), "migrations", "20160609080700-my_description.js")
    );
    expect(filename).to.equal("20160609080700-my_description.js");
    clock.restore();
  });

  it("should create a new migration file and yield the filename with custom formatting", async () => {
    const configWithTimestamp = {
      read: sinon.stub().returns(Promise.resolve({
        moduleSystem: 'commonjs',
        timestampFormat: 'yyyy-MM-dd-HH:mm'
      }))
    };

    const createWithTimestamp = proxyquire("../../lib/actions/create", {
      "../env/migrationsDir": migrationsDir,
      "../env/config": configWithTimestamp,
      "fs-extra": fs
    });

    const clock = sinon.useFakeTimers(
      new Date("2016-06-09T08:07:00.077Z").getTime()
    );
    const filename = await createWithTimestamp("my_description");
    expect(fs.copy.called).to.equal(true);
    expect(fs.copy.getCall(0).args[0]).to.equal(
      path.join(__dirname, "../../samples/commonjs/migration.js")
    );
    expect(fs.copy.getCall(0).args[1]).to.equal(
      path.join(process.cwd(), "migrations", "2016-06-09-08:07-my_description.js")
    );
    expect(filename).to.equal("2016-06-09-08:07-my_description.js");
    clock.restore();
  });

  it("should create a new migration file and yield the filename with custom extension", async () => {
    const clock = sinon.useFakeTimers(
      new Date("2016-06-09T08:07:00.077Z").getTime()
    );
    migrationsDir.resolveMigrationFileExtension.returns('.ts');
    const filename = await create("my_description");
    expect(fs.copy.called).to.equal(true);
    expect(fs.copy.getCall(0).args[0]).to.equal(
      path.join(__dirname, "../../samples/commonjs/migration.js")
    );
    expect(fs.copy.getCall(0).args[1]).to.equal(
      path.join(process.cwd(), "migrations", "20160609080700-my_description.ts")
    );
    expect(filename).to.equal("20160609080700-my_description.ts");
    clock.restore();
  });

  it("should replace spaces in the description with underscores", async () => {
    const clock = sinon.useFakeTimers(
      new Date("2016-06-09T08:07:00.077Z").getTime()
    );
    await create("this description contains spaces");
    expect(fs.copy.called).to.equal(true);
    expect(fs.copy.getCall(0).args[0]).to.equal(
      path.join(__dirname, "../../samples/commonjs/migration.js")
    );
    expect(fs.copy.getCall(0).args[1]).to.equal(
      path.join(
        process.cwd(),
        "migrations",
        "20160609080700-this_description_contains_spaces.js"
      )
    );
    clock.restore();
  });

  it("should yield errors that occurred when copying the file", async () => {
    fs.copy.returns(Promise.reject(new Error("Copy failed")));
    try {
      await create("my_description");
      expect.fail("Error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("Copy failed");
    }
  });

  it("should use the sample migration file if it exists", async () => {
    const clock = sinon.useFakeTimers(
        new Date("2016-06-09T08:07:00.077Z").getTime()
    );
    migrationsDir.doesSampleMigrationExist.returns(true);
    const filename = await create("my_description");
    expect(migrationsDir.doesSampleMigrationExist.called).to.equal(true);
    expect(fs.copy.called).to.equal(true);
    expect(fs.copy.getCall(0).args[0]).to.equal(
        path.join(process.cwd(), "migrations", "sample-migration.js")
    );
    expect(fs.copy.getCall(0).args[1]).to.equal(
        path.join(process.cwd(), "migrations", "20160609080700-my_description.js")
    );
    expect(filename).to.equal("20160609080700-my_description.js");
    clock.restore();
  });
});
