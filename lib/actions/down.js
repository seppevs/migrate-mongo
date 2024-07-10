const _ = require("lodash");

const status = require("./status");
const config = require("../env/config");
const migrationsDir = require("../env/migrationsDir");
const lock = require("../utils/lock");
const oplog = require("../utils/oplog")

module.exports = async (db, client) => {
  const downgraded = [];
  const statusItems = await status(db);
  const {
    changelogCollectionName,
    dateField,
    nameField,
    context,
  } = await config.read();
  const appliedItems = statusItems.filter(item => item[dateField] !== "PENDING" && item.appliedManually !== true);
  const manualMigrationFileToApply = global.options.migrationFile
  const lastAppliedItem = _.last(appliedItems);

  if (!manualMigrationFileToApply && await lock.exist(db)) {
    throw new Error("Could not migrate down, a lock is in place.");
  }

  if (!manualMigrationFileToApply) {
    try {
      await lock.activate(db);
    } catch(err) {
      throw new Error(`Could not create a lock: ${err.message}`);
    }
  }

  if (lastAppliedItem || manualMigrationFileToApply) {
    const fileName = manualMigrationFileToApply || lastAppliedItem.file

    try {

      const migration = await migrationsDir.loadMigration(manualMigrationFileToApply || lastAppliedItem.file);
      const {down} = migration;

      console.info('Database oplog before migrating down:', await oplog.getCurrentTimestamp(client))

      if (context) {
        const ctx = await context({ migrationFile: fileName, operation: 'down' })
        await down(db, client, ctx);
      } else {
        await down(db, client, {});
      }

      console.info('Database oplog after migrating down:', await oplog.getCurrentTimestamp(client))

    } catch (err) {
      if (!manualMigrationFileToApply) {
        await lock.clear(db);
      }
      throw new Error(
        `Could not migrate down ${fileName}: ${err.message}`
      );
    }
    const changelogCollection = db.collection(changelogCollectionName);
    try {
      if (manualMigrationFileToApply) {
        await changelogCollection.deleteMany({ [nameField]: manualMigrationFileToApply });
      } else {
        await changelogCollection.deleteOne({ [nameField]: lastAppliedItem[nameField] });
      }
      downgraded.push(fileName);
    } catch (err) {
      throw new Error(`Could not update changelog: ${err.message}`);
    }
  }

  if (!manualMigrationFileToApply) {
    await lock.clear(db);
  }

  return downgraded;
};
