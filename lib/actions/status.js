const _find = require("lodash.find");
const migrationsDir = require("../env/migrationsDir");
const config = require("../env/config");

module.exports = async db => {
  await migrationsDir.shouldExist();
  await config.shouldExist();
  const fileNames = await migrationsDir.getFileNames();

  const { changelogCollectionName, useFileHash } = await config.read();
  const changelogCollection = db.collection(changelogCollectionName);
  const changelog = await changelogCollection.find({}).toArray();


  const useFileHashTest = useFileHash === true;
  const statusTable = await Promise.all(fileNames.map(async (fileName) => {
    let fileHash;
    let findTest = { fileName };
    if (useFileHashTest) {
      fileHash = await migrationsDir.loadFileHash(fileName);
      findTest = { fileName, fileHash };
    }
    const itemInLog = _find(changelog, findTest);
    const appliedAt = itemInLog ? itemInLog.appliedAt.toJSON() : "PENDING";
    const migrationBlock = itemInLog ? itemInLog.migrationBlock : undefined;
    return useFileHash ? { fileName, fileHash, appliedAt, migrationBlock } : { fileName, appliedAt, migrationBlock };
  }));

  return statusTable;
};
