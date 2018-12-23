const fs = require("fs-extra");
const path = require("path");
const configFile = require("./configFile");

const DEFAULT_BEFORE_DIR_NAME = "before";

async function resolveBeforeDirPath() {
  let beforeDir;
  try {
    const config = await configFile.read();
    beforeDir = config.beforeDir; // eslint-disable-line
    // if config file doesn't have migrationsDir key, assume default 'migrations' dir
    if (!beforeDir) {
      beforeDir = DEFAULT_BEFORE_DIR_NAME;
    }
  } catch (err) {
    // config file could not be read, assume default 'migrations' dir
    beforeDir = DEFAULT_BEFORE_DIR_NAME;
  }

  if (path.isAbsolute(beforeDir)) {
    return beforeDir;
  }
  return path.join(process.cwd(), beforeDir);
}

module.exports = {
  resolve: resolveBeforeDirPath,

  async shouldExist() {
    const beforeDir = await resolveBeforeDirPath();
    try {
      await fs.stat(beforeDir);
    } catch (err) {
      throw new Error(`before directory does not exist: ${beforeDir}`);
    }
  },

  async shouldNotExist() {
    const beforeDir = await resolveBeforeDirPath();
    const error = new Error(
      `before directory already exists: ${beforeDir}`
    );

    try {
      await fs.stat(beforeDir);
      throw error;
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw error;
      }
    }
  },

  async getFileNames() {
    const beforeDir = await resolveBeforeDirPath();
    const files = await fs.readdir(beforeDir);
    return files.filter(file => path.extname(file) === ".js");
  },

  async loadMigration(fileName) {
    const beforeDir = await resolveBeforeDirPath();
    return require(path.join(beforeDir, fileName)); // eslint-disable-line
  }
};
