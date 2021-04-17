const { MongoClient } = require("mongodb");
const _ = require("lodash");
const tunnel = require("tunnel-ssh");
const config = require("./config");

module.exports = {
  async connect() {
    const configContent = await config.read();
    const url = _.get(configContent, "mongodb.url");
    const databaseName = _.get(configContent, "mongodb.databaseName");
    const options = _.get(configContent, "mongodb.options");
    const sshOptions = _.get(configContent, "sshTunnel");

    if (!url) {
      throw new Error("No `url` defined in config file!");
    }

    if (sshOptions)
      return new Promise((resolve) => {
        tunnel(sshOptions, async (err) => {
          if (err) throw err;
          console.log("tunnel connected...");

          const client = await MongoClient.connect(url, options);

          const db = client.db(databaseName);
          db.close = client.close;
          resolve({
            client,
            db,
          });
        });
      });

    const client = await MongoClient.connect(url, options);

    const db = client.db(databaseName);
    db.close = client.close;
    return {
      client,
      db,
    };
  },
};
