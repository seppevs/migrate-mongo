const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

const path = require("path");

describe("migrationsDir", () => {
  let migrationsDir;
  let fs;
  let config;
  let moduleLoader;

  function mockFs() {
    return {
      stat: sinon.stub(),
      readdir: sinon.stub(),
      readFile: sinon.stub()
    };
  }

  function mockConfig() {
    return {
      read: sinon.stub().returns({
        migrationsDir: "migrations",
        migrationFileExtension: ".js"
      })
    };
  }

  function mockModuleLoader() {
    return {
      import: sinon.stub(),
    };
  }

  beforeEach(() => {
    fs = mockFs();
    config = mockConfig();
    moduleLoader = mockModuleLoader();
    migrationsDir = proxyquire("../../lib/env/migrationsDir", {
      "fs-extra": fs,
      "./config": config,
      "../utils/module-loader": moduleLoader
    });
  });

  describe("resolve()", () => {
    it("should use the configured relative migrations dir when a config file is available", async () => {
      config.read.returns({
        migrationsDir: "custom-migrations-dir"
      });
      expect(await migrationsDir.resolve()).to.equal(
        path.join(process.cwd(), "custom-migrations-dir")
      );
    });

    it("should use the configured absolute migrations dir when a config file is available", async () => {
      config.read.returns({
        migrationsDir: "/absolute/path/to/my/custom-migrations-dir"
      });
      expect(await migrationsDir.resolve()).to.equal(
        "/absolute/path/to/my/custom-migrations-dir"
      );
    });

    it("should use the default migrations directory when no migrationsDir is specified in the config file", async () => {
      config.read.returns({});
      expect(await migrationsDir.resolve()).to.equal(
        path.join(process.cwd(), "migrations")
      );
    });

    it("should use the default migrations directory when unable to read the config file", async () => {
      config.read.throws(new Error("Cannot read config file"));
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

  describe("getFileNames()", () => {
    it("should read the directory and yield the result", async () => {
      fs.readdir.returns(Promise.resolve(["file1.js", "file2.js"]));
      const files = await migrationsDir.getFileNames();
      expect(files).to.deep.equal(["file1.js", "file2.js"]);
    });

    it("should list only files with configured extension", async () => {
      config.read.returns({
        migrationFileExtension: ".ts"
      });
      fs.readdir.returns(Promise.resolve(["file1.ts", "file2.ts", "file1.js", "file2.js", ".keep"]));
      const files = await migrationsDir.getFileNames();
      expect(files).to.deep.equal(["file1.ts", "file2.ts"]);
    });

    it("should yield errors that occurred while reading the dir", async () => {
      fs.readdir.returns(Promise.reject(new Error("Could not read")));
      try {
        await migrationsDir.getFileNames();
        expect.fail("Error was not thrown");
      } catch (err) {
        expect(err.message).to.equal("Could not read");
      }
    });

    it("should be sorted in alphabetical order", async () => {
      fs.readdir.returns(Promise.resolve([
        "20201014172343-test.js",
        "20201014172356-test3.js",
        "20201014172354-test2.js",
        "20201014172345-test1.js"
      ]));
      const files = await migrationsDir.getFileNames();
      expect(files).to.deep.equal([
        "20201014172343-test.js",
        "20201014172345-test1.js",
        "20201014172354-test2.js",
        "20201014172356-test3.js"
      ]);
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
        expect(err.message).to.have.string(`Cannot find module '${pathToMigration}'`);
      }
    });

    it("should use CommonJS default", async () => {
      moduleLoader.require = sinon.stub().returns({ up: sinon.stub(), down: sinon.stub() });
      await migrationsDir.loadMigration("someFile.js");
      expect(moduleLoader.require.called).to.equal(true);
      expect(moduleLoader.import.called).to.equal(false);
    });

    it("should fall back to using 'import' if Node requires the use of ESM (default export)", async () => {
      const error = new Error('ESM required');
      error.code = 'ERR_REQUIRE_ESM';
      moduleLoader.require = sinon.stub().throws(error);
      moduleLoader.import = sinon.stub().returns({ default: () => sinon.stub() });
      await migrationsDir.loadMigration("someFile.js");
      expect(moduleLoader.import.called).to.equal(true);
    });

    it("should fall back to using 'import' if Node requires the use of ESM (no default export)", async () => {
      const error = new Error('ESM required');
      error.code = 'ERR_REQUIRE_ESM';
      moduleLoader.require = sinon.stub().throws(error);
      moduleLoader.import = sinon.stub().returns({ up: sinon.stub(), down: sinon.stub() });
      await migrationsDir.loadMigration("someFile.js");
      expect(moduleLoader.import.called).to.equal(true);
    });
  });

  describe("resolveMigrationFileExtension()", () => {
    it("should provide the value if specified", async () => {
      config.read.returns({
        migrationFileExtension: ".ts"
      });
      const ext = await migrationsDir.resolveMigrationFileExtension();
      expect(ext).to.equal(".ts");
    });
    it("should error if the extension does not start with dot", async () => {
      config.read.returns({
        migrationFileExtension: "js"
      });
      try {
        await migrationsDir.resolveMigrationFileExtension();
        expect.fail("Error was not thrown");
      } catch(err) {
        expect(err.message).to.equal("migrationFileExtension must start with dot");
      }
    });
    it("should use the default if not specified", async() => {
      config.read.returns({
        migrationFileExtension: undefined
      });
      const ext = await migrationsDir.resolveMigrationFileExtension();
      expect(ext).to.equal(".js");
    });
    it("should use the default if config file not found", async() => {
      config.read.throws();
      const ext = await migrationsDir.resolveMigrationFileExtension();
      expect(ext).to.equal(".js");
    });
  });

  describe("doesSampleMigrationExist()", () => {
    it("should return true if sample migration exists", async () => {
      fs.stat.returns(Promise.resolve());
      const result = await migrationsDir.doesSampleMigrationExist();
      expect(result).to.equal(true);
    });

    it("should return false if sample migration doesn't exists", async () => {
      fs.stat.returns(Promise.reject(new Error("It does not exist")));
      const result = await migrationsDir.doesSampleMigrationExist();
      expect(result).to.equal(false);
    });
  });

  describe("loadFileHash()", () => {
    it("should return a hash based on the file contents", async () => {
      fs.readFile.returns(Promise.resolve("some string to hash"));
      const result = await migrationsDir.loadFileHash('somefile.js');
      expect(result).to.equal("ea83a45637a9af470a994d2c9722273ef07d47aec0660a1d10afe6e9586801ac");
    })
  })
});
