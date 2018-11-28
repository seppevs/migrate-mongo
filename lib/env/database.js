const { MongoClient } = require("mongodb");
const _ = require("lodash");
const configFile = require("./configFile");
const validateConfig = require("../utils/validateConfig");

module.exports = {
  async connect() {
    const config = await configFile.read();
    const url = _.get(config, "mongodb.url");
    const databaseName = _.get(config, "mongodb.databaseName");
    const options = _.get(config, "mongodb.options");

    validateConfig(config);

    const client = await MongoClient.connect(url, options);

    const db = client.db(databaseName);
    db.close = client.close;
    return db;
  }
};
