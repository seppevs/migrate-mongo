const fs = require("fs-extra");
const path = require("path");

const alwaysBeforeDir = require("../env/alwaysBeforeDir");
const migrationsDir = require("../env/migrationsDir");
const alwaysAfterDir = require("../env/alwaysAfterDir");
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
    fs.mkdirs(path.join(process.cwd(), "always-before")),
    fs.mkdirs(path.join(process.cwd(), "migrations")),
    fs.mkdirs(path.join(process.cwd(), "always-after"))
  ]);
}

module.exports = async () => {
  await alwaysBeforeDir.shouldNotExist();
  await migrationsDir.shouldNotExist();
  await alwaysAfterDir.shouldNotExist();
  await configFile.shouldNotExist();
  await copySampleConfigFile();
  return createMigrationsDirectories();
};
