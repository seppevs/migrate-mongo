const { MongoClient } = require("mongodb");

const database = config => ({
  connect: async () => {
    const { url, databaseName, options } = config.mongodb;

    if (!url) {
      throw new Error("No `url` defined in config file!");
    }

    if (!databaseName) {
      throw new Error(
        "No `databaseName` defined in config file! This is required since migrate-mongo v3. " +
          "See https://github.com/seppevs/migrate-mongo#initialize-a-new-project"
      );
    }

    const client = await MongoClient.connect(url, options);

    const db = client.db(databaseName);
    db.close = client.close;
    return db;
  }
});

module.exports = database;
