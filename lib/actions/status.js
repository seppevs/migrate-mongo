const { find } = require("lodash");
const migrationsDir = require("../env/migrationsDir");
const config = require("../env/config");
const getName = require('../utils/name');

module.exports = async db => {
  await migrationsDir.shouldExist();
  await config.shouldExist();
  const configObject = await config.read()
  const {
    changelogCollectionName,
    useFileHash,
    nameField,
    dateField,
  } = configObject;

  const changelogCollection = db.collection(changelogCollectionName);

  const fileNames = await migrationsDir.getFileNames();
  const changelog = await changelogCollection.find({}).toArray();

  const useFileHashTest = useFileHash === true;
  return Promise.all(fileNames.map(async (fileName) => {
    const migrationName = getName(configObject, fileName);

    let fileHash;
    let findTest = { [nameField]: migrationName };
    if (useFileHashTest) {
      fileHash = await migrationsDir.loadFileHash(fileName);
      findTest = { [nameField]: migrationName, fileHash };
    }

    const itemInLog = find(changelog, findTest);
    const appliedAt = itemInLog ? itemInLog[dateField].toJSON() : "PENDING";
    return {
      [nameField]: migrationName,
      [dateField]: appliedAt,
      file: fileName,
      ...(useFileHash && { fileHash }),
    };
  }));
};
