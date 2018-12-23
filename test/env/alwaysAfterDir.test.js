const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

const path = require("path");

describe("afterDir", () => {
  let afterDir;
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
        afterDir: "after"
      })
    };
  }

  beforeEach(() => {
    fs = mockFs();
    configFile = mockConfigFile();
    afterDir = proxyquire("../../lib/env/afterDir", {
      "fs-extra": fs,
      "./configFile": configFile
    });
  });

  describe("resolve()", () => {
    it("should use the configured relative always dir when a config file is available", async () => {
      configFile.read.returns({
        afterDir: "custom-after-dir"
      });
      expect(await afterDir.resolve()).to.equal(
        path.join(process.cwd(), "custom-after-dir")
      );
    });

    it("should use the configured absolute always dir when a config file is available", async () => {
      configFile.read.returns({
        afterDir: "/absolute/path/to/my/custom-after-dir"
      });
      expect(await afterDir.resolve()).to.equal(
        "/absolute/path/to/my/custom-after-dir"
      );
    });

    it("should use the default always directory when no afterDir is specified in the config file", async () => {
      configFile.read.returns({});
      expect(await afterDir.resolve()).to.equal(
        path.join(process.cwd(), "after")
      );
    });

    it("should use the default always directory when unable to read the config file", async () => {
      configFile.read.throws(new Error("Cannot read config file"));
      expect(await afterDir.resolve()).to.equal(
        path.join(process.cwd(), "after")
      );
    });
  });

  describe("shouldExist()", () => {
    it("should not reject with an error if the always dir exists", async () => {
      fs.stat.returns(Promise.resolve());
      await afterDir.shouldExist();
    });

    it("should yield an error if the always dir does not exist", async () => {
      const alwaysPath = path.join(process.cwd(), "after");
      fs.stat.returns(Promise.reject(new Error("It does not exist")));
      try {
        await afterDir.shouldExist();
        expect.fail("Error was not thrown");
      } catch (err) {
        expect(err.message).to.equal(
          `after directory does not exist: ${alwaysPath}`
        );
      }
    });
  });

  describe("shouldNotExist()", () => {
    it("should not yield an error if the always dir does not exist", async () => {
      const error = new Error("File does not exist");
      error.code = "ENOENT";
      fs.stat.returns(Promise.reject(error));
      await afterDir.shouldNotExist();
    });

    it("should yield an error if the always dir exists", async () => {
      const alwaysPath = path.join(process.cwd(), "after");
      fs.stat.returns(Promise.resolve());
      try {
        await afterDir.shouldNotExist();
        expect.fail("Error was not thrown");
      } catch (err) {
        expect(err.message).to.equal(
          `after directory already exists: ${alwaysPath}`
        );
      }
    });
  });

  describe("getFileNames()", () => {
    it("should read the directory and yield the result", async () => {
      fs.readdir.returns(Promise.resolve(["file1.js", "file2.js"]));
      const files = await afterDir.getFileNames();
      expect(files).to.deep.equal(["file1.js", "file2.js"]);
    });

    it("should list only .js files", async () => {
      fs.readdir.returns(Promise.resolve(["file1.js", "file2.js", ".keep"]));
      const files = await afterDir.getFileNames();
      expect(files).to.deep.equal(["file1.js", "file2.js"]);
    });

    it("should yield errors that occurred while reading the dir", async () => {
      fs.readdir.returns(Promise.reject(new Error("Could not read")));
      try {
        await afterDir.getFileNames();
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
        "after",
        "someFile.js"
      );
      try {
        await afterDir.loadMigration("someFile.js");
        expect.fail("Error was not thrown");
      } catch (err) {
        expect(err.message).to.equal(`Cannot find module '${pathToMigration}'`);
      }
    });
  });
});
