const fs = require("fs-extra");
const path = require("path");
const date = require("../utils/date");
const migrationsDir = require("../env/migrationsDir");
const config = require("../env/config");
const _ = require("lodash");

module.exports = async description => {
  if (!description) {
    throw new Error("Missing parameter: description");
  }
  await migrationsDir.shouldExist();
  const migrationsDirPath = await migrationsDir.resolve();
  const migrationExtension = await migrationsDir.resolveMigrationFileExtension();

  // Check if there is a 'sample-migration.js' file in migrations dir - if there is, use that
  let source;
  if (await migrationsDir.doesSampleMigrationExist()) {
    source = await migrationsDir.resolveSampleMigrationPath();
  } else {
    const configContent = await config.read();
    source = path.join(__dirname, `../../samples/${configContent.moduleSystem}/migration.js`);
  }

  let formatting;
  try {
    const configContent = await config.read();
    formatting = _.get(configContent, "timestampFormat");
  } catch (err) {
    // config file could not be read, assume default formatting
  }

  const filename = `${date.nowAsString(formatting)}-${description
    .split(" ")
    .join("_")}${migrationExtension}`;
  const destination = path.join(migrationsDirPath, filename);
  await fs.copy(source, destination);
  return filename;
};
