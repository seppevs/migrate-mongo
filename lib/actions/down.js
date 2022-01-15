const _ = require("lodash");

const status = require("./status");
const config = require("../env/config");
const migrationsDir = require("../env/migrationsDir");

module.exports = async (db, client) => {
  const downgraded = [];
  const statusItems = await status(db);
  const {
    changelogCollectionName,
    dateField,
    nameField,
    context,
  } = await config.read();
  const appliedItems = statusItems.filter(item => item[dateField] !== "PENDING");
  const lastAppliedItem = _.last(appliedItems);

  if (lastAppliedItem) {
    try {
      const migration = await migrationsDir.loadMigration(lastAppliedItem.file);
      const {down} = migration;

      if (context) {
        const ctx = await context({ migrationFile: lastAppliedItem.file, operation: 'down' })
        await down(db, client, ctx);
      } else {
        await down(db, client, {});
      }

    } catch (err) {
      throw new Error(
        `Could not migrate down ${lastAppliedItem.file}: ${err.message}`
      );
    }
    const changelogCollection = db.collection(changelogCollectionName);
    try {
      await changelogCollection.deleteOne({ [nameField]: lastAppliedItem[nameField] });
      downgraded.push(lastAppliedItem.file);
    } catch (err) {
      throw new Error(`Could not update changelog: ${err.message}`);
    }
  }

  return downgraded;
};
