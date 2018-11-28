const _ = require("lodash");

module.exports = config => {
  const url = _.get(config, "mongodb.url");
  const databaseName = _.get(config, "mongodb.databaseName");
  if (!url) {
    throw new Error("No `url` defined in config file!");
  }

  if (!databaseName) {
    throw new Error(
      "No `databaseName` defined in config file! This is required since migrate-mongo v3. " +
        "See https://github.com/seppevs/migrate-mongo#initialize-a-new-project"
    );
  }
  console.log("Config looks good");
};
