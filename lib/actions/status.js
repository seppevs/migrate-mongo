const { find } = require("lodash");
const migrationsDir = require("../env/migrationsDir");
const config = require("../env/config");

module.exports = async (db, shouldLoadFromDatabase) => {
  await migrationsDir.shouldExist();
  await config.shouldExist();
  const fileNames = await migrationsDir.getFileNames();

  const { changelogCollectionName, useFileHash, saveFileContents } = await config.read();
  const changelogCollection = db.collection(changelogCollectionName);
  const changelog = await changelogCollection.find({}).toArray();

  const useFileHashTest = useFileHash === true;
  const statusTable = await Promise.all(fileNames.map(async (fileName) => {
    let fileHash;
    const findTest = { fileName };
    if (useFileHashTest) {
      fileHash = await migrationsDir.loadFileHash(fileName);
      findTest.fileHash = fileHash;
    }
    const itemInLog = find(changelog, findTest);
    if (itemInLog) {
      const indexInLog = changelog.indexOf(itemInLog);
      changelog.splice(indexInLog, 1);
    }
    findTest.appliedAt = itemInLog ? itemInLog.appliedAt.toJSON() : "PENDING";
    if (saveFileContents) {
      const fileContents = await migrationsDir.loadFileContents(fileName);
      findTest.fileContents = fileContents.toString();
    }
    return findTest;
  }));

  // if we have saved migrations in the database, we need to add any migration which is in the database without a file
  if (shouldLoadFromDatabase === true) {
    changelog.forEach(migrationInDb => {
      const migration = {
        fileName: migrationInDb.fileName,
      }
      if (migrationInDb.fileHash) {
        migration.fileHash = migrationInDb.fileHash;
      }
      migration.appliedAt = migrationInDb.appliedAt.toJSON();
      migration.fileContents = migrationInDb.fileContents;
      statusTable.push(migration);
    });
  }

  return statusTable;
};
