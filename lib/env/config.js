const fs = require("fs-extra");
const path = require("path");
const url = require("url");
const { get } = require("lodash");
const moduleLoader = require('../utils/module-loader');

const DEFAULT_CONFIG_FILE_NAME = "migrate-mongo-config.js";

let customConfigContent = null;

function getConfigPath() {
  const fileOptionValue = get(global.options, "file");
  if (!fileOptionValue) {
    return path.join(process.cwd(), DEFAULT_CONFIG_FILE_NAME);
  }

  if (path.isAbsolute(fileOptionValue)) {
    return fileOptionValue;
  }
  return path.join(process.cwd(), fileOptionValue);
}

function setMigrationsDirCommandLineParamInConfig(config) {
  const getMigrationDirCommandLineParameter = () => {
    const args = process.argv.slice(2);
    const mdIndex = args.indexOf('-md');
    return mdIndex !== -1 ? args[mdIndex + 1] : null;
  };

  // deep copy of config
  const rtn = JSON.parse(JSON.stringify(config));

  const md = getMigrationDirCommandLineParameter();
  if (md) {
    rtn.migrationsDir = md;
  }

  return rtn;
}

module.exports = {
  DEFAULT_CONFIG_FILE_NAME,

  set(configContent) {
    customConfigContent = configContent
  },

  async shouldExist() {
    if (!customConfigContent) {
      const configPath = getConfigPath();
      try {
        await fs.stat(configPath);
      } catch (err) {
        throw new Error(`config file does not exist: ${configPath}`);
      }
    }
  },

  async shouldNotExist() {
    if (!customConfigContent) {
      const configPath = getConfigPath();
      const error = new Error(`config file already exists: ${configPath}`);
      try {
        await fs.stat(configPath);
        throw error;
      } catch (err) {
        if (err.code !== "ENOENT") {
          throw error;
        }
      }
    }
  },

  getConfigFilename() {
    return path.basename(getConfigPath());
  },

  async read() {
    if (customConfigContent) {
      return customConfigContent;
    }
    const configPath = getConfigPath();
    try {
        let config = moduleLoader.require(configPath);

        config = setMigrationsDirCommandLineParamInConfig(config);

        return config;
    } catch (e) {
      if (e.code === 'ERR_REQUIRE_ESM') {
        const loadedImport = await moduleLoader.import(url.pathToFileURL(configPath));
        return loadedImport.default
      }
      throw e;
    }
  }
};
