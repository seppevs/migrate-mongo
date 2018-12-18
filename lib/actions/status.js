const { find, findLast } = require("lodash");
const alwaysDir = require("../env/alwaysDir");
const migrationsDir = require("../env/migrationsDir");
const configFile = require("../env/configFile");

module.exports = async db => {
  await alwaysDir.shouldExist();
  await migrationsDir.shouldExist();
  await configFile.shouldExist();

  const config = await configFile.read();
  const collectionName = config.changelogCollectionName;
  const collection = db.collection(collectionName);
  const changelog = await collection.find({}).toArray();

  const alwaysFileNames = await alwaysDir.getFileNames();
  const alwaysItemStatus = alwaysFileNames.map(fileName => {
    const itemInLog = findLast(changelog, { fileName });
    const appliedAt = itemInLog ? itemInLog.appliedAt.toJSON() : "PENDING";
    return { type: "ALWAYS", fileName, appliedAt };
  });

  const migrationFileNames = await migrationsDir.getFileNames();
  const migrationItemStatus = migrationFileNames.map(fileName => {
    const itemInLog = find(changelog, { fileName });
    const appliedAt = itemInLog ? itemInLog.appliedAt.toJSON() : "PENDING";
    return { type: "MIGRATION", fileName, appliedAt };
  });

  const statusTable = alwaysItemStatus.concat(migrationItemStatus);
  return statusTable;
};
