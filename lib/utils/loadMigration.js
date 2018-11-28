const path = require("path");
const getAbsoluteFilePath = require("./getAbsoluteFilePath");

const loadMigration = (migrationsDirPath, fileName) => {
  if (!migrationsDirPath) {
    throw new Error("No migrations path found");
  }
  if (!fileName) {
    throw new Error("No file name given");
  }
  const filePath = path.join(getAbsoluteFilePath(migrationsDirPath), fileName);

  return require(filePath);
};

module.exports = loadMigration;
