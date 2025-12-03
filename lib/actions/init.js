const fs = require("fs/promises");
const path = require("path");

const migrationsDir = require("../env/migrationsDir");
const config = require("../env/config");

async function copySampleConfigFile() {
  const moduleSystem = global.options.module === 'esm' ? 'esm' : 'commonjs';
  const source = path.join(__dirname, `../../samples/${moduleSystem}/migrate-mongo-config.js`);
  const destination = path.join(
    process.cwd(),
    config.DEFAULT_CONFIG_FILE_NAME
  );
  await fs.cp(source, destination);
}

async function createMigrationsDirectory() {
  await fs.mkdir(path.join(process.cwd(), "migrations"), { recursive: true });
}

module.exports = async () => {
  await migrationsDir.shouldNotExist();
  await config.shouldNotExist();
  await copySampleConfigFile();
  await createMigrationsDirectory();
};
