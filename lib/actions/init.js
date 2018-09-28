const fs = require("fs-extra");
const path = require("path");

const migrationsDir = require("../env/migrationsDir");
const configFile = require("../env/configFile");

function copySampleConfigFile() {
  const source = path.join(__dirname, "../../samples/config.js");
  const destination = path.join(process.cwd(), "config.js");
  return fs.copy(source, destination);
}

function createMigrationsDirectory() {
  return fs.mkdirs(path.join(process.cwd(), "migrations"));
}

module.exports = async () => {
  await migrationsDir.shouldNotExist();
  await configFile.shouldNotExist();
  await copySampleConfigFile();
  return createMigrationsDirectory();
};
