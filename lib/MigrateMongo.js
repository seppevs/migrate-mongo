const up = require("./instance_methods/up");
const down = require("./instance_methods/down");
const status = require("./instance_methods/status");
const database = require("./instance_methods/database");
const validateConfig = require("./utils/validateConfig");

class MigrateMongo {
  constructor(config) {
    if (!config) {
      throw new Error("No config passed to MigrateMongo instance");
    }
    validateConfig(config);

    this.config = config;

    const statusWithConfig = status(config);

    this.up = up(config, statusWithConfig);
    this.down = down(config, statusWithConfig);
    this.status = statusWithConfig;
    this.database = database(config);
  }
}

module.exports = MigrateMongo;
