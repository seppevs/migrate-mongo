import { MongoClient } from "mongodb";
import config from "./config.js";

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
    db.close = client.close;
    return {
      client,
      db,
    };
  }
};
