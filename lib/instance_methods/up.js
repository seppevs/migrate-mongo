const _ = require("lodash");
const pEachSeries = require("p-each-series");
const fnArgs = require("fn-args");
const { promisify } = require("util");
const loadMigration = require("../utils/loadMigration");

module.exports = (config, status) => async db => {
  const statusItems = await status(db, config);
  const pendingItems = _.filter(statusItems, { appliedAt: "PENDING" });
  const migrated = [];

  const migrateItem = async item => {
    try {
      const migration = loadMigration(config.migrationsDir, item.fileName);
      const args = fnArgs(migration.up);
      const up = args.length > 1 ? promisify(migration.up) : migration.up;
      await up(db);
    } catch (err) {
      const error = new Error(
        `Could not migrate up ${item.fileName}: ${err.message}`
      );
      error.migrated = migrated;
      throw error;
    }

    let collectionName;
    if (config.changelogCollectionName) {
      collectionName = config.changelogCollectionName;
    } else {
      collectionName = "changelog";
      console.warn(
        'No changelogCollectionName found in confg - defaulting to "changelog"'
      );
    }

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
