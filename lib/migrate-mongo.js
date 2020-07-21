const init = require("./actions/init");
const create = require("./actions/create");
const up = require("./actions/up");
const down = require("./actions/down");
const status = require("./actions/status");
const database = require("./env/database");
const config = require("./env/config");

module.exports = {
  init,
  create,
  up,
  down,
  status,
  database,
  config
};
