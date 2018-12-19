const fs = require("fs-extra");
const path = require("path");
const configFile = require("./configFile");

const DEFAULT_ALWAYS_BEFORE_DIR_NAME = "always-before";

async function resolveAlwaysBeforeDirPath() {
  let alwaysBeforeDir;
  try {
    const config = await configFile.read();
    alwaysBeforeDir = config.alwaysBeforeDir; // eslint-disable-line
    // if config file doesn't have migrationsDir key, assume default 'migrations' dir
    if (!alwaysBeforeDir) {
      alwaysBeforeDir = DEFAULT_ALWAYS_BEFORE_DIR_NAME;
    }
  } catch (err) {
    // config file could not be read, assume default 'migrations' dir
    alwaysBeforeDir = DEFAULT_ALWAYS_BEFORE_DIR_NAME;
  }

  if (path.isAbsolute(alwaysBeforeDir)) {
    return alwaysBeforeDir;
  }
  return path.join(process.cwd(), alwaysBeforeDir);
}

module.exports = {
  resolve: resolveAlwaysBeforeDirPath,

  async shouldExist() {
    const alwaysBeforeDir = await resolveAlwaysBeforeDirPath();
    try {
      await fs.stat(alwaysBeforeDir);
    } catch (err) {
      throw new Error(`always-before directory does not exist: ${alwaysBeforeDir}`);
    }
  },

  async shouldNotExist() {
    const alwaysBeforeDir = await resolveAlwaysBeforeDirPath();
    const error = new Error(
      `always-before directory already exists: ${alwaysBeforeDir}`
    );

    try {
      await fs.stat(alwaysBeforeDir);
      throw error;
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw error;
      }
    }
  },

  async getFileNames() {
    const alwaysBeforeDir = await resolveAlwaysBeforeDirPath();
    const files = await fs.readdir(alwaysBeforeDir);
    return files.filter(file => path.extname(file) === ".js");
  },

  async loadMigration(fileName) {
    const alwaysBeforeDir = await resolveAlwaysBeforeDirPath();
    return require(path.join(alwaysBeforeDir, fileName)); // eslint-disable-line
  }
};
