const { find } = require("lodash");
const migrationsDir = require("../env/migrationsDir");
const config = require("../env/config");

module.exports = async (mongoConnectionDb) => {
  await migrationsDir.shouldExist();
  await config.shouldExist();
  const fileNames = await migrationsDir.getFileNames();

  const { importsCollectionName, useFileHash } = await config.read();
  const importsCollection = mongoConnectionDb.collection(importsCollectionName);
  const imports = await importsCollection.find({}).toArray();


  const useFileHashTest = useFileHash === true;
  const statusTable = await Promise.all(fileNames.map(async (fileName) => {
    let fileHash;
    let findTest = { fileName };
    if (useFileHashTest) {
      fileHash = await migrationsDir.loadFileHash(fileName);
      findTest = { fileName, fileHash };
    }
    const itemInLog = find(imports, findTest);
    const appliedAt = itemInLog ? itemInLog.appliedAt.toJSON() : "PENDING";
    return useFileHash ? { fileName, fileHash, appliedAt } : { fileName, appliedAt };
  }));

  return statusTable;
};
