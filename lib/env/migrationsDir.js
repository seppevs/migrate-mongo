const fs = require("fs-extra");
const path = require("path");
const configFile = require("./configFile");

const DEFAULT_MIGRATIONS_DIR_NAME = "migrations";

function resolveMigrationsDirPath() {
  let migrationsDir;
  try {
    migrationsDir = configFile.read().migrationsDir; // eslint-disable-line
    // if config file doesn't have migrationsDir key, assume default 'migrations' dir
    if (!migrationsDir) {
      migrationsDir = DEFAULT_MIGRATIONS_DIR_NAME;
    }
  } catch (err) {
    // config file could not be read, assume default 'migrations' dir
    migrationsDir = DEFAULT_MIGRATIONS_DIR_NAME;
  }

  if (path.isAbsolute(migrationsDir)) {
    return migrationsDir;
  }
  return path.join(process.cwd(), migrationsDir);
}

module.exports = {
  resolve: resolveMigrationsDirPath,

  async shouldExist() {
    const migrationsDir = resolveMigrationsDirPath();
    try {
      await fs.stat(migrationsDir);
    } catch (err) {
      throw new Error(`migrations directory does not exist: ${migrationsDir}`);
    }
  },

  async shouldNotExist() {
    const migrationsDir = resolveMigrationsDirPath();
    const error = new Error(
      `migrations directory already exists: ${migrationsDir}`
    );

    try {
      await fs.stat(migrationsDir);
      throw error;
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw error;
      }
    }
  },

  async getFileNames() {
    const migrationsDir = resolveMigrationsDirPath();
    const files = await fs.readdir(migrationsDir);
    return files.filter(file => path.extname(file) === ".js");
  },

  loadMigration(fileName) {
    return require(path.join(resolveMigrationsDirPath(), fileName)); // eslint-disable-line
  }
};
