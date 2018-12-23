const init = require("./actions/init");
const create = require("./actions/create");
const createBefore = require("./actions/create-before");
const createAfter = require("./actions/create-after");
const up = require("./actions/up");
const down = require("./actions/down");
const status = require("./actions/status");
const database = require("./env/database");
const config = require("./env/configFile");

module.exports = {
  init,
  create,
  createBefore,
  createAfter,
  up,
  down,
  status,
  database,
  config
};
