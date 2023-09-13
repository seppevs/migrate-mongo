/* eslint no-console: 0 */
const _ = require("lodash");
const pEachSeries = require("p-each-series");

const status = require("./status");
const config = require("../env/config");
const migrationsDir = require("../env/migrationsDir");
const getName = require('../utils/name');
const lock = require("../utils/lock");

module.exports = async (db, client) => {
  const statusItems = await status(db);
  const configObject = await config.read()
  const {
    changelogCollectionName,
    useFileHash,
    dateField,
    nameField,
    context,
  } = configObject;

  const pendingItems = _.filter(statusItems, { [dateField]: "PENDING" });
  const migrated = [];
  const manualMigrationFileToApply = global.options.migrationFile

  if (!manualMigrationFileToApply && await lock.exist(db)) {
    throw new Error("Could not migrate up, a lock is in place.");
  }

  if (!manualMigrationFileToApply) {
    try {
      await lock.activate(db);
    } catch(err) {
      throw new Error(`Could not create a lock: ${err.message}`);
    }
  }

  const migrateItem = async item => {
    if (manualMigrationFileToApply) {
      console.info(`Migrating ${manualMigrationFileToApply} manually`);
    } else {
      console.info(`Migrating ${item.file}`);
    }

    const timeTaken = `${item.file} was successfully migrated`;
    console.time(timeTaken);
    try {
      const migration = await migrationsDir.loadMigration(item.file);
      const { up } = migration;

      if (context) {
        const ctx = await context({ migrationFile: item.file, operation: 'up' })
        await up(db, client, ctx);
      } else {
        await up(db, client, {});
      }

    } catch (err) {
      const error = new Error(
        `Could not migrate up ${item.file}: ${err.message}`
      );
      error.stack = err.stack;
      error.migrated = migrated;

      if (!manualMigrationFileToApply) {
        await lock.clear(db);
      }

      throw error;
    }

    const changelogCollection = db.collection(changelogCollectionName);
    const { file, appliedManually } = item;
    const appliedAt = new Date();
    const migrationName = getName(configObject, file);

    try {
      const toInsert = {
        [nameField]: migrationName,
        [dateField]: appliedAt,
        ...(useFileHash === true && { fileHash: item.fileHash }),
      }

      if (appliedManually) {
        toInsert.appliedManually = true;

        if (useFileHash === true) {
          toInsert.fileHash = await migrationsDir.loadFileHash(item.file)
        }
      }

      await changelogCollection.insertOne(toInsert);
    } catch (err) {
      throw new Error(`Could not update changelog: ${err.message}`);
    }

    migrated.push(item.file);
    console.timeEnd(timeTaken);
  };

  if (manualMigrationFileToApply) {
    await migrateItem({ file: manualMigrationFileToApply, appliedManually: true });
  } else if (pendingItems.length) {
    await pEachSeries(pendingItems, migrateItem);
  } else {
    console.info('Nothing to migrate');
  }

  await lock.clear(db);
  return migrated;
};
