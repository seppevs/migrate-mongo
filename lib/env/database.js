const { MongoClient } = require("mongodb");
const mongodb_url_parser = require('mongodb/lib/url_parser.js');
const _ = require("lodash");
const configFile = require("./configFile");

module.exports = {
  async connect() {
    const config = await configFile.read();
    const url = _.get(config, "mongodb.url");
    let databaseName = _.get(config, "mongodb.databaseName");
    const options = _.get(config, "mongodb.options");

    if (!url) {
      throw new Error("No `url` defined in config file!");
    }

    if (!databaseName) {
      databaseName = await new Promise(function(resolve, reject) {
        mongodb_url_parser(
          url,
          {},
          function(error, result){
            if (error) {
              reject();
            } else {
              resolve(result.dbName);
            }
          }
        )
      });
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
    return db;
  }
};
