const { find, findLast } = require("lodash");
const alwaysBeforeDir = require("../env/alwaysBeforeDir");
const migrationsDir = require("../env/migrationsDir");
const alwaysAfterDir = require("../env/alwaysAfterDir");
const configFile = require("../env/configFile");

module.exports = async db => {
  await alwaysBeforeDir.shouldExist();
  await migrationsDir.shouldExist();
  await alwaysAfterDir.shouldExist();
  await configFile.shouldExist();

  const config = await configFile.read();
  const collectionName = config.changelogCollectionName;
  const collection = db.collection(collectionName);
  const changelog = await collection.find({}).toArray();

  const alwaysBeforeFileNames = await alwaysBeforeDir.getFileNames();
  const alwaysBeforeItems = alwaysBeforeFileNames.map(fileName => {
    const itemInLog = findLast(changelog, { fileName });
    const appliedAt = itemInLog ? itemInLog.appliedAt.toJSON() : "PENDING";
    return { type: "ALWAYS_BEFORE", fileName, appliedAt };
  });

  const migrationFileNames = await migrationsDir.getFileNames();
  const migrationItems = migrationFileNames.map(fileName => {
    const itemInLog = find(changelog, { fileName });
    const appliedAt = itemInLog ? itemInLog.appliedAt.toJSON() : "PENDING";
    return { type: "MIGRATION", fileName, appliedAt };
  });

  const alwaysAfterFileNames = await alwaysAfterDir.getFileNames();
  const alwaysAfterItems = alwaysAfterFileNames.map(fileName => {
    const itemInLog = findLast(changelog, { fileName });
    const appliedAt = itemInLog ? itemInLog.appliedAt.toJSON() : "PENDING";
    return { type: "ALWAYS_AFTER", fileName, appliedAt };
  });

  const statusTable = alwaysBeforeItems.concat(migrationItems).concat(alwaysAfterItems);
  return statusTable;
};
