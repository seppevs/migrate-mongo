const { expect } = require("chai");
const sinon = require("sinon");
const path = require("path");
const proxyquire = require("proxyquire");

describe("init", () => {
  let init;
  let migrationsDir;
  let config;
  let fs;

  function mockMigrationsDir() {
    return {
      shouldNotExist: sinon.stub().returns(Promise.resolve())
    };
  }

  function mockConfig() {
    return {
      shouldNotExist: sinon.stub().returns(Promise.resolve())
    };
  }

  function mockFs() {
    return {
      copy: sinon.stub().returns(Promise.resolve()),
      mkdirs: sinon.stub().returns(Promise.resolve())
    };
  }

  beforeEach(() => {
    global.options = { module: 'commonjs' };
    migrationsDir = mockMigrationsDir();
    config = mockConfig();
    fs = mockFs();
    init = proxyquire("../../lib/actions/init", {
      "../env/migrationsDir": migrationsDir,
      "../env/config": config,
      "fs-extra": fs
    });
  });

  it("should check if the migrations directory already exists", async () => {
    await init();
    expect(migrationsDir.shouldNotExist.called).to.equal(true);
  });

  it("should not continue and yield an error if the migrations directory already exists", async () => {
    migrationsDir.shouldNotExist.returns(
      Promise.reject(new Error("Dir exists"))
    );
    try {
      await init();
    } catch (err) {
      expect(err.message).to.equal("Dir exists");
      expect(fs.copy.called).to.equal(false);
      expect(fs.mkdirs.called).to.equal(false);
    }
  });

  it("should check if the config file already exists", async () => {
    await init();
    expect(config.shouldNotExist.called).to.equal(true);
  });

  it("should not continue and yield an error if the config file already exists", async () => {
    config.shouldNotExist.returns(
      Promise.resolve(new Error("Config exists"))
    );
    try {
      await init();
    } catch (err) {
      expect(err.message).to.equal("Config exists");
      expect(fs.copy.called).to.equal(false);
      expect(fs.mkdirs.called).to.equal(false);
    }
  });

  it("should copy the sample config file to the current working directory", async () => {
    await init();
    expect(fs.copy.called).to.equal(true);
    expect(fs.copy.callCount).to.equal(1);

    const source = fs.copy.getCall(0).args[0];
    expect(source).to.equal(
      path.join(__dirname, "../../samples/commonjs/migrate-mongo-config.js")
    );

    const destination = fs.copy.getCall(0).args[1];
    expect(destination).to.equal(
      path.join(process.cwd(), "migrate-mongo-config.js")
    );
  });

  it("should yield errors that occurred when copying the sample config", async () => {
    fs.copy.returns(Promise.reject(new Error("No space left on device")));
    try {
      await init();
      expect.fail("Error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("No space left on device");
    }
  });

  it("should create a migrations directory in the current working directory", async () => {
    await init();

    expect(fs.mkdirs.called).to.equal(true);
    expect(fs.mkdirs.callCount).to.equal(1);
    expect(fs.mkdirs.getCall(0).args[0]).to.deep.equal(
      path.join(process.cwd(), "migrations")
    );
  });

  it("should yield errors that occurred when creating the migrations directory", async () => {
    fs.mkdirs.returns(Promise.reject(new Error("I cannot do that")));
    try {
      await init();
    } catch (err) {
      expect(err.message).to.equal("I cannot do that");
    }
  });
});
