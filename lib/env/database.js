const { MongoClient } = require("mongodb");
const _ = require("lodash");
const config = require("./config");

module.exports = {
  async connect() {
    const configContent = await config.read();
    const url = _.get(configContent, "mongodb.url");
    const databaseName = _.get(configContent, "mongodb.databaseName");
    const options = _.get(configContent, "mongodb.options");

    if (!url) {
      throw new Error("No `url` defined in config file!");
    }

    if (!databaseName) {
      throw new Error(
        "No `databaseName` defined in config file! This is required since migrate-mongo v3. " +
          "See https://github.com/seppevs/migrate-mongo#initialize-a-new-project"
      );
    }

    const client = await MongoClient.connect(
      url,
      options
    );

    const db = client.db(databaseName);
    db.close = client.close;
    return {
      client,
      db,
    };
  }
};
