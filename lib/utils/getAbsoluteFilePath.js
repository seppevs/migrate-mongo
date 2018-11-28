const path = require("path");

const getAbsoluteFilePath = migrationDir =>
  path.isAbsolute(migrationDir)
    ? migrationDir
    : path.join(process.cwd(), migrationDir);

module.exports = getAbsoluteFilePath;
