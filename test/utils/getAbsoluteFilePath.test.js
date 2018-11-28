const { expect } = require("chai");
const getAbsoluteFilePath = require("../../lib/utils/getAbsoluteFilePath");

describe("MigrateMongo", () => {
  it("should return absolute file path if given absolute file path", () => {
    const absoluteFileName = "/test/file.js";
    expect(getAbsoluteFilePath(absoluteFileName)).to.equal(absoluteFileName);
  });

  it("should return absolute file path if given relative file path", () => {
    const relativeFileName = "test/file.js";
    expect(getAbsoluteFilePath(relativeFileName)).to.equal(
      `${process.cwd()}/${relativeFileName}`
    );
  });
});
