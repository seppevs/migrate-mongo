const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

const path = require("path");

describe("alwaysDir", () => {
  let alwaysDir;
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
        alwaysDir: "always"
      })
    };
  }

  beforeEach(() => {
    fs = mockFs();
    configFile = mockConfigFile();
    alwaysDir = proxyquire("../../lib/env/alwaysDir", {
      "fs-extra": fs,
      "./configFile": configFile
    });
  });

  describe("resolve()", () => {
    it("should use the configured relative always dir when a config file is available", async () => {
      configFile.read.returns({
        alwaysDir: "custom-always-dir"
      });
      expect(await alwaysDir.resolve()).to.equal(
        path.join(process.cwd(), "custom-always-dir")
      );
    });

    it("should use the configured absolute always dir when a config file is available", async () => {
      configFile.read.returns({
        alwaysDir: "/absolute/path/to/my/custom-always-dir"
      });
      expect(await alwaysDir.resolve()).to.equal(
        "/absolute/path/to/my/custom-always-dir"
      );
    });

    it("should use the default always directory when no alwaysDir is specified in the config file", async () => {
      configFile.read.returns({});
      expect(await alwaysDir.resolve()).to.equal(
        path.join(process.cwd(), "always")
      );
    });

    it("should use the default always directory when unable to read the config file", async () => {
      configFile.read.throws(new Error("Cannot read config file"));
      expect(await alwaysDir.resolve()).to.equal(
        path.join(process.cwd(), "always")
      );
    });
  });

  describe("shouldExist()", () => {
    it("should not reject with an error if the always dir exists", async () => {
      fs.stat.returns(Promise.resolve());
      await alwaysDir.shouldExist();
    });

    it("should yield an error if the always dir does not exist", async () => {
      const alwaysPath = path.join(process.cwd(), "always");
      fs.stat.returns(Promise.reject(new Error("It does not exist")));
      try {
        await alwaysDir.shouldExist();
        expect.fail("Error was not thrown");
      } catch (err) {
        expect(err.message).to.equal(
          `always directory does not exist: ${alwaysPath}`
        );
      }
    });
  });

  describe("shouldNotExist()", () => {
    it("should not yield an error if the always dir does not exist", async () => {
      const error = new Error("File does not exist");
      error.code = "ENOENT";
      fs.stat.returns(Promise.reject(error));
      await alwaysDir.shouldNotExist();
    });

    it("should yield an error if the always dir exists", async () => {
      const alwaysPath = path.join(process.cwd(), "always");
      fs.stat.returns(Promise.resolve());
      try {
        await alwaysDir.shouldNotExist();
        expect.fail("Error was not thrown");
      } catch (err) {
        expect(err.message).to.equal(
          `always directory already exists: ${alwaysPath}`
        );
      }
    });
  });

  describe("getFileNames()", () => {
    it("should read the directory and yield the result", async () => {
      fs.readdir.returns(Promise.resolve(["file1.js", "file2.js"]));
      const files = await alwaysDir.getFileNames();
      expect(files).to.deep.equal(["file1.js", "file2.js"]);
    });

    it("should list only .js files", async () => {
      fs.readdir.returns(Promise.resolve(["file1.js", "file2.js", ".keep"]));
      const files = await alwaysDir.getFileNames();
      expect(files).to.deep.equal(["file1.js", "file2.js"]);
    });

    it("should yield errors that occurred while reading the dir", async () => {
      fs.readdir.returns(Promise.reject(new Error("Could not read")));
      try {
        await alwaysDir.getFileNames();
        expect.fail("Error was not thrown");
      } catch (err) {
        expect(err.message).to.equal("Could not read");
      }
    });
  });

  describe("loadMigration()", () => {
    it("should attempt to load the fileName in the always directory", async () => {
      const pathToMigration = path.join(
        process.cwd(),
        "always",
        "someFile.js"
      );
      try {
        await alwaysDir.loadMigration("someFile.js");
        expect.fail("Error was not thrown");
      } catch (err) {
        expect(err.message).to.equal(`Cannot find module '${pathToMigration}'`);
      }
    });
  });
});
