const pEachSeries = require("p-each-series");
const _last = require("lodash.last");
const _get = require("lodash.get");
const { promisify } = require("util");
const fnArgs = require("fn-args");

const status = require("./status");
const config = require("../env/config");
const migrationsDir = require("../env/migrationsDir");
const hasCallback = require("../utils/has-callback");
const lock = require("../utils/lock");

module.exports = async (db, client) => {
  const isBlockRollback = _get(global.options, "block");
  const downgraded = [];
  const statusItems = await status(db);
  const appliedItems = statusItems.filter(item => item.appliedAt !== "PENDING");
  const lastAppliedItem = _last(appliedItems);

  let itemsToRollback = [];

  if (isBlockRollback && lastAppliedItem.migrationBlock) {
    itemsToRollback = appliedItems.filter(item => item.migrationBlock === lastAppliedItem.migrationBlock).reverse();
  } else {
    itemsToRollback = [lastAppliedItem];
  }

  const rollbackItem = async item => {
    if (item) {
      try {
        const migration = await migrationsDir.loadMigration(item.fileName);
        const down = hasCallback(migration.down) ? promisify(migration.down) : migration.down;

        if (hasCallback(migration.down) && fnArgs(migration.down).length < 3) {
          // support old callback-based migrations prior to migrate-mongo 7.x.x
          await down(db);
        } else {
          await down(db, client);
        }

      } catch (err) {
        throw new Error(
          `Could not migrate down ${item.fileName}: ${err.message}`
        );
      }
      const { changelogCollectionName } = await config.read();
      const changelogCollection = db.collection(changelogCollectionName);
      try {
        await changelogCollection.deleteOne({ fileName: item.fileName });
        downgraded.push(item.fileName);
      } catch (err) {
        throw new Error(`Could not update changelog: ${err.message}`);
      }
    }
  }

  if (await lock.exist(db)) {
    throw new Error("Could not migrate down, a lock is in place.");
  }
  try {
    await lock.activate(db);
  } catch(err) {
    throw new Error(`Could not create a lock: ${err.message}`);
  }

  try {
    await pEachSeries(itemsToRollback, rollbackItem);
  } catch (err) {
    await lock.clear(db);
    throw err;
  }

  await lock.clear(db);
  return downgraded;
};
