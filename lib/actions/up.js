const status = require("./status");
const config = require("../env/config");
const migrationsDir = require("../env/migrationsDir");
const lock = require("../utils/lock");

module.exports = async (db, client) => {
  const statusItems = await status(db);
  const pendingItems = statusItems.filter(item => item.appliedAt === "PENDING");
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
      await migration.up(db, client);

    } catch (err) {
      const error = new Error(
        `Could not migrate up ${item.fileName}: ${err.message}`
      );
      error.stack = err.stack;
      error.migrated = migrated;
      if (err.errInfo) {
        error.additionalInfo = err.errInfo;
      }
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

  for (const item of pendingItems) {
    await migrateItem(item);
  }
  await lock.clear(db);
  return migrated;
};
