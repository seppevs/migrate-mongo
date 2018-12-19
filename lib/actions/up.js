const _ = require("lodash");
const pEachSeries = require("p-each-series");
const fnArgs = require("fn-args");
const { promisify } = require("util");
const status = require("./status");

const configFile = require("../env/configFile");
const alwaysBeforeDir = require("../env/alwaysBeforeDir");
const migrationsDir = require("../env/migrationsDir");
const alwaysAfterDir = require("../env/alwaysAfterDir");

module.exports = async db => {
  const statusItems = await status(db);
  const pendingItems = _.filter(statusItems, item => item.type.startsWith("ALWAYS") || item.appliedAt === "PENDING");
  const migrated = [];

  const migrateItem = async item => {
    try {
      let script;
      if (item.type === "ALWAYS_BEFORE") {
        script = await alwaysBeforeDir.loadMigration(item.fileName);
      } else if (item.type === "MIGRATION") {
        script = await migrationsDir.loadMigration(item.fileName);
      } else {
        script = await alwaysAfterDir.loadMigration(item.fileName);
      }
      const args = fnArgs(script.up);
      const up = args.length > 1 ? promisify(script.up) : script.up;
      await up(db);
    } catch (err) {
      const error = new Error(
        `Could not migrate up ${item.fileName}: ${err.message}`
      );
      error.migrated = migrated;
      throw error;
    }

    const config = await configFile.read();
    const collectionName = config.changelogCollectionName;
    const collection = db.collection(collectionName);

    const { fileName } = item;
    const appliedAt = new Date();

    try {
      await collection.insertOne({ fileName, appliedAt });
    } catch (err) {
      throw new Error(`Could not update changelog: ${err.message}`);
    }
    migrated.push(item.fileName);
  };

  await pEachSeries(pendingItems, migrateItem);
  return migrated;
};
