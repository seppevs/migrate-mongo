const fs = require("fs-extra");
const path = require("path");
const url = require("url");
const { get } = require("lodash");
const moduleLoader = require('../utils/module-loader');

const DEFAULT_CONFIG_FILE_NAME = "migrate-mongo-config.js";
const DEFAULT_NAME_FIELD = 'fileName';
const DEFAULT_DATE_FIELD = 'appliedAt';

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

  setConfigDefaults(config) {
    if (!config.nameField)
      config.nameField = DEFAULT_NAME_FIELD;

    if (!config.dateField)
      config.dateField = DEFAULT_DATE_FIELD;

    return config
  },

  async read() {
    if (customConfigContent) {
      return customConfigContent;
    }
    const configPath = getConfigPath();
    try {
      const config = await Promise.resolve(moduleLoader.require(configPath));
      return this.setConfigDefaults(config)
    } catch (e) {
      if (e.code === 'ERR_REQUIRE_ESM') {
        const loadedImport = await moduleLoader.import(url.pathToFileURL(configPath));
        const config = loadedImport.default
        return this.setConfigDefaults(config)
      }
      throw e;
    }
  }
};
