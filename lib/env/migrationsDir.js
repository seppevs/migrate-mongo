const fs = require("fs-extra");
const path = require("path");
const config = require("./config");

const DEFAULT_MIGRATIONS_DIR_NAME = "migrations";
const DEFAULT_MIGRATION_EXT = ".js";

async function resolveMigrationsDirPath() {
  let migrationsDir;
  try {
    const configContent = await config.read();
    migrationsDir = configContent.migrationsDir; // eslint-disable-line
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

async function resolveMigrationFileExtension() {
  let migrationFileExtension;
  try {
    const configContent = await config.read();
    migrationFileExtension = configContent.migrationFileExtension || DEFAULT_MIGRATION_EXT;
  } catch (err) {
    // config file could not be read, assume default extension
    migrationFileExtension = DEFAULT_MIGRATION_EXT;
  }

  if (migrationFileExtension && !migrationFileExtension.startsWith('.')) {
    throw new Error('migrationFileExtension must start with dot');
  }

  return migrationFileExtension;
}

module.exports = {
  resolve: resolveMigrationsDirPath,
  resolveSampleMigrationPath,
  resolveMigrationFileExtension,

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
    const migrationExt = await resolveMigrationFileExtension();
    const files = await fs.readdir(migrationsDir);
    return files.filter(file => path.extname(file) === migrationExt && path.basename(file) !== 'sample-migration.js').sort();
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
