const { promisify } = require("util");

const status = require("./status");
const config = require("../env/config");
const migrationsDir = require("../env/migrationsDir");
const hasCallback = require("../utils/has-callback");
const lock = require("../utils/lock");

async function loadFnArgs() {
  const module = await import('fn-args');
  return module.default;
}

module.exports = async (db, client) => {
  const fnArgsFunc = await loadFnArgs();
  const isBlockRollback = global.options?.block;
  const downgraded = [];
  const statusItems = await status(db);
  const appliedItems = statusItems.filter(item => item.appliedAt !== "PENDING");
  const lastAppliedItem = appliedItems[appliedItems.length - 1];

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
        const isCallback = await hasCallback(migration.down);
        const down = isCallback ? promisify(migration.down) : migration.down;

        if (isCallback && fnArgsFunc(migration.down).length < 3) {
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
    for (const item of itemsToRollback) {
      await rollbackItem(item);
    }
  } catch (err) {
    await lock.clear(db);
    throw err;
  }

  await lock.clear(db);
  return downgraded;
};
