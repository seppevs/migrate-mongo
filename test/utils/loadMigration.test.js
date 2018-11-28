const { expect } = require("chai");
const loadMigration = require("../../lib/utils/loadMigration");

describe("loadMigration()", () => {
  const migrationDirPath = "/";
  const fileName = "test.js";

  it("should throw error if no migrationDirPath given", () => {
    try {
      loadMigration();
      expect.fail("Error was not thrown");
    } catch (error) {
      expect(error.message).to.equal("No migrations path found");
    }
  });

  it("should throw error if no filename given", () => {
    try {
      loadMigration(migrationDirPath);
      expect.fail("No file name given");
    } catch (error) {
      expect(error.message).to.equal("No file name given");
    }
  });

  it("should return migration file", () => {
    try {
      loadMigration(migrationDirPath, fileName);
      expect.fail("Error was not thrown");
    } catch (error) {
      expect(error.message).to.equal("Cannot find module '/test.js'");
    }
  });
});
