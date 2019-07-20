const fs = require("fs-extra");
const path = require("path");
const date = require("../utils/date");
const migrationsDir = require("../env/migrationsDir");

module.exports = async description => {
  if (!description) {
    throw new Error("Missing parameter: description");
  }
  await migrationsDir.shouldExist();
  const migrationsDirPath = await migrationsDir.resolve();

  // Check if there is a 'sample-migration.js' file in migrations dir - if there is, use that
  const migrationDirSample = path.join(migrationsDirPath, 'sample-migration.js');
  let source;
  try {
    await fs.access(migrationDirSample); // check if file exists
    source = migrationDirSample;
  } catch (e) {
    source = path.join(__dirname, "../../samples/migration.js");
  }

  const filename = `${date.nowAsString()}-${description
    .split(" ")
    .join("_")}.js`;
  const destination = path.join(migrationsDirPath, filename);
  await fs.copy(source, destination);
  return filename;
};
