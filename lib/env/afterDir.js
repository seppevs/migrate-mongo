const fs = require("fs-extra");
const path = require("path");
const configFile = require("./configFile");

const DEFAULT_AFTER_DIR_NAME = "after";

async function resolveAfterDirPath() {
  let afterDir;
  try {
    const config = await configFile.read();
    afterDir = config.afterDir; // eslint-disable-line
    // if config file doesn't have migrationsDir key, assume default 'migrations' dir
    if (!afterDir) {
      afterDir = DEFAULT_AFTER_DIR_NAME;
    }
  } catch (err) {
    // config file could not be read, assume default 'migrations' dir
    afterDir = DEFAULT_AFTER_DIR_NAME;
  }

  if (path.isAbsolute(afterDir)) {
    return afterDir;
  }
  return path.join(process.cwd(), afterDir);
}

module.exports = {
  resolve: resolveAfterDirPath,

  async shouldExist() {
    const afterDir = await resolveAfterDirPath();
    try {
      await fs.stat(afterDir);
    } catch (err) {
      throw new Error(`after directory does not exist: ${afterDir}`);
    }
  },

  async shouldNotExist() {
    const afterDir = await resolveAfterDirPath();
    const error = new Error(
      `after directory already exists: ${afterDir}`
    );

    try {
      await fs.stat(afterDir);
      throw error;
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw error;
      }
    }
  },

  async getFileNames() {
    const afterDir = await resolveAfterDirPath();
    const files = await fs.readdir(afterDir);
    return files.filter(file => path.extname(file) === ".js");
  },

  async loadMigration(fileName) {
    const afterDir = await resolveAfterDirPath();
    return require(path.join(afterDir, fileName)); // eslint-disable-line
  }
};
