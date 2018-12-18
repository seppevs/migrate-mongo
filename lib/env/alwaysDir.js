const fs = require("fs-extra");
const path = require("path");
const configFile = require("./configFile");

const DEFAULT_ALWAYS_DIR_NAME = "always";

async function resolveAlwaysDirPath() {
  let alwaysDir;
  try {
    const config = await configFile.read();
    alwaysDir = config.alwaysDir; // eslint-disable-line
    // if config file doesn't have migrationsDir key, assume default 'migrations' dir
    if (!alwaysDir) {
      alwaysDir = DEFAULT_ALWAYS_DIR_NAME;
    }
  } catch (err) {
    // config file could not be read, assume default 'migrations' dir
    alwaysDir = DEFAULT_ALWAYS_DIR_NAME;
  }

  if (path.isAbsolute(alwaysDir)) {
    return alwaysDir;
  }
  return path.join(process.cwd(), alwaysDir);
}

module.exports = {
  resolve: resolveAlwaysDirPath,

  async shouldExist() {
    const alwaysDir = await resolveAlwaysDirPath();
    try {
      await fs.stat(alwaysDir);
    } catch (err) {
      throw new Error(`always directory does not exist: ${alwaysDir}`);
    }
  },

  async shouldNotExist() {
    const alwaysDir = await resolveAlwaysDirPath();
    const error = new Error(
      `always directory already exists: ${alwaysDir}`
    );

    try {
      await fs.stat(alwaysDir);
      throw error;
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw error;
      }
    }
  },

  async getFileNames() {
    const alwaysDir = await resolveAlwaysDirPath();
    const files = await fs.readdir(alwaysDir);
    return files.filter(file => path.extname(file) === ".js");
  },

  async loadMigration(fileName) {
    const alwaysDir = await resolveAlwaysDirPath();
    return require(path.join(alwaysDir, fileName)); // eslint-disable-line
  }
};
