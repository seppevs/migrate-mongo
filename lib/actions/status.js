const { find, findLast } = require("lodash");
const beforeDir = require("../env/beforeDir");
const migrationsDir = require("../env/migrationsDir");
const afterDir = require("../env/afterDir");
const configFile = require("../env/configFile");

module.exports = async db => {
  await beforeDir.shouldExist();
  await migrationsDir.shouldExist();
  await afterDir.shouldExist();
  await configFile.shouldExist();

  const config = await configFile.read();
  const collectionName = config.changelogCollectionName;
  const collection = db.collection(collectionName);
  const changelog = await collection.find({}).toArray();

  const alwaysBeforeFileNames = await beforeDir.getFileNames();
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

  const alwaysAfterFileNames = await afterDir.getFileNames();
  const alwaysAfterItems = alwaysAfterFileNames.map(fileName => {
    const itemInLog = findLast(changelog, { fileName });
    const appliedAt = itemInLog ? itemInLog.appliedAt.toJSON() : "PENDING";
    return { type: "ALWAYS_AFTER", fileName, appliedAt };
  });

  const statusTable = alwaysBeforeItems.concat(migrationItems).concat(alwaysAfterItems);
  return statusTable;
};
