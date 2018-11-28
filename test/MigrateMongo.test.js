const { expect } = require("chai");
const MigrateMongo = require("../lib/MigrateMongo");

describe("MigrateMongo", () => {
  it("should yield an error when no config file is present", () => {
    try {
      /* eslint-disable */
      new MigrateMongo();
      /* eslint-enable */
      expect.fail("Error was not thrown");
    } catch (error) {
      expect(error.message).to.equal(
        "No config passed to MigrateMongo instance"
      );
    }
  });

  it("should yield an error when no url is defined in the config file", async () => {
    try {
      /* eslint-disable */
      new MigrateMongo({ mongodb: { url: undefined } });
      /* eslint-enable */
      expect.fail("Error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("No `url` defined in config file!");
    }
  });
});
it("should yield an error when no databaseName is defined in the config file", async () => {
  try {
    /* eslint-disable */
    new MigrateMongo({
      mongodb: { url: "www.google.com" }
    });
    /* eslint-enable */
    expect.fail("Error was not thrown");
  } catch (err) {
    expect(err.message).to.equal(
      "No `databaseName` defined in config file! This is required since migrate-mongo v3. " +
        "See https://github.com/seppevs/migrate-mongo#initialize-a-new-project"
    );
  }
});
