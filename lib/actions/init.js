const fs = require("fs-extra");
const path = require("path");

const beforeDir = require("../env/beforeDir");
const migrationsDir = require("../env/migrationsDir");
const afterDir = require("../env/afterDir");
const configFile = require("../env/configFile");

function copySampleConfigFile() {
  const source = path.join(__dirname, "../../samples/migrate-mongo-config.js");
  const destination = path.join(
    process.cwd(),
    configFile.DEFAULT_CONFIG_FILE_NAME
  );
  return fs.copy(source, destination);
}

function createMigrationsDirectories() {
  Promise.all([
    fs.ensureFile(path.join(process.cwd(), "before/.gitkeep")),
    fs.ensureFile(path.join(process.cwd(), "migrations/.gitkeep")),
    fs.ensureFile(path.join(process.cwd(), "after/.gitkeep")),
  ]);
}

module.exports = async () => {
  await beforeDir.shouldNotExist();
  await migrationsDir.shouldNotExist();
  await afterDir.shouldNotExist();
  await configFile.shouldNotExist();
  await copySampleConfigFile();
  return createMigrationsDirectories();
};
