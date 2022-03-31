const fs = require("fs-extra");
const path = require("path");

const migrationsDir = require("../env/migrationsDir");
const config = require("../env/config");

function copySampleConfigFile() {
  const moduleSystem = global.options.module === 'esm' ? 'esm' : 'commonjs';
  const source = path.join(__dirname, `../../samples/${moduleSystem}/migrate-mongo-config.js`);
  const destination = path.join(
    process.cwd(),
    config.DEFAULT_CONFIG_FILE_NAME
  );
  return fs.copy(source, destination);
}

function createMigrationsDirectory() {
  return fs.mkdirs(path.join(process.cwd(), "migrations"));
}

module.exports = async () => {
  await migrationsDir.shouldNotExist();
  await config.shouldNotExist();
  await copySampleConfigFile();
  return createMigrationsDirectory();
};
