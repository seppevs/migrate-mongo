const fs = require("fs-extra");
const path = require("path");
const configFile = require("./configFile");

const DEFAULT_MIGRATIONS_DIR_NAME = "migrations";

async function resolveMigrationsDirPath() {
  let migrationsDir;
  try {
    const config = await configFile.read();
    migrationsDir = config.migrationsDir; // eslint-disable-line
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

async function resolveSampleMigrationPath() {
  const migrationsDir = await resolveMigrationsDirPath();
  return path.join(migrationsDir, 'sample-migration.js');
}

module.exports = {
  resolve: resolveMigrationsDirPath,
  resolveSampleMigrationPath,

  async shouldExist() {
    const migrationsDir = await resolveMigrationsDirPath();
    try {
      await fs.stat(migrationsDir);
    } catch (err) {
      throw new Error(`migrations directory does not exist: ${migrationsDir}`);
    }
  },

  async shouldNotExist() {
    const migrationsDir = await resolveMigrationsDirPath();
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
    const migrationsDir = await resolveMigrationsDirPath();
    const files = await fs.readdir(migrationsDir);
    return files.filter(file => path.extname(file) === ".js" && path.basename(file) !== 'sample-migration.js');
  },

  async loadMigration(fileName) {
    const migrationsDir = await resolveMigrationsDirPath();
    return require(path.join(migrationsDir, fileName)); // eslint-disable-line
  },

  async doesSampleMigrationExist() {
    const samplePath = await resolveSampleMigrationPath();
    try {
      await fs.stat(samplePath);
      return true;
    } catch (err) {
      return false;
    }
  },
};
