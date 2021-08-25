const _ = require("lodash");
const { promisify } = require("util");
const fnArgs = require('fn-args');

const status = require("./status");
const config = require("../env/config");
const migrationsDir = require("../env/migrationsDir");
const hasCallback = require('../utils/has-callback');

module.exports = async (db, client) => {
  const downgraded = [];
  const statusItems = await status(db);
  const {
    changelogCollectionName,
    dateField,
    nameField,
  } = await config.read();
  const appliedItems = statusItems.filter(item => item[dateField] !== "PENDING");
  const lastAppliedItem = _.last(appliedItems);

  if (lastAppliedItem) {
    try {
      const migration = await migrationsDir.loadMigration(lastAppliedItem.file);
      const down = hasCallback(migration.down) ? promisify(migration.down) : migration.down;

      if (hasCallback(migration.down) && fnArgs(migration.down).length < 3) {
        // support old callback-based migrations prior to migrate-mongo 7.x.x
        await down(db);
      } else {
        await down(db, client);
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
