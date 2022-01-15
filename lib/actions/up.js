/* eslint no-console: 0 */
const _ = require("lodash");
const pEachSeries = require("p-each-series");

const status = require("./status");
const config = require("../env/config");
const migrationsDir = require("../env/migrationsDir");
const getName = require('../utils/name');

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

  const migrateItem = async item => {
    console.info(`Migrating ${item.file}`);
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
      throw error;
    }

    const changelogCollection = db.collection(changelogCollectionName);
    const { file, fileHash } = item;
    const migrationName = getName(configObject, file);
    const appliedAt = new Date();

    try {
      await changelogCollection.insertOne({
        [nameField]: migrationName,
        [dateField]: appliedAt,
        ...(useFileHash === true && { fileHash }),
      });
    } catch (err) {
      throw new Error(`Could not update changelog: ${err.message}`);
    }
    migrated.push(item.file);
    console.timeEnd(timeTaken);
  };

  if (pendingItems.length)
    await pEachSeries(pendingItems, migrateItem);
  else
    console.info('Nothing to migrate');


  return migrated;
};
