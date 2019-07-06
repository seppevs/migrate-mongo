const program = require("commander");
const fs = require("fs");

const init = require("./actions/init");
const create = require("./actions/create");
const up = require("./actions/up");
const down = require("./actions/down");
const status = require("./actions/status");
const database = require("./env/database");
const config = require("./env/configFile");

const migrateMongo = {
  init,
  create,
  up,
  down,
  status,
  database,
  config
};

function collect(value, previous) {
  return previous.concat([value]);
}

program
  .option(
    "-p --plugin <file>",
    "load one or more plugins",
    collect,
    []
  )
  .parse(process.argv);

let loadedPlugins = {};

if (program.plugin) {
  for (let i = 0; i < program.plugin.length; i++) {
    if (!fs.existsSync(program.plugin[i])) {
      continue;
    }
    const plugin = require(program.plugin[i])(migrateMongo);
    loadedPlugins = Object.assign(
      {}, loadedPlugins, { [plugin.pluginName]: plugin.pluginCode }
    )
  }
}

module.exports = Object.assign({}, migrateMongo, loadedPlugins);
