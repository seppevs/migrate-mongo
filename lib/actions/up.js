const _ = require("lodash");
const pEachSeries = require("p-each-series");
const { promisify } = require("util");
const fnArgs = require("fn-args");

const status = require("./status");
const config = require("../env/config");
const migrationsDir = require("../env/migrationsDir");
const hasCallback = require("../utils/has-callback");

module.exports = async (db, client) => {
  const statusItems = await status(db);
  const pendingItems = _.filter(statusItems, { appliedAt: "PENDING" });
  const migrated = [];

  // console.log(pendingItems);
  const migrateItem = async (item) => {
    try {
      const migration = await migrationsDir.loadMigration(item.fileName);
      const up = hasCallback(migration.up)
        ? promisify(migration.up)
        : migration.up;

      if (hasCallback(migration.up) && fnArgs(migration.up).length < 3) {
        // support old callback-based migrations prior to migrate-mongo 7.x.x
        await up(db);
      } else {
        await up(db, client);
      }
    } catch (err) {
      const error = new Error(
        `Could not migrate up ${item.fileName}: ${err.message}`
      );
      error.migrated = migrated;
      throw error;
    }

    if (item.appliedAt != "CUSTOM")
    {
      // console.log("writing", item.appliedAt);
      const { changelogCollectionName } = await config.read();
      const changelogCollection = db.collection(changelogCollectionName);

      const { fileName } = item;
      const appliedAt = new Date();

      try {
        await changelogCollection.insertOne({ fileName, appliedAt });
      } catch (err) {
        throw new Error(`Could not update changelog: ${err.message}`);
      }
    }

    migrated.push(item.fileName);
  };

  // console.log("some", global.options);
  if (global.options.custom) {
    await migrateItem(
      { fileName: global.options.custom, appliedAt: "CUSTOM" },
      false
    );
  } else {
    // console.log("all");
    await pEachSeries(pendingItems, migrateItem);
  }

  return migrated;
};
