const { expect } = require("chai");
const sinon = require("sinon");
const path = require("path");
const proxyquire = require("proxyquire");

describe("init", () => {
  let init;
  let alwaysBeforeDir;
  let migrationsDir;
  let alwaysAfterDir;
  let configFile;
  let fs;

  function mockAlwaysBeforeDir() {
    return {
      shouldNotExist: sinon.stub().returns(Promise.resolve())
    };
  }

  function mockMigrationsDir() {
    return {
      shouldNotExist: sinon.stub().returns(Promise.resolve())
    };
  }

  function mockAlwaysAfterDir() {
    return {
      shouldNotExist: sinon.stub().returns(Promise.resolve())
    };
  }

  function mockConfigFile() {
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
    alwaysBeforeDir = mockAlwaysBeforeDir();
    migrationsDir = mockMigrationsDir();
    alwaysAfterDir = mockAlwaysAfterDir();
    configFile = mockConfigFile();
    fs = mockFs();
    init = proxyquire("../lib/actions/init", {
      "../env/alwaysBeforeDir": alwaysBeforeDir,
      "../env/migrationsDir": migrationsDir,
      "../env/alwaysAfterDir": alwaysAfterDir,
      "../env/configFile": configFile,
      "fs-extra": fs
    });
  });

  it("should check if the migrations directory already exists", async () => {
    await init();
    expect(alwaysBeforeDir.shouldNotExist.called).to.equal(true);
    expect(migrationsDir.shouldNotExist.called).to.equal(true);
    expect(alwaysAfterDir.shouldNotExist.called).to.equal(true);
  });

  it("should not continue and yield an error if the aways-before directory already exists", async () => {
    alwaysBeforeDir.shouldNotExist.returns(
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

  it("should not continue and yield an error if the aways-after directory already exists", async () => {
    alwaysAfterDir.shouldNotExist.returns(
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

  it("should not continue and yield an error if the always-before directory already exists", async () => {
    alwaysBeforeDir.shouldNotExist.returns(
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

  it("should not continue and yield an error if the always-after directory already exists", async () => {
    alwaysAfterDir.shouldNotExist.returns(
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
    expect(configFile.shouldNotExist.called).to.equal(true);
  });

  it("should not continue and yield an error if the config file already exists", async () => {
    configFile.shouldNotExist.returns(
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
      path.join(__dirname, "../samples/migrate-mongo-config.js")
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

  it("should create migrations directories in the current working directory", async () => {
    await init();

    expect(fs.mkdirs.called).to.equal(true);
    expect(fs.mkdirs.callCount).to.equal(3);
    expect(fs.mkdirs.getCall(0).args[0]).to.deep.equal(path.join(process.cwd(), "always-before"));
    expect(fs.mkdirs.getCall(1).args[0]).to.deep.equal(path.join(process.cwd(), "migrations"));
    expect(fs.mkdirs.getCall(2).args[0]).to.deep.equal(path.join(process.cwd(), "always-after"));
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
