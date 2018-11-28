const { find } = require("lodash");
const getJavaScriptFilesFromPath = require("../utils/getJavaScriptFilesFromPath");
const getAbsoluteFilePath = require("../utils/getAbsoluteFilePath");

const status = config => async db => {
  const migrationsDir = getAbsoluteFilePath(config.migrationsDir);
  const fileNames = await getJavaScriptFilesFromPath(migrationsDir);

  let collectionName = "changelog";

  if (config.changelogCollectionName) {
    collectionName = config.changelogCollectionName;
  } else {
    collectionName = "changelog";
    console.warn(
      'No changelogCollectionName found in confg - defaulting to "changelog"'
    );
  }

  const collection = db.collection(collectionName);
  const changelog = await collection.find({}).toArray();

  const statusTable = fileNames.map(fileName => {
    const itemInLog = find(changelog, { fileName });
    const appliedAt = itemInLog ? itemInLog.appliedAt.toJSON() : "PENDING";
    return { fileName, appliedAt };
  });

  return statusTable;
};

module.exports = status;
