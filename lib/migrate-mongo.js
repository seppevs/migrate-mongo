const init = require("./actions/init");
const create = require("./actions/create");
const createAlwaysBefore = require("./actions/create-always-before");
const createAlwaysAfter = require("./actions/create-always-after");
const up = require("./actions/up");
const down = require("./actions/down");
const status = require("./actions/status");
const database = require("./env/database");
const config = require("./env/configFile");

module.exports = {
  init,
  create,
  createAlwaysBefore,
  createAlwaysAfter,
  up,
  down,
  status,
  database,
  config
};
