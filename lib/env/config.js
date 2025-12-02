const fs = require("fs-extra");
const path = require("path");
const url = require("url");
const moduleLoader = require('../utils/module-loader');

const DEFAULT_CONFIG_FILE_NAME = "migrate-mongo-config.js";

let customConfigContent = null;

function getConfigPath() {
  const fileOptionValue = global.options?.file ?? null;
  if (!fileOptionValue) {
    return path.join(process.cwd(), DEFAULT_CONFIG_FILE_NAME);
  }

  if (path.isAbsolute(fileOptionValue)) {
    return fileOptionValue;
  }
  return path.join(process.cwd(), fileOptionValue);
}

function getModuleExports(module) {
  // If ESM module format need to return default export
  return module.default ? module.default : module;
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
      let config = await moduleLoader.require(configPath);
      config = getModuleExports(config);
      
      // Override migrationsDir if -md CLI option is provided
      if (global.options?.migrationsDir) {
        config = { ...config, migrationsDir: global.options.migrationsDir };
      }
      
      return config;
    } catch (e) {
      if (e.code === 'ERR_REQUIRE_ESM' || e.code === 'ERR_REQUIRE_ASYNC_MODULE') {
        let loadedImport = await moduleLoader.import(url.pathToFileURL(configPath));
        let config = getModuleExports(loadedImport);
        
        // Override migrationsDir if -md CLI option is provided
        if (global.options?.migrationsDir) {
          config = { ...config, migrationsDir: global.options.migrationsDir };
        }
        
        return config;
      }
      throw e;
    }
  }
};
