const fs = require("fs-extra");
const path = require("path");
const configFile = require("./configFile");

const DEFAULT_ALWAYS_AFTER_DIR_NAME = "always-after";

async function resolveAlwaysAfterDirPath() {
  let alwaysAfterDir;
  try {
    const config = await configFile.read();
    alwaysAfterDir = config.alwaysAfterDir; // eslint-disable-line
    // if config file doesn't have migrationsDir key, assume default 'migrations' dir
    if (!alwaysAfterDir) {
      alwaysAfterDir = DEFAULT_ALWAYS_AFTER_DIR_NAME;
    }
  } catch (err) {
    // config file could not be read, assume default 'migrations' dir
    alwaysAfterDir = DEFAULT_ALWAYS_AFTER_DIR_NAME;
  }

  if (path.isAbsolute(alwaysAfterDir)) {
    return alwaysAfterDir;
  }
  return path.join(process.cwd(), alwaysAfterDir);
}

module.exports = {
  resolve: resolveAlwaysAfterDirPath,

  async shouldExist() {
    const alwaysAfterDir = await resolveAlwaysAfterDirPath();
    try {
      await fs.stat(alwaysAfterDir);
    } catch (err) {
      throw new Error(`always-after directory does not exist: ${alwaysAfterDir}`);
    }
  },

  async shouldNotExist() {
    const alwaysAfterDir = await resolveAlwaysAfterDirPath();
    const error = new Error(
      `always-after directory already exists: ${alwaysAfterDir}`
    );

    try {
      await fs.stat(alwaysAfterDir);
      throw error;
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw error;
      }
    }
  },

  async getFileNames() {
    const alwaysAfterDir = await resolveAlwaysAfterDirPath();
    const files = await fs.readdir(alwaysAfterDir);
    return files.filter(file => path.extname(file) === ".js");
  },

  async loadMigration(fileName) {
    const alwaysAfterDir = await resolveAlwaysAfterDirPath();
    return require(path.join(alwaysAfterDir, fileName)); // eslint-disable-line
  }
};
