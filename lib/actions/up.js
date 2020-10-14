const _filter = require("lodash.filter");
const pEachSeries = require("p-each-series");
const { promisify } = require("util");
const fnArgs = require("fn-args");

const status = require("./status");
const config = require("../env/config");
const migrationsDir = require("../env/migrationsDir");
const hasCallback = require("../utils/has-callback");
const lock = require("../utils/lock");

module.exports = async (db, client) => {
  const statusItems = await status(db);
  const pendingItems = _filter(statusItems, { appliedAt: "PENDING" });
  const migrated = [];
  const migrationBlock = Date.now();

  if (await lock.exist(db)) {
    throw new Error("Could not migrate up, a lock is in place.");
  }

  try {
    await lock.activate(db);
  } catch(err) {
    throw new Error(`Could not create a lock: ${err.message}`);
  }

  const migrateItem = async item => {
    try {
      const migration = await migrationsDir.loadMigration(item.fileName);
      const up = hasCallback(migration.up) ? promisify(migration.up) : migration.up;

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
      error.stack = err.stack;
      error.migrated = migrated;
      await lock.clear(db);
      throw error;
    }

    const { changelogCollectionName, useFileHash } = await config.read();
    const changelogCollection = db.collection(changelogCollectionName);

    const { fileName, fileHash } = item;
    const appliedAt = new Date();

    try {
      await changelogCollection.insertOne(useFileHash === true ? { fileName, fileHash, appliedAt, migrationBlock } : { fileName, appliedAt, migrationBlock });
    } catch (err) {
      throw new Error(`Could not update changelog: ${err.message}`);
    }
    migrated.push(item.fileName);
  };

  await pEachSeries(pendingItems, migrateItem);
  await lock.clear(db);
  return migrated;
};
