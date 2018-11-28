const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

const path = require("path");

describe("migrationsDir", () => {
  let migrationsDir;
  let fs;
  let configFile;

  function mockFs() {
    return {
      stat: sinon.stub(),
      readdir: sinon.stub()
    };
  }

  function mockConfigFile() {
    return {
      read: sinon.stub().returns({
        migrationsDir: "migrations"
      })
    };
  }

  beforeEach(() => {
    fs = mockFs();
    configFile = mockConfigFile();
    migrationsDir = proxyquire("../../lib/env/migrationsDir", {
      "fs-extra": fs,
      "./configFile": configFile
    });
  });

  describe("resolve()", () => {
    it("should use the configured relative migrations dir when a config file is available", async () => {
      configFile.read.returns({
        migrationsDir: "custom-migrations-dir"
      });
      expect(await migrationsDir.resolve()).to.equal(
        path.join(process.cwd(), "custom-migrations-dir")
      );
    });

    it("should use the configured absolute migrations dir when a config file is available", async () => {
      configFile.read.returns({
        migrationsDir: "/absolute/path/to/my/custom-migrations-dir"
      });
      expect(await migrationsDir.resolve()).to.equal(
        "/absolute/path/to/my/custom-migrations-dir"
      );
    });

    it("should use the default migrations directory when no migrationsDir is specified in the config file", async () => {
      configFile.read.returns({});
      expect(await migrationsDir.resolve()).to.equal(
        path.join(process.cwd(), "migrations")
      );
    });

    it("should use the default migrations directory when unable to read the config file", async () => {
      configFile.read.throws(new Error("Cannot read config file"));
      expect(await migrationsDir.resolve()).to.equal(
        path.join(process.cwd(), "migrations")
      );
    });
  });

  describe("shouldExist()", () => {
    it("should not reject with an error if the migrations dir exists", async () => {
      fs.stat.returns(Promise.resolve());
      await migrationsDir.shouldExist();
    });

    it("should yield an error if the migrations dir does not exist", async () => {
      const migrationsPath = path.join(process.cwd(), "migrations");
      fs.stat.returns(Promise.reject(new Error("It does not exist")));
      try {
        await migrationsDir.shouldExist();
        expect.fail("Error was not thrown");
      } catch (err) {
        expect(err.message).to.equal(
          `migrations directory does not exist: ${migrationsPath}`
        );
      }
    });
  });

  describe("shouldNotExist()", () => {
    it("should not yield an error if the migrations dir does not exist", async () => {
      const error = new Error("File does not exist");
      error.code = "ENOENT";
      fs.stat.returns(Promise.reject(error));
      await migrationsDir.shouldNotExist();
    });

    it("should yield an error if the migrations dir exists", async () => {
      const migrationsPath = path.join(process.cwd(), "migrations");
      fs.stat.returns(Promise.resolve());
      try {
        await migrationsDir.shouldNotExist();
        expect.fail("Error was not thrown");
      } catch (err) {
        expect(err.message).to.equal(
          `migrations directory already exists: ${migrationsPath}`
        );
      }
    });
  });

  describe("loadMigration()", () => {
    it("should attempt to load the fileName in the migrations directory", async () => {
      const pathToMigration = path.join(
        process.cwd(),
        "migrations",
        "someFile.js"
      );
      try {
        await migrationsDir.loadMigration("someFile.js");
        expect.fail("Error was not thrown");
      } catch (err) {
        expect(err.message).to.equal(`Cannot find module '${pathToMigration}'`);
      }
    });
  });
});
