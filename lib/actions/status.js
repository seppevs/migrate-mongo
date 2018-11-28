const { find } = require("lodash");
const migrationsDir = require("../env/migrationsDir");
const configFile = require("../env/configFile");
const getJavaScriptFilesFromPath = require("../utils/getJavaScriptFilesFromPath");

module.exports = async db => {
  await migrationsDir.shouldExist();
  await configFile.shouldExist();
  
  const migrationsDirPath = migrationsDir.resolveMigrationsDirPath();
  const fileNames = await getJavaScriptFilesFromPath(migrationsDirPath);

  const config = await configFile.read();
  const collectionName = config.changelogCollectionName;
  const collection = db.collection(collectionName);
  const changelog = await collection.find({}).toArray();

  const statusTable = fileNames.map(fileName => {
    const itemInLog = find(changelog, { fileName });
    const appliedAt = itemInLog ? itemInLog.appliedAt.toJSON() : "PENDING";
    return { fileName, appliedAt };
  });

  return statusTable;
};
