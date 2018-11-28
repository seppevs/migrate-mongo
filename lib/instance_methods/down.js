const _ = require("lodash");
const fnArgs = require("fn-args");
const { promisify } = require("util");
const loadMigration = require("../utils/loadMigration");

module.exports = (config, status) => async db => {
  const downgraded = [];
  const statusItems = await status(db, config);
  const appliedItems = statusItems.filter(item => item.appliedAt !== "PENDING");
  const lastAppliedItem = _.last(appliedItems);

  if (lastAppliedItem) {
    try {
      const migration = loadMigration(
        config.migrationDir,
        lastAppliedItem.fileName
      );

      const args = fnArgs(migration.down);
      const down = args.length > 1 ? promisify(migration.down) : migration.down;
      await down(db);
    } catch (err) {
      throw new Error(
        `Could not migrate down ${lastAppliedItem.fileName}: ${err.message}`
      );
    }

    const collectionName = config.changelogCollectionName;
    const collection = db.collection(collectionName);
    try {
      await collection.deleteOne({ fileName: lastAppliedItem.fileName });
      downgraded.push(lastAppliedItem.fileName);
    } catch (err) {
      throw new Error(`Could not update changelog: ${err.message}`);
    }
  }

  return downgraded;
};
