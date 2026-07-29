import { MongoClient } from "mongodb";
import config from "./config.js";
import autoRollback from "./autoRollback.js";

export default {
  async connect() {
    const configContent = await config.read();
    const url = configContent?.mongodb.url;
    const databaseName = configContent?.mongodb.databaseName;
    const options = configContent?.mongodb.options;

    if (!url) {
      throw new Error("No `url` defined in config file!");
    }

    const client = await MongoClient.connect(
      url,
      options
    );

    const db = client.db(databaseName);
    const originalCollection = db.collection.bind(db);
    autoRollback.wrapDbWithAutoRollback(db, configContent, originalCollection);
    db.close = client.close;
    return {
      client,
      db,
    };
  }
};