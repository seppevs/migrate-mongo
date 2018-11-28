const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");
// const getFileNamesFromPath = require("ƒ../../lib/utils/getFileNamesFromPath");

describe("getFileNamesFromPath()", () => {
  let getFileNamesFromPath;
  let fs;

  function mockFs() {
    return {
      readdirSync: sinon.stub()
    };
  }

  beforeEach(() => {
    fs = mockFs();
    getFileNamesFromPath = proxyquire(
      "../../lib/utils/getJavaScriptFilesFromPath",
      {
        fs
      }
    );
  });
  it("should read the directory and yield the result", async () => {
    fs.readdirSync.returns(Promise.resolve(["file1.js", "file2.js"]));
    const files = await getFileNamesFromPath("/");
    expect(files).to.deep.equal(["file1.js", "file2.js"]);
  });

  it("should list only .js files", async () => {
    fs.readdirSync.returns(Promise.resolve(["file1.js", "file2.js", ".keep"]));
    const files = await getFileNamesFromPath("/");
    expect(files).to.deep.equal(["file1.js", "file2.js"]);
  });

  it("should yield errors that occurred while reading the dir", async () => {
    fs.readdirSync.returns(Promise.reject(new Error("Could not read")));
    try {
      await getFileNamesFromPath("/");
      expect.fail("Error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("Could not read");
    }
  });
});
